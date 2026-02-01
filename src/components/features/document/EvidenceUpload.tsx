"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  Link2,
  File,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  X,
  Loader2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc/client";
import type { DocumentCategory } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

export interface Evidence {
  id: string;
  name: string;
  url: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  description?: string | null;
}

interface EvidenceUploadProps {
  assessmentId: string;
  responseId: string;
  existingEvidence: Evidence[];
  onEvidenceAdded: (evidence: Evidence) => void;
  onEvidenceRemoved: (evidenceId: string) => void;
  maxFiles?: number;
  disabled?: boolean;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_FILES = 5;

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
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === "external_link") return "URL";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.includes("word") || mimeType === "application/msword")
    return "Word";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "application/vnd.ms-excel"
  )
    return "Excel";
  return "File";
}

// =============================================================================
// DOCUMENT CATEGORIES
// =============================================================================

const DOCUMENT_CATEGORIES: { value: DocumentCategory; labelKey: string }[] = [
  { value: "EVIDENCE", labelKey: "EVIDENCE" },
  { value: "POLICY", labelKey: "POLICY" },
  { value: "PROCEDURE", labelKey: "PROCEDURE" },
  { value: "RECORD", labelKey: "RECORD" },
  { value: "CERTIFICATE", labelKey: "CERTIFICATE" },
  { value: "REPORT", labelKey: "REPORT" },
  { value: "TRAINING", labelKey: "TRAINING" },
  { value: "OTHER", labelKey: "OTHER" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function EvidenceUpload({
  assessmentId,
  responseId,
  existingEvidence,
  onEvidenceAdded,
  onEvidenceRemoved,
  maxFiles = DEFAULT_MAX_FILES,
  disabled = false,
}: EvidenceUploadProps) {
  const t = useTranslations("evidence");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
  });
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlName, setUrlName] = useState("");
  const [urlDescription, setUrlDescription] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<DocumentCategory>("EVIDENCE");
  const [isDragOver, setIsDragOver] = useState(false);

  // tRPC mutations
  const createDocument = trpc.document.create.useMutation();
  const createUrlReference = trpc.document.createUrlReference.useMutation();
  const linkToResponse = trpc.document.linkToResponse.useMutation();
  const unlinkFromResponse = trpc.document.unlinkFromResponse.useMutation();

  const canAddMore = existingEvidence.length < maxFiles;

  // Handlers
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (!canAddMore) {
        setUploadState({
          uploading: false,
          progress: 0,
          error: t("upload.maxFiles", { count: maxFiles }),
        });
        return;
      }

      const file = files[0];

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadState({
          uploading: false,
          progress: 0,
          error: t("upload.allowedTypes"),
        });
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setUploadState({
          uploading: false,
          progress: 0,
          error: t("upload.maxSize", { size: 10 }),
        });
        return;
      }

      setUploadState({ uploading: true, progress: 10, error: null });

      try {
        // Upload file
        const formData = new FormData();
        formData.append("file", file);

        setUploadState((s) => ({ ...s, progress: 30 }));

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const uploadResult = await uploadResponse.json();

        setUploadState((s) => ({ ...s, progress: 60 }));

        // Create document record
        const documentResult = await createDocument.mutateAsync({
          name: file.name,
          originalName: uploadResult.file.originalName,
          fileUrl: uploadResult.file.url,
          fileType: file.type,
          fileSize: file.size,
          category: selectedCategory,
          assessmentId,
        });

        setUploadState((s) => ({ ...s, progress: 80 }));

        // Link to response
        await linkToResponse.mutateAsync({
          documentId: documentResult.document.id,
          responseId,
        });

        setUploadState({ uploading: false, progress: 100, error: null });

        // Notify parent
        onEvidenceAdded({
          id: documentResult.document.id,
          name: documentResult.document.name,
          url: documentResult.document.fileUrl,
          fileType: documentResult.document.fileType,
          fileSize: documentResult.document.fileSize,
          category: documentResult.document.category,
          description: documentResult.document.description,
        });

        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        setUploadState({
          uploading: false,
          progress: 0,
          error:
            error instanceof Error ? error.message : t("upload.uploadFailed"),
        });
      }
    },
    [
      assessmentId,
      responseId,
      canAddMore,
      maxFiles,
      selectedCategory,
      t,
      createDocument,
      linkToResponse,
      onEvidenceAdded,
    ]
  );

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim() || !urlName.trim()) return;

    try {
      setUploadState({ uploading: true, progress: 30, error: null });

      // Create URL reference
      const documentResult = await createUrlReference.mutateAsync({
        url: urlInput.trim(),
        name: urlName.trim(),
        description: urlDescription.trim() || undefined,
        category: selectedCategory,
        assessmentId,
      });

      setUploadState((s) => ({ ...s, progress: 70 }));

      // Link to response
      await linkToResponse.mutateAsync({
        documentId: documentResult.document.id,
        responseId,
      });

      setUploadState({ uploading: false, progress: 100, error: null });

      // Notify parent
      onEvidenceAdded({
        id: documentResult.document.id,
        name: documentResult.document.name,
        url: documentResult.document.fileUrl,
        fileType: "external_link",
        fileSize: 0,
        category: documentResult.document.category,
        description: documentResult.document.description,
      });

      // Reset and close dialog
      setUrlInput("");
      setUrlName("");
      setUrlDescription("");
      setShowUrlDialog(false);
    } catch (error) {
      setUploadState({
        uploading: false,
        progress: 0,
        error:
          error instanceof Error ? error.message : t("upload.uploadFailed"),
      });
    }
  }, [
    urlInput,
    urlName,
    urlDescription,
    assessmentId,
    responseId,
    selectedCategory,
    t,
    createUrlReference,
    linkToResponse,
    onEvidenceAdded,
  ]);

  const handleRemove = useCallback(
    async (evidenceId: string) => {
      try {
        await unlinkFromResponse.mutateAsync({
          documentId: evidenceId,
          responseId,
        });
        onEvidenceRemoved(evidenceId);
      } catch (error) {
        console.error("Failed to remove evidence:", error);
      }
    },
    [responseId, unlinkFromResponse, onEvidenceRemoved]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && canAddMore) {
        setIsDragOver(true);
      }
    },
    [disabled, canAddMore]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!disabled && canAddMore) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [disabled, canAddMore, handleFileSelect]
  );

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragOver && "border-primary bg-primary/5",
          disabled || !canAddMore
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          !disabled && canAddMore && fileInputRef.current?.click()
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || !canAddMore}
        />

        {uploadState.uploading ? (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t("upload.uploading")}
            </p>
            <Progress value={uploadState.progress} className="max-w-xs mx-auto" />
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">{t("upload.dragDrop")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("upload.allowedTypes")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("upload.maxSize", { size: 10 })}
            </p>
          </>
        )}
      </div>

      {/* Category Selection */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">
            {t("upload.category")}
          </Label>
          <Select
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as DocumentCategory)
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {t(`categories.${cat.labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUrlDialog(true)}
          disabled={disabled || !canAddMore}
          className="mt-5"
        >
          <Link2 className="h-4 w-4 mr-2" />
          {t("upload.addUrl")}
        </Button>
      </div>

      {/* Error Message */}
      {uploadState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}

      {/* Existing Evidence List */}
      {existingEvidence.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t("upload.maxFiles", { count: `${existingEvidence.length}/${maxFiles}` })}
          </p>
          <div className="space-y-2">
            {existingEvidence.map((evidence) => {
              const FileIcon = getFileIcon(evidence.fileType);
              const isExternalLink = evidence.fileType === "external_link";

              return (
                <div
                  key={evidence.id}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                >
                  <div className="flex-shrink-0">
                    {isExternalLink ? (
                      <ExternalLink className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={evidence.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {evidence.name}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {getFileTypeLabel(evidence.fileType)}
                      {evidence.fileSize > 0 &&
                        ` - ${formatFileSize(evidence.fileSize)}`}
                    </p>
                  </div>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(evidence.id)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* URL Dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("upload.addUrl")}</DialogTitle>
            <DialogDescription>
              {t("upload.urlPlaceholder")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/document.pdf"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urlName">{t("upload.title")}</Label>
              <Input
                id="urlName"
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                placeholder="Document title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urlDescription">{t("upload.description")}</Label>
              <Textarea
                id="urlDescription"
                value={urlDescription}
                onChange={(e) => setUrlDescription(e.target.value)}
                placeholder={t("upload.description")}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUrlDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || !urlName.trim() || uploadState.uploading}
            >
              {uploadState.uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("upload.uploading")}
                </>
              ) : (
                t("upload.addUrl")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EvidenceUpload;
