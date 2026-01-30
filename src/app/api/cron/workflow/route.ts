import { NextRequest, NextResponse } from "next/server";
import { processWorkflowJobs } from "@/server/jobs/workflow-jobs";

/**
 * Cron endpoint for processing workflow jobs
 *
 * This endpoint should be called periodically (e.g., hourly) to:
 * - Check for SLA breaches
 * - Process escalation rules
 * - Send deadline warning notifications
 *
 * Authentication:
 * - Requires CRON_SECRET environment variable to be set
 * - Pass the secret in the Authorization header as Bearer token
 *
 * Usage with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/workflow",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require it
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron] Unauthorized workflow job attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting workflow job processing...");

    const result = await processWorkflowJobs();

    console.log("[Cron] Workflow job completed successfully", {
      breaches: result.breaches,
      escalations: result.escalations,
      warnings: result.warnings,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Cron] Workflow job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Job failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different cron services
export async function POST(request: NextRequest) {
  return GET(request);
}
