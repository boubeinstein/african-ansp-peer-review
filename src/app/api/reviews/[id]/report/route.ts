/**
 * Review Report API Endpoint
 *
 * GET /api/reviews/[id]/report
 *
 * Generates and downloads a PDF report for a completed peer review.
 *
 * Query Parameters:
 * - locale: "en" | "fr" (default: "en")
 *
 * Returns:
 * - PDF file as attachment
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateReviewReport, getReportFilename } from "@/server/services/report";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: reviewId } = await params;

    // Get locale from query params
    const searchParams = request.nextUrl.searchParams;
    const locale = (searchParams.get("locale") || "en") as "en" | "fr";

    // Validate locale
    if (!["en", "fr"].includes(locale)) {
      return NextResponse.json(
        { error: "Invalid locale. Must be 'en' or 'fr'." },
        { status: 400 }
      );
    }

    // Fetch the review to check permissions and get reference
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        hostOrganizationId: true,
        teamMembers: {
          select: { userId: true },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "SYSTEM_ADMIN";
    const isTeamMember = review.teamMembers.some((m: { userId: string }) => m.userId === session.user.id);
    const isHostOrg = session.user.organizationId === review.hostOrganizationId;

    if (!isAdmin && !isTeamMember && !isHostOrg) {
      return NextResponse.json(
        { error: "You do not have permission to access this report" },
        { status: 403 }
      );
    }

    // Check if review is in a state where report can be generated
    const validStatuses = ["COMPLETED", "REPORT_DRAFT", "REPORT_FINAL", "CLOSED"];
    if (!validStatuses.includes(review.status)) {
      return NextResponse.json(
        {
          error: "Report is not available for this review status",
          status: review.status,
        },
        { status: 400 }
      );
    }

    // Generate the PDF
    const pdfBuffer = await generateReviewReport(reviewId, locale);

    // Get filename
    const filename = getReportFilename(review.referenceNumber, locale);

    // Return the PDF as a downloadable file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("lead reviewer")) {
        return NextResponse.json(
          { error: "Review must have a lead reviewer assigned" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
