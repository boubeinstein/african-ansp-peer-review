import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logLogin } from "@/server/services/audit";

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

  return NextResponse.json({ success: true });
}
