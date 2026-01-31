"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Finding {
  id: string;
  reference: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  category?: string;
  assignee?: { id: string; name: string } | null;
  cap?: { id: string; status: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FindingListProps {
  findings: Finding[];
  reviewId: string;
  onSelect: (finding: Finding) => void;
}

const SEVERITIES = ["CRITICAL", "MAJOR", "MINOR", "OBSERVATION"] as const;
const STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED", "VERIFIED"] as const;

const severityConfig = {
  CRITICAL: {
    color: "bg-red-100 text-red-800 border-red-300",
    icon: "🔴",
    order: 0,
  },
  MAJOR: {
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: "🟠",
    order: 1,
  },
  MINOR: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    icon: "🟡",
    order: 2,
  },
  OBSERVATION: {
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "🔵",
    order: 3,
  },
};

const statusConfig = {
  OPEN: { color: "bg-gray-100 text-gray-800", icon: AlertCircle },
  IN_PROGRESS: { color: "bg-blue-100 text-blue-800", icon: Clock },
  CLOSED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  VERIFIED: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
};

export function FindingList({
  findings,
  onSelect,
}: FindingListProps) {
  const t = useTranslations("reviews.detail.findings");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter findings
  const filteredFindings = findings
    .filter((finding) => {
      const matchesSearch =
        finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        finding.reference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity =
        severityFilter === "all" || finding.severity === severityFilter;
      const matchesStatus =
        statusFilter === "all" || finding.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by severity first, then by date
      const severityDiff =
        (severityConfig[a.severity as keyof typeof severityConfig]?.order ??
          99) -
        (severityConfig[b.severity as keyof typeof severityConfig]?.order ??
          99);
      if (severityDiff !== 0) return severityDiff;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

  // Calculate severity counts
  const severityCounts = findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      {/* Severity Summary */}
      <div className="flex flex-wrap gap-2">
        {SEVERITIES.map((severity) => {
          const count = severityCounts[severity] || 0;
          if (count === 0) return null;
          const config = severityConfig[severity];
          return (
            <Badge
              key={severity}
              variant="outline"
              className={cn(
                "cursor-pointer transition-opacity",
                config.color,
                severityFilter !== "all" &&
                  severityFilter !== severity &&
                  "opacity-50"
              )}
              onClick={() =>
                setSeverityFilter(severityFilter === severity ? "all" : severity)
              }
            >
              {config.icon} {t(`severity.${severity}`)} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder={t("filterSeverity")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allSeverities")}</SelectItem>
            {SEVERITIES.map((sev) => (
              <SelectItem key={sev} value={sev}>
                {severityConfig[sev].icon} {t(`severity.${sev}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder={t("filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Finding List */}
      {filteredFindings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">
              {searchQuery ||
              severityFilter !== "all" ||
              statusFilter !== "all"
                ? t("noResults")
                : t("empty.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ||
              severityFilter !== "all" ||
              statusFilter !== "all"
                ? t("tryDifferent")
                : t("empty.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredFindings.map((finding) => {
            const severity =
              severityConfig[finding.severity as keyof typeof severityConfig];
            const status =
              statusConfig[finding.status as keyof typeof statusConfig];
            const StatusIcon = status?.icon || AlertCircle;

            return (
              <Card
                key={finding.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors border-l-4",
                  finding.severity === "CRITICAL" && "border-l-red-500",
                  finding.severity === "MAJOR" && "border-l-orange-500",
                  finding.severity === "MINOR" && "border-l-yellow-500",
                  finding.severity === "OBSERVATION" && "border-l-blue-500"
                )}
                onClick={() => onSelect(finding)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-mono", severity?.color)}
                        >
                          {finding.reference}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", severity?.color)}
                        >
                          {severity?.icon} {t(`severity.${finding.severity}`)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", status?.color)}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {t(`status.${finding.status}`)}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h4 className="font-medium mb-1 line-clamp-2">
                        {finding.title}
                      </h4>

                      {/* Meta Row */}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        {finding.assignee && <span>{finding.assignee.name}</span>}
                        {finding.cap && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {t("capLinked")}
                          </span>
                        )}
                        <span>
                          {formatDistanceToNow(new Date(finding.updatedAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
