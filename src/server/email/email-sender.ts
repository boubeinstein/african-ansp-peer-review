/**
 * Email Sender Service
 *
 * Service for sending templated emails using React Email and Resend.
 * Provides type-safe functions for each email template.
 */

import { Resend } from "resend";
import {
  ReviewInvitationEmail,
  getReviewInvitationSubject,
  type ReviewInvitationEmailProps,
  ReviewApprovedEmail,
  getReviewApprovedSubject,
  type ReviewApprovedEmailProps,
  ReviewCompletedEmail,
  getReviewCompletedSubject,
  type ReviewCompletedEmailProps,
  FindingNotificationEmail,
  getFindingNotificationSubject,
  type FindingNotificationEmailProps,
  CAPDeadlineReminderEmail,
  getCAPDeadlineReminderSubject,
  type CAPDeadlineReminderEmailProps,
  CAPOverdueEmail,
  getCAPOverdueSubject,
  type CAPOverdueEmailProps,
} from "./templates";

// =============================================================================
// EMAIL CLIENT
// =============================================================================

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL =
  process.env.FROM_EMAIL || "African ANSP Peer Review <noreply@aaprp.aero>";

// =============================================================================
// TYPES
// =============================================================================

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// SEND EMAIL HELPER
// =============================================================================

async function sendEmail(
  to: string,
  subject: string,
  react: React.ReactElement
): Promise<SendEmailResult> {
  if (!resend) {
    console.warn("Email sending skipped: RESEND_API_KEY not configured");
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `[AAPRP] ${subject}`,
      react,
    });

    if (result.error) {
      console.error("Failed to send email:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// REVIEW EMAILS
// =============================================================================

/**
 * Send a review invitation email to a reviewer.
 */
export async function sendReviewInvitationEmail(
  to: string,
  props: ReviewInvitationEmailProps
): Promise<SendEmailResult> {
  const subject = getReviewInvitationSubject(props.reviewReference, props.locale);
  return sendEmail(to, subject, ReviewInvitationEmail(props));
}

/**
 * Send a review approved notification email.
 */
export async function sendReviewApprovedEmail(
  to: string,
  props: ReviewApprovedEmailProps
): Promise<SendEmailResult> {
  const subject = getReviewApprovedSubject(props.reviewReference, props.locale);
  return sendEmail(to, subject, ReviewApprovedEmail(props));
}

/**
 * Send a review completed notification email.
 */
export async function sendReviewCompletedEmail(
  to: string,
  props: ReviewCompletedEmailProps
): Promise<SendEmailResult> {
  const subject = getReviewCompletedSubject(props.reviewReference, props.locale);
  return sendEmail(to, subject, ReviewCompletedEmail(props));
}

// =============================================================================
// FINDING EMAILS
// =============================================================================

/**
 * Send a finding notification email (new or updated).
 */
export async function sendFindingNotificationEmail(
  to: string,
  props: FindingNotificationEmailProps
): Promise<SendEmailResult> {
  const subject = getFindingNotificationSubject(
    props.action,
    props.severity,
    props.findingReference,
    props.locale
  );
  return sendEmail(to, subject, FindingNotificationEmail(props));
}

// =============================================================================
// CAP EMAILS
// =============================================================================

/**
 * Send a CAP deadline reminder email.
 */
export async function sendCAPDeadlineReminderEmail(
  to: string,
  props: CAPDeadlineReminderEmailProps
): Promise<SendEmailResult> {
  const subject = getCAPDeadlineReminderSubject(
    props.daysRemaining,
    props.findingReference,
    props.locale
  );
  return sendEmail(to, subject, CAPDeadlineReminderEmail(props));
}

/**
 * Send a CAP overdue notification email.
 */
export async function sendCAPOverdueEmail(
  to: string,
  props: CAPOverdueEmailProps
): Promise<SendEmailResult> {
  const subject = getCAPOverdueSubject(
    props.daysOverdue,
    props.findingReference,
    props.escalationLevel,
    props.locale
  );
  return sendEmail(to, subject, CAPOverdueEmail(props));
}

// =============================================================================
// BULK SEND HELPER
// =============================================================================

export interface BulkEmailRecipient {
  email: string;
  locale: "en" | "fr";
}

/**
 * Send the same email to multiple recipients with locale-aware content.
 */
export async function sendBulkEmail<T extends { locale: "en" | "fr" }>(
  recipients: BulkEmailRecipient[],
  propsGenerator: (locale: "en" | "fr") => T,
  sender: (to: string, props: T) => Promise<SendEmailResult>
): Promise<{
  successful: number;
  failed: number;
  errors: string[];
}> {
  const results = await Promise.allSettled(
    recipients.map(async (recipient) => {
      const props = propsGenerator(recipient.locale);
      return sender(recipient.email, props);
    })
  );

  const errors: string[] = [];
  let successful = 0;
  let failed = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.success) {
      successful++;
    } else {
      failed++;
      const error =
        result.status === "rejected"
          ? result.reason?.message || "Unknown error"
          : result.value.error || "Unknown error";
      errors.push(`${recipients[index].email}: ${error}`);
    }
  });

  return { successful, failed, errors };
}
