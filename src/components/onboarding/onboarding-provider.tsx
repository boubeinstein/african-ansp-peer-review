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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { fireCelebrationConfetti } from "@/lib/confetti";
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
  isNavigating: boolean;
  showWelcomeModal: boolean;
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
  nextStep: () => Promise<void>;
  prevStep: () => Promise<void>;
  skipStep: () => void;
  endTour: (completed?: boolean) => void;
  resetTour: () => void;
  goToStep: (stepIndex: number) => Promise<void>;
  setShowTooltips: (show: boolean) => void;
  dismissWelcomeModal: () => void;
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

  // Local state for tour UI
  const [isActive, setIsActive] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

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
      // Small delay to let page render, then show welcome modal
      const timer = setTimeout(() => {
        setIsActive(true);
        setShowWelcomeModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [onboardingState, tour, isActive]);

  // Dismiss welcome modal function
  const dismissWelcomeModal = useCallback(() => {
    setShowWelcomeModal(false);
  }, []);

  // Computed values
  const currentStep = tour?.steps[currentStepIndex] ?? null;
  const totalSteps = tour?.steps.length ?? 0;
  const progress =
    totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0;
  const hasCompletedTour = !!onboardingState?.tourCompletedAt;
  const showTooltips = onboardingState?.showTooltips ?? true;

  // Navigate to a route if needed (async with delay for page load)
  const navigateToRoute = useCallback(
    async (route?: string): Promise<boolean> => {
      if (route) {
        const targetPath = `/${locale}${route}`;
        // Check if we're not already on the target path
        const currentPath = pathname.replace(`/${locale}`, "");
        if (currentPath !== route && !pathname.startsWith(targetPath)) {
          setIsNavigating(true);
          router.push(targetPath);
          // Wait for navigation and page render
          await new Promise((resolve) => setTimeout(resolve, 600));
          setIsNavigating(false);
          return true;
        }
      }
      return false;
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

  // Next step (async to handle navigation)
  const nextStep = useCallback(async () => {
    if (!tour || !currentStep || isNavigating) return;

    const nextIndex = currentStepIndex + 1;

    // Mark current step complete
    completeStepMutation.mutate({ stepId: currentStep.id });

    if (nextIndex < tour.steps.length) {
      const nextStepDef = tour.steps[nextIndex];

      // Navigate if needed and wait for page load
      await navigateToRoute(nextStepDef.route);

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
    isNavigating,
    completeStepMutation,
    navigateToRoute,
    updateState,
    completeTourMutation,
  ]);

  // Previous step (async to handle navigation)
  const prevStep = useCallback(async () => {
    if (currentStepIndex > 0 && tour && !isNavigating) {
      const prevIndex = currentStepIndex - 1;
      const prevStepDef = tour.steps[prevIndex];

      // Navigate if needed and wait for page load
      await navigateToRoute(prevStepDef?.route);
      updateState.mutate({ currentStep: prevStepDef?.id ?? null });
    }
  }, [currentStepIndex, tour, isNavigating, navigateToRoute, updateState]);

  // Skip step
  const skipStep = useCallback(() => {
    if (!currentStep) return;

    skipStepMutation.mutate({ stepId: currentStep.id });
    nextStep();
  }, [currentStep, skipStepMutation, nextStep]);

  // Go to specific step (async to handle navigation)
  const goToStep = useCallback(
    async (stepIndex: number) => {
      if (!tour || stepIndex < 0 || stepIndex >= tour.steps.length || isNavigating) return;

      const targetStep = tour.steps[stepIndex];
      // Navigate if needed and wait for page load
      await navigateToRoute(targetStep.route);
      updateState.mutate({ currentStep: targetStep.id });
    },
    [tour, isNavigating, navigateToRoute, updateState]
  );

  // End tour
  const endTour = useCallback(
    (completed = false) => {
      setIsActive(false);

      if (completed) {
        // Fire celebration confetti
        fireCelebrationConfetti();

        // Show success toast after a brief delay
        setTimeout(() => {
          toast.success("Welcome aboard!", {
            description: "You're ready to start using the platform.",
            duration: 5000,
          });
        }, 1000);

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
        isNavigating,
        showWelcomeModal,
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
        dismissWelcomeModal,
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
