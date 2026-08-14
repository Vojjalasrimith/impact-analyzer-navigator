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

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatAnalysis {
  targets: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedServices: string[];
  dependsOnServices: string[];
  affectedFeatures: string[];
  developers: string[];
  paths: string[][];
  recommendedTests: string[];
  explanations: string[];
}

export type ChatIntent = 'IMPACT_ANALYSIS' | 'OWNERSHIP' | 'PATH_BETWEEN' | 'NEIGHBORHOOD';

export interface GraphFactsResult {
  intent: ChatIntent;
  items: { id: string; name: string; type: EntityType; relation?: string }[];
  path?: string[];
}

export interface ChatResponse {
  reply: string;
  analysis?: ChatAnalysis;
  graphFacts?: GraphFactsResult;
  matchedEntities: { id: string; name: string; type: EntityType }[];
}

