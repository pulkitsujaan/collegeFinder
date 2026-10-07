import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readJson, writeJson, STORAGE_KEYS } from './storage.js';

export const MAX_COMPARE = 3;

const CompareContext = createContext(null);

const pick = (college) => ({
  slug: college.slug,
  name: college.name,
  shortName: college.shortName ?? college.name,
  city: college.city,
  brandHue: college.brandHue ?? 20,
});

/**
 * The compare tray. Persists across pages (and reloads) so a student can open
 * a detail page, add it, and come back to the listing without losing the tray.
 */
export function CompareProvider({ children }) {
  const [items, setItems] = useState(() => readJson(STORAGE_KEYS.compare, []));
  const [fullNotice, setFullNotice] = useState(false);
  useEffect(() => {
    writeJson(STORAGE_KEYS.compare, items);
  }, [items]);

  const has = useCallback((slug) => items.some((item) => item.slug === slug), [items]);

  const add = useCallback((college) => {
    let result = 'added';
    setItems((current) => {
      if (current.some((item) => item.slug === college.slug)) {
        result = 'already';
        return current;
      }
      if (current.length >= MAX_COMPARE) {
        result = 'full';
        return current;
      }
      return [...current, pick(college)];
    });
    if (result === 'full') setFullNotice(true);
    return result;
  }, []);

  const remove = useCallback((slug) => {
    setItems((current) => current.filter((item) => item.slug !== slug));
  }, []);

  const toggle = useCallback((college) => add(college), [add]);

  const clear = useCallback(() => setItems([]), []);

  /** Used when /compare is opened from a shared link and has to hydrate. */
  const replaceAll = useCallback((colleges) => setItems(colleges.slice(0, MAX_COMPARE).map(pick)), []);

  const dismissNotice = useCallback(() => setFullNotice(false), []);

  const value = useMemo(
    () => ({
      items,
      slugs: items.map((item) => item.slug),
      count: items.length,
      isFull: items.length >= MAX_COMPARE,
      max: MAX_COMPARE,
      fullNotice,
      dismissNotice,
      has,
      add,
      remove,
      toggle,
      clear,
      replaceAll,
    }),
    [items, fullNotice, dismissNotice, has, add, remove, toggle, clear, replaceAll],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) throw new Error('useCompare must be used inside a CompareProvider.');
  return context;
}

export default CompareProvider;
