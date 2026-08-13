import { Request, Response } from 'express';
import { graphTraversalService } from '../services/graphTraversalService.js';
import { geminiService } from '../services/geminiService.js';

export const impactController = {
  // POST /api/impact-analysis
  analyzeImpact: async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityId } = req.body;

      if (!entityId) {
        res.status(400).json({ error: 'Entity ID (entityId) is required in request body' });
        return;
      }

      // 1. Run database traversal
      const traversal = await graphTraversalService.findDownstreamImpact(entityId);

      // 2. Extract arrays of names for Gemini consumption
      const targetName = traversal.targetEntity.name;
      const serviceNames = traversal.affectedServices.map(s => s.name);
      const featureNames = traversal.affectedFeatures.map(f => f.name);
      const projectNames = traversal.affectedProjects.map(p => p.name);
      const developerNames = traversal.affectedDevelopers.map(d => d.name);

      // 3. Run Gemini reasoning over database traversal facts
      const analysisResult = await geminiService.analyzeImpact(
        targetName,
        serviceNames,
        featureNames,
        projectNames,
        developerNames,
        traversal.paths
      );

      res.status(200).json(analysisResult);
    } catch (err: any) {
      console.error('Impact analysis error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};
