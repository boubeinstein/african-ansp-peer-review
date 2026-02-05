"use client";

/**
 * Audit Logs Viewer - Admin Interface
 *
 * Comprehensive audit log viewing with:
 * - Filtering by entity type, action, user, and date range
 * - Search functionality
 * - CSV export for compliance
 * - Diff viewing for state changes
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Activity,
  FileText,
  Clock,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AuditAction } from "@/types/prisma-enums";

// Helper to format dates
function formatDateForDisplay(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

// =============================================================================
// TYPES
// =============================================================================

interface AuditLogsViewerProps {
  locale: string;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousState: unknown;
  newState: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// =============================================================================
// ACTION BADGE COMPONENT
// =============================================================================

function ActionBadge({ action }: { action: AuditAction }) {
  const actionStyles: Record<AuditAction, string> = {
    CREATE: "bg-green-100 text-green-800 border-green-200",
    UPDATE: "bg-blue-100 text-blue-800 border-blue-200",
    DELETE: "bg-red-100 text-red-800 border-red-200",
    STATUS_CHANGE: "bg-purple-100 text-purple-800 border-purple-200",
    APPROVAL: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REJECTION: "bg-orange-100 text-orange-800 border-orange-200",
    ASSIGNMENT: "bg-cyan-100 text-cyan-800 border-cyan-200",
    SUBMISSION: "bg-indigo-100 text-indigo-800 border-indigo-200",
    VERIFICATION: "bg-teal-100 text-teal-800 border-teal-200",
    LOGIN: "bg-gray-100 text-gray-800 border-gray-200",
    LOGOUT: "bg-gray-100 text-gray-800 border-gray-200",
    LOGIN_FAILED: "bg-red-100 text-red-800 border-red-200",
    EXPORT: "bg-yellow-100 text-yellow-800 border-yellow-200",
    VIEW_SENSITIVE: "bg-pink-100 text-pink-800 border-pink-200",
    INTEGRITY_CHECK: "bg-sky-100 text-sky-800 border-sky-200",
    VERSION_LOCK: "bg-amber-100 text-amber-800 border-amber-200",
    VERSION_UNLOCK: "bg-lime-100 text-lime-800 border-lime-200",
    TOKEN_CREATE: "bg-violet-100 text-violet-800 border-violet-200",
    TOKEN_ACCESS: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    TOKEN_REVOKE: "bg-rose-100 text-rose-800 border-rose-200",
    TOKEN_REVOKE_ALL: "bg-red-100 text-red-800 border-red-200",
    SESSION_REVOKED: "bg-orange-100 text-orange-800 border-orange-200",
    ALL_SESSIONS_REVOKED: "bg-red-100 text-red-800 border-red-200",
    ADMIN_SESSION_REVOKED: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <Badge variant="outline" className={actionStyles[action] || "bg-gray-100"}>
      {action.replace(/_/g, " ")}
    </Badge>
  );
}

// =============================================================================
// DIFF VIEWER COMPONENT
// =============================================================================

function DiffViewer({
  previousState,
  newState,
}: {
  previousState: unknown;
  newState: unknown;
}) {
  const t = useTranslations("auditLogs");

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const getChangedKeys = (): string[] => {
    const prev = previousState as Record<string, unknown> | null;
    const next = newState as Record<string, unknown> | null;
    const keys = new Set<string>();

    if (prev) Object.keys(prev).forEach((k) => keys.add(k));
    if (next) Object.keys(next).forEach((k) => keys.add(k));

    return Array.from(keys).filter((key) => {
      const prevVal = prev?.[key];
      const nextVal = next?.[key];
      return JSON.stringify(prevVal) !== JSON.stringify(nextVal);
    });
  };

  const changedKeys = getChangedKeys();

  if (changedKeys.length === 0 && !previousState && !newState) {
    return (
      <p className="text-muted-foreground text-sm">{t("noChangesRecorded")}</p>
    );
  }

  return (
    <div className="space-y-4">
      {changedKeys.length > 0 ? (
        <div className="space-y-3">
          {changedKeys.map((key) => {
            const prev = (previousState as Record<string, unknown>)?.[key];
            const next = (newState as Record<string, unknown>)?.[key];
            return (
              <div key={key} className="border rounded-lg p-3">
                <p className="font-medium text-sm mb-2">{key}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 p-2 rounded border border-red-200">
                    <p className="text-xs text-red-600 font-medium mb-1">
                      {t("previousValue")}
                    </p>
                    <pre className="text-xs text-red-800 whitespace-pre-wrap break-words">
                      {renderValue(prev)}
                    </pre>
                  </div>
                  <div className="bg-green-50 p-2 rounded border border-green-200">
                    <p className="text-xs text-green-600 font-medium mb-1">
                      {t("newValue")}
                    </p>
                    <pre className="text-xs text-green-800 whitespace-pre-wrap break-words">
                      {renderValue(next)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {previousState ? (
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="text-xs text-red-600 font-medium mb-2">
                {t("previousState")}
              </p>
              <pre className="text-xs text-red-800 whitespace-pre-wrap break-words max-h-60 overflow-auto">
                {renderValue(previousState)}
              </pre>
            </div>
          ) : null}
          {newState ? (
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <p className="text-xs text-green-600 font-medium mb-2">
                {t("newState")}
              </p>
              <pre className="text-xs text-green-800 whitespace-pre-wrap break-words max-h-60 overflow-auto">
                {renderValue(newState)}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LOG DETAIL DIALOG
// =============================================================================

function LogDetailDialog({
  log,
  open,
  onClose,
}: {
  log: AuditLogEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("auditLogs");

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t("logDetails")}
          </DialogTitle>
          <DialogDescription>
            {t("logId")}: {log.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("user")}
              </p>
              <p className="font-medium">
                {log.user.firstName} {log.user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{log.user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("timestamp")}
              </p>
              <p className="font-medium">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("action")}
              </p>
              <ActionBadge action={log.action} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("entityType")}
              </p>
              <p className="font-medium">{log.entityType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("entityId")}
              </p>
              <p className="font-mono text-sm">{log.entityId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("ipAddress")}
              </p>
              <p className="font-mono text-sm">{log.ipAddress || "N/A"}</p>
            </div>
          </div>

          {/* Changes */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t("changes")}
            </p>
            <DiffViewer
              previousState={log.previousState}
              newState={log.newState}
            />
          </div>

          {/* Metadata */}
          {log.metadata ? (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t("metadata")}
              </p>
              <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          ) : null}

          {/* User Agent */}
          {log.userAgent && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t("userAgent")}
              </p>
              <p className="text-xs text-muted-foreground break-all">
                {log.userAgent}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AuditLogsViewer({ locale }: AuditLogsViewerProps) {
  const t = useTranslations("auditLogs");

  // State for filters
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<string | undefined>();
  const [action, setAction] = useState<AuditAction | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 50;

  // Fetch audit logs
  const {
    data: logsData,
    isLoading,
    refetch,
  } = trpc.audit.getLogs.useQuery({
    page,
    pageSize,
    entityType,
    action,
    startDate,
    endDate,
    orderBy: "desc",
  });

  // Fetch entity types for filter
  const { data: entityTypes } = trpc.audit.getEntityTypes.useQuery();

  // Fetch actions for filter
  const { data: actions } = trpc.audit.getActions.useQuery();

  // Fetch summary
  const { data: summary, isLoading: summaryLoading } =
    trpc.audit.getSummary.useQuery({ days: 30 });

  // Export mutation
  const exportMutation = trpc.audit.exportToCSV.useMutation({
    onSuccess: (csvContent) => {
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      entityType,
      action,
      startDate,
      endDate,
    });
  };

  const handleClearFilters = () => {
    setEntityType(undefined);
    setAction(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const hasActiveFilters = entityType || action || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")}
            />
            {t("refresh")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {t("exportCSV")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {summaryLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("totalLogs")}
                    </p>
                    <p className="text-2xl font-bold">
                      {summary?.totalLogs || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("last30Days")}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("topAction")}
                    </p>
                    <p className="text-2xl font-bold">
                      {summary?.byAction[0]?.action?.replace(/_/g, " ") || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {summary?.byAction[0]?.count || 0} {t("occurrences")}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("topEntityType")}
                    </p>
                    <p className="text-2xl font-bold">
                      {summary?.byEntityType[0]?.entityType || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {summary?.byEntityType[0]?.count || 0} {t("occurrences")}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("recentActivity")}
                    </p>
                    <p className="text-2xl font-bold">
                      {summary?.recentActivity.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("last10Actions")}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t("filters")}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {t("active")}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {/* Entity Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("entityType")}</label>
                <Select
                  value={entityType || "all"}
                  onValueChange={(v) =>
                    setEntityType(v === "all" ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("allEntityTypes")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allEntityTypes")}</SelectItem>
                    {entityTypes?.map((type: string) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("action")}</label>
                <Select
                  value={action || "all"}
                  onValueChange={(v) =>
                    setAction(v === "all" ? undefined : (v as AuditAction))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("allActions")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allActions")}</SelectItem>
                    {(actions as string[])?.map((a: string) => (
                        <SelectItem key={a} value={a}>
                        {a.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("startDate")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? formatDateForDisplay(startDate, locale) : t("selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("endDate")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? formatDateForDisplay(endDate, locale) : t("selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                {t("clearFilters")}
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("auditLogs")}</CardTitle>
          <CardDescription>
            {t("showingLogs", {
              from: ((page - 1) * pageSize + 1).toString(),
              to: Math.min(page * pageSize, logsData?.total || 0).toString(),
              total: (logsData?.total || 0).toString(),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : logsData?.logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mb-4" />
              <p>{t("noLogsFound")}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("timestamp")}</TableHead>
                    <TableHead>{t("user")}</TableHead>
                    <TableHead>{t("action")}</TableHead>
                    <TableHead>{t("entityType")}</TableHead>
                    <TableHead>{t("entityId")}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData?.logs.map((log: AuditLogEntry) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {log.user.firstName} {log.user.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={log.action} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.entityType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entityId.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log as AuditLogEntry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("page")} {page} {t("of")}{" "}
                  {Math.ceil((logsData?.total || 0) / pageSize)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {t("previous")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={
                      page >= Math.ceil((logsData?.total || 0) / pageSize)
                    }
                  >
                    {t("next")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <LogDetailDialog
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

export default AuditLogsViewer;
