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
  const { displayName, user, signOut, cloud } = useAuth();
  const { mode } = useTasks();
  const [open, setOpen] = useState(false);

  return (
    <div className="user-menu">
      {open && (
        <div className="user-pop">
          <p className="user-pop-name">{displayName}</p>
          {user?.email && <p className="user-pop-email">{user.email}</p>}
          <p className="user-pop-mode">
            {mode === 'cloud' ? 'Synced to the cloud' : 'Saved in this browser only'}
          </p>
          <button className="user-pop-signout" onClick={signOut}>
            <Icon name="close" size={14} /> Sign out
          </button>
        </div>
      )}

      <button className="user-trigger" onClick={() => setOpen((o) => !o)}
              aria-expanded={open} aria-label="Account menu">
        <Avatar name={displayName} color={cloud ? '#2563eb' : '#6b7280'} size={28} />
        <span className="user-trigger-text">
          <span className="user-trigger-name">{displayName}</span>
          <span className="user-trigger-mode">{mode === 'cloud' ? 'Cloud account' : 'Demo mode'}</span>
        </span>
      </button>
    </div>
  );
}
