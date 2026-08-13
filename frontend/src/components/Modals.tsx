import React, { useState, useEffect } from 'react';
import type { Entity, EntityType, RelationshipType } from '../types/index.js';

interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entityData: { type: EntityType; name: string; description: string }) => void;
  initialData?: { id: string; name: string; type: string; description: string } | null;
}

export function EntityModal({ isOpen, onClose, onSubmit, initialData }: EntityModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<EntityType>('PROJECT');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type as EntityType);
      setDescription(initialData.description);
    } else {
      setName('');
      setType('PROJECT');
      setDescription('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ type, name, description });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <div className="modal-header">
          <h2>{initialData ? '✏️ Edit Entity' : '➕ Add New Entity'}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Entity Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EntityType)}
              disabled={!!initialData} // Disallow changing type once created
              className="form-input"
            >
              <option value="PROJECT">PROJECT</option>
              <option value="FEATURE">FEATURE</option>
              <option value="SERVICE">SERVICE</option>
              <option value="DEVELOPER">DEVELOPER</option>
            </select>
          </div>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stripe Gateway Service"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context about this entity..."
              rows={3}
              className="form-input"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initialData ? 'Save Changes' : 'Create Entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (relData: { from: string; to: string; type: RelationshipType }) => void;
  entities: Entity[];
}

export function RelationshipModal({ isOpen, onClose, onSubmit, entities }: RelationshipModalProps) {
  const [fromId, setFromId] = useState('');
  const [relType, setRelType] = useState<RelationshipType>('HAS_FEATURE');
  const [toId, setToId] = useState('');

  // Reset fields on open
  useEffect(() => {
    if (isOpen) {
      setFromId('');
      setRelType('HAS_FEATURE');
      setToId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Get Selected From Entity
  const selectedFromEntity = entities.find(e => e.id === fromId);

  // 2. Filter Valid To Entities based on Relationship rules
  // PROJECT -> HAS_FEATURE -> FEATURE
  // FEATURE -> IMPLEMENTED_BY -> SERVICE
  // SERVICE -> DEPENDS_ON -> SERVICE
  // SERVICE -> OWNED_BY -> DEVELOPER
  const filteredToEntities = entities.filter(e => {
    if (!selectedFromEntity) return false;
    if (e.id === fromId) return false; // Can't connect to itself

    const fromType = selectedFromEntity.type;
    const targetType = e.type;

    if (fromType === 'PROJECT' && relType === 'HAS_FEATURE' && targetType === 'FEATURE') return true;
    if (fromType === 'FEATURE' && relType === 'IMPLEMENTED_BY' && targetType === 'SERVICE') return true;
    if (fromType === 'SERVICE' && relType === 'DEPENDS_ON' && targetType === 'SERVICE') return true;
    if (fromType === 'SERVICE' && relType === 'OWNED_BY' && targetType === 'DEVELOPER') return true;

    return false;
  });

  // Automatically adjust relation type based on selected source node to ensure validity
  const handleFromChange = (newFromId: string) => {
    setFromId(newFromId);
    setToId(''); // Reset target
    const entity = entities.find(e => e.id === newFromId);
    if (entity) {
      if (entity.type === 'PROJECT') setRelType('HAS_FEATURE');
      else if (entity.type === 'FEATURE') setRelType('IMPLEMENTED_BY');
      else if (entity.type === 'SERVICE') setRelType('DEPENDS_ON');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || !relType) return;
    onSubmit({ from: fromId, to: toId, type: relType });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <div className="modal-header">
          <h2>🔗 Add Relationship Link</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Source node select */}
          <div className="form-group">
            <label>Source Entity (From)</label>
            <select
              value={fromId}
              onChange={(e) => handleFromChange(e.target.value)}
              required
              className="form-input"
            >
              <option value="">-- Select Source Node --</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>
                  [{e.type}] {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Relation select (Filtered based on Source node type) */}
          <div className="form-group">
            <label>Relationship Link Type</label>
            <select
              value={relType}
              onChange={(e) => {
                setRelType(e.target.value as RelationshipType);
                setToId(''); // Reset target when relation changes
              }}
              required
              disabled={!fromId}
              className="form-input"
            >
              {selectedFromEntity?.type === 'PROJECT' && (
                <option value="HAS_FEATURE">HAS_FEATURE (to Feature)</option>
              )}
              {selectedFromEntity?.type === 'FEATURE' && (
                <option value="IMPLEMENTED_BY">IMPLEMENTED_BY (to Service)</option>
              )}
              {selectedFromEntity?.type === 'SERVICE' && (
                <>
                  <option value="DEPENDS_ON">DEPENDS_ON (to Service)</option>
                  <option value="OWNED_BY">OWNED_BY (to Developer)</option>
                </>
              )}
              {!fromId && <option value="">-- Choose source node first --</option>}
            </select>
          </div>

          {/* Target node select (Filtered strictly by valid pairing logic) */}
          <div className="form-group">
            <label>Target Entity (To)</label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              required
              disabled={!fromId || filteredToEntities.length === 0}
              className="form-input"
            >
              <option value="">
                {fromId
                  ? filteredToEntities.length === 0
                    ? '-- No compatible target nodes found --'
                    : '-- Select Target Node --'
                  : '-- Select Source First --'}
              </option>
              {filteredToEntities.map(e => (
                <option key={e.id} value={e.id}>
                  [{e.type}] {e.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!fromId || !toId || filteredToEntities.length === 0}
            >
              Create Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
