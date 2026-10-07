import { useQuery, keepPreviousData } from '@tanstack/react-query';

import api from './client.js';

/**
 * Server state lives here and only here — components never fetch in useEffect.
 * Filter state lives in the URL; these hooks just forward the current params.
 */

/** Filters key derived from the URL so the cache keys line up with back/forward. */
const keyOf = (params) =>
  params instanceof URLSearchParams ? params.toString() : JSON.stringify(params ?? {});

export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: ({ signal }) => api.meta({ signal }),
    staleTime: 30 * 60 * 1000,
  });
}

export function useColleges(params) {
  return useQuery({
    queryKey: ['colleges', keyOf(params)],
    queryFn: ({ signal }) => api.colleges(params, { signal }),
    // Keeps the previous page on screen while the next one loads, so paging
    // and filter changes never flash an empty list.
    placeholderData: keepPreviousData,
  });
}

export function useFacets(params) {
  return useQuery({
    queryKey: ['facets', keyOf(params)],
    queryFn: ({ signal }) => api.facets(params, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSuggest(q) {
  const term = q.trim();
  return useQuery({
    queryKey: ['suggest', term],
    queryFn: ({ signal }) => api.suggest(term, { signal }),
    enabled: term.length >= 2,
    staleTime: 60 * 1000,
  });
}

export function useCollege(slug) {
  return useQuery({
    queryKey: ['college', slug],
    queryFn: ({ signal }) => api.college(slug, { signal }),
    enabled: Boolean(slug),
  });
}

/**
 * Named `useCompareData` rather than `useCompare` because the compare *tray*
 * already owns that name in the UI layer, and two hooks with one name is a
 * bug waiting to happen.
 */
export function useCompareData(slugs) {
  return useQuery({
    queryKey: ['compare', slugs.join(',')],
    queryFn: ({ signal }) => api.compare(slugs, { signal }),
    enabled: slugs.length > 0,
  });
}

export function useExams(params) {
  return useQuery({
    queryKey: ['exams', keyOf(params)],
    queryFn: ({ signal }) => api.exams(params, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useExam(slug) {
  return useQuery({
    queryKey: ['exam', slug],
    queryFn: ({ signal }) => api.exam(slug, { signal }),
    enabled: Boolean(slug),
  });
}

export function useRankings(course) {
  return useQuery({
    queryKey: ['rankings', course],
    queryFn: ({ signal }) => api.rankings({ course }, { signal }),
    enabled: Boolean(course),
  });
}

export function useRankingCourses() {
  return useQuery({
    queryKey: ['ranking-courses'],
    queryFn: ({ signal }) => api.rankingCourses({ signal }),
    staleTime: 30 * 60 * 1000,
  });
}
