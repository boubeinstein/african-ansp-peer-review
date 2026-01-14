"use client";

import { TRPCProvider } from "@/lib/trpc/provider";

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
