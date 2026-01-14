// Client exports
export { trpc, getBaseUrl, getTRPCUrl } from "./client";
export { TRPCProvider } from "./provider";

// Re-export types from server
export type { AppRouter } from "@/server/trpc/routers/_app";
