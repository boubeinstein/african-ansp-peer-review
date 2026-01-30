"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Upload, Loader2, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { DocumentList } from "./documents/document-list";
import { UploadDialog } from "./documents/upload-dialog";
import type { ReviewData } from "../../_lib/fetch-review-data";

interface DocumentsTabProps {
  review: ReviewData;
}

export function DocumentsTab({ review }: DocumentsTabProps) {
  const t = useTranslations("reviews.detail.documents");
  const utils = trpc.useUtils();

  const [showUpload, setShowUpload] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Fetch full document details
  const { data: documentsData, isLoading } = trpc.document.getByReview.useQuery(
    { reviewId: review.id },
    { enabled: !!review.id }
  );

  const deleteMutation = trpc.document.deleteReviewDocument.useMutation({
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      utils.document.getByReview.invalidate({ reviewId: review.id });
      setDeleteDoc(null);
    },
    onError: (error) => {
      toast.error(error.message || t("deleteError"));
    },
  });

  const handleDelete = (doc: { id: string; name: string }) => {
    setDeleteDoc(doc);
  };

  const confirmDelete = () => {
    if (deleteDoc) {
      deleteMutation.mutate({ documentId: deleteDoc.id });
    }
  };

  const handleView = (doc: { url?: string; name: string }) => {
    if (doc.url) {
      window.open(doc.url, "_blank");
    }
  };

  const handleUploadComplete = () => {
    utils.document.getByReview.invalidate({ reviewId: review.id });
  };

  // Transform documents data to match DocumentList interface
  const documents =
    documentsData?.map((doc) => ({
      id: doc.id,
      name: doc.name || doc.originalName || "Unnamed",
      category: doc.category,
      mimeType: doc.fileType || "application/octet-stream",
      fileSize: doc.fileSize || 0,
      status: doc.status || "PENDING",
      uploadedBy: {
        id: doc.uploadedBy?.id || "",
        name: doc.uploadedBy
          ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
          : "Unknown",
      },
      createdAt: new Date(doc.createdAt),
      url: doc.fileUrl || undefined,
    })) || [];

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("count", { count: documents.length })}
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" />
          {t("uploadButton")}
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">{t("empty.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("empty.description")}
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t("uploadButton")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DocumentList
          documents={documents}
          reviewId={review.id}
          onView={handleView}
          onDelete={handleDelete}
        />
      )}

      {/* Upload Dialog */}
      <UploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        reviewId={review.id}
        onUploadComplete={handleUploadComplete}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription", { name: deleteDoc?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelDelete")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
