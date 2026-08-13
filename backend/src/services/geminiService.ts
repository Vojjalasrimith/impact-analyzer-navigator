import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { ImpactAnalysisResult } from '../types/index.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

// Initialize Gemini API client safely
let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn('GEMINI_API_KEY is not defined in environment variables. Operating in programmatic fallback mode for impact analysis.');
}

export const geminiService = {
  analyzeImpact: async (
    targetServiceName: string,
    affectedServices: string[],
    affectedFeatures: string[],
    affectedProjects: string[],
    developers: string[],
    paths: string[][]
  ): Promise<ImpactAnalysisResult> => {

    // Generate programmatic fallback if no API key is present
    if (!genAI) {
      return generateProgrammaticFallback(
        targetServiceName,
        affectedServices,
        affectedFeatures,
        affectedProjects,
        developers,
        paths
      );
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

      const prompt = `
You are an expert software architect analyzing the impact of modifying a backend Service in an enterprise platform.
A developer is proposing modifications to the service: "${targetServiceName}".

Here is the factual downstream impact context retrieved from the graph database:
- Affected Services: ${JSON.stringify(affectedServices)}
- Affected Features: ${JSON.stringify(affectedFeatures)}
- Affected Projects: ${JSON.stringify(affectedProjects)}
- Affected Developers (Owners): ${JSON.stringify(developers)}
- Graph Traversal Paths: ${JSON.stringify(paths)}

Perform an assessment of this change and output your findings in a structured JSON format containing the following fields:
{
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "summary": "A concise executive summary of the changes and overall impact.",
  "recommendedTests": ["Test case 1 description", "Test case 2 description", ...],
  "explanations": ["Reasoning statement 1", "Reasoning statement 2", ...]
}

Guidelines for analysis:
1. Risk Level:
   - "HIGH" if key projects (like E-Commerce Platform) or critical features (like Checkout/Payment) are impacted.
   - "MEDIUM" if intermediate backend service chains are impacted but core consumer flows are spared.
   - "LOW" if there are no downstream dependencies.
2. Recommended tests: Must be concrete, referencing the affected service/feature names and specific test suites to execute.
3. Explanations: Detail the propagation path and specify which developer owners/teams should be notified.

Do not output any markdown formatting, preamble, or code block fences. Output ONLY the raw valid JSON matching this schema.
`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      return {
        target: targetServiceName,
        risk: (parsed.risk || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
        summary: parsed.summary || 'Impact analysis compiled successfully.',
        affectedServices,
        affectedFeatures,
        developers,
        paths,
        recommendedTests: parsed.recommendedTests || ['Run full regression test suite.'],
        explanations: parsed.explanations || [`Modifying ${targetServiceName} propagates changes through the dependency graph.`]
      };
    } catch (err: any) {
      console.error('Gemini API call failed, reverting to programmatic fallback analysis:', err.message);
      return generateProgrammaticFallback(
        targetServiceName,
        affectedServices,
        affectedFeatures,
        affectedProjects,
        developers,
        paths
      );
    }
  }
};

/**
 * Creates a sensible, deterministic fallback response if Gemini is unavailable
 */
function generateProgrammaticFallback(
  target: string,
  services: string[],
  features: string[],
  projects: string[],
  devs: string[],
  paths: string[][]
): ImpactAnalysisResult {
  // Determine risk level based on traversal complexity
  let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (projects.length > 0 || features.includes('Checkout') || features.includes('Payment')) {
    risk = 'HIGH';
  } else if (services.length > 1 || features.length > 0) {
    risk = 'MEDIUM';
  }

  const summary = `Programmatic analysis for change on service "${target}". Modifying this service has a downstream impact chain affecting ${services.length - 1} other service(s), ${features.length} feature(s), and ${projects.length} project(s).`;

  const recommendedTests = [
    `Perform unit verification tests directly on service "${target}".`
  ];
  services.forEach(s => {
    if (s !== target) recommendedTests.push(`Run integration tests on dependent service: "${s}".`);
  });
  features.forEach(f => {
    recommendedTests.push(`Verify user-facing functionality of feature: "${f}".`);
  });

  const explanations = [
    `Changes to service "${target}" propagate along ${paths.length} dependency path(s).`
  ];
  if (devs.length > 0) {
    explanations.push(`Alert dev owner(s) [${devs.join(', ')}] regarding potential breaking interface contracts.`);
  } else {
    explanations.push(`No secondary dev owners are affected by this change.`);
  }

  return {
    target,
    risk,
    summary,
    affectedServices: services,
    affectedFeatures: features,
    developers: devs,
    paths,
    recommendedTests,
    explanations
  };
}
