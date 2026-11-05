// ---------------------------------------------------------------------------
// App.jsx — the root component.
//
// Provider order matters: AuthProvider must wrap TaskProvider, because
// TaskProvider calls useAuth() to decide where to load data from.
//
//   <AuthProvider>      who is signed in
//     <TaskProvider>    their tasks, team and categories
//       <Shell/>        the actual interface
// ---------------------------------------------------------------------------
import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Modal from './components/Modal.jsx';
import TaskForm from './components/TaskForm.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import Icon from './components/Icon.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TaskList from './pages/TaskList.jsx';
import KanbanBoard from './pages/KanbanBoard.jsx';
import CalendarView from './pages/CalendarView.jsx';
import Categories from './pages/Categories.jsx';
import Team from './pages/Team.jsx';
import { TaskProvider, useTasks } from './context/TaskContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

const PAGE_META = {
  dashboard:  { title: 'Dashboard',  subtitle: 'An overview of everything on your plate' },
  tasks:      { title: 'All Tasks',  subtitle: 'Search, filter and sort every task' },
  kanban:     { title: 'Kanban',     subtitle: 'Drag a card to change its status' },
  calendar:   { title: 'Calendar',   subtitle: 'See your tasks by due date' },
  team:       { title: 'Team',       subtitle: 'People you can assign tasks to' },
  categories: { title: 'Categories', subtitle: 'Organise tasks into groups' },
};

const DEFAULT_FILTERS = {
  search: '', status: 'all', priority: 'all',
  category: 'all', assignee: 'all', sortBy: 'newest',
};

function Shell() {
  const { categories, members, loading, syncError, dismissSyncError,
          addTask, updateTask, deleteTask } = useTasks();

  const [page, setPage] = useState('dashboard');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const openCreate = useCallback(() => setEditing({ task: null }), []);
  const openEdit   = useCallback((task) => setEditing({ task }), []);
  const closeForm  = useCallback(() => setEditing(null), []);

  const handleSubmit = async (values) => {
    if (editing?.task) await updateTask(editing.task.id, values);
    else await addTask(values);
    setEditing(null);
  };

  const confirmDelete = async () => {
    await deleteTask(pendingDelete.id);
    setPendingDelete(null);
  };

  const meta = PAGE_META[page];

  const renderPage = () => {
    const shared = { onEdit: openEdit, onDelete: setPendingDelete, onNewTask: openCreate };
    switch (page) {
      case 'tasks':      return <TaskList    filters={filters} onFiltersChange={setFilters} {...shared} />;
      case 'kanban':     return <KanbanBoard filters={filters} onFiltersChange={setFilters} {...shared} />;
      case 'calendar':   return <CalendarView {...shared} />;
      case 'team':       return <Team />;
      case 'categories': return <Categories />;
      case 'dashboard':
      default:           return <Dashboard {...shared} />;
    }
  };

  return (
    <div className="app">
      <Sidebar current={page} onNavigate={setPage}
               open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="main">
        <Topbar title={meta.title} subtitle={meta.subtitle}
                onNewTask={openCreate} onMenu={() => setMenuOpen(true)} />

        {/* A failed save must never pass silently. */}
        {syncError && (
          <div className="sync-error">
            <Icon name="alert" size={16} />
            <span>{syncError}</span>
            <button className="icon-btn" onClick={dismissSyncError} aria-label="Dismiss">
              <Icon name="close" size={15} />
            </button>
          </div>
        )}

        {loading ? <div className="page"><p className="loading-note">Loading your tasks…</p></div> : renderPage()}
      </main>

      <Modal open={editing !== null}
             title={editing?.task ? 'Edit task' : 'New task'}
             onClose={closeForm}>
        {editing !== null && (
          <TaskForm key={editing.task?.id || 'new'}
                    initialTask={editing.task}
                    categories={categories}
                    members={members}
                    onSubmit={handleSubmit}
                    onCancel={closeForm} />
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete task"
        message={pendingDelete ? `Delete "${pendingDelete.title}"? This cannot be undone.` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// Decides between the login screen and the app.
function Gate() {
  const { isSignedIn, loading } = useAuth();

  // Without this check the login screen would flash for a moment on every
  // refresh, before Supabase reports the stored session.
  if (loading) {
    return <div className="auth-screen"><p className="loading-note">Loading…</p></div>;
  }
  if (!isSignedIn) return <LoginScreen />;

  return (
    <TaskProvider>
      <Shell />
    </TaskProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
