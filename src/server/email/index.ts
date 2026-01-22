/**
 * Email Module
 *
 * Central export point for the email system.
 */

// Email Sender
export {
  sendReviewInvitationEmail,
  sendReviewApprovedEmail,
  sendReviewCompletedEmail,
  sendFindingNotificationEmail,
  sendCAPDeadlineReminderEmail,
  sendCAPOverdueEmail,
  sendBulkEmail,
  type SendEmailResult,
  type BulkEmailRecipient,
} from "./email-sender";

// Templates (for direct rendering if needed)
export * from "./templates";
