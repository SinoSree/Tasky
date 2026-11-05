// ---------------------------------------------------------------------------
// AuthContext.jsx
//
// Handles "who is signed in". It has two modes and hides the difference from
// the rest of the app:
//
//   DEMO MODE  (supabaseConfig.js is empty)
//     A fake local sign-in. Pick a display name, everything saves to this
//     browser. No password, no security — it just lets the app work.
//
//   CLOUD MODE (supabaseConfig.js is filled in)
//     Real Supabase accounts: email + password, email confirmation,
//     password reset, and data synced across devices.
//
// Every component just calls useAuth() and reads { user, signIn, signOut }.
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getSupabase, friendlyAuthError } from '../lib/supabaseClient.js';
import { isCloudConfigured } from '../lib/supabaseConfig.js';
import { loadJSON, saveJSON } from '../lib/storage.js';

const AuthContext = createContext(null);
const DEMO_USER_KEY = 'tm.demoUser.v1';

export function AuthProvider({ children }) {
  const cloud = isCloudConfigured();

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);   // true until we know
  const [error, setError]     = useState('');
  const [notice, setNotice]   = useState('');     // e.g. "check your email"

  // --- work out who is signed in, once, on startup ------------------------
  useEffect(() => {
    let cancelled = false;

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
  }, [cloud]);

  // --- actions ------------------------------------------------------------

  const signIn = useCallback(async (email, password) => {
    setError(''); setNotice('');
    const supabase = getSupabase();
    if (!supabase) { setError('Cloud mode is not configured.'); return false; }

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    if (err) { setError(friendlyAuthError(err)); return false; }
    setUser(data.user);
    return true;
  }, []);

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
    if (cloud) {
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
    } else {
      saveJSON(DEMO_USER_KEY, null);
    }
    setUser(null);
  }, [cloud]);

  // A display name that always returns something sensible.
  const displayName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'User';

  const value = useMemo(() => ({
    user, loading, error, notice, cloud,
    isSignedIn: user !== null,
    displayName,
    signIn, signUp, signInDemo, signOut, resetPassword,
    clearMessages: () => { setError(''); setNotice(''); },
  }), [user, loading, error, notice, cloud, displayName,
       signIn, signUp, signInDemo, signOut, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}
