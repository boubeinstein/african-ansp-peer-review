"use client";

import { useState, useCallback } from "react";
import Image from 'next/image';
import { useTranslations } from "next-intl";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { DocumentCategory } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface PreviewDocument {
  id: string;
  name: string;
  originalName?: string | null;
  url: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  description?: string | null;
  uploadedBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt?: Date;
}

interface DocumentPreviewProps {
  document: PreviewDocument;
  open: boolean;
  onClose: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function FileIconComponent({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className={className} />;
  if (mimeType === "application/pdf") return <FileText className={className} />;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "application/vnd.ms-excel"
  )
    return <FileSpreadsheet className={className} />;
  return <File className={className} />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === "external_link") return "External Link";
  if (mimeType === "application/pdf") return "PDF Document";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.includes("word") || mimeType === "application/msword")
    return "Word Document";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "application/vnd.ms-excel"
  )
    return "Excel Spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "Presentation";
  return "Document";
}

function canPreviewInline(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf"
  );
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

// =============================================================================
// COMPONENT
// =============================================================================

export function DocumentPreview({
  document,
  open,
  onClose,
}: DocumentPreviewProps) {
  const t = useTranslations("evidence");
  const [imageZoom, setImageZoom] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const isExternalLink = document.fileType === "external_link";
  const isImage = document.fileType.startsWith("image/");
  const isPdf = document.fileType === "application/pdf";
  const canPreview = canPreviewInline(document.fileType) && !isExternalLink;

  const handleDownload = useCallback(() => {
    const link = window.document.createElement("a");
    link.href = document.url;
    link.download = document.originalName || document.name;
    link.target = "_blank";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }, [document]);

  const handleOpenExternal = useCallback(() => {
    window.open(document.url, "_blank", "noopener,noreferrer");
  }, [document.url]);

  const handleZoomIn = useCallback(() => {
    setImageZoom((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setImageZoom((z) => Math.max(z - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setImageZoom(1);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {isExternalLink ? (
                <ExternalLink className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
              ) : (
                <FileIconComponent mimeType={document.fileType} className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <div>
                <DialogTitle className="text-left">
                  {document.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      CATEGORY_COLORS[document.category]
                    )}
                  >
                    {t(`categories.${document.category}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getFileTypeLabel(document.fileType)}
                  </span>
                  {document.fileSize > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(document.fileSize)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Description */}
        {document.description && (
          <p className="text-sm text-muted-foreground flex-shrink-0">
            {document.description}
          </p>
        )}

        {/* Preview Area */}
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-muted/30">
          {canPreview && isImage && !imageError ? (
            <div className="h-full flex items-center justify-center overflow-auto p-4">
              <Image
                src={document.url}
                alt={document.name}
                className="max-w-full transition-transform"
                style={{ transform: `scale(${imageZoom})` }}
                onError={() => setImageError(true)}
                width={800}
                height={600}
                unoptimized
              />
            </div>
          ) : canPreview && isPdf && !pdfError ? (
            <iframe
              src={document.url}
              title={document.name}
              className="w-full h-full min-h-[500px]"
              onError={() => setPdfError(true)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <FileIconComponent mimeType={document.fileType} className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {isExternalLink ? "External Link" : "Preview not available"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {isExternalLink
                  ? "Click the button below to open in a new tab"
                  : "Download or open in a new tab to view this document"}
              </p>
              <div className="flex gap-2">
                {!isExternalLink && (
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  variant={isExternalLink ? "default" : "outline"}
                  onClick={handleOpenExternal}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in new tab
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Image Controls */}
        {canPreview && isImage && !imageError && (
          <div className="flex-shrink-0 flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom}>
              {Math.round(imageZoom * 100)}%
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {document.uploadedBy && (
              <span>
                Uploaded by {document.uploadedBy.firstName}{" "}
                {document.uploadedBy.lastName}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!isExternalLink && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleOpenExternal}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Open
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentPreview;
