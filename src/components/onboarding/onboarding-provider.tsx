"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { trpc } from "@/lib/trpc/client";
import {
  getTourForRole,
  type TourStep,
  type TourDefinition,
} from "@/lib/onboarding";

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingContextType {
  // State
  isActive: boolean;
  currentStep: TourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  isLoading: boolean;
  hasCompletedTour: boolean;
  showTooltips: boolean;
  tour: TourDefinition | null;

  // Actions
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  endTour: (completed?: boolean) => void;
  resetTour: () => void;
  goToStep: (stepIndex: number) => void;
  setShowTooltips: (show: boolean) => void;
}

interface OnboardingProviderProps {
  children: ReactNode;
  userRole?: UserRole;
  locale?: string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const OnboardingContext = createContext<OnboardingContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export function OnboardingProvider({
  children,
  userRole,
  locale = "en",
}: OnboardingProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const utils = trpc.useUtils();

  // Only local state we need - whether the tour UI is showing
  const [isActive, setIsActive] = useState(false);

  // Compute tour based on user role (memoized)
  const tour = useMemo<TourDefinition | null>(() => {
    if (userRole) {
      return getTourForRole(userRole);
    }
    return null;
  }, [userRole]);

  // Fetch onboarding state from server
  const { data: onboardingState, isLoading } = trpc.onboarding.getState.useQuery(
    undefined,
    {
      enabled: !!userRole,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  // Derive step index from server state (source of truth)
  const currentStepIndex = useMemo(() => {
    if (onboardingState?.currentStep && tour) {
      const stepIndex = tour.steps.findIndex(
        (s) => s.id === onboardingState.currentStep
      );
      return stepIndex !== -1 ? stepIndex : 0;
    }
    return 0;
  }, [onboardingState, tour]);

  // Mutations
  const updateState = trpc.onboarding.updateState.useMutation({
    onSuccess: () => {
      utils.onboarding.getState.invalidate();
    },
  });

  const startTourMutation = trpc.onboarding.startTour.useMutation({
    onSuccess: () => {
      utils.onboarding.getState.invalidate();
    },
  });

  const completeTourMutation = trpc.onboarding.completeTour.useMutation({
    onSuccess: () => {
      utils.onboarding.getState.invalidate();
    },
  });

  const dismissTourMutation = trpc.onboarding.dismissTour.useMutation({
    onSuccess: () => {
      utils.onboarding.getState.invalidate();
    },
  });

  const resetTourMutation = trpc.onboarding.resetTour.useMutation({
    onSuccess: () => {
      utils.onboarding.getState.invalidate();
    },
  });

  const toggleTooltipsMutation = trpc.onboarding.toggleTooltips.useMutation({
    onSuccess: () => {
      utils.onboarding.getState.invalidate();
    },
  });

  const completeStepMutation = trpc.onboarding.completeStep.useMutation({
    onSuccess: () => {
      utils.onboarding.getState.invalidate();
    },
  });

  const skipStepMutation = trpc.onboarding.skipStep.useMutation({
    onSuccess: () => {
      utils.onboarding.getState.invalidate();
    },
  });

  // Auto-start for new users (only once)
  useEffect(() => {
    if (
      onboardingState?.showWelcome &&
      !onboardingState?.tourCompletedAt &&
      !onboardingState?.tourDismissedAt &&
      tour &&
      !isActive
    ) {
      // Small delay to let page render
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [onboardingState, tour, isActive]);

  // Computed values
  const currentStep = tour?.steps[currentStepIndex] ?? null;
  const totalSteps = tour?.steps.length ?? 0;
  const progress =
    totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0;
  const hasCompletedTour = !!onboardingState?.tourCompletedAt;
  const showTooltips = onboardingState?.showTooltips ?? true;

  // Navigate to a route if needed
  const navigateToRoute = useCallback(
    (route?: string) => {
      if (route) {
        const targetPath = `/${locale}${route}`;
        if (!pathname.startsWith(targetPath)) {
          router.push(targetPath);
        }
      }
    },
    [locale, pathname, router]
  );

  // Start tour
  const startTour = useCallback(() => {
    setIsActive(true);
    startTourMutation.mutate();

    // Navigate to first step's route if needed
    if (tour?.steps[0]?.route) {
      navigateToRoute(tour.steps[0].route);
    }
  }, [startTourMutation, tour, navigateToRoute]);

  // Next step
  const nextStep = useCallback(() => {
    if (!tour || !currentStep) return;

    const nextIndex = currentStepIndex + 1;

    // Mark current step complete
    completeStepMutation.mutate({ stepId: currentStep.id });

    if (nextIndex < tour.steps.length) {
      const nextStepDef = tour.steps[nextIndex];

      // Navigate if needed
      navigateToRoute(nextStepDef.route);

      // Update server state (this will trigger re-render with new step index)
      updateState.mutate({ currentStep: nextStepDef.id });
    } else {
      // Tour complete
      setIsActive(false);
      completeTourMutation.mutate();
    }
  }, [
    tour,
    currentStep,
    currentStepIndex,
    completeStepMutation,
    navigateToRoute,
    updateState,
    completeTourMutation,
  ]);

  // Previous step
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0 && tour) {
      const prevIndex = currentStepIndex - 1;
      const prevStepDef = tour.steps[prevIndex];

      navigateToRoute(prevStepDef?.route);
      updateState.mutate({ currentStep: prevStepDef?.id ?? null });
    }
  }, [currentStepIndex, tour, navigateToRoute, updateState]);

  // Skip step
  const skipStep = useCallback(() => {
    if (!currentStep) return;

    skipStepMutation.mutate({ stepId: currentStep.id });
    nextStep();
  }, [currentStep, skipStepMutation, nextStep]);

  // Go to specific step
  const goToStep = useCallback(
    (stepIndex: number) => {
      if (!tour || stepIndex < 0 || stepIndex >= tour.steps.length) return;

      const targetStep = tour.steps[stepIndex];
      navigateToRoute(targetStep.route);
      updateState.mutate({ currentStep: targetStep.id });
    },
    [tour, navigateToRoute, updateState]
  );

  // End tour
  const endTour = useCallback(
    (completed = false) => {
      setIsActive(false);

      if (completed) {
        completeTourMutation.mutate();
      } else {
        dismissTourMutation.mutate();
      }
    },
    [completeTourMutation, dismissTourMutation]
  );

  // Reset tour
  const resetTour = useCallback(() => {
    setIsActive(false);
    resetTourMutation.mutate();
  }, [resetTourMutation]);

  // Toggle tooltips
  const setShowTooltips = useCallback(
    (show: boolean) => {
      toggleTooltipsMutation.mutate({ show });
    },
    [toggleTooltipsMutation]
  );

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        currentStepIndex,
        totalSteps,
        progress,
        isLoading,
        hasCompletedTour,
        showTooltips,
        tour,
        startTour,
        nextStep,
        prevStep,
        skipStep,
        endTour,
        resetTour,
        goToStep,
        setShowTooltips,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

/**
 * Optional hook that returns null if not within provider
 * Useful for components that may or may not be within the onboarding context
 */
export function useOnboardingOptional() {
  return useContext(OnboardingContext);
}
