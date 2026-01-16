/**
 * Permission Helpers for Reviewer Profile Module
 *
 * Defines role-based access control for reviewer operations,
 * aligned with programme governance structure.
 */

import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { UserRole } from "@prisma/client";

// ============================================
// ROLE GROUPS
// ============================================

/**
 * Roles with full administrative access to reviewer management
 */
const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

/**
 * Roles that can coordinate and manage reviewer assignments
 */
const COORDINATOR_ROLES: UserRole[] = [
  ...ADMIN_ROLES,
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
];

/**
 * Roles that can view reviewer information
 */
const VIEWER_ROLES: UserRole[] = [
  ...COORDINATOR_ROLES,
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
  "OBSERVER",
];

/**
 * Roles that are themselves reviewers
 */
const REVIEWER_ROLES: UserRole[] = [
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
  "OBSERVER",
];

// ============================================
// PERMISSION CHECK FUNCTIONS
// ============================================

/**
 * Check if user can manage reviewers (create, update status, delete)
 */
export function canManageReviewers(session: Session | null): boolean {
  if (!session?.user?.role) return false;
  return ADMIN_ROLES.includes(session.user.role as UserRole);
}

/**
 * Check if user can coordinate reviewers (assign to reviews, verify COIs)
 */
export function canCoordinateReviewers(session: Session | null): boolean {
  if (!session?.user?.role) return false;
  return COORDINATOR_ROLES.includes(session.user.role as UserRole);
}

/**
 * Check if user can view all reviewer profiles
 */
export function canViewAllReviewers(session: Session | null): boolean {
  if (!session?.user?.role) return false;
  return VIEWER_ROLES.includes(session.user.role as UserRole);
}

/**
 * Check if user can edit a specific reviewer profile
 * - Admins can edit any profile
 * - Coordinators can edit assigned reviewers
 * - Reviewers can edit their own profile (limited fields)
 */
export function canEditReviewer(
  session: Session | null,
  reviewerUserId: string
): boolean {
  if (!session?.user?.role) return false;

  // Admins can edit any reviewer
  if (ADMIN_ROLES.includes(session.user.role as UserRole)) {
    return true;
  }

  // Coordinators can edit reviewer profiles
  if (
    session.user.role === "PROGRAMME_COORDINATOR" ||
    session.user.role === "STEERING_COMMITTEE"
  ) {
    return true;
  }

  // Reviewers can edit their own profile
  if (
    REVIEWER_ROLES.includes(session.user.role as UserRole) &&
    session.user.id === reviewerUserId
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user can view a specific reviewer profile
 * - All VIEWER_ROLES can view any profile
 * - Users can always view their own profile
 */
export function canViewReviewer(
  session: Session | null,
  reviewerUserId: string
): boolean {
  if (!session?.user?.role) return false;

  // Viewer roles can see all profiles
  if (VIEWER_ROLES.includes(session.user.role as UserRole)) {
    return true;
  }

  // Users can view their own profile
  if (session.user.id === reviewerUserId) {
    return true;
  }

  return false;
}

/**
 * Check if user can update their own profile
 */
export function canUpdateOwnProfile(session: Session | null): boolean {
  if (!session?.user?.role) return false;

  // All users with reviewer roles can update their own profile
  return (
    REVIEWER_ROLES.includes(session.user.role as UserRole) ||
    COORDINATOR_ROLES.includes(session.user.role as UserRole)
  );
}

/**
 * Check if user can manage COI declarations
 * - Admins and coordinators can verify/reject COIs
 * - Reviewers can declare their own COIs
 */
export function canManageCOI(
  session: Session | null,
  reviewerUserId: string,
  action: "declare" | "verify" | "delete"
): boolean {
  if (!session?.user?.role) return false;

  // Admins can do anything
  if (ADMIN_ROLES.includes(session.user.role as UserRole)) {
    return true;
  }

  // Coordinators can verify and manage COIs
  if (
    COORDINATOR_ROLES.includes(session.user.role as UserRole) &&
    (action === "verify" || action === "delete")
  ) {
    return true;
  }

  // Reviewers can declare their own COIs
  if (session.user.id === reviewerUserId && action === "declare") {
    return true;
  }

  return false;
}

/**
 * Check if user can nominate new reviewers
 */
export function canNominateReviewers(session: Session | null): boolean {
  if (!session?.user?.role) return false;

  // ANSP admins can nominate reviewers from their organization
  const nominatingRoles: UserRole[] = [
    ...ADMIN_ROLES,
    "PROGRAMME_COORDINATOR",
    "ANSP_ADMIN",
  ];

  return nominatingRoles.includes(session.user.role as UserRole);
}

/**
 * Check if user can approve/reject reviewer nominations
 */
export function canApproveNominations(session: Session | null): boolean {
  if (!session?.user?.role) return false;

  const approvingRoles: UserRole[] = [
    ...ADMIN_ROLES,
    "PROGRAMME_COORDINATOR",
    "STEERING_COMMITTEE",
  ];

  return approvingRoles.includes(session.user.role as UserRole);
}

// ============================================
// ASSERTION FUNCTIONS (throw on failure)
// ============================================

/**
 * Assert user can manage reviewers
 * @throws TRPCError if permission denied
 */
export function assertCanManageReviewers(session: Session | null): void {
  if (!canManageReviewers(session)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only administrators can perform this action",
    });
  }
}

/**
 * Assert user can coordinate reviewers
 * @throws TRPCError if permission denied
 */
export function assertCanCoordinateReviewers(session: Session | null): void {
  if (!canCoordinateReviewers(session)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only programme coordinators and administrators can perform this action",
    });
  }
}

/**
 * Assert user can view all reviewers
 * @throws TRPCError if permission denied
 */
export function assertCanViewAllReviewers(session: Session | null): void {
  if (!canViewAllReviewers(session)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to view reviewer profiles",
    });
  }
}

/**
 * Assert user can edit a specific reviewer profile
 * @throws TRPCError if permission denied
 */
export function assertCanEditReviewer(
  session: Session | null,
  reviewerUserId: string
): void {
  if (!canEditReviewer(session, reviewerUserId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to edit this reviewer profile",
    });
  }
}

/**
 * Assert user can view a specific reviewer profile
 * @throws TRPCError if permission denied
 */
export function assertCanViewReviewer(
  session: Session | null,
  reviewerUserId: string
): void {
  if (!canViewReviewer(session, reviewerUserId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to view this reviewer profile",
    });
  }
}

/**
 * Assert user can manage COI for a reviewer
 * @throws TRPCError if permission denied
 */
export function assertCanManageCOI(
  session: Session | null,
  reviewerUserId: string,
  action: "declare" | "verify" | "delete"
): void {
  if (!canManageCOI(session, reviewerUserId, action)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have permission to ${action} conflicts of interest`,
    });
  }
}

/**
 * Assert user can nominate reviewers
 * @throws TRPCError if permission denied
 */
export function assertCanNominateReviewers(session: Session | null): void {
  if (!canNominateReviewers(session)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to nominate reviewers",
    });
  }
}

/**
 * Assert user can approve nominations
 * @throws TRPCError if permission denied
 */
export function assertCanApproveNominations(session: Session | null): void {
  if (!canApproveNominations(session)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to approve reviewer nominations",
    });
  }
}

// ============================================
// FIELD-LEVEL PERMISSIONS
// ============================================

/**
 * Fields that reviewers can edit on their own profile
 */
export const SELF_EDITABLE_FIELDS = [
  "currentPosition",
  "biography",
  "biographyFr",
  "preferredContactMethod",
  "alternativeEmail",
  "alternativePhone",
  "passportCountry",
  "visaCountries",
  "travelRestrictions",
] as const;

/**
 * Fields that only coordinators/admins can edit
 */
export const COORDINATOR_ONLY_FIELDS = [
  "status",
  "selectionStatus",
  "reviewerType",
  "isLeadQualified",
  "leadQualifiedAt",
  "certifiedAt",
  "selectedAt",
] as const;

/**
 * Check if a field can be edited by the user
 */
export function canEditField(
  session: Session | null,
  reviewerUserId: string,
  fieldName: string
): boolean {
  if (!session?.user?.role) return false;

  // Admins and coordinators can edit all fields
  if (COORDINATOR_ROLES.includes(session.user.role as UserRole)) {
    return true;
  }

  // Self-editing: only allowed fields
  if (session.user.id === reviewerUserId) {
    return (SELF_EDITABLE_FIELDS as readonly string[]).includes(fieldName);
  }

  return false;
}
