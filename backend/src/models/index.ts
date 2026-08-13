import { ProjectModel } from './project.js';
import { FeatureModel } from './feature.js';
import { ServiceModel } from './service.js';
import { DeveloperModel } from './developer.js';
import { EntityType } from '../types/index.js';

export { ProjectModel } from './project.js';
export { FeatureModel } from './feature.js';
export { ServiceModel } from './service.js';
export { DeveloperModel } from './developer.js';

/**
 * Returns the appropriate Mongoose model based on the entity type.
 */
export function getModelByType(type: EntityType) {
  switch (type) {
    case 'PROJECT':
      return ProjectModel;
    case 'FEATURE':
      return FeatureModel;
    case 'SERVICE':
      return ServiceModel;
    case 'DEVELOPER':
      return DeveloperModel;
    default:
      throw new Error(`Invalid entity type: ${type}`);
  }
}
