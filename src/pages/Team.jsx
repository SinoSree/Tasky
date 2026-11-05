// ---------------------------------------------------------------------------
// Team.jsx — manage the people tasks can be assigned to.
// Same shape as the Categories page, so the app stays predictable.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useTasks } from '../context/TaskContext.jsx';

const TEAM_SWATCHES = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#059669', '#0891b2', '#475569'];

export default function Team() {
  const { tasks, members, addMember, deleteMember } = useTasks();
  const [name, setName] = useState('');
  const [color, setColor] = useState(TEAM_SWATCHES[0]);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const openCount = (id) => tasks.filter((t) => t.assigneeId === id && t.status !== 'done').length;
  const totalCount = (id) => tasks.filter((t) => t.assigneeId === id).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) { setError('Enter a name.'); return; }
    if (members.some((m) => m.name.toLowerCase() === clean.toLowerCase())) {
      setError('Someone with that name is already on the team.'); return;
    }
    await addMember(clean, color);
    setName(''); setError('');
  };

  const unassigned = tasks.filter((t) => !t.assigneeId).length;

  return (
    <div className="page">
      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">Add a team member</h2></div>

        <form className="cat-form" onSubmit={handleAdd}>
          <div className="field cat-field">
            <input className={`input ${error ? 'input-error' : ''}`} placeholder="Full name, e.g. Priya Nair"
                   value={name} onChange={(e) => { setName(e.target.value); setError(''); }} />
            {error && <p className="field-error">{error}</p>}
          </div>

          <div className="swatches" role="radiogroup" aria-label="Avatar colour">
            {TEAM_SWATCHES.map((c) => (
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
          <h2 className="panel-title">Your team</h2>
          <span className="panel-meta">
            {members.length} {members.length === 1 ? 'person' : 'people'}
            {unassigned > 0 && ` · ${unassigned} unassigned task${unassigned === 1 ? '' : 's'}`}
          </span>
        </div>

        <div className="cat-grid">
          {members.map((m) => (
            <div key={m.id} className="cat-card">
              <Avatar name={m.name} color={m.color} size={34} />
              <div className="cat-body">
                <p className="cat-name">{m.name}</p>
                <p className="cat-count">
                  {openCount(m.id)} open · {totalCount(m.id)} total
                </p>
              </div>
              <button className="icon-btn icon-btn-danger" onClick={() => setPendingDelete(m)}
                      aria-label={`Remove ${m.name}`}>
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove team member"
        confirmLabel="Remove"
        message={pendingDelete
          ? `Remove ${pendingDelete.name} from the team? Their ${totalCount(pendingDelete.id)} task(s) become unassigned. No task is deleted.`
          : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => { deleteMember(pendingDelete.id); setPendingDelete(null); }}
      />
    </div>
  );
}
