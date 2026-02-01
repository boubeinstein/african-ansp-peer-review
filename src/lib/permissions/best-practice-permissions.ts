import { UserRole } from "@/types/prisma-enums";

/**
 * Best Practice Permission Helpers
 *
 * Permission matrix for Best Practice features:
 *
 * | Feature             | Programme Roles | ANSP Roles    | Reviewer Roles  |
 * |---------------------|-----------------|---------------|-----------------|
 * | View BP             | ✅ Full         | ✅ Full       | ✅ Full         |
 * | Adopt BP            | ❌ Stats only   | ✅ Full       | ⚠️ If has org   |
 * | Request Mentorship  | ❌ Hidden       | ✅ Full       | ⚠️ If has org   |
 * | Add Lesson Learned  | ✅ Programme    | ✅ Org-specific| ✅ Review-based |
 * | Add Discussion      | ✅ Full         | ✅ Full       | ✅ Full         |
 * | Moderate Discussion | ✅ Full         | ❌ Own only   | ❌ Own only     |
 */

// Programme-level roles (oversee programme, don't represent specific ANSP)
export const BP_PROGRAMME_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
];

// ANSP-level roles (represent specific organization)
export const BP_ANSP_ROLES: UserRole[] = [
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
  "STAFF",
];

// Reviewer roles (experts who may or may not be ANSP members)
export const BP_REVIEWER_ROLES: UserRole[] = [
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
  "OBSERVER",
];

/**
 * Check if user has a programme-level role
 */
export function isBPProgrammeRole(role: UserRole): boolean {
  return BP_PROGRAMME_ROLES.includes(role);
}

/**
 * Check if user has an ANSP-level role
 */
export function isBPAnspRole(role: UserRole): boolean {
  return BP_ANSP_ROLES.includes(role);
}

/**
 * Check if user has a reviewer role
 */
export function isBPReviewerRole(role: UserRole): boolean {
  return BP_REVIEWER_ROLES.includes(role);
}

/**
 * Check if user can adopt a best practice
 * - Programme roles cannot adopt (they oversee, not represent ANSP)
 * - ANSP roles and reviewers with organization can adopt
 */
export function canAdoptBestPractice(
  role: UserRole,
  hasOrganization: boolean
): boolean {
  if (BP_PROGRAMME_ROLES.includes(role)) return false;
  return hasOrganization;
}

/**
 * Check if user can request mentorship for a best practice
 * - Programme roles cannot request (they oversee, not represent ANSP)
 * - ANSP roles and reviewers with organization can request
 */
export function canRequestBPMentorship(
  role: UserRole,
  hasOrganization: boolean
): boolean {
  if (BP_PROGRAMME_ROLES.includes(role)) return false;
  return hasOrganization;
}

/**
 * Check if user can add lessons learned to a best practice
 * - Programme roles can add programme-wide insights (no org required)
 * - ANSP roles and reviewers with organization can add org-specific lessons
 */
export function canAddBPLessonLearned(
  role: UserRole,
  hasOrganization: boolean
): boolean {
  // Programme roles can add programme-wide lessons
  if (BP_PROGRAMME_ROLES.includes(role)) return true;
  // ANSP roles need organization
  return hasOrganization;
}

/**
 * Check if user can moderate best practice discussions
 * Only programme-level oversight roles can moderate
 */
export function canModerateBPDiscussion(role: UserRole): boolean {
  return BP_PROGRAMME_ROLES.includes(role);
}

/**
 * Check if user can delete a specific discussion comment
 * - Moderators can delete any comment
 * - Users can only delete their own comments
 */
export function canDeleteBPComment(
  role: UserRole,
  commentAuthorId: string,
  userId: string
): boolean {
  if (canModerateBPDiscussion(role)) return true;
  return commentAuthorId === userId;
}

/**
 * Check if user can submit/create new best practices
 * Requires ANSP role with organization affiliation
 */
export function canSubmitBestPractice(
  role: UserRole,
  hasOrganization: boolean
): boolean {
  // Must have ANSP role and organization
  if (!hasOrganization) return false;
  return BP_ANSP_ROLES.includes(role) || BP_REVIEWER_ROLES.includes(role);
}

/**
 * Check if user can review/approve submitted best practices
 * Only programme-level roles can approve
 */
export function canReviewBestPractice(role: UserRole): boolean {
  return BP_PROGRAMME_ROLES.includes(role);
}
