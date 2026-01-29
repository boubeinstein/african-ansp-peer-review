"use client";

import { TRPCProvider } from "@/lib/trpc/provider";
import { KeyboardShortcutsProvider } from "@/components/features/shortcuts";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineIndicator } from "@/components/collaboration";

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <TRPCProvider>
      <TooltipProvider delayDuration={0}>
        <KeyboardShortcutsProvider>
          <OfflineIndicator />
          {children}
        </KeyboardShortcutsProvider>
      </TooltipProvider>
    </TRPCProvider>
  );
}
