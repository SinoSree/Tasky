// ---------------------------------------------------------------------------
// StatCard.jsx — one number + label tile on the dashboard.
// ---------------------------------------------------------------------------
import React from 'react';
import Icon from './Icon.jsx';

export default function StatCard({ label, value, icon, tone = 'blue', hint }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon tone-${tone}`}><Icon name={icon} size={18} /></div>
      <div className="stat-body">
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </div>
  );
}
