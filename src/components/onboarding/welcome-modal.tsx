"use client";

import { useTranslations } from "next-intl";
import { useOnboardingOptional } from "./onboarding-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Clock,
  MousePointerClick,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";

export function WelcomeModal() {
  const t = useTranslations("onboarding.welcomeModal");
  const onboarding = useOnboardingOptional();

  const showModal = onboarding?.showWelcomeModal ?? false;
  const dismissWelcomeModal = onboarding?.dismissWelcomeModal;
  const endTour = onboarding?.endTour;

  const handleStartTour = () => {
    // Dismiss the welcome modal to show the tooltip
    dismissWelcomeModal?.();
  };

  const handleSkip = () => {
    dismissWelcomeModal?.();
    endTour?.(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      dismissWelcomeModal?.();
    }
  };

  if (!onboarding || !showModal) return null;

  return (
    <Dialog open={showModal} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <DialogHeader className="mt-4 text-left">
            <DialogTitle className="text-2xl">{t("title")}</DialogTitle>
            <DialogDescription className="text-base">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 pt-4 space-y-4">
          <p className="text-muted-foreground">{t("description")}</p>

          {/* Features list */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MousePointerClick className="h-4 w-4 text-blue-500" />
              </div>
              <span>{t("feature1")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Sparkles className="h-4 w-4 text-green-500" />
              </div>
              <span>{t("feature2")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <span>{t("feature3")}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 flex flex-col gap-2 border-t bg-muted/30">
          <Button onClick={handleStartTour} className="w-full" size="lg">
            {t("startButton")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            {t("skipButton")}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-1">
            {t("restartHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
