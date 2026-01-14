import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/trpc/routers/_app";

/**
 * tRPC React hooks client
 * Use this in React components to call tRPC procedures
 *
 * @example
 * ```tsx
 * const { data, isLoading } = trpc.questionnaire.list.useQuery({
 *   type: "ANS_USOAP_CMA",
 *   page: 1,
 *   limit: 10,
 * });
 * ```
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Helper to get the tRPC API URL
 */
export function getBaseUrl() {
  if (typeof window !== "undefined") {
    // Browser should use relative URL
    return "";
  }

  // SSR should use absolute URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Assume localhost in development
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Get the full tRPC API URL
 */
export function getTRPCUrl() {
  return `${getBaseUrl()}/api/trpc`;
}
