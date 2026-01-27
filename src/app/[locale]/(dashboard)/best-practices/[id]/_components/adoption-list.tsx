"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { Building2, CheckCircle2, Clock, PlayCircle } from "lucide-react";

interface Adoption {
  id: string;
  adoptedAt: Date;
  implementationStatus: string | null;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
  };
}

interface AdoptionListProps {
  adoptions: Adoption[];
  locale: string;
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; color: string; bgColor: string }
> = {
  PLANNED: {
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  IN_PROGRESS: {
    icon: PlayCircle,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  COMPLETED: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
};

export function AdoptionList({ adoptions, locale }: AdoptionListProps) {
  const t = useTranslations("bestPractices.detail.adoptionList");
  const dateLocale = locale === "fr" ? fr : enUS;

  // Show max 10 adoptions
  const displayedAdoptions = adoptions.slice(0, 10);
  const remainingCount = adoptions.length - 10;

  return (
    <ul className="space-y-3">
      {displayedAdoptions.map((adoption) => {
        const orgName = locale === "fr"
          ? adoption.organization.nameFr
          : adoption.organization.nameEn;

        const statusConfig = adoption.implementationStatus
          ? STATUS_CONFIG[adoption.implementationStatus]
          : null;

        const StatusIcon = statusConfig?.icon;

        return (
          <li
            key={adoption.id}
            className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
          >
            {/* Organization icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>

            {/* Organization info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" title={orgName}>
                {orgName}
              </p>

              {adoption.organization.organizationCode && (
                <p className="text-xs text-muted-foreground">
                  {adoption.organization.organizationCode}
                </p>
              )}

              {/* Meta row: date and status */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(adoption.adoptedAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </span>

                {statusConfig && StatusIcon && (
                  <Badge
                    variant="secondary"
                    className={`text-xs ${statusConfig.bgColor} ${statusConfig.color} border-0`}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {t(adoption.implementationStatus!.toLowerCase())}
                  </Badge>
                )}
              </div>
            </div>
          </li>
        );
      })}

      {/* Show remaining count */}
      {remainingCount > 0 && (
        <li className="text-sm text-muted-foreground text-center pt-2">
          {t("andMore", { count: remainingCount })}
        </li>
      )}
    </ul>
  );
}
