interface SidebarProps {
  selectedNode: { id: string; name: string; type: string; description: string } | null;
  selectedEdgeId: string | null;
  onEditEntity: () => void;
  onDeleteEntity: () => void;
  onDeleteRelationship: () => void;
  onAskAboutImpact: (serviceName: string) => void;
}

export default function Sidebar({
  selectedNode,
  selectedEdgeId,
  onEditEntity,
  onDeleteEntity,
  onDeleteRelationship,
  onAskAboutImpact
}: SidebarProps) {
  return (
    <aside className="sidebar-container card">
      {/* 1. Selected Node Inspector */}
      {selectedNode && (
        <div className="inspector-panel">
          <div className="inspector-section">
            <span className={`type-badge badge-${selectedNode.type.toLowerCase()}`}>
              {selectedNode.type}
            </span>
            <h2 className="inspector-title">{selectedNode.name}</h2>
            <p className="inspector-desc">
              {selectedNode.description || 'No description provided.'}
            </p>
          </div>

          <div className="action-buttons-group">
            <button className="btn btn-secondary" onClick={onEditEntity}>
              ✏️ Edit Entity
            </button>
            <button className="btn btn-danger-outline" onClick={onDeleteEntity}>
              🗑️ Delete Entity
            </button>
          </div>

          {/* Service Impact Analysis Trigger */}
          {selectedNode.type === 'SERVICE' && (
            <div className="impact-trigger-section">
              <hr className="divider" />
              <h3>Impact Assessment</h3>
              <p className="helper-text">
                Ask the AI chat what could be impacted by changing or migrating this service.
              </p>

              <button
                className="btn btn-primary btn-block"
                onClick={() => onAskAboutImpact(selectedNode.name)}
              >
                💬 Ask AI About Impact
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Selected Edge Inspector */}
      {selectedEdgeId && (
        <div className="inspector-panel">
          <div className="inspector-section">
            <span className="type-badge badge-edge">RELATIONSHIP</span>
            <h2 className="inspector-title">Directed Link</h2>
            <p className="inspector-desc">
              Unique ID: <code className="code-id">{selectedEdgeId}</code>
            </p>
          </div>

          <button className="btn btn-danger btn-block" onClick={onDeleteRelationship}>
            🗑️ Delete Link
          </button>
        </div>
      )}

      {/* 3. Empty State (Nothing selected) */}
      {!selectedNode && !selectedEdgeId && (
        <div className="empty-inspector-state">
          <span className="empty-icon">🖱️</span>
          <h3>Inspector Panel</h3>
          <p>Click any node or relationship link on the graph canvas to inspect properties, run impact simulations, or delete components.</p>
        </div>
      )}
    </aside>
  );
}
