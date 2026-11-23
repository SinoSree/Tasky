// ---------------------------------------------------------------------------
// authConfig.js — where the authentication backend lives.
//
// THIS IS THE ONLY FILE YOU EDIT to switch the app between its three modes.
//
//   API_BASE_URL = 'http://localhost:4000'   → your own Express backend
//   API_BASE_URL = ''  and supabase filled   → Supabase
//   API_BASE_URL = ''  and supabase empty    → demo mode (no password)
//
// Leave it empty and nothing about the app changes: the Supabase and demo
// paths you already had keep working exactly as before.
//
// No secret belongs here. This file ships to the browser, where anyone can
// read it. It holds an address, nothing more — passwords, database details
// and mail credentials all stay in server/.env on the server.
// ---------------------------------------------------------------------------

export const API_BASE_URL = 'http://localhost:4000';

// A localhost address only works on this machine. If the very same bundle is
// opened from GitHub Pages, calls to it would fail and the site would show a
// sign-in screen nobody could get past — so API mode switches itself off
// there and the app falls back to Supabase or demo mode.
//
// When you deploy the backend for real, put its public https address above
// and this guard steps aside by itself.
const isLocalAddress = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);

const pageIsLocal =
  typeof window === 'undefined' ||
  ['localhost', '127.0.0.1', '[::1]', ''].includes(window.location.hostname);

export const isApiConfigured = () =>
  Boolean(API_BASE_URL) && (!isLocalAddress(API_BASE_URL) || pageIsLocal);

// Builds a full URL for an endpoint: apiUrl('/api/auth/login')
export const apiUrl = (path) => `${API_BASE_URL.replace(/\/$/, '')}${path}`;
