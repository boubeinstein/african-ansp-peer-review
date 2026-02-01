import { UserRole } from "@/types/prisma-enums";

// Roles that represent programme-level oversight (no ANSP affiliation required)
export const OVERSIGHT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
];

// Reviewer roles (experts who may or may not be ANSP members)
export const REVIEWER_ROLES: UserRole[] = [
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
  "OBSERVER",
];

// Roles that represent ANSP organizations
export const ANSP_ROLES: UserRole[] = [
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
  "STAFF",
];

/**
 * Check if user has an oversight role (not tied to specific ANSP)
 */
export function isOversightRole(role: UserRole): boolean {
  return OVERSIGHT_ROLES.includes(role);
}

/**
 * Check if user has an ANSP-affiliated role
 */
export function isAnspRole(role: UserRole): boolean {
  return ANSP_ROLES.includes(role);
}

/**
 * Check if user has a reviewer role
 */
export function isReviewerRole(role: UserRole): boolean {
  return REVIEWER_ROLES.includes(role);
}

/**
 * Check if user can perform ANSP-specific actions
 * Requires an ANSP or reviewer role AND an organization affiliation
 */
export function canPerformAnspActions(
  role: UserRole,
  organizationId: string | null | undefined
): boolean {
  // ANSP roles or reviewers with an organization can perform ANSP actions
  return (isAnspRole(role) || isReviewerRole(role)) && !!organizationId;
}

/**
 * Check if user can submit best practices
 */
export function canSubmitBestPractice(
  role: UserRole,
  organizationId: string | null | undefined
): boolean {
  return canPerformAnspActions(role, organizationId);
}

/**
 * Check if user can adopt best practices
 */
export function canAdoptBestPractice(
  role: UserRole,
  organizationId: string | null | undefined,
  practiceOrganizationId: string
): boolean {
  if (!canPerformAnspActions(role, organizationId)) {
    return false;
  }
  // Cannot adopt own organization's practice
  return organizationId !== practiceOrganizationId;
}

/**
 * Check if user can review/approve best practices
 */
export function canReviewBestPractice(role: UserRole): boolean {
  return OVERSIGHT_ROLES.includes(role);
}

/**
 * Check if user can request a peer review (ANSP requesting for own org)
 */
export function canRequestPeerReview(
  role: UserRole,
  organizationId: string | null | undefined
): boolean {
  // Only ANSP roles with an organization can request reviews
  return isAnspRole(role) && !!organizationId;
}

/**
 * Check if user can create/approve peer reviews (oversight function)
 */
export function canManagePeerReviews(role: UserRole): boolean {
  return ["PROGRAMME_COORDINATOR", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(role);
}

/**
 * Check if organization can be a peer review host for this user
 * Programme Coordinators cannot select their own org as host
 */
export function canBeReviewHost(
  organizationId: string,
  userRole: UserRole,
  userOrgId: string | null | undefined
): boolean {
  // Programme Coordinators cannot select their own org as host
  if (isOversightRole(userRole) && organizationId === userOrgId) {
    return false;
  }
  return true;
}

/**
 * Check if user can view all team chats (oversight roles only)
 */
export function canViewAllTeamChats(role: UserRole): boolean {
  return isOversightRole(role);
}

/**
 * Check if user can view a specific team's chats
 * - Oversight roles can view all team chats
 * - Team members can only view their own team's chats
 */
export function canViewTeamChat(
  userRole: UserRole,
  userTeamId: string | null,
  chatTeamId: string | null
): boolean {
  // Oversight roles can view all
  if (isOversightRole(userRole)) {
    return true;
  }

  // Team members can only view their own team's chats
  if (!userTeamId || !chatTeamId) {
    return false;
  }

  return userTeamId === chatTeamId;
}

/**
 * Check if user can request mentorship for a best practice
 * - Programme roles cannot request (they oversee, don't represent ANSP)
 * - ANSP roles and reviewers with organization can request
 */
export function canRequestMentorship(
  role: UserRole,
  organizationId: string | null | undefined
): boolean {
  if (isOversightRole(role)) return false;
  return !!organizationId;
}

/**
 * Check if user can add lessons learned to a best practice
 * - Programme roles can add programme-wide insights
 * - ANSP roles and reviewers with organization can add org-specific lessons
 */
export function canAddLessonLearned(
  role: UserRole,
  organizationId: string | null | undefined
): boolean {
  // Programme roles can add programme-wide lessons
  if (isOversightRole(role)) return true;
  // ANSP roles need organization
  return !!organizationId;
}

/**
 * Check if user can moderate discussions (delete any comment)
 * Only programme-level oversight roles can moderate
 */
export function canModerateDiscussion(role: UserRole): boolean {
  return isOversightRole(role);
}

/**
 * Check if user can delete a specific comment
 * - Moderators can delete any comment
 * - Users can only delete their own comments
 */
export function canDeleteComment(
  role: UserRole,
  commentAuthorId: string,
  userId: string
): boolean {
  if (canModerateDiscussion(role)) return true;
  return commentAuthorId === userId;
}
