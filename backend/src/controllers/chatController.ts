import { Request, Response } from 'express';
import { cognoService, CognoEntityMatch } from '../services/cognoService.js';
import { graphTraversalService } from '../services/graphTraversalService.js';
import { geminiService } from '../services/geminiService.js';
import { ChatTurn, ChatResponse } from '../types/index.js';

function bestMatch(matches: CognoEntityMatch[], type?: string): CognoEntityMatch | undefined {
  const pool = type ? matches.filter(m => m.type === type) : matches;
  return pool[0];
}

export const chatController = {
  // POST /api/chat
  handleMessage: async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, history } = req.body as { message?: string; history?: ChatTurn[] };

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'A "message" string is required in the request body' });
        return;
      }

      const safeHistory = Array.isArray(history) ? history : [];
      const classification = await geminiService.classifyIntent(message, safeHistory);

      switch (classification.intent) {
        case 'OWNERSHIP': {
          const matches = await cognoService.searchEntities(classification.searchTerms.join(' '));
          const serviceMatches = matches.filter(m => m.type === 'SERVICE');

          if (serviceMatches.length === 0) {
            const reply = matches.length > 0
              ? `I found ${matches.map(m => `"${m.name}" (${m.type})`).join(', ')}, but ownership is only tracked for SERVICE entities. Could you name a specific service?`
              : `I couldn't find anything in the graph matching that — try a different name or keyword.`;
            res.status(200).json({ reply, matchedEntities: matches } as ChatResponse);
            return;
          }

          const owners = await cognoService.findOwners(serviceMatches.map(m => m.id));
          const serviceNames = serviceMatches.map(m => m.name);
          const factsText = owners.length > 0
            ? `${serviceNames.join(', ')} is/are owned by: ${owners.map(o => o.name).join(', ')}.`
            : `${serviceNames.join(', ')} has/have no recorded owner in the graph.`;

          const { reply } = await geminiService.chatRespondGeneric(message, safeHistory, factsText);

          const response: ChatResponse = {
            reply,
            graphFacts: {
              intent: 'OWNERSHIP',
              items: owners.map(o => ({ id: o.id, name: o.name, type: 'DEVELOPER' as const, relation: 'OWNS' }))
            },
            matchedEntities: matches
          };
          res.status(200).json(response);
          return;
        }

        case 'PATH_BETWEEN': {
          const [matchesA, matchesB] = await Promise.all([
            cognoService.searchEntities(classification.entityA || ''),
            cognoService.searchEntities(classification.entityB || '')
          ]);
          const entityA = bestMatch(matchesA);
          const entityB = bestMatch(matchesB);

          if (!entityA || !entityB) {
            const missing = !entityA && !entityB ? `either entity` : !entityA ? `"${classification.entityA}"` : `"${classification.entityB}"`;
            res.status(200).json({
              reply: `I couldn't find ${missing} in the graph — could you give me the exact names?`,
              matchedEntities: [...matchesA, ...matchesB]
            } as ChatResponse);
            return;
          }

          const path = await cognoService.findShortestPath(entityA.id, entityB.id);
          const factsText = path
            ? `Path from ${entityA.name} to ${entityB.name}: ${path.map(n => `${n.name} (${n.type})`).join(' -> ')}`
            : `No path was found between ${entityA.name} and ${entityB.name} in the graph.`;

          const { reply } = await geminiService.chatRespondGeneric(message, safeHistory, factsText);

          const response: ChatResponse = {
            reply,
            graphFacts: {
              intent: 'PATH_BETWEEN',
              items: (path || []).map(n => ({ id: n.id, name: n.name, type: n.type })),
              path: path ? path.map(n => `${n.name} (${n.type})`) : undefined
            },
            matchedEntities: [entityA, entityB]
          };
          res.status(200).json(response);
          return;
        }

        case 'NEIGHBORHOOD': {
          const matches = await cognoService.searchEntities(classification.searchTerms.join(' '));
          const target = bestMatch(matches);

          if (!target) {
            res.status(200).json({
              reply: `I couldn't find anything in the graph matching that — try a different name or keyword.`,
              matchedEntities: matches
            } as ChatResponse);
            return;
          }

          const neighbors = await cognoService.findNeighborhood(target.id);
          const factsText = neighbors.length > 0
            ? `${target.name} directly connects to: ${neighbors.map(n => `${n.name} (${n.type}) via ${n.relType} [${n.direction}]`).join('; ')}.`
            : `${target.name} has no direct connections in the graph.`;

          const { reply } = await geminiService.chatRespondGeneric(message, safeHistory, factsText);

          const response: ChatResponse = {
            reply,
            graphFacts: {
              intent: 'NEIGHBORHOOD',
              items: neighbors.map(n => ({ id: n.id, name: n.name, type: n.type, relation: `${n.relType} (${n.direction})` }))
            },
            matchedEntities: matches
          };
          res.status(200).json(response);
          return;
        }

        case 'IMPACT_ANALYSIS':
        default: {
          const matches = await cognoService.searchEntities(classification.searchTerms.join(' '));
          const serviceMatches = matches.filter(m => m.type === 'SERVICE');

          if (serviceMatches.length === 0) {
            const reply = matches.length > 0
              ? `I found ${matches.map(m => `"${m.name}" (${m.type})`).join(', ')}, but impact analysis currently only works starting from a SERVICE. Could you name a specific service?`
              : `I couldn't find anything in the graph matching that — try a different name or keyword.`;
            res.status(200).json({ reply, matchedEntities: matches } as ChatResponse);
            return;
          }

          const traversal = await graphTraversalService.analyzeMultiImpact(serviceMatches.map(m => m.id));
          const analyzed = await geminiService.chatAnalyze(message, safeHistory, traversal);

          const response: ChatResponse = {
            reply: analyzed.reply,
            analysis: {
              targets: traversal.targets.map(t => t.name),
              risk: analyzed.risk,
              affectedServices: traversal.affectedServices.map(s => s.name),
              dependsOnServices: traversal.dependsOnServices.map(s => s.name),
              affectedFeatures: traversal.affectedFeatures.map(f => f.name),
              developers: traversal.affectedDevelopers.map(d => d.name),
              paths: traversal.paths,
              recommendedTests: analyzed.recommendedTests,
              explanations: analyzed.explanations
            },
            matchedEntities: matches
          };
          res.status(200).json(response);
          return;
        }
      }
    } catch (err: any) {
      console.error('Chat message error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};
