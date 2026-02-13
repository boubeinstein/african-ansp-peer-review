import { UserRole } from "@/types/prisma-enums";
import {
  LayoutDashboard,
  BarChart3,
  ClipboardCheck,
  Users,
  Search,
  Building2,
  GraduationCap,
  Settings,
  UserCog,
  Lightbulb,
  Server,
  type LucideIcon,
} from "lucide-react";
import { hasPermission, type Feature } from "./permissions";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  feature: Feature;
  badge?: number;
  section?: "main" | "admin";
  /** Custom active-state matcher for merged navigation items */
  isActive?: (pathname: string) => boolean;
}

/**
 * All possible navigation items — 8 main + 3 admin
 *
 * Merged from the previous 17-item list to align with
 * the ICAO USOAP CMA audit lifecycle.
 */
const allNavItems: NavItem[] = [
  // ── Main section ──────────────────────────────────────
  {
    name: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    feature: "dashboard",
  },
  {
    name: "programmeIntelligence",
    href: "/analytics",
    icon: BarChart3,
    feature: "analytics",
    isActive: (path) =>
      path.includes("/analytics") || path.includes("/safety-intelligence"),
  },
  {
    name: "questionnairesAssessments",
    href: "/assessments",
    icon: ClipboardCheck,
    feature: "assessments",
    isActive: (path) =>
      path.includes("/assessments") || path.includes("/questionnaires"),
  },
  {
    name: "peerReviews",
    href: "/reviews",
    icon: Search,
    feature: "peerReviews",
    isActive: (path) =>
      path.includes("/reviews") ||
      path.includes("/findings") ||
      path.includes("/caps"),
  },
  {
    name: "knowledgeBase",
    href: "/knowledge",
    icon: Lightbulb,
    feature: "bestPractices",
    isActive: (path) =>
      path.includes("/knowledge") ||
      path.includes("/best-practices") ||
      path.includes("/lessons"),
  },
  {
    name: "reviewerPool",
    href: "/reviewers",
    icon: Users,
    feature: "reviewers",
    isActive: (path) =>
      path.includes("/reviewers") || path.includes("/teams"),
  },
  {
    name: "training",
    href: "/training",
    icon: GraduationCap,
    feature: "training",
  },
  {
    name: "settings",
    href: "/settings",
    icon: Settings,
    feature: "settings",
  },

  // ── Administration section ────────────────────────────
  {
    name: "organizationsMembership",
    href: "/organizations",
    icon: Building2,
    feature: "organizations",
    section: "admin",
    isActive: (path) =>
      path.includes("/organizations") || path.includes("/join-requests"),
  },
  {
    name: "userManagement",
    href: "/admin/users",
    icon: UserCog,
    feature: "admin.users",
    section: "admin",
    isActive: (path) =>
      path.includes("/admin/users") || path.includes("/admin/roles"),
  },
  {
    name: "systemAdmin",
    href: "/admin/sessions",
    icon: Server,
    feature: "admin.sessions",
    section: "admin",
    isActive: (path) =>
      path.includes("/admin/sessions") || path.includes("/audit-logs"),
  },
];

/**
 * Get navigation items for a specific role
 */
export function getNavigationForRole(role: UserRole): NavItem[] {
  return allNavItems.filter((item) => hasPermission(role, item.feature));
}

/**
 * Get all navigation items (for admin reference)
 */
export function getAllNavItems(): NavItem[] {
  return allNavItems;
}
