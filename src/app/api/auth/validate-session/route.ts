import { NextRequest, NextResponse } from "next/server";
import { validateLoginSession } from "@/lib/session-tracker";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = (await request.json()) as { sessionId?: string };

    if (!sessionId) {
      console.log("[validate-session] No sessionId provided");
      return NextResponse.json({ valid: false });
    }

    const valid = await validateLoginSession(sessionId);
    console.log("[validate-session]", sessionId, "→ valid:", valid);
    return NextResponse.json({ valid });
  } catch (error) {
    console.error("[validate-session] Error:", error);
    return NextResponse.json({ valid: false });
  }
}
