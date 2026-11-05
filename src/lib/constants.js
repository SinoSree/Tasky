// ---------------------------------------------------------------------------
// constants.js
// A single place for every "fixed" value the app uses.
// Keeping these here means a label or colour is changed in ONE place only.
// ---------------------------------------------------------------------------

// The three columns of the Kanban board / the three task states.
export const STATUSES = [
  { id: 'todo',        label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done',        label: 'Completed' },
];

// Priority levels, lowest first. `rank` is used for sorting.
export const PRIORITIES = [
  { id: 'low',    label: 'Low',    rank: 1 },
  { id: 'medium', label: 'Medium', rank: 2 },
  { id: 'high',   label: 'High',   rank: 3 },
];

// Categories the user can tag a task with.
export const DEFAULT_CATEGORIES = [
  { id: 'work',     label: 'Work',     color: '#2563eb' },
  { id: 'personal', label: 'Personal', color: '#7c3aed' },
  { id: 'design',   label: 'Design',   color: '#db2777' },
  { id: 'urgent',   label: 'Urgent',   color: '#dc2626' },
  { id: 'learning', label: 'Learning', color: '#059669' },
];

// The keys used inside the browser's localStorage.
export const STORAGE_KEYS = {
  tasks: 'tm.tasks.v1',
  categories: 'tm.categories.v1',
};

// Small helper: look up a status/priority/category object by its id.
export const findById = (list, id) => list.find((item) => item.id === id);
