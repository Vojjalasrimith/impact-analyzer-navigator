import neo4j, { Driver } from 'neo4j-driver';
import dotenv from 'dotenv';
import { Relationship, RelationshipType, EntityType } from '../types/index.js';

dotenv.config();

let driver: Driver | null = null;

export interface CognoEntityMatch {
  id: string;
  name: string;
  type: EntityType;
  description: string;
  score: number;
}

export interface CognoPathNode {
  id: string;
  name: string;
  type: EntityType;
}

export interface CognoNeighbor {
  id: string;
  name: string;
  type: EntityType;
  relType: RelationshipType;
  direction: 'outgoing' | 'incoming';
}

function escapeLucene(term: string): string {
  return term.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&');
}

export const cognoService = {
  /**
   * Connect to CognoDB Cloud
   */
  connect: async (url: string, key: string, username: string): Promise<void> => {
    if (!url) {
      throw new Error('CognoDB connection URL is missing in environment variables.');
    }
    try {
      driver = neo4j.driver(url, neo4j.auth.basic(username, key));
      await driver.verifyConnectivity();
      console.log('Successfully connected to CognoDB Cloud');

      const session = driver.session();
      try {
        await session.run(
          'CREATE FULLTEXT INDEX entitySearchIndex IF NOT EXISTS FOR (n:Entity) ON EACH [n.name, n.description]'
        );
      } finally {
        await session.close();
      }
    } catch (err: any) {
      console.error('CognoDB connection error:', err);
      throw err;
    }
  },

  /**
   * Add a node representation (metadata is in MongoDB, CognoDB caches searchable fields for graph-native retrieval)
   */
  createNode: async (id: string, type: string, name: string, description: string = ''): Promise<void> => {
    if (!driver) throw new Error('CognoDB driver not initialized');

    const session = driver.session();
    try {
      await session.run(
        `MERGE (n:Entity {id: $id})
         ON CREATE SET n.type = $type, n.name = $name, n.description = $description
         ON MATCH SET n.name = $name, n.description = $description`,
        { id, type, name, description }
      );
    } finally {
      await session.close();
    }
  },

  /**
   * Delete a node and all its incoming/outgoing relationships
   */
  deleteNode: async (id: string): Promise<void> => {
    if (!driver) throw new Error('CognoDB driver not initialized');

    const session = driver.session();
    try {
      // DETACH DELETE removes the node and any connecting edges
      await session.run('MATCH (n:Entity {id: $id}) DETACH DELETE n', { id });
    } finally {
      await session.close();
    }
  },

  /**
   * Create a directed relationship
   */
  createRelationship: async (
    fromId: string,
    toId: string,
    type: RelationshipType
  ): Promise<Relationship> => {
    if (!driver) throw new Error('CognoDB driver not initialized');

    const relId = `${fromId}_${type}_${toId}`;
    const newRel: Relationship = { id: relId, fromEntityId: fromId, toEntityId: toId, type };

    const session = driver.session();
    try {
      // Since type is verified as safe RelationshipType, we can interpolate it in the relationship label
      await session.run(
        `MATCH (a:Entity {id: $fromId}), (b:Entity {id: $toId})
         MERGE (a)-[r:${type} {id: $relId}]->(b)
         RETURN r`,
        { fromId, toId, relId }
      );
      return newRel;
    } finally {
      await session.close();
    }
  },

  /**
   * Delete a relationship by its ID
   */
  deleteRelationship: async (relId: string): Promise<void> => {
    if (!driver) throw new Error('CognoDB driver not initialized');

    const session = driver.session();
    try {
      await session.run(
        `MATCH (a)-[r {id: $relId}]->(b)
         DELETE r`,
        { relId }
      );
    } finally {
      await session.close();
    }
  },

  /**
   * Retrieve all relationships (useful for building the whole graph)
   */
  getRelationships: async (): Promise<Relationship[]> => {
    if (!driver) throw new Error('CognoDB driver not initialized');

    const session = driver.session();
    try {
      const result = await session.run(
        'MATCH (a:Entity)-[r]->(b:Entity) RETURN r.id as id, a.id as fromId, b.id as toId, type(r) as type'
      );

      return result.records.map(record => ({
        id: record.get('id'),
        fromEntityId: record.get('fromId'),
        toEntityId: record.get('toId'),
        type: record.get('type') as RelationshipType
      }));
    } finally {
      await session.close();
    }
  },

  /**
   * Full-text search over node name/description (graph-native entity linking, no Mongo involved)
   */
  searchEntities: async (queryText: string, limit: number = 20): Promise<CognoEntityMatch[]> => {
    if (!driver) throw new Error('CognoDB driver not initialized');

    const terms = queryText.split(/\s+/).map(t => t.trim()).filter(Boolean);
    if (terms.length === 0) return [];
    const luceneQuery = terms.map(t => escapeLucene(t)).join(' OR ');

    const session = driver.session();
    try {
      const result = await session.run(
        `CALL db.index.fulltext.queryNodes('entitySearchIndex', $luceneQuery) YIELD node, score
         RETURN node.id as id, node.name as name, node.type as type, node.description as description, score
         ORDER BY score DESC
         LIMIT $limit`,
        { luceneQuery, limit: neo4j.int(limit) }
      );

      return result.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        type: record.get('type') as EntityType,
        description: record.get('description') || '',
        score: record.get('score')
      }));
    } finally {
      await session.close();
    }
  },

  /**
   * Owners (DEVELOPER) of the given SERVICE entities, via OWNED_BY
   */
  findOwners: async (entityIds: string[]): Promise<Array<{ id: string; name: string }>> => {
    if (!driver) throw new Error('CognoDB driver not initialized');
    if (entityIds.length === 0) return [];

    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (s:Entity) WHERE s.id IN $ids
         MATCH (s)-[:OWNED_BY]->(dev:Entity)
         RETURN DISTINCT dev.id as id, dev.name as name`,
        { ids: entityIds }
      );

      return result.records.map(record => ({
        id: record.get('id'),
        name: record.get('name')
      }));
    } finally {
      await session.close();
    }
  },

  /**
   * Shortest path (any relationship type/direction) between two entities
   */
  findShortestPath: async (fromId: string, toId: string): Promise<CognoPathNode[] | null> => {
    if (!driver) throw new Error('CognoDB driver not initialized');

    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (a:Entity {id: $fromId}), (b:Entity {id: $toId})
         MATCH p = shortestPath((a)-[*..8]-(b))
         RETURN [n IN nodes(p) | {id: n.id, name: n.name, type: n.type}] as path`,
        { fromId, toId }
      );

      if (result.records.length === 0) return null;
      return result.records[0].get('path') as CognoPathNode[];
    } finally {
      await session.close();
    }
  },

  /**
   * One-hop neighborhood of an entity, any relationship type/direction
   */
  findNeighborhood: async (entityId: string): Promise<CognoNeighbor[]> => {
    if (!driver) throw new Error('CognoDB driver not initialized');

    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (n:Entity {id: $entityId})-[r]-(neighbor:Entity)
         RETURN neighbor.id as id, neighbor.name as name, neighbor.type as type, type(r) as relType,
                CASE WHEN startNode(r) = n THEN 'outgoing' ELSE 'incoming' END as direction`,
        { entityId }
      );

      return result.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        type: record.get('type') as EntityType,
        relType: record.get('relType') as RelationshipType,
        direction: record.get('direction') as 'outgoing' | 'incoming'
      }));
    } finally {
      await session.close();
    }
  },

  /**
   * Clear the entire graph (deletes all nodes and relationships)
   */
  clearGraph: async (): Promise<void> => {
    if (!driver) throw new Error('CognoDB driver not initialized');
    const session = driver.session();
    try {
      await session.run('MATCH (n:Entity) DETACH DELETE n');
    } finally {
      await session.close();
    }
  }
};
