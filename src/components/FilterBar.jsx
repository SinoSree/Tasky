// ---------------------------------------------------------------------------
// FilterBar.jsx — search box + the status / priority / category / sort menus.
//
// This component owns NO state. The parent page holds the `filters` object
// and passes it down; this component just reports changes back up with
// onChange. That pattern is called "lifting state up", and it means the page
// (not the filter bar) decides what to do with a filter change.
// ---------------------------------------------------------------------------
import React from 'react';
import Icon from './Icon.jsx';
import { STATUSES, PRIORITIES } from '../lib/constants.js';

export default function FilterBar({ filters, onChange, categories, members = [], showStatus = true, showSort = true, resultCount }) {
  // Change one key of the filters object, keep the rest.
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="filter-bar">
      <div className="search-box">
        <Icon name="search" size={16} className="search-icon" />
        <input
          className="search-input"
          type="search"
          placeholder="Search tasks…"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          aria-label="Search tasks"
        />
      </div>

      <div className="filter-selects">
        {showStatus && (
          <select className="input select select-sm" value={filters.status} onChange={(e) => set('status', e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}

        <select className="input select select-sm" value={filters.priority} onChange={(e) => set('priority', e.target.value)} aria-label="Filter by priority">
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        <select className="input select select-sm" value={filters.category} onChange={(e) => set('category', e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        <select className="input select select-sm" value={filters.assignee} onChange={(e) => set('assignee', e.target.value)} aria-label="Filter by assignee">
          <option value="all">All assignees</option>
          <option value="none">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        {showSort && (
          <select className="input select select-sm" value={filters.sortBy} onChange={(e) => set('sortBy', e.target.value)} aria-label="Sort tasks">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="dueDate">Due date</option>
            <option value="priority">Priority</option>
            <option value="title">Title A–Z</option>
          </select>
        )}
      </div>

      {typeof resultCount === 'number' && (
        <span className="result-count">{resultCount} {resultCount === 1 ? 'task' : 'tasks'}</span>
      )}
    </div>
  );
}
