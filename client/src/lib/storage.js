/**
 * localStorage helpers.
 *
 * Every access is wrapped: storage throws in private windows and when the user
 * has blocked site data, and a shortlist is not worth crashing a page over.
 * When it is unavailable the app still works, it just forgets between reloads.
 */

const PREFIX = 'gradego:';

export function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* nothing we can do, and nothing worth telling the user about */
  }
}

export const STORAGE_KEYS = {
  shortlist: 'shortlist',
  compare: 'compare',
  recentSearches: 'recent-searches',
};
