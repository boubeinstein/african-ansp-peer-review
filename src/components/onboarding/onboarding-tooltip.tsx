"use client";

import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useOnboardingOptional } from "./onboarding-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Sparkles,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface TooltipPosition {
  top: number;
  left: number;
}

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
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Memoized step data for stable references
  const currentStep = onboarding?.currentStep;
  const isActive = onboarding?.isActive ?? false;

  // Find and measure target element
  const findTarget = useCallback(() => {
    if (!currentStep) {
      return null;
    }

    if (currentStep.placement === "center") {
      return null;
    }

    const target = document.querySelector(currentStep.targetSelector);
    if (target) {
      return target.getBoundingClientRect();
    }
    return null;
  }, [currentStep]);

  // Update target rect when step changes or on scroll/resize
  useEffect(() => {
    if (!isActive || !currentStep || !isClient) {
      return;
    }

    // Use RAF to avoid sync setState in effect
    let rafId: number;
    const updateRect = () => {
      rafId = requestAnimationFrame(() => {
        const rect = findTarget();
        setTargetRect(rect);
      });
    };

    // Initial update with delay
    const timer = setTimeout(updateRect, 100);

    // Retry if needed
    const retryTimer = setTimeout(updateRect, 500);

    // Handle scroll and resize
    const handleReposition = () => updateRect();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isActive, currentStep, isClient, findTarget]);

  // Reset target rect when tour becomes inactive
  useEffect(() => {
    if (!isActive) {
      requestAnimationFrame(() => {
        setTargetRect(null);
      });
    }
  }, [isActive]);

  // Position tooltip relative to target
  useEffect(() => {
    if (!currentStep || !tooltipRef.current || !isClient) return;

    requestAnimationFrame(() => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      const padding = currentStep.highlightPadding ?? 16;
      const viewportPadding = 16;

      let top = 0;
      let left = 0;

      if (currentStep.placement === "center" || !targetRect) {
        // Center in viewport
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        left = window.innerWidth / 2 - tooltipRect.width / 2;
      } else {
        switch (currentStep.placement) {
          case "top":
            top = targetRect.top - tooltipRect.height - padding;
            left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
            break;
          case "bottom":
            top = targetRect.bottom + padding;
            left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
            break;
          case "left":
            top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
            left = targetRect.left - tooltipRect.width - padding;
            break;
          case "right":
            top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
            left = targetRect.right + padding;
            break;
        }
      }

      // Keep within viewport bounds
      top = Math.max(
        viewportPadding,
        Math.min(top, window.innerHeight - tooltipRect.height - viewportPadding)
      );
      left = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding)
      );

      setTooltipPos({ top, left });
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
    progress,
    nextStep,
    prevStep,
    skipStep,
    endTour,
  } = onboarding;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isCentered = currentStep.placement === "center";

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300"
        onClick={() => endTour(false)}
        aria-hidden="true"
      />

      {/* Spotlight highlight (non-centered only) */}
      {!isCentered && targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: `
              0 0 0 4px hsl(var(--primary)),
              0 0 0 9999px rgba(0, 0, 0, 0.6)
            `,
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
          "fixed z-[10000] w-80 bg-card border rounded-xl shadow-2xl",
          "animate-in fade-in-0 zoom-in-95 duration-300",
          isCentered && "w-96"
        )}
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 id="onboarding-title" className="font-semibold text-sm">
              {tStep(currentStep.titleKey)}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => endTour(false)}
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
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

        {/* Progress */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>
              {t("progress", { current: currentStepIndex + 1, total: totalSteps })}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 rounded-b-xl">
          <div>
            {!isLastStep && currentStep.skippable !== false && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skipStep}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-3.5 w-3.5 mr-1" />
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
            <Button size="sm" onClick={nextStep}>
              {isLastStep ? t("finish") : t("next")}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
