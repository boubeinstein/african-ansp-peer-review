"use client";

import { UserRole } from "@/types/prisma-enums";
import { TRPCProvider } from "@/lib/trpc/provider";
import { KeyboardShortcutsProvider } from "@/components/features/shortcuts";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineIndicator } from "@/components/collaboration";
import { OnboardingProvider, OnboardingTooltip, WelcomeModal } from "@/components/onboarding";

interface DashboardProvidersProps {
  children: React.ReactNode;
  userRole?: UserRole;
  locale?: string;
}

export function DashboardProviders({
  children,
  userRole,
  locale = "en"
}: DashboardProvidersProps) {
  return (
    <TRPCProvider>
      <TooltipProvider delayDuration={0}>
        <KeyboardShortcutsProvider>
          <OnboardingProvider userRole={userRole} locale={locale}>
            <OfflineIndicator />
            {children}
            <WelcomeModal />
            <OnboardingTooltip />
          </OnboardingProvider>
        </KeyboardShortcutsProvider>
      </TooltipProvider>
    </TRPCProvider>
  );
}
