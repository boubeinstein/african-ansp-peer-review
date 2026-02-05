"use client";

import { useEffect, useRef } from "react";

interface SessionTrackerProps {
  loginSessionId?: string | null;
}

export function SessionTracker({ loginSessionId }: SessionTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (loginSessionId && !tracked.current) {
      tracked.current = true;
      fetch("/api/auth/track-session", { method: "POST" }).catch(() => {});
    }
  }, [loginSessionId]);

  return null;
}
