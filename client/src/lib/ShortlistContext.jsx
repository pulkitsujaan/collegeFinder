import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readJson, writeJson, STORAGE_KEYS } from './storage.js';

const ShortlistContext = createContext(null);

const pick = (college) => ({
  slug: college.slug,
  name: college.name,
  shortName: college.shortName ?? college.name,
  city: college.city,
  brandHue: college.brandHue ?? 20,
  rating: college.rating ?? null,
});

/**
 * The shortlist. localStorage is the source of truth for the prototype; when a
 * user is signed in the same shape is mirrored to the server (see AuthProvider).
 */
export function ShortlistProvider({ children }) {
  const [items, setItems] = useState(() => readJson(STORAGE_KEYS.shortlist, []));

  useEffect(() => {
    writeJson(STORAGE_KEYS.shortlist, items);
  }, [items]);

  const has = useCallback((slug) => items.some((item) => item.slug === slug), [items]);

  const add = useCallback((college) => {
    setItems((current) =>
      current.some((item) => item.slug === college.slug) ? current : [...current, pick(college)],
    );
  }, []);

  const remove = useCallback((slug) => {
    setItems((current) => current.filter((item) => item.slug !== slug));
  }, []);

  const toggle = useCallback(
    (college) => {
      let added = false;
      setItems((current) => {
        if (current.some((item) => item.slug === college.slug)) {
          return current.filter((item) => item.slug !== college.slug);
        }
        added = true;
        return [...current, pick(college)];
      });
      return added;
    },
    [],
  );

  const clear = useCallback(() => setItems([]), []);

  const replaceAll = useCallback((next) => setItems(next.map(pick)), []);

  const value = useMemo(
    () => ({ items, count: items.length, has, add, remove, toggle, clear, replaceAll }),
    [items, has, add, remove, toggle, clear, replaceAll],
  );

  return <ShortlistContext.Provider value={value}>{children}</ShortlistContext.Provider>;
}

export function useShortlist() {
  const context = useContext(ShortlistContext);
  if (!context) throw new Error('useShortlist must be used inside a ShortlistProvider.');
  return context;
}

export default ShortlistProvider;
