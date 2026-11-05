// ---------------------------------------------------------------------------
// KanbanBoard.jsx — three columns, cards you can drag between them.
//
// Drag & drop uses the browser's built-in HTML5 API — no library:
//   1. onDragStart  : remember which task id is moving
//   2. onDragOver   : call preventDefault(), otherwise the browser refuses
//                     to allow a drop at all
//   3. onDrop       : update that task's status
// Buttons under each card do the same thing with a click, so the board is
// still fully usable on a touch screen or with a keyboard.
// ---------------------------------------------------------------------------
import React, { useState, useMemo } from 'react';
import FilterBar from '../components/FilterBar.jsx';
import TaskCard from '../components/TaskCard.jsx';
import Button from '../components/Button.jsx';
import { useTasks } from '../context/TaskContext.jsx';
import { STATUSES } from '../lib/constants.js';
import { filterTasks, sortTasks } from '../lib/taskUtils.js';

export default function KanbanBoard({ filters, onFiltersChange, onEdit, onDelete, onNewTask }) {
  const { tasks, categories, moveTask, toggleComplete } = useTasks();
  const [dragOverCol, setDragOverCol] = useState(null);   // for the highlight

  const visible = useMemo(
    () => sortTasks(filterTasks(tasks, { ...filters, status: 'all' }), filters.sortBy),
    [tasks, filters]
  );

  const handleDragStart = (e, taskId) => {
    // dataTransfer is how the browser carries data from drag to drop.
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, statusId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) moveTask(taskId, statusId);
    setDragOverCol(null);
  };

  return (
    <div className="page">
      <FilterBar filters={filters} onChange={onFiltersChange}
                 categories={categories} showStatus={false} resultCount={visible.length} />

      <div className="kanban">
        {STATUSES.map((status) => {
          const columnTasks = visible.filter((t) => t.status === status.id);
          return (
            <section
              key={status.id}
              className={`kanban-col ${dragOverCol === status.id ? 'is-dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(status.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              <div className="kanban-head">
                <span className={`kanban-dot seg-${status.id}`} />
                <h2 className="kanban-title">{status.label}</h2>
                <span className="kanban-count">{columnTasks.length}</span>
              </div>

              <div className="kanban-body">
                {columnTasks.map((task) => (
                  <div key={task.id} className="kanban-item">
                    <TaskCard task={task} categories={categories}
                              onEdit={onEdit} onDelete={onDelete} onToggle={toggleComplete}
                              draggable onDragStart={handleDragStart} />
                    {/* Click-based alternative to dragging. */}
                    <div className="move-row">
                      {STATUSES.filter((s) => s.id !== status.id).map((s) => (
                        <button key={s.id} className="move-btn"
                                onClick={() => moveTask(task.id, s.id)}>
                          Move to {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <p className="kanban-empty">Drop a task here</p>
                )}
              </div>

              {status.id === 'todo' && (
                <Button variant="ghost" size="sm" icon="plus" className="kanban-add" onClick={onNewTask}>
                  Add task
                </Button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
