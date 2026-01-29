import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

const isPusherConfigured = (): boolean => {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER
  );
};

const pusherStub = {
  trigger: async (): Promise<object> => {
    return Promise.resolve({});
  },
  authorizeChannel: (): { auth: string; channel_data: string } => {
    return { auth: "", channel_data: "" };
  },
};

export function getPusherServer(): Pusher | typeof pusherStub {
  if (!isPusherConfigured()) {
    return pusherStub as unknown as Pusher;
  }

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

export const CHANNELS = {
  review: (reviewId: string) => `private-review-${reviewId}`,
  reviewPresence: (reviewId: string) => `presence-review-${reviewId}`,
  finding: (findingId: string) => `private-finding-${findingId}`,
  user: (userId: string) => `private-user-${userId}`,
} as const;

export const EVENTS = {
  MEMBER_JOINED: "member-joined",
  MEMBER_LEFT: "member-left",
  MEMBER_UPDATED: "member-updated",
  CURSOR_MOVE: "cursor-move",
  SELECTION_CHANGE: "selection-change",
  CONTENT_CHANGE: "content-change",
  FINDING_CREATED: "finding-created",
  FINDING_UPDATED: "finding-updated",
  FINDING_DELETED: "finding-deleted",
  COMMENT_ADDED: "comment-added",
  TASK_UPDATED: "task-updated",
  SESSION_STARTED: "session-started",
  SESSION_ENDED: "session-ended",
  TYPING_START: "typing-start",
  TYPING_STOP: "typing-stop",
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];
