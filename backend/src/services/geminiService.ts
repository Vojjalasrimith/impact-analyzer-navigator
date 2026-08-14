import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { ImpactAnalysisResult, ChatTurn, ChatAnalysis, ChatIntent } from '../types/index.js';
import { MultiTraversalResult } from './graphTraversalService.js';

const CHAT_MODEL = 'gemini-3.5-flash-lite';

export interface ChatIntentClassification {
  intent: ChatIntent;
  searchTerms: string[];
  entityA?: string;
  entityB?: string;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'i', 'want', 'to', 'from', 'of', 'on', 'in', 'and', 'or', 'if',
  'for', 'with', 'about', 'do', 'does', 'did', 'can', 'could', 'would',
  'should', 'will', 'my', 'me', 'we', 'our', 'us', 'it', 'its',
  'impact', 'impacts', 'affect', 'affects', 'affected', 'analyze',
  'analysis', 'service', 'services', 'product', 'products', 'their',
  'integrate', 'integrating', 'migrate', 'migrating', 'migration',
  'existing', 'new', 'has', 'have', 'had'
]);

function naiveExtractKeywords(message: string): string[] {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  return Array.from(new Set(words));
}

function naiveClassifyIntent(message: string): ChatIntentClassification {
  const lower = message.toLowerCase();

  if (/who\s+owns|owner\s+of|responsible\s+for/.test(lower)) {
    return { intent: 'OWNERSHIP', searchTerms: naiveExtractKeywords(message) };
  }

  const pathMatch = lower.match(/path\s+between\s+(.+?)\s+and\s+(.+?)(\?|$)/) ||
    lower.match(/connect\w*\s+(.+?)\s+and\s+(.+?)(\?|$)/) ||
    lower.match(/relationship\s+between\s+(.+?)\s+and\s+(.+?)(\?|$)/);
  if (pathMatch) {
    return {
      intent: 'PATH_BETWEEN',
      searchTerms: naiveExtractKeywords(message),
      entityA: pathMatch[1].trim(),
      entityB: pathMatch[2].trim()
    };
  }

  if (/connects?\s+to|neighbors?|what.*connect/.test(lower)) {
    return { intent: 'NEIGHBORHOOD', searchTerms: naiveExtractKeywords(message) };
  }

  return { intent: 'IMPACT_ANALYSIS', searchTerms: naiveExtractKeywords(message) };
}

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
  },

  classifyIntent: async (message: string, history: ChatTurn[]): Promise<ChatIntentClassification> => {
    if (!genAI) {
      return naiveClassifyIntent(message);
    }

    try {
      const model = genAI.getGenerativeModel({ model: CHAT_MODEL });

      const historyText = history
        .slice(-6)
        .map(turn => `${turn.role}: ${turn.content}`)
        .join('\n');

      const prompt = `
You are classifying a user's message in a chat about a software dependency graph. The graph contains
entities of type PROJECT, FEATURE, SERVICE, and DEVELOPER, each with a name and description, connected by
PROJECT-HAS_FEATURE->FEATURE, FEATURE-IMPLEMENTED_BY->SERVICE, SERVICE-DEPENDS_ON->SERVICE, and
SERVICE-OWNED_BY->DEVELOPER relationships.

Recent conversation history (may be empty):
${historyText || '(none)'}

User's latest message: "${message}"

Classify the message into exactly one intent:
- "IMPACT_ANALYSIS": asking what could break, or about migrating/changing/replacing a service
- "OWNERSHIP": asking who owns/is responsible for a service
- "PATH_BETWEEN": asking how two specific named entities are connected/related
- "NEIGHBORHOOD": asking what a specific entity directly connects to, without a change/migration framing

Also extract:
- "searchTerms": keywords (entity names, partial names, domain terms) to search for, excluding generic
  words like "service"/"impact"/"migrate". Used for IMPACT_ANALYSIS/OWNERSHIP/NEIGHBORHOOD.
- "entityA" / "entityB": for PATH_BETWEEN only, the two entity names/phrases mentioned (omit otherwise).

Output ONLY raw JSON matching this schema, no markdown:
{ "intent": "IMPACT_ANALYSIS" | "OWNERSHIP" | "PATH_BETWEEN" | "NEIGHBORHOOD", "searchTerms": ["..."], "entityA": "...", "entityB": "..." }
`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const parsed = JSON.parse(result.response.text());
      const validIntents: ChatIntent[] = ['IMPACT_ANALYSIS', 'OWNERSHIP', 'PATH_BETWEEN', 'NEIGHBORHOOD'];
      const intent: ChatIntent = validIntents.includes(parsed.intent) ? parsed.intent : 'IMPACT_ANALYSIS';
      const searchTerms = Array.isArray(parsed.searchTerms) && parsed.searchTerms.length > 0
        ? parsed.searchTerms
        : naiveExtractKeywords(message);

      return { intent, searchTerms, entityA: parsed.entityA, entityB: parsed.entityB };
    } catch (err: any) {
      console.error('Gemini intent classification failed, reverting to naive classification:', err.message);
      return naiveClassifyIntent(message);
    }
  },

  chatAnalyze: async (
    message: string,
    history: ChatTurn[],
    traversal: MultiTraversalResult
  ): Promise<{ reply: string; risk: 'LOW' | 'MEDIUM' | 'HIGH'; recommendedTests: string[]; explanations: string[] }> => {
    const targetNames = traversal.targets.map(t => t.name);
    const downstreamNames = traversal.affectedServices.map(s => s.name);
    const upstreamNames = traversal.dependsOnServices.map(s => s.name);
    const featureNames = traversal.affectedFeatures.map(f => f.name);
    const developerNames = traversal.affectedDevelopers.map(d => d.name);

    if (!genAI) {
      return generateChatProgrammaticFallback(targetNames, downstreamNames, upstreamNames, featureNames, traversal.paths);
    }

    try {
      const model = genAI.getGenerativeModel({ model: CHAT_MODEL });

      const historyText = history
        .slice(-6)
        .map(turn => `${turn.role}: ${turn.content}`)
        .join('\n');

      const prompt = `
You are an expert software architect chatting with a developer about the impact of changing or migrating
services in an enterprise platform. Respond conversationally, directly addressing their question.

Recent conversation history (may be empty):
${historyText || '(none)'}

User's latest message: "${message}"

Here is the factual graph context retrieved for the service(s) they're asking about: ${JSON.stringify(targetNames)}
- Downstream (services/features that depend on these, i.e. what could break): ${JSON.stringify(downstreamNames)}
- Upstream (what these services themselves depend on, relevant if migrating/replacing them): ${JSON.stringify(upstreamNames)}
- Affected Features: ${JSON.stringify(featureNames)}
- Affected Developers (Owners): ${JSON.stringify(developerNames)}
- Graph Traversal Paths: ${JSON.stringify(traversal.paths)}

Output ONLY raw JSON matching this schema, no markdown formatting or code fences:
{
  "reply": "A conversational paragraph directly answering the user's question, referencing the specific services/features/owners by name.",
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "recommendedTests": ["Test case 1 description", ...],
  "explanations": ["Reasoning statement 1", ...]
}

Guidelines:
1. Risk: "HIGH" if key projects or critical features (like Checkout/Payment) are impacted; "MEDIUM" if intermediate service chains are impacted but core consumer flows are spared; "LOW" if there are no downstream dependencies.
2. If upstream dependencies exist, mention what the migration would also need to account for.
3. Recommended tests must be concrete, referencing affected service/feature names.
`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const parsed = JSON.parse(result.response.text());
      return {
        reply: parsed.reply || `Here's what I found for ${targetNames.join(', ')}.`,
        risk: (parsed.risk || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
        recommendedTests: parsed.recommendedTests || ['Run full regression test suite.'],
        explanations: parsed.explanations || [`Changes to ${targetNames.join(', ')} propagate through the dependency graph.`]
      };
    } catch (err: any) {
      console.error('Gemini chat analysis failed, reverting to programmatic fallback:', err.message);
      return generateChatProgrammaticFallback(targetNames, downstreamNames, upstreamNames, featureNames, traversal.paths);
    }
  },

  chatRespondGeneric: async (
    message: string,
    history: ChatTurn[],
    factsText: string
  ): Promise<{ reply: string }> => {
    if (!genAI) {
      return { reply: factsText };
    }

    try {
      const model = genAI.getGenerativeModel({ model: CHAT_MODEL });

      const historyText = history
        .slice(-6)
        .map(turn => `${turn.role}: ${turn.content}`)
        .join('\n');

      const prompt = `
You are a helpful assistant answering questions about a software dependency graph, chatting with a developer.
Respond conversationally and directly, in 1-3 sentences.

Recent conversation history (may be empty):
${historyText || '(none)'}

User's latest message: "${message}"

Factual graph context retrieved for this question:
${factsText}

Write a natural, direct reply based ONLY on the facts above. Output ONLY the reply text — no JSON, no markdown.
`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      });

      const reply = result.response.text().trim();
      return { reply: reply || factsText };
    } catch (err: any) {
      console.error('Gemini generic chat response failed, reverting to raw facts:', err.message);
      return { reply: factsText };
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

/**
 * Deterministic fallback for the chat flow when Gemini is unavailable
 */
function generateChatProgrammaticFallback(
  targets: string[],
  downstream: string[],
  upstream: string[],
  features: string[],
  paths: string[][]
): { reply: string; risk: 'LOW' | 'MEDIUM' | 'HIGH'; recommendedTests: string[]; explanations: string[] } {
  let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (features.includes('Checkout') || features.includes('Payment')) {
    risk = 'HIGH';
  } else if (downstream.length > targets.length || features.length > 0) {
    risk = 'MEDIUM';
  }

  const reply = `Programmatic analysis for "${targets.join(', ')}". This has a downstream impact on ` +
    `${Math.max(downstream.length - targets.length, 0)} other service(s) and ${features.length} feature(s).` +
    (upstream.length > 0 ? ` It also depends on ${upstream.length} other service(s): ${upstream.join(', ')}.` : '');

  const recommendedTests = [`Perform integration tests on: ${targets.join(', ')}.`];
  downstream.forEach(s => {
    if (!targets.includes(s)) recommendedTests.push(`Run regression tests on dependent service: "${s}".`);
  });

  const explanations = [`Changes propagate along ${paths.length} dependency path(s).`];
  if (upstream.length > 0) {
    explanations.push(`Migration must also account for upstream dependencies: ${upstream.join(', ')}.`);
  }

  return { reply, risk, recommendedTests, explanations };
}
