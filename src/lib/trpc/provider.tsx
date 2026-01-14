"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import superjson from "superjson";
import { trpc, getTRPCUrl } from "./client";

/**
 * Create a stable QueryClient instance
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we don't want to refetch immediately on client
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && error.message.includes("UNAUTHORIZED")) {
            return false;
          }
          if (error instanceof Error && error.message.includes("FORBIDDEN")) {
            return false;
          }
          if (error instanceof Error && error.message.includes("NOT_FOUND")) {
            return false;
          }
          return failureCount < 3;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new QueryClient
    return makeQueryClient();
  }
  // Browser: use singleton pattern to keep the same client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

interface TRPCProviderProps {
  children: React.ReactNode;
}

/**
 * tRPC Provider component
 * Wraps the app with tRPC and React Query providers
 *
 * @example
 * ```tsx
 * // In your root layout
 * <TRPCProvider>
 *   {children}
 * </TRPCProvider>
 * ```
 */
export function TRPCProvider({ children }: TRPCProviderProps) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        // Logger link for development
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        // HTTP batch link for efficient request batching
        httpBatchLink({
          url: getTRPCUrl(),
          transformer: superjson,
          headers() {
            return {
              "x-trpc-source": "react",
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
