"use client";

/**
 * Report Findings Table Component
 *
 * Sortable, filterable table displaying all findings for a review.
 * Supports export to CSV.
 */

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Download,
  ExternalLink,
  AlertTriangle,
  AlertOctagon,
  Info,
  Lightbulb,
  ThumbsUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FindingType, FindingSeverity, FindingStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface Finding {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  findingType: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  criticalElement: string | null;
  icaoReference: string | null;
  capRequired: boolean;
  targetCloseDate: Date | null;
}

interface ReportFindingsTableProps {
  findings: Finding[];
  onViewFinding?: (id: string) => void;
  className?: string;
}

type SortField = "referenceNumber" | "findingType" | "severity" | "status";
type SortOrder = "asc" | "desc";

// =============================================================================
// CONFIGURATION
// =============================================================================

const TYPE_CONFIG: Record<FindingType, { icon: React.ElementType; color: string }> = {
  NON_CONFORMITY: {
    icon: AlertOctagon,
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  },
  OBSERVATION: {
    icon: Info,
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  },
  CONCERN: {
    icon: AlertTriangle,
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  },
  RECOMMENDATION: {
    icon: Lightbulb,
    color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  },
  GOOD_PRACTICE: {
    icon: ThumbsUp,
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  },
};

const SEVERITY_CONFIG: Record<FindingSeverity, { color: string; priority: number }> = {
  CRITICAL: {
    color: "bg-red-600 text-white",
    priority: 1,
  },
  MAJOR: {
    color: "bg-orange-600 text-white",
    priority: 2,
  },
  MINOR: {
    color: "bg-yellow-500 text-white",
    priority: 3,
  },
  OBSERVATION: {
    color: "bg-blue-500 text-white",
    priority: 4,
  },
};

const STATUS_CONFIG: Record<FindingStatus, { color: string }> = {
  OPEN: { color: "bg-slate-100 text-slate-800 border-slate-200" },
  CAP_REQUIRED: { color: "bg-amber-100 text-amber-800 border-amber-200" },
  CAP_SUBMITTED: { color: "bg-blue-100 text-blue-800 border-blue-200" },
  CAP_ACCEPTED: { color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  IN_PROGRESS: { color: "bg-purple-100 text-purple-800 border-purple-200" },
  VERIFICATION: { color: "bg-teal-100 text-teal-800 border-teal-200" },
  CLOSED: { color: "bg-green-100 text-green-800 border-green-200" },
  DEFERRED: { color: "bg-gray-100 text-gray-800 border-gray-200" },
};

// =============================================================================
// SORTABLE HEADER
// =============================================================================

function SortableHeader({
  field,
  currentSort,
  currentOrder,
  onSort,
  children,
}: {
  field: SortField;
  currentSort: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = currentSort === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => onSort(field)}
    >
      {children}
      {isActive ? (
        currentOrder === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportFindingsTable({
  findings,
  onViewFinding,
  className,
}: ReportFindingsTableProps) {
  const t = useTranslations("report.findings");
  const tFinding = useTranslations("finding");
  const locale = useLocale();
  const router = useRouter();

  // Sort state
  const [sortField, setSortField] = useState<SortField>("severity");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Filter state
  const [typeFilter, setTypeFilter] = useState<FindingType | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "ALL">("ALL");

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Clear filters
  const clearFilters = () => {
    setTypeFilter("ALL");
    setSeverityFilter("ALL");
    setStatusFilter("ALL");
  };

  const hasActiveFilters =
    typeFilter !== "ALL" || severityFilter !== "ALL" || statusFilter !== "ALL";

  // Filtered and sorted findings
  const filteredFindings = useMemo(() => {
    let result = [...findings];

    // Apply filters
    if (typeFilter !== "ALL") {
      result = result.filter((f) => f.findingType === typeFilter);
    }
    if (severityFilter !== "ALL") {
      result = result.filter((f) => f.severity === severityFilter);
    }
    if (statusFilter !== "ALL") {
      result = result.filter((f) => f.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "referenceNumber":
          comparison = a.referenceNumber.localeCompare(b.referenceNumber);
          break;
        case "findingType":
          comparison = a.findingType.localeCompare(b.findingType);
          break;
        case "severity":
          comparison =
            SEVERITY_CONFIG[a.severity].priority -
            SEVERITY_CONFIG[b.severity].priority;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [findings, typeFilter, severityFilter, statusFilter, sortField, sortOrder]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Reference",
      "Type",
      "Severity",
      "Status",
      "Title (EN)",
      "Title (FR)",
      "Critical Element",
      "ICAO Reference",
      "CAP Required",
    ];

    const rows = filteredFindings.map((f) => [
      f.referenceNumber,
      f.findingType,
      f.severity,
      f.status,
      `"${f.titleEn.replace(/"/g, '""')}"`,
      `"${f.titleFr.replace(/"/g, '""')}"`,
      f.criticalElement || "",
      f.icaoReference || "",
      f.capRequired ? "Yes" : "No",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    // Add UTF-8 BOM for Excel compatibility with French characters
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `findings-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle view finding
  const handleViewFinding = (id: string) => {
    if (onViewFinding) {
      onViewFinding(id);
    } else {
      router.push(`/${locale}/findings/${id}`);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            {t("title")}
            <Badge variant="secondary">{filteredFindings.length}</Badge>
          </CardTitle>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Filters */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {t("filters")}
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1">
                      !
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-4">
                <div className="space-y-4">
                  {/* Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("filterByType")}</label>
                    <Select
                      value={typeFilter}
                      onValueChange={(v) => setTypeFilter(v as FindingType | "ALL")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                        {Object.keys(TYPE_CONFIG).map((type) => (
                          <SelectItem key={type} value={type}>
                            {tFinding(`type.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Severity Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("filterBySeverity")}</label>
                    <Select
                      value={severityFilter}
                      onValueChange={(v) =>
                        setSeverityFilter(v as FindingSeverity | "ALL")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("allSeverities")}</SelectItem>
                        {Object.keys(SEVERITY_CONFIG).map((severity) => (
                          <SelectItem key={severity} value={severity}>
                            {tFinding(`severity.${severity}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("filterByStatus")}</label>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v as FindingStatus | "ALL")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                        {Object.keys(STATUS_CONFIG).map((status) => (
                          <SelectItem key={status} value={status}>
                            {tFinding(`status.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t("clearFilters")}
                    </Button>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Button */}
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              {t("exportCSV")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredFindings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {hasActiveFilters ? t("noMatchingFindings") : t("noFindings")}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    <SortableHeader
                      field="referenceNumber"
                      currentSort={sortField}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    >
                      {t("reference")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="w-[140px]">
                    <SortableHeader
                      field="findingType"
                      currentSort={sortField}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    >
                      {t("type")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <SortableHeader
                      field="severity"
                      currentSort={sortField}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    >
                      {t("severity")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="w-[130px]">
                    <SortableHeader
                      field="status"
                      currentSort={sortField}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    >
                      {t("status")}
                    </SortableHeader>
                  </TableHead>
                  <TableHead>{t("titleColumn")}</TableHead>
                  <TableHead className="w-[80px] text-center">{t("cap")}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFindings.map((finding) => {
                  const typeConfig = TYPE_CONFIG[finding.findingType];
                  const TypeIcon = typeConfig.icon;
                  const title = locale === "fr" ? finding.titleFr : finding.titleEn;

                  return (
                    <TableRow
                      key={finding.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewFinding(finding.id)}
                    >
                      <TableCell className="font-mono text-sm">
                        {finding.referenceNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1", typeConfig.color)}>
                          <TypeIcon className="h-3 w-3" />
                          <span className="truncate max-w-[80px]">
                            {tFinding(`type.${finding.findingType}`)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={SEVERITY_CONFIG[finding.severity].color}>
                          {tFinding(`severity.${finding.severity}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_CONFIG[finding.status].color}
                        >
                          {tFinding(`status.${finding.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate block max-w-[300px]">
                                {title}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-md">
                              <p>{title}</p>
                              {finding.criticalElement && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  CE: {finding.criticalElement.replace("CE_", "CE-")}
                                </p>
                              )}
                              {finding.icaoReference && (
                                <p className="text-xs text-muted-foreground">
                                  ICAO: {finding.icaoReference}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        {finding.capRequired ? (
                          <Badge variant="secondary" className="text-xs">
                            {t("required")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewFinding(finding.id);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReportFindingsTable;
