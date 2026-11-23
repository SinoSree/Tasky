// ---------------------------------------------------------------------------
// UserMenu.jsx — who is signed in, plus the sign-out button.
// Sits at the bottom of the sidebar.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTasks } from '../context/TaskContext.jsx';

export default function UserMenu() {
  // Two different "modes" meet here, and confusing them shows the user the
  // wrong thing:
  //   authMode    how the ACCOUNT works   — api / cloud / demo
  //   storageMode where the TASKS live    — cloud / local
  // With the Express backend the account is real while tasks are still
  // local, so the account label must not be taken from storage.
  const { displayName, user, signOut, mode: authMode } = useAuth();
  const { mode: storageMode } = useTasks();
  const [open, setOpen] = useState(false);

  const accountLabel =
    authMode === 'api'   ? 'Verified account' :
    authMode === 'cloud' ? 'Cloud account'    : 'Demo mode';

  return (
    <div className="user-menu">
      {open && (
        <div className="user-pop">
          <p className="user-pop-name">{displayName}</p>
          {user?.email && <p className="user-pop-email">{user.email}</p>}
          <p className="user-pop-mode">
            {storageMode === 'cloud'
              ? 'Tasks synced to the cloud'
              : 'Tasks saved in this browser only'}
          </p>
          <button className="user-pop-signout" onClick={signOut}>
            <Icon name="close" size={14} /> Sign out
          </button>
        </div>
      )}

      <button className="user-trigger" onClick={() => setOpen((o) => !o)}
              aria-expanded={open} aria-label="Account menu">
        <Avatar name={displayName} color={authMode === 'demo' ? '#6b7280' : '#2563eb'} size={28} />
        <span className="user-trigger-text">
          <span className="user-trigger-name">{displayName}</span>
          <span className="user-trigger-mode">{accountLabel}</span>
        </span>
      </button>
    </div>
  );
}
