"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

const CATEGORIES = [
  "PRE_VISIT_REQUEST",
  "HOST_SUBMISSION",
  "EVIDENCE",
  "INTERVIEW_NOTES",
  "DRAFT_REPORT",
  "FINAL_REPORT",
  "CORRESPONDENCE",
  "OTHER",
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "image/*": [".png", ".jpg", ".jpeg", ".gif"],
  "text/plain": [".txt"],
};

export function UploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadDialogProps & { onUploadComplete?: () => void }) {
  const t = useTranslations("reviews.detail.documents.upload");
  const tCategories = useTranslations("reviews.detail.documents.categories");

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [category, setCategory] = useState<string>("OTHER");
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) =>
      Object.assign(file, {
        id: Math.random().toString(36).substring(7),
        status: "pending" as const,
        progress: 0,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      })
    );
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    onDropRejected: (rejections) => {
      rejections.forEach((rejection) => {
        rejection.errors.forEach((error) => {
          if (error.code === "file-too-large") {
            toast.error(t("fileTooLarge", { name: rejection.file.name }));
          } else if (error.code === "file-invalid-type") {
            toast.error(t("invalidType", { name: rejection.file.name }));
          }
        });
      });
    },
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    for (const file of files) {
      if (file.status !== "pending") continue;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "uploading", progress: 10 } : f
        )
      );

      try {
        // Simulate upload progress
        // In production, this would upload to Supabase Storage and then call document.createForReview
        await new Promise((resolve) => setTimeout(resolve, 500));

        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, progress: 50 } : f))
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        // TODO: Implement actual file upload to Supabase Storage
        // 1. Get signed upload URL via trpc.document.getSignedUploadUrl
        // 2. Upload file to Supabase Storage
        // 3. Create document record via trpc.document.createForReview

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "success", progress: 100 } : f
          )
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "error", error: t("uploadFailed") }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    const successCount = files.filter((f) => f.status === "success").length;
    if (successCount > 0) {
      toast.success(t("uploadSuccess", { count: successCount }));
      onUploadComplete?.();
    }

    // Clear successful uploads after delay
    setTimeout(() => {
      setFiles((prev) => prev.filter((f) => f.status !== "success"));
      if (files.every((f) => f.status === "success")) {
        onOpenChange(false);
      }
    }, 1500);
  };

  const handleClose = () => {
    if (!isUploading) {
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
      setFiles([]);
      setCategory("OTHER");
      onOpenChange(false);
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label>{t("category")}</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={isUploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {tCategories(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              isUploading && "pointer-events-none opacity-50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">
              {isDragActive ? t("dropHere") : t("dragOrClick")}
            </p>
            <p className="text-xs text-muted-foreground">{t("maxSize")}</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                      {file.status === "uploading" && (
                        <Progress value={file.progress} className="h-1 flex-1" />
                      )}
                      {file.status === "success" && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {file.status === "error" && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {file.error}
                        </span>
                      )}
                    </div>
                  </div>
                  {file.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {file.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={pendingCount === 0 || isUploading}
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("uploadButton", { count: pendingCount })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
