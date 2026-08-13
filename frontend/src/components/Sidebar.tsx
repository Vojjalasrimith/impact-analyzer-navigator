import { useState } from 'react';
import { runImpactAnalysis } from '../services/api.js';
import type { ImpactAnalysisResult } from '../types/index.js';

interface SidebarProps {
  selectedNode: { id: string; name: string; type: string; description: string } | null;
  selectedEdgeId: string | null;
  onEditEntity: () => void;
  onDeleteEntity: () => void;
  onDeleteRelationship: () => void;
}

export default function Sidebar({
  selectedNode,
  selectedEdgeId,
  onEditEntity,
  onDeleteEntity,
  onDeleteRelationship
}: SidebarProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImpactAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selectedNode || selectedNode.type !== 'SERVICE') return;
    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setAnalysisResult(null);

      const result = await runImpactAnalysis(selectedNode.id);
      setAnalysisResult(result);
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to execute impact analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setAnalysisError(null);
  };

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
                Run an AI-powered dependency traversal to see what projects, features, and teams could be impacted by modifying this service.
              </p>

              {!analysisResult && !analyzing && (
                <button className="btn btn-primary btn-block" onClick={handleAnalyze}>
                  🚀 Run Impact Analysis
                </button>
              )}

              {analyzing && (
                <div className="analysis-loading-state">
                  <div className="spinner"></div>
                  <p>Traversing dependency graph & compiling AI analysis...</p>
                </div>
              )}

              {analysisError && (
                <div className="error-alert">
                  <strong>Analysis Failed:</strong> {analysisError}
                  <button className="btn-retry" onClick={handleAnalyze}>Retry</button>
                </div>
              )}
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

      {/* 4. Gemini Impact Analysis Results Panel */}
      {analysisResult && selectedNode?.type === 'SERVICE' && (
        <div className="analysis-results-overlay card">
          <div className="analysis-header">
            <h3>Impact Analysis Result</h3>
            <button className="btn-close-analysis" onClick={clearAnalysis} title="Clear Analysis">
              ✕
            </button>
          </div>

          <div className="risk-container">
            <span className="risk-label">Risk Level:</span>
            <span className={`risk-badge risk-${analysisResult.risk.toLowerCase()}`}>
              {analysisResult.risk}
            </span>
          </div>

          <div className="result-section">
            <h4>Summary</h4>
            <p className="analysis-text">{analysisResult.summary}</p>
          </div>

          {analysisResult.affectedServices.length > 0 && (
            <div className="result-section">
              <h4>Affected Services</h4>
              <div className="list-tags">
                {analysisResult.affectedServices.map(s => (
                  <span key={s} className="tag tag-service">{s}</span>
                ))}
              </div>
            </div>
          )}

          {analysisResult.affectedFeatures.length > 0 && (
            <div className="result-section">
              <h4>Affected Features</h4>
              <div className="list-tags">
                {analysisResult.affectedFeatures.map(f => (
                  <span key={f} className="tag tag-feature">{f}</span>
                ))}
              </div>
            </div>
          )}

          {analysisResult.developers.length > 0 && (
            <div className="result-section">
              <h4>Impacted Teams / Owners</h4>
              <div className="list-tags">
                {analysisResult.developers.map(d => (
                  <span key={d} className="tag tag-dev">{d}</span>
                ))}
              </div>
            </div>
          )}

          {analysisResult.recommendedTests.length > 0 && (
            <div className="result-section">
              <h4>Recommended Tests</h4>
              <ul className="bullet-list">
                {analysisResult.recommendedTests.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Explainability Section - Dependency Paths */}
          {analysisResult.paths && analysisResult.paths.length > 0 && (
            <div className="result-section paths-section">
              <h4>Factual Traversal Paths</h4>
              <p className="helper-text">Verified backend dependency paths backing the AI reasoning:</p>
              <div className="paths-container">
                {analysisResult.paths.map((path, pIdx) => (
                  <div key={pIdx} className="path-display">
                    {path.map((step, sIdx) => (
                      <span key={sIdx} className="path-step">
                        {step}
                        {sIdx < path.length - 1 && <span className="path-arrow"> → </span>}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisResult.explanations.length > 0 && (
            <div className="result-section">
              <h4>Explanations</h4>
              <ul className="bullet-list">
                {analysisResult.explanations.map((exp, idx) => (
                  <li key={idx}>{exp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
