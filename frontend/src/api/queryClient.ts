import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./client";

/** Retry only when a retry can help: network failures and 5xx, never 4xx, at most twice. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (isApiError(error)) {
    if (error.isNetworkError) return true;
    return error.status >= 500 && error.status !== 503 && error.status !== 502;
  }
  return false;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
