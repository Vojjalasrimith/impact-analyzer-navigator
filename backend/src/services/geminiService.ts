import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { ChatTurn, ChatContext, GraphSummary } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const CHAT_MODEL = 'gemini-3.5-flash-lite';
const getLogger = createLogger('GeminiService');

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'i', 'want', 'to', 'from', 'of', 'on', 'in', 'and', 'or', 'if',
  'for', 'with', 'about', 'do', 'does', 'did', 'can', 'could', 'would',
  'should', 'will', 'my', 'me', 'we', 'our', 'us', 'it', 'its',
  'impact', 'impacts', 'affect', 'affects', 'affected', 'analyze',
  'analysis', 'service', 'services', 'product', 'products', 'their',
  'integrate', 'integrating', 'migrate', 'migrating', 'migration',
  'existing', 'new', 'has', 'have', 'had', 'owned', 'owns', 'owner'
]);

/**
 * Pulls entity-name-like keywords out of a message for the CognoDB full-text search — this is
 * plain string processing, not an LLM call, since entity linking is retrieval (backend's job),
 * not reasoning (Gemini's job).
 */
export function extractSearchTerms(message: string): string[] {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  return Array.from(new Set(words));
}

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

// Initialize Gemini API client safely
let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  getLogger('init').warn('GEMINI_API_KEY is not defined in environment variables. Operating in programmatic fallback mode for chat responses.');
}

export interface ChatRAGResponse {
  reply: string;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedTests: string[];
  explanations: string[];
}

export const geminiService = {
  /**
   * Single retrieve-then-generate call: answers whatever the user actually asked — a plain
   * lookup ("who owns X", "what connects to X") or an impact analysis ("what breaks if I change
   * X") — using only the graph context already compiled by graphTraversalService. Gemini never
   * queries the graph itself; it only reasons over facts the backend already retrieved.
   */
  chatRespondRAG: async (
    message: string,
    history: ChatTurn[],
    context: ChatContext
  ): Promise<ChatRAGResponse> => {
    if (!genAI) {
      return generateProgrammaticFallback(context);
    }

    try {
      const model = genAI.getGenerativeModel({ model: CHAT_MODEL });

      const historyText = history
        .slice(-6)
        .map(turn => `${turn.role}: ${turn.content}`)
        .join('\n');

      const prompt = `
You are a helpful assistant answering questions about a software dependency graph, chatting with a
developer. The graph contains PROJECT, FEATURE, SERVICE, and DEVELOPER entities connected by
PROJECT-HAS_FEATURE->FEATURE, FEATURE-IMPLEMENTED_BY->SERVICE, SERVICE-DEPENDS_ON->SERVICE, and
SERVICE-OWNED_BY->DEVELOPER relationships.

The question could be a plain lookup ("who owns X", "what does X connect to", "how are X and Y
related") or an impact/migration analysis ("what breaks if I change X", "what should I test before
migrating X"). Answer whichever it actually is, directly and conversationally, using ONLY the facts
below.

Recent conversation history (may be empty):
${historyText || '(none)'}

User's latest message: "${message}"

Facts retrieved from the graph:
- Matched entities: ${JSON.stringify(context.matchedEntities.map(e => `${e.name} (${e.type})`))}
- Direct connections: ${JSON.stringify(context.neighbors.map(n => `${n.name} (${n.type}) via ${n.relType} [${n.direction}]`))}
- Downstream services (would be affected by a change to a matched service): ${JSON.stringify(context.downstreamServices.map(s => s.name))}
- Upstream services (a matched service depends on): ${JSON.stringify(context.upstreamServices.map(s => s.name))}
- Affected features: ${JSON.stringify(context.affectedFeatures.map(f => f.name))}
- Affected projects: ${JSON.stringify(context.affectedProjects.map(p => p.name))}
- Owners: ${JSON.stringify(context.owners.map(o => o.name))}
- Paths between matched entities: ${JSON.stringify(context.paths)}

Output ONLY raw JSON matching this schema, no markdown formatting or code fences:
{
  "reply": "A conversational, direct answer to the user's actual question, referencing specific entities by name.",
  "risk": "LOW" | "MEDIUM" | "HIGH" | null,
  "recommendedTests": ["Test case 1 description", ...],
  "explanations": ["Reasoning statement 1", ...]
}

Guidelines:
1. Only set "risk" and populate "recommendedTests"/"explanations" if the question is about changing, migrating, or the impact of modifying something. For a plain info/lookup question, set "risk" to null and leave those arrays empty — don't force an impact analysis onto a question that isn't one.
2. When risk applies: "HIGH" if key projects/critical features (like Checkout/Payment) are impacted; "MEDIUM" if intermediate service chains are impacted but core consumer flows are spared; "LOW" if there's no downstream dependency.
3. If the facts are sparse (e.g. no connections found for the matched entities), say so plainly rather than inventing anything.
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
        reply: parsed.reply || `Here's what I found for ${context.matchedEntities.map(e => e.name).join(', ')}.`,
        risk: parsed.risk === 'LOW' || parsed.risk === 'MEDIUM' || parsed.risk === 'HIGH' ? parsed.risk : undefined,
        recommendedTests: Array.isArray(parsed.recommendedTests) ? parsed.recommendedTests : [],
        explanations: Array.isArray(parsed.explanations) ? parsed.explanations : []
      };
    } catch (err: any) {
      getLogger('chatRespondRAG').error('Gemini RAG response failed, reverting to programmatic fallback', { error: err.message });
      return generateProgrammaticFallback(context);
    }
  },

  /**
   * Whole-graph fallback: used when entity linking finds no CognoDB match for the message (the
   * question doesn't name anything in the graph verbatim — e.g. "what existing services could I
   * reuse to build an email workflow?"). Gemini reasons over the full known graph instead of a
   * targeted neighborhood, so it can still recommend relevant existing services/owners even though
   * nothing was directly matched.
   */
  chatRespondOpenGraph: async (
    message: string,
    history: ChatTurn[],
    summary: GraphSummary
  ): Promise<ChatRAGResponse> => {
    if (!genAI) {
      return generateOpenGraphFallback(summary);
    }

    try {
      const model = genAI.getGenerativeModel({ model: CHAT_MODEL });

      const historyText = history
        .slice(-6)
        .map(turn => `${turn.role}: ${turn.content}`)
        .join('\n');

      const prompt = `
You are a helpful assistant answering questions about a software dependency graph, chatting with a
developer. The graph contains PROJECT, FEATURE, SERVICE, and DEVELOPER entities connected by
PROJECT-HAS_FEATURE->FEATURE, FEATURE-IMPLEMENTED_BY->SERVICE, SERVICE-DEPENDS_ON->SERVICE, and
SERVICE-OWNED_BY->DEVELOPER relationships.

The user's message didn't name anything that matches a specific entity already in the graph, so
there's no targeted neighborhood to hand you. Instead, here is the ENTIRE known graph — reason over
it freely to answer whatever the user is actually asking (e.g. planning a new feature/workflow and
wanting to know what existing services/developers could be reused or looped in).

Recent conversation history (may be empty):
${historyText || '(none)'}

User's latest message: "${message}"

All known entities:
${JSON.stringify(summary.entities.map(e => ({ name: e.name, type: e.type, description: e.description })))}

All known relationships:
${JSON.stringify(summary.relationships.map(r => `${r.from} (${r.fromType}) -${r.relType}-> ${r.to} (${r.toType})`))}

Output ONLY raw JSON matching this schema, no markdown formatting or code fences:
{
  "reply": "A conversational, direct answer to the user's actual question, referencing specific existing entities by name where relevant, and being explicit about anything the graph doesn't already cover.",
  "risk": "LOW" | "MEDIUM" | "HIGH" | null,
  "recommendedTests": ["Suggested next step 1", ...],
  "explanations": ["Reasoning statement 1", ...]
}

Guidelines:
1. Only set "risk" and populate "recommendedTests"/"explanations" as an impact analysis if the question is genuinely about the impact of changing an existing modeled entity. For a planning/brainstorming question about something new, set "risk" to null, and use "recommendedTests" for concrete next-step suggestions (e.g. "extend Notification Service" or "loop in Alice") only if that fits naturally — otherwise leave it empty.
2. Never invent entities, relationships, or ownership that aren't in the facts above — if nothing in the graph is relevant, say so plainly.
`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const parsed = JSON.parse(result.response.text());
      return {
        reply: parsed.reply || `Here's what's currently in the graph: ${summary.entities.map(e => e.name).join(', ')}.`,
        risk: parsed.risk === 'LOW' || parsed.risk === 'MEDIUM' || parsed.risk === 'HIGH' ? parsed.risk : undefined,
        recommendedTests: Array.isArray(parsed.recommendedTests) ? parsed.recommendedTests : [],
        explanations: Array.isArray(parsed.explanations) ? parsed.explanations : []
      };
    } catch (err: any) {
      getLogger('chatRespondOpenGraph').error('Gemini open-graph response failed, reverting to programmatic fallback', { error: err.message });
      return generateOpenGraphFallback(summary);
    }
  }
};

/**
 * Deterministic fallback for the chat flow when Gemini is unavailable
 */
function generateProgrammaticFallback(context: ChatContext): ChatRAGResponse {
  const targetNames = context.matchedEntities.map(e => e.name);
  const hasServiceImpact = context.downstreamServices.length > 0 || context.upstreamServices.length > 0;

  const parts: string[] = [];
  if (context.neighbors.length > 0) {
    parts.push(`${targetNames.join(', ')} connects to: ${context.neighbors.map(n => `${n.name} (${n.relType})`).join(', ')}.`);
  }
  if (context.owners.length > 0) {
    parts.push(`Owned by: ${context.owners.map(o => o.name).join(', ')}.`);
  }
  if (hasServiceImpact) {
    parts.push(`Downstream impact: ${context.downstreamServices.map(s => s.name).join(', ') || 'none'}. Upstream dependencies: ${context.upstreamServices.map(s => s.name).join(', ') || 'none'}.`);
  }
  if (parts.length === 0) {
    parts.push(`${targetNames.join(', ')} has no recorded connections in the graph.`);
  }

  let risk: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;
  const recommendedTests: string[] = [];
  const explanations: string[] = [];
  if (hasServiceImpact) {
    risk = context.downstreamServices.length > 2 ? 'HIGH' : context.downstreamServices.length > 0 ? 'MEDIUM' : 'LOW';
    recommendedTests.push(`Perform integration tests on: ${targetNames.join(', ')}.`);
    context.downstreamServices.forEach(s => recommendedTests.push(`Run regression tests on dependent service: "${s.name}".`));
    explanations.push(`Changes propagate along ${context.paths.length} known path(s) in the graph.`);
  }

  return { reply: parts.join(' '), risk, recommendedTests, explanations };
}

/**
 * Deterministic fallback for the whole-graph chat flow when Gemini is unavailable
 */
function generateOpenGraphFallback(summary: GraphSummary): ChatRAGResponse {
  const byType = (type: string) => summary.entities.filter(e => e.type === type);
  const services = byType('SERVICE');
  const developers = byType('DEVELOPER');

  const parts: string[] = ["I couldn't match your message to a specific entity in the graph, but here's what currently exists."];
  if (services.length > 0) {
    parts.push(`Services: ${services.map(s => `${s.name} (${s.description || 'no description'})`).join('; ')}.`);
  }
  if (developers.length > 0) {
    parts.push(`Developers: ${developers.map(d => d.name).join(', ')}.`);
  }

  return { reply: parts.join(' '), risk: undefined, recommendedTests: [], explanations: [] };
}
