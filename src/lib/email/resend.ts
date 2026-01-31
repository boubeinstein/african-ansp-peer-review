import { Resend } from "resend";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a single email via Resend
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "AAPRP <noreply@aaprp.org>",
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      tags: params.tags,
    });

    if (error) {
      console.error("[Email] Send failed:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Sent successfully:", data?.id);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error("[Email] Exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Send batch emails (up to 100 at a time)
 */
export async function sendBatchEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
  }>
): Promise<{ success: boolean; results: SendEmailResult[] }> {
  try {
    const { data, error } = await resend.batch.send(
      emails.map((email) => ({
        from: process.env.EMAIL_FROM || "AAPRP <noreply@aaprp.org>",
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }))
    );

    if (error) {
      console.error("[Email Batch] Send failed:", error);
      return {
        success: false,
        results: emails.map(() => ({ success: false, error: error.message })),
      };
    }

    console.log("[Email Batch] Sent successfully:", data);

    // Handle the batch response - data contains array of results
    const results: SendEmailResult[] = Array.isArray(data?.data)
      ? data.data.map((d: { id: string }) => ({
          success: true,
          messageId: d.id,
        }))
      : emails.map(() => ({ success: true }));

    return {
      success: true,
      results,
    };
  } catch (err) {
    console.error("[Email Batch] Exception:", err);
    return {
      success: false,
      results: emails.map(() => ({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      })),
    };
  }
}
