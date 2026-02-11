/**
 * Shared mention parsing utilities.
 * Safe for both server-side and client-side usage.
 */

/** Extract mentioned user IDs from structured mention tokens: @[Name](userId) */
export function extractMentionedUserIds(content: string): string[] {
  const ids: string[] = [];
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    ids.push(match[2]);
  }

  return ids;
}

/** Check if @all broadcast mention is present */
export function hasMentionAll(content: string): boolean {
  return /@all\b/.test(content);
}

/** Strip mention markup for plain-text previews: @[Name](id) → @Name */
export function stripMentions(content: string): string {
  return content
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1")
    .replace(/@all\b/g, "@all");
}
