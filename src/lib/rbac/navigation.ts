import { UserRole } from "@prisma/client";
import {
  LayoutDashboard,
  ClipboardList,
  FileCheck,
  Users,
  Search,
  AlertTriangle,
  CheckSquare,
  Building2,
  UserPlus,
  GraduationCap,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { hasPermission, type Feature } from "./permissions";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  feature: Feature;
  badge?: number;
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
    name: "reviewers",
    href: "/reviewers",
    icon: Users,
    feature: "reviewers",
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
