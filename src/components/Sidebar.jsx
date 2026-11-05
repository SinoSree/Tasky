// ---------------------------------------------------------------------------
// Sidebar.jsx — left navigation.
// On mobile it slides in over the page; `open` and `onClose` control that.
// ---------------------------------------------------------------------------
import React from 'react';
import Icon from './Icon.jsx';
import { useTasks } from '../context/TaskContext.jsx';
import { isOverdue } from '../lib/taskUtils.js';
import UserMenu from './UserMenu.jsx';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'dashboard' },
  { id: 'tasks',      label: 'All Tasks',  icon: 'list' },
  { id: 'kanban',     label: 'Kanban',     icon: 'kanban' },
  { id: 'calendar',   label: 'Calendar',   icon: 'calendar' },
  { id: 'team',       label: 'Team',       icon: 'users' },
  { id: 'categories', label: 'Categories', icon: 'tag' },
];

export default function Sidebar({ current, onNavigate, open, onClose }) {
  const { tasks } = useTasks();

  // Little count badges next to the nav items.
  const counts = {
    tasks: tasks.filter((t) => t.status !== 'done').length,
    kanban: tasks.length,
  };
  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <>
      {/* Dark backdrop, mobile only — tapping it closes the menu. */}
      {open && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <p className="brand-name">Taskly</p>
            <p className="brand-sub">Task manager</p>
          </div>
        </div>

        <nav className="nav">
          <p className="nav-section">Workspace</p>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${current === item.id ? 'is-active' : ''}`}
              onClick={() => { onNavigate(item.id); onClose(); }}
              aria-current={current === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {counts[item.id] > 0 && <span className="nav-count">{counts[item.id]}</span>}
            </button>
          ))}
        </nav>

        {overdueCount > 0 && (
          <div className="sidebar-alert">
            <Icon name="alert" size={16} />
            <div>
              <p className="sidebar-alert-title">{overdueCount} overdue</p>
              <p className="sidebar-alert-sub">Tasks past their due date</p>
            </div>
          </div>
        )}

        <div className="sidebar-foot">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}
