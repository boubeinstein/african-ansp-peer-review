import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateLoginSessionDevice } from "@/lib/session-tracker";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.loginSessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const userAgent = req.headers.get("user-agent");
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "Unknown";

  try {
    await updateLoginSessionDevice(
      session.loginSessionId,
      userAgent,
      ipAddress,
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
