"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Lightbulb, Plus } from "lucide-react";

interface BestPracticesHeaderProps {
  locale: string;
  userOrgId?: string | null;
}

export function BestPracticesHeader({
  locale,
  userOrgId,
}: BestPracticesHeaderProps) {
  const t = useTranslations("bestPractices");

  // Users with an organization can submit best practices
  const canSubmit = !!userOrgId;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Lightbulb className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {canSubmit && (
        <Button asChild>
          <Link href={`/${locale}/best-practices/new`}>
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.submit")}
          </Link>
        </Button>
      )}
    </div>
  );
}
