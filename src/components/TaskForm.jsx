// ---------------------------------------------------------------------------
// TaskForm.jsx — the create AND edit form.
//
// It is a "controlled form": React state holds every field value, and each
// input shows `value={...}` + `onChange={...}`. React is the single source of
// truth, so validation and resetting are trivial.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import Button from './Button.jsx';
import { STATUSES, PRIORITIES } from '../lib/constants.js';

// A blank task, used when creating rather than editing.
const BLANK = { title: '', description: '', status: 'todo', priority: 'medium', category: 'work', dueDate: '' };

export default function TaskForm({ initialTask, categories, onSubmit, onCancel }) {
  // `initialTask ?? BLANK` → edit mode fills the fields, create mode is blank.
  const [form, setForm] = useState(() => ({ ...BLANK, ...(initialTask || {}) }));
  const [error, setError] = useState('');

  // One handler for every field: it uses the input's `name` attribute.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'title' && value.trim()) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();                  // stop the browser reloading the page
    if (!form.title.trim()) {
      setError('Please give the task a title.');
      return;
    }
    onSubmit(form);
  };

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label className="field-label" htmlFor="title">Title</label>
        <input
          id="title" name="title" className={`input ${error ? 'input-error' : ''}`}
          placeholder="e.g. Prepare the client presentation"
          value={form.title} onChange={handleChange} autoFocus
        />
        {error && <p className="field-error">{error}</p>}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="description">Description <span className="field-hint">optional</span></label>
        <textarea
          id="description" name="description" className="input textarea" rows={3}
          placeholder="Add any extra detail…"
          value={form.description} onChange={handleChange}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="status">Status</label>
          <select id="status" name="status" className="input select" value={form.status} onChange={handleChange}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="priority">Priority</label>
          <select id="priority" name="priority" className="input select" value={form.priority} onChange={handleChange}>
            {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="category">Category</label>
          <select id="category" name="category" className="input select" value={form.category} onChange={handleChange}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="dueDate">Due date</label>
          <input id="dueDate" name="dueDate" type="date" className="input" value={form.dueDate} onChange={handleChange} />
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">{initialTask ? 'Save changes' : 'Create task'}</Button>
      </div>
    </form>
  );
}
