// ---------------------------------------------------------------------------
// Avatar.jsx — a coloured circle with a person's initials.
// Used on task cards, task rows, the team page and the user menu.
// ---------------------------------------------------------------------------
import React from 'react';
import { initialsOf } from '../lib/constants.js';

export default function Avatar({ name, color = '#6b7280', size = 24, title }) {
  return (
    <span
      className="avatar"
      style={{
        width: size, height: size,
        backgroundColor: color,
        fontSize: Math.max(9, Math.round(size * 0.4)),
      }}
      title={title || name}
      aria-label={name}
    >
      {initialsOf(name)}
    </span>
  );
}

// Shown where a task has no assignee.
export function UnassignedAvatar({ size = 24 }) {
  return (
    <span className="avatar avatar-empty" style={{ width: size, height: size }}
          title="Unassigned" aria-label="Unassigned">?</span>
  );
}
