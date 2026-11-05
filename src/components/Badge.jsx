// ---------------------------------------------------------------------------
// Badge.jsx — the small coloured pills for priority, status and category.
// ---------------------------------------------------------------------------
import React from 'react';
import { PRIORITIES, STATUSES, findById } from '../lib/constants.js';

export function PriorityBadge({ priority }) {
  const item = findById(PRIORITIES, priority);
  if (!item) return null;
  return <span className={`badge badge-priority badge-${priority}`}>{item.label}</span>;
}

export function StatusBadge({ status }) {
  const item = findById(STATUSES, status);
  if (!item) return null;
  return <span className={`badge badge-status badge-${status}`}>{item.label}</span>;
}

export function CategoryBadge({ category, categories }) {
  const item = findById(categories, category);
  if (!item) return null;
  // The colour comes from data, so it has to be an inline style.
  return (
    <span className="badge badge-category" style={{ color: item.color, backgroundColor: item.color + '14' }}>
      <span className="badge-dot" style={{ backgroundColor: item.color }} />
      {item.label}
    </span>
  );
}
