"use client";

/**
 * RequestAccessClient Component
 *
 * Client wrapper that reads the tab parameter from URL and passes it to RegisterForm.
 */

import { useSearchParams } from "next/navigation";
import { RegisterForm } from "@/components/auth";

export function RequestAccessClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const initialTab = tab === "join" ? "join" : "access";

  return <RegisterForm initialTab={initialTab} />;
}
