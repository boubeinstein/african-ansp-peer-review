"use client";

import { useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

const VALIDATION_INTERVAL_MS = 15_000; // 15 seconds
const FOCUS_CHECK_DELAY_MS = 500; // Debounce focus checks

interface SessionTrackerProps {
  loginSessionId?: string | null;
}

export function SessionTracker({ loginSessionId }: SessionTrackerProps) {
  const tracked = useRef(false);
  const isValidating = useRef(false);
  const isSigningOut = useRef(false);

  // Track session on mount (existing behavior)
  useEffect(() => {
    if (loginSessionId && !tracked.current) {
      tracked.current = true;
      fetch("/api/auth/track-session", { method: "POST" }).catch(() => {});
    }
  }, [loginSessionId]);

  const handleSessionExpired = useCallback(() => {
    if (isSigningOut.current) return;
    isSigningOut.current = true;

    console.log("[SessionTracker] Session invalid — signing out");
    toast.error("Session Expired", {
      description: "Your session has expired. Redirecting to login...",
      duration: 3000,
    });

    // Small delay so the toast is visible before redirect
    setTimeout(() => {
      signOut({ callbackUrl: "/login?error=SessionExpired" });
    }, 1000);
  }, []);

  const validate = useCallback(async () => {
    if (!loginSessionId || isValidating.current || isSigningOut.current) return;
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
        handleSessionExpired();
      }
    } catch {
      // Fail open on network errors — don't sign out
    } finally {
      isValidating.current = false;
    }
  }, [loginSessionId, handleSessionExpired]);

  // Poll session validity on interval
  useEffect(() => {
    if (!loginSessionId) return;

    const interval = setInterval(validate, VALIDATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loginSessionId, validate]);

  // Check session when window regains focus (user returns to tab)
  useEffect(() => {
    if (!loginSessionId) return;

    const handleFocus = () => {
      setTimeout(validate, FOCUS_CHECK_DELAY_MS);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loginSessionId, validate]);

  // Check session when tab becomes visible
  useEffect(() => {
    if (!loginSessionId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setTimeout(validate, FOCUS_CHECK_DELAY_MS);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loginSessionId, validate]);

  return null;
}
