// ---------------------------------------------------------------------------
// CalendarView.jsx — month grid with each task on its due date.
// Click a day to see everything due that day.
// ---------------------------------------------------------------------------
import React, { useState, useMemo } from 'react';
import Icon from '../components/Icon.jsx';
import Button from '../components/Button.jsx';
import TaskCard from '../components/TaskCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useTasks } from '../context/TaskContext.jsx';
import { buildMonthGrid, toDateInput, startOfToday } from '../lib/taskUtils.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView({ onEdit, onDelete, onNewTask }) {
  const { tasks, categories, members, toggleComplete } = useTasks();
  const today = startOfToday();

  // Which month is on screen, and which day the user clicked.
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => toDateInput(today));

  const cells = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  // Group tasks by due date once, so each cell is a cheap lookup instead of
  // filtering the whole task list 42 times.
  const byDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      (map[t.dueDate] = map[t.dueDate] || []).push(t);
    });
    return map;
  }, [tasks]);

  const shiftMonth = (delta) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const selectedTasks = byDate[selected] || [];
  const undated = tasks.filter((t) => !t.dueDate);

  return (
    <div className="page">
      <div className="cal-toolbar">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <Icon name="chevronL" size={18} />
          </button>
          <h2 className="cal-month">
            {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
            <Icon name="chevronR" size={18} />
          </button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => {
          setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
          setSelected(toDateInput(today));
        }}>Today</Button>
      </div>

      <div className="cal-layout">
        <div className="panel cal-panel">
          <div className="cal-weekdays">
            {WEEKDAYS.map((d) => <span key={d} className="cal-weekday">{d}</span>)}
          </div>

          <div className="cal-grid">
            {cells.map(({ date, inMonth }) => {
              const key = toDateInput(date);
              const dayTasks = byDate[key] || [];
              const isToday = key === toDateInput(today);
              return (
                <button
                  key={key}
                  className={`cal-cell ${inMonth ? '' : 'is-outside'} ${isToday ? 'is-today' : ''} ${selected === key ? 'is-selected' : ''}`}
                  onClick={() => setSelected(key)}
                >
                  <span className="cal-daynum">{date.getDate()}</span>
                  <span className="cal-dots">
                    {dayTasks.slice(0, 3).map((t) => (
                      <span key={t.id} className={`cal-dot dot-${t.priority} ${t.status === 'done' ? 'is-done' : ''}`} />
                    ))}
                    {dayTasks.length > 3 && <span className="cal-more">+{dayTasks.length - 3}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="panel cal-side">
          <div className="panel-head">
            <h2 className="panel-title">
              {new Date(selected + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <span className="panel-meta">{selectedTasks.length} due</span>
          </div>

          {selectedTasks.length === 0 ? (
            <EmptyState icon="calendar" title="Nothing due this day"
                        message="Pick another date, or add a task for this one."
                        actionLabel="New task" onAction={onNewTask} />
          ) : (
            <div className="card-stack">
              {selectedTasks.map((task) => (
                <TaskCard key={task.id} task={task} categories={categories} members={members}
                          onEdit={onEdit} onDelete={onDelete} onToggle={toggleComplete} />
              ))}
            </div>
          )}

          {undated.length > 0 && (
            <div className="cal-undated">
              <p className="cal-undated-title">{undated.length} task{undated.length === 1 ? '' : 's'} with no due date</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
