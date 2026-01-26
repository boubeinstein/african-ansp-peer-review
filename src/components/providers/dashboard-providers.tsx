"use client";

import { TRPCProvider } from "@/lib/trpc/provider";
import { KeyboardShortcutsProvider } from "@/components/features/shortcuts";
import { TooltipProvider } from "@/components/ui/tooltip";

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <TRPCProvider>
      <TooltipProvider delayDuration={0}>
        <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
      </TooltipProvider>
    </TRPCProvider>
  );
}
