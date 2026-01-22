/**
 * Email Templates Index
 *
 * Central export point for all AAPRP email templates.
 */

// Base Layout
export { BaseLayout, styles, InfoBox, InfoRow, footerContent } from "./base-layout";

// Review Templates
export {
  ReviewInvitationEmail,
  getReviewInvitationSubject,
  type ReviewInvitationEmailProps,
} from "./review-invitation";

export {
  ReviewApprovedEmail,
  getReviewApprovedSubject,
  defaultNextSteps,
  type ReviewApprovedEmailProps,
} from "./review-approved";

export {
  ReviewCompletedEmail,
  getReviewCompletedSubject,
  type ReviewCompletedEmailProps,
} from "./review-completed";

// Finding Templates
export {
  FindingNotificationEmail,
  getFindingNotificationSubject,
  type FindingNotificationEmailProps,
} from "./finding-notification";

// CAP Templates
export {
  CAPDeadlineReminderEmail,
  getCAPDeadlineReminderSubject,
  type CAPDeadlineReminderEmailProps,
} from "./cap-deadline-reminder";

export {
  CAPOverdueEmail,
  getCAPOverdueSubject,
  type CAPOverdueEmailProps,
} from "./cap-overdue";
