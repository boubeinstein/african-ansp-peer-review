"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Grid3X3,
  List,
  MoreHorizontal,
  Pencil,
  Search,
  XCircle,
  FileWarning,
  ThumbsUp,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FindingStatus, FindingSeverity, FindingType } from "@prisma/client";

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  variant?: "default" | "critical" | "warning" | "success" | "info";
  isLoading?: boolean;
}) {
  const variantStyles = {
    default: "bg-card",
    critical:
      "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
    warning:
      "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900",
    success:
      "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    critical: "text-red-600 dark:text-red-400",
    warning: "text-orange-600 dark:text-orange-400",
    success: "text-green-600 dark:text-green-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  return (
    <Card className={cn("border", variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
          <Icon className={cn("h-8 w-8", iconStyles[variant])} />
        </div>
      </CardContent>
    </Card>
  );
}

// Severity Badge Component
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

// Status Badge Component
function StatusBadge({ status }: { status: FindingStatus }) {
  const t = useTranslations("findings.status");

  const config: Record<
    FindingStatus,
    { color: string; icon: React.ElementType }
  > = {
    OPEN: {
      color:
        "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
      icon: Clock,
    },
    CAP_REQUIRED: {
      color:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      icon: AlertTriangle,
    },
    CAP_SUBMITTED: {
      color:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      icon: FileWarning,
    },
    CAP_ACCEPTED: {
      color:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
      icon: CheckCircle,
    },
    IN_PROGRESS: {
      color:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      icon: Clock,
    },
    VERIFICATION: {
      color:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      icon: Eye,
    },
    CLOSED: {
      color:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      icon: CheckCircle,
    },
    DEFERRED: {
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      icon: XCircle,
    },
  };

  const { color, icon: Icon } = config[status];

  return (
    <Badge variant="outline" className={cn("gap-1", color)}>
      <Icon className="h-3 w-3" />
      {t(status)}
    </Badge>
  );
}

// Finding Type Badge Component
function FindingTypeBadge({ type }: { type: FindingType }) {
  const t = useTranslations("findings.type");

  const config: Record<
    FindingType,
    { color: string; icon: React.ElementType }
  > = {
    NON_CONFORMITY: {
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      icon: XCircle,
    },
    OBSERVATION: {
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      icon: Eye,
    },
    RECOMMENDATION: {
      color:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      icon: Lightbulb,
    },
    GOOD_PRACTICE: {
      color:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      icon: ThumbsUp,
    },
    CONCERN: {
      color:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      icon: AlertCircle,
    },
  };

  const { color, icon: Icon } = config[type];

  return (
    <Badge variant="outline" className={cn("gap-1", color)}>
      <Icon className="h-3 w-3" />
      {t(type)}
    </Badge>
  );
}

// Finding interface based on router response
interface Finding {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  findingType: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  targetCloseDate: string | null;
  review: {
    id: string;
    referenceNumber: string;
  } | null;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    icaoCode: string | null;
  } | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

// Finding Card Component
function FindingCard({ finding, locale }: { finding: Finding; locale: string }) {
  const t = useTranslations("findings");
  const router = useRouter();

  const title = locale === "fr" ? finding.titleFr : finding.titleEn;
  const description =
    locale === "fr" ? finding.descriptionFr : finding.descriptionEn;
  const assigneeName = finding.assignedTo
    ? `${finding.assignedTo.firstName} ${finding.assignedTo.lastName}`
    : null;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/${locale}/findings/${finding.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {finding.referenceNumber}
              </code>
              <FindingTypeBadge type={finding.findingType} />
            </div>
            <CardTitle className="text-base line-clamp-2">{title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${locale}/findings/${finding.id}`);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                {t("actions.view")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${locale}/findings/${finding.id}/edit`);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {t("actions.edit")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={finding.severity} />
          <StatusBadge status={finding.status} />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <span>{finding.review?.referenceNumber || "-"}</span>
          </div>
          <div>
            {finding.targetCloseDate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span
                      className={cn(
                        new Date(finding.targetCloseDate) < new Date() &&
                          finding.status !== "CLOSED"
                          ? "text-red-600 font-medium"
                          : ""
                      )}
                    >
                      {format(new Date(finding.targetCloseDate), "MMM d, yyyy")}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{t("detail.targetCloseDate")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {assigneeName && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t("form.assignedTo")}:</span>
            <span>{assigneeName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Client Component
export function FindingsClient() {
  const t = useTranslations("findings");
  const locale = useLocale();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Fetch findings with filters
  const { data: findingsData, isLoading: findingsLoading } =
    trpc.finding.list.useQuery({
      search: search || undefined,
      status:
        statusFilter !== "all" ? (statusFilter as FindingStatus) : undefined,
      severity:
        severityFilter !== "all"
          ? (severityFilter as FindingSeverity)
          : undefined,
      findingType:
        typeFilter !== "all" ? (typeFilter as FindingType) : undefined,
      page,
      pageSize,
    });

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } =
    trpc.finding.getStats.useQuery({});

  const findings = (findingsData?.findings || []) as Finding[];
  const pagination = findingsData?.pagination;

  // Use individual status counts that match the dropdown filters
  // Previously used aggregated counts which caused mismatch between stats and filtered lists
  const openCount = stats?.byStatus?.OPEN || 0;
  const inProgressCount = stats?.byStatus?.IN_PROGRESS || 0;
  const criticalCount = stats?.bySeverity?.CRITICAL || 0;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSeverityFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    search ||
    statusFilter !== "all" ||
    severityFilter !== "all" ||
    typeFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title={t("stats.total")}
          value={stats?.total || 0}
          icon={FileWarning}
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("stats.open")}
          value={openCount}
          icon={Clock}
          variant="warning"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("stats.inProgress")}
          value={inProgressCount}
          icon={AlertCircle}
          variant="info"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("stats.closed")}
          value={stats?.closed || 0}
          icon={CheckCircle}
          variant="success"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("severity.CRITICAL")}
          value={criticalCount}
          icon={AlertTriangle}
          variant="critical"
          isLoading={statsLoading}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t("filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  {Object.values(FindingStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`status.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={severityFilter}
                onValueChange={(v) => {
                  setSeverityFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("filterBySeverity")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allSeverities")}</SelectItem>
                  {Object.values(FindingSeverity).map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {t(`severity.${severity}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t("filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                  {Object.values(FindingType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`type.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <XCircle className="h-4 w-4 mr-1" />
                  {t("clearFilters")}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {findingsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full" />
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : findings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t("noFindings")}</h3>
            <p className="text-muted-foreground text-center max-w-md mt-1">
              {hasActiveFilters
                ? t("noFindingsWithFilters")
                : t("noFindingsDescription")}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                {t("clearFilters")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} locale={locale} />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("referenceNumber")}</TableHead>
                <TableHead>{t("filterByType")}</TableHead>
                <TableHead>{t("filterBySeverity")}</TableHead>
                <TableHead>{t("filterByStatus")}</TableHead>
                <TableHead>{t("detail.review")}</TableHead>
                <TableHead>{t("detail.targetCloseDate")}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings.map((finding) => (
                <TableRow
                  key={finding.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/${locale}/findings/${finding.id}`)
                  }
                >
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {finding.referenceNumber}
                    </code>
                  </TableCell>
                  <TableCell>
                    <FindingTypeBadge type={finding.findingType} />
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={finding.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={finding.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {finding.review?.referenceNumber || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {finding.targetCloseDate ? (
                      <span
                        className={cn(
                          new Date(finding.targetCloseDate) < new Date() &&
                            finding.status !== "CLOSED"
                            ? "text-red-600 font-medium"
                            : ""
                        )}
                      >
                        {format(
                          new Date(finding.targetCloseDate),
                          "MMM d, yyyy"
                        )}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/${locale}/findings/${finding.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("actions.view")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/${locale}/findings/${finding.id}/edit`
                            );
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          {t("actions.edit")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("showingResults", {
              start: (page - 1) * pageSize + 1,
              end: Math.min(page * pageSize, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="48">48</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                {t("previous")}
              </Button>
              <span className="text-sm px-2">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
