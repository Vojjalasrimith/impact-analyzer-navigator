import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { sendChatMessage } from '../services/api.js';
import type { ChatTurn, ChatContext, EntityType } from '../types/index.js';

interface ChatMessage extends ChatTurn {
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedTests?: string[];
  explanations?: string[];
  context?: ChatContext;
}

const TAG_CLASS: Record<EntityType, string> = {
  SERVICE: 'tag-service',
  FEATURE: 'tag-feature',
  DEVELOPER: 'tag-dev',
  PROJECT: 'tag-project'
};

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  prefill: string;
}

export default function ChatPanel({ isOpen, onClose, prefill }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefill) {
      setInput(prefill);
    }
  }, [prefill]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const history: ChatTurn[] = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setError(null);
    setSending(true);

    try {
      const response = await sendChatMessage(trimmed, history);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.reply,
        risk: response.risk,
        recommendedTests: response.recommendedTests,
        explanations: response.explanations,
        context: response.context
      }]);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-drawer-overlay" onClick={onClose}>
      <div className="chat-drawer card" onClick={e => e.stopPropagation()}>
        <div className="chat-header">
          <h2>💬 Ask AI</h2>
          <button className="btn-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-inspector-state">
              <span className="empty-icon">🤖</span>
              <h3>Ask anything about the graph</h3>
              <p>e.g. "Who owns the Payment Service?" or "What's the impact of migrating the notification service?"</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-message chat-message-${msg.role}`}>
              <div className="chat-bubble">{msg.content}</div>
              <ContextCard message={msg} />
            </div>
          ))}

          {sending && (
            <div className="chat-message chat-message-assistant">
              <div className="chat-bubble chat-bubble-loading">
                <div className="spinner"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-row">
          <textarea
            className="form-input chat-textarea"
            placeholder="Ask about the graph..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={sending}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextCard({ message }: { message: ChatMessage }) {
  const { risk, recommendedTests, explanations, context } = message;
  const hasRisk = !!risk;
  const hasTests = !!recommendedTests && recommendedTests.length > 0;
  const hasExplanations = !!explanations && explanations.length > 0;
  const hasContext = !!context && (
    context.neighbors.length > 0 ||
    context.downstreamServices.length > 0 ||
    context.upstreamServices.length > 0 ||
    context.affectedFeatures.length > 0 ||
    context.affectedProjects.length > 0 ||
    context.owners.length > 0 ||
    context.paths.length > 0
  );

  if (!hasRisk && !hasTests && !hasExplanations && !hasContext) return null;

  return (
    <div className="analysis-results-inline card">
      {hasRisk && (
        <div className="risk-container">
          <span className="risk-label">Risk Level:</span>
          <span className={`risk-badge risk-${risk!.toLowerCase()}`}>{risk}</span>
        </div>
      )}

      {context && context.downstreamServices.length > 0 && (
        <div className="result-section">
          <h4>Downstream — Affected Services</h4>
          <div className="list-tags">
            {context.downstreamServices.map(s => <span key={s.id} className="tag tag-service">{s.name}</span>)}
          </div>
        </div>
      )}

      {context && context.upstreamServices.length > 0 && (
        <div className="result-section">
          <h4>Upstream — Depends On</h4>
          <div className="list-tags">
            {context.upstreamServices.map(s => <span key={s.id} className="tag tag-service">{s.name}</span>)}
          </div>
        </div>
      )}

      {context && context.affectedFeatures.length > 0 && (
        <div className="result-section">
          <h4>Affected Features</h4>
          <div className="list-tags">
            {context.affectedFeatures.map(f => <span key={f.id} className="tag tag-feature">{f.name}</span>)}
          </div>
        </div>
      )}

      {context && context.affectedProjects.length > 0 && (
        <div className="result-section">
          <h4>Affected Projects</h4>
          <div className="list-tags">
            {context.affectedProjects.map(p => <span key={p.id} className="tag tag-project">{p.name}</span>)}
          </div>
        </div>
      )}

      {context && context.owners.length > 0 && (
        <div className="result-section">
          <h4>Owners</h4>
          <div className="list-tags">
            {context.owners.map(o => <span key={o.id} className="tag tag-dev">{o.name}</span>)}
          </div>
        </div>
      )}

      {context && context.neighbors.length > 0 && (
        <div className="result-section">
          <h4>Direct Connections</h4>
          <div className="list-tags">
            {context.neighbors.map((n, i) => (
              <span key={`${n.id}-${i}`} className={`tag ${TAG_CLASS[n.type]}`}>
                {n.name} ({n.relType})
              </span>
            ))}
          </div>
        </div>
      )}

      {hasTests && (
        <div className="result-section">
          <h4>Recommended Tests</h4>
          <ul className="bullet-list">
            {recommendedTests!.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      {context && context.paths.length > 0 && (
        <div className="result-section paths-section">
          <h4>Factual Traversal Paths</h4>
          <div className="paths-container">
            {context.paths.map((path, pIdx) => (
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

      {hasExplanations && (
        <div className="result-section">
          <h4>Explanations</h4>
          <ul className="bullet-list">
            {explanations!.map((exp, i) => <li key={i}>{exp}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
