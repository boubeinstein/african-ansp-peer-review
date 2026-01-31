import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { notificationEmailTemplate } from "@/lib/email/templates";

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  try {
    const { to, locale = "en" } = await req.json();

    if (!to) {
      return NextResponse.json(
        { error: "Missing 'to' email address" },
        { status: 400 }
      );
    }

    const html = notificationEmailTemplate({
      recipientName: "Test User",
      title: locale === "fr" ? "Email de Test" : "Test Email",
      message:
        locale === "fr"
          ? "Ceci est un email de test du systeme de notification AAPRP."
          : "This is a test email from the AAPRP notification system.",
      actionUrl: `${process.env.APP_URL || "http://localhost:3000"}/dashboard`,
      actionLabel: locale === "fr" ? "Aller au Tableau de Bord" : "Go to Dashboard",
      locale: locale as "en" | "fr",
    });

    const result = await sendEmail({
      to,
      subject: locale === "fr" ? "Email de Test AAPRP" : "AAPRP Test Email",
      html,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TestEmail] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
