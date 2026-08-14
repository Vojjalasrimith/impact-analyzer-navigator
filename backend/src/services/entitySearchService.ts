import { Model } from 'mongoose';
import {
  ProjectModel,
  FeatureModel,
  ServiceModel,
  DeveloperModel
} from '../models/index.js';
import { EntityType } from '../types/index.js';

const MAX_RESULTS = 20;

export interface EntitySearchMatch {
  id: string;
  name: string;
  type: EntityType;
  description: string;
}

const MODELS: Array<{ model: Model<any>; type: EntityType }> = [
  { model: ProjectModel, type: 'PROJECT' },
  { model: FeatureModel, type: 'FEATURE' },
  { model: ServiceModel, type: 'SERVICE' },
  { model: DeveloperModel, type: 'DEVELOPER' }
];

export const entitySearchService = {
  searchByKeywords: async (keywords: string[]): Promise<EntitySearchMatch[]> => {
    const terms = keywords.map(k => k.trim()).filter(Boolean);
    if (terms.length === 0) return [];

    const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(pattern, 'i');

    const results = await Promise.all(
      MODELS.map(({ model, type }) =>
        model.find({ $or: [{ name: regex }, { description: regex }] }).then(docs =>
          docs.map(doc => ({
            id: doc.id,
            name: doc.name,
            type,
            description: doc.description
          }))
        )
      )
    );

    const seen = new Set<string>();
    const matches: EntitySearchMatch[] = [];
    for (const match of results.flat()) {
      if (seen.has(match.id)) continue;
      seen.add(match.id);
      matches.push(match);
      if (matches.length >= MAX_RESULTS) break;
    }

    return matches;
  }
};
