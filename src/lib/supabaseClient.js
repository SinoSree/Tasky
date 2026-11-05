// ---------------------------------------------------------------------------
// supabaseClient.js
//
// Creates the one shared Supabase client used by the whole app.
//
// The Supabase library is loaded from a CDN <script> tag, which puts it on
// `window.supabase`. We use the CDN rather than an npm import so the app
// keeps working in the no-build single-file version too.
// ---------------------------------------------------------------------------
import { SUPABASE_URL, SUPABASE_ANON_KEY, isCloudConfigured } from './supabaseConfig.js';

let client = null;

export function getSupabase() {
  // Already built it once? Reuse it. Creating two clients would mean two
  // separate auth sessions fighting over the same browser storage.
  if (client) return client;

  if (!isCloudConfigured()) return null;          // demo mode

  const lib = typeof window !== 'undefined' ? window.supabase : null;
  if (!lib || typeof lib.createClient !== 'function') {
    console.warn(
      '[supabase] The Supabase script did not load. Check the <script> tag ' +
      'in index.html / dev.html, and your internet connection.'
    );
    return null;
  }

  client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,      // stay signed in across refreshes
      autoRefreshToken: true,    // renew the token before it expires
    },
  });
  return client;
}

// Turns Supabase's error objects into something worth showing a person.
export function friendlyAuthError(error) {
  if (!error) return '';
  const msg = (error.message || String(error)).toLowerCase();
  if (msg.includes('invalid login credentials')) return 'That email and password do not match an account.';
  if (msg.includes('email not confirmed'))       return 'Please confirm your email address first — check your inbox.';
  if (msg.includes('user already registered'))   return 'An account with that email already exists. Try signing in.';
  if (msg.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (msg.includes('unable to validate email'))  return 'That does not look like a valid email address.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (msg.includes('failed to fetch'))           return 'Could not reach the server. Check your connection.';
  return error.message || 'Something went wrong. Please try again.';
}
