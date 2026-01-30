import { NextRequest, NextResponse } from "next/server";
import { documentSharingService } from "@/server/services/document/sharing-service";

/**
 * Shared Document Access API Route
 *
 * Handles token-based document access for external sharing.
 * Validates the token, increments access count, and returns document or redirects.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Get IP address and user agent for audit logging
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    // Validate and access document
    const result = await documentSharingService.validateAndAccess(
      token,
      ipAddress,
      userAgent
    );

    if (!result.isValid) {
      // Return appropriate error based on error type
      const statusCode = result.error === "Invalid token" ? 404 : 403;
      return NextResponse.json(
        {
          error: result.error,
          message: getErrorMessage(result.error || "Access denied"),
        },
        { status: statusCode }
      );
    }

    // Check if client wants JSON response (API call) or redirect (browser)
    const acceptHeader = request.headers.get("accept") || "";
    const wantsJson =
      acceptHeader.includes("application/json") ||
      request.nextUrl.searchParams.get("format") === "json";

    if (wantsJson) {
      // Return document info for API consumers
      return NextResponse.json({
        success: true,
        document: {
          id: result.token?.document.id,
          name: result.token?.document.name,
          fileType: result.token?.document.fileType,
          fileSize: result.token?.document.fileSize,
        },
        downloadUrl: result.documentUrl,
        accessInfo: {
          accessCount: result.token?.accessCount,
          maxAccesses: result.token?.maxAccesses,
          expiresAt: result.token?.expiresAt,
          remainingAccesses:
            result.token?.maxAccesses != null && result.token?.accessCount != null
              ? result.token.maxAccesses - result.token.accessCount
              : null,
        },
      });
    }

    // Redirect to document URL for browser access
    if (result.documentUrl) {
      return NextResponse.redirect(result.documentUrl);
    }

    return NextResponse.json(
      { error: "Document URL not available" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Shared document access error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An error occurred while processing your request",
      },
      { status: 500 }
    );
  }
}

/**
 * HEAD request - Check if token is valid without incrementing access count
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return new NextResponse(null, { status: 400 });
    }

    const isValid = await documentSharingService.isTokenValid(token);

    return new NextResponse(null, {
      status: isValid ? 200 : 403,
      headers: {
        "X-Token-Valid": isValid ? "true" : "false",
      },
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * Get user-friendly error messages
 */
function getErrorMessage(error: string): string {
  switch (error) {
    case "Invalid token":
      return "This share link is invalid or has been revoked.";
    case "Token has expired":
      return "This share link has expired and is no longer valid.";
    case "Maximum access count exceeded":
      return "This share link has reached its maximum number of uses.";
    default:
      return "Unable to access the shared document.";
  }
}
