/**
 * Custom React Hooks
 */

export {
  useKeyboardShortcuts,
  useLegacyKeyboardShortcuts,
  useSequenceShortcuts,
  formatShortcut,
  getShortcutKeys,
  type ShortcutConfig,
  type SequenceShortcut,
} from "./use-keyboard-shortcuts";

export {
  useAssessmentShortcuts,
  getDefaultShortcutsDoc,
  type AssessmentShortcutHandlers,
  type UseAssessmentShortcutsOptions,
} from "./use-assessment-shortcuts";

export { usePresence, type PresenceMember } from "./use-presence";

export { useThrottle, useDebounce } from "./use-throttle";

export {
  useLiveFindings,
  type FindingUpdate,
  type FindingCreated,
  type FindingDeleted,
  type CommentAdded,
} from "./use-live-findings";

export { useLiveSync } from "./use-live-sync";

export { useConnectionStatus } from "./use-connection-status";

export { useOfflineFieldwork } from "./use-offline-fieldwork";
