// ---------------------------------------------------------------------------
// TaskContext.jsx
//
// The single source of truth for tasks, team members and categories.
//
// It no longer talks to localStorage directly. It asks `repo` (see lib/repo.js)
// which is either the local store or Supabase depending on how you signed in.
// Because every repo method is async, the loading/saving code looks the same
// in both modes.
//
// Pattern used for every change: update React state immediately so the UI
// feels instant, then send the change to the store. If the store rejects it,
// reload from the store so the screen never lies about what was saved.
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { getRepo } from '../lib/repo.js';
import { useAuth } from './AuthContext.jsx';
import { DEFAULT_CATEGORIES, DEFAULT_MEMBERS } from '../lib/constants.js';
import { createId, toDateInput, startOfToday } from '../lib/taskUtils.js';

const TaskContext = createContext(null);

// Sample tasks so a new account is not an empty void.
function seedTasks() {
  const today = startOfToday();
  const offset = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return toDateInput(d); };
  const base = Date.now();
  return [
    { title: 'Design the new onboarding flow', description: 'Wireframes for the 3-step signup.',  status: 'in-progress', priority: 'high',   category: 'design',   dueDate: offset(1),  assigneeId: 'm_anita' },
    { title: 'Review Q4 analytics report',     description: 'Check retention and churn numbers.', status: 'todo',        priority: 'medium', category: 'work',     dueDate: offset(4),  assigneeId: 'm_you'   },
    { title: 'Fix login validation bug',       description: 'Email field accepts invalid formats.', status: 'todo',      priority: 'high',   category: 'urgent',   dueDate: offset(-2), assigneeId: 'm_ravi'  },
    { title: 'Read React performance guide',   description: 'Focus on memo and useCallback.',     status: 'todo',        priority: 'low',    category: 'learning', dueDate: offset(9),  assigneeId: ''        },
    { title: 'Book dentist appointment',       description: '',                                   status: 'done',        priority: 'low',    category: 'personal', dueDate: offset(-5), assigneeId: 'm_you'   },
    { title: 'Prepare sprint demo',            description: 'Slides + live walkthrough.',         status: 'in-progress', priority: 'medium', category: 'work',     dueDate: offset(0),  assigneeId: 'm_anita' },
  ].map((t, i) => ({ ...t, id: createId(), createdAt: base - (6 - i) * 1000, updatedAt: base - (6 - i) * 1000 }));
}

export function TaskProvider({ children }) {
  const { user, isSignedIn } = useAuth();

  const [tasks, setTasks]           = useState([]);
  const [members, setMembers]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [syncError, setSyncError]   = useState('');

  // Rebuilt whenever the signed-in user changes, so signing out of a cloud
  // account cannot leave you looking at that account's data.
  const repo = useMemo(() => getRepo(user), [user]);
  const repoRef = useRef(repo);
  repoRef.current = repo;

  // --- initial load -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSignedIn) {            // signed out: show nothing
        setTasks([]); setMembers([]); setCategories([]); setLoading(false);
        return;
      }
      setLoading(true); setSyncError('');
      try {
        const [t, m, c] = await Promise.all([
          repo.tasks.list(), repo.members.list(), repo.categories.list(),
        ]);
        if (cancelled) return;

        // First run on this account: plant the starting data.
        const seeded = c.length === 0 || m.length === 0 || t.length === 0;
        if (c.length === 0) {
          for (const cat of DEFAULT_CATEGORIES) await repo.categories.create(cat);
        }
        let memberList = m;
        if (m.length === 0) {
          memberList = [];
          for (const mem of DEFAULT_MEMBERS) memberList.push(await repo.members.create(mem));
        }
        if (t.length === 0) {
          // The seed references members by their DEFAULT_MEMBERS id, but the
          // store assigns real ids (a uuid in the cloud). Map one to the other.
          const idFor = (seedId) => {
            const i = DEFAULT_MEMBERS.findIndex((d) => d.id === seedId);
            return i >= 0 && memberList[i] ? memberList[i].id : null;
          };
          for (const task of seedTasks()) {
            await repo.tasks.create({ ...task, assigneeId: idFor(task.assigneeId) || "" });
          }
        }
        if (cancelled) return;

        // Re-read after seeding so the order and ids come from the store
        // itself, identically in both local and cloud mode.
        const [t2, m2, c2] = seeded
          ? await Promise.all([repo.tasks.list(), repo.members.list(), repo.categories.list()])
          : [t, m, c];
        if (cancelled) return;
        setTasks(t2); setMembers(m2); setCategories(c2);
      } catch (err) {
        if (!cancelled) setSyncError(err.message || 'Could not load your data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [repo, isSignedIn]);

  // Reload everything from the store — used to recover after a failed write.
  const refresh = useCallback(async () => {
    try {
      const [t, m, c] = await Promise.all([
        repoRef.current.tasks.list(), repoRef.current.members.list(), repoRef.current.categories.list(),
      ]);
      setTasks(t); setMembers(m); setCategories(c); setSyncError('');
    } catch (err) {
      setSyncError(err.message || 'Could not refresh your data.');
    }
  }, []);

  // --- task actions -------------------------------------------------------

  const addTask = useCallback(async (draft) => {
    const clean = {
      title: draft.title.trim(),
      description: (draft.description || '').trim(),
      status: draft.status || 'todo',
      priority: draft.priority || 'medium',
      category: draft.category || 'work',
      dueDate: draft.dueDate || '',
      assigneeId: draft.assigneeId || '',
    };
    try {
      const created = await repoRef.current.tasks.create(clean);
      setTasks((prev) => [created, ...prev]);
      return created;
    } catch (err) { setSyncError(err.message); await refresh(); return null; }
  }, [refresh]);

  const updateTask = useCallback(async (id, patch) => {
    const previous = tasks;
    // Optimistic: show the change at once.
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)));
    try {
      await repoRef.current.tasks.update(id, patch);
    } catch (err) {
      setSyncError(err.message);
      setTasks(previous);            // put it back the way it was
    }
  }, [tasks]);

  const deleteTask = useCallback(async (id) => {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await repoRef.current.tasks.remove(id);
    } catch (err) { setSyncError(err.message); setTasks(previous); }
  }, [tasks]);

  const moveTask = useCallback((id, status) => updateTask(id, { status }), [updateTask]);

  const assignTask = useCallback((id, assigneeId) => updateTask(id, { assigneeId }), [updateTask]);

  const toggleComplete = useCallback((id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    return updateTask(id, { status: task.status === 'done' ? 'todo' : 'done' });
  }, [tasks, updateTask]);

  const clearCompleted = useCallback(async () => {
    const done = tasks.filter((t) => t.status === 'done');
    setTasks((prev) => prev.filter((t) => t.status !== 'done'));
    try {
      for (const t of done) await repoRef.current.tasks.remove(t.id);
    } catch (err) { setSyncError(err.message); await refresh(); }
  }, [tasks, refresh]);

  // --- member actions -----------------------------------------------------

  const addMember = useCallback(async (name, color) => {
    const clean = name.trim();
    if (!clean) return null;
    try {
      const created = await repoRef.current.members.create({ name: clean, color });
      setMembers((prev) => [...prev, created]);
      return created;
    } catch (err) { setSyncError(err.message); return null; }
  }, []);

  const updateMember = useCallback(async (id, patch) => {
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    try { await repoRef.current.members.update(id, patch); }
    catch (err) { setSyncError(err.message); setMembers(previous); }
  }, [members]);

  const deleteMember = useCallback(async (id) => {
    const prevMembers = members;
    const affected = tasks.filter((t) => t.assigneeId === id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    // Their tasks are not deleted — they simply become unassigned.
    setTasks((prev) => prev.map((t) => (t.assigneeId === id ? { ...t, assigneeId: '' } : t)));
    try {
      for (const t of affected) await repoRef.current.tasks.update(t.id, { assigneeId: '' });
      await repoRef.current.members.remove(id);
    } catch (err) { setSyncError(err.message); setMembers(prevMembers); await refresh(); }
  }, [members, tasks, refresh]);

  // --- category actions ---------------------------------------------------

  const addCategory = useCallback(async (label, color) => {
    const clean = label.trim();
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!id || categories.some((c) => c.id === id)) return null;
    try {
      const created = await repoRef.current.categories.create({ id, label: clean, color });
      setCategories((prev) => [...prev, created]);
      return created;
    } catch (err) { setSyncError(err.message); return null; }
  }, [categories]);

  const deleteCategory = useCallback(async (id) => {
    const prevCats = categories;
    const affected = tasks.filter((t) => t.category === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.map((t) => (t.category === id ? { ...t, category: 'work' } : t)));
    try {
      for (const t of affected) await repoRef.current.tasks.update(t.id, { category: 'work' });
      await repoRef.current.categories.remove(id);
    } catch (err) { setSyncError(err.message); setCategories(prevCats); await refresh(); }
  }, [categories, tasks, refresh]);

  const value = useMemo(() => ({
    tasks, members, categories, loading, syncError, mode: repo.mode,
    addTask, updateTask, deleteTask, moveTask, assignTask, toggleComplete, clearCompleted,
    addMember, updateMember, deleteMember,
    addCategory, deleteCategory,
    refresh, dismissSyncError: () => setSyncError(''),
  }), [tasks, members, categories, loading, syncError, repo.mode,
       addTask, updateTask, deleteTask, moveTask, assignTask, toggleComplete, clearCompleted,
       addMember, updateMember, deleteMember, addCategory, deleteCategory, refresh]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks() must be used inside <TaskProvider>');
  return ctx;
}
