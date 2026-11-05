// ---------------------------------------------------------------------------
// Dashboard.jsx — statistics + two short lists (due soon, recently added).
// ---------------------------------------------------------------------------
import React, { useMemo } from 'react';
import StatCard from '../components/StatCard.jsx';
import TaskCard from '../components/TaskCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import { useTasks } from '../context/TaskContext.jsx';
import { getStats, isOverdue, sortTasks, parseDateInput, startOfToday } from '../lib/taskUtils.js';
import { STATUSES } from '../lib/constants.js';

export default function Dashboard({ onEdit, onDelete, onNewTask }) {
  const { tasks, categories, members, toggleComplete } = useTasks();

  // useMemo caches the result and only recalculates when `tasks` changes.
  const stats = useMemo(() => getStats(tasks), [tasks]);

  // Unfinished tasks with a due date in the next 7 days (overdue included).
  const dueSoon = useMemo(() => {
    const today = startOfToday();
    const limit = new Date(today); limit.setDate(limit.getDate() + 7);
    return sortTasks(
      tasks.filter((t) => {
        if (t.status === 'done' || !t.dueDate) return false;
        const d = parseDateInput(t.dueDate);
        return d && d <= limit;
      }),
      'dueDate'
    ).slice(0, 4);
  }, [tasks]);

  const recent = useMemo(() => sortTasks(tasks, 'newest').slice(0, 4), [tasks]);

  // How many tasks sit in each status — used for the progress bar.
  const byStatus = STATUSES.map((s) => ({
    ...s,
    count: tasks.filter((t) => t.status === s.id).length,
  }));

  return (
    <div className="page">
      <section className="stat-grid">
        <StatCard label="Total tasks"  value={stats.total}    icon="inbox"    tone="blue" />
        <StatCard label="In progress"  value={stats.progress} icon="trending" tone="amber" />
        <StatCard label="Completed"    value={stats.done}     icon="check"    tone="green"
                  hint={`${stats.completionRate}% of all tasks`} />
        <StatCard label="Overdue"      value={stats.overdue}  icon="alert"    tone="red"
                  hint={stats.dueToday > 0 ? `${stats.dueToday} due today` : undefined} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Progress</h2>
          <span className="panel-meta">{stats.completionRate}% complete</span>
        </div>

        {/* The bar: each segment's width is its share of all tasks. */}
        <div className="progress-track">
          {byStatus.map((s) => (
            s.count > 0 && (
              <div
                key={s.id}
                className={`progress-seg seg-${s.id}`}
                style={{ width: `${(s.count / stats.total) * 100}%` }}
                title={`${s.label}: ${s.count}`}
              />
            )
          ))}
          {stats.total === 0 && <div className="progress-seg seg-empty" style={{ width: '100%' }} />}
        </div>

        <div className="progress-legend">
          {byStatus.map((s) => (
            <span key={s.id} className="legend-item">
              <span className={`legend-dot seg-${s.id}`} />
              {s.label} <strong>{s.count}</strong>
            </span>
          ))}
          <span className="legend-item legend-high">
            <Icon name="alert" size={13} /> High priority open <strong>{stats.highPrio}</strong>
          </span>
        </div>
      </section>

      <div className="dash-columns">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Due in the next 7 days</h2>
          </div>
          {dueSoon.length === 0 ? (
            <EmptyState icon="calendar" title="Nothing due soon" message="You are all caught up for the week." />
          ) : (
            <div className="card-stack">
              {dueSoon.map((task) => (
                <TaskCard key={task.id} task={task} categories={categories} members={members}
                          onEdit={onEdit} onDelete={onDelete} onToggle={toggleComplete} />
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Recently added</h2>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="inbox" title="No tasks yet"
                        message="Create your first task to get started."
                        actionLabel="New task" onAction={onNewTask} />
          ) : (
            <div className="card-stack">
              {recent.map((task) => (
                <TaskCard key={task.id} task={task} categories={categories} members={members}
                          onEdit={onEdit} onDelete={onDelete} onToggle={toggleComplete} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
