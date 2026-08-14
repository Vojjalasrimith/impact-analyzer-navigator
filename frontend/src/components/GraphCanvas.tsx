import { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphNode, GraphEdge } from '../types/index.js';

// Custom Node Component
const getIcon = (type: string) => {
  switch (type) {
    case 'PROJECT': return '📁';
    case 'FEATURE': return '⭐';
    case 'SERVICE': return '⚙️';
    case 'DEVELOPER': return '👤';
    default: return '📄';
  }
};

export const CustomNode = ({ data, type }: any) => {
  return (
    <div className={`rf-custom-node node-${type?.toLowerCase()}`}>
      <Handle type="target" position={Position.Top} className="rf-handle" />
      <div className="rf-node-header">
        <span className="rf-node-icon">{getIcon(type)}</span>
        <span className="rf-node-type">{type}</span>
      </div>
      <div className="rf-node-body">
        <div className="rf-node-label">{data.label}</div>
        {data.description && <div className="rf-node-desc">{data.description}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="rf-handle" />
    </div>
  );
};

interface GraphCanvasProps {
  nodesData: GraphNode[];
  edgesData: GraphEdge[];
  onSelectNode: (node: { id: string; name: string; type: string; description: string } | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
}

export default function GraphCanvas({
  nodesData,
  edgesData,
  onSelectNode,
  onSelectEdge
}: GraphCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // NodeTypes registration for custom components
  const nodeTypes = useMemo(() => ({
    PROJECT: CustomNode,
    FEATURE: CustomNode,
    SERVICE: CustomNode,
    DEVELOPER: CustomNode
  }), []);

  // Compute structured layered positions on load/reload
  useEffect(() => {
    const typeCounts: Record<string, number> = {
      PROJECT: 0,
      FEATURE: 0,
      SERVICE: 0,
      DEVELOPER: 0
    };

    const yOffsets: Record<string, number> = {
      PROJECT: 40,
      FEATURE: 180,
      SERVICE: 340,
      DEVELOPER: 500
    };

    const formattedNodes: Node[] = nodesData.map((node) => {
      const t = node.type;
      const index = typeCounts[t] || 0;
      typeCounts[t] = index + 1;

      // Space out nodes centered in layers
      const x = 50 + index * 240;
      const y = yOffsets[t] || 100;

      return {
        id: node.id,
        type: node.type,
        data: node.data,
        position: { x, y }
      };
    });

    const formattedEdges: Edge[] = edgesData.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'default',
      animated: edge.label === 'DEPENDS_ON',
      style: { stroke: edge.label === 'DEPENDS_ON' ? '#3b82f6' : '#8b5cf6', strokeWidth: 2 },
      labelStyle: { fill: '#9ca3af', fontSize: 10, fontWeight: 600 }
    }));

    setNodes(formattedNodes);
    setEdges(formattedEdges);
  }, [nodesData, edgesData, setNodes, setEdges]);

  // Selection handlers
  const handleSelectionChange = ({ nodes: selectedNodes, edges: selectedEdges }: any) => {
    if (selectedNodes && selectedNodes.length > 0) {
      const selectedNode = selectedNodes[0];
      onSelectNode({
        id: selectedNode.id,
        name: selectedNode.data.label,
        type: selectedNode.type || '',
        description: selectedNode.data.description || ''
      });
      onSelectEdge(null);
    } else if (selectedEdges && selectedEdges.length > 0) {
      onSelectEdge(selectedEdges[0].id);
      onSelectNode(null);
    } else {
      onSelectNode(null);
      onSelectEdge(null);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', background: '#0e1117' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'PROJECT': return '#8b5cf6';
              case 'FEATURE': return '#3b82f6';
              case 'SERVICE': return '#10b981';
              case 'DEVELOPER': return '#f59e0b';
              default: return '#374151';
            }
          }}
          style={{ background: '#12141c', border: '1px solid rgba(255,255,255,0.08)' }}
        />
        <Background gap={12} size={1} color="rgba(255,255,255,0.05)" />
      </ReactFlow>
    </div>
  );
}
