// ---------------------------------------------------------------------------
// repo.js  — the data layer.
//
// Two implementations of the SAME interface:
//
//   localRepo  → reads/writes browser localStorage   (demo mode)
//   cloudRepo  → reads/writes Supabase tables        (signed in for real)
//
// Every method is async, even the local one, so the rest of the app can
// `await` without caring which is in use. This is the whole reason swapping
// in a backend did not mean rewriting the components.
//
// Database columns are snake_case (SQL convention); our JavaScript objects
// are camelCase (JS convention). The two `map` helpers translate between them.
// ---------------------------------------------------------------------------
import { getSupabase } from './supabaseClient.js';
import { loadJSON, saveJSON } from './storage.js';
import { STORAGE_KEYS } from './constants.js';
import { createId } from './taskUtils.js';

// --- translation between database rows and app objects ---------------------

const rowToTask = (r) => ({
  id: r.id,
  title: r.title,
  description: r.description || '',
  status: r.status,
  priority: r.priority,
  category: r.category,
  dueDate: r.due_date || '',
  assigneeId: r.assignee_id || '',
  createdAt: new Date(r.created_at).getTime(),
  updatedAt: new Date(r.updated_at).getTime(),
});

const taskToRow = (t) => ({
  title: t.title,
  description: t.description || '',
  status: t.status,
  priority: t.priority,
  category: t.category,
  // Empty string is not a valid DATE in SQL — it has to be null.
  due_date: t.dueDate || null,
  assignee_id: t.assigneeId || null,
});

const rowToMember = (r) => ({ id: r.id, name: r.name, color: r.color });
const rowToCategory = (r) => ({ id: r.id, label: r.label, color: r.color });

// ===========================================================================
// LOCAL (demo mode)
// ===========================================================================
function makeLocalRepo() {
  const read  = (key, fallback) => loadJSON(key, fallback);
  const write = (key, value) => { saveJSON(key, value); return value; };

  // `newestFirst` makes the local store return tasks in the same order the
  // cloud store does (created_at descending), so the two modes look identical.
  const collection = (key, newestFirst = false) => ({
    async list() {
      const rows = read(key, []);
      return newestFirst
        ? [...rows].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        : rows;
    },
    async create(item) {
      const now = Date.now();
      // Keep an id the caller supplied. Categories use a slug id ("work")
      // that tasks refer to by name, so overwriting it would orphan them.
      const record = { ...item, id: item.id || createId(), createdAt: now, updatedAt: now };
      // Append, so members and categories keep the order they were added in.
      write(key, [...read(key, []), record]);
      return record;
    },
    async update(id, patch) {
      const next = read(key, []).map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r
      );
      write(key, next);
      return next.find((r) => r.id === id) || null;
    },
    async remove(id) {
      write(key, read(key, []).filter((r) => r.id !== id));
      return true;
    },
    async replaceAll(items) {
      return write(key, items);
    },
  });

  return {
    mode: 'local',
    tasks: collection(STORAGE_KEYS.tasks, true),
    members: collection(STORAGE_KEYS.members),
    categories: collection(STORAGE_KEYS.categories),
  };
}

// ===========================================================================
// CLOUD (Supabase)
// ===========================================================================
//
// Note on security: none of these queries filter by user_id. They do not need
// to — the Row Level Security policies in supabase/schema.sql make the
// database itself return only the signed-in user's rows. Enforcing it in the
// database rather than the client is what makes it actually safe.
//
function makeCloudRepo(userId) {
  const db = getSupabase();

  // Wraps a Supabase call so a failure throws a readable Error.
  const run = async (promise, what) => {
    const { data, error } = await promise;
    if (error) {
      console.error(`[repo] ${what} failed:`, error);
      throw new Error(`${what} failed: ${error.message}`);
    }
    return data;
  };

  return {
    mode: 'cloud',

    tasks: {
      async list() {
        const rows = await run(
          db.from('tasks').select('*').order('created_at', { ascending: false }),
          'Loading tasks'
        );
        return rows.map(rowToTask);
      },
      async create(task) {
        const rows = await run(
          db.from('tasks').insert({ ...taskToRow(task), user_id: userId }).select(),
          'Creating the task'
        );
        return rowToTask(rows[0]);
      },
      async update(id, patch) {
        const rows = await run(
          db.from('tasks')
            .update({ ...taskToRow(patch), updated_at: new Date().toISOString() })
            .eq('id', id).select(),
          'Saving the task'
        );
        return rows[0] ? rowToTask(rows[0]) : null;
      },
      async remove(id) {
        await run(db.from('tasks').delete().eq('id', id), 'Deleting the task');
        return true;
      },
    },

    members: {
      async list() {
        const rows = await run(
          db.from('members').select('*').order('name'),
          'Loading team members'
        );
        return rows.map(rowToMember);
      },
      async create(member) {
        const rows = await run(
          db.from('members').insert({ name: member.name, color: member.color, user_id: userId }).select(),
          'Adding the team member'
        );
        return rowToMember(rows[0]);
      },
      async update(id, patch) {
        const rows = await run(
          db.from('members').update({ name: patch.name, color: patch.color }).eq('id', id).select(),
          'Saving the team member'
        );
        return rows[0] ? rowToMember(rows[0]) : null;
      },
      async remove(id) {
        await run(db.from('members').delete().eq('id', id), 'Removing the team member');
        return true;
      },
    },

    categories: {
      async list() {
        const rows = await run(
          db.from('categories').select('*').order('label'),
          'Loading categories'
        );
        return rows.map(rowToCategory);
      },
      async create(cat) {
        const rows = await run(
          db.from('categories').insert({ id: cat.id, label: cat.label, color: cat.color, user_id: userId }).select(),
          'Adding the category'
        );
        return rowToCategory(rows[0]);
      },
      async update(id, patch) {
        const rows = await run(
          db.from('categories').update({ label: patch.label, color: patch.color }).eq('id', id).select(),
          'Saving the category'
        );
        return rows[0] ? rowToCategory(rows[0]) : null;
      },
      async remove(id) {
        await run(db.from('categories').delete().eq('id', id), 'Removing the category');
        return true;
      },
    },
  };
}

// The only function the rest of the app calls.
export function getRepo(user) {
  if (user && !user.isDemo && getSupabase()) return makeCloudRepo(user.id);
  return makeLocalRepo();
}
