import { UserRole } from "@/types/prisma-enums";

/**
 * Feature permissions for RBAC
 */
export type Feature =
  | "dashboard"
  | "dashboard.global"
  | "analytics"
  | "questionnaires"
  | "questionnaires.manage"
  | "assessments"
  | "assessments.all"
  | "assessments.own"
  | "assessments.assigned"
  | "peerReviews"
  | "peerReviews.all"
  | "peerReviews.own"
  | "peerReviews.assigned"
  | "peerReviews.schedule"
  | "findings"
  | "findings.all"
  | "findings.own"
  | "findings.assigned"
  | "findings.create"
  | "caps"
  | "caps.all"
  | "caps.own"
  | "caps.assigned"
  | "caps.create"
  | "reviewers"
  | "reviewers.all"
  | "reviewers.own"
  | "reviewers.edit"
  | "reviewers.editAny"
  | "reviewers.approve"
  | "teams"
  | "teams.all"
  | "teams.details"
  | "organizations"
  | "organizations.all"
  | "organizations.details"
  | "organizations.editOwn"
  | "organizations.editAny"
  | "joinRequests"
  | "joinRequests.coordinatorReview"
  | "joinRequests.scDecision"
  | "training"
  | "training.manage"
  | "settings"
  | "settings.system"
  | "settings.users"
  | "settings.usersOwn"
  | "bestPractices"
  | "lessons"
  | "admin"
  | "admin.users"
  | "admin.roles"
  | "admin.settings"
  | "admin.sessions"
  | "admin.logs";

/**
 * Permission matrix - defines what each role can access
 */
const permissions: Record<UserRole, Feature[]> = {
  SUPER_ADMIN: [
    "dashboard",
    "dashboard.global",
    "analytics",
    "bestPractices",
    "lessons",
    "questionnaires",
    "questionnaires.manage",
    "assessments",
    "assessments.all",
    "assessments.own",
    "peerReviews",
    "peerReviews.all",
    "peerReviews.own",
    "peerReviews.schedule",
    "findings",
    "findings.all",
    "findings.own",
    "findings.create",
    "caps",
    "caps.all",
    "caps.own",
    "caps.create",
    "reviewers",
    "reviewers.all",
    "reviewers.own",
    "reviewers.edit",
    "reviewers.editAny",
    "reviewers.approve",
    "teams",
    "teams.all",
    "organizations",
    "organizations.all",
    "organizations.details",
    "organizations.editOwn",
    "organizations.editAny",
    "joinRequests",
    "joinRequests.coordinatorReview",
    "joinRequests.scDecision",
    "training",
    "training.manage",
    "settings",
    "settings.system",
    "settings.users",
    "admin",
    "admin.users",
    "admin.roles",
    "admin.settings",
    "admin.sessions",
    "admin.logs",
  ],

  SYSTEM_ADMIN: [
    "dashboard",
    "dashboard.global",
    "analytics",
    "bestPractices",
    "lessons",
    "questionnaires",
    "questionnaires.manage",
    "assessments",
    "assessments.all",
    "assessments.own",
    "peerReviews",
    "peerReviews.all",
    "peerReviews.own",
    "peerReviews.schedule",
    "findings",
    "findings.all",
    "findings.own",
    "findings.create",
    "caps",
    "caps.all",
    "caps.own",
    "caps.create",
    "reviewers",
    "reviewers.all",
    "reviewers.own",
    "reviewers.edit",
    "reviewers.editAny",
    "reviewers.approve",
    "teams",
    "teams.all",
    "organizations",
    "organizations.all",
    "organizations.details",
    "organizations.editOwn",
    "organizations.editAny",
    "joinRequests",
    "joinRequests.coordinatorReview",
    "training",
    "training.manage",
    "settings",
    "settings.system",
    "settings.users",
    "admin",
    "admin.users",
    "admin.roles",
    "admin.settings",
    "admin.sessions",
    "admin.logs",
  ],

  PROGRAMME_COORDINATOR: [
    "dashboard",
    "dashboard.global",
    "analytics",
    "bestPractices",
    "lessons",
    "questionnaires",
    "questionnaires.manage",
    "assessments",
    "assessments.all",
    "assessments.own",
    "peerReviews",
    "peerReviews.all",
    "peerReviews.own",
    "peerReviews.schedule",
    "findings",
    "findings.all",
    "findings.own",
    "findings.create",
    "caps",
    "caps.all",
    "caps.own",
    "caps.create",
    "reviewers",
    "reviewers.all",
    "reviewers.own",
    "reviewers.edit",
    "reviewers.editAny",
    "reviewers.approve",
    "teams",
    "teams.all",
    "organizations",
    "organizations.all",
    "organizations.details",
    "organizations.editOwn",
    "organizations.editAny",
    "joinRequests",
    "joinRequests.coordinatorReview",
    "training",
    "training.manage",
    "settings",
    "settings.users",
    "admin",
    "admin.roles",
    "admin.logs",
  ],

  STEERING_COMMITTEE: [
    "dashboard",
    "dashboard.global",
    "analytics",
    "bestPractices",
    "lessons",
    "assessments",
    "assessments.all",
    "peerReviews",
    "peerReviews.all",
    "findings",
    "findings.all",
    "caps",
    "caps.all",
    "reviewers",
    "reviewers.all",
    "reviewers.approve",
    "teams",
    "teams.all",
    "organizations",
    "organizations.all",
    "organizations.details",
    "joinRequests",
    "joinRequests.scDecision",
    "settings",
    "admin",
    "admin.roles",
    "admin.logs",
  ],

  LEAD_REVIEWER: [
    "dashboard",
    "bestPractices",
    "lessons",
    "questionnaires",
    "assessments",
    "assessments.assigned",
    "peerReviews",
    "peerReviews.assigned",
    "findings",
    "findings.assigned",
    "findings.create",
    "caps",
    "caps.assigned",
    "reviewers",
    "reviewers.all",
    "reviewers.own",
    "reviewers.edit",
    "teams",
    "training",
    "settings",
  ],

  PEER_REVIEWER: [
    "dashboard",
    "bestPractices",
    "lessons",
    "questionnaires",
    "assessments",
    "assessments.assigned",
    "peerReviews",
    "peerReviews.assigned",
    "findings",
    "findings.assigned",
    "findings.create",
    "caps",
    "caps.assigned",
    "reviewers",
    "reviewers.all",
    "teams",
    "training",
    "settings",
  ],

  ANSP_ADMIN: [
    "dashboard",
    "bestPractices",
    "lessons",
    "questionnaires",
    "assessments",
    "assessments.own",
    "peerReviews",
    "peerReviews.own",
    "findings",
    "findings.own",
    "caps",
    "caps.own",
    "caps.create",
    "reviewers",
    "reviewers.all",
    "reviewers.own",
    "reviewers.edit",
    "teams.details",
    "organizations.details",
    "organizations.editOwn",
    "training",
    "settings",
    "settings.usersOwn",
  ],

  SAFETY_MANAGER: [
    "dashboard",
    "bestPractices",
    "lessons",
    "questionnaires",
    "assessments",
    "assessments.own",
    "findings",
    "findings.own",
    "caps",
    "caps.own",
    "caps.create",
    "teams.details",
    "training",
    "settings",
  ],

  QUALITY_MANAGER: [
    "dashboard",
    "bestPractices",
    "lessons",
    "questionnaires",
    "assessments",
    "assessments.own",
    "findings",
    "findings.own",
    "caps",
    "caps.own",
    "caps.create",
    "teams.details",
    "training",
    "settings",
  ],

  OBSERVER: [
    "dashboard",
    "dashboard.global",
    "bestPractices",
    "lessons",
    "assessments",
    "assessments.all",
    "peerReviews",
    "peerReviews.all",
    "findings",
    "findings.all",
    "caps",
    "caps.all",
    "reviewers",
    "reviewers.all",
    "teams",
    "teams.all",
    "settings",
  ],

  STAFF: [
    "dashboard",
    "bestPractices",
    "lessons",
    "questionnaires",
    "assessments",
    "assessments.own",
    "teams.details",
    "training",
    "settings",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, feature: Feature): boolean {
  return permissions[role]?.includes(feature) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, features: Feature[]): boolean {
  return features.some((feature) => hasPermission(role, feature));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): Feature[] {
  return permissions[role] ?? [];
}

/**
 * Admin roles that have elevated access
 */
export const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.PROGRAMME_COORDINATOR,
];

/**
 * Participant roles (ANSP staff)
 */
export const PARTICIPANT_ROLES: UserRole[] = [
  UserRole.ANSP_ADMIN,
  UserRole.SAFETY_MANAGER,
  UserRole.QUALITY_MANAGER,
  UserRole.STAFF,
];

/**
 * Reviewer roles
 */
export const REVIEWER_ROLES: UserRole[] = [
  UserRole.LEAD_REVIEWER,
  UserRole.PEER_REVIEWER,
];
