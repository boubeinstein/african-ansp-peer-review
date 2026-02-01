"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, ScrollText } from "lucide-react";
import { ICAO_REFERENCE_TYPES } from "@/lib/questionnaire/constants";
import type { ICAOReferenceType } from "@/types/prisma-enums";
import type { ContentLanguage } from "./language-toggle";

// Local interface to avoid importing from @prisma/client in client component
interface ICAOReference {
  id: string;
  referenceType: ICAOReferenceType;
  document: string;
  chapter?: string | null;
  description?: string | null;
}

interface ICAOReferenceListProps {
  references: ICAOReference[];
  contentLanguage: ContentLanguage;
  className?: string;
  compact?: boolean;
}

// Color schemes for different reference types
const referenceTypeColors: Record<ICAOReferenceType, string> = {
  CC: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-400",
  STD: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400",
  RP: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-400",
  PANS: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400",
  GM: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-400",
  Cir: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/50 dark:text-rose-400",
  SUPPS: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
};

// Icons for different reference types
const referenceTypeIcons: Record<
  ICAOReferenceType,
  React.ComponentType<{ className?: string }>
> = {
  CC: ScrollText,
  STD: FileText,
  RP: FileText,
  PANS: BookOpen,
  GM: BookOpen,
  Cir: FileText,
  SUPPS: FileText,
};

interface ICAOReferenceItemProps {
  reference: ICAOReference;
  contentLanguage: ContentLanguage;
  compact?: boolean;
}

function ICAOReferenceItem({
  reference,
  contentLanguage,
  compact = false,
}: ICAOReferenceItemProps) {
  const lang = contentLanguage;
  const typeMeta = ICAO_REFERENCE_TYPES[reference.referenceType];
  const Icon = referenceTypeIcons[reference.referenceType];

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-medium px-1.5 py-0",
            referenceTypeColors[reference.referenceType]
          )}
        >
          {reference.referenceType}
        </Badge>
        <span className="text-muted-foreground">
          {reference.document}
          {reference.chapter && (
            <span className="ml-1">({reference.chapter})</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      {/* Type Badge and Icon */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center",
            referenceTypeColors[reference.referenceType].split(" ")[0]
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              referenceTypeColors[reference.referenceType].split(" ")[1]
            )}
          />
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-bold px-1 py-0",
            referenceTypeColors[reference.referenceType]
          )}
        >
          {reference.referenceType}
        </Badge>
      </div>

      {/* Reference Content */}
      <div className="flex-1 min-w-0">
        <div>
          <p className="font-medium text-sm leading-tight">{reference.document}</p>
          {reference.chapter && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {reference.chapter}
            </p>
          )}
        </div>

        {reference.description && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
            {reference.description}
          </p>
        )}

        {/* Reference Type Label */}
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {typeMeta.name[lang]}
        </p>
      </div>
    </div>
  );
}

export function ICAOReferenceList({
  references,
  contentLanguage,
  className,
  compact = false,
}: ICAOReferenceListProps) {
  const t = useTranslations("questionDetail");

  if (!references || references.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        {t("noReferences")}
      </div>
    );
  }

  // Group references by type for better organization
  const groupedReferences = references.reduce(
    (acc, ref) => {
      if (!acc[ref.referenceType]) {
        acc[ref.referenceType] = [];
      }
      acc[ref.referenceType].push(ref);
      return acc;
    },
    {} as Record<ICAOReferenceType, ICAOReference[]>
  );

  // Sort types by their sort order
  const sortedTypes = (Object.keys(groupedReferences) as ICAOReferenceType[]).sort(
    (a, b) =>
      ICAO_REFERENCE_TYPES[a].sortOrder - ICAO_REFERENCE_TYPES[b].sortOrder
  );

  if (compact) {
    return (
      <div className={cn("space-y-1.5", className)}>
        {references.map((ref) => (
          <ICAOReferenceItem
            key={ref.id}
            reference={ref}
            contentLanguage={contentLanguage}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {sortedTypes.map((type) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-semibold",
                referenceTypeColors[type]
              )}
            >
              {type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {ICAO_REFERENCE_TYPES[type].name[contentLanguage]} (
              {groupedReferences[type].length})
            </span>
          </div>
          <div className="space-y-2">
            {groupedReferences[type].map((ref) => (
              <ICAOReferenceItem
                key={ref.id}
                reference={ref}
                contentLanguage={contentLanguage}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple badge-only display for reference types
interface ICAOReferenceTypeBadgeProps {
  type: ICAOReferenceType;
  className?: string;
}

export function ICAOReferenceTypeBadge({
  type,
  className,
}: ICAOReferenceTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        referenceTypeColors[type],
        className
      )}
    >
      {type}
    </Badge>
  );
}

// Export colors for external use
export { referenceTypeColors };
