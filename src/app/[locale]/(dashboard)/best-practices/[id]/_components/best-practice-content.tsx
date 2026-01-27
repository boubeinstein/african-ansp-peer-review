"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Lightbulb,
  CheckCircle,
  Link as LinkIcon,
  Tag,
} from "lucide-react";

interface BestPractice {
  id: string;
  descriptionEn: string;
  descriptionFr: string;
  implementationEn: string;
  implementationFr: string;
  benefitsEn: string;
  benefitsFr: string;
  tags: string[];
  attachments: string[];
  finding: {
    id: string;
    referenceNumber: string;
    titleEn: string;
    titleFr: string;
  } | null;
}

interface BestPracticeContentProps {
  practice: BestPractice;
  locale: string;
}

export function BestPracticeContent({
  practice,
  locale,
}: BestPracticeContentProps) {
  const t = useTranslations("bestPractices.detail");

  const description =
    locale === "fr" ? practice.descriptionFr : practice.descriptionEn;
  const implementation =
    locale === "fr" ? practice.implementationFr : practice.implementationEn;
  const benefits = locale === "fr" ? practice.benefitsFr : practice.benefitsEn;
  const findingTitle = practice.finding
    ? locale === "fr"
      ? practice.finding.titleFr
      : practice.finding.titleEn
    : null;

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {t("sections.description")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Implementation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t("sections.implementation")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{implementation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-primary" />
            {t("sections.benefits")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{benefits}</p>
          </div>
        </CardContent>
      </Card>

      {/* Source Finding (if linked) */}
      {practice.finding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LinkIcon className="h-5 w-5 text-primary" />
              {t("sections.sourceFinding")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{practice.finding.referenceNumber}</Badge>
              <span className="text-sm">{findingTitle}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {practice.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5 text-primary" />
              {t("sections.tags")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {practice.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
