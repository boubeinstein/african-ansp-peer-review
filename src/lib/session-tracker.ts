import { db } from "@/lib/db";
import { UAParser } from "ua-parser-js";
import { getMaxConcurrentSessions } from "@/lib/system-settings";

interface CreateSessionInput {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresInDays?: number;
}

export async function createLoginSession(input: CreateSessionInput) {
  const { userId, userAgent, ipAddress, expiresInDays = 30 } = input;

  // === ENFORCE MAX CONCURRENT SESSIONS ===
  const maxSessions = await getMaxConcurrentSessions();
  console.log(`[createLoginSession] maxConcurrentSessions setting: ${maxSessions}`);

  if (maxSessions > 0) {
    const now = new Date();

    // Get all active, non-expired sessions for this user, oldest first
    const activeSessions = await db.loginSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true },
    });

    console.log(
      `[createLoginSession] User ${userId} has ${activeSessions.length} active sessions, max allowed: ${maxSessions}`
    );

    // If at or over limit, revoke oldest sessions to make room for the new one
    if (activeSessions.length >= maxSessions) {
      const sessionsToRevoke = activeSessions.length - maxSessions + 1;
      const idsToRevoke = activeSessions
        .slice(0, sessionsToRevoke)
        .map((s) => s.id);

      console.log(
        `[createLoginSession] Revoking ${sessionsToRevoke} oldest session(s):`,
        idsToRevoke
      );

      await db.loginSession.updateMany({
        where: { id: { in: idsToRevoke } },
        data: { isActive: false, revokedAt: now },
      });
    }
  }
  // === END ENFORCEMENT ===

  // Parse user agent
  const parser = new UAParser(userAgent || "");
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const browserStr = browser.name
    ? `${browser.name} ${browser.version || ""}`.trim()
    : "Unknown Browser";
  const osStr = os.name
    ? `${os.name} ${os.version || ""}`.trim()
    : "Unknown OS";
  const deviceType = device.type || "desktop";
  const deviceName = `${browserStr} on ${osStr}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const session = await db.loginSession.create({
    data: {
      userId,
      deviceName,
      deviceType,
      browser: browserStr,
      os: osStr,
      ipAddress: ipAddress || null,
      expiresAt,
    },
  });

  return session;
}

export async function validateLoginSession(sessionId: string): Promise<boolean> {
  const session = await db.loginSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return false;
  if (!session.isActive) return false;
  if (session.expiresAt < new Date()) {
    // Auto-expire
    await db.loginSession.update({
      where: { id: sessionId },
      data: { isActive: false, revokedAt: new Date() },
    });
    return false;
  }

  // Touch lastActiveAt (debounce: only update if >5 min stale)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (session.lastActiveAt < fiveMinAgo) {
    await db.loginSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {}); // non-blocking
  }

  return true;
}

export async function revokeLoginSession(sessionId: string) {
  return db.loginSession.update({
    where: { id: sessionId },
    data: { isActive: false, revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string) {
  return db.loginSession.updateMany({
    where: {
      userId,
      isActive: true,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { isActive: false, revokedAt: new Date() },
  });
}

export async function updateLoginSessionDevice(
  sessionId: string,
  userAgent: string | null,
  ipAddress: string | null,
) {
  const parser = new UAParser(userAgent || "");
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const browserStr = browser.name
    ? `${browser.name} ${browser.version || ""}`.trim()
    : "Unknown Browser";
  const osStr = os.name
    ? `${os.name} ${os.version || ""}`.trim()
    : "Unknown OS";
  const deviceType = device.type || "desktop";
  const deviceName = `${browserStr} on ${osStr}`;

  return db.loginSession.update({
    where: { id: sessionId },
    data: {
      deviceName,
      deviceType,
      browser: browserStr,
      os: osStr,
      ipAddress: ipAddress || undefined,
    },
  });
}
