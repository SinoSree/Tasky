// ---------------------------------------------------------------------------
// storage.js
// Thin wrapper around window.localStorage.
//
// Why wrap it? localStorage THROWS in some browsers (private mode, blocked
// cookies). If we called it directly all over the app, one throw would take
// the whole UI down. Here we catch it once and fall back to a default value.
// ---------------------------------------------------------------------------

export function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;      // nothing saved yet
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (err) {
    console.warn('[storage] could not read', key, err);
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('[storage] could not write', key, err);
    return false;                            // quota full or storage blocked
  }
}
