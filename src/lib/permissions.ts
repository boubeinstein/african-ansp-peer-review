import { UserRole } from "@prisma/client";

// Roles that represent oversight/administration (no ANSP affiliation required)
export const OVERSIGHT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
];

// Roles that represent ANSP organizations
export const ANSP_ROLES: UserRole[] = [
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
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
 * Check if user can perform ANSP-specific actions
 * Requires both an ANSP role AND an organization affiliation
 */
export function canPerformAnspActions(
  role: UserRole,
  organizationId: string | null | undefined
): boolean {
  return isAnspRole(role) && !!organizationId;
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
