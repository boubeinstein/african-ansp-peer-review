/**
 * Dashboard Configuration
 *
 * Defines role-based stat card configurations, quick actions,
 * and dashboard layout settings for the AAPRP dashboard.
 */

import { UserRole } from "@/types/prisma-enums";
import {
  Building2,
  Users,
  AlertTriangle,
  Clock,
  ClipboardList,
  Search,
  AlertCircle,
  ClipboardCheck,
  Loader,
  CheckCircle,
  FileText,
  Gauge,
  FileCheck,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface StatCardConfig {
  id: string;
  titleKey: string;
  icon: LucideIcon;
  colorScheme: "blue" | "green" | "amber" | "red" | "purple" | "slate" | "dynamic";
  valueKey: string;
  subtitleKey?: string;
  linkTo?: string;
  /** For dynamic colors: function to determine color based on value */
  getColor?: (value: number) => "blue" | "green" | "amber" | "red";
}

export interface QuickActionConfig {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  href: string;
  roles: UserRole[];
}

export type RoleCategory = "PROGRAMME_ADMIN" | "COORDINATOR" | "REVIEWER" | "ANSP" | "LIMITED";

// =============================================================================
// ROLE CATEGORY MAPPING
// =============================================================================

const PROGRAMME_ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
];

const COORDINATOR_ROLES: UserRole[] = ["PROGRAMME_COORDINATOR"];

const REVIEWER_ROLES: UserRole[] = ["LEAD_REVIEWER", "PEER_REVIEWER"];

const ANSP_ROLES: UserRole[] = ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"];

export function getRoleCategory(role: UserRole): RoleCategory {
  if (PROGRAMME_ADMIN_ROLES.includes(role)) return "PROGRAMME_ADMIN";
  if (COORDINATOR_ROLES.includes(role)) return "COORDINATOR";
  if (REVIEWER_ROLES.includes(role)) return "REVIEWER";
  if (ANSP_ROLES.includes(role)) return "ANSP";
  return "LIMITED";
}

// =============================================================================
// STAT CARD CONFIGURATIONS BY ROLE CATEGORY
// =============================================================================

/**
 * Programme Admin (SUPER_ADMIN, SYSTEM_ADMIN, STEERING_COMMITTEE)
 */
export const PROGRAMME_ADMIN_CARDS: StatCardConfig[] = [
  {
    id: "total-ansps",
    titleKey: "totalAnsps",
    icon: Building2,
    colorScheme: "blue",
    valueKey: "totalAnsps",
    subtitleKey: "acrossAfrica",
    linkTo: "/organizations",
  },
  {
    id: "active-participants",
    titleKey: "activeParticipants",
    icon: Users,
    colorScheme: "green",
    valueKey: "activeParticipants",
    subtitleKey: "registeredUsers",
    linkTo: "/admin/users",
  },
  {
    id: "open-findings",
    titleKey: "openFindings",
    icon: AlertTriangle,
    colorScheme: "dynamic",
    valueKey: "openFindings",
    subtitleKey: "requireAttention",
    linkTo: "/findings",
    getColor: (value) => (value > 0 ? "amber" : "green"),
  },
  {
    id: "overdue-caps",
    titleKey: "overdueCAPs",
    icon: Clock,
    colorScheme: "dynamic",
    valueKey: "overdueCaps",
    subtitleKey: "pastDeadline",
    linkTo: "/caps?filter=overdue",
    getColor: (value) => (value > 0 ? "red" : "green"),
  },
];

/**
 * Programme Coordinator
 */
export const COORDINATOR_CARDS: StatCardConfig[] = [
  {
    id: "reviews-coordinating",
    titleKey: "reviewsCoordinating",
    icon: ClipboardList,
    colorScheme: "blue",
    valueKey: "reviewsTotal",
    subtitleKey: "totalReviews",
    linkTo: "/reviews",
  },
  {
    id: "pending-team-assignments",
    titleKey: "pendingTeamAssignments",
    icon: Users,
    colorScheme: "dynamic",
    valueKey: "pendingTeamAssignments",
    subtitleKey: "needTeams",
    linkTo: "/reviews?filter=pending-team",
    getColor: (value) => (value > 0 ? "amber" : "green"),
  },
  {
    id: "findings-under-review",
    titleKey: "findingsUnderReview",
    icon: Search,
    colorScheme: "slate",
    valueKey: "findingsAwaitingReview",
    subtitleKey: "awaitingReview",
    linkTo: "/findings?filter=pending",
  },
  {
    id: "caps-requiring-action",
    titleKey: "capsRequiringAction",
    icon: AlertCircle,
    colorScheme: "dynamic",
    valueKey: "capsOverdue",
    subtitleKey: "needsAttention",
    linkTo: "/caps?filter=action-required",
    getColor: (value) => (value > 0 ? "red" : "amber"),
  },
];

/**
 * Reviewers (LEAD_REVIEWER, PEER_REVIEWER)
 */
export const REVIEWER_CARDS: StatCardConfig[] = [
  {
    id: "assigned-reviews",
    titleKey: "myAssignedReviews",
    icon: ClipboardCheck,
    colorScheme: "blue",
    valueKey: "totalAssigned",
    subtitleKey: "assignedToMe",
    linkTo: "/reviews?filter=my-reviews",
  },
  {
    id: "in-progress",
    titleKey: "inProgress",
    icon: Loader,
    colorScheme: "amber",
    valueKey: "inProgress",
    subtitleKey: "currentlyActive",
    linkTo: "/reviews?filter=in-progress",
  },
  {
    id: "findings-raised",
    titleKey: "findingsRaised",
    icon: AlertTriangle,
    colorScheme: "slate",
    valueKey: "findingsRaised",
    subtitleKey: "byMe",
    linkTo: "/findings?filter=raised-by-me",
  },
  {
    id: "completed-reviews",
    titleKey: "completedReviews",
    icon: CheckCircle,
    colorScheme: "green",
    valueKey: "completed",
    subtitleKey: "thisYear",
    linkTo: "/reviews?filter=completed",
  },
];

/**
 * ANSP Roles (ANSP_ADMIN, SAFETY_MANAGER, QUALITY_MANAGER)
 */
export const ANSP_CARDS: StatCardConfig[] = [
  {
    id: "our-assessments",
    titleKey: "ourAssessments",
    icon: FileText,
    colorScheme: "blue",
    valueKey: "totalAssessments",
    subtitleKey: "selfAssessments",
    linkTo: "/assessments",
  },
  {
    id: "latest-ei-score",
    titleKey: "latestEIScore",
    icon: Gauge,
    colorScheme: "dynamic",
    valueKey: "latestEIScore",
    subtitleKey: "effectivenessIndex",
    linkTo: "/assessments?filter=completed",
    getColor: (value) => {
      if (value >= 80) return "green";
      if (value >= 60) return "amber";
      return "red";
    },
  },
  {
    id: "open-findings",
    titleKey: "openFindings",
    icon: AlertTriangle,
    colorScheme: "dynamic",
    valueKey: "openFindings",
    subtitleKey: "fromReviews",
    linkTo: "/findings",
    getColor: (value) => (value > 0 ? "amber" : "green"),
  },
  {
    id: "active-caps",
    titleKey: "activeCAPs",
    icon: ClipboardList,
    colorScheme: "slate",
    valueKey: "activeCaps",
    subtitleKey: "inProgress",
    linkTo: "/caps",
  },
];

/**
 * Limited Roles (STAFF, OBSERVER)
 */
export const LIMITED_CARDS: StatCardConfig[] = [
  {
    id: "assessments-submitted",
    titleKey: "assessmentsSubmitted",
    icon: FileCheck,
    colorScheme: "blue",
    valueKey: "submittedAssessments",
    subtitleKey: "byOrganization",
    linkTo: "/assessments",
  },
  {
    id: "training-modules",
    titleKey: "trainingModules",
    icon: GraduationCap,
    colorScheme: "green",
    valueKey: "trainingModulesAvailable",
    subtitleKey: "available",
    linkTo: "/training",
  },
];

/**
 * Get stat card configuration for a role category
 */
export function getStatCardsForRole(roleCategory: RoleCategory): StatCardConfig[] {
  switch (roleCategory) {
    case "PROGRAMME_ADMIN":
      return PROGRAMME_ADMIN_CARDS;
    case "COORDINATOR":
      return COORDINATOR_CARDS;
    case "REVIEWER":
      return REVIEWER_CARDS;
    case "ANSP":
      return ANSP_CARDS;
    case "LIMITED":
      return LIMITED_CARDS;
  }
}

// =============================================================================
// QUICK ACTIONS CONFIGURATION
// =============================================================================

export const QUICK_ACTIONS: QuickActionConfig[] = [
  // Programme Admin Actions
  {
    id: "manage-organizations",
    titleKey: "manageOrganizations",
    descriptionKey: "manageOrganizationsDesc",
    icon: Building2,
    href: "/organizations",
    roles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "STEERING_COMMITTEE"],
  },
  {
    id: "manage-users",
    titleKey: "manageUsers",
    descriptionKey: "manageUsersDesc",
    icon: Users,
    href: "/admin/users",
    roles: ["SUPER_ADMIN", "SYSTEM_ADMIN"],
  },
  // Coordinator Actions
  {
    id: "assign-teams",
    titleKey: "assignTeams",
    descriptionKey: "assignTeamsDesc",
    icon: Users,
    href: "/reviews?filter=pending-team",
    roles: ["PROGRAMME_COORDINATOR", "SUPER_ADMIN", "SYSTEM_ADMIN"],
  },
  {
    id: "schedule-review",
    titleKey: "scheduleReview",
    descriptionKey: "scheduleReviewDesc",
    icon: ClipboardList,
    href: "/reviews/new",
    roles: ["PROGRAMME_COORDINATOR", "SUPER_ADMIN", "SYSTEM_ADMIN"],
  },
  {
    id: "review-findings",
    titleKey: "reviewFindings",
    descriptionKey: "reviewFindingsDesc",
    icon: Search,
    href: "/findings",
    roles: ["PROGRAMME_COORDINATOR", "STEERING_COMMITTEE"],
  },
  // Reviewer Actions
  {
    id: "my-reviews",
    titleKey: "myReviews",
    descriptionKey: "myReviewsDesc",
    icon: ClipboardCheck,
    href: "/reviews?filter=my-reviews",
    roles: ["LEAD_REVIEWER", "PEER_REVIEWER"],
  },
  {
    id: "update-availability",
    titleKey: "updateAvailability",
    descriptionKey: "updateAvailabilityDesc",
    icon: Clock,
    href: "/reviewers/profile",
    roles: ["LEAD_REVIEWER", "PEER_REVIEWER"],
  },
  // ANSP Actions
  {
    id: "start-assessment",
    titleKey: "startAssessment",
    descriptionKey: "startAssessmentDesc",
    icon: FileText,
    href: "/assessments/new",
    roles: ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
  },
  {
    id: "view-findings",
    titleKey: "viewFindings",
    descriptionKey: "viewFindingsDesc",
    icon: AlertTriangle,
    href: "/findings",
    roles: ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
  },
  {
    id: "manage-caps",
    titleKey: "manageCaps",
    descriptionKey: "manageCapsDesc",
    icon: ClipboardList,
    href: "/caps",
    roles: ["ANSP_ADMIN", "SAFETY_MANAGER", "QUALITY_MANAGER"],
  },
  // Shared Actions
  {
    id: "training",
    titleKey: "training",
    descriptionKey: "trainingDesc",
    icon: GraduationCap,
    href: "/training",
    roles: [
      "LEAD_REVIEWER",
      "PEER_REVIEWER",
      "ANSP_ADMIN",
      "SAFETY_MANAGER",
      "QUALITY_MANAGER",
      "STAFF",
      "OBSERVER",
    ],
  },
];

/**
 * Get quick actions filtered by user role
 */
export function getQuickActionsForRole(role: UserRole): QuickActionConfig[] {
  return QUICK_ACTIONS.filter((action) => action.roles.includes(role));
}

// =============================================================================
// COLOR UTILITIES
// =============================================================================

export const COLOR_SCHEMES = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800/50",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
  },
} as const;

export type ColorScheme = keyof typeof COLOR_SCHEMES;

export function getColorClasses(scheme: ColorScheme) {
  return COLOR_SCHEMES[scheme];
}
