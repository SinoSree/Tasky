// ---------------------------------------------------------------------------
// App.jsx — the root component.
//
// It owns three pieces of state:
//   page      → which view is on screen (simple routing, no router library)
//   filters   → shared by the list and the Kanban board
//   editing   → null = closed, {} = creating, {task} = editing that task
// ---------------------------------------------------------------------------
import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Modal from './components/Modal.jsx';
import TaskForm from './components/TaskForm.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TaskList from './pages/TaskList.jsx';
import KanbanBoard from './pages/KanbanBoard.jsx';
import CalendarView from './pages/CalendarView.jsx';
import Categories from './pages/Categories.jsx';
import { TaskProvider, useTasks } from './context/TaskContext.jsx';

const PAGE_META = {
  dashboard:  { title: 'Dashboard',  subtitle: 'An overview of everything on your plate' },
  tasks:      { title: 'All Tasks',  subtitle: 'Search, filter and sort every task' },
  kanban:     { title: 'Kanban',     subtitle: 'Drag a card to change its status' },
  calendar:   { title: 'Calendar',   subtitle: 'See your tasks by due date' },
  categories: { title: 'Categories', subtitle: 'Organise tasks into groups' },
};

const DEFAULT_FILTERS = { search: '', status: 'all', priority: 'all', category: 'all', sortBy: 'newest' };

// Shell is a separate component because it needs useTasks(), and a component
// can only read a Context that one of its PARENTS provides. <TaskProvider>
// wraps <Shell/> below, so Shell can read it but App itself could not.
function Shell() {
  const { categories, addTask, updateTask, deleteTask } = useTasks();

  const [page, setPage] = useState('dashboard');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(null);        // null | { task?: Task }
  const [pendingDelete, setPendingDelete] = useState(null);

  const openCreate = useCallback(() => setEditing({ task: null }), []);
  const openEdit   = useCallback((task) => setEditing({ task }), []);
  const closeForm  = useCallback(() => setEditing(null), []);

  // One submit handler for both modes: if we have a task, update it,
  // otherwise create a new one.
  const handleSubmit = (values) => {
    if (editing?.task) updateTask(editing.task.id, values);
    else addTask(values);
    setEditing(null);
  };

  const confirmDelete = () => {
    deleteTask(pendingDelete.id);
    setPendingDelete(null);
  };

  const meta = PAGE_META[page];

  const renderPage = () => {
    const shared = { onEdit: openEdit, onDelete: setPendingDelete, onNewTask: openCreate };
    switch (page) {
      case 'tasks':      return <TaskList    filters={filters} onFiltersChange={setFilters} {...shared} />;
      case 'kanban':     return <KanbanBoard filters={filters} onFiltersChange={setFilters} {...shared} />;
      case 'calendar':   return <CalendarView {...shared} />;
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
        {renderPage()}
      </main>

      {/* `key` forces React to build a FRESH form when the target task
          changes, so the fields always show the right starting values. */}
      <Modal open={editing !== null}
             title={editing?.task ? 'Edit task' : 'New task'}
             onClose={closeForm}>
        {editing !== null && (
          <TaskForm key={editing.task?.id || 'new'}
                    initialTask={editing.task}
                    categories={categories}
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

export default function App() {
  return (
    <TaskProvider>
      <Shell />
    </TaskProvider>
  );
}
