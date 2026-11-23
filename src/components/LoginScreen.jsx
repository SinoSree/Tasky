// ---------------------------------------------------------------------------
// LoginScreen.jsx — shown whenever nobody is signed in.
//
// It renders one of three things, depending on how the app is configured:
//   API mode   → sign in with email OR mobile, register, verify by code
//   cloud mode → Supabase email + password sign in / sign up / reset
//   demo mode  → just "what should we call you?"
//
// In API mode this component is really a tiny router between three screens:
//   signin → register → verify
// ---------------------------------------------------------------------------
import React, { useState, useEffect } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import RegisterForm from './RegisterForm.jsx';
import OtpScreen from './OtpScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginScreen() {
  const {
    cloud, api, signIn, signUp, signInDemo, resetPassword,
    error, notice, clearMessages, pendingEmail, setPendingEmail,
  } = useAuth();

  const [mode, setMode] = useState('signin');       // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [demoName, setDemoName] = useState('');
  const [identifier, setIdentifier] = useState('');  // API mode: email OR mobile
  const [busy, setBusy] = useState(false);

  const switchMode = (next) => { setMode(next); clearMessages(); };

  // API mode: registering, or signing in to an unverified account, sets
  // pendingEmail — which means "show the code screen next".
  useEffect(() => {
    if (api && pendingEmail) setMode('verify');
  }, [api, pendingEmail]);

  const handleCloudSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (mode === 'signin') await signIn(email, password);
    else await signUp(email, password, fullName);
    setBusy(false);
  };

  const handleApiSignIn = async (e) => {
    e.preventDefault();
    setBusy(true);
    await signIn(identifier, password);
    setBusy(false);
  };

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    signInDemo(demoName);
  };

  // --- API mode: the code screen takes over the whole view ----------------
  if (api && mode === 'verify' && pendingEmail) {
    return (
      <OtpScreen
        email={pendingEmail}
        onBack={() => { setPendingEmail(''); setMode('signin'); clearMessages(); }}
      />
    );
  }

  const subtitle = api
    ? (mode === 'signup' ? 'Create your Taskly account' : 'Sign in to your account')
    : cloud
      ? (mode === 'signin' ? 'Sign in to your account' : 'Create your account')
      : 'Choose a name to get started';

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark brand-mark-lg">T</div>
          <h1 className="auth-title">Taskly</h1>
          <p className="auth-sub">{subtitle}</p>
        </div>

        {/* The register form shows its own errors beside each field. */}
        {!(api && mode === 'signup') && error && (
          <div className="auth-msg auth-msg-error"><Icon name="alert" size={15} />{error}</div>
        )}
        {!(api && mode === 'signup') && notice && (
          <div className="auth-msg auth-msg-ok"><Icon name="check" size={15} />{notice}</div>
        )}

        {api ? (
          mode === 'signup' ? (
            <RegisterForm onSwitchToSignIn={() => switchMode('signin')} />
          ) : (
            <form className="auth-form" onSubmit={handleApiSignIn} noValidate>
              <div className="field">
                <label className="field-label" htmlFor="identifier">Email or mobile number</label>
                <input
                  id="identifier" className="input" value={identifier} required autoFocus
                  autoComplete="username" placeholder="you@example.com or +919876543210"
                  onChange={(e) => { setIdentifier(e.target.value); clearMessages(); }}
                />
                <p className="field-hint">Sign in with whichever you registered.</p>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="password">Password</label>
                <input
                  id="password" type="password" className="input" value={password} required
                  autoComplete="current-password" inputMode="numeric" placeholder="••••••••"
                  onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                />
              </div>

              <Button type="submit" variant="primary" className="auth-submit" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>

              <div className="auth-links">
                <button type="button" className="link-btn" onClick={() => switchMode('signup')}>
                  Create an account
                </button>
              </div>
            </form>
          )
        ) : cloud ? (
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
              only in this browser. To switch on real accounts, set
              <code>API_BASE_URL</code> in <code>src/lib/authConfig.js</code> — see the README.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
