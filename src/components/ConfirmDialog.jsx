// ---------------------------------------------------------------------------
// ConfirmDialog.jsx — "are you sure?" before a delete.
// ---------------------------------------------------------------------------
import React from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <Modal open={open} title={title} onClose={onCancel} width={420}>
      <p className="confirm-message">{message}</p>
      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
