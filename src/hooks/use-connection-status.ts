"use client";

import { useState, useEffect } from "react";
import {
  onConnectionStateChange,
  reconnectPusher,
} from "@/lib/pusher/client";

type ConnectionState = "connected" | "connecting" | "disconnected" | "failed";

interface UseConnectionStatusReturn {
  state: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  hasFailed: boolean;
  reconnect: () => void;
}

export function useConnectionStatus(): UseConnectionStatusReturn {
  const [state, setState] = useState<ConnectionState>("disconnected");

  useEffect(() => {
    const unsubscribe = onConnectionStateChange(setState);
    return unsubscribe;
  }, []);

  return {
    state,
    isConnected: state === "connected",
    isReconnecting: state === "connecting",
    hasFailed: state === "failed",
    reconnect: reconnectPusher,
  };
}
