import { 
  ProjectModel, 
  FeatureModel, 
  ServiceModel, 
  DeveloperModel 
} from '../models/index.js';
import { cognoService } from '../services/cognoService.js';
import { EntityType } from '../types/index.js';

interface TraversalResult {
  targetEntity: { id: string; name: string; type: string };
  affectedServices: Array<{ id: string; name: string }>;
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
  findDownstreamImpact: async (startServiceId: string): Promise<TraversalResult> => {
    // 1. Load context resources
    const nodeMap = await buildNodeMap();
    const startNode = nodeMap.get(startServiceId);

    if (!startNode || startNode.type !== 'SERVICE') {
      throw new Error(`Impact analysis can only be run starting from a valid SERVICE. Node '${startServiceId}' not found or is of type '${startNode?.type}'`);
    }

    const rels = await cognoService.getRelationships();

    // 2. BFS: Find all transitively affected services
    // S_B -[DEPENDS_ON]-> S_A means changing S_A impacts S_B.
    // So we follow DEPENDS_ON edges in reverse (from target S_A back to S_B).
    const affectedServices = new Set<string>([startServiceId]);
    const queue = [startServiceId];

    while (queue.length > 0) {
      const currId = queue.shift()!;
      
      // Find relationships pointing to the current service via DEPENDS_ON
      const incomingDeps = rels.filter(
        rel => rel.toEntityId === currId && rel.type === 'DEPENDS_ON'
      );

      for (const rel of incomingDeps) {
        if (!affectedServices.has(rel.fromEntityId)) {
          affectedServices.add(rel.fromEntityId);
          queue.push(rel.fromEntityId);
        }
      }
    }

    // 3. Find affected features
    // FEATURE -[IMPLEMENTED_BY]-> SERVICE
    // Find features implemented by any of our affected services
    const affectedFeatures = new Set<string>();
    rels.forEach(rel => {
      if (rel.type === 'IMPLEMENTED_BY' && affectedServices.has(rel.toEntityId)) {
        affectedFeatures.add(rel.fromEntityId);
      }
    });

    // 4. Find affected projects
    // PROJECT -[HAS_FEATURE]-> FEATURE
    // Find projects containing any of our affected features
    const affectedProjects = new Set<string>();
    rels.forEach(rel => {
      if (rel.type === 'HAS_FEATURE' && affectedFeatures.has(rel.toEntityId)) {
        affectedProjects.add(rel.fromEntityId);
      }
    });

    // 5. Find affected developers
    // SERVICE -[OWNED_BY]-> DEVELOPER
    // Find developers who own any of the affected services
    const affectedDevelopers = new Set<string>();
    rels.forEach(rel => {
      if (rel.type === 'OWNED_BY' && affectedServices.has(rel.fromEntityId)) {
        affectedDevelopers.add(rel.toEntityId);
      }
    });

    // 6. DFS: Find all propagation paths from Projects/Features to target service
    // A path goes forward: PROJECT -> FEATURE -> SERVICE (-[DEPENDS_ON]-> SERVICE)*
    const pathsList: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currId: string, currentPath: string[]) => {
      if (currId === startServiceId) {
        // Resolve names for the final path display
        const resolvedPath = currentPath.map(id => {
          const details = nodeMap.get(id);
          return details ? `${details.name} (${details.type})` : id;
        });
        pathsList.push(resolvedPath);
        return;
      }

      visited.add(currId);

      // Find outgoing links in forward directions:
      // currId -> nextId
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

    // Run DFS starting from each affected Project to trace the chain
    affectedProjects.forEach(projId => {
      dfs(projId, [projId]);
    });

    return {
      targetEntity: {
        id: startServiceId,
        name: startNode.name,
        type: 'SERVICE'
      },
      affectedServices: Array.from(affectedServices)
        .map(id => ({ id, name: nodeMap.get(id)?.name || id })),
      affectedFeatures: Array.from(affectedFeatures)
        .map(id => ({ id, name: nodeMap.get(id)?.name || id })),
      affectedProjects: Array.from(affectedProjects)
        .map(id => ({ id, name: nodeMap.get(id)?.name || id })),
      affectedDevelopers: Array.from(affectedDevelopers)
        .map(id => ({ id, name: nodeMap.get(id)?.name || id }))
        .filter(d => d.name !== startNode.name), // filter out starting node reference safety
      paths: pathsList
    };
  }
};
