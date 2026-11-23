// ---------------------------------------------------------------------------
// apiClient.js — one place that talks to the backend.
//
// WHY WRAP `fetch` AT ALL?
// Three things must be right on every single call, and forgetting any one of
// them causes a confusing bug:
//
//   1. credentials: 'include'  — without it the browser does not send the
//      login cookie, and every protected request fails as "not signed in"
//   2. Content-Type: application/json — without it Express cannot read the body
//   3. turning a failed response into a usable error rather than a crash
//
// Doing it once here means no screen has to remember.
// ---------------------------------------------------------------------------
import { apiUrl } from './authConfig.js';

/**
 * Always resolves — it never throws.
 *
 * Returns { ok, status, data, error, fieldErrors }:
 *   ok           did the request succeed?
 *   data         the parsed JSON body
 *   error        a sentence safe to show the user
 *   fieldErrors  { email: '…', password: '…' } for forms, when present
 *
 * Returning errors instead of throwing means callers use plain `if`
 * statements rather than wrapping every call in try/catch.
 */
export async function apiRequest(path, { method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(apiUrl(path), {
      method,
      // Send and accept cookies, including across origins. This is the line
      // that makes the httpOnly login cookie work.
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only rejects when the request never completed: server down,
    // wrong port, no network, or blocked by CORS.
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Cannot reach the server. Is it running? (cd server && npm start)',
      fieldErrors: null,
      offline: true,
    };
  }

  // A 500 that returns an HTML error page would break JSON parsing, so this
  // is guarded too.
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.ok === false) {
    return {
      ok: false,
      status: response.status,
      data,
      error: data?.error || `Request failed (${response.status}).`,
      fieldErrors: data?.fieldErrors || null,
      reason: data?.reason,
      retryAfterSeconds: data?.retryAfterSeconds,
    };
  }

  return { ok: true, status: response.status, data, error: null, fieldErrors: null };
}

export const apiGet = (path) => apiRequest(path);
export const apiPost = (path, body) => apiRequest(path, { method: 'POST', body });
