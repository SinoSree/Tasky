// ---------------------------------------------------------------------------
// useLocalStorage.js  — a custom React hook.
//
// A "hook" is just a function starting with `use` that can call other hooks.
// This one is a drop-in replacement for useState that ALSO saves to
// localStorage, so the value survives a page refresh.
//
//   const [tasks, setTasks] = useLocalStorage('tm.tasks.v1', []);
//
// Like useState, `initialValue` may be a FUNCTION. That form is useful when
// building the default is expensive (e.g. generating sample tasks) because
// the function only runs when there is nothing saved yet.
// ---------------------------------------------------------------------------
import { useState, useEffect, useRef } from 'react';
import { loadJSON, saveJSON } from '../lib/storage.js';

export function useLocalStorage(key, initialValue) {
  // The function form of useState runs ONLY on the first render, so we don't
  // re-read localStorage on every single render.
  const [value, setValue] = useState(() => {
    // Unwrap a lazy initializer. Without this, passing `seedTasks` would
    // store the FUNCTION itself as the state, and `tasks.filter(...)` would
    // blow up with "tasks.filter is not a function".
    const fallback = typeof initialValue === 'function' ? initialValue() : initialValue;
    return loadJSON(key, fallback);
  });

  // Skip the very first save: we just loaded this value, writing it back
  // immediately would be pointless work.
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    saveJSON(key, value);
  }, [key, value]);

  return [value, setValue];
}
