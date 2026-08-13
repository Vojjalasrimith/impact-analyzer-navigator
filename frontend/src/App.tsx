import { useEffect, useState } from 'react';
import {
  fetchHealth,
  fetchGraph,
  listEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  createRelationship,
  deleteRelationship,
  type HealthCheckResponse
} from './services/api';
import type { GraphNode, GraphEdge, Entity, EntityType, RelationshipType } from './types/index';
import GraphCanvas from './components/GraphCanvas';
import Sidebar from './components/Sidebar';
import { EntityModal, RelationshipModal } from './components/Modals';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  // Connection states
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Graph and entities states
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [graphLoading, setGraphLoading] = useState<boolean>(true);
  const [graphError, setGraphError] = useState<string | null>(null);

  // Interaction selection states
  const [selectedNode, setSelectedNode] = useState<{ id: string; name: string; type: string; description: string } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Modal open states
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [isRelModalOpen, setIsRelModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<{ id: string; name: string; type: string; description: string } | null>(null);

  // API Call: check health status
  const checkBackendHealth = async () => {
    try {
      setHealthLoading(true);
      setHealthError(null);
      const data = await fetchHealth();
      setHealth(data);
    } catch (err: any) {
      setHealthError(err.message || 'Failed to connect to backend server');
    } finally {
      setHealthLoading(false);
    }
  };

  // API Call: retrieve graph elements
  const loadGraph = async () => {
    try {
      setGraphLoading(true);
      setGraphError(null);
      const [graphData, entitiesData] = await Promise.all([
        fetchGraph(),
        listEntities()
      ]);
      setNodes(graphData.nodes);
      setEdges(graphData.edges);
      setEntities(entitiesData);
    } catch (err: any) {
      setGraphError(err.message || 'Failed to load graph structures');
    } finally {
      setGraphLoading(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    loadGraph();
  }, []);

  // CRUD Handler: Create or Update Entity
  const handleEntitySubmit = async (data: { type: EntityType; name: string; description: string }) => {
    try {
      if (editingNode) {
        // Edit Mode
        await updateEntity(editingNode.id, { name: data.name, description: data.description });
        toast.success('Entity updated successfully!');
        
        // If the selected node is currently being edited, update its visual details in state too
        if (selectedNode && selectedNode.id === editingNode.id) {
          setSelectedNode({
            ...selectedNode,
            name: data.name,
            description: data.description
          });
        }
      } else {
        // Create Mode
        await createEntity(data);
        toast.success('Entity created successfully!');
      }
      setIsEntityModalOpen(false);
      setEditingNode(null);
      await loadGraph();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit entity');
    }
  };

  // CRUD Handler: Delete Entity
  const handleEntityDelete = async () => {
    if (!selectedNode) return;
    const confirm = window.confirm(`Are you sure you want to delete the entity "${selectedNode.name}"?\nThis will remove all associated dependency links.`);
    if (!confirm) return;

    try {
      await deleteEntity(selectedNode.id);
      toast.success('Entity deleted successfully!');
      setSelectedNode(null);
      await loadGraph();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete entity');
    }
  };

  // CRUD Handler: Create Relationship Edge
  const handleRelationshipSubmit = async (data: { from: string; to: string; type: RelationshipType }) => {
    try {
      await createRelationship(data);
      toast.success('Relationship link created!');
      setIsRelModalOpen(false);
      await loadGraph();
    } catch (err: any) {
      toast.error(err.message || 'Failed to establish link');
    }
  };

  // CRUD Handler: Delete Relationship Edge
  const handleRelationshipDelete = async () => {
    if (!selectedEdgeId) return;
    const confirm = window.confirm('Are you sure you want to delete this relationship link?');
    if (!confirm) return;

    try {
      await deleteRelationship(selectedEdgeId);
      toast.success('Relationship link removed!');
      setSelectedEdgeId(null);
      await loadGraph();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete relationship');
    }
  };

  return (
    <div className="app-container">
      {/* 1. Header component */}
      <header className="app-header">
        <div className="logo-container">
          <span className="logo-icon">🔮</span>
          <h1>AI Project Dependency Navigator</h1>
        </div>
        <div className="action-buttons">
          <button
            className="btn btn-secondary-outline"
            onClick={() => { setEditingNode(null); setIsEntityModalOpen(true); }}
            disabled={graphLoading}
          >
            ➕ Add Entity
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsRelModalOpen(true)}
            disabled={graphLoading || entities.length < 2}
          >
            🔗 Add Link
          </button>
        </div>
        <div className="status-indicator">
          {healthLoading ? (
            <span className="badge loading">Checking server...</span>
          ) : healthError ? (
            <span className="badge offline" onClick={checkBackendHealth} title="Click to retry">
              Offline 🔌
            </span>
          ) : (
            <span className="badge online" onClick={checkBackendHealth} title="Click to refresh">
              Online ⚡
            </span>
          )}
        </div>
      </header>

      {/* 2. Main content viewport */}
      <main className="app-main">
        {/* Sidebar panels */}
        <div className="sidebar-wrapper">
          <Sidebar
            selectedNode={selectedNode}
            selectedEdgeId={selectedEdgeId}
            onEditEntity={() => { setEditingNode(selectedNode); setIsEntityModalOpen(true); }}
            onDeleteEntity={handleEntityDelete}
            onDeleteRelationship={handleRelationshipDelete}
          />
        </div>

        {/* Canvas viewport */}
        <div className="canvas-wrapper card">
          {graphLoading && nodes.length === 0 ? (
            <div className="canvas-placeholder">
              <div className="spinner"></div>
              <p>Loading dependency graph canvas...</p>
            </div>
          ) : graphError ? (
            <div className="canvas-placeholder">
              <span className="placeholder-icon">⚠️</span>
              <h3>Failed to load graph</h3>
              <p>{graphError}</p>
              <button className="btn btn-secondary" onClick={loadGraph}>Retry Loading</button>
            </div>
          ) : nodes.length === 0 ? (
            <div className="canvas-placeholder">
              <span className="placeholder-icon">🏜️</span>
              <h3>Graph is empty</h3>
              <p>No project entities found. Click the "+ Add Entity" button in the header to create your first component.</p>
            </div>
          ) : (
            <GraphCanvas
              nodesData={nodes}
              edgesData={edges}
              onSelectNode={setSelectedNode}
              onSelectEdge={setSelectedEdgeId}
            />
          )}
        </div>
      </main>

      {/* 3. Modals */}
      <EntityModal
        isOpen={isEntityModalOpen}
        onClose={() => { setIsEntityModalOpen(false); setEditingNode(null); }}
        onSubmit={handleEntitySubmit}
        initialData={editingNode}
      />

      <RelationshipModal
        isOpen={isRelModalOpen}
        onClose={() => setIsRelModalOpen(false)}
        onSubmit={handleRelationshipSubmit}
        entities={entities}
      />

      <ToastContainer position="bottom-right" autoClose={3000} theme="dark" />
    </div>
  );
}

export default App;
