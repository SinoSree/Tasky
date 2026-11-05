# Taskly — a React Task Manager

A complete, working task manager: dashboard, task CRUD, Kanban board with
drag & drop, calendar view, categories, search/filter/sort, and automatic
saving to your browser.

Built with **React 18**, plain **JavaScript** and plain **CSS**. No UI library,
no CSS framework, no state-management library.

---

## 1. How to run it

Your Mac does not currently have Node.js installed, so there are two routes.

### Route A — run it right now (no install)

Open this file by double-clicking it:

```
/Users/sinojd/Claud/task-manager/index.html
```

That one file contains the entire app. It loads React from a CDN and compiles
the JSX in the browser, so it needs an internet connection the first time but
no tooling at all.

> **One catch:** browsers block `localStorage` on some `file://` pages. If your
> tasks do not survive a refresh, serve the folder instead — macOS ships with
> Ruby, so this works with no install:

```bash
cd /Users/sinojd/Claud/task-manager && ruby -run -e httpd . -p 8077
```

Then open <http://localhost:8077/index.html>.

`index.html` is **generated** — never edit it. Edit the files in `src/` and
rebuild:

```bash
cd /Users/sinojd/Claud/task-manager && sh build-standalone.sh
```

### Route B — the normal React workflow (needs Node.js)

Install Node.js from <https://nodejs.org> (the LTS installer), then:

```bash
cd /Users/sinojd/Claud/task-manager && npm install && npm run dev
```

This gives you Vite's dev server with hot reload — edit a file, the browser
updates instantly. **The exact same `src/` files power both routes.**

---

## 2. How the project is organised

```
task-manager/
├── index.html              # GENERATED single-file app (Route A) — do not edit
├── dev.html                # page shell used by Vite (Route B)
├── build-standalone.sh     # packs src/ into index.html
├── package.json            # dependencies + npm scripts (Route B)
├── vite.config.js          # Vite configuration (Route B)
└── src/
    ├── main.jsx            # entry point: renders <App/> into the page
    ├── App.jsx             # root component: routing, modals, shared filters
    ├── styles.css          # ALL styling, organised in 6 sections
    │
    ├── lib/                # plain JavaScript — no React in here
    │   ├── constants.js    # statuses, priorities, categories, storage keys
    │   ├── storage.js      # safe localStorage read/write
    │   └── taskUtils.js    # dates, filtering, sorting, stats, calendar grid
    │
    ├── hooks/
    │   └── useLocalStorage.js   # useState that also saves to localStorage
    │
    ├── context/
    │   └── TaskContext.jsx # the single source of truth for all tasks
    │
    ├── components/         # small, reusable building blocks
    │   ├── Icon.jsx        Button.jsx     Badge.jsx
    │   ├── Modal.jsx       ConfirmDialog.jsx  EmptyState.jsx
    │   ├── TaskForm.jsx    TaskCard.jsx   TaskRow.jsx
    │   └── StatCard.jsx    FilterBar.jsx  Sidebar.jsx   Topbar.jsx
    │
    └── pages/              # one file per screen
        ├── Dashboard.jsx   TaskList.jsx   KanbanBoard.jsx
        └── CalendarView.jsx  Categories.jsx
```

**The rule of thumb:** anything used on more than one screen lives in
`components/`. Anything that is a whole screen lives in `pages/`. Anything with
no React in it lives in `lib/`.

---

## 3. The concepts, in the order they matter

### Components
A component is a function that returns markup (JSX). `TaskCard` is a component.
Use it five times and you get five cards — written once. That is the whole
point of "reusable components".

### Props
Data passed *into* a component, like attributes on an HTML tag:

```jsx
<TaskCard task={task} onDelete={handleDelete} />
```

Props flow **down** only. A child never reaches up and changes its parent.

### State
Data a component remembers between renders. Change state → React re-renders
that part of the screen. In `TaskForm`:

```jsx
const [form, setForm] = useState({ title: '', priority: 'medium', ... });
```

### Context — why `TaskContext.jsx` exists
The task list is needed by the sidebar, the dashboard, the list, the board and
the calendar. Passing it down through every component in between would be
painful ("prop drilling"). Context publishes it once:

```jsx
const { tasks, addTask, deleteTask } = useTasks();
```

`TaskProvider` wraps the whole app in `App.jsx`, so every component inside can
call `useTasks()`.

### Custom hooks
`useLocalStorage` is just a function that bundles `useState` + a save step, so
it can be reused. Hooks must start with `use`.

### Immutability — the one rule beginners trip on
React decides whether to re-render by checking if a value is a **different
object**. So never change an array in place:

```js
tasks.push(newTask);                       // ❌ nothing re-renders
setTasks(prev => [newTask, ...prev]);      // ✅ new array, React notices
```

Every update in `TaskContext.jsx` builds a new array with `map`, `filter` or
the spread operator `...`.

---

## 4. How each feature works

| Feature | Where | How |
|---|---|---|
| **Dashboard statistics** | `pages/Dashboard.jsx` + `getStats()` | counts the task array and derives percentages; the progress bar is three divs whose widths are each status's share |
| **Create / edit** | `components/TaskForm.jsx` | one controlled form; given an `initialTask` it edits, given none it creates |
| **Delete** | `ConfirmDialog.jsx` | the delete button sets `pendingDelete`; only pressing Delete in the dialog calls `deleteTask` |
| **Status** | `lib/constants.js` | `todo` / `in-progress` / `done` — change the labels there and they change everywhere |
| **Priority** | same | `low` / `medium` / `high`, each with a `rank` used for sorting |
| **Due dates** | `lib/taskUtils.js` | `formatDueDate()` turns a date into "Due today" / "Overdue by 3 days"; dates are parsed manually to avoid a timezone off-by-one |
| **Search & filter** | `FilterBar.jsx` + `filterTasks()` | the page owns the `filters` object, the bar only reports changes up |
| **Kanban** | `pages/KanbanBoard.jsx` | native HTML5 drag & drop (`onDragStart` → `onDragOver` + `preventDefault` → `onDrop`), plus "Move to…" buttons for touch and keyboard |
| **Calendar** | `pages/CalendarView.jsx` + `buildMonthGrid()` | a 6×7 grid starting on Monday; tasks are grouped by date once so each cell is a cheap lookup |
| **Categories** | `pages/Categories.jsx` | add/remove with a colour; deleting a category moves its tasks to Work rather than deleting them |
| **Persistence** | `hooks/useLocalStorage.js` | every change to `tasks` or `categories` is written to `localStorage` by a `useEffect` |

---

## 5. Design notes

- **White background, blue accent** (`--blue-600: #2563eb`), Inter typeface.
- Every colour, radius and shadow is a CSS variable at the top of `styles.css`.
  Change `--blue-600` in one place to re-theme the entire app.
- Breakpoints: 1100px (stats go 2-up, columns stack), 860px (Kanban stacks),
  760px (sidebar becomes a slide-in drawer), 440px (single column).
- Row and card action buttons appear on hover on desktop, and are always
  visible on touch screens.

---

## 6. What was tested, and how

Tested in a real browser against the running app:

- creating a task with every field, and the empty-title validation
- editing a task (fields pre-filled correctly, changes saved)
- deleting — both cancelling and confirming
- toggling complete on and off
- search, all three filters, the two filters combined, all sort orders, and
  the "no matching tasks" empty state with its reset button
- Kanban drag & drop, verified by dispatching real drag events and checking
  both the column counts and the saved data
- calendar: 42-cell grid, today highlighted, next/previous month, clicking a
  day, tasks shown per day
- categories: add, duplicate rejected, delete (tasks reassigned, not deleted)
- **persistence across a full page reload**
- mobile at 375px: drawer opens, backdrop appears, no horizontal scrolling

One real bug was found and fixed during testing: `useLocalStorage` stored the
seed *function* instead of calling it, which crashed the app on first load.
The hook now unwraps lazy initializers, exactly like `useState` does.

---

## 7. Suggested next steps

1. Install Node.js and switch to Route B for hot reload.
2. Add React Router so each page gets its own URL.
3. Replace `localStorage` with a real backend — only `storage.js` and
   `TaskContext.jsx` would need to change, which is the benefit of keeping
   the data layer in one place.

---

## 8. Deployment

The repo root serves `index.html`, which is the **generated, self-contained
app** — so GitHub Pages (or Netlify, Vercel, any static host) works with no
build step and no configuration.

Two files look similar; do not mix them up:

| File | Purpose |
|---|---|
| `index.html` | **generated** by `build-standalone.sh`. The whole app in one file. This is what gets deployed. Never edit it by hand. |
| `dev.html` | the small page shell Vite uses during development. It loads `src/main.jsx`, which only works while Vite is running. |

**After changing anything in `src/`, rebuild before you commit**, or the
deployed site will still show the old version:

```bash
cd /Users/sinojd/Claud/task-manager && sh build-standalone.sh && git add -A && git commit -m "Update app" && git push
```

### Why a white screen happened before

The root `index.html` used to be the Vite shell, containing
`<script type="module" src="/src/main.jsx">`. On a static host that fails
twice over: the absolute `/src/...` path misses the repository subfolder (a
404 on Pages, where the site lives at `/Tasky/`), and browsers cannot execute
raw JSX anyway — it has to be compiled first. The page loaded, the script
failed, and `<div id="root">` stayed empty: a white screen.

---

## 9. Accounts and task assignment

The app runs in one of two modes, decided entirely by `src/lib/supabaseConfig.js`.

### Demo mode (the default — nothing to set up)

While that file's two values are empty, the sign-in screen just asks for a
name. Everything saves to this browser. **There is no password and no
security** — it exists so the app works out of the box and deploys to GitHub
Pages with no backend.

### Cloud mode (real accounts)

Fill the file in and the same app gains real email + password accounts, email
confirmation, password reset, and data synced across devices.

**1. Create a project** at <https://supabase.com> (the free tier is enough).

**2. Create the tables.** In the Supabase dashboard open **SQL Editor → New
query**, paste all of `supabase/schema.sql`, and press Run.

**3. Copy your keys.** Dashboard → **Project Settings → API**, then put them in
`src/lib/supabaseConfig.js`:

```js
export const SUPABASE_URL = 'https://abcdefgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

**4. Rebuild and deploy:**

```bash
cd /Users/sinojd/Claud/task-manager && sh build-standalone.sh && git add -A && git commit -m "Enable cloud accounts" && git push
```

#### Is it safe to commit the anon key to a public repo?

Yes — with one condition. The anon key is **designed** to be public; it ships
inside every browser app and cannot be hidden. It grants nothing on its own.

What actually protects your data is **Row Level Security**. Every policy in
`schema.sql` checks `auth.uid() = user_id`, so the database only ever returns
or changes rows belonging to the person making the request. That check happens
in the database, where a user cannot tamper with it.

Two rules follow from this:

- **Never** put the `service_role` key in this file. It bypasses RLS entirely.
- **Never** disable RLS on these tables. Without it, a public anon key would
  expose every row to anyone.

### How the two modes share one codebase

`src/lib/repo.js` exposes one interface with two implementations — `localRepo`
and `cloudRepo`. `TaskContext` calls `repo.tasks.create(...)` and never learns
which is behind it. Every method is `async` in both, so swapping in a real
backend did not mean rewriting a single component.

```
AuthProvider        who is signed in (demo profile or Supabase session)
  └─ TaskProvider   asks getRepo(user) for the right store
       └─ Shell     the interface, unchanged either way
```

### Assigning tasks

- **Team page** — add people with a name and an avatar colour. Removing someone
  does **not** delete their tasks; those tasks simply become unassigned.
- **Every task has one assignee** (or none). Set it in the task form.
- Cards and rows show a coloured initials avatar; unassigned shows a dashed `?`.
- **Filter by assignee** on All Tasks and the Kanban board, including an
  "Unassigned" option.

---

## 10. What was tested for this feature

Tested in a real browser against the running app, in demo mode:

- login screen appears when signed out; the chosen name persists
- first run seeds 6 tasks, 3 members and 5 categories; signing out and back in
  does **not** re-seed
- assignee avatars render on cards and rows; unassigned shows the `?` avatar
- assignee filter: by person, "Unassigned", and back to "All"
- assigning via the edit form saves and survives a reload
- Team page: add, duplicate-name rejection, remove-with-confirmation
- removing a member keeps all 6 tasks and unassigns exactly their tasks
- sign-out returns to the login screen and does **not** wipe stored tasks
- Kanban, Calendar and Categories all still work alongside the new data layer

Three bugs were found and fixed during this work:

1. The local store **prepended** new records while the cloud store sorts, so
   team members came back in reverse order. The local store now appends, and
   tasks sort newest-first to match the cloud exactly.
2. The seed data referenced members by hardcoded ids (`m_anita`). Supabase
   assigns UUIDs, so **every seeded assignment would have silently broken in
   cloud mode**. Seeding now maps seed ids to whatever ids the store returns.
3. The local store overwrote any id it was given, which replaced each
   category's slug (`work`) with a random id and orphaned every task from its
   category — the badges disappeared. It now keeps a supplied id.

**Not yet tested:** the cloud path itself. It needs a real Supabase project,
which requires your account. The code is written and reviewed, but until you
add your keys and run the schema, treat cloud mode as unverified.
