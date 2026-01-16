"use client";

/**
 * Export Dialog Component
 *
 * Dialog for exporting reviewer data in various formats.
 * Supports Excel, CSV, and PDF exports with customizable options.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
} from "lucide-react";
import {
  exportReviewers,
  type ExportFormat,
} from "@/lib/export/reviewer-export";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewers: unknown[];
  selectedCount?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ExportDialog({
  open,
  onOpenChange,
  reviewers,
  selectedCount,
}: ExportDialogProps) {
  const t = useTranslations("reviewers.export");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [includeContactInfo, setIncludeContactInfo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (reviewers.length === 0) {
      toast.error(t("noData"));
      return;
    }

    setIsExporting(true);
    try {
      await exportReviewers(reviewers, format, {
        includeContactInfo,
        filename: "afi_peer_reviewers",
        title: "AFI Peer Review Programme - Reviewer Directory",
      });

      toast.success(t("success"), {
        description: t("successDescription", {
          count: reviewers.length,
          format: format.toUpperCase(),
        }),
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(t("error"), {
        description: t("errorDescription"),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    {
      value: "xlsx" as const,
      label: "Excel (.xlsx)",
      icon: FileSpreadsheet,
      iconColor: "text-green-600",
      description: t("formatExcelDesc"),
    },
    {
      value: "csv" as const,
      label: "CSV (.csv)",
      icon: FileText,
      iconColor: "text-blue-600",
      description: t("formatCsvDesc"),
    },
    {
      value: "pdf" as const,
      label: "PDF (.pdf)",
      icon: FileType,
      iconColor: "text-red-600",
      description: t("formatPdfDesc"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {selectedCount
              ? t("descriptionSelected", { count: selectedCount })
              : t("descriptionAll", { count: reviewers.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("format")}</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="space-y-2"
            >
              {formatOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setFormat(option.value)}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={option.value}
                      className="flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <option.icon className={`h-4 w-4 ${option.iconColor}`} />
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("options")}</Label>
            <div className="rounded-lg border p-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="includeContactInfo"
                  checked={includeContactInfo}
                  onCheckedChange={(c) => setIncludeContactInfo(c as boolean)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="includeContactInfo"
                    className="cursor-pointer font-medium"
                  >
                    {t("includeContactInfo")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("includeContactInfoDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">
              {t("summary", {
                count: reviewers.length,
                format: format.toUpperCase(),
              })}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("exporting")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("export")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
