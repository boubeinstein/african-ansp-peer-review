import { UserRole } from "@prisma/client";
import {
  Shield,
  ShieldCheck,
  Users,
  Clipboard,
  UserCheck,
  Eye,
  Building,
  HeartPulse,
  CheckSquare,
  User,
  LucideIcon,
} from "lucide-react";

/**
 * Role Description Configuration
 *
 * Provides display metadata for each role including icons, colors,
 * and translation keys for the Roles Documentation page.
 */

export interface RoleDescription {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  color: string; // Tailwind color classes for icon container
  typicalUsers: string[]; // Translation keys
}

export const ROLE_DESCRIPTIONS: Record<UserRole, RoleDescription> = {
  SUPER_ADMIN: {
    titleKey: "superAdmin.title",
    descriptionKey: "superAdmin.description",
    icon: Shield,
    color: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400",
    typicalUsers: ["superAdmin.typical1"],
  },
  SYSTEM_ADMIN: {
    titleKey: "systemAdmin.title",
    descriptionKey: "systemAdmin.description",
    icon: ShieldCheck,
    color: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
    typicalUsers: ["systemAdmin.typical1"],
  },
  STEERING_COMMITTEE: {
    titleKey: "steeringCommittee.title",
    descriptionKey: "steeringCommittee.description",
    icon: Users,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
    typicalUsers: [
      "steeringCommittee.typical1",
      "steeringCommittee.typical2",
    ],
  },
  PROGRAMME_COORDINATOR: {
    titleKey: "programmeCoordinator.title",
    descriptionKey: "programmeCoordinator.description",
    icon: Clipboard,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
    typicalUsers: ["programmeCoordinator.typical1"],
  },
  LEAD_REVIEWER: {
    titleKey: "leadReviewer.title",
    descriptionKey: "leadReviewer.description",
    icon: UserCheck,
    color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-400",
    typicalUsers: ["leadReviewer.typical1"],
  },
  PEER_REVIEWER: {
    titleKey: "peerReviewer.title",
    descriptionKey: "peerReviewer.description",
    icon: UserCheck,
    color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950 dark:text-cyan-400",
    typicalUsers: ["peerReviewer.typical1"],
  },
  OBSERVER: {
    titleKey: "observer.title",
    descriptionKey: "observer.description",
    icon: Eye,
    color: "text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400",
    typicalUsers: ["observer.typical1"],
  },
  ANSP_ADMIN: {
    titleKey: "anspAdmin.title",
    descriptionKey: "anspAdmin.description",
    icon: Building,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400",
    typicalUsers: ["anspAdmin.typical1"],
  },
  SAFETY_MANAGER: {
    titleKey: "safetyManager.title",
    descriptionKey: "safetyManager.description",
    icon: HeartPulse,
    color: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
    typicalUsers: ["safetyManager.typical1"],
  },
  QUALITY_MANAGER: {
    titleKey: "qualityManager.title",
    descriptionKey: "qualityManager.description",
    icon: CheckSquare,
    color: "text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400",
    typicalUsers: ["qualityManager.typical1"],
  },
  STAFF: {
    titleKey: "staff.title",
    descriptionKey: "staff.description",
    icon: User,
    color: "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400",
    typicalUsers: ["staff.typical1"],
  },
};

/**
 * Order roles by hierarchy for display
 */
export const ROLES_BY_HIERARCHY: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
  "PROGRAMME_COORDINATOR",
  "LEAD_REVIEWER",
  "ANSP_ADMIN",
  "PEER_REVIEWER",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
  "OBSERVER",
  "STAFF",
];
