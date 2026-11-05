// ---------------------------------------------------------------------------
// TaskList.jsx — the searchable, filterable, sortable list of every task.
// ---------------------------------------------------------------------------
import React, { useMemo } from 'react';
import FilterBar from '../components/FilterBar.jsx';
import TaskRow from '../components/TaskRow.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';
import { useTasks } from '../context/TaskContext.jsx';
import { filterTasks, sortTasks } from '../lib/taskUtils.js';

export default function TaskList({ filters, onFiltersChange, onEdit, onDelete, onNewTask }) {
  const { tasks, categories, members, toggleComplete, clearCompleted } = useTasks();

  // Filter first, then sort. Recalculated only when the inputs change.
  const visible = useMemo(
    () => sortTasks(filterTasks(tasks, filters), filters.sortBy),
    [tasks, filters]
  );

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  // "Filters are active" = the empty result is caused by the filters, not by
  // an empty task list. The empty state message changes accordingly.
  const hasFilters =
    filters.search.trim() !== '' || filters.status !== 'all' ||
    filters.priority !== 'all' || filters.category !== 'all' || filters.assignee !== 'all';

  return (
    <div className="page">
      <FilterBar filters={filters} onChange={onFiltersChange}
                 categories={categories} members={members} resultCount={visible.length} />

      {completedCount > 0 && (
        <div className="list-toolbar">
          <Button variant="ghost" size="sm" icon="trash" onClick={clearCompleted}>
            Clear {completedCount} completed
          </Button>
        </div>
      )}

      {visible.length === 0 ? (
        hasFilters ? (
          <EmptyState icon="search" title="No matching tasks"
                      message="Try a different search term or reset the filters."
                      actionLabel="Reset filters"
                      onAction={() => onFiltersChange({ search: '', status: 'all', priority: 'all', category: 'all', assignee: 'all', sortBy: filters.sortBy })} />
        ) : (
          <EmptyState icon="inbox" title="No tasks yet"
                      message="Create your first task and it will appear here."
                      actionLabel="New task" onAction={onNewTask} />
        )
      ) : (
        <div className="task-list">
          {visible.map((task) => (
            <TaskRow key={task.id} task={task} categories={categories} members={members}
                     onEdit={onEdit} onDelete={onDelete} onToggle={toggleComplete} />
          ))}
        </div>
      )}
    </div>
  );
}
