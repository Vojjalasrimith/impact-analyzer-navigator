import { Request, Response } from 'express';
import {
  ProjectModel,
  FeatureModel,
  ServiceModel,
  DeveloperModel
} from '../models/index.js';
import { cognoService } from '../services/cognoService.js';
import { type GraphData } from '../types/index.js';

export const graphController = {
  // GET /api/graph
  getGraph: async (req: Request, res: Response): Promise<void> => {
    try {
      // 1. Fetch all nodes from MongoDB
      const [projects, features, services, developers] = await Promise.all([
        ProjectModel.find(),
        FeatureModel.find(),
        ServiceModel.find(),
        DeveloperModel.find()
      ]);

      // 2. Format into React Flow Node structures
      const formattedNodes: GraphData['nodes'] = [
        ...projects.map(p => ({
          id: p.id,
          type: 'PROJECT' as const,
          data: { label: p.name, description: p.description }
        })),
        ...features.map(f => ({
          id: f.id,
          type: 'FEATURE' as const,
          data: { label: f.name, description: f.description }
        })),
        ...services.map(s => ({
          id: s.id,
          type: 'SERVICE' as const,
          data: { label: s.name, description: s.description }
        })),
        ...developers.map(d => ({
          id: d.id,
          type: 'DEVELOPER' as const,
          data: { label: d.name, description: d.description }
        }))
      ];

      // 3. Fetch relationships from CognoDB
      const relationships = await cognoService.getRelationships();

      // Create a set of active node IDs to filter out orphaned edges
      const activeNodeIds = new Set(formattedNodes.map(node => node.id));

      // 4. Format into React Flow Edge structures
      const formattedEdges: GraphData['edges'] = relationships
        .filter(rel => activeNodeIds.has(rel.fromEntityId) && activeNodeIds.has(rel.toEntityId))
        .map(rel => ({
          id: rel.id,
          source: rel.fromEntityId,
          target: rel.toEntityId,
          label: rel.type
        }));

      const graphData: GraphData = {
        nodes: formattedNodes,
        edges: formattedEdges
      };

      res.status(200).json(graphData);
    } catch (err: any) {
      console.error('Failed to retrieve graph data:', err);
      res.status(500).json({ error: err.message });
    }
  }
};
