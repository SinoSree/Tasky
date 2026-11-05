// ---------------------------------------------------------------------------
// supabaseConfig.js
//
// ⚠️  THIS IS THE ONLY FILE YOU NEED TO EDIT TO TURN ON REAL ACCOUNTS.
//
// While these two values are empty the app runs in DEMO MODE: it works
// exactly as before, saving to this browser only, with a fake local sign-in.
// Fill them in and the app switches to real accounts with cloud sync.
//
// Where to get them:
//   1. Create a free project at https://supabase.com
//   2. Project Settings → API
//   3. Copy "Project URL" and the "anon / public" key below
//   4. Run supabase/schema.sql in the Supabase SQL editor
//
// Is it safe to commit the anon key to a public repo?
//   Yes. The anon key is designed to be public and ships inside every
//   browser app. It grants NO access on its own — the Row Level Security
//   policies in schema.sql are what actually protect your data, and they
//   restrict every row to the user who owns it.
//   NEVER put the "service_role" key here. That one bypasses all security.
// ---------------------------------------------------------------------------

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// True only when both values above are filled in.
export const isCloudConfigured = () =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
