// ---------------------------------------------------------------------------
// AuthContext.jsx
//
// Handles "who is signed in". It has THREE modes and hides the difference
// from the rest of the app:
//
//   API MODE   (authConfig.js has API_BASE_URL)
//     Your own Express + MongoDB backend. Real accounts, real passwords,
//     email verification by one-time code, httpOnly session cookie.
//
//   CLOUD MODE (supabaseConfig.js is filled in)
//     Supabase accounts. Unchanged from before.
//
//   DEMO MODE  (neither is configured)
//     A fake local sign-in. Pick a display name, everything saves to this
//     browser. No password, no security — it just lets the app work.
//
// The first one configured wins. Every component just calls useAuth().
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getSupabase, friendlyAuthError } from '../lib/supabaseClient.js';
import { isCloudConfigured } from '../lib/supabaseConfig.js';
import { isApiConfigured } from '../lib/authConfig.js';
import { apiGet, apiPost } from '../lib/apiClient.js';
import { loadJSON, saveJSON } from '../lib/storage.js';

const AuthContext = createContext(null);
const DEMO_USER_KEY = 'tm.demoUser.v1';

export function AuthProvider({ children }) {
  // Work out the mode once. API first, then Supabase, then demo.
  const mode = isApiConfigured() ? 'api' : isCloudConfigured() ? 'cloud' : 'demo';
  const cloud = mode === 'cloud';
  const api = mode === 'api';

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);   // true until we know
  const [error, setError]     = useState('');
  const [notice, setNotice]   = useState('');     // e.g. "check your email"

  // API mode only: the address awaiting a code. Set by register(), and by a
  // login attempt on an unverified account, so the app can open the code
  // screen without asking the user to retype anything.
  const [pendingEmail, setPendingEmail] = useState('');

  // --- work out who is signed in, once, on startup ------------------------
  useEffect(() => {
    let cancelled = false;

    if (api) {
      // The session lives in an httpOnly cookie that JavaScript cannot read,
      // so the only way to know is to ask the server.
      apiGet('/api/auth/me').then((result) => {
        if (cancelled) return;
        setUser(result.ok ? result.data.user : null);
        // A 401 here is normal (nobody signed in) and must not look like a
        // failure. A server that is down, however, is worth saying out loud.
        if (!result.ok && result.offline) setError(result.error);
        setLoading(false);
      });
      return () => { cancelled = true; };
    }

    if (!cloud) {
      // Demo mode: read the saved local profile, if any.
      const saved = loadJSON(DEMO_USER_KEY, null);
      if (!cancelled) { setUser(saved); setLoading(false); }
      return () => { cancelled = true; };
    }

    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return () => { cancelled = true; }; }

    // Ask Supabase whether a session is already stored in this browser.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    // Then keep listening: sign-in, sign-out and token refresh all land here,
    // including in other browser tabs.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();   // always clean up listeners
    };
  }, [cloud, api]);

  // --- API mode actions ---------------------------------------------------

  // Create an account. On success the backend has emailed a code and the
  // app should show the verification screen — the account cannot sign in
  // until that code is entered.
  const register = useCallback(async (values) => {
    setError(''); setNotice('');
    const result = await apiPost('/api/auth/register', values);

    if (!result.ok) {
      setError(result.error);
      // The address is registered but was never verified — almost always the
      // same person coming back. Send them to the code screen rather than
      // leaving them stuck on a form they cannot complete.
      if (result.reason === 'unverified_exists') {
        setPendingEmail(result.data?.email || values.email);
      }
      return { ok: false, fieldErrors: result.fieldErrors, reason: result.reason };
    }

    setPendingEmail(result.data.email);
    setNotice(result.data.message);
    return { ok: true, email: result.data.email };
  }, []);

  // Submit the 6-digit code. The backend signs the user in on success, so
  // there is nothing more for them to do.
  const verifyEmail = useCallback(async (email, code) => {
    setError(''); setNotice('');
    const result = await apiPost('/api/auth/verify-email', { email, code });

    if (!result.ok) {
      setError(result.error);
      return { ok: false, reason: result.reason };
    }

    setUser(result.data.user);
    setPendingEmail('');
    return { ok: true };
  }, []);

  const resendOtp = useCallback(async (email) => {
    setError(''); setNotice('');
    const result = await apiPost('/api/auth/resend-otp', { email });

    if (!result.ok) {
      setError(result.error);
      return { ok: false, retryAfterSeconds: result.retryAfterSeconds };
    }

    setNotice(result.data.message);
    return { ok: true };
  }, []);

  // --- actions shared across modes ----------------------------------------

  // In API mode `emailOrIdentifier` may be an email OR a mobile number —
  // the backend works out which.
  const signIn = useCallback(async (emailOrIdentifier, password) => {
    setError(''); setNotice('');

    if (api) {
      const result = await apiPost('/api/auth/login', {
        identifier: (emailOrIdentifier || '').trim(),
        password,
      });

      if (!result.ok) {
        setError(result.error);
        // An unverified account is not a failed login: send them to the
        // code screen instead of leaving them stuck.
        if (result.reason === 'email_not_verified') {
          setPendingEmail(result.data?.email || '');
          return false;
        }
        return false;
      }

      setUser(result.data.user);
      return true;
    }

    const supabase = getSupabase();
    if (!supabase) { setError('Cloud mode is not configured.'); return false; }

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: (emailOrIdentifier || '').trim(), password,
    });
    if (err) { setError(friendlyAuthError(err)); return false; }
    setUser(data.user);
    return true;
  }, [api]);

  const signUp = useCallback(async (email, password, fullName) => {
    setError(''); setNotice('');
    const supabase = getSupabase();
    if (!supabase) { setError('Cloud mode is not configured.'); return false; }

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Anything in `data` is stored on the user as user_metadata.
      options: { data: { full_name: (fullName || '').trim() } },
    });
    if (err) { setError(friendlyAuthError(err)); return false; }

    // If email confirmation is ON there is no session yet — say so clearly
    // instead of silently doing nothing.
    if (!data.session) {
      setNotice('Account created. Check your email to confirm it, then sign in.');
      return true;
    }
    setUser(data.user);
    return true;
  }, []);

  const resetPassword = useCallback(async (email) => {
    setError(''); setNotice('');
    const supabase = getSupabase();
    if (!supabase) { setError('Cloud mode is not configured.'); return false; }
    if (!email.trim()) { setError('Enter your email address first.'); return false; }

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.href.split('?')[0],
    });
    if (err) { setError(friendlyAuthError(err)); return false; }
    setNotice('Password reset link sent. Check your email.');
    return true;
  }, []);

  // Demo mode only: "sign in" is just choosing a display name.
  const signInDemo = useCallback((name) => {
    const clean = (name || '').trim();
    if (!clean) { setError('Enter a name to continue.'); return false; }
    const demoUser = {
      id: 'demo-local-user',
      email: '',
      isDemo: true,
      user_metadata: { full_name: clean },
    };
    saveJSON(DEMO_USER_KEY, demoUser);
    setUser(demoUser);
    setError('');
    return true;
  }, []);

  const signOut = useCallback(async () => {
    setError(''); setNotice('');
    if (api) {
      // The cookie is httpOnly, so only the server can remove it.
      await apiPost('/api/auth/logout');
    } else if (cloud) {
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
    } else {
      saveJSON(DEMO_USER_KEY, null);
    }
    setUser(null);
    setPendingEmail('');
  }, [cloud, api]);

  // A display name that always returns something sensible, whichever shape
  // of user object the current mode produces.
  const displayName =
    user?.username ||                               // API mode
    user?.user_metadata?.full_name?.trim() ||       // Supabase / demo
    user?.email?.split('@')[0] ||
    'User';

  const value = useMemo(() => ({
    user, loading, error, notice, cloud, api, mode, pendingEmail,
    isSignedIn: user !== null,
    displayName,
    signIn, signUp, signInDemo, signOut, resetPassword,
    register, verifyEmail, resendOtp,
    setPendingEmail,
    clearMessages: () => { setError(''); setNotice(''); },
  }), [user, loading, error, notice, cloud, api, mode, pendingEmail, displayName,
       signIn, signUp, signInDemo, signOut, resetPassword,
       register, verifyEmail, resendOtp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}
