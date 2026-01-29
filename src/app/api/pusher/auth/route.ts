import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPusherServer } from "@/lib/pusher/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const pusher = getPusherServer();

  // For presence channels, include user data
  if (channelName.startsWith("presence-")) {
    // Verify user has access to this channel
    const hasAccess = await verifyChannelAccess(session.user.id, channelName);

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const presenceData = {
      user_id: session.user.id,
      user_info: {
        id: session.user.id,
        name: `${session.user.firstName} ${session.user.lastName}`,
        email: session.user.email,
        role: session.user.role,
        avatar: getInitials(session.user.firstName, session.user.lastName),
        color: getUserColor(session.user.id),
      },
    };

    const authResponse = pusher.authorizeChannel(
      socketId,
      channelName,
      presenceData
    );
    return NextResponse.json(authResponse);
  }

  // For private channels
  if (channelName.startsWith("private-")) {
    const hasAccess = await verifyChannelAccess(session.user.id, channelName);

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  }

  return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
}

async function verifyChannelAccess(
  userId: string,
  channelName: string
): Promise<boolean> {
  // Extract review ID from channel name
  const reviewMatch = channelName.match(/(?:private|presence)-review-(.+)/);

  if (reviewMatch) {
    const reviewId = reviewMatch[1];

    // Check if user is a team member of this review
    const membership = await prisma.reviewTeamMember.findFirst({
      where: {
        reviewId,
        userId,
      },
    });

    if (membership) return true;

    // Check if user is oversight role (can view all)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (
      user?.role &&
      ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        user.role
      )
    ) {
      return true;
    }

    return false;
  }

  // User's own channel
  if (channelName === `private-user-${userId}`) {
    return true;
  }

  return false;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

function getUserColor(userId: string): string {
  // Generate consistent color based on user ID
  const colors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#84cc16",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#ec4899",
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
