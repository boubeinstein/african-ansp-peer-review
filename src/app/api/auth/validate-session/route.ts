import { NextRequest, NextResponse } from "next/server";
import { validateLoginSession } from "@/lib/session-tracker";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = (await request.json()) as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ valid: false });
    }

    const valid = await validateLoginSession(sessionId);
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
