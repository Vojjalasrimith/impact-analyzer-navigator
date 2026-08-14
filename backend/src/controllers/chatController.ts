import { Request, Response } from 'express';
import { cognoService } from '../services/cognoService.js';
import { graphTraversalService } from '../services/graphTraversalService.js';
import { geminiService, extractSearchTerms } from '../services/geminiService.js';
import { ChatTurn, ChatResponse } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('ChatController')('handleMessage');

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

      // Entity linking: resolve whatever the message mentions via CognoDB full-text search.
      // This is plain retrieval, not reasoning, so it doesn't need a Gemini call.
      const searchTerms = extractSearchTerms(message);
      const matches = searchTerms.length > 0 ? await cognoService.searchEntities(searchTerms.join(' ')) : [];

      if (matches.length === 0) {
        // No entity linked: fall back to the whole known graph so Gemini can still reason about
        // open-ended/planning questions (e.g. "what existing services could I reuse for X?")
        // instead of dead-ending on a "nothing matched" message.
        const summary = await graphTraversalService.compileGraphSummary();
        const { reply, risk, recommendedTests, explanations } = await geminiService.chatRespondOpenGraph(message, safeHistory, summary);
        log.info('Chat: no entity match, used whole-graph fallback', { searchTerms });
        res.status(200).json({
          reply,
          risk,
          recommendedTests: recommendedTests.length > 0 ? recommendedTests : undefined,
          explanations: explanations.length > 0 ? explanations : undefined,
          matchedEntities: []
        } as ChatResponse);
        return;
      }

      // Single retrieval pass: compile the full local graph context around every matched entity
      // (direct connections, downstream/upstream impact, owners, paths between the matches).
      const context = await graphTraversalService.compileContext(matches.map(m => m.id));

      // Single generation pass: let Gemini answer whatever was actually asked from that context —
      // a plain lookup or a full impact analysis, whichever fits the question.
      const { reply, risk, recommendedTests, explanations } = await geminiService.chatRespondRAG(message, safeHistory, context);

      const response: ChatResponse = {
        reply,
        risk,
        recommendedTests: recommendedTests.length > 0 ? recommendedTests : undefined,
        explanations: explanations.length > 0 ? explanations : undefined,
        context,
        matchedEntities: matches.map(m => ({ id: m.id, name: m.name, type: m.type }))
      };
      log.info('Chat resolved', { matched: context.matchedEntities.map(e => e.name), risk });
      res.status(200).json(response);
    } catch (err: any) {
      log.error('Chat message error', { body: req.body, error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
};
