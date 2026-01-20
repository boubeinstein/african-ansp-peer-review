import { UserRole } from "@prisma/client";

/**
 * Roles that can edit ANY reviewer profile
 */
const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.PROGRAMME_COORDINATOR,
];

interface ReviewerPermissionCheck {
  userRole: UserRole;
  userOrgId?: string | null;
  reviewerOrgId: string;
}

/**
 * Check if user can edit a specific reviewer
 * - Admins can edit any reviewer
 * - ANSP_ADMIN can only edit reviewers from their own organization
 * - LEAD_REVIEWER can edit their own profile
 */
export function canEditReviewer({
  userRole,
  userOrgId,
  reviewerOrgId,
}: ReviewerPermissionCheck): boolean {
  // Admins can edit any reviewer
  if (ADMIN_ROLES.includes(userRole)) {
    return true;
  }

  // ANSP_ADMIN can only edit reviewers from their own organization
  if (
    userRole === UserRole.ANSP_ADMIN &&
    userOrgId &&
    userOrgId === reviewerOrgId
  ) {
    return true;
  }

  // LEAD_REVIEWER can edit their own profile (handled separately with userId check)

  return false;
}

/**
 * Check if user can view reviewer details
 */
export function canViewReviewer({ userRole }: { userRole: UserRole }): boolean {
  // Most roles can view the reviewer directory
  const viewRoles: UserRole[] = [
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.PROGRAMME_COORDINATOR,
    UserRole.STEERING_COMMITTEE,
    UserRole.ANSP_ADMIN,
    UserRole.SAFETY_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.LEAD_REVIEWER,
    UserRole.PEER_REVIEWER,
    UserRole.OBSERVER,
  ];
  return viewRoles.includes(userRole);
}

/**
 * Check if user can create/nominate reviewers
 */
export function canCreateReviewer({
  userRole,
}: {
  userRole: UserRole;
}): boolean {
  const createRoles: UserRole[] = [
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.PROGRAMME_COORDINATOR,
    UserRole.ANSP_ADMIN, // Can nominate for their own org
  ];
  return createRoles.includes(userRole);
}

/**
 * Check if user can approve/certify reviewers
 */
export function canApproveReviewer({
  userRole,
}: {
  userRole: UserRole;
}): boolean {
  const approveRoles: UserRole[] = [
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.PROGRAMME_COORDINATOR,
    UserRole.STEERING_COMMITTEE,
  ];
  return approveRoles.includes(userRole);
}

/**
 * Check if user can delete a reviewer
 */
export function canDeleteReviewer({
  userRole,
}: {
  userRole: UserRole;
}): boolean {
  // Only admins can delete reviewers
  return ADMIN_ROLES.includes(userRole);
}
