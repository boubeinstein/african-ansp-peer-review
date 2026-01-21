/**
 * Email Service
 *
 * Uses Resend for transactional email delivery.
 * Falls back to console logging in development without API key.
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Email result type
type EmailResult = { success: boolean; error?: string };

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<EmailResult> {
  // Fallback to console in dev without API key
  if (!resend) {
    console.log(`[DEV] Password reset link for ${to}: ${resetUrl}`);
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: "African ANSP Peer Review <onboarding@resend.dev>", // Use verified domain in production
      to,
      subject: "Reset Your Password - African ANSP Peer Review Programme",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; margin: 0;">African ANSP Peer Review Programme</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">ICAO-Endorsed Aviation Safety Initiative</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #1e293b;">Password Reset Request</h2>
            <p>Hello ${name || "User"},</p>
            <p>We received a request to reset the password for your account associated with this email address.</p>
            <p>Click the button below to reset your password:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>

            <p style="color: #64748b; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>
            <p style="color: #64748b; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>

          <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <p>This is an automated message from the African ANSP Peer Review Programme.</p>
            <p style="margin: 0;">&copy; 2026 AAPRP. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log(`Password reset email sent to ${to}`);
    return { success: true };
  } catch (err) {
    console.error("Failed to send email:", err);
    return { success: false, error: "Failed to send email" };
  }
}

// =============================================================================
// Join Request Email Functions (stubs for future implementation)
// =============================================================================

interface ApplicationReceivedData {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  referenceId: string;
}

interface ForwardedToSCData {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  recommendation: string;
}

interface ApprovalEmailData {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  assignedTeam: number;
}

interface RejectionEmailData {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  reason: string;
}

interface MoreInfoRequestData {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  infoRequested: string;
}

interface CredentialsEmailData {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  temporaryPassword: string;
  loginUrl: string;
}

export async function sendApplicationReceivedEmail(
  data: ApplicationReceivedData
): Promise<EmailResult> {
  console.log(
    `[EMAIL] Application received confirmation sent to ${data.applicantEmail}`
  );
  // TODO: Implement with Resend when ready
  return { success: true };
}

export async function sendForwardedToSCEmail(
  data: ForwardedToSCData
): Promise<EmailResult> {
  console.log(
    `[EMAIL] SC notification for application from ${data.organizationName}`
  );
  // TODO: Implement with Resend when ready
  return { success: true };
}

export async function sendApprovalEmail(
  data: ApprovalEmailData
): Promise<EmailResult> {
  console.log(`[EMAIL] Approval notification sent to ${data.applicantEmail}`);
  // TODO: Implement with Resend when ready
  return { success: true };
}

export async function sendRejectionEmail(
  data: RejectionEmailData
): Promise<EmailResult> {
  console.log(`[EMAIL] Rejection notification sent to ${data.applicantEmail}`);
  // TODO: Implement with Resend when ready
  return { success: true };
}

export async function sendMoreInfoRequestEmail(
  data: MoreInfoRequestData
): Promise<EmailResult> {
  console.log(`[EMAIL] More info request sent to ${data.applicantEmail}`);
  // TODO: Implement with Resend when ready
  return { success: true };
}

export async function sendCredentialsEmail(
  data: CredentialsEmailData
): Promise<EmailResult> {
  console.log(`[EMAIL] Credentials sent to ${data.applicantEmail}`);
  // TODO: Implement with Resend when ready
  return { success: true };
}
