// ---------------------------------------------------------------------------
// EmptyState.jsx — shown when a list has nothing in it. A blank screen looks
// broken; an empty state explains what to do next.
// ---------------------------------------------------------------------------
import React from 'react';
import Icon from './Icon.jsx';
import Button from './Button.jsx';

export default function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} size={26} /></div>
      <h3 className="empty-title">{title}</h3>
      {message && <p className="empty-message">{message}</p>}
      {actionLabel && <Button variant="primary" icon="plus" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
