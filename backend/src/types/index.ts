export type EntityType = 'PROJECT' | 'FEATURE' | 'SERVICE' | 'DEVELOPER';

export type RelationshipType = 'HAS_FEATURE' | 'IMPLEMENTED_BY' | 'DEPENDS_ON' | 'OWNED_BY';

export interface Entity {
  id: string; // Will map from MongoDB _id
  type: EntityType;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Relationship {
  id: string; // CognoDB edge/relation identifier or DB record ID
  fromEntityId: string;
  toEntityId: string;
  type: RelationshipType;
}

// Validation rules map: FromType -> { RelationshipType: ToType[] }
export const VALID_RELATIONSHIPS: Record<EntityType, Partial<Record<RelationshipType, EntityType[]>>> = {
  PROJECT: {
    HAS_FEATURE: ['FEATURE']
  },
  FEATURE: {
    IMPLEMENTED_BY: ['SERVICE']
  },
  SERVICE: {
    DEPENDS_ON: ['SERVICE'],
    OWNED_BY: ['DEVELOPER']
  },
  DEVELOPER: {} // Developers do not initiate any outgoing valid relationships in this schema
};

export interface GraphData {
  nodes: Array<{
    id: string;
    type: EntityType;
    data: {
      label: string;
      description: string;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label: RelationshipType;
  }>;
}

export interface ImpactAnalysisResult {
  target: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  affectedServices: string[];
  affectedFeatures: string[];
  developers: string[];
  paths: string[][];
  recommendedTests: string[];
  explanations: string[];
}

