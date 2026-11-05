// ---------------------------------------------------------------------------
// Modal.jsx — the dark overlay + white panel used for the task form and the
// delete confirmation.
// ---------------------------------------------------------------------------
import React, { useEffect } from 'react';
import Icon from './Icon.jsx';

export default function Modal({ open, title, onClose, children, width = 520 }) {
  // Close on the Escape key, and stop the page behind from scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // The cleanup function runs when the modal closes or unmounts.
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;   // render nothing when closed

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      {/* stopPropagation: a click inside the panel must not reach the
          overlay's onClick, otherwise the modal would close instantly. */}
      <div
        className="modal-panel"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}
      >
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
