export type EntityType = 'PROJECT' | 'FEATURE' | 'SERVICE' | 'DEVELOPER';

export type RelationshipType = 'HAS_FEATURE' | 'IMPLEMENTED_BY' | 'DEPENDS_ON' | 'OWNED_BY';

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Relationship {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  type: RelationshipType;
}

export interface GraphNode {
  id: string;
  type: EntityType;
  data: {
    label: string;
    description: string;
  };
  position?: { x: number; y: number }; // React Flow positioning
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: RelationshipType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
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

export interface ChatResponse {
  reply: string;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedTests?: string[];
  explanations?: string[];
  context?: ChatContext;
  matchedEntities: { id: string; name: string; type: EntityType }[];
}
