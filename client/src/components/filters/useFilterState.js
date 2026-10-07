import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Filter state lives in the URL and nowhere else. That gives us shareable
 * links, working back/forward, and reload-safe state for free — and it means
 * the TanStack Query keys are derived from something the user can see.
 */

/** Repeated values, stored comma-separated in the query string. */
export const LIST_KEYS = ['course', 'stream', 'city', 'state', 'ownership', 'exam'];

/** Single values. */
export const SCALAR_KEYS = [
  'q',
  'minRating',
  'minFees',
  'maxFees',
  'minPackage',
  'minHighestPackage',
  'placementVerified',
  'establishedMin',
  'establishedMax',
];

const DEFAULT_SORT = 'relevance';

/** URLSearchParams → a plain filter object every component can read. */
function parse(searchParams) {
  const filters = {};

  for (const key of LIST_KEYS) {
    const raw = searchParams.get(key);
    filters[key] = raw ? raw.split(',').filter(Boolean) : [];
  }

  for (const key of SCALAR_KEYS) {
    const raw = searchParams.get(key);
    if (raw != null && raw !== '') filters[key] = raw;
  }

  filters.sort = searchParams.get('sort') || DEFAULT_SORT;
  filters.page = Math.max(1, Number(searchParams.get('page')) || 1);

  return filters;
}

/** The inverse, with empty values dropped so URLs stay short and readable. */
export function buildParams(filters, { includePage = true } = {}) {
  const search = new URLSearchParams();

  for (const key of LIST_KEYS) {
    const value = filters[key];
    if (Array.isArray(value) && value.length) search.set(key, value.join(','));
  }

  for (const key of SCALAR_KEYS) {
    const value = filters[key];
    if (value != null && value !== '' && value !== false) search.set(key, String(value));
  }

  if (filters.sort && filters.sort !== DEFAULT_SORT) search.set('sort', filters.sort);
  if (includePage && filters.page > 1) search.set('page', String(filters.page));

  return search;
}

export function useFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parse(searchParams), [searchParams]);

  /** Every mutation goes through here, so paging always resets on a change. */
  const update = useCallback(
    (mutate, { keepPage = false } = {}) => {
      setSearchParams(
        (current) => {
          const next = parse(current);
          mutate(next);
          if (!keepPage) next.page = 1;
          return buildParams(next);
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setScalar = useCallback(
    (key, value) => update((next) => {
      if (value == null || value === '') delete next[key];
      else next[key] = value;
    }),
    [update],
  );

  /**
   * Several scalars in one go. A two-handle range slider would otherwise call
   * setScalar twice in the same tick, and the second call reads the same
   * not-yet-updated params as the first — so one of the two handles silently
   * loses its value.
   */
  const setScalars = useCallback(
    (entries) => update((next) => {
      for (const [key, value] of Object.entries(entries)) {
        if (value == null || value === '') delete next[key];
        else next[key] = value;
      }
    }),
    [update],
  );

  const toggleList = useCallback(
    (key, value) => update((next) => {
      const list = next[key] ?? [];
      next[key] = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
    }),
    [update],
  );

  const setList = useCallback(
    (key, values) => update((next) => {
      next[key] = values;
    }),
    [update],
  );

  const setPage = useCallback(
    (page) => update((next) => {
      next.page = page;
    }, { keepPage: true }),
    [update],
  );

  const clearAll = useCallback(() => {
    setSearchParams((current) => {
      const next = parse(current);
      const cleared = { sort: next.sort, page: 1 };
      for (const key of LIST_KEYS) cleared[key] = [];
      return buildParams(cleared);
    }, { replace: true });
  }, [setSearchParams]);

  /** How many filters are on, for the "Clear filters" affordance and mobile button. */
  const activeCount = useMemo(() => {
    let count = 0;
    for (const key of LIST_KEYS) count += filters[key].length;
    for (const key of SCALAR_KEYS) {
      if (key === 'placementVerified') {
        if (filters[key] === 'true') count += 1;
      } else if (filters[key] != null && filters[key] !== '') {
        count += 1;
      }
    }
    return count;
  }, [filters]);

  return {
    filters,
    activeCount,
    /** What we hand to the API: filters plus sort, but not the page. */
    facetParams: useMemo(() => buildParams({ ...filters, page: 1 }, { includePage: false }), [filters]),
    listParams: useMemo(() => buildParams(filters), [filters]),
    setScalar,
    setScalars,
    setList,
    toggleList,
    setPage,
    clearAll,
  };
}

export default useFilterState;
