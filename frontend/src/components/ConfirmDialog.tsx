interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  isConfirming = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-close" onClick={onCancel} disabled={isConfirming}>✕</button>
        </div>

        <p className="inspector-desc">{message}</p>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? (
              <>
                <span className="spinner spinner-sm"></span>
                Deleting...
              </>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
