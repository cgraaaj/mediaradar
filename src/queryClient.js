import { QueryClient } from '@tanstack/react-query';

/**
 * Single shared QueryClient for the whole app.
 *
 * Defaults:
 *   - staleTime 30s  — matches the backend's `:hot` max-age (so page flips
 *     inside that window don't re-hit the server at all).
 *   - gcTime (formerly cacheTime) 5min — unused queries linger a while so
 *     tab switches reuse their cache.
 *   - refetchOnWindowFocus: true — cheap UX win; the backend already
 *     supports 304s via ETag so a focus-refresh on a stable response is
 *     essentially free.
 *   - retry: 1 — media endpoints are idempotent, one retry handles most
 *     transient blips without adding visible latency.
 *   - placeholderData: previousData is set per-query (where relevant).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
