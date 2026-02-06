"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const VALIDATION_INTERVAL_MS = 15_000; // 15 seconds

interface SessionTrackerProps {
  loginSessionId?: string | null;
}

export function SessionTracker({ loginSessionId }: SessionTrackerProps) {
  const tracked = useRef(false);
  const isValidating = useRef(false);

  // Track session on mount (existing behavior)
  useEffect(() => {
    if (loginSessionId && !tracked.current) {
      tracked.current = true;
      fetch("/api/auth/track-session", { method: "POST" }).catch(() => {});
    }
  }, [loginSessionId]);

  // Poll session validity — sign out if revoked
  useEffect(() => {
    if (!loginSessionId) return;

    const validate = async () => {
      if (isValidating.current) return;
      isValidating.current = true;

      try {
        const res = await fetch("/api/auth/validate-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: loginSessionId }),
        });

        if (!res.ok) return; // Fail open on server errors

        const { valid } = (await res.json()) as { valid: boolean };

        if (!valid) {
          console.log("[SessionTracker] Session revoked — signing out");
          signOut({ callbackUrl: "/login?error=SessionRevoked" });
        }
      } catch {
        // Fail open on network errors — don't sign out
      } finally {
        isValidating.current = false;
      }
    };

    const interval = setInterval(validate, VALIDATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loginSessionId]);

  return null;
}
