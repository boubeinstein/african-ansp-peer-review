"use client";

import { useSession } from "next-auth/react";
import { UserRole } from "@/types/prisma-enums";
import {
  hasPermission,
  hasAnyPermission,
  ADMIN_ROLES,
  PARTICIPANT_ROLES,
  REVIEWER_ROLES,
  type Feature,
} from "@/lib/rbac";

/**
 * Hook for checking user permissions
 */
export function usePermission() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;

  return {
    /**
     * Check if user can access a specific feature
     */
    can: (feature: Feature) => (role ? hasPermission(role, feature) : false),

    /**
     * Check if user can access any of the specified features
     */
    canAny: (features: Feature[]) =>
      role ? hasAnyPermission(role, features) : false,

    /**
     * Current user's role
     */
    role,

    /**
     * Check if user is an admin (SUPER_ADMIN, SYSTEM_ADMIN, PROGRAMME_COORDINATOR)
     */
    isAdmin: role ? ADMIN_ROLES.includes(role) : false,

    /**
     * Check if user is a participant (ANSP staff)
     */
    isParticipant: role ? PARTICIPANT_ROLES.includes(role) : false,

    /**
     * Check if user is a reviewer
     */
    isReviewer: role ? REVIEWER_ROLES.includes(role) : false,

    /**
     * Check if user is logged in
     */
    isAuthenticated: !!session?.user,
  };
}
