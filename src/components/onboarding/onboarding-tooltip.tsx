"use client";

import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useOnboardingOptional } from "./onboarding-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Sparkles,
  PartyPopper,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface TooltipPosition {
  top: number;
  left: number;
}

type ArrowPlacement = "top" | "bottom" | "left" | "right";

// =============================================================================
// HOOKS
// =============================================================================

// SSR-safe check for client-side rendering
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OnboardingTooltip() {
  const t = useTranslations("onboarding");
  const tStep = useTranslations();
  const onboarding = useOnboardingOptional();
  const isClient = useIsClient();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({
    top: 0,
    left: 0,
  });
  const [arrowPlacement, setArrowPlacement] = useState<ArrowPlacement>("bottom");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Memoized step data for stable references
  const currentStep = onboarding?.currentStep;
  const isActive = onboarding?.isActive ?? false;

  // Find target element and scroll into view
  const findAndHighlightTarget = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    if (currentStep.placement === "center") {
      setTargetRect(null);
      return;
    }

    const target = document.querySelector(currentStep.targetSelector);
    if (target) {
      // Scroll element into view smoothly
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

      // Wait for scroll to complete before measuring
      setTimeout(() => {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      }, 300);
    } else {
      // Retry if element not found yet (may be lazy loaded)
      setTimeout(() => {
        const retryTarget = document.querySelector(currentStep.targetSelector);
        if (retryTarget) {
          retryTarget.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          setTimeout(() => {
            setTargetRect(retryTarget.getBoundingClientRect());
          }, 300);
        }
      }, 200);
    }
  }, [currentStep]);

  // Trigger highlight with transition on step change
  useEffect(() => {
    if (!isActive || !currentStep || !isClient) {
      return;
    }

    // Start transition after a microtask to avoid sync setState
    const startTransition = setTimeout(() => setIsTransitioning(true), 0);

    const timer = setTimeout(() => {
      findAndHighlightTarget();
      setIsTransitioning(false);
    }, 150);

    return () => {
      clearTimeout(startTransition);
      clearTimeout(timer);
    };
  }, [isActive, currentStep, isClient, findAndHighlightTarget]);

  // Handle scroll and resize - update target rect
  useEffect(() => {
    if (!isActive || !currentStep || !isClient) {
      return;
    }

    const handleReposition = () => {
      if (currentStep.placement === "center") return;

      const target = document.querySelector(currentStep.targetSelector);
      if (target) {
        requestAnimationFrame(() => {
          setTargetRect(target.getBoundingClientRect());
        });
      }
    };

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isActive, currentStep, isClient]);

  // Reset target rect when tour becomes inactive
  useEffect(() => {
    if (!isActive) {
      requestAnimationFrame(() => {
        setTargetRect(null);
      });
    }
  }, [isActive]);

  // Position tooltip relative to target with arrow placement
  useEffect(() => {
    if (!currentStep || !tooltipRef.current || !isClient) return;

    requestAnimationFrame(() => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      const padding = currentStep.highlightPadding ?? 16;
      const viewportPadding = 20;

      let top = 0;
      let left = 0;
      let arrow: ArrowPlacement = "bottom";

      if (currentStep.placement === "center" || !targetRect) {
        // Center in viewport
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        left = window.innerWidth / 2 - tooltipRect.width / 2;
      } else {
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        // Calculate available space in each direction
        const spaceAbove = targetRect.top;
        const spaceLeft = targetRect.left;
        const spaceRight = window.innerWidth - targetRect.right;

        // Determine best placement based on step preference and available space
        const placement = currentStep.placement;

        // Determine best placement based on step preference and available space
        switch (placement) {
          case "bottom":
            top = targetRect.bottom + padding;
            left = targetCenterX - tooltipRect.width / 2;
            arrow = "top";
            break;
          case "top":
            if (spaceAbove >= tooltipRect.height + padding) {
              top = targetRect.top - tooltipRect.height - padding;
              left = targetCenterX - tooltipRect.width / 2;
              arrow = "bottom";
            } else {
              // Fall back to bottom
              top = targetRect.bottom + padding;
              left = targetCenterX - tooltipRect.width / 2;
              arrow = "top";
            }
            break;
          case "right":
            if (spaceRight >= tooltipRect.width + padding) {
              top = targetCenterY - tooltipRect.height / 2;
              left = targetRect.right + padding;
              arrow = "left";
            } else {
              // Fall back to left
              top = targetCenterY - tooltipRect.height / 2;
              left = targetRect.left - tooltipRect.width - padding;
              arrow = "right";
            }
            break;
          case "left":
            if (spaceLeft >= tooltipRect.width + padding) {
              top = targetCenterY - tooltipRect.height / 2;
              left = targetRect.left - tooltipRect.width - padding;
              arrow = "right";
            } else {
              // Fall back to right
              top = targetCenterY - tooltipRect.height / 2;
              left = targetRect.right + padding;
              arrow = "left";
            }
            break;
        }
      }

      // Keep tooltip within viewport bounds
      top = Math.max(
        viewportPadding,
        Math.min(top, window.innerHeight - tooltipRect.height - viewportPadding)
      );
      left = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding)
      );

      setTooltipPos({ top, left });
      setArrowPlacement(arrow);
    });
  }, [currentStep, targetRect, isClient]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive || !onboarding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onboarding.endTour(false);
          break;
        case "ArrowRight":
        case "Enter":
          e.preventDefault();
          onboarding.nextStep();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onboarding.prevStep();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onboarding]);

  // Don't render on server or when inactive
  if (!isClient || !isActive || !currentStep || !onboarding) {
    return null;
  }

  const {
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipStep,
    endTour,
  } = onboarding;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isCentered = currentStep.placement === "center";

  return createPortal(
    <div className={cn("transition-opacity duration-150", isTransitioning && "onboarding-transitioning")}>
      {/* Backdrop overlay */}
      <div
        className="onboarding-backdrop"
        onClick={() => endTour(false)}
        aria-hidden="true"
      />

      {/* Spotlight highlight (non-centered only) */}
      {!isCentered && targetRect && (
        <div
          className="onboarding-spotlight"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className={cn(
          "fixed z-[10000] w-[340px] bg-card border rounded-xl shadow-2xl onboarding-tooltip",
          isCentered && "w-[400px]"
        )}
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Arrow pointer (non-centered only) */}
        {!isCentered && targetRect && (
          <div className="onboarding-tooltip-arrow" data-placement={arrowPlacement} />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              {isLastStep ? (
                <PartyPopper className="h-4 w-4 text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
            </div>
            <h3 id="onboarding-title" className="font-semibold">
              {tStep(currentStep.titleKey)}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
            onClick={() => endTour(false)}
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tStep(currentStep.descriptionKey)}
          </p>

          {currentStep.action && (
            <div className="mt-3 flex items-center gap-2 text-xs text-primary font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {t(`actions.${currentStep.action}`)}
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="px-4 pb-3">
          <div className="onboarding-dots">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "onboarding-dot",
                  i === currentStepIndex && "active",
                  i < currentStepIndex && "completed"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            {t("progress", { current: currentStepIndex + 1, total: totalSteps })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30 rounded-b-xl">
          <div>
            {!isLastStep && currentStep.skippable !== false && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skipStep}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-3.5 w-3.5 mr-1.5" />
                {t("skip")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" size="sm" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("back")}
              </Button>
            )}
            <Button size="sm" onClick={nextStep} className="min-w-[80px]">
              {isLastStep ? t("finish") : t("next")}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
