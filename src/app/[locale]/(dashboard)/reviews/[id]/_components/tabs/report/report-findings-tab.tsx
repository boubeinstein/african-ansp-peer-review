"use client";

/**
 * Report Findings Tab
 *
 * Professional findings display with:
 * - Summary cards (total, by type, by severity, CAP required)
 * - Findings by review area breakdown
 * - Sortable, filterable detail table with expandable rows
 * - CSV export
 *
 * Data sourced from ReportContent.sections.findingsSummary / findingsDetail.
 */

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


import type { ReportContent, FindingDetail } from "@/types/report";

// =============================================================================
// CONSTANTS
// =============================================================================

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  MAJOR: "bg-orange-600 text-white",
  MINOR: "bg-yellow-500 text-white",
  OBSERVATION: "bg-blue-500 text-white",
};

const TYPE_STYLES: Record<string, string> = {
  NON_CONFORMITY: "bg-red-100 text-red-800 border-red-200",
  OBSERVATION: "bg-blue-100 text-blue-800 border-blue-200",
  CONCERN: "bg-amber-100 text-amber-800 border-amber-200",
  RECOMMENDATION: "bg-purple-100 text-purple-800 border-purple-200",
  GOOD_PRACTICE: "bg-green-100 text-green-800 border-green-200",
};

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  MAJOR: 1,
  MINOR: 2,
  OBSERVATION: 3,
};

type SortField = "reference" | "type" | "severity" | "reviewArea" | "status";
type SortDirection = "asc" | "desc";

// =============================================================================
// SUMMARY CARDS
// =============================================================================

function SummaryCards({ content }: { content: ReportContent }) {
  const t = useTranslations("report.findings");
  const summary = content.sections.findingsSummary;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Findings */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">{t("total")}</p>
          <p className="text-3xl font-bold">{summary.totalFindings}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("cap")}: {summary.capRequiredCount}
          </p>
        </CardContent>
      </Card>

      {/* By Type — stacked horizontal bar */}
      <Card className="col-span-2 lg:col-span-1">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground mb-2">{t("byType")}</p>
          {summary.totalFindings > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(summary.byType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] w-[90px] justify-center", TYPE_STYLES[type] || "")}
                  >
                    {type.replace(/_/g, " ")}
                  </Badge>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-current"
                      style={{
                        width: `${(count / summary.totalFindings) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>

      {/* By Severity */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground mb-2">{t("bySeverity")}</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(summary.bySeverity).map(([sev, count]) => (
              <Badge
                key={sev}
                className={cn("text-xs", SEVERITY_STYLES[sev] || "")}
              >
                {sev}: {count}
              </Badge>
            ))}
          </div>
          {summary.criticalAndMajorCount > 0 && (
            <p className="text-xs text-red-600 font-medium mt-2">
              {summary.criticalAndMajorCount} {t("critical")}/{t("major")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* By Review Area */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground mb-2">{t("byReviewArea")}</p>
          <div className="space-y-1">
            {Object.entries(summary.byReviewArea)
              .sort(([, a], [, b]) => b - a)
              .map(([area, count]) => (
                <div key={area} className="flex items-center justify-between text-sm">
                  <Badge variant="outline" className="font-mono text-xs">
                    {area}
                  </Badge>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// FILTER BAR
// =============================================================================

interface Filters {
  type: string;
  severity: string;
  status: string;
  reviewArea: string;
}

const EMPTY_FILTERS: Filters = {
  type: "ALL",
  severity: "ALL",
  status: "ALL",
  reviewArea: "ALL",
};

function FilterBar({
  filters,
  onFiltersChange,
  findings,
}: {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  findings: FindingDetail[];
}) {
  const t = useTranslations("report.findings");

  const types = useMemo(() => [...new Set(findings.map((f) => f.type))].filter(Boolean).sort(), [findings]);
  const severities = useMemo(() => [...new Set(findings.map((f) => f.severity))].filter(Boolean).sort(), [findings]);
  const statuses = useMemo(() => [...new Set(findings.map((f) => f.status))].filter(Boolean).sort(), [findings]);
  const reviewAreas = useMemo(() => [...new Set(findings.map((f) => f.reviewArea))].filter(Boolean).sort(), [findings]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== "ALL");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />

      <Select value={filters.type} onValueChange={(v) => onFiltersChange({ ...filters, type: v })}>
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue placeholder={t("filterByType")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allTypes")}</SelectItem>
          {types.map((type) => (
            <SelectItem key={type} value={type}>
              {type.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.severity} onValueChange={(v) => onFiltersChange({ ...filters, severity: v })}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder={t("filterBySeverity")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allSeverities")}</SelectItem>
          {severities.map((sev) => (
            <SelectItem key={sev} value={sev}>
              {sev}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onFiltersChange({ ...filters, status: v })}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder={t("filterByStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
          {statuses.map((st) => (
            <SelectItem key={st} value={st}>
              {st.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.reviewArea} onValueChange={(v) => onFiltersChange({ ...filters, reviewArea: v })}>
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue placeholder={t("reviewArea")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("allReviewAreas")}</SelectItem>
          {reviewAreas.map((area) => (
            <SelectItem key={area} value={area}>
              {area}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
        >
          <X className="h-3 w-3 mr-1" />
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// SORTABLE TABLE HEADER
// =============================================================================

function SortableHeader({
  field,
  label,
  currentSort,
  currentDirection,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentSort === field;
  return (
    <TableHead className={cn("cursor-pointer select-none", className)} onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          currentDirection === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
}

// =============================================================================
// EXPANDABLE FINDING ROW
// =============================================================================

function FindingRow({ finding }: { finding: FindingDetail }) {
  const t = useTranslations("report.findings");
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setOpen((o) => !o)}
      >
        <TableCell className="font-mono text-sm">
          {finding.reference}
        </TableCell>
        <TableCell className="max-w-[200px]">
          <span className="truncate block" title={finding.title}>
            {finding.title}
          </span>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={cn("text-xs", TYPE_STYLES[finding.type] || "")}
          >
            {finding.type.replace(/_/g, " ")}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge className={cn("text-xs", SEVERITY_STYLES[finding.severity] || "")}>
            {finding.severity}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-mono text-xs">
            {finding.reviewArea}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {finding.status.replace(/_/g, " ")}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          {finding.capReference ? (
            <Badge
              variant="secondary"
              className="text-xs"
            >
              {finding.capStatus?.replace(/_/g, " ") || t("required")}
            </Badge>
          ) : finding.capRequired ? (
            <Badge variant="destructive" className="text-xs">
              {t("required")}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>
        <TableCell className="w-8">
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={8} className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {finding.description && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">
                    {t("description")}
                  </p>
                  <p className="whitespace-pre-wrap">{finding.description}</p>
                </div>
              )}
              {finding.evidence && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">
                    {t("evidence")}
                  </p>
                  <p className="whitespace-pre-wrap">{finding.evidence}</p>
                </div>
              )}
              {finding.icaoReference && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">
                    {t("icaoReference")}
                  </p>
                  <p>{finding.icaoReference}</p>
                </div>
              )}
              {finding.criticalElement && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">
                    {t("criticalElement")}
                  </p>
                  <Badge variant="outline" className="font-mono">
                    {finding.criticalElement}
                  </Badge>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// =============================================================================
// CSV EXPORT
// =============================================================================

function exportFindingsCSV(findings: FindingDetail[]) {
  const headers = [
    "Reference",
    "Title",
    "Type",
    "Severity",
    "Review Area",
    "Critical Element",
    "ICAO Reference",
    "Status",
    "CAP Required",
    "CAP Reference",
    "CAP Status",
    "Description",
    "Evidence",
  ];

  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = findings.map((f) =>
    [
      f.reference,
      f.title,
      f.type,
      f.severity,
      f.reviewArea,
      f.criticalElement || "",
      f.icaoReference,
      f.status,
      f.capRequired ? "Yes" : "No",
      f.capReference || "",
      f.capStatus || "",
      f.description,
      f.evidence,
    ].map(escapeCSV).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "findings-export.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportFindingsTab({ content }: { content: ReportContent }) {
  const t = useTranslations("report.findings");
  const findings = content.sections.findingsDetail.findings;

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortField, setSortField] = useState<SortField>("reference");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  // Filter + sort
  const processedFindings = useMemo(() => {
    let result = [...findings];

    // Apply filters
    if (filters.type !== "ALL") result = result.filter((f) => f.type === filters.type);
    if (filters.severity !== "ALL") result = result.filter((f) => f.severity === filters.severity);
    if (filters.status !== "ALL") result = result.filter((f) => f.status === filters.status);
    if (filters.reviewArea !== "ALL") result = result.filter((f) => f.reviewArea === filters.reviewArea);

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "reference":
          cmp = a.reference.localeCompare(b.reference);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "severity":
          cmp = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
          break;
        case "reviewArea":
          cmp = a.reviewArea.localeCompare(b.reviewArea);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [findings, filters, sortField, sortDir]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards content={content} />

      {/* Findings Detail Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("tableTitle")}
              <Badge variant="secondary">{processedFindings.length}</Badge>
              {processedFindings.length !== findings.length && (
                <span className="text-xs text-muted-foreground font-normal">
                  / {findings.length}
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportFindingsCSV(processedFindings)}
              disabled={processedFindings.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              {t("exportCSV")}
            </Button>
          </div>

          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            findings={findings}
          />
        </CardHeader>
        <CardContent>
          {processedFindings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {findings.length === 0 ? t("noFindings") : t("noMatchingFindings")}
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader
                      field="reference"
                      label={t("reference")}
                      currentSort={sortField}
                      currentDirection={sortDir}
                      onSort={handleSort}
                      className="w-[120px]"
                    />
                    <TableHead className="min-w-[160px]">{t("titleColumn")}</TableHead>
                    <SortableHeader
                      field="type"
                      label={t("type")}
                      currentSort={sortField}
                      currentDirection={sortDir}
                      onSort={handleSort}
                      className="w-[130px]"
                    />
                    <SortableHeader
                      field="severity"
                      label={t("severity")}
                      currentSort={sortField}
                      currentDirection={sortDir}
                      onSort={handleSort}
                      className="w-[100px]"
                    />
                    <SortableHeader
                      field="reviewArea"
                      label={t("reviewArea")}
                      currentSort={sortField}
                      currentDirection={sortDir}
                      onSort={handleSort}
                      className="w-[100px]"
                    />
                    <SortableHeader
                      field="status"
                      label={t("status")}
                      currentSort={sortField}
                      currentDirection={sortDir}
                      onSort={handleSort}
                      className="w-[100px]"
                    />
                    <TableHead className="w-[90px] text-center">{t("cap")}</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedFindings.map((finding) => (
                    <FindingRow key={finding.reference} finding={finding} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
