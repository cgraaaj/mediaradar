import axios from 'axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

/**
 * Build a URLSearchParams object, skipping keys whose value is null / undefined
 * / empty string / the sentinel 'all'. Keeps query keys stable (same input =>
 * same string => same cache key in TanStack Query).
 */
function buildParams(obj) {
  const p = new URLSearchParams();
  Object.keys(obj).sort().forEach((k) => {
    const v = obj[k];
    if (v === null || v === undefined || v === '' || v === 'all') return;
    p.set(k, String(v));
  });
  return p;
}

async function get(path, params) {
  const qs = params ? buildParams(params).toString() : '';
  const url = qs ? `${API_BASE_URL}${path}?${qs}` : `${API_BASE_URL}${path}`;
  const res = await axios.get(url);
  return res.data;
}

/*
 * Query-key conventions
 * ---------------------
 * [resource, scope, params]
 *   resource: 'movies' | 'tvshows'
 *   scope:    'list' | 'search'
 *   params:   normalised object (nulls stripped). Putting params at the tail
 *             gives us cheap prefix-based invalidation, e.g.
 *             queryClient.invalidateQueries({ queryKey: ['movies'] })
 *             wipes all movie surfaces at once.
 */

/** Movies grid (paginated). Tier dropdown drives hot/cold/warm routing. */
export function useMoviesQuery({ page, limit = 20, language, source, tier, enabled = true }) {
  const params = { page, limit, language, source, tier };
  return useQuery({
    queryKey: ['movies', 'list', params],
    queryFn: () => get('/movies', params),
    enabled,
    // Keep previous page data visible during the next page's fetch.
    placeholderData: keepPreviousData,
  });
}

/** TV shows grid (paginated). */
export function useTvShowsQuery({ page, limit = 20, source, tier, enabled = true }) {
  const params = { page, limit, source, tier };
  return useQuery({
    queryKey: ['tvshows', 'list', params],
    queryFn: () => get('/tvshows', params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
