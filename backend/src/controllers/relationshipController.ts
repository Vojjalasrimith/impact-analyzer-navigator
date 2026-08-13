import { Request, Response } from 'express';
import { 
  ProjectModel, 
  FeatureModel, 
  ServiceModel, 
  DeveloperModel 
} from '../models/index.js';
import { cognoService } from '../services/cognoService.js';
import { isValidRelationship } from '../utils/validation.js';
import { EntityType, RelationshipType } from '../types/index.js';

/**
 * Helper to find an entity by ID across all 4 split collections and return its type
 */
async function findEntityById(id: string) {
  const [project, feature, service, developer] = await Promise.all([
    ProjectModel.findById(id),
    FeatureModel.findById(id),
    ServiceModel.findById(id),
    DeveloperModel.findById(id)
  ]);

  if (project) return { type: 'PROJECT' as EntityType, name: project.name };
  if (feature) return { type: 'FEATURE' as EntityType, name: feature.name };
  if (service) return { type: 'SERVICE' as EntityType, name: service.name };
  if (developer) return { type: 'DEVELOPER' as EntityType, name: developer.name };
  
  return null;
}

export const relationshipController = {
  // GET /api/relationships
  listRelationships: async (req: Request, res: Response): Promise<void> => {
    try {
      const relationships = await cognoService.getRelationships();
      res.status(200).json(relationships);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /api/relationships
  createRelationship: async (req: Request, res: Response): Promise<void> => {
    try {
      const { from, to, type } = req.body;

      if (!from || !to || !type) {
        res.status(400).json({ error: 'Source (from), target (to), and relationship type are required' });
        return;
      }

      // Check if valid RelationshipType
      const validTypes: RelationshipType[] = ['HAS_FEATURE', 'IMPLEMENTED_BY', 'DEPENDS_ON', 'OWNED_BY'];
      if (!validTypes.includes(type as RelationshipType)) {
        res.status(400).json({ error: `Invalid relationship type: ${type}` });
        return;
      }

      // Look up source and target entities to verify existence and get their types
      const [sourceEntity, targetEntity] = await Promise.all([
        findEntityById(from),
        findEntityById(to)
      ]);

      if (!sourceEntity) {
        res.status(404).json({ error: `Source entity with ID '${from}' not found` });
        return;
      }

      if (!targetEntity) {
        res.status(404).json({ error: `Target entity with ID '${to}' not found` });
        return;
      }

      // Validate compatibility mapping rules
      const isAllowed = isValidRelationship(sourceEntity.type, targetEntity.type, type as RelationshipType);
      
      if (!isAllowed) {
        res.status(400).json({
          error: `Invalid connection pairing: Cannot connect type '${sourceEntity.type}' to '${targetEntity.type}' via relationship '${type}'`
        });
        return;
      }

      // Create relationship in CognoDB
      const result = await cognoService.createRelationship(from, to, type as RelationshipType);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // DELETE /api/relationships/:id
  deleteRelationship: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Relationship ID is required' });
        return;
      }

      await cognoService.deleteRelationship(id);
      res.status(200).json({ message: 'Relationship deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
