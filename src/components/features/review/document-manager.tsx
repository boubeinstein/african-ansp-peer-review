"use client";

/**
 * Document Manager Component
 *
 * Manages document uploads and listing for peer reviews with
 * categorization, and access control.
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import type { DocumentCategory } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  MoreVertical,
  File,
  FileImage,
  FileSpreadsheet,
  Lock,
  Eye,
  Loader2,
  FolderOpen,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

// Review-specific document categories for filtering
type ReviewDocumentCategory =
  | "PRE_VISIT_REQUEST"
  | "HOST_SUBMISSION"
  | "EVIDENCE"
  | "INTERVIEW_NOTES"
  | "DRAFT_REPORT"
  | "FINAL_REPORT"
  | "CAP_EVIDENCE"
  | "CORRESPONDENCE"
  | "OTHER";

interface DocumentManagerProps {
  reviewId: string;
  isTeamMember: boolean;
  isAdmin: boolean;
  isHostOrg: boolean;
  userId: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const CATEGORY_CONFIG: Record<
  ReviewDocumentCategory,
  { icon: typeof FileText; color: string }
> = {
  PRE_VISIT_REQUEST: { icon: FileText, color: "text-blue-500" },
  HOST_SUBMISSION: { icon: FolderOpen, color: "text-green-500" },
  EVIDENCE: { icon: FileImage, color: "text-purple-500" },
  INTERVIEW_NOTES: { icon: FileText, color: "text-amber-500" },
  DRAFT_REPORT: { icon: FileText, color: "text-orange-500" },
  FINAL_REPORT: { icon: FileText, color: "text-emerald-500" },
  CAP_EVIDENCE: { icon: FileSpreadsheet, color: "text-indigo-500" },
  CORRESPONDENCE: { icon: FileText, color: "text-gray-500" },
  OTHER: { icon: File, color: "text-gray-400" },
};

const REVIEW_CATEGORIES: ReviewDocumentCategory[] = [
  "PRE_VISIT_REQUEST",
  "HOST_SUBMISSION",
  "EVIDENCE",
  "INTERVIEW_NOTES",
  "DRAFT_REPORT",
  "FINAL_REPORT",
  "CAP_EVIDENCE",
  "CORRESPONDENCE",
  "OTHER",
];

// =============================================================================
// HELPERS
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isReviewCategory(category: string): category is ReviewDocumentCategory {
  return REVIEW_CATEGORIES.includes(category as ReviewDocumentCategory);
}

// =============================================================================
// UPLOAD DIALOG
// =============================================================================

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  isHostOrg: boolean;
  isTeamMember: boolean;
  onSuccess: () => void;
}

function UploadDialog({
  open,
  onOpenChange,
  reviewId,
  isHostOrg,
  isTeamMember,
  onSuccess,
}: UploadDialogProps) {
  const t = useTranslations("reviews.documents");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ReviewDocumentCategory>("EVIDENCE");
  const [description, setDescription] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const utils = trpc.useUtils();
  const createDocument = trpc.document.createForReview.useMutation();

  // Categories available to user
  const availableCategories: ReviewDocumentCategory[] = useMemo(() => {
    if (isHostOrg && !isTeamMember) {
      return ["HOST_SUBMISSION", "CAP_EVIDENCE"];
    }
    return REVIEW_CATEGORIES;
  }, [isHostOrg, isTeamMember]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t("error.invalidType"));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("error.fileTooLarge"));
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Create form data for upload API
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("reviewId", reviewId);
      formData.append("category", category);

      setUploadProgress(30);

      // Upload file via API
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(50);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const uploadResult = await uploadResponse.json();
      setUploadProgress(70);

      // Create document record in database
      await createDocument.mutateAsync({
        reviewId,
        name: selectedFile.name,
        originalName: selectedFile.name,
        description: description || undefined,
        fileUrl: uploadResult.url,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        category,
        isConfidential,
      });

      setUploadProgress(100);
      toast.success(t("success.uploaded"));

      // Invalidate queries to refresh document list
      utils.document.getByReview.invalidate({ reviewId });
      utils.document.getReviewDocumentStats.invalidate({ reviewId });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("[Upload] Error:", error);
      toast.error(t("error.upload"), {
        description: error instanceof Error ? error.message : "Upload failed",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCategory("EVIDENCE");
    setDescription("");
    setIsConfidential(false);
    setUploadProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("upload.title")}
          </DialogTitle>
          <DialogDescription>{t("upload.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label>{t("upload.selectedFiles")}</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50",
                selectedFile ? "border-green-500 bg-green-50/50" : "border-muted-foreground/25"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx,.doc,.xls,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-muted-foreground text-sm">
                    ({formatFileSize(selectedFile.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">{t("upload.dragDrop")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("upload.allowedTypes")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("upload.maxSize", { size: "50MB" })}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t("upload.category")}</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ReviewDocumentCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t("upload.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("upload.descriptionPlaceholder")}
              rows={2}
            />
          </div>

          {/* Confidential flag - only for team members */}
          {isTeamMember && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="confidential"
                checked={isConfidential}
                onCheckedChange={(checked) => setIsConfidential(checked === true)}
              />
              <Label htmlFor="confidential" className="text-sm cursor-pointer">
                {t("upload.confidential")}
              </Label>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {t("upload.uploading")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("upload.uploading")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t("upload.uploadButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// DOCUMENT LIST
// =============================================================================

interface DocumentListProps {
  documents: Array<{
    id: string;
    name: string;
    originalName: string | null;
    description: string | null;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    category: DocumentCategory;
    isConfidential: boolean;
    uploadedAt: Date;
    uploadedBy: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    };
  }>;
  isLoading: boolean;
  isDownloading?: boolean;
  canDelete: (docUploaderId: string) => boolean;
  onView: (documentId: string, fallbackUrl: string) => void;
  onDownload: (documentId: string, fileName: string, fallbackUrl: string) => void;
  onDelete: (docId: string, docName: string) => void;
}

function DocumentList({
  documents,
  isLoading,
  isDownloading,
  canDelete,
  onView,
  onDownload,
  onDelete,
}: DocumentListProps) {
  const t = useTranslations("reviews.documents");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("noDocuments")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const categoryKey = isReviewCategory(doc.category) ? doc.category : "OTHER";
        const config = CATEGORY_CONFIG[categoryKey];
        const CategoryIcon = config?.icon || File;

        return (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div
              className={cn(
                "p-2 rounded-lg bg-muted",
                config?.color || "text-gray-500"
              )}
            >
              <CategoryIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{doc.name}</p>
                {doc.isConfidential && (
                  <Lock className="h-3 w-3 text-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {t(`categories.${categoryKey}`)}
                </Badge>
                <span>•</span>
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>•</span>
                <span>
                  {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                </span>
                <span>•</span>
                <span>
                  {format(new Date(doc.uploadedAt), "PP", { locale: dateLocale })}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onView(doc.id, doc.fileUrl)}
                  disabled={isDownloading}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t("view")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onDownload(doc.id, doc.originalName || doc.name, doc.fileUrl)
                  }
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {t("download")}
                </DropdownMenuItem>
                {canDelete(doc.uploadedBy.id) && (
                  <DropdownMenuItem
                    onClick={() => onDelete(doc.id, doc.name)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DocumentManager({
  reviewId,
  isTeamMember,
  isAdmin,
  isHostOrg,
  userId,
}: DocumentManagerProps) {
  const t = useTranslations("reviews.documents");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    ReviewDocumentCategory | "all"
  >("all");
  const [deleteState, setDeleteState] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const utils = trpc.useUtils();

  // Fetch documents
  const { data: documents, isLoading } = trpc.document.getByReview.useQuery({
    reviewId,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
  });

  // Fetch stats
  const { data: stats } = trpc.document.getReviewDocumentStats.useQuery({
    reviewId,
  });

  // Delete mutation
  const deleteDoc = trpc.document.deleteReviewDocument.useMutation({
    onSuccess: () => {
      toast.success(t("success.deleted"));
      utils.document.getByReview.invalidate({ reviewId });
      utils.document.getReviewDocumentStats.invalidate({ reviewId });
      setDeleteState(null);
    },
    onError: (error) => {
      toast.error(t("error.delete"), { description: error.message });
    },
  });

  // Get download URL mutation (for signed URLs)
  const getDownloadUrl = trpc.document.getDownloadUrl.useMutation();

  // Check if user can delete a document
  const canDelete = useCallback(
    (docUploaderId: string) => {
      if (isAdmin) return true;
      return docUploaderId === userId;
    },
    [isAdmin, userId]
  );

  // Handle view/download document with signed URL
  const handleView = async (documentId: string, fallbackUrl: string) => {
    try {
      const result = await getDownloadUrl.mutateAsync({ documentId });
      window.open(result.url, "_blank");
    } catch (error) {
      console.error("[handleView] Error getting signed URL:", error);
      // Fallback to original URL
      window.open(fallbackUrl, "_blank");
    }
  };

  // Handle download document
  const handleDownload = async (
    documentId: string,
    fileName: string,
    fallbackUrl: string
  ) => {
    try {
      const result = await getDownloadUrl.mutateAsync({ documentId });

      // Create a temporary link to trigger download
      const link = document.createElement("a");
      link.href = result.url;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("[handleDownload] Error getting signed URL:", error);
      toast.error(t("error.download"));
      // Fallback to original URL
      window.open(fallbackUrl, "_blank");
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (deleteState) {
      deleteDoc.mutate({ documentId: deleteState.id });
    }
  };

  // Can user upload?
  const canUpload = isTeamMember || isAdmin || isHostOrg;

  // Categories for filter (all + review-specific)
  const filterCategories: (ReviewDocumentCategory | "all")[] = [
    "all",
    ...REVIEW_CATEGORIES,
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {canUpload && (
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t("uploadButton")}
            </Button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>
              {t("totalDocuments", { count: stats.total })}
            </span>
            <span>•</span>
            <span>
              {t("totalSize", { size: formatFileSize(stats.totalSize) })}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Category Filter Tabs */}
        <Tabs
          value={selectedCategory}
          onValueChange={(v) =>
            setSelectedCategory(v as ReviewDocumentCategory | "all")
          }
          className="mb-4"
        >
          <TabsList className="flex-wrap h-auto gap-1">
            {filterCategories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {cat === "all" ? t("allCategories") : t(`categories.${cat}`)}
                {cat !== "all" && stats?.byCategory[cat] && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {stats.byCategory[cat]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Document List */}
        <DocumentList
          documents={documents || []}
          isLoading={isLoading}
          isDownloading={getDownloadUrl.isPending}
          canDelete={canDelete}
          onView={handleView}
          onDownload={handleDownload}
          onDelete={(id, name) => setDeleteState({ id, name })}
        />
      </CardContent>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        reviewId={reviewId}
        isHostOrg={isHostOrg}
        isTeamMember={isTeamMember}
        onSuccess={() => {}}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteState}
        onOpenChange={(open) => !open && setDeleteState(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm.description", { name: deleteState?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDoc.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
