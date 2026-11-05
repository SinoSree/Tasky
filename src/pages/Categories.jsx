// ---------------------------------------------------------------------------
// Categories.jsx — add / remove categories and see how many tasks use each.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useTasks } from '../context/TaskContext.jsx';

const SWATCHES = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#059669', '#0891b2', '#475569'];

export default function Categories() {
  const { tasks, categories, addCategory, deleteCategory } = useTasks();
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    const clean = label.trim();
    if (!clean) { setError('Enter a category name.'); return; }
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (categories.some((c) => c.id === id)) { setError('That category already exists.'); return; }
    addCategory(clean, color);
    setLabel(''); setError('');
  };

  const countFor = (id) => tasks.filter((t) => t.category === id).length;

  return (
    <div className="page">
      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">Add a category</h2></div>

        <form className="cat-form" onSubmit={handleAdd}>
          <div className="field cat-field">
            <input className={`input ${error ? 'input-error' : ''}`} placeholder="Category name, e.g. Marketing"
                   value={label} onChange={(e) => { setLabel(e.target.value); setError(''); }} />
            {error && <p className="field-error">{error}</p>}
          </div>

          <div className="swatches" role="radiogroup" aria-label="Category colour">
            {SWATCHES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c}
                      className={`swatch ${color === c ? 'is-active' : ''}`}
                      style={{ backgroundColor: c }} onClick={() => setColor(c)}
                      aria-label={`Colour ${c}`} />
            ))}
          </div>

          <Button type="submit" variant="primary" icon="plus">Add</Button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Your categories</h2>
          <span className="panel-meta">{categories.length} total</span>
        </div>

        <div className="cat-grid">
          {categories.map((c) => {
            const count = countFor(c.id);
            return (
              <div key={c.id} className="cat-card">
                <span className="cat-dot" style={{ backgroundColor: c.color }} />
                <div className="cat-body">
                  <p className="cat-name">{c.label}</p>
                  <p className="cat-count">{count} task{count === 1 ? '' : 's'}</p>
                </div>
                <button className="icon-btn icon-btn-danger" onClick={() => setPendingDelete(c)}
                        aria-label={`Delete ${c.label}`}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete category"
        message={pendingDelete
          ? `Delete "${pendingDelete.label}"? Its ${countFor(pendingDelete.id)} task(s) will move to Work. No task is deleted.`
          : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => { deleteCategory(pendingDelete.id); setPendingDelete(null); }}
      />
    </div>
  );
}
