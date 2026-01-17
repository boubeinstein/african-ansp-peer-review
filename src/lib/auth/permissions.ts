import { UserRole } from "@prisma/client";

export type Permission =
  | "users:read" | "users:create" | "users:update" | "users:delete"
  | "organizations:read" | "organizations:create" | "organizations:update" | "organizations:delete"
  | "questionnaires:read" | "questionnaires:create" | "questionnaires:update" | "questionnaires:delete"
  | "assessments:read" | "assessments:create" | "assessments:update" | "assessments:delete" | "assessments:submit"
  | "reviews:read" | "reviews:create" | "reviews:update" | "reviews:delete" | "reviews:assign-team" | "reviews:approve"
  | "findings:read" | "findings:create" | "findings:update" | "findings:delete"
  | "cap:read" | "cap:create" | "cap:update" | "cap:verify"
  | "reviewers:read" | "reviewers:create" | "reviewers:update" | "reviewers:delete"
  | "training:read" | "training:manage"
  | "reports:read" | "reports:export" | "analytics:read"
  | "system:admin" | "system:audit-logs";

export const rolePermissions: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "users:read", "users:create", "users:update", "users:delete",
    "organizations:read", "organizations:create", "organizations:update", "organizations:delete",
    "questionnaires:read", "questionnaires:create", "questionnaires:update", "questionnaires:delete",
    "assessments:read", "assessments:create", "assessments:update", "assessments:delete", "assessments:submit",
    "reviews:read", "reviews:create", "reviews:update", "reviews:delete", "reviews:assign-team", "reviews:approve",
    "findings:read", "findings:create", "findings:update", "findings:delete",
    "cap:read", "cap:create", "cap:update", "cap:verify",
    "reviewers:read", "reviewers:create", "reviewers:update", "reviewers:delete",
    "training:read", "training:manage",
    "reports:read", "reports:export", "analytics:read",
    "system:admin", "system:audit-logs",
  ],
  SYSTEM_ADMIN: [
    "users:read", "users:create", "users:update",
    "organizations:read", "organizations:create", "organizations:update",
    "questionnaires:read", "questionnaires:create", "questionnaires:update",
    "assessments:read", "reviews:read", "findings:read", "cap:read",
    "reviewers:read", "reviewers:create", "reviewers:update",
    "training:read", "training:manage",
    "reports:read", "reports:export", "analytics:read",
    "system:admin", "system:audit-logs",
  ],
  STEERING_COMMITTEE: [
    "users:read", "organizations:read", "questionnaires:read",
    "assessments:read", "reviews:read", "reviews:approve",
    "findings:read", "cap:read", "reviewers:read", "training:read",
    "reports:read", "reports:export", "analytics:read",
  ],
  PROGRAMME_COORDINATOR: [
    "users:read", "users:create", "users:update", "organizations:read",
    "questionnaires:read", "assessments:read",
    "reviews:read", "reviews:create", "reviews:update", "reviews:assign-team",
    "findings:read", "cap:read", "reviewers:read", "reviewers:update",
    "training:read", "reports:read", "reports:export", "analytics:read",
  ],
  LEAD_REVIEWER: [
    "organizations:read", "questionnaires:read", "assessments:read",
    "reviews:read", "reviews:update",
    "findings:read", "findings:create", "findings:update",
    "cap:read", "cap:verify", "reviewers:read", "training:read",
    "reports:read", "reports:export",
  ],
  PEER_REVIEWER: [
    "organizations:read", "questionnaires:read", "assessments:read",
    "reviews:read", "findings:read", "findings:create",
    "cap:read", "reviewers:read", "training:read", "reports:read",
  ],
  OBSERVER: [
    "questionnaires:read", "assessments:read", "reviews:read",
    "findings:read", "training:read",
  ],
  ANSP_ADMIN: [
    "users:read", "users:create", "users:update", "questionnaires:read",
    "assessments:read", "assessments:create", "assessments:update", "assessments:submit",
    "reviews:read", "findings:read",
    "cap:read", "cap:create", "cap:update",
    "training:read", "reports:read",
  ],
  SAFETY_MANAGER: [
    "questionnaires:read",
    "assessments:read", "assessments:create", "assessments:update", "assessments:submit",
    "reviews:read", "findings:read",
    "cap:read", "cap:create", "cap:update",
    "training:read", "reports:read",
  ],
  QUALITY_MANAGER: [
    "questionnaires:read",
    "assessments:read", "assessments:create", "assessments:update",
    "reviews:read", "findings:read",
    "cap:read", "cap:create", "cap:update",
    "training:read", "reports:read",
  ],
  STAFF: [
    "questionnaires:read", "assessments:read", "training:read",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function getPermissions(role: UserRole): Permission[] {
  return rolePermissions[role] ?? [];
}

// =============================================================================
// ASSESSMENT RBAC HELPERS
// =============================================================================

/**
 * Check if user can delete an assessment
 * Only DRAFT assessments can be permanently deleted
 */
export function canDeleteAssessment(
  userRole: UserRole,
  assessmentStatus: string,
  isOwner: boolean,
  isSameOrganization: boolean
): boolean {
  // Only DRAFT can be deleted
  if (assessmentStatus !== "DRAFT") {
    return false;
  }

  // SUPER_ADMIN and SYSTEM_ADMIN can delete any draft
  if (["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(userRole)) {
    return true;
  }

  // ANSP_ADMIN can delete from their organization
  if (userRole === "ANSP_ADMIN" && isSameOrganization) {
    return true;
  }

  // SAFETY_MANAGER, QUALITY_MANAGER can delete their own drafts
  if (["SAFETY_MANAGER", "QUALITY_MANAGER"].includes(userRole)) {
    return isOwner;
  }

  return false;
}

/**
 * Check if user can archive an assessment
 * SUBMITTED, UNDER_REVIEW, and COMPLETED assessments can be archived
 */
export function canArchiveAssessment(
  userRole: UserRole,
  assessmentStatus: string,
  isSameOrganization: boolean
): boolean {
  // Only certain statuses can be archived
  if (!["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(assessmentStatus)) {
    return false;
  }

  // SUPER_ADMIN and SYSTEM_ADMIN can archive any
  if (["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(userRole)) {
    return true;
  }

  // ANSP_ADMIN can archive from their organization
  if (userRole === "ANSP_ADMIN" && isSameOrganization) {
    return true;
  }

  return false;
}
