/**
 * Role-based Onboarding Tour Definitions
 *
 * Defines tour steps for different user types in the African ANSP Peer Review Programme.
 * Tours are customized based on user roles to highlight relevant features.
 */

import { UserRole } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface TourStep {
  /** Unique identifier for this step */
  id: string;
  /** CSS selector for the target element to highlight */
  targetSelector: string;
  /** Translation key for the step title */
  titleKey: string;
  /** Translation key for the step description */
  descriptionKey: string;
  /** Placement of the tooltip relative to the target */
  placement: "top" | "bottom" | "left" | "right" | "center";
  /** Route to navigate to before showing this step */
  route?: string;
  /** Action to perform on the target element */
  action?: "click" | "hover";
  /** Padding around the highlighted element */
  highlightPadding?: number;
  /** Whether this step is skippable */
  skippable?: boolean;
  /** Delay before showing this step (ms) */
  delay?: number;
}

export interface TourDefinition {
  /** Unique identifier for this tour */
  id: string;
  /** User roles this tour applies to */
  roles: UserRole[];
  /** Ordered list of tour steps */
  steps: TourStep[];
  /** Translation key for the tour name */
  nameKey?: string;
  /** Estimated duration in minutes */
  estimatedMinutes?: number;
}

// =============================================================================
// ANSP STAFF TOUR
// For: STAFF, SAFETY_MANAGER, QUALITY_MANAGER, ANSP_ADMIN
// =============================================================================

export const anspStaffTour: TourDefinition = {
  id: "ansp-staff",
  roles: ["STAFF", "SAFETY_MANAGER", "QUALITY_MANAGER", "ANSP_ADMIN"],
  nameKey: "onboarding.tours.anspStaff",
  estimatedMinutes: 3,
  steps: [
    {
      id: "welcome",
      targetSelector: "body",
      titleKey: "onboarding.welcome.title",
      descriptionKey: "onboarding.welcome.description",
      placement: "center",
    },
    {
      id: "sidebar",
      targetSelector: "[data-tour='sidebar']",
      titleKey: "onboarding.sidebar.title",
      descriptionKey: "onboarding.sidebar.description",
      placement: "right",
      highlightPadding: 8,
    },
    {
      id: "dashboard",
      targetSelector: "[data-tour='nav-dashboard']",
      titleKey: "onboarding.dashboard.title",
      descriptionKey: "onboarding.dashboard.description",
      placement: "right",
      route: "/dashboard",
    },
    {
      id: "questionnaires",
      targetSelector: "[data-tour='nav-questionnaires']",
      titleKey: "onboarding.questionnaires.title",
      descriptionKey: "onboarding.questionnaires.description",
      placement: "right",
    },
    {
      id: "assessments",
      targetSelector: "[data-tour='nav-assessments']",
      titleKey: "onboarding.assessments.title",
      descriptionKey: "onboarding.assessments.description",
      placement: "right",
      route: "/assessments",
    },
    {
      id: "findings",
      targetSelector: "[data-tour='nav-findings']",
      titleKey: "onboarding.findings.title",
      descriptionKey: "onboarding.findings.description",
      placement: "right",
    },
    {
      id: "caps",
      targetSelector: "[data-tour='nav-caps']",
      titleKey: "onboarding.caps.title",
      descriptionKey: "onboarding.caps.description",
      placement: "right",
    },
    {
      id: "training",
      targetSelector: "[data-tour='nav-training']",
      titleKey: "onboarding.training.title",
      descriptionKey: "onboarding.training.description",
      placement: "right",
    },
    {
      id: "settings",
      targetSelector: "[data-tour='nav-settings']",
      titleKey: "onboarding.settings.title",
      descriptionKey: "onboarding.settings.description",
      placement: "right",
    },
    {
      id: "complete",
      targetSelector: "body",
      titleKey: "onboarding.complete.title",
      descriptionKey: "onboarding.complete.description",
      placement: "center",
    },
  ],
};

// =============================================================================
// PEER REVIEWER TOUR
// For: PEER_REVIEWER, LEAD_REVIEWER, OBSERVER
// =============================================================================

export const peerReviewerTour: TourDefinition = {
  id: "peer-reviewer",
  roles: ["PEER_REVIEWER", "LEAD_REVIEWER", "OBSERVER"],
  nameKey: "onboarding.tours.peerReviewer",
  estimatedMinutes: 4,
  steps: [
    {
      id: "welcome",
      targetSelector: "body",
      titleKey: "onboarding.reviewer.welcome.title",
      descriptionKey: "onboarding.reviewer.welcome.description",
      placement: "center",
    },
    {
      id: "dashboard",
      targetSelector: "[data-tour='nav-dashboard']",
      titleKey: "onboarding.dashboard.title",
      descriptionKey: "onboarding.reviewer.dashboard.description",
      placement: "right",
      route: "/dashboard",
    },
    {
      id: "peer-reviews",
      targetSelector: "[data-tour='nav-reviews']",
      titleKey: "onboarding.peerReviews.title",
      descriptionKey: "onboarding.peerReviews.description",
      placement: "right",
      route: "/reviews",
    },
    {
      id: "review-workspace",
      targetSelector: "[data-tour='review-workspace']",
      titleKey: "onboarding.reviewWorkspace.title",
      descriptionKey: "onboarding.reviewWorkspace.description",
      placement: "bottom",
      skippable: true,
    },
    {
      id: "findings",
      targetSelector: "[data-tour='nav-findings']",
      titleKey: "onboarding.reviewer.findings.title",
      descriptionKey: "onboarding.reviewer.findings.description",
      placement: "right",
    },
    {
      id: "best-practices",
      targetSelector: "[data-tour='nav-best-practices']",
      titleKey: "onboarding.bestPractices.title",
      descriptionKey: "onboarding.bestPractices.description",
      placement: "right",
    },
    {
      id: "reviewers",
      targetSelector: "[data-tour='nav-reviewers']",
      titleKey: "onboarding.reviewers.title",
      descriptionKey: "onboarding.reviewers.description",
      placement: "right",
    },
    {
      id: "shortcuts",
      targetSelector: "[data-tour='keyboard-hint']",
      titleKey: "onboarding.shortcuts.title",
      descriptionKey: "onboarding.shortcuts.description",
      placement: "top",
      skippable: true,
    },
    {
      id: "complete",
      targetSelector: "body",
      titleKey: "onboarding.reviewer.complete.title",
      descriptionKey: "onboarding.reviewer.complete.description",
      placement: "center",
    },
  ],
};

// =============================================================================
// COORDINATOR & ADMIN TOUR
// For: PROGRAMME_COORDINATOR, STEERING_COMMITTEE, SYSTEM_ADMIN, SUPER_ADMIN
// =============================================================================

export const coordinatorTour: TourDefinition = {
  id: "coordinator",
  roles: ["PROGRAMME_COORDINATOR", "STEERING_COMMITTEE", "SYSTEM_ADMIN", "SUPER_ADMIN"],
  nameKey: "onboarding.tours.coordinator",
  estimatedMinutes: 5,
  steps: [
    {
      id: "welcome",
      targetSelector: "body",
      titleKey: "onboarding.coordinator.welcome.title",
      descriptionKey: "onboarding.coordinator.welcome.description",
      placement: "center",
    },
    {
      id: "dashboard",
      targetSelector: "[data-tour='nav-dashboard']",
      titleKey: "onboarding.coordinator.dashboard.title",
      descriptionKey: "onboarding.coordinator.dashboard.description",
      placement: "right",
      route: "/dashboard",
    },
    {
      id: "analytics",
      targetSelector: "[data-tour='nav-analytics']",
      titleKey: "onboarding.analytics.title",
      descriptionKey: "onboarding.analytics.description",
      placement: "right",
      route: "/analytics",
    },
    {
      id: "peer-reviews",
      targetSelector: "[data-tour='nav-reviews']",
      titleKey: "onboarding.coordinator.peerReviews.title",
      descriptionKey: "onboarding.coordinator.peerReviews.description",
      placement: "right",
    },
    {
      id: "teams",
      targetSelector: "[data-tour='nav-teams']",
      titleKey: "onboarding.teams.title",
      descriptionKey: "onboarding.teams.description",
      placement: "right",
    },
    {
      id: "organizations",
      targetSelector: "[data-tour='nav-organizations']",
      titleKey: "onboarding.organizations.title",
      descriptionKey: "onboarding.organizations.description",
      placement: "right",
    },
    {
      id: "reviewers",
      targetSelector: "[data-tour='nav-reviewers']",
      titleKey: "onboarding.coordinator.reviewers.title",
      descriptionKey: "onboarding.coordinator.reviewers.description",
      placement: "right",
    },
    {
      id: "workflow",
      targetSelector: "[data-tour='nav-workflow']",
      titleKey: "onboarding.workflow.title",
      descriptionKey: "onboarding.workflow.description",
      placement: "right",
      skippable: true,
    },
    {
      id: "shortcuts",
      targetSelector: "[data-tour='keyboard-hint']",
      titleKey: "onboarding.shortcuts.title",
      descriptionKey: "onboarding.shortcuts.description",
      placement: "top",
      skippable: true,
    },
    {
      id: "complete",
      targetSelector: "body",
      titleKey: "onboarding.coordinator.complete.title",
      descriptionKey: "onboarding.coordinator.complete.description",
      placement: "center",
    },
  ],
};

// =============================================================================
// ALL TOURS
// =============================================================================

export const ALL_TOURS: TourDefinition[] = [
  anspStaffTour,
  peerReviewerTour,
  coordinatorTour,
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the appropriate tour for a user's role
 */
export function getTourForRole(role: UserRole): TourDefinition {
  // Check coordinator tour first (highest privilege)
  if (coordinatorTour.roles.includes(role)) {
    return coordinatorTour;
  }

  // Check peer reviewer tour
  if (peerReviewerTour.roles.includes(role)) {
    return peerReviewerTour;
  }

  // Default to ANSP staff tour
  return anspStaffTour;
}

/**
 * Get a tour by its ID
 */
export function getTourById(tourId: string): TourDefinition | undefined {
  return ALL_TOURS.find((t) => t.id === tourId);
}

/**
 * Get a specific step from a tour
 */
export function getStepFromTour(
  tourId: string,
  stepId: string
): TourStep | undefined {
  const tour = getTourById(tourId);
  return tour?.steps.find((s) => s.id === stepId);
}

/**
 * Get the next step in a tour after the current step
 */
export function getNextStep(
  tourId: string,
  currentStepId: string
): TourStep | undefined {
  const tour = getTourById(tourId);
  if (!tour) return undefined;

  const currentIndex = tour.steps.findIndex((s) => s.id === currentStepId);
  if (currentIndex === -1 || currentIndex >= tour.steps.length - 1) {
    return undefined;
  }

  return tour.steps[currentIndex + 1];
}

/**
 * Get the previous step in a tour before the current step
 */
export function getPreviousStep(
  tourId: string,
  currentStepId: string
): TourStep | undefined {
  const tour = getTourById(tourId);
  if (!tour) return undefined;

  const currentIndex = tour.steps.findIndex((s) => s.id === currentStepId);
  if (currentIndex <= 0) {
    return undefined;
  }

  return tour.steps[currentIndex - 1];
}

/**
 * Calculate progress through a tour
 */
export function getTourProgress(
  tourId: string,
  completedStepIds: string[]
): { completed: number; total: number; percentage: number } {
  const tour = getTourById(tourId);
  if (!tour) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const total = tour.steps.length;
  const completed = tour.steps.filter((s) =>
    completedStepIds.includes(s.id)
  ).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Check if a tour is complete
 */
export function isTourComplete(
  tourId: string,
  completedStepIds: string[]
): boolean {
  const tour = getTourById(tourId);
  if (!tour) return false;

  // Tour is complete if the last step is in completedStepIds
  const lastStep = tour.steps[tour.steps.length - 1];
  return completedStepIds.includes(lastStep.id);
}
