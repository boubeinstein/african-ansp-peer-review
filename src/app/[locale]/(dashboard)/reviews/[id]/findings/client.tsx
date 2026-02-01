"use client";

/**
 * Review Findings Client Component
 *
 * Displays all findings for a specific peer review with filtering and navigation.
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  FileWarning,
  AlertCircle,
  Building2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FindingStatus, FindingSeverity } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewFindingsClientProps {
  reviewId: string;
  locale: string;
  referenceNumber: string;
  organizationName: string;
  organizationCode?: string | null;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  const t = useTranslations("findings.severity");

  const config = {
    CRITICAL: {
      color:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
      icon: AlertTriangle,
    },
    MAJOR: {
      color:
        "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
      icon: AlertCircle,
    },
    MINOR: {
      color:
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
      icon: FileWarning,
    },
    OBSERVATION: {
      color:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
      icon: Eye,
    },
  };

  const { color, icon: Icon } = config[severity];

  return (
    <Badge variant="outline" className={cn("gap-1", color)}>
      <Icon className="h-3 w-3" />
      {t(severity)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: FindingStatus }) {
  const t = useTranslations("findings.status");

  const config: Record<FindingStatus, { color: string }> = {
    OPEN: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    },
    CAP_REQUIRED: {
      color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
    },
    CAP_SUBMITTED: {
      color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    },
    CAP_ACCEPTED: {
      color: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
    },
    IN_PROGRESS: {
      color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    },
    VERIFICATION: {
      color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    CLOSED: {
      color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300",
    },
    DEFERRED: {
      color: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300",
    },
  };

  const { color } = config[status] || config.OPEN;

  return (
    <Badge variant="outline" className={color}>
      {t(status)}
    </Badge>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReviewFindingsClient({
  reviewId,
  locale,
  referenceNumber,
  organizationName,
  organizationCode,
}: ReviewFindingsClientProps) {
  const t = useTranslations("findings");

  // Fetch findings for this review
  const { data, isLoading, error } = trpc.finding.getByReview.useQuery({
    reviewId,
  });

  type FindingItem = {
    id: string;
    referenceNumber: string;
    severity: FindingSeverity;
    status: FindingStatus;
    titleEn: string | null;
    titleFr: string | null;
    descriptionEn: string | null;
    descriptionFr: string | null;
    createdAt: Date | string;
  };
  const findings: FindingItem[] = data ?? [];

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/${locale}/reviews/${reviewId}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToReview")}
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{referenceNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>
              {organizationName}
              {organizationCode && ` (${organizationCode})`}
            </span>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 flex-1" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p>{error.message}</p>
            </div>
          ) : findings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileWarning className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-medium">{t("noFindings")}</h3>
              <p className="text-sm mt-1">{t("noFindingsDescription")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">{t("table.reference")}</TableHead>
                  <TableHead className="w-28">{t("table.severity")}</TableHead>
                  <TableHead className="w-28">{t("table.status")}</TableHead>
                  <TableHead>{t("table.title")}</TableHead>
                  <TableHead className="w-32">{t("table.date")}</TableHead>
                  <TableHead className="w-24 text-right">
                    {t("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((finding) => (
                  <TableRow key={finding.id}>
                    <TableCell className="font-mono text-sm">
                      {finding.referenceNumber}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={finding.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={finding.status} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium line-clamp-1">
                          {locale === "fr" && finding.titleFr
                            ? finding.titleFr
                            : finding.titleEn}
                        </p>
                        {finding.descriptionEn && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {locale === "fr" && finding.descriptionFr
                              ? finding.descriptionFr
                              : finding.descriptionEn}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(finding.createdAt), "PP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/findings/${finding.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          {t("actions.view")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {!isLoading && findings.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {t("showingResults", {
            start: 1,
            end: findings.length,
            total: findings.length,
          })}
        </p>
      )}
    </div>
  );
}
