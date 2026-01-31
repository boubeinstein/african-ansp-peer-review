"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BestPracticeItem {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  summaryEn: string;
  summaryFr: string;
  category: string;
  auditArea: string | null;
  imageUrl: string | null;
  viewCount: number;
  publishedAt: Date | null;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
  };
  _count: {
    adoptions: number;
  };
}

interface BestPracticeCardProps {
  item: BestPracticeItem;
  locale: string;
  isOwnOrg: boolean;
}

// Category styling with left border color and badge styling
const CATEGORY_STYLES: Record<
  string,
  { border: string; bg: string; text: string }
> = {
  SAFETY_MANAGEMENT: {
    border: "border-l-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-400",
  },
  OPERATIONAL_EFFICIENCY: {
    border: "border-l-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    text: "text-cyan-700 dark:text-cyan-400",
  },
  TRAINING_COMPETENCY: {
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  TECHNOLOGY_INNOVATION: {
    border: "border-l-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  REGULATORY_COMPLIANCE: {
    border: "border-l-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-400",
  },
  STAKEHOLDER_ENGAGEMENT: {
    border: "border-l-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
  },
};

const DEFAULT_CATEGORY_STYLE = {
  border: "border-l-slate-500",
  bg: "bg-slate-50 dark:bg-slate-950/30",
  text: "text-slate-700 dark:text-slate-400",
};

const CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  SAFETY_MANAGEMENT: {
    en: "Safety Management",
    fr: "Gestion de la sécurité",
  },
  OPERATIONAL_EFFICIENCY: {
    en: "Operational Efficiency",
    fr: "Efficacité opérationnelle",
  },
  TRAINING_COMPETENCY: {
    en: "Training & Competency",
    fr: "Formation et compétence",
  },
  TECHNOLOGY_INNOVATION: {
    en: "Technology & Innovation",
    fr: "Technologie et innovation",
  },
  REGULATORY_COMPLIANCE: {
    en: "Regulatory Compliance",
    fr: "Conformité réglementaire",
  },
  STAKEHOLDER_ENGAGEMENT: {
    en: "Stakeholder Engagement",
    fr: "Engagement des parties prenantes",
  },
};

export function BestPracticeCard({
  item,
  locale,
  isOwnOrg,
}: BestPracticeCardProps) {
  const t = useTranslations("bestPractices.card");

  const title = locale === "fr" ? item.titleFr : item.titleEn;
  const summary = locale === "fr" ? item.summaryFr : item.summaryEn;
  const categoryLabel =
    CATEGORY_LABELS[item.category]?.[locale as "en" | "fr"] || item.category;
  const categoryStyle = CATEGORY_STYLES[item.category] || DEFAULT_CATEGORY_STYLE;

  return (
    <Link href={`/${locale}/best-practices/${item.id}`} className="block h-full">
      <Card
        className={cn(
          "group h-full flex flex-col transition-all duration-200",
          "hover:shadow-lg hover:border-primary/50",
          "border-l-4",
          categoryStyle.border
        )}
      >
        {/* Header: Reference + Category + Audit Area */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Reference number - high contrast monospace */}
            <code className="text-xs font-mono font-medium text-foreground bg-muted px-2 py-0.5 rounded shrink-0">
              {item.referenceNumber}
            </code>
            {/* Category badge */}
            <Badge
              variant="secondary"
              className={cn(
                "text-xs shrink-0 hidden sm:inline-flex",
                categoryStyle.bg,
                categoryStyle.text
              )}
            >
              {categoryLabel}
            </Badge>
          </div>
          {/* Audit area */}
          {item.auditArea && (
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              {item.auditArea}
            </span>
          )}
        </div>

        {/* Content: Title + Summary */}
        <CardContent className="flex-1 px-4 py-3">
          {/* Title - prominent, primary visual element */}
          <h3 className="font-semibold text-base leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          {/* Summary - truncated for density */}
          {summary && (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {summary}
            </p>
          )}
        </CardContent>

        {/* Footer: Organization + Stats */}
        <CardFooter className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {item.organization.organizationCode || item.organization.nameEn}
            </span>
            {isOwnOrg && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 shrink-0"
              >
                {t("yourOrg")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" title="Views">
              <Eye className="h-3.5 w-3.5" />
              {item.viewCount}
            </span>
            <span className="flex items-center gap-1" title="Adoptions">
              <Users className="h-3.5 w-3.5" />
              {item._count.adoptions}
            </span>
            <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
