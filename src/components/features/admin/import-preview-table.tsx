"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Search,
  X,
} from "lucide-react";
import type { ValidationError } from "@/lib/questionnaire/import-schema";

// =============================================================================
// TYPES
// =============================================================================

interface QuestionPreview {
  pqNumber?: string | null;
  questionTextEn: string;
  questionTextFr: string;
  auditArea?: string | null;
  criticalElement?: string | null;
  smsComponent?: string | null;
  studyArea?: string | null;
  isPriorityPQ?: boolean;
  requiresOnSite?: boolean;
  pqStatus?: string;
  sortOrder: number;
  icaoReferences?: unknown[];
}

interface ImportPreviewTableProps {
  questions: QuestionPreview[];
  errors: ValidationError[];
  type: "ANS_USOAP_CMA" | "SMS_CANSO_SOE";
  onEdit?: (index: number, data: QuestionPreview) => void;
  onRemove?: (index: number) => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ImportPreviewTable({
  questions,
  errors,
  type,
  onEdit,
  onRemove,
  className,
}: ImportPreviewTableProps) {
  const t = useTranslations("admin.import");

  // State
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<QuestionPreview | null>(null);

  const pageSize = 20;

  // Create error map for quick lookup
  const errorMap = useMemo(() => {
    const map = new Map<number, ValidationError[]>();
    errors.forEach((error) => {
      const existing = map.get(error.row) || [];
      existing.push(error);
      map.set(error.row, existing);
    });
    return map;
  }, [errors]);

  // Filter and paginate questions
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;

    const query = searchQuery.toLowerCase();
    return questions.filter((q, index) => {
      const pqNumber = q.pqNumber?.toLowerCase() || "";
      const textEn = q.questionTextEn.toLowerCase();
      const textFr = q.questionTextFr.toLowerCase();
      const rowNumber = String(index + 1);

      return (
        pqNumber.includes(query) ||
        textEn.includes(query) ||
        textFr.includes(query) ||
        rowNumber.includes(query)
      );
    });
  }, [questions, searchQuery]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const paginatedQuestions = filteredQuestions.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  // Get original index for a filtered question
  const getOriginalIndex = (filteredIndex: number): number => {
    const question = paginatedQuestions[filteredIndex];
    return questions.indexOf(question);
  };

  // Handle edit
  const handleEdit = (index: number) => {
    const originalIndex = getOriginalIndex(index);
    setEditingIndex(originalIndex);
    setEditData({ ...questions[originalIndex] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editData && onEdit) {
      onEdit(editingIndex, editData);
    }
    setEditingIndex(null);
    setEditData(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditData(null);
  };

  // Columns based on type
  const isANS = type === "ANS_USOAP_CMA";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with search and pagination info */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {t("showing", {
              from: page * pageSize + 1,
              to: Math.min((page + 1) * pageSize, filteredQuestions.length),
              total: filteredQuestions.length,
            })}
          </span>
          {errors.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.length} {t("errors")}
            </Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-8">{t("status")}</TableHead>
              {isANS ? (
                <>
                  <TableHead className="w-24">{t("pqNumber")}</TableHead>
                  <TableHead className="w-20">{t("auditArea")}</TableHead>
                  <TableHead className="w-20">{t("ce")}</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="w-24">{t("component")}</TableHead>
                  <TableHead className="w-24">{t("studyArea")}</TableHead>
                </>
              )}
              <TableHead className="min-w-[300px]">{t("questionText")}</TableHead>
              <TableHead className="w-20">{t("refs")}</TableHead>
              {(onEdit || onRemove) && (
                <TableHead className="w-24">{t("actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedQuestions.map((question, filteredIndex) => {
              const originalIndex = getOriginalIndex(filteredIndex);
              const rowErrors = errorMap.get(originalIndex) || [];
              const hasErrors = rowErrors.length > 0;

              return (
                <TableRow
                  key={originalIndex}
                  className={cn(
                    hasErrors && "bg-red-50 dark:bg-red-900/10"
                  )}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {originalIndex + 1}
                  </TableCell>
                  <TableCell>
                    {hasErrors ? (
                      <div
                        className="group relative"
                        title={rowErrors.map((e) => `${e.field}: ${e.message}`).join("\n")}
                      >
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </TableCell>
                  {isANS ? (
                    <>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {question.pqNumber || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {question.auditArea || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {question.criticalElement?.replace("CE_", "CE-") || "-"}
                        </Badge>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {question.smsComponent
                            ?.replace("SAFETY_", "")
                            .replace("_", " ")
                            .slice(0, 12) || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {question.studyArea?.replace("SA_", "SA ").replace("_", ".") || "-"}
                        </Badge>
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <p className="text-sm line-clamp-2">
                      {question.questionTextEn}
                    </p>
                    {hasErrors && (
                      <div className="mt-1 space-y-0.5">
                        {rowErrors.map((error, i) => (
                          <p
                            key={i}
                            className="text-xs text-destructive"
                          >
                            {error.field}: {error.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {question.icaoReferences?.length || 0}
                    </span>
                  </TableCell>
                  {(onEdit || onRemove) && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(filteredIndex)}
                            className="h-7 w-7"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(originalIndex)}
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {paginatedQuestions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isANS ? 8 : 7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {searchQuery ? t("noMatchingResults") : t("noData")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("page", { current: page + 1, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editingIndex !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("editQuestion")}</DialogTitle>
          </DialogHeader>

          {editData && (
            <div className="space-y-4">
              {isANS && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("pqNumber")}</label>
                    <Input
                      value={editData.pqNumber || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, pqNumber: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("auditArea")}</label>
                    <Input
                      value={editData.auditArea || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, auditArea: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("ce")}</label>
                    <Input
                      value={editData.criticalElement || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, criticalElement: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("questionTextEn")}</label>
                <textarea
                  value={editData.questionTextEn}
                  onChange={(e) =>
                    setEditData({ ...editData, questionTextEn: e.target.value })
                  }
                  className="w-full min-h-[100px] p-3 border rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("questionTextFr")}</label>
                <textarea
                  value={editData.questionTextFr}
                  onChange={(e) =>
                    setEditData({ ...editData, questionTextFr: e.target.value })
                  }
                  className="w-full min-h-[100px] p-3 border rounded-md text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEdit}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleSaveEdit}>{t("save")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// SUMMARY COMPONENT
// =============================================================================

interface ImportSummaryProps {
  totalQuestions: number;
  totalCategories: number;
  totalReferences: number;
  errorCount: number;
  warningCount: number;
  type: "ANS_USOAP_CMA" | "SMS_CANSO_SOE";
}

export function ImportSummaryCard({
  totalQuestions,
  totalCategories,
  totalReferences,
  errorCount,
  warningCount,
}: ImportSummaryProps) {
  const t = useTranslations("admin.import");

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="p-4 rounded-lg border bg-card">
        <p className="text-sm text-muted-foreground">{t("questions")}</p>
        <p className="text-2xl font-bold">{totalQuestions}</p>
      </div>
      <div className="p-4 rounded-lg border bg-card">
        <p className="text-sm text-muted-foreground">{t("categories")}</p>
        <p className="text-2xl font-bold">{totalCategories}</p>
      </div>
      <div className="p-4 rounded-lg border bg-card">
        <p className="text-sm text-muted-foreground">{t("references")}</p>
        <p className="text-2xl font-bold">{totalReferences}</p>
      </div>
      <div
        className={cn(
          "p-4 rounded-lg border",
          errorCount > 0
            ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
            : "bg-card"
        )}
      >
        <p className="text-sm text-muted-foreground">{t("errors")}</p>
        <p
          className={cn(
            "text-2xl font-bold",
            errorCount > 0 && "text-destructive"
          )}
        >
          {errorCount}
        </p>
      </div>
      <div
        className={cn(
          "p-4 rounded-lg border",
          warningCount > 0
            ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
            : "bg-card"
        )}
      >
        <p className="text-sm text-muted-foreground">{t("warnings")}</p>
        <p
          className={cn(
            "text-2xl font-bold",
            warningCount > 0 && "text-amber-600 dark:text-amber-400"
          )}
        >
          {warningCount}
        </p>
      </div>
    </div>
  );
}
