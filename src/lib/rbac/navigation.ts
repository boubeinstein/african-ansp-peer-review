import { UserRole } from "@/types/prisma-enums";
import {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  FileCheck,
  Users,
  UsersRound,
  Search,
  AlertTriangle,
  CheckSquare,
  Building2,
  UserPlus,
  GraduationCap,
  Settings,
  UserCog,
  ShieldCheck,
  ScrollText,
  Lightbulb,
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
}

/**
 * All possible navigation items
 */
const allNavItems: NavItem[] = [
  {
    name: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    feature: "dashboard",
  },
  {
    name: "analytics",
    href: "/analytics",
    icon: BarChart3,
    feature: "analytics",
  },
  {
    name: "questionnaires",
    href: "/questionnaires",
    icon: ClipboardList,
    feature: "questionnaires",
  },
  {
    name: "assessments",
    href: "/assessments",
    icon: FileCheck,
    feature: "assessments",
  },
  {
    name: "reviews",
    href: "/reviews",
    icon: Search,
    feature: "peerReviews",
  },
  {
    name: "findings",
    href: "/findings",
    icon: AlertTriangle,
    feature: "findings",
  },
  {
    name: "caps",
    href: "/caps",
    icon: CheckSquare,
    feature: "caps",
  },
  {
    name: "bestPractices",
    href: "/best-practices",
    icon: Lightbulb,
    feature: "bestPractices",
  },
  {
    name: "reviewers",
    href: "/reviewers",
    icon: Users,
    feature: "reviewers",
  },
  {
    name: "teams",
    href: "/teams",
    icon: UsersRound,
    feature: "teams",
  },
  {
    name: "organizations",
    href: "/organizations",
    icon: Building2,
    feature: "organizations",
  },
  {
    name: "joinRequests",
    href: "/join-requests",
    icon: UserPlus,
    feature: "joinRequests",
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
  // Admin section - only visible to system administrators
  {
    name: "adminUsers",
    href: "/admin/users",
    icon: UserCog,
    feature: "admin.users",
    section: "admin",
  },
  {
    name: "adminRoles",
    href: "/admin/roles",
    icon: ShieldCheck,
    feature: "admin.roles",
    section: "admin",
  },
  {
    name: "auditLogs",
    href: "/audit-logs",
    icon: ScrollText,
    feature: "admin.logs",
    section: "admin",
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
