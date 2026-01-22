"use client";

import { TRPCProvider } from "@/lib/trpc/provider";
import { KeyboardShortcutsProvider } from "@/components/features/shortcuts";

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <TRPCProvider>
      <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
    </TRPCProvider>
  );
}
