import { db } from "@/lib/db";

/**
 * Get the max concurrent sessions setting.
 * Returns 0 if unlimited (default).
 */
export async function getMaxConcurrentSessions(): Promise<number> {
  const settings = await db.systemSettings.findUnique({
    where: { id: "system-settings" },
    select: { maxConcurrentSessions: true },
  });

  const value = settings?.maxConcurrentSessions ?? 0;
  console.log("[getMaxConcurrentSessions] settings row:", settings, "→ returning:", value);
  return value;
}
