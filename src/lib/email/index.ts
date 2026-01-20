/**
 * Email Service for AAPRP
 *
 * Handles email notifications for join request workflow.
 * Uses Resend for real email delivery when API key is configured.
 */

import { Resend } from "resend";

// Initialize Resend only if API key exists
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// For Resend free tier, use their test domain
const FROM_EMAIL = "AAPRP <onboarding@resend.dev>";
const COORDINATOR_EMAIL =
  process.env.COORDINATOR_EMAIL || "coordinator@aaprp.org";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string[];
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  // Always log to console
  console.log(
    "\n📧 ═══════════════════════════════════════════════════════"
  );
  console.log("📧 EMAIL NOTIFICATION");
  console.log("📧 ═══════════════════════════════════════════════════════");
  console.log("📧 To:", to);
  console.log("📧 Subject:", subject);
  console.log("📧 ───────────────────────────────────────────────────────");

  // If we have Resend configured, actually send the email
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });
      console.log("📧 ✅ Email SENT! Message ID:", result.data?.id);
      console.log(
        "📧 ═══════════════════════════════════════════════════════\n"
      );
      return { success: true, messageId: result.data?.id };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("📧 ❌ Email send error:", errorMessage);
      console.log(
        "📧 ═══════════════════════════════════════════════════════\n"
      );
      // Don't throw - let the workflow continue even if email fails
      return { success: false, error };
    }
  }

  // No API key - demo mode
  console.log("📧 ℹ️  Demo mode - email not actually sent (no API key)");
  console.log(
    "📧 ═══════════════════════════════════════════════════════\n"
  );
  return { success: true, messageId: "demo-mode-" + Date.now() };
}

// Application received notification
export async function sendApplicationReceivedEmail(params: {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  referenceId: string;
}) {
  const subject = `[AAPRP] Application Received - ${params.organizationName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #003366, #0072bc); color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .reference { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>African ANSP Peer Review Programme</h1>
      </div>
      <div class="content">
        <h2>Application Received</h2>
        <p>Dear ${params.applicantName},</p>
        <p>Thank you for submitting your organization's application to join the <strong>African ANSP Peer Review Programme</strong>.</p>
        <div class="reference">
          <p style="margin:0;color:#666;">Reference Number</p>
          <p style="margin:5px 0;font-size:18px;font-weight:bold;font-family:monospace;">${params.referenceId}</p>
        </div>
        <p><strong>Organization:</strong> ${params.organizationName}</p>
        <p>Your application will be reviewed by the Programme Coordinator within <strong>5 business days</strong>.</p>
        <p>You will be notified once a decision has been made.</p>
      </div>
      <div class="footer">
        <p>African ANSP Peer Review Programme<br>In partnership with ICAO, CANSO & AFCAC</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.applicantEmail,
    subject,
    html,
  });
}

// Coordinator forwarded to SC notification
export async function sendForwardedToSCEmail(params: {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  recommendation: string;
}) {
  const subject = `[AAPRP] Application Under Review - ${params.organizationName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #003366, #0072bc); color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .status { background: #e7f3ff; border: 1px solid #0072bc; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>African ANSP Peer Review Programme</h1>
      </div>
      <div class="content">
        <h2>Application Under Review</h2>
        <p>Dear ${params.applicantName},</p>
        <p>Your application from <strong>${params.organizationName}</strong> has been reviewed by the Programme Coordinator and has been forwarded to the Steering Committee for final decision.</p>
        <div class="status">
          <strong>Coordinator Recommendation:</strong> ${params.recommendation}
        </div>
        <p>You will be notified of the Steering Committee's decision within <strong>10 business days</strong>.</p>
      </div>
      <div class="footer">
        <p>African ANSP Peer Review Programme<br>In partnership with ICAO, CANSO & AFCAC</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.applicantEmail,
    subject,
    html,
  });
}

// SC Decision: Approved
export async function sendApprovalEmail(params: {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  assignedTeam: number;
}) {
  const subject = `[AAPRP] Welcome to the Programme - ${params.organizationName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #003366, #0072bc); color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .success-badge { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .team-badge { background: #0072bc; color: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
        .steps { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .steps ol { margin: 0; padding-left: 20px; }
        .steps li { margin: 10px 0; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Congratulations!</h1>
      </div>
      <div class="content">
        <div class="success-badge">
          <strong>APPLICATION APPROVED</strong>
        </div>
        <p>Dear ${params.applicantName},</p>
        <p>We are pleased to inform you that <strong>${params.organizationName}</strong> has been approved to join the <strong>African ANSP Peer Review Programme</strong>!</p>
        <p>You have been assigned to: <span class="team-badge">Team ${params.assignedTeam}</span></p>
        <div class="steps">
          <h3 style="margin-top:0;">Next Steps:</h3>
          <ol>
            <li><strong>Platform Access:</strong> You will receive your login credentials in a separate email within 48 hours</li>
            <li><strong>Profile Setup:</strong> Complete your organization's profile on the platform</li>
            <li><strong>Nominate Reviewers:</strong> Submit 2-5 qualified peer reviewers from your organization</li>
            <li><strong>Self-Assessment:</strong> Begin your initial SMS maturity self-assessment</li>
            <li><strong>Team Introduction:</strong> You will be introduced to your team members</li>
          </ol>
        </div>
        <p>Welcome to the AAPRP family! We look forward to collaborating with you to enhance aviation safety across Africa.</p>
      </div>
      <div class="footer">
        <p>African ANSP Peer Review Programme<br>In partnership with ICAO, CANSO & AFCAC</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.applicantEmail,
    subject,
    html,
  });
}

// Platform credentials email (sent after approval)
export async function sendCredentialsEmail(params: {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  temporaryPassword: string;
  loginUrl: string;
}) {
  const subject = `[AAPRP] Your Platform Access Credentials`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #003366, #0072bc); color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .credentials { background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .credentials-box { background: white; padding: 15px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
        .warning { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #0072bc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Platform Access</h1>
      </div>
      <div class="content">
        <p>Dear ${params.applicantName},</p>
        <p>Your account for the <strong>African ANSP Peer Review Programme</strong> platform has been created.</p>

        <div class="credentials">
          <h3 style="margin-top:0;">Your Login Credentials:</h3>
          <p><strong>Email:</strong></p>
          <div class="credentials-box">${params.applicantEmail}</div>
          <p><strong>Temporary Password:</strong></p>
          <div class="credentials-box">${params.temporaryPassword}</div>
        </div>

        <div class="warning">
          <strong>Security Notice:</strong> Please change your password immediately after your first login. This temporary password will expire in 72 hours.
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${params.loginUrl}" class="button">Access Platform</a>
        </p>

        <p>If you have any issues accessing your account, please contact the Programme Coordinator at ${COORDINATOR_EMAIL}.</p>
      </div>
      <div class="footer">
        <p>African ANSP Peer Review Programme<br>In partnership with ICAO, CANSO & AFCAC</p>
        <p style="font-size:10px;color:#999;">This email contains sensitive information. Please do not forward.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.applicantEmail,
    subject,
    html,
  });
}

// SC Decision: Rejected
export async function sendRejectionEmail(params: {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  reason: string;
}) {
  const subject = `[AAPRP] Application Decision - ${params.organizationName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #6c757d; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .reason { background: #f8f9fa; border-left: 4px solid #6c757d; padding: 15px; margin: 20px 0; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Application Decision</h1>
      </div>
      <div class="content">
        <p>Dear ${params.applicantName},</p>
        <p>Thank you for your interest in the African ANSP Peer Review Programme.</p>
        <p>After careful consideration, the Steering Committee has decided not to approve the application from <strong>${params.organizationName}</strong> at this time.</p>
        <div class="reason">
          <strong>Reason:</strong><br>
          ${params.reason}
        </div>
        <p>You are welcome to reapply in the future once the above concerns have been addressed.</p>
        <p>If you have questions or would like to discuss this decision, please contact the Programme Coordinator at ${COORDINATOR_EMAIL}.</p>
      </div>
      <div class="footer">
        <p>African ANSP Peer Review Programme<br>In partnership with ICAO, CANSO & AFCAC</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.applicantEmail,
    subject,
    html,
  });
}

// SC Decision: More Info Needed
export async function sendMoreInfoRequestEmail(params: {
  applicantEmail: string;
  applicantName: string;
  organizationName: string;
  infoRequested: string;
}) {
  const subject = `[AAPRP] Additional Information Required - ${params.organizationName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #856404, #ffc107); color: #333; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .request { background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .deadline { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; text-align: center; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Additional Information Required</h1>
      </div>
      <div class="content">
        <p>Dear ${params.applicantName},</p>
        <p>The Steering Committee has reviewed the application from <strong>${params.organizationName}</strong> and requires additional information before making a final decision.</p>
        <div class="request">
          <strong>Information Requested:</strong>
          <p>${params.infoRequested}</p>
        </div>
        <div class="deadline">
          <strong>Please respond within 10 business days</strong>
        </div>
        <p>To submit the requested information, please reply to this email or contact the Programme Coordinator at ${COORDINATOR_EMAIL}.</p>
      </div>
      <div class="footer">
        <p>African ANSP Peer Review Programme<br>In partnership with ICAO, CANSO & AFCAC</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.applicantEmail,
    subject,
    html,
  });
}
