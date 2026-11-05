// ---------------------------------------------------------------------------
// taskUtils.js
// PURE functions only: give them input, they return output, they never touch
// React state or the DOM. That makes them predictable and easy to test.
// ---------------------------------------------------------------------------
import { PRIORITIES, findById } from './constants.js';

// Generate a unique id for a new task.
export function createId() {
  return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// --- date helpers ----------------------------------------------------------

// Today at 00:00 local time. Used so "overdue" ignores the clock time.
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Turn "2026-11-05" into a local Date at midnight.
// NOTE: new Date("2026-11-05") parses as UTC and can shift a day in some
// timezones, so we split the string ourselves.
export function parseDateInput(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Turn a Date back into the "YYYY-MM-DD" format an <input type="date"> wants.
export function toDateInput(date) {
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Friendly label: "Today", "Tomorrow", "Overdue by 3 days", or "12 Nov 2026".
export function formatDueDate(value) {
  const date = parseDateInput(value);
  if (!date) return 'No due date';
  const today = startOfToday();
  const diffDays = Math.round((date - today) / 86400000);
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays === -1) return 'Due yesterday';
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// A task is overdue when it has a past due date AND is not completed.
export function isOverdue(task) {
  if (!task.dueDate || task.status === 'done') return false;
  const date = parseDateInput(task.dueDate);
  return date !== null && date < startOfToday();
}

// --- searching, filtering, sorting -----------------------------------------

// `filters` looks like: { search, status, priority, category }
// A value of 'all' (or an empty search) means "do not filter on this".
export function filterTasks(tasks, filters) {
  const query = (filters.search || '').trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.status   && filters.status   !== 'all' && task.status   !== filters.status)   return false;
    if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.category && filters.category !== 'all' && task.category !== filters.category) return false;

    if (query) {
      const haystack = `${task.title} ${task.description || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortTasks(tasks, sortBy) {
  // Copy first — .sort() mutates, and mutating React state is a bug.
  const copy = [...tasks];

  const priorityRank = (t) => (findById(PRIORITIES, t.priority)?.rank ?? 0);
  // Tasks with no due date sort last.
  const dueValue = (t) => (t.dueDate ? parseDateInput(t.dueDate).getTime() : Infinity);

  switch (sortBy) {
    case 'priority': return copy.sort((a, b) => priorityRank(b) - priorityRank(a));
    case 'dueDate':  return copy.sort((a, b) => dueValue(a) - dueValue(b));
    case 'title':    return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'oldest':   return copy.sort((a, b) => a.createdAt - b.createdAt);
    case 'newest':
    default:         return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

// --- statistics for the dashboard ------------------------------------------

export function getStats(tasks) {
  const total     = tasks.length;
  const done      = tasks.filter((t) => t.status === 'done').length;
  const progress  = tasks.filter((t) => t.status === 'in-progress').length;
  const todo      = tasks.filter((t) => t.status === 'todo').length;
  const overdue   = tasks.filter(isOverdue).length;
  const highPrio  = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length;
  const dueToday  = tasks.filter(
    (t) => t.status !== 'done' && t.dueDate === toDateInput(startOfToday())
  ).length;

  return {
    total, done, progress, todo, overdue, highPrio, dueToday,
    // Guard against dividing by zero when there are no tasks at all.
    completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

// --- calendar helpers ------------------------------------------------------

// Build the 6x7 grid a month view needs, including the greyed-out days that
// spill in from the previous and next month.
export function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  // getDay(): 0 = Sunday. We want weeks to start on Monday, so shift it.
  const leading = (firstOfMonth.getDay() + 6) % 7;

  const cells = [];
  const cursor = new Date(year, month, 1 - leading);
  for (let i = 0; i < 42; i++) {
    cells.push({
      date: new Date(cursor),
      inMonth: cursor.getMonth() === month,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}
