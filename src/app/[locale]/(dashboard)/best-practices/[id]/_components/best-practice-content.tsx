"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import {
  FileText,
  Lightbulb,
  CheckCircle2,
  Target,
  Paperclip,
  ExternalLink,
  Tag,
} from "lucide-react";

interface Finding {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
}

interface Practice {
  descriptionEn: string;
  descriptionFr: string;
  implementationEn: string;
  implementationFr: string;
  benefitsEn: string;
  benefitsFr: string;
  tags: string[];
  attachments: string[];
  finding?: Finding | null;
}

interface BestPracticeContentProps {
  practice: Practice;
  locale: string;
}

export function BestPracticeContent({ practice, locale }: BestPracticeContentProps) {
  const t = useTranslations("bestPractices.detail.sections");

  const description = locale === "fr" ? practice.descriptionFr : practice.descriptionEn;
  const implementation = locale === "fr" ? practice.implementationFr : practice.implementationEn;
  const benefits = locale === "fr" ? practice.benefitsFr : practice.benefitsEn;
  const findingTitle = practice.finding
    ? locale === "fr"
      ? practice.finding.titleFr
      : practice.finding.titleEn
    : null;

  return (
    <div className="space-y-6">
      {/* Description Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {t("description")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Markdown content={description} className="prose-sm" />
        </CardContent>
      </Card>

      {/* Implementation Guide Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            {t("implementation")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Markdown content={implementation} className="prose-sm" />
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {t("benefits")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Markdown content={benefits} className="prose-sm" />
        </CardContent>
      </Card>

      {/* Source Finding (if linked) */}
      {practice.finding && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              {t("sourceFinding")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${locale}/findings/${practice.finding.id}`}
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Badge variant="outline" className="font-mono">
                {practice.finding.referenceNumber}
              </Badge>
              <span>{findingTitle}</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
            <p className="text-sm text-muted-foreground mt-2">
              {t("sourceDescription")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tags Section */}
      {practice.tags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5 text-primary" />
              {t("tags")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {practice.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments Section */}
      {practice.attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Paperclip className="h-5 w-5 text-primary" />
              {t("attachments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {practice.attachments.map((attachment: string, index: number) => (
                <li key={index}>
                  <a
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>{extractFileName(attachment)}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Extract filename from URL or path
 */
function extractFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();
    return filename || url;
  } catch {
    // If not a valid URL, try to extract from path
    const parts = url.split("/");
    return parts.pop() || url;
  }
}
