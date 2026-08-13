import neo4j, { Driver } from 'neo4j-driver';
import dotenv from 'dotenv';
import { Relationship, RelationshipType } from '../types/index.js';

dotenv.config();

let driver: Driver | null = null;

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
    } catch (err: any) {
      console.error('CognoDB connection error:', err);
      throw err;
    }
  },

  /**
   * Add a node representation (metadata is in MongoDB, CognoDB registers the node existence)
   */
  createNode: async (id: string, type: string, name: string): Promise<void> => {
    if (!driver) throw new Error('CognoDB driver not initialized');

    const session = driver.session();
    try {
      await session.run(
        'MERGE (n:Entity {id: $id}) ON CREATE SET n.type = $type, n.name = $name ON MATCH SET n.name = $name',
        { id, type, name }
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
