// ---------------------------------------------------------------------------
// Icon.jsx — one small inline-SVG icon set.
// Inline SVG means no icon library to install and the icons inherit the text
// colour automatically (stroke="currentColor").
// ---------------------------------------------------------------------------
import React from 'react';

const PATHS = {
  dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
  list:      'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  kanban:    'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z',
  calendar:  'M3 9h18M8 3v4M16 3v4M4 5h16v16H4z',
  tag:       'M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a1.4 1.4 0 0 1 0 2zM7.5 7.5h.01',
  plus:      'M12 5v14M5 12h14',
  search:    'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  edit:      'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash:     'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  close:     'M18 6 6 18M6 6l12 12',
  check:     'M20 6 9 17l-5-5',
  chevronL:  'M15 18l-6-6 6-6',
  chevronR:  'M9 18l6-6-6-6',
  clock:     'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  alert:     'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  trending:  'M23 6l-9.5 9.5-5-5L1 18',
  menu:      'M3 6h18M3 12h18M3 18h18',
  inbox:     'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
  users:     'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
};

export default function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] || ''} />
    </svg>
  );
}
