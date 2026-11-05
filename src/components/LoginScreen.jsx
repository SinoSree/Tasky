// ---------------------------------------------------------------------------
// LoginScreen.jsx — shown whenever nobody is signed in.
//
// It renders one of two things depending on whether supabaseConfig.js has
// been filled in:
//   cloud mode → real email + password sign in / sign up / reset
//   demo mode  → just "what should we call you?"
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginScreen() {
  const { cloud, signIn, signUp, signInDemo, resetPassword, error, notice, clearMessages } = useAuth();

  const [mode, setMode] = useState('signin');       // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [demoName, setDemoName] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (next) => { setMode(next); clearMessages(); };

  const handleCloudSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (mode === 'signin') await signIn(email, password);
    else await signUp(email, password, fullName);
    setBusy(false);
  };

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    signInDemo(demoName);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark brand-mark-lg">T</div>
          <h1 className="auth-title">Taskly</h1>
          <p className="auth-sub">
            {cloud
              ? (mode === 'signin' ? 'Sign in to your account' : 'Create your account')
              : 'Choose a name to get started'}
          </p>
        </div>

        {error  && <div className="auth-msg auth-msg-error"><Icon name="alert" size={15} />{error}</div>}
        {notice && <div className="auth-msg auth-msg-ok"><Icon name="check" size={15} />{notice}</div>}

        {cloud ? (
          <form className="auth-form" onSubmit={handleCloudSubmit}>
            {mode === 'signup' && (
              <div className="field">
                <label className="field-label" htmlFor="fullName">Your name</label>
                <input id="fullName" className="input" value={fullName} autoComplete="name"
                       onChange={(e) => setFullName(e.target.value)} placeholder="Sinoj V V" />
              </div>
            )}

            <div className="field">
              <label className="field-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} required
                     autoComplete="email" placeholder="you@example.com"
                     onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={password} required
                     minLength={6} placeholder="At least 6 characters"
                     autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                     onChange={(e) => setPassword(e.target.value)} />
            </div>

            <Button type="submit" variant="primary" className="auth-submit" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>

            <div className="auth-links">
              {mode === 'signin' ? (
                <>
                  <button type="button" className="link-btn" onClick={() => switchMode('signup')}>
                    Create an account
                  </button>
                  <button type="button" className="link-btn" onClick={() => resetPassword(email)}>
                    Forgot password?
                  </button>
                </>
              ) : (
                <button type="button" className="link-btn" onClick={() => switchMode('signin')}>
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleDemoSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="demoName">Your name</label>
              <input id="demoName" className="input" value={demoName} autoFocus
                     placeholder="e.g. Sinoj" onChange={(e) => setDemoName(e.target.value)} />
            </div>
            <Button type="submit" variant="primary" className="auth-submit">Continue</Button>

            <p className="auth-demo-note">
              <strong>Demo mode.</strong> There is no password and your tasks are saved
              only in this browser. To switch on real accounts with cloud sync, fill in
              <code>src/lib/supabaseConfig.js</code> — see the README.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
