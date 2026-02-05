import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// In-memory cache to reduce DB hits (30s TTL — short enough for timely revocation)
const sessionValidationCache = new Map<string, { valid: boolean; checkedAt: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

async function validateSessionViaApi(
  sessionId: string,
  request: NextRequest,
): Promise<boolean> {
  const now = Date.now();
  const cached = sessionValidationCache.get(sessionId);
  if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
    return cached.valid;
  }

  try {
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/auth/validate-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const { valid } = (await response.json()) as { valid: boolean };
    sessionValidationCache.set(sessionId, { valid, checkedAt: now });

    // Prune stale entries periodically
    if (sessionValidationCache.size > 1000) {
      for (const [key, entry] of sessionValidationCache) {
        if (now - entry.checkedAt > CACHE_TTL_MS) {
          sessionValidationCache.delete(key);
        }
      }
    }

    return valid;
  } catch {
    // On error, allow through (don't lock users out due to transient issues)
    return true;
  }
}

export default async function middleware(request: NextRequest) {
  // Only validate sessions on protected (non-auth, non-api) pages
  const pathname = request.nextUrl.pathname;
  const isProtectedPage =
    !pathname.includes("/login") &&
    !pathname.includes("/api/") &&
    !pathname.includes("/_next/");

  if (isProtectedPage) {
    try {
      const token = await getToken({ req: request });
      const loginSessionId = token?.loginSessionId as string | undefined;

      if (loginSessionId) {
        const isValid = await validateSessionViaApi(loginSessionId, request);
        if (!isValid) {
          // Session was revoked — clear cache entry and redirect to login
          sessionValidationCache.delete(loginSessionId);
          const locale = pathname.split("/")[1] || "en";
          const loginUrl = new URL(`/${locale}/login`, request.url);
          loginUrl.searchParams.set("error", "SessionRevoked");
          return NextResponse.redirect(loginUrl);
        }
      }
    } catch {
      // Don't block users due to middleware errors
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
