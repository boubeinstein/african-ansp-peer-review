"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users, Building2, ArrowRight } from "lucide-react";

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

const CATEGORY_COLORS: Record<string, string> = {
  SAFETY_MANAGEMENT:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  OPERATIONAL_EFFICIENCY:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  TRAINING_COMPETENCY:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  TECHNOLOGY_INNOVATION:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  REGULATORY_COMPLIANCE:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  STAKEHOLDER_ENGAGEMENT:
    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

const CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  SAFETY_MANAGEMENT: {
    en: "Safety Management",
    fr: "Gestion de la securite",
  },
  OPERATIONAL_EFFICIENCY: {
    en: "Operational Efficiency",
    fr: "Efficacite operationnelle",
  },
  TRAINING_COMPETENCY: {
    en: "Training & Competency",
    fr: "Formation et competence",
  },
  TECHNOLOGY_INNOVATION: {
    en: "Technology & Innovation",
    fr: "Technologie et innovation",
  },
  REGULATORY_COMPLIANCE: {
    en: "Regulatory Compliance",
    fr: "Conformite reglementaire",
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
  const orgName =
    locale === "fr" ? item.organization.nameFr : item.organization.nameEn;
  const categoryLabel =
    CATEGORY_LABELS[item.category]?.[locale as "en" | "fr"] || item.category;

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      {/* Image or placeholder */}
      {item.imageUrl ? (
        <div className="relative h-40 overflow-hidden rounded-t-lg">
          <Image
            src={item.imageUrl}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-lg flex items-center justify-center">
          <span className="text-4xl font-bold text-primary/20">
            {item.referenceNumber}
          </span>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="secondary"
            className={CATEGORY_COLORS[item.category]}
          >
            {categoryLabel}
          </Badge>
          {item.auditArea && (
            <Badge variant="outline" className="text-xs">
              {item.auditArea}
            </Badge>
          )}
        </div>
        <Link
          href={`/${locale}/best-practices/${item.id}`}
          className="hover:underline"
        >
          <h3 className="font-semibold text-lg line-clamp-2 mt-2">{title}</h3>
        </Link>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">{summary}</p>

        {/* Organization */}
        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {orgName}
            {item.organization.organizationCode &&
              ` (${item.organization.organizationCode})`}
          </span>
          {isOwnOrg && (
            <Badge variant="secondary" className="text-xs ml-auto flex-shrink-0">
              {t("yourOrg")}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-4 border-t">
        {/* Metrics */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{item.viewCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{item._count.adoptions}</span>
          </div>
        </div>

        {/* View button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/best-practices/${item.id}`}>
            {t("view")}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
