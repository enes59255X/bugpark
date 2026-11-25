/**
 * Yerel tercih ve ilerleme kaydı. Bozuk/erişilemeyen depolamada sessizce
 * devre dışı kalır; oyun kayıt özelliğine bağımlı değildir.
 */
import { progressSnapshot } from './game.js';

const PROGRESS_KEY = 'bugpark.progress.v1';
const PREFS_KEY = 'bugpark.prefs.v1';

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadProgress() {
  const data = read(PROGRESS_KEY);
  if (!data || data.version !== 1 || !Array.isArray(data.completed)) return null;
  return data;
}

export function saveProgress(state) {
  if (state.phase === 'loading' || state.phase === 'error' || state.levels.length === 0) return false;
  return write(PROGRESS_KEY, { version: 1, ...progressSnapshot(state) });
}

export function clearProgress() {
  try {
    window.localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* yoksay */
  }
}

export function loadPrefs() {
  const data = read(PREFS_KEY);
  return {
    theme: data && data.theme === 'dark' ? 'dark' : 'light',
    sound: Boolean(data && data.sound),
    mode: data && data.mode === 'free' ? 'free' : 'guided',
  };
}

export function savePrefs(prefs) {
  write(PREFS_KEY, {
    version: 1,
    theme: prefs.theme,
    sound: prefs.sound,
    mode: prefs.mode === 'free' ? 'free' : 'guided',
  });
}
