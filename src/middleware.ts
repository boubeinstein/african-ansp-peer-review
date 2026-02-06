import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Cache only INVALID sessions — valid sessions are always re-checked to ensure
// revocations take effect immediately. Once invalid, a session never becomes valid again.
const invalidSessionCache = new Set<string>();

async function isSessionValid(
  sessionId: string,
  baseUrl: string,
): Promise<boolean> {
  // Fast path: already known to be invalid
  if (invalidSessionCache.has(sessionId)) {
    return false;
  }

  try {
    const response = await fetch(`${baseUrl}/api/auth/validate-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      console.error("[Middleware] Validation API returned status:", response.status);
      return true; // Fail open
    }

    const { valid } = (await response.json()) as { valid: boolean };

    if (!valid) {
      invalidSessionCache.add(sessionId);
      // Prune if cache grows too large (keep most recent entries)
      if (invalidSessionCache.size > 1000) {
        const entries = [...invalidSessionCache];
        for (const id of entries.slice(0, 500)) {
          invalidSessionCache.delete(id);
        }
      }
    }

    return valid;
  } catch (error) {
    console.error("[Middleware] Validation fetch failed:", error);
    return true; // Fail open
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only validate sessions on protected pages (not login/register/api/_next)
  const isProtectedPage =
    !pathname.includes("/login") &&
    !pathname.includes("/register") &&
    !pathname.includes("/api/") &&
    !pathname.includes("/_next/");

  if (isProtectedPage) {
    try {
      // Use getToken() with explicit secret — Edge Runtime compatible (no db imports)
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
      const token = secret
        ? await getToken({ req: request, secret })
        : null;

      const loginSessionId = token?.loginSessionId as string | undefined;

      if (loginSessionId) {
        const baseUrl = request.nextUrl.origin;
        const isValid = await isSessionValid(loginSessionId, baseUrl);

        console.log("[Middleware]", pathname, "| loginSessionId:", loginSessionId, "| valid:", isValid);

        if (!isValid) {
          invalidSessionCache.add(loginSessionId);
          console.log("[Middleware] BLOCKING — session revoked, redirecting to login");
          const locale = pathname.split("/")[1] || "en";
          const loginUrl = new URL(`/${locale}/login`, request.url);
          loginUrl.searchParams.set("error", "SessionRevoked");
          return NextResponse.redirect(loginUrl);
        }
      } else if (token && !loginSessionId) {
        console.warn("[Middleware]", pathname, "| WARNING: No loginSessionId in token");
      }
    } catch (error) {
      console.error("[Middleware] Session validation error:", error);
    }
  }

  // Pass all non-blocked requests to next-intl middleware for locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
