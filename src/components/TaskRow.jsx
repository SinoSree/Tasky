// ---------------------------------------------------------------------------
// TaskRow.jsx — the compact one-line layout used by the list view.
// Same data as TaskCard, different shape: that is why they are separate
// components instead of one component full of if-statements.
// ---------------------------------------------------------------------------
import React from 'react';
import Icon from './Icon.jsx';
import { PriorityBadge, StatusBadge, CategoryBadge } from './Badge.jsx';
import { formatDueDate, isOverdue } from '../lib/taskUtils.js';

export default function TaskRow({ task, categories, onEdit, onDelete, onToggle }) {
  const overdue = isOverdue(task);

  return (
    <div className={`task-row ${task.status === 'done' ? 'is-done' : ''}`}>
      <button
        className={`check-circle ${task.status === 'done' ? 'checked' : ''}`}
        onClick={() => onToggle(task.id)}
        aria-label={task.status === 'done' ? 'Mark as not completed' : 'Mark as completed'}
      >
        {task.status === 'done' && <Icon name="check" size={12} />}
      </button>

      <div className="task-row-main">
        <p className="task-row-title">{task.title}</p>
        {task.description && <p className="task-row-desc">{task.description}</p>}
      </div>

      <div className="task-row-badges">
        <CategoryBadge category={task.category} categories={categories} />
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>

      <span className={`task-row-due ${overdue ? 'is-overdue' : ''}`}>
        {task.dueDate ? formatDueDate(task.dueDate) : '—'}
      </span>

      <div className="task-row-actions">
        <button className="icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>
          <Icon name="edit" size={15} />
        </button>
        <button className="icon-btn icon-btn-danger" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}>
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  );
}
