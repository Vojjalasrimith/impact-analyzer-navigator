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
