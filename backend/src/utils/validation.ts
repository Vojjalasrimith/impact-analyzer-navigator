import { EntityType, RelationshipType, VALID_RELATIONSHIPS } from '../types/index.js';

/**
 * Validates if a directed relationship is compatible based on the source and target entity types.
 *
 * @param fromType The entity type initiating the relationship (e.g., 'PROJECT')
 * @param toType The entity type receiving the relationship (e.g., 'FEATURE')
 * @param relationshipType The type of connection link (e.g., 'HAS_FEATURE')
 * @returns boolean indicating if the relationship combination is allowed
 */
export function isValidRelationship(
  fromType: EntityType,
  toType: EntityType,
  relationshipType: RelationshipType
): boolean {
  const allowedTargetTypes = VALID_RELATIONSHIPS[fromType]?.[relationshipType];
  
  if (!allowedTargetTypes) {
    return false;
  }
  
  return allowedTargetTypes.includes(toType);
}
