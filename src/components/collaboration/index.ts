/**
 * Collaboration Components
 *
 * Real-time collaboration UI components for peer review sessions.
 */

// Session components
export { SessionBanner } from "./session-banner";
export { StartSessionDialog } from "./start-session-dialog";
export { SessionPanel } from "./session-panel";
export { SessionHistory } from "./session-history";

// Presence components
export {
  PresenceAvatars,
  PresenceAvatar,
  OnlineIndicator,
} from "./presence-avatars";
export { FocusIndicator } from "./focus-indicator";
export { TypingIndicator } from "./typing-indicator";
export {
  LiveCursors,
  useCursorTracking,
  SelectionHighlight,
} from "./live-cursors";
export { CollaborativeContainer } from "./collaborative-container";

// Activity components
export {
  ActivityFeed,
  ActivityFeedButton,
  ActivityToast,
} from "./activity-feed";
export type { ActivityItem } from "./activity-feed";
export { TeamActivityFeed } from "./team-activity-feed";

// Connection & Error handling
export { ConnectionStatus } from "./connection-status";
export { CollaborationErrorBoundary } from "./collaboration-error-boundary";
export { OfflineIndicator } from "./offline-indicator";
