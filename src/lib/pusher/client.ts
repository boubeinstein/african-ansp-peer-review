"use client";

import PusherClient from "pusher-js";

let pusherClient: PusherClient | null = null;
let connectionState: "connected" | "connecting" | "disconnected" | "failed" =
  "disconnected";
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

type ConnectionStateCallback = (state: typeof connectionState) => void;
const stateCallbacks: Set<ConnectionStateCallback> = new Set();

export function getPusherClient(): PusherClient {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
      authTransport: "ajax",
      // Enable auto-reconnect
      activityTimeout: 60000,
      pongTimeout: 30000,
    });

    // Connection state handlers
    pusherClient.connection.bind(
      "state_change",
      (states: { current: string; previous: string }) => {
        console.log(`[Pusher] State: ${states.previous} -> ${states.current}`);

        switch (states.current) {
          case "connected":
            connectionState = "connected";
            reconnectAttempts = 0;
            break;
          case "connecting":
            connectionState = "connecting";
            break;
          case "disconnected":
            connectionState = "disconnected";
            handleDisconnect();
            break;
          case "failed":
            connectionState = "failed";
            break;
          case "unavailable":
            connectionState = "disconnected";
            handleDisconnect();
            break;
        }

        notifyStateChange();
      }
    );

    pusherClient.connection.bind("error", (error: unknown) => {
      console.error("[Pusher] Connection error:", error);
    });
  }

  return pusherClient;
}

function handleDisconnect() {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(
      `[Pusher] Reconnecting... attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`
    );

    setTimeout(() => {
      if (pusherClient && connectionState === "disconnected") {
        pusherClient.connect();
      }
    }, RECONNECT_DELAY * reconnectAttempts);
  } else {
    console.error("[Pusher] Max reconnection attempts reached");
    connectionState = "failed";
    notifyStateChange();
  }
}

function notifyStateChange() {
  stateCallbacks.forEach((callback) => callback(connectionState));
}

export function onConnectionStateChange(
  callback: ConnectionStateCallback
): () => void {
  stateCallbacks.add(callback);
  // Immediately notify current state
  callback(connectionState);
  return () => stateCallbacks.delete(callback);
}

export function getConnectionState(): typeof connectionState {
  return connectionState;
}

export function disconnectPusher(): void {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
    connectionState = "disconnected";
    reconnectAttempts = 0;
  }
}

export function reconnectPusher(): void {
  reconnectAttempts = 0;
  if (pusherClient) {
    pusherClient.connect();
  } else {
    getPusherClient();
  }
}
