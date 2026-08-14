import {
  ProjectModel,
  FeatureModel,
  ServiceModel,
  DeveloperModel
} from '../models/index.js';
import { cognoService } from '../services/cognoService.js';
import { EntityType, ChatContext, GraphSummary } from '../types/index.js';

/**
 * Helper to build a lookup map of all node details from MongoDB
 */
async function buildNodeMap() {
  const [projects, features, services, developers] = await Promise.all([
    ProjectModel.find(),
    FeatureModel.find(),
    ServiceModel.find(),
    DeveloperModel.find()
  ]);

  const map = new Map<string, { name: string; type: EntityType; description: string }>();

  projects.forEach(p => map.set(p.id, { name: p.name, type: 'PROJECT', description: p.description }));
  features.forEach(f => map.set(f.id, { name: f.name, type: 'FEATURE', description: f.description }));
  services.forEach(s => map.set(s.id, { name: s.name, type: 'SERVICE', description: s.description }));
  developers.forEach(d => map.set(d.id, { name: d.name, type: 'DEVELOPER', description: d.description }));

  return map;
}

export const graphTraversalService = {
  /**
   * Compiles the full local graph context around a set of matched entities (any type): direct
   * connections, downstream/upstream service impact, affected features/projects, owners, and
   * paths between the matched entities themselves. This is the single retrieval pass fed to
   * Gemini for every chat question, whether it's a plain lookup or an impact analysis.
   */
  compileContext: async (entityIds: string[]): Promise<ChatContext> => {
    const nodeMap = await buildNodeMap();

    const matchedEntities = entityIds
      .map(id => ({ id, details: nodeMap.get(id) }))
      .filter((e): e is { id: string; details: { name: string; type: EntityType; description: string } } => !!e.details)
      .map(e => ({ id: e.id, name: e.details.name, type: e.details.type }));

    if (matchedEntities.length === 0) {
      return {
        matchedEntities: [],
        neighbors: [],
        downstreamServices: [],
        upstreamServices: [],
        affectedFeatures: [],
        affectedProjects: [],
        owners: [],
        paths: []
      };
    }

    const matchedIds = new Set(matchedEntities.map(e => e.id));
    const serviceStartIds = matchedEntities.filter(e => e.type === 'SERVICE').map(e => e.id);
    const rels = await cognoService.getRelationships();

    // Direct (1-hop) connections of every matched entity, in either direction
    const neighbors = rels
      .filter(rel => matchedIds.has(rel.fromEntityId) || matchedIds.has(rel.toEntityId))
      .map(rel => {
        const direction: 'outgoing' | 'incoming' = matchedIds.has(rel.fromEntityId) ? 'outgoing' : 'incoming';
        const neighborId = direction === 'outgoing' ? rel.toEntityId : rel.fromEntityId;
        const details = nodeMap.get(neighborId);
        return details
          ? { id: neighborId, name: details.name, type: details.type, relType: rel.type, direction }
          : null;
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);

    // Downstream: what depends on the matched SERVICE(s) (reverse DEPENDS_ON BFS)
    const downstreamIds = new Set<string>(serviceStartIds);
    const downstreamQueue = [...serviceStartIds];
    while (downstreamQueue.length > 0) {
      const currId = downstreamQueue.shift()!;
      rels
        .filter(rel => rel.toEntityId === currId && rel.type === 'DEPENDS_ON')
        .forEach(rel => {
          if (!downstreamIds.has(rel.fromEntityId)) {
            downstreamIds.add(rel.fromEntityId);
            downstreamQueue.push(rel.fromEntityId);
          }
        });
    }
    // Upstream: what the matched SERVICE(s) depend on (forward DEPENDS_ON BFS)
    const upstreamIds = new Set<string>();
    const upstreamVisited = new Set<string>(serviceStartIds);
    const upstreamQueue = [...serviceStartIds];
    while (upstreamQueue.length > 0) {
      const currId = upstreamQueue.shift()!;
      rels
        .filter(rel => rel.fromEntityId === currId && rel.type === 'DEPENDS_ON')
        .forEach(rel => {
          if (!upstreamVisited.has(rel.toEntityId)) {
            upstreamVisited.add(rel.toEntityId);
            upstreamIds.add(rel.toEntityId);
            upstreamQueue.push(rel.toEntityId);
          }
        });
    }

    // Features/projects reachable from the downstream set
    const affectedFeatureIds = new Set<string>();
    rels.forEach(rel => {
      if (rel.type === 'IMPLEMENTED_BY' && downstreamIds.has(rel.toEntityId)) {
        affectedFeatureIds.add(rel.fromEntityId);
      }
    });

    const affectedProjectIds = new Set<string>();
    rels.forEach(rel => {
      if (rel.type === 'HAS_FEATURE' && affectedFeatureIds.has(rel.toEntityId)) {
        affectedProjectIds.add(rel.fromEntityId);
      }
    });

    // Owners of the matched + downstream services
    const ownerIds = new Set<string>();
    rels.forEach(rel => {
      if (rel.type === 'OWNED_BY' && downstreamIds.has(rel.fromEntityId)) {
        ownerIds.add(rel.toEntityId);
      }
    });

    // Shortest path between every pair of matched entities (only meaningful with 2+ matches)
    const paths: string[][] = [];
    for (let i = 0; i < matchedEntities.length; i++) {
      for (let j = i + 1; j < matchedEntities.length; j++) {
        const path = await cognoService.findShortestPath(matchedEntities[i].id, matchedEntities[j].id);
        if (path) {
          paths.push(path.map(n => `${n.name} (${n.type})`));
        }
      }
    }

    const toNamed = (ids: Set<string>) =>
      Array.from(ids).map(id => ({ id, name: nodeMap.get(id)?.name || id }));

    return {
      matchedEntities,
      neighbors,
      downstreamServices: toNamed(downstreamIds).filter(s => !serviceStartIds.includes(s.id)),
      upstreamServices: toNamed(upstreamIds),
      affectedFeatures: toNamed(affectedFeatureIds),
      affectedProjects: toNamed(affectedProjectIds),
      owners: toNamed(ownerIds),
      paths
    };
  },

  /**
   * Whole-graph snapshot (every entity + every relationship, resolved to names) — the fallback
   * context for chat questions that don't name anything CognoDB's full-text search can link to.
   */
  compileGraphSummary: async (): Promise<GraphSummary> => {
    const nodeMap = await buildNodeMap();
    const rels = await cognoService.getRelationships();

    const entities = Array.from(nodeMap.entries()).map(([id, details]) => ({
      id,
      name: details.name,
      type: details.type,
      description: details.description
    }));

    const relationships = rels
      .map(rel => {
        const from = nodeMap.get(rel.fromEntityId);
        const to = nodeMap.get(rel.toEntityId);
        return from && to
          ? { from: from.name, fromType: from.type, relType: rel.type, to: to.name, toType: to.type }
          : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return { entities, relationships };
  }
};
