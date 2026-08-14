import { 
  ProjectModel, 
  FeatureModel, 
  ServiceModel, 
  DeveloperModel 
} from '../models/index.js';
import { cognoService } from '../services/cognoService.js';
import { EntityType } from '../types/index.js';

export interface MultiTraversalResult {
  targets: Array<{ id: string; name: string }>;
  affectedServices: Array<{ id: string; name: string }>;
  dependsOnServices: Array<{ id: string; name: string }>;
  affectedFeatures: Array<{ id: string; name: string }>;
  affectedProjects: Array<{ id: string; name: string }>;
  affectedDevelopers: Array<{ id: string; name: string }>;
  paths: string[][];
}

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

  const map = new Map<string, { name: string; type: EntityType }>();
  
  projects.forEach(p => map.set(p.id, { name: p.name, type: 'PROJECT' }));
  features.forEach(f => map.set(f.id, { name: f.name, type: 'FEATURE' }));
  services.forEach(s => map.set(s.id, { name: s.name, type: 'SERVICE' }));
  developers.forEach(d => map.set(d.id, { name: d.name, type: 'DEVELOPER' }));

  return map;
}

export const graphTraversalService = {
  analyzeMultiImpact: async (startServiceIds: string[]): Promise<MultiTraversalResult> => {
    const nodeMap = await buildNodeMap();

    const validTargets = startServiceIds
      .map(id => ({ id, details: nodeMap.get(id) }))
      .filter((t): t is { id: string; details: { name: string; type: EntityType } } =>
        !!t.details && t.details.type === 'SERVICE'
      );

    if (validTargets.length === 0) {
      throw new Error('No valid SERVICE entities found among the provided ids');
    }

    const validStartIds = validTargets.map(t => t.id);
    const rels = await cognoService.getRelationships();

    // Downstream: what depends on the targets (reverse DEPENDS_ON BFS, seeded from all targets)
    const affectedServices = new Set<string>(validStartIds);
    const downstreamQueue = [...validStartIds];
    while (downstreamQueue.length > 0) {
      const currId = downstreamQueue.shift()!;
      const incomingDeps = rels.filter(rel => rel.toEntityId === currId && rel.type === 'DEPENDS_ON');
      for (const rel of incomingDeps) {
        if (!affectedServices.has(rel.fromEntityId)) {
          affectedServices.add(rel.fromEntityId);
          downstreamQueue.push(rel.fromEntityId);
        }
      }
    }

    // Upstream: what the targets depend on (forward DEPENDS_ON BFS, seeded from all targets)
    const dependsOnServices = new Set<string>();
    const upstreamVisited = new Set<string>(validStartIds);
    const upstreamQueue = [...validStartIds];
    while (upstreamQueue.length > 0) {
      const currId = upstreamQueue.shift()!;
      const outgoingDeps = rels.filter(rel => rel.fromEntityId === currId && rel.type === 'DEPENDS_ON');
      for (const rel of outgoingDeps) {
        if (!upstreamVisited.has(rel.toEntityId)) {
          upstreamVisited.add(rel.toEntityId);
          dependsOnServices.add(rel.toEntityId);
          upstreamQueue.push(rel.toEntityId);
        }
      }
    }

    // Affected features/projects/developers derive from the downstream set
    const affectedFeatures = new Set<string>();
    rels.forEach(rel => {
      if (rel.type === 'IMPLEMENTED_BY' && affectedServices.has(rel.toEntityId)) {
        affectedFeatures.add(rel.fromEntityId);
      }
    });

    const affectedProjects = new Set<string>();
    rels.forEach(rel => {
      if (rel.type === 'HAS_FEATURE' && affectedFeatures.has(rel.toEntityId)) {
        affectedProjects.add(rel.fromEntityId);
      }
    });

    const affectedDevelopers = new Set<string>();
    rels.forEach(rel => {
      if (rel.type === 'OWNED_BY' && affectedServices.has(rel.fromEntityId)) {
        affectedDevelopers.add(rel.toEntityId);
      }
    });

    // DFS from each affected project forward until it reaches any target service
    const targetIdSet = new Set(validStartIds);
    const pathsList: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currId: string, currentPath: string[]) => {
      if (targetIdSet.has(currId)) {
        const resolvedPath = currentPath.map(id => {
          const details = nodeMap.get(id);
          return details ? `${details.name} (${details.type})` : id;
        });
        pathsList.push(resolvedPath);
        return;
      }

      visited.add(currId);

      const outgoing = rels.filter(rel => rel.fromEntityId === currId);
      for (const rel of outgoing) {
        const nextId = rel.toEntityId;
        if (!visited.has(nextId)) {
          currentPath.push(nextId);
          dfs(nextId, currentPath);
          currentPath.pop();
        }
      }

      visited.delete(currId);
    };

    affectedProjects.forEach(projId => {
      dfs(projId, [projId]);
    });

    return {
      targets: validTargets.map(t => ({ id: t.id, name: t.details.name })),
      affectedServices: Array.from(affectedServices)
        .map(id => ({ id, name: nodeMap.get(id)?.name || id })),
      dependsOnServices: Array.from(dependsOnServices)
        .map(id => ({ id, name: nodeMap.get(id)?.name || id })),
      affectedFeatures: Array.from(affectedFeatures)
        .map(id => ({ id, name: nodeMap.get(id)?.name || id })),
      affectedProjects: Array.from(affectedProjects)
        .map(id => ({ id, name: nodeMap.get(id)?.name || id })),
      affectedDevelopers: Array.from(affectedDevelopers)
        .map(id => ({ id, name: nodeMap.get(id)?.name || id })),
      paths: pathsList
    };
  }
};
