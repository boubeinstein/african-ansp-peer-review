/**
 * CAP Deadline Checker Cron Endpoint
 *
 * This endpoint is called by Vercel Cron or an external scheduler
 * to check for CAPs approaching deadline or overdue.
 *
 * Schedule: Daily at 8:00 AM UTC
 *
 * Security:
 * - Optionally protected by CRON_SECRET environment variable
 * - Should be called only by trusted schedulers
 */

import { NextResponse } from "next/server";
import { checkCAPDeadlines } from "@/server/jobs/cap-deadline-checker";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for the job

export async function GET(request: Request) {
  // Verify cron secret if configured
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[CAP Cron] Unauthorized request attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("[CAP Cron] Starting CAP deadline check...");

  try {
    const result = await checkCAPDeadlines();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[CAP Cron] Failed to check CAP deadlines:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check CAP deadlines",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
