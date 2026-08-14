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
