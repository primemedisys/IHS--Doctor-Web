import { QueryClient, isServer } from "@tanstack/react-query";

/**
 * QueryClient factory + browser singleton (Next.js App Router pattern):
 * a fresh client per server request, one shared client in the browser.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 30s, not 60s: the other side of a consultation is a DIFFERENT browser
        // (a patient books, a doctor prescribes), so this app can't know its
        // cache went stale. A short window keeps a tab switch honest without
        // making every navigation refetch.
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
          const e = error as { status?: number; response?: { status?: number } };
          const status = e?.response?.status ?? e?.status;
          // 429: retrying only refills the rate-limit bucket that refused us.
          if (status && [401, 403, 404, 429].includes(status)) return false;
          return failureCount < 2;
        },
        // ON, deliberately. This was `false`, which is why a doctor had to
        // hard-reload to see a new booking and a patient had to reload to see a
        // finished prescription: nothing this app did could invalidate a cache
        // the OTHER app's action made stale. Coming back to the tab is the
        // moment a user expects to see current data.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
