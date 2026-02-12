"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { History, ChevronDown, User } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr as frLocale, enUS } from "date-fns/locale";
import type { ReportVersionEntry } from "@/types/report";

interface VersionHistoryPanelProps {
  currentVersion: number;
  currentStatus: string;
  currentUpdatedAt: string | Date;
  currentGeneratedBy?: { id: string; name: string; role: string } | null;
  versionHistory: ReportVersionEntry[];
}

export function VersionHistoryPanel({
  currentVersion,
  currentStatus,
  currentUpdatedAt,
  currentGeneratedBy,
  versionHistory,
}: VersionHistoryPanelProps) {
  const t = useTranslations("reviews.detail.report.versionHistory");
  const tStatus = useTranslations("reviews.detail.report.status");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? frLocale : enUS;

  const totalVersions = currentVersion;
  const hasHistory = versionHistory.length > 0;

  // Build entries: current version first, then history in reverse chronological order
  const historyReversed = [...versionHistory].reverse();

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2 group">
        <History className="h-4 w-4" />
        <span>{t("title")}</span>
        <Badge variant="outline" className="ml-1 text-xs">
          {t("versionsCount", { count: totalVersions })}
        </Badge>
        <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2">
        <div className="border rounded-lg divide-y">
          {/* Current version */}
          <div className="flex items-start gap-3 p-3 bg-muted/30">
            <Badge variant="default" className="shrink-0 mt-0.5">
              {t("version", { version: currentVersion })}
            </Badge>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {t("current")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {tStatus(currentStatus)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("generatedAt", {
                  date: format(new Date(currentUpdatedAt), "PPp", {
                    locale: dateLocale,
                  }),
                })}
              </p>
              {currentGeneratedBy && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {t("generatedBy", { name: currentGeneratedBy.name })}
                </p>
              )}
            </div>
          </div>

          {/* Previous versions */}
          {hasHistory ? (
            historyReversed.map((entry) => (
              <div
                key={entry.version}
                className="flex items-start gap-3 p-3"
              >
                <Badge variant="outline" className="shrink-0 mt-0.5">
                  {t("version", { version: entry.version })}
                </Badge>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {tStatus(entry.status)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t("generatedAt", {
                      date: format(new Date(entry.generatedAt), "PPp", {
                        locale: dateLocale,
                      }),
                    })}
                  </p>
                  {entry.generatedBy && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {t("generatedBy", { name: entry.generatedBy.name })}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              {t("noHistory")}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
