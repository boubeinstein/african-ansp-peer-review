import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

/**
 * Context available to all tRPC procedures
 */
export interface Context {
  session: Session | null;
  db: typeof db;
  headers: Headers;
}

/**
 * Creates context for each tRPC request
 * This is called for each incoming request
 */
export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  const session = await auth();

  return {
    session,
    db,
    headers: opts.req.headers,
  };
}

/**
 * Create context for server-side calls (without HTTP request)
 */
export async function createServerContext(): Promise<Context> {
  const session = await auth();

  return {
    session,
    db,
    headers: new Headers(),
  };
}
