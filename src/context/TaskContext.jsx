// ---------------------------------------------------------------------------
// TaskContext.jsx
//
// React Context = a way to share data with every component in the tree
// without "prop drilling" (passing props down through components that don't
// care about them).
//
// Anything a component needs — the task list, addTask, deleteTask… — lives
// here. A component gets it with:   const { tasks, addTask } = useTasks();
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from '../lib/constants.js';
import { createId, toDateInput, startOfToday } from '../lib/taskUtils.js';

const TaskContext = createContext(null);

// A few tasks so a brand-new user does not stare at an empty screen.
function seedTasks() {
  const today = startOfToday();
  const dayOffset = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return toDateInput(d);
  };
  const base = Date.now();
  return [
    { id: createId(), title: 'Design the new onboarding flow', description: 'Wireframes for the 3-step signup.', status: 'in-progress', priority: 'high',   category: 'design',   dueDate: dayOffset(1),  createdAt: base - 5000, updatedAt: base - 5000 },
    { id: createId(), title: 'Review Q4 analytics report',     description: 'Check retention and churn numbers.', status: 'todo',        priority: 'medium', category: 'work',     dueDate: dayOffset(4),  createdAt: base - 4000, updatedAt: base - 4000 },
    { id: createId(), title: 'Fix login validation bug',       description: 'Email field accepts invalid formats.', status: 'todo',      priority: 'high',   category: 'urgent',   dueDate: dayOffset(-2), createdAt: base - 3000, updatedAt: base - 3000 },
    { id: createId(), title: 'Read React performance guide',   description: 'Focus on memo and useCallback.',     status: 'todo',        priority: 'low',    category: 'learning', dueDate: dayOffset(9),  createdAt: base - 2000, updatedAt: base - 2000 },
    { id: createId(), title: 'Book dentist appointment',       description: '',                                   status: 'done',        priority: 'low',    category: 'personal', dueDate: dayOffset(-5), createdAt: base - 1000, updatedAt: base - 1000 },
    { id: createId(), title: 'Prepare sprint demo',            description: 'Slides + live walkthrough.',         status: 'in-progress', priority: 'medium', category: 'work',     dueDate: dayOffset(0),  createdAt: base - 500,  updatedAt: base - 500  },
  ];
}

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useLocalStorage(STORAGE_KEYS.tasks, seedTasks);
  const [categories, setCategories] = useLocalStorage(STORAGE_KEYS.categories, DEFAULT_CATEGORIES);

  // useCallback keeps the same function identity between renders, which stops
  // child components from re-rendering for no reason.
  const addTask = useCallback((draft) => {
    const now = Date.now();
    const task = {
      id: createId(),
      title: draft.title.trim(),
      description: (draft.description || '').trim(),
      status: draft.status || 'todo',
      priority: draft.priority || 'medium',
      category: draft.category || 'work',
      dueDate: draft.dueDate || '',
      createdAt: now,
      updatedAt: now,
    };
    // Always build a NEW array — React compares by reference to decide
    // whether to re-render. Mutating the old array would change nothing.
    setTasks((prev) => [task, ...prev]);
    return task;
  }, [setTasks]);

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t))
    );
  }, [setTasks]);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, [setTasks]);

  // Used by the Kanban board when a card is dropped in another column.
  const moveTask = useCallback((id, status) => {
    updateTask(id, { status });
  }, [updateTask]);

  // Clicking the circle on a task card toggles done / not done.
  const toggleComplete = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'done' ? 'todo' : 'done', updatedAt: Date.now() }
          : t
      )
    );
  }, [setTasks]);

  const addCategory = useCallback((label, color) => {
    const id = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!id) return null;
    let created = null;
    setCategories((prev) => {
      if (prev.some((c) => c.id === id)) return prev;   // no duplicates
      created = { id, label: label.trim(), color };
      return [...prev, created];
    });
    return created;
  }, [setCategories]);

  const deleteCategory = useCallback((id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    // Tasks keep working: any task in the removed category falls back to 'work'.
    setTasks((prev) => prev.map((t) => (t.category === id ? { ...t, category: 'work' } : t)));
  }, [setCategories, setTasks]);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== 'done'));
  }, [setTasks]);

  // useMemo stops us from handing a brand-new object to every consumer on
  // every render (which would re-render the entire app each time).
  const value = useMemo(
    () => ({ tasks, categories, addTask, updateTask, deleteTask, moveTask,
             toggleComplete, addCategory, deleteCategory, clearCompleted }),
    [tasks, categories, addTask, updateTask, deleteTask, moveTask,
     toggleComplete, addCategory, deleteCategory, clearCompleted]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

// The hook every component uses to read the shared data.
export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks() must be used inside <TaskProvider>');
  return ctx;
}
