// ---------------------------------------------------------------------------
// Topbar.jsx — page title, mobile menu button, and the "New task" button.
// ---------------------------------------------------------------------------
import React from 'react';
import Icon from './Icon.jsx';
import Button from './Button.jsx';

export default function Topbar({ title, subtitle, onNewTask, onMenu }) {
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open navigation">
        <Icon name="menu" size={20} />
      </button>

      <div className="topbar-text">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      <Button variant="primary" icon="plus" onClick={onNewTask}>New task</Button>
    </header>
  );
}
