import { UserRole } from "@/types/prisma-enums";

/**
 * Enterprise User Role Management Permissions
 *
 * Defines RBAC permissions for user management aligned with ICAO governance structure.
 */

// =============================================================================
// ROLE HIERARCHY
// =============================================================================

/**
 * Define role hierarchy levels - higher number = higher authority
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  SYSTEM_ADMIN: 90,
  STEERING_COMMITTEE: 80,
  PROGRAMME_COORDINATOR: 70,
  LEAD_REVIEWER: 60,
  PEER_REVIEWER: 50,
  OBSERVER: 40,
  ANSP_ADMIN: 60,
  SAFETY_MANAGER: 50,
  QUALITY_MANAGER: 50,
  STAFF: 30,
};

// =============================================================================
// ASSIGNABLE ROLES
// =============================================================================

/**
 * Which roles each role can assign to others
 */
export const ASSIGNABLE_ROLES: Record<UserRole, UserRole[]> = {
  SUPER_ADMIN: Object.values(UserRole), // Can assign any role
  SYSTEM_ADMIN: [
    UserRole.STEERING_COMMITTEE,
    UserRole.PROGRAMME_COORDINATOR,
    UserRole.LEAD_REVIEWER,
    UserRole.PEER_REVIEWER,
    UserRole.OBSERVER,
    UserRole.ANSP_ADMIN,
    UserRole.SAFETY_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.STAFF,
  ],
  STEERING_COMMITTEE: [], // Cannot manage users
  PROGRAMME_COORDINATOR: [
    UserRole.LEAD_REVIEWER,
    UserRole.PEER_REVIEWER,
    UserRole.OBSERVER,
  ],
  LEAD_REVIEWER: [],
  PEER_REVIEWER: [],
  OBSERVER: [],
  ANSP_ADMIN: [
    UserRole.SAFETY_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.STAFF,
  ], // Own org only
  SAFETY_MANAGER: [UserRole.STAFF], // Own org only
  QUALITY_MANAGER: [UserRole.STAFF], // Own org only
  STAFF: [],
};

// =============================================================================
// CRUD PERMISSIONS
// =============================================================================

export type ReadPermission = "all" | "own_org" | "self" | "none";
export type UpdatePermission = "all" | "own_org" | "self" | "none";
export type DeletePermission = "all" | "own_org" | "none";
export type RoleChangePermission = "all" | "lower_hierarchy" | "own_org_limited" | "none";
export type DeactivatePermission = "all" | "own_org" | "none";
export type ResetPasswordPermission = "all" | "own_org" | "self" | "none";

export interface UserCrudPermissions {
  canCreate: boolean;
  canRead: ReadPermission;
  canUpdate: UpdatePermission;
  canDelete: DeletePermission;
  canChangeRole: RoleChangePermission;
  canDeactivate: DeactivatePermission;
  canResetPassword: ResetPasswordPermission;
}

export const USER_CRUD_PERMISSIONS: Record<UserRole, UserCrudPermissions> = {
  SUPER_ADMIN: {
    canCreate: true,
    canRead: "all",
    canUpdate: "all",
    canDelete: "all",
    canChangeRole: "all",
    canDeactivate: "all",
    canResetPassword: "all",
  },
  SYSTEM_ADMIN: {
    canCreate: true,
    canRead: "all",
    canUpdate: "all",
    canDelete: "none", // Cannot delete, only deactivate
    canChangeRole: "lower_hierarchy",
    canDeactivate: "all",
    canResetPassword: "all",
  },
  STEERING_COMMITTEE: {
    canCreate: false,
    canRead: "all",
    canUpdate: "self",
    canDelete: "none",
    canChangeRole: "none",
    canDeactivate: "none",
    canResetPassword: "self",
  },
  PROGRAMME_COORDINATOR: {
    canCreate: true, // Can create reviewers
    canRead: "all",
    canUpdate: "self",
    canDelete: "none",
    canChangeRole: "own_org_limited", // Only reviewer roles
    canDeactivate: "none",
    canResetPassword: "self",
  },
  ANSP_ADMIN: {
    canCreate: true, // Own org only
    canRead: "own_org",
    canUpdate: "own_org",
    canDelete: "none",
    canChangeRole: "own_org_limited",
    canDeactivate: "own_org",
    canResetPassword: "own_org",
  },
  SAFETY_MANAGER: {
    canCreate: false,
    canRead: "own_org",
    canUpdate: "self",
    canDelete: "none",
    canChangeRole: "none",
    canDeactivate: "none",
    canResetPassword: "self",
  },
  QUALITY_MANAGER: {
    canCreate: false,
    canRead: "own_org",
    canUpdate: "self",
    canDelete: "none",
    canChangeRole: "none",
    canDeactivate: "none",
    canResetPassword: "self",
  },
  LEAD_REVIEWER: {
    canCreate: false,
    canRead: "own_org",
    canUpdate: "self",
    canDelete: "none",
    canChangeRole: "none",
    canDeactivate: "none",
    canResetPassword: "self",
  },
  PEER_REVIEWER: {
    canCreate: false,
    canRead: "own_org",
    canUpdate: "self",
    canDelete: "none",
    canChangeRole: "none",
    canDeactivate: "none",
    canResetPassword: "self",
  },
  OBSERVER: {
    canCreate: false,
    canRead: "own_org",
    canUpdate: "self",
    canDelete: "none",
    canChangeRole: "none",
    canDeactivate: "none",
    canResetPassword: "self",
  },
  STAFF: {
    canCreate: false,
    canRead: "self",
    canUpdate: "self",
    canDelete: "none",
    canChangeRole: "none",
    canDeactivate: "none",
    canResetPassword: "self",
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if actor can manage (update) a target user
 */
export function canManageUser(
  actorRole: UserRole,
  actorOrgId: string | null,
  targetRole: UserRole,
  targetOrgId: string | null
): boolean {
  const permissions = USER_CRUD_PERMISSIONS[actorRole];

  if (permissions.canUpdate === "all") return true;
  if (permissions.canUpdate === "own_org") {
    return actorOrgId !== null && actorOrgId === targetOrgId;
  }
  return false;
}

/**
 * Check if actor can read a target user's data
 */
export function canReadUser(
  actorRole: UserRole,
  actorId: string,
  actorOrgId: string | null,
  targetId: string,
  targetOrgId: string | null
): boolean {
  const permissions = USER_CRUD_PERMISSIONS[actorRole];

  if (permissions.canRead === "all") return true;
  if (permissions.canRead === "own_org") {
    return actorOrgId !== null && actorOrgId === targetOrgId;
  }
  if (permissions.canRead === "self") {
    return actorId === targetId;
  }
  return false;
}

/**
 * Check if actor can assign a specific role to a target user
 */
export function canAssignRole(
  actorRole: UserRole,
  actorOrgId: string | null,
  targetRole: UserRole,
  targetOrgId: string | null,
  newRole: UserRole
): boolean {
  const assignable = ASSIGNABLE_ROLES[actorRole];
  if (!assignable.includes(newRole)) return false;

  // ANSP roles can only change roles within own org
  if (
    actorRole === UserRole.ANSP_ADMIN ||
    actorRole === UserRole.SAFETY_MANAGER ||
    actorRole === UserRole.QUALITY_MANAGER
  ) {
    return actorOrgId !== null && actorOrgId === targetOrgId;
  }

  // Check hierarchy - cannot promote to equal or higher level (except SUPER_ADMIN)
  if (ROLE_HIERARCHY[newRole] >= ROLE_HIERARCHY[actorRole]) {
    return actorRole === UserRole.SUPER_ADMIN;
  }

  return true;
}

/**
 * Get list of roles that an actor can assign to a user in a target org
 */
export function getAssignableRolesForActor(
  actorRole: UserRole,
  actorOrgId: string | null,
  targetOrgId: string | null
): UserRole[] {
  const baseRoles = ASSIGNABLE_ROLES[actorRole];

  // ANSP roles can only assign within own org
  if (
    (actorRole === UserRole.ANSP_ADMIN ||
      actorRole === UserRole.SAFETY_MANAGER ||
      actorRole === UserRole.QUALITY_MANAGER) &&
    actorOrgId !== targetOrgId
  ) {
    return [];
  }

  return baseRoles;
}

/**
 * Check if actor can deactivate a target user
 */
export function canDeactivateUser(
  actorRole: UserRole,
  actorId: string,
  actorOrgId: string | null,
  targetId: string,
  targetOrgId: string | null
): boolean {
  // Cannot deactivate self
  if (actorId === targetId) return false;

  const permissions = USER_CRUD_PERMISSIONS[actorRole];

  if (permissions.canDeactivate === "all") return true;
  if (permissions.canDeactivate === "own_org") {
    return actorOrgId !== null && actorOrgId === targetOrgId;
  }
  return false;
}

/**
 * Check if actor can delete a target user
 */
export function canDeleteUser(
  actorRole: UserRole,
  actorId: string,
  actorOrgId: string | null,
  targetId: string,
  targetOrgId: string | null
): boolean {
  // Cannot delete self
  if (actorId === targetId) return false;

  const permissions = USER_CRUD_PERMISSIONS[actorRole];

  if (permissions.canDelete === "all") return true;
  if (permissions.canDelete === "own_org") {
    return actorOrgId !== null && actorOrgId === targetOrgId;
  }
  return false;
}

/**
 * Check if actor can reset password for a target user
 */
export function canResetPassword(
  actorRole: UserRole,
  actorId: string,
  actorOrgId: string | null,
  targetId: string,
  targetOrgId: string | null
): boolean {
  const permissions = USER_CRUD_PERMISSIONS[actorRole];

  if (permissions.canResetPassword === "all") return true;
  if (permissions.canResetPassword === "own_org") {
    return actorOrgId !== null && actorOrgId === targetOrgId;
  }
  if (permissions.canResetPassword === "self") {
    return actorId === targetId;
  }
  return false;
}

/**
 * Get human-readable role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Administrator",
    SYSTEM_ADMIN: "System Administrator",
    STEERING_COMMITTEE: "Steering Committee",
    PROGRAMME_COORDINATOR: "Programme Coordinator",
    LEAD_REVIEWER: "Lead Reviewer",
    PEER_REVIEWER: "Peer Reviewer",
    OBSERVER: "Observer",
    ANSP_ADMIN: "ANSP Administrator",
    SAFETY_MANAGER: "Safety Manager",
    QUALITY_MANAGER: "Quality Manager",
    STAFF: "Staff",
  };
  return names[role] || role;
}

/**
 * Group roles by category for UI display
 */
export const ROLE_CATEGORIES = {
  system: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN] as UserRole[],
  programme: [
    UserRole.STEERING_COMMITTEE,
    UserRole.PROGRAMME_COORDINATOR,
  ] as UserRole[],
  reviewer: [
    UserRole.LEAD_REVIEWER,
    UserRole.PEER_REVIEWER,
    UserRole.OBSERVER,
  ] as UserRole[],
  organization: [
    UserRole.ANSP_ADMIN,
    UserRole.SAFETY_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.STAFF,
  ] as UserRole[],
};
