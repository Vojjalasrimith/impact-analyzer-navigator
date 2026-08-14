import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { sendChatMessage } from '../services/api.js';
import type { ChatTurn, ChatAnalysis, GraphFactsResult } from '../types/index.js';

interface ChatMessage extends ChatTurn {
  analysis?: ChatAnalysis;
  graphFacts?: GraphFactsResult;
}

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
        analysis: response.analysis,
        graphFacts: response.graphFacts
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
          <h2>💬 Impact Analysis Chat</h2>
          <button className="btn-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-inspector-state">
              <span className="empty-icon">🤖</span>
              <h3>Ask about impact</h3>
              <p>e.g. "What's the impact of migrating the notification service to a new provider?"</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-message chat-message-${msg.role}`}>
              <div className="chat-bubble">{msg.content}</div>
              {msg.analysis && <AnalysisCard analysis={msg.analysis} />}
              {msg.graphFacts && <GraphFactsCard facts={msg.graphFacts} />}
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
            placeholder="Ask about the impact of a change..."
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

function AnalysisCard({ analysis }: { analysis: ChatAnalysis }) {
  return (
    <div className="analysis-results-inline card">
      <div className="risk-container">
        <span className="risk-label">Risk Level:</span>
        <span className={`risk-badge risk-${analysis.risk.toLowerCase()}`}>{analysis.risk}</span>
      </div>

      {analysis.affectedServices.length > 0 && (
        <div className="result-section">
          <h4>Downstream — Affected Services</h4>
          <div className="list-tags">
            {analysis.affectedServices.map(s => <span key={s} className="tag tag-service">{s}</span>)}
          </div>
        </div>
      )}

      {analysis.dependsOnServices.length > 0 && (
        <div className="result-section">
          <h4>Upstream — Depends On</h4>
          <div className="list-tags">
            {analysis.dependsOnServices.map(s => <span key={s} className="tag tag-service">{s}</span>)}
          </div>
        </div>
      )}

      {analysis.affectedFeatures.length > 0 && (
        <div className="result-section">
          <h4>Affected Features</h4>
          <div className="list-tags">
            {analysis.affectedFeatures.map(f => <span key={f} className="tag tag-feature">{f}</span>)}
          </div>
        </div>
      )}

      {analysis.developers.length > 0 && (
        <div className="result-section">
          <h4>Impacted Teams / Owners</h4>
          <div className="list-tags">
            {analysis.developers.map(d => <span key={d} className="tag tag-dev">{d}</span>)}
          </div>
        </div>
      )}

      {analysis.recommendedTests.length > 0 && (
        <div className="result-section">
          <h4>Recommended Tests</h4>
          <ul className="bullet-list">
            {analysis.recommendedTests.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      {analysis.paths.length > 0 && (
        <div className="result-section paths-section">
          <h4>Factual Traversal Paths</h4>
          <div className="paths-container">
            {analysis.paths.map((path, pIdx) => (
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

      {analysis.explanations.length > 0 && (
        <div className="result-section">
          <h4>Explanations</h4>
          <ul className="bullet-list">
            {analysis.explanations.map((exp, i) => <li key={i}>{exp}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function GraphFactsCard({ facts }: { facts: GraphFactsResult }) {
  const tagClass = facts.intent === 'OWNERSHIP' ? 'tag-dev' : 'tag-service';

  return (
    <div className="analysis-results-inline card">
      {facts.path && facts.path.length > 0 && (
        <div className="result-section paths-section">
          <h4>Path</h4>
          <div className="paths-container">
            <div className="path-display">
              {facts.path.map((step, sIdx) => (
                <span key={sIdx} className="path-step">
                  {step}
                  {sIdx < facts.path!.length - 1 && <span className="path-arrow"> → </span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {facts.items.length > 0 && (
        <div className="result-section">
          <h4>{facts.intent === 'OWNERSHIP' ? 'Owners' : facts.intent === 'NEIGHBORHOOD' ? 'Direct Connections' : 'Entities'}</h4>
          <div className="list-tags">
            {facts.items.map(item => (
              <span key={item.id} className={`tag ${tagClass}`}>
                {item.name}{item.relation ? ` (${item.relation})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
