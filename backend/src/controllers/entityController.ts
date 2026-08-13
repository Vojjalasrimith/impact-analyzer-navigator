import { Request, Response } from 'express';
import { 
  ProjectModel, 
  FeatureModel, 
  ServiceModel, 
  DeveloperModel, 
  getModelByType 
} from '../models/index.js';
import { cognoService } from '../services/cognoService.js';
import { EntityType } from '../types/index.js';

/**
 * Helper to find an entity by ID across all 4 split collections
 */
async function findEntityById(id: string) {
  const [project, feature, service, developer] = await Promise.all([
    ProjectModel.findById(id),
    FeatureModel.findById(id),
    ServiceModel.findById(id),
    DeveloperModel.findById(id)
  ]);

  if (project) return { model: ProjectModel, doc: project, type: 'PROJECT' as EntityType };
  if (feature) return { model: FeatureModel, doc: feature, type: 'FEATURE' as EntityType };
  if (service) return { model: ServiceModel, doc: service, type: 'SERVICE' as EntityType };
  if (developer) return { model: DeveloperModel, doc: developer, type: 'DEVELOPER' as EntityType };
  
  return null;
}

export const entityController = {
  // GET /api/entities
  listEntities: async (req: Request, res: Response): Promise<void> => {
    try {
      const [projects, features, services, developers] = await Promise.all([
        ProjectModel.find(),
        FeatureModel.find(),
        ServiceModel.find(),
        DeveloperModel.find()
      ]);

      const allEntities = [
        ...projects,
        ...features,
        ...services,
        ...developers
      ];

      res.status(200).json(allEntities);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /api/entities/:id
  getEntity: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const entity = await findEntityById(id);
      
      if (!entity) {
        res.status(404).json({ error: 'Entity not found' });
        return;
      }
      
      res.status(200).json(entity.doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /api/entities
  createEntity: async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, name, description } = req.body;

      if (!type || !name) {
        res.status(400).json({ error: 'Type and name are required' });
        return;
      }

      // Check if valid type
      if (!['PROJECT', 'FEATURE', 'SERVICE', 'DEVELOPER'].includes(type)) {
        res.status(400).json({ error: 'Invalid entity type' });
        return;
      }

      const Model = getModelByType(type as EntityType);
      const newDoc = new Model({ name, description });
      await newDoc.save();

      // Sync node presence into CognoDB
      const id = newDoc.id;
      await cognoService.createNode(id, type, name);

      res.status(201).json(newDoc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // PATCH /api/entities/:id
  updateEntity: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const entity = await findEntityById(id);
      if (!entity) {
        res.status(404).json({ error: 'Entity not found' });
        return;
      }

      if (name !== undefined) {
        entity.doc.name = name;
      }
      if (description !== undefined) {
        entity.doc.description = description;
      }

      await entity.doc.save();

      // Sync node update to CognoDB
      await cognoService.createNode(entity.doc.id, entity.type, entity.doc.name);

      res.status(200).json(entity.doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // DELETE /api/entities/:id
  deleteEntity: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const entity = await findEntityById(id);
      if (!entity) {
        res.status(404).json({ error: 'Entity not found' });
        return;
      }

      await entity.model.findByIdAndDelete(id);

      // Clean up node and any associated edges from CognoDB
      await cognoService.deleteNode(id);

      res.status(200).json({ message: 'Entity deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
