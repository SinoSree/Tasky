// ---------------------------------------------------------------------------
// authConfig.js — where the authentication backend lives.
//
// THIS IS THE ONLY FILE YOU EDIT to switch the app between its three modes:
//
//   API mode   the page is being served BY the Express backend
//   cloud mode supabaseConfig.js is filled in
//   demo mode  neither — no password, saved in this browser only
//
// No secret belongs here. This file ships to the browser, where anyone can
// read it. Passwords, database details and mail credentials all stay in
// server/.env, on the server.
// ---------------------------------------------------------------------------

// Origins where the Express backend serves this page itself.
//
// The backend serves index.html as well as /api, so on these origins the
// page and the API are the SAME origin. That matters: the login lives in a
// cookie, and a cookie shared between two different sites is a third-party
// cookie — blocked outright by Safari, isolated by Firefox, being phased
// out by Chrome. Same origin keeps it first-party, so it works everywhere.
//
// Add your deployed backend's address here after deploying it.
export const API_ORIGINS = [
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  // 'https://your-app.onrender.com',
];

// Requests go to a relative path, so they always reach whichever server
// sent the page. Nothing to update here when the address changes.
export const API_BASE_URL = '';

/**
 * API mode is on only when this page came from a server that also answers
 * /api. Anywhere else — GitHub Pages, a file:// copy — there is no backend
 * to reach, so the app falls back rather than showing a sign-in screen
 * nobody could get past.
 */
export const isApiConfigured = () => {
  if (typeof window === 'undefined') return false;
  return API_ORIGINS.includes(window.location.origin);
};

// Builds a URL for an endpoint: apiUrl('/api/auth/login')
export const apiUrl = (path) => `${API_BASE_URL.replace(/\/$/, '')}${path}`;
