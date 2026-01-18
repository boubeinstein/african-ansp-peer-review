"use client";

/**
 * CAPs List Client Component
 *
 * Client-side component for displaying and filtering Corrective Action Plans.
 * Supports grid/table views, filtering by status and overdue, and pagination.
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Grid3X3,
  List,
  Search,
  XCircle,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CAPStatus, FindingSeverity } from "@prisma/client";
import { CAPCard } from "@/components/features/cap/cap-card";
import { CAPStatusBadge } from "@/components/features/cap/cap-status-badge";

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
    critical: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
    warning: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900",
    success: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900",
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

// CAP type from list query
interface CAPListItem {
  id: string;
  findingId: string;
  status: CAPStatus;
  dueDate: Date | string;
  finding: {
    id: string;
    referenceNumber: string;
    titleEn: string;
    titleFr: string;
    severity: FindingSeverity;
    review: {
      id: string;
      referenceNumber: string;
    };
    organization: {
      id: string;
      nameEn: string;
      nameFr: string;
      icaoCode: string;
    };
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export function CAPsClient() {
  const t = useTranslations("cap");
  const tFinding = useTranslations("findings");
  const locale = useLocale();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Fetch CAPs with filters
  const { data: capsData, isLoading: capsLoading } = trpc.cap.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as CAPStatus) : undefined,
    overdue: overdueFilter || undefined,
    search: search || undefined,
    page,
    pageSize,
  });

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = trpc.cap.getStats.useQuery({});

  const caps = (capsData?.caps || []) as CAPListItem[];
  const pagination = capsData?.pagination;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setOverdueFilter(false);
    setPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || overdueFilter || search;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title={t("stats.total")}
          value={stats?.total || 0}
          icon={FileText}
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("stats.draft")}
          value={(stats?.draft || 0) + (stats?.submitted || 0) + (stats?.underReview || 0)}
          icon={Clock}
          variant="info"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("stats.inProgress")}
          value={(stats?.accepted || 0) + (stats?.inProgress || 0)}
          icon={Wrench}
          variant="warning"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("stats.completed")}
          value={(stats?.completed || 0) + (stats?.verified || 0) + (stats?.closed || 0)}
          icon={CheckCircle}
          variant="success"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("stats.overdue")}
          value={stats?.overdue || 0}
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
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  {Object.values(CAPStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`status.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={overdueFilter ? "destructive" : "outline"}
                size="sm"
                onClick={() => { setOverdueFilter(!overdueFilter); setPage(1); }}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                {t("detail.overdue")}
              </Button>

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
      {capsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-full mb-4" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : caps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t("noCAPs")}</h3>
            <p className="text-muted-foreground text-center max-w-md mt-1">
              {hasActiveFilters ? t("noCAPsWithFilters") : t("noCAPsDescription")}
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
          {caps.map((cap) => (
            <CAPCard key={cap.id} cap={cap} />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("detail.finding")}</TableHead>
                <TableHead>{t("status.DRAFT").split(" ")[0]}</TableHead>
                <TableHead>{tFinding("severity.CRITICAL").split(" ")[0]}</TableHead>
                <TableHead>{t("detail.dueDate")}</TableHead>
                <TableHead>{t("form.assignedTo")}</TableHead>
                <TableHead>{t("organization")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caps.map((cap) => {
                const isOverdue = cap.dueDate &&
                  new Date(cap.dueDate) < new Date() &&
                  !["VERIFIED", "CLOSED"].includes(cap.status);

                const orgName = locale === "fr"
                  ? cap.finding?.organization?.nameFr
                  : cap.finding?.organization?.nameEn;

                const assigneeName = cap.assignedTo
                  ? `${cap.assignedTo.firstName} ${cap.assignedTo.lastName}`
                  : "-";

                return (
                  <TableRow
                    key={cap.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/${locale}/findings/${cap.findingId}`)}
                  >
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {cap.finding?.referenceNumber}
                      </code>
                    </TableCell>
                    <TableCell>
                      <CAPStatusBadge status={cap.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      {cap.finding?.severity && (
                        <Badge
                          variant="outline"
                          className={cn(
                            cap.finding.severity === "CRITICAL" && "bg-red-100 text-red-800",
                            cap.finding.severity === "MAJOR" && "bg-orange-100 text-orange-800",
                            cap.finding.severity === "MINOR" && "bg-yellow-100 text-yellow-800"
                          )}
                        >
                          {tFinding(`severity.${cap.finding.severity}`)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn(isOverdue && "text-red-600 font-medium")}>
                        {format(new Date(cap.dueDate), "MMM d, yyyy")}
                      </span>
                      {isOverdue && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          {t("detail.overdue")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{assigneeName}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">
                      {orgName}
                    </TableCell>
                  </TableRow>
                );
              })}
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
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
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
