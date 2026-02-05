import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logLogin } from "@/server/services/audit";
import { updateLoginSessionDevice } from "@/lib/session-tracker";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await logLogin({
    userId: session.user.id,
    request: request as unknown as Request,
    metadata: { email: session.user.email, role: session.user.role },
  });

  // Enrich LoginSession with User-Agent and IP (not available at JWT creation time)
  if (session.loginSessionId) {
    const userAgent = request.headers.get("user-agent");
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    updateLoginSessionDevice(session.loginSessionId, userAgent, ip).catch(
      (error) => console.error("[Auth] Failed to update login session device:", error)
    );
  }

  return NextResponse.json({ success: true });
}
