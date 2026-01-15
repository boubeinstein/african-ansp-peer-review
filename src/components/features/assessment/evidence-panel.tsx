"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Link as LinkIcon,
  Upload,
  Trash2,
  ExternalLink,
  Plus,
  FileUp,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Eye,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc/client";
import { DocumentPreview, type PreviewDocument } from "../document/DocumentPreview";
import { DocumentLibrary } from "../document/DocumentLibrary";
import type { DocumentCategory } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface EvidenceDocument {
  id: string;
  name: string;
  url: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  description?: string | null;
}

interface EvidencePanelProps {
  assessmentId?: string;
  responseId?: string;
  organizationId?: string;
  evidenceDescription: string;
  evidenceUrls: string[];
  evidenceDocuments?: EvidenceDocument[];
  onDescriptionChange: (value: string) => void;
  onUrlsChange: (urls: string[]) => void;
  onDocumentsChange?: (documents: EvidenceDocument[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

// =============================================================================
// CONSTANTS
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
  if (bytes === 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function EvidencePanel({
  assessmentId,
  responseId,
  organizationId,
  evidenceDescription,
  evidenceUrls,
  evidenceDocuments = [],
  onDescriptionChange,
  onUrlsChange,
  onDocumentsChange,
  disabled,
  maxFiles = 5,
}: EvidencePanelProps) {
  const t = useTranslations("workspace.evidence");
  const tEvidence = useTranslations("evidence");
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("EVIDENCE");
  const [showLibrary, setShowLibrary] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC mutations
  const createDocument = trpc.document.create.useMutation();
  const linkToResponse = trpc.document.linkToResponse.useMutation();
  const unlinkFromResponse = trpc.document.unlinkFromResponse.useMutation();

  const canAddMore = evidenceDocuments.length < maxFiles;

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddUrl = () => {
    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) {
      setUrlError(t("errors.emptyUrl"));
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setUrlError(t("errors.invalidUrl"));
      return;
    }

    if (evidenceUrls.includes(trimmedUrl)) {
      setUrlError(t("errors.duplicateUrl"));
      return;
    }

    onUrlsChange([...evidenceUrls, trimmedUrl]);
    setNewUrl("");
    setUrlError("");
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    onUrlsChange(evidenceUrls.filter((url) => url !== urlToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddUrl();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && canAddMore) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError(tEvidence("upload.allowedTypes"));
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(tEvidence("upload.maxSize", { size: 10 }));
        return;
      }

      if (!canAddMore) {
        setUploadError(tEvidence("upload.maxFiles", { count: maxFiles }));
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);
      setUploadError(null);

      try {
        // Upload file to server
        const formData = new FormData();
        formData.append("file", file);

        setUploadProgress(30);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const uploadResult = await uploadResponse.json();

        setUploadProgress(60);

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

        setUploadProgress(80);

        // Link to response if responseId provided
        if (responseId) {
          await linkToResponse.mutateAsync({
            documentId: documentResult.document.id,
            responseId,
          });
        }

        setUploadProgress(100);

        // Notify parent
        if (onDocumentsChange) {
          const newDoc: EvidenceDocument = {
            id: documentResult.document.id,
            name: documentResult.document.name,
            url: documentResult.document.fileUrl,
            fileType: documentResult.document.fileType,
            fileSize: documentResult.document.fileSize,
            category: documentResult.document.category,
            description: documentResult.document.description,
          };
          onDocumentsChange([...evidenceDocuments, newDoc]);
        }

        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : tEvidence("upload.uploadFailed")
        );
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [
      assessmentId,
      responseId,
      canAddMore,
      maxFiles,
      selectedCategory,
      tEvidence,
      createDocument,
      linkToResponse,
      onDocumentsChange,
      evidenceDocuments,
    ]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled && canAddMore && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    },
    [disabled, canAddMore, handleFileUpload]
  );

  const handleRemoveDocument = useCallback(
    async (docId: string) => {
      if (responseId) {
        try {
          await unlinkFromResponse.mutateAsync({
            documentId: docId,
            responseId,
          });
        } catch (error) {
          console.error("Failed to unlink document:", error);
        }
      }

      if (onDocumentsChange) {
        onDocumentsChange(evidenceDocuments.filter((d) => d.id !== docId));
      }
    },
    [responseId, unlinkFromResponse, onDocumentsChange, evidenceDocuments]
  );

  const handleLibrarySelect = useCallback(
    async (selectedDocs: Array<{ id: string; name: string; fileUrl: string; fileType: string; fileSize: number; category: DocumentCategory; description?: string | null }>) => {
      if (responseId) {
        for (const doc of selectedDocs) {
          try {
            await linkToResponse.mutateAsync({
              documentId: doc.id,
              responseId,
            });
          } catch (error) {
            console.error("Failed to link document:", error);
          }
        }
      }

      if (onDocumentsChange) {
        const newDocs: EvidenceDocument[] = selectedDocs.map((doc) => ({
          id: doc.id,
          name: doc.name,
          url: doc.fileUrl,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          category: doc.category,
          description: doc.description,
        }));
        onDocumentsChange([...evidenceDocuments, ...newDocs]);
      }
    },
    [responseId, linkToResponse, onDocumentsChange, evidenceDocuments]
  );

  const handlePreview = useCallback((doc: EvidenceDocument) => {
    setPreviewDocument({
      id: doc.id,
      name: doc.name,
      url: doc.url,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      category: doc.category,
      description: doc.description,
    });
  }, []);

  const getUrlDomain = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const hasEvidence =
    evidenceDescription.length > 0 ||
    evidenceUrls.length > 0 ||
    evidenceDocuments.length > 0;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </div>
          {hasEvidence ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t("hasEvidence")}
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              {t("noEvidence")}
            </Badge>
          )}
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Evidence Description */}
        <div className="space-y-2">
          <Label htmlFor="evidence-description" className="text-sm font-medium">
            {t("descriptionLabel")}
          </Label>
          <Textarea
            id="evidence-description"
            value={evidenceDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            disabled={disabled}
            className="min-h-[80px] resize-y"
          />
          <p className="text-xs text-muted-foreground">
            {t("descriptionHint")}
          </p>
        </div>

        {/* Document Links */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("linksLabel")}</Label>

          {/* Existing URLs */}
          {evidenceUrls.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence>
                {evidenceUrls.map((url, index) => (
                  <motion.div
                    key={url}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2 p-2 bg-muted rounded-md group"
                  >
                    <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate block"
                      >
                        {url}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {getUrlDomain(url)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        asChild
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={disabled}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("removeDialog.title")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("removeDialog.description")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("removeDialog.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveUrl(url)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t("removeDialog.confirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Add new URL */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  setUrlError("");
                }}
                onKeyPress={handleKeyPress}
                placeholder={t("urlPlaceholder")}
                disabled={disabled}
                className={cn(urlError && "border-destructive")}
              />
              {urlError && (
                <p className="text-xs text-destructive mt-1">{urlError}</p>
              )}
            </div>
            <Button
              type="button"
              onClick={handleAddUrl}
              disabled={disabled || !newUrl.trim()}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Uploaded Documents */}
          {evidenceDocuments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {tEvidence("upload.title")} ({evidenceDocuments.length}/{maxFiles})
              </Label>
              <AnimatePresence>
                {evidenceDocuments.map((doc, index) => {
                  const FileIcon = getFileIcon(doc.fileType);
                  const isExternalLink = doc.fileType === "external_link";

                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-2 p-2 bg-muted rounded-md group"
                    >
                      {isExternalLink ? (
                        <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tEvidence(`categories.${doc.category}`)}
                          {doc.fileSize > 0 && ` - ${formatFileSize(doc.fileSize)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handlePreview(doc)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              disabled={disabled}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("removeDialog.title")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("removeDialog.description")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("removeDialog.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveDocument(doc.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {t("removeDialog.confirm")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Category Selection */}
          {canAddMore && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">
                {tEvidence("upload.category")}:
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value as DocumentCategory)}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {tEvidence(`categories.${cat.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && canAddMore && !isUploading && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              (disabled || !canAddMore || isUploading) && "cursor-not-allowed opacity-50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              disabled={disabled || !canAddMore || isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />

            {isUploading ? (
              <div className="space-y-3">
                <Upload className="h-8 w-8 mx-auto text-primary animate-pulse" />
                <p className="text-sm font-medium">{tEvidence("upload.uploading")}</p>
                <Progress value={uploadProgress} className="max-w-xs mx-auto" />
              </div>
            ) : (
              <>
                <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">{t("dropzone.title")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dropzone.subtitle")}
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={disabled || !canAddMore}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t("dropzone.button")}
                  </Button>
                  {organizationId && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disabled || !canAddMore}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLibrary(true);
                      }}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      {tEvidence("library.title")}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Upload Error */}
          {uploadError && (
            <p className="text-xs text-destructive">{uploadError}</p>
          )}

          {/* Supported formats hint */}
          <p className="text-xs text-muted-foreground">
            {t("supportedFormats")}
          </p>
        </div>
      </CardContent>

      {/* Document Library Dialog */}
      {organizationId && (
        <DocumentLibrary
          organizationId={organizationId}
          assessmentId={assessmentId}
          open={showLibrary}
          onClose={() => setShowLibrary(false)}
          onSelect={handleLibrarySelect}
          excludeIds={evidenceDocuments.map((d) => d.id)}
          maxSelection={maxFiles - evidenceDocuments.length}
        />
      )}

      {/* Document Preview Dialog */}
      {previewDocument && (
        <DocumentPreview
          document={previewDocument}
          open={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </Card>
  );
}
