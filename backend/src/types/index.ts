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

export interface ChatContextNeighbor {
  id: string;
  name: string;
  type: EntityType;
  relType: RelationshipType;
  direction: 'outgoing' | 'incoming';
}

/**
 * Everything retrieved from the graph in a single pass for a chat question: the entities the
 * question resolved to, their direct connections, and (where the matches include SERVICEs) the
 * downstream/upstream impact, affected features/projects, and owners. Gemini answers freely from
 * this — a plain lookup and a full impact analysis both come from the same retrieval.
 */
export interface ChatContext {
  matchedEntities: { id: string; name: string; type: EntityType }[];
  neighbors: ChatContextNeighbor[];
  downstreamServices: { id: string; name: string }[];
  upstreamServices: { id: string; name: string }[];
  affectedFeatures: { id: string; name: string }[];
  affectedProjects: { id: string; name: string }[];
  owners: { id: string; name: string }[];
  paths: string[][];
}

export interface GraphSummaryEntity {
  id: string;
  name: string;
  type: EntityType;
  description: string;
}

export interface GraphSummaryRelationship {
  from: string;
  fromType: EntityType;
  relType: RelationshipType;
  to: string;
  toType: EntityType;
}

/**
 * Whole-graph snapshot used as a fallback context when a chat question doesn't name anything
 * CognoDB's full-text search can link to (e.g. "what existing services could I reuse for a new
 * email workflow?"). Still pure structural traversal data — all entities + all relationships, not
 * semantic search — Gemini just reasons over the full known graph instead of a targeted neighborhood.
 */
export interface GraphSummary {
  entities: GraphSummaryEntity[];
  relationships: GraphSummaryRelationship[];
}

export interface ChatResponse {
  reply: string;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedTests?: string[];
  explanations?: string[];
  context?: ChatContext;
  matchedEntities: { id: string; name: string; type: EntityType }[];
}

