"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ScrollText,
  Activity,
  Database,
  Zap,
  RefreshCw,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Action badge color mapping
const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  SUBMISSION: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  STATUS_CHANGE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  LOGIN: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  LOGOUT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  APPROVAL: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  REJECTION: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  ASSIGNMENT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  VERIFICATION: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  EXPORT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  VIEW_SENSITIVE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const DEFAULT_BADGE = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

const PAGE_SIZE = 20;

interface AuditLogsClientProps {
  locale: string;
  userRole: string;
}

interface Filters {
  entityType: string;
  action: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export function AuditLogsClient({ locale }: AuditLogsClientProps) {
  const t = useTranslations("auditLogs");
  const utils = trpc.useUtils();
  const isFrench = locale === "fr";

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    entityType: "",
    action: "",
    startDate: undefined,
    endDate: undefined,
  });
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.audit.getSummary.useQuery(
    { days: 30 },
    { staleTime: 60_000 }
  );

  const { data: entityTypes } = trpc.audit.getEntityTypes.useQuery(
    undefined,
    { staleTime: 5 * 60_000 }
  );

  const { data: actions } = trpc.audit.getActions.useQuery(
    undefined,
    { staleTime: 5 * 60_000 }
  );

  const logsInput = {
    page: currentPage,
    pageSize: PAGE_SIZE,
    entityType: filters.entityType || undefined,
    action: filters.action || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  } as Parameters<(typeof trpc.audit.getLogs)["useQuery"]>[0];

  const { data: logsData, isLoading: logsLoading } = trpc.audit.getLogs.useQuery(logsInput);

  const { data: logDetail, isLoading: detailLoading } = trpc.audit.getById.useQuery(
    { id: selectedLogId! },
    { enabled: !!selectedLogId }
  );

  const exportMutation = trpc.audit.exportToCSV.useMutation({
    onSuccess: (csvString) => {
      const blob = new Blob([csvString], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("exportCSV"));
    },
    onError: () => {
      toast.error("Export failed");
    },
  });

  // Derived
  const logs = logsData?.logs ?? [];
  const total = logsData?.total ?? 0;
  const totalPages = logsData?.totalPages ?? 1;
  const from = total > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  const hasActiveFilters = !!(filters.entityType || filters.action || filters.startDate || filters.endDate);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.entityType) count++;
    if (filters.action) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  }, [filters]);

  // Handlers
  const handleRefresh = () => {
    utils.audit.getLogs.invalidate();
    utils.audit.getSummary.invalidate();
  };

  const handleClearFilters = () => {
    setFilters({ entityType: "", action: "", startDate: undefined, endDate: undefined });
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    exportMutation.mutate({
      entityType: filters.entityType || undefined,
      action: filters.action || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    } as Parameters<typeof exportMutation.mutate>[0]);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "PPp", { locale: isFrench ? fr : undefined });
  };

  const formatShortDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "PP", { locale: isFrench ? fr : undefined });
  };

  const formatRelativeTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return isFrench ? "maintenant" : "just now";
    if (diffMins < 60) return isFrench ? `il y a ${diffMins}m` : `${diffMins}m ago`;
    if (diffHours < 24) return isFrench ? `il y a ${diffHours}h` : `${diffHours}h ago`;
    return isFrench ? `il y a ${diffDays}j` : `${diffDays}d ago`;
  };

  return (
    <div className="container mx-auto py-6 px-4 lg:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("refresh")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={exportMutation.isPending || total === 0}
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {t("exportCSV")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t("totalLogs")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold">{stats?.totalLogs ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("last30Days")}: {stats?.totalLogs ?? 0}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Action */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              {t("topAction")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : stats?.byAction?.[0] ? (
              <>
                <Badge className={cn("text-sm", ACTION_COLORS[stats.byAction[0].action] || DEFAULT_BADGE)}>
                  {stats.byAction[0].action}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.byAction[0].count} {t("occurrences")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">--</p>
            )}
          </CardContent>
        </Card>

        {/* Top Entity Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t("topEntityType")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : stats?.byEntityType?.[0] ? (
              <>
                <p className="text-lg font-semibold">{stats.byEntityType[0].entityType}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.byEntityType[0].count} {t("occurrences")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">--</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t("recentActivity")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : stats?.recentActivity?.length ? (
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {stats.recentActivity.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="truncate flex-1 mr-2">
                      {item.userName} - {item.action}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("last10Actions")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
            <span className="text-sm font-medium flex items-center gap-2">
              {t("filters")}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} {t("active")}
                </Badge>
              )}
            </span>

            <div className="flex flex-wrap gap-3 flex-1">
              {/* Entity Type Select */}
              <Select
                value={filters.entityType}
                onValueChange={(value) => {
                  setFilters((f) => ({ ...f, entityType: value === "all" ? "" : value }));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("allEntityTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allEntityTypes")}</SelectItem>
                  {entityTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action Select */}
              <Select
                value={filters.action}
                onValueChange={(value) => {
                  setFilters((f) => ({ ...f, action: value === "all" ? "" : value }));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("allActions")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allActions")}</SelectItem>
                  {actions?.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? formatShortDate(filters.startDate) : t("startDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => {
                      setFilters((f) => ({ ...f, startDate: date ?? undefined }));
                      setCurrentPage(1);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? formatShortDate(filters.endDate) : t("endDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => {
                      setFilters((f) => ({ ...f, endDate: date ?? undefined }));
                      setCurrentPage(1);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-1" />
                {t("clearFilters")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("auditLogs")}</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScrollText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("noLogsFound")}</p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                  {t("clearFilters")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("timestamp")}</TableHead>
                      <TableHead>{t("user")}</TableHead>
                      <TableHead>{t("action")}</TableHead>
                      <TableHead>{t("entityType")}</TableHead>
                      <TableHead>{t("entityId")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedLogId(log.id)}
                      >
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user
                            ? `${log.user.firstName} ${log.user.lastName}`
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", ACTION_COLORS[log.action] || DEFAULT_BADGE)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.entityType}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {log.entityId.length > 12
                            ? `${log.entityId.slice(0, 12)}...`
                            : log.entityId}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("showingLogs", { from, to, total })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("previous")}
                  </Button>
                  <span className="text-sm">
                    {t("page")} {currentPage} {t("of")} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {t("next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLogId} onOpenChange={(open) => !open && setSelectedLogId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("logDetails")}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : logDetail ? (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("logId")}</p>
                  <p className="text-sm font-mono">{logDetail.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("timestamp")}</p>
                  <p className="text-sm">{formatDate(logDetail.createdAt)}</p>
                </div>
              </div>

              {/* User Info */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("user")}</p>
                {logDetail.user ? (
                  <div className="text-sm">
                    <p>{logDetail.user.firstName} {logDetail.user.lastName}</p>
                    <p className="text-muted-foreground">{logDetail.user.email}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{logDetail.user.role}</Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">--</p>
                )}
              </div>

              {/* Action / Entity */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("action")}</p>
                  <Badge className={cn("mt-1", ACTION_COLORS[logDetail.action] || DEFAULT_BADGE)}>
                    {logDetail.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("entityType")}</p>
                  <p className="text-sm">{logDetail.entityType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("entityId")}</p>
                  <p className="text-sm font-mono break-all">{logDetail.entityId}</p>
                </div>
              </div>

              {/* Network Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("ipAddress")}</p>
                  <p className="text-sm font-mono">{logDetail.ipAddress ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("userAgent")}</p>
                  <p className="text-sm text-muted-foreground break-all">
                    {logDetail.userAgent ?? "—"}
                  </p>
                </div>
              </div>

              {/* Previous State */}
              {logDetail.previousState && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("previousState")}</p>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-48">
                    {JSON.stringify(logDetail.previousState, null, 2)}
                  </pre>
                </div>
              )}

              {/* New State */}
              {logDetail.newState && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("newState")}</p>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-48">
                    {JSON.stringify(logDetail.newState, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {logDetail.metadata && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("metadata")}</p>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-48">
                    {JSON.stringify(logDetail.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* No changes fallback */}
              {!logDetail.previousState && !logDetail.newState && !logDetail.metadata && (
                <p className="text-sm text-muted-foreground italic">{t("noChangesRecorded")}</p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AuditLogsClient;
