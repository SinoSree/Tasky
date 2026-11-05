// ---------------------------------------------------------------------------
// TaskCard.jsx — the card used on the Kanban board and the dashboard.
// It is also draggable (HTML5 drag & drop, no library needed).
// ---------------------------------------------------------------------------
import React from 'react';
import Icon from './Icon.jsx';
import { PriorityBadge, CategoryBadge } from './Badge.jsx';
import Avatar, { UnassignedAvatar } from './Avatar.jsx';
import { formatDueDate, isOverdue } from '../lib/taskUtils.js';

export default function TaskCard({ task, categories, members = [], onEdit, onDelete, onToggle, draggable = false, onDragStart }) {
  const assignee = members.find((m) => m.id === task.assigneeId);
  const overdue = isOverdue(task);

  return (
    <article
      className={`task-card ${task.status === 'done' ? 'is-done' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, task.id) : undefined}
    >
      <div className="task-card-top">
        <button
          className={`check-circle ${task.status === 'done' ? 'checked' : ''}`}
          onClick={() => onToggle(task.id)}
          aria-label={task.status === 'done' ? 'Mark as not completed' : 'Mark as completed'}
        >
          {task.status === 'done' && <Icon name="check" size={12} />}
        </button>

        <h4 className="task-card-title">{task.title}</h4>

        <div className="task-card-actions">
          <button className="icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>
            <Icon name="edit" size={15} />
          </button>
          <button className="icon-btn icon-btn-danger" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}>
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>

      {task.description && <p className="task-card-desc">{task.description}</p>}

      <div className="task-card-meta">
        <PriorityBadge priority={task.priority} />
        <CategoryBadge category={task.category} categories={categories} />
        {task.dueDate && (
          <span className={`due-chip ${overdue ? 'is-overdue' : ''}`}>
            <Icon name="clock" size={13} />
            {formatDueDate(task.dueDate)}
          </span>
        )}
        <span className="task-card-assignee">
          {assignee
            ? <Avatar name={assignee.name} color={assignee.color} size={22} title={`Assigned to ${assignee.name}`} />
            : <UnassignedAvatar size={22} />}
        </span>
      </div>
    </article>
  );
}
