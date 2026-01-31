export { sendEmail, sendBatchEmails } from "./resend";
export type { SendEmailParams, SendEmailResult } from "./resend";

export {
  sendNotificationEmail,
  sendBestPracticePromotionEmails,
  processPendingNotificationEmails,
} from "./notification-service";

export * from "./templates";
