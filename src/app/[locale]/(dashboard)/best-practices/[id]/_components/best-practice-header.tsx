"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Eye, Users } from "lucide-react";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";

interface Organization {
  id: string;
  nameEn: string;
  nameFr: string;
  organizationCode: string | null;
  country: string | null;
}

interface Practice {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  summaryEn: string;
  summaryFr: string;
  category: string;
  auditArea: string | null;
  status: string;
  viewCount: number;
  publishedAt: Date | null;
  organization: Organization;
  _count: {
    adoptions: number;
  };
}

interface BestPracticeHeaderProps {
  practice: Practice;
  locale: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  SAFETY_MANAGEMENT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  OPERATIONAL_EFFICIENCY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  TRAINING_COMPETENCY: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  TECHNOLOGY_INNOVATION: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  REGULATORY_COMPLIANCE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  STAKEHOLDER_ENGAGEMENT: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

const CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  SAFETY_MANAGEMENT: { en: "Safety Management", fr: "Gestion de la sécurité" },
  OPERATIONAL_EFFICIENCY: { en: "Operational Efficiency", fr: "Efficacité opérationnelle" },
  TRAINING_COMPETENCY: { en: "Training & Competency", fr: "Formation et compétence" },
  TECHNOLOGY_INNOVATION: { en: "Technology & Innovation", fr: "Technologie et innovation" },
  REGULATORY_COMPLIANCE: { en: "Regulatory Compliance", fr: "Conformité réglementaire" },
  STAKEHOLDER_ENGAGEMENT: { en: "Stakeholder Engagement", fr: "Engagement des parties prenantes" },
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SUBMITTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  UNDER_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  PUBLISHED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  ARCHIVED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export function BestPracticeHeader({ practice, locale }: BestPracticeHeaderProps) {
  const t = useTranslations("bestPractices.detail.header");
  const dateLocale = locale === "fr" ? fr : enUS;

  const title = locale === "fr" ? practice.titleFr : practice.titleEn;
  const summary = locale === "fr" ? practice.summaryFr : practice.summaryEn;
  const orgName = locale === "fr" ? practice.organization.nameFr : practice.organization.nameEn;
  const categoryLabel = CATEGORY_LABELS[practice.category]?.[locale as "en" | "fr"] || practice.category;

  return (
    <div className="space-y-4">
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {practice.referenceNumber}
        </Badge>
        <Badge className={CATEGORY_COLORS[practice.category] || "bg-gray-100"}>
          {categoryLabel}
        </Badge>
        {practice.auditArea && (
          <Badge variant="secondary">{practice.auditArea}</Badge>
        )}
        {practice.status !== "PUBLISHED" && (
          <Badge className={STATUS_COLORS[practice.status] || "bg-gray-100"}>
            {practice.status}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>

      {/* Summary */}
      <p className="text-lg text-muted-foreground leading-relaxed">{summary}</p>

      {/* Meta information row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2">
        {/* Organization */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span>
            {orgName}
            {practice.organization.organizationCode && (
              <span className="text-muted-foreground/70">
                {" "}({practice.organization.organizationCode})
              </span>
            )}
            {practice.organization.country && (
              <span className="text-muted-foreground/70">
                , {practice.organization.country}
              </span>
            )}
          </span>
        </div>

        {/* Published date */}
        {practice.publishedAt && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              {t("publishedOn", {
                date: format(practice.publishedAt, "PPP", { locale: dateLocale }),
              })}
            </span>
          </div>
        )}

        {/* Views */}
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span>{t("views", { count: practice.viewCount })}</span>
        </div>

        {/* Adoptions */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span>{t("adoptions", { count: practice._count.adoptions })}</span>
        </div>
      </div>
    </div>
  );
}
