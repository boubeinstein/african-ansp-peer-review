import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherInstance;
}

// Channel naming conventions for AAPRP
export const CHANNELS = {
  // Review-specific channels
  review: (reviewId: string) => `private-review-${reviewId}`,
  reviewPresence: (reviewId: string) => `presence-review-${reviewId}`,

  // Finding collaboration
  finding: (findingId: string) => `private-finding-${findingId}`,

  // User notifications
  user: (userId: string) => `private-user-${userId}`,
} as const;

// Event types
export const EVENTS = {
  // Presence events
  MEMBER_JOINED: "member-joined",
  MEMBER_LEFT: "member-left",
  MEMBER_UPDATED: "member-updated",

  // Collaboration events
  CURSOR_MOVE: "cursor-move",
  SELECTION_CHANGE: "selection-change",
  CONTENT_CHANGE: "content-change",

  // Finding events
  FINDING_CREATED: "finding-created",
  FINDING_UPDATED: "finding-updated",
  FINDING_DELETED: "finding-deleted",

  // Comment events
  COMMENT_ADDED: "comment-added",
  COMMENT_EDITED: "comment-edited",
  COMMENT_DELETED: "comment-deleted",

  // Task events
  TASK_CREATED: "task-created",
  TASK_UPDATED: "task-updated",
  TASK_COMPLETED: "task-completed",

  // Session events
  SESSION_STARTED: "session-started",
  SESSION_ENDED: "session-ended",

  // Typing indicators
  TYPING_START: "typing-start",
  TYPING_STOP: "typing-stop",
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];
