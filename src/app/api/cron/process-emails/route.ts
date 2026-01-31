import { NextRequest, NextResponse } from "next/server";
import { processPendingNotificationEmails } from "@/lib/email/notification-service";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Verify authorization
  const authHeader = req.headers.get("authorization");

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sentCount = await processPendingNotificationEmails(100);

    return NextResponse.json({
      success: true,
      processed: sentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CronEmail] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process emails" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}
