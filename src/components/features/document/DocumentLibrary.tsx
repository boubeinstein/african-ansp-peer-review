"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Filter,
  File,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  ExternalLink,
  Check,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc/client";
import type { DocumentCategory } from "@prisma/client";
import { DocumentPreview, type PreviewDocument } from "./DocumentPreview";

// =============================================================================
// TYPES
// =============================================================================

interface DocumentLibraryDocument {
  id: string;
  name: string;
  originalName?: string | null;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  description?: string | null;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
}

interface DocumentLibraryProps {
  organizationId: string;
  assessmentId?: string;
  open: boolean;
  onClose: () => void;
  onSelect: (documents: DocumentLibraryDocument[]) => void;
  excludeIds?: string[];
  multiple?: boolean;
  maxSelection?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "application/vnd.ms-excel"
  )
    return FileSpreadsheet;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

// =============================================================================
// CATEGORY COLORS
// =============================================================================

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  POLICY: "bg-purple-100 text-purple-800",
  PROCEDURE: "bg-blue-100 text-blue-800",
  RECORD: "bg-green-100 text-green-800",
  CERTIFICATE: "bg-yellow-100 text-yellow-800",
  REPORT: "bg-orange-100 text-orange-800",
  TRAINING: "bg-pink-100 text-pink-800",
  EVIDENCE: "bg-gray-100 text-gray-800",
  OTHER: "bg-slate-100 text-slate-800",
  // Review-specific categories
  PRE_VISIT_REQUEST: "bg-indigo-100 text-indigo-800",
  HOST_SUBMISSION: "bg-teal-100 text-teal-800",
  INTERVIEW_NOTES: "bg-amber-100 text-amber-800",
  DRAFT_REPORT: "bg-rose-100 text-rose-800",
  FINAL_REPORT: "bg-emerald-100 text-emerald-800",
  CAP_EVIDENCE: "bg-cyan-100 text-cyan-800",
  CORRESPONDENCE: "bg-violet-100 text-violet-800",
};

const CATEGORIES: DocumentCategory[] = [
  "EVIDENCE",
  "POLICY",
  "PROCEDURE",
  "RECORD",
  "CERTIFICATE",
  "REPORT",
  "TRAINING",
  "OTHER",
];

// =============================================================================
// COMPONENT
// =============================================================================

export function DocumentLibrary({
  organizationId,
  assessmentId,
  open,
  onClose,
  onSelect,
  excludeIds = [],
  multiple = true,
  maxSelection = 5,
}: DocumentLibraryProps) {
  const t = useTranslations("evidence");

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "ALL">(
    "ALL"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewDocument, setPreviewDocument] =
    useState<PreviewDocument | null>(null);

  // Fetch documents
  const { data: documents, isLoading } = trpc.document.getByOrganization.useQuery(
    {
      organizationId,
      category: categoryFilter === "ALL" ? undefined : categoryFilter,
      assessmentId,
      search: searchQuery || undefined,
    },
    { enabled: open }
  );

  // Filter out excluded documents
  const availableDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter((doc) => !excludeIds.includes(doc.id));
  }, [documents, excludeIds]);

  // Handlers
  const handleToggleSelect = useCallback(
    (docId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(docId)) {
          next.delete(docId);
        } else {
          if (!multiple) {
            next.clear();
          }
          if (next.size < maxSelection) {
            next.add(docId);
          }
        }
        return next;
      });
    },
    [multiple, maxSelection]
  );

  const handleConfirm = useCallback(() => {
    if (!documents) return;
    const selectedDocs = documents.filter((doc) => selectedIds.has(doc.id));
    onSelect(
      selectedDocs.map((doc) => ({
        id: doc.id,
        name: doc.name,
        originalName: doc.originalName,
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        category: doc.category,
        description: doc.description,
        uploadedBy: doc.uploadedBy,
        createdAt: doc.createdAt,
      }))
    );
    setSelectedIds(new Set());
    onClose();
  }, [documents, selectedIds, onSelect, onClose]);

  const handlePreview = useCallback(
    (doc: DocumentLibraryDocument) => {
      setPreviewDocument({
        id: doc.id,
        name: doc.name,
        originalName: doc.originalName,
        url: doc.fileUrl,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        category: doc.category,
        description: doc.description,
        uploadedBy: doc.uploadedBy,
        createdAt: doc.createdAt,
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setSearchQuery("");
    setCategoryFilter("ALL");
    onClose();
  }, [onClose]);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {t("library.title")}
            </DialogTitle>
            <DialogDescription>
              {t("library.description")}
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-3 flex-shrink-0">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("library.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(v) =>
                setCategoryFilter(v as DocumentCategory | "ALL")
              }
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("library.allCategories")}</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : availableDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery || categoryFilter !== "ALL"
                    ? t("library.noResults")
                    : t("library.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {availableDocuments.map((doc) => {
                  const FileIcon = getFileIcon(doc.fileType);
                  const isSelected = selectedIds.has(doc.id);
                  const isExternalLink = doc.fileType === "external_link";

                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleToggleSelect(doc.id)}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(doc.id)}
                        className="flex-shrink-0"
                      />

                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {isExternalLink ? (
                          <ExternalLink className="h-5 w-5 text-blue-500" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              CATEGORY_COLORS[doc.category]
                            )}
                          >
                            {t(`categories.${doc.category}`)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(doc.createdAt)}
                          </span>
                          {doc.fileSize > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.fileSize)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Preview Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(doc);
                        }}
                        className="flex-shrink-0"
                      >
                        View
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-muted-foreground">
                {selectedIds.size} of {maxSelection} selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={selectedIds.size === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t("library.addSelected")} ({selectedIds.size})
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewDocument && (
        <DocumentPreview
          document={previewDocument}
          open={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </>
  );
}

export default DocumentLibrary;
