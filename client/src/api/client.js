// In dev the Vite proxy forwards /api to the local server. In production the
// API lives on its own origin (Render), so the base URL comes from the build
// environment — VITE_API_URL=https://<service>.onrender.com
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const BASE = `${API_ORIGIN}/api`;

/** Error thrown for any non-2xx API response, carrying the server's code. */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path, { signal, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal,
      ...options,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Is it running?');
  }

  const body = await parse(response);

  if (!response.ok) {
    const error = body?.error ?? {};
    throw new ApiError(
      response.status,
      error.code ?? 'UNKNOWN',
      error.message ?? `Request failed with status ${response.status}.`,
      error.details,
    );
  }

  return body;
}

/** Turns a filter object into a query string, dropping empty values. */
export function toQueryString(params) {
  if (params instanceof URLSearchParams) return params.toString();

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value == null || value === '' || value === false) continue;
    if (value === true) {
      search.set(key, 'true');
      continue;
    }
    if (Array.isArray(value)) {
      if (!value.length) continue;
      search.set(key, value.join(','));
      continue;
    }
    search.set(key, String(value));
  }
  return search.toString();
}

const withQuery = (path, params) => {
  const query = toQueryString(params);
  return query ? `${path}?${query}` : path;
};

export const api = {
  meta: (options) => request('/meta', options),
  colleges: (params, options) => request(withQuery('/colleges', params), options),
  facets: (params, options) => request(withQuery('/colleges/facets', params), options),
  suggest: (q, options) => request(withQuery('/colleges/suggest', { q }), options),
  slugs: (options) => request('/colleges/slugs', options),
  college: (slug, options) => request(`/colleges/${encodeURIComponent(slug)}`, options),
  compare: (slugs, options) => request(withQuery('/compare', { slugs }), options),
  exams: (params, options) => request(withQuery('/exams', params), options),
  exam: (slug, options) => request(`/exams/${encodeURIComponent(slug)}`, options),
  rankings: (params, options) => request(withQuery('/rankings', params), options),
  rankingCourses: (options) => request('/rankings/courses', options),

  // Auth + shortlist (used once the server-synced shortlist is in play).
  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  login: (payload) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: (options) => request('/auth/me', options),
  shortlist: (options) => request('/shortlist', options),
  addToShortlist: (slug) =>
    request('/shortlist', { method: 'POST', body: JSON.stringify({ slug }), headers: { 'Content-Type': 'application/json' } }),
  removeFromShortlist: (slug) => request(`/shortlist/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
};

export default api;
