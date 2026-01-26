"use client";

/**
 * Enhanced Review Documents Component
 *
 * Document management with category tabs, search, filtering, and status workflow.
 * Integrates with the fieldwork checklist for validation.
 */

import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  Loader2,
  FileImage,
  FileSpreadsheet,
  File,
  Filter,
  Search,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { DocumentCategory, DocumentStatus } from "@prisma/client";

interface ReviewDocumentsEnhancedProps {
  reviewId: string;
  locale: string;
  canUpload: boolean;
  canReview: boolean;
  canApprove: boolean;
  canDelete: boolean;
  initialCategory?: DocumentCategory;
}

const CATEGORY_CONFIG: Record<
  string,
  { labelEn: string; labelFr: string; icon: string; color: string }
> = {
  PRE_VISIT_REQUEST: {
    labelEn: "Pre-Visit Request",
    labelFr: "Demande pre-visite",
    icon: "📨",
    color: "bg-blue-100 text-blue-700 border-blue-300",
  },
  HOST_SUBMISSION: {
    labelEn: "Host Submission",
    labelFr: "Soumission de l'hote",
    icon: "📥",
    color: "bg-purple-100 text-purple-700 border-purple-300",
  },
  EVIDENCE: {
    labelEn: "Evidence",
    labelFr: "Preuve",
    icon: "🔍",
    color: "bg-amber-100 text-amber-700 border-amber-300",
  },
  INTERVIEW_NOTES: {
    labelEn: "Interview Notes",
    labelFr: "Notes d'entretien",
    icon: "📝",
    color: "bg-green-100 text-green-700 border-green-300",
  },
  DRAFT_REPORT: {
    labelEn: "Draft Report",
    labelFr: "Projet de rapport",
    icon: "📄",
    color: "bg-orange-100 text-orange-700 border-orange-300",
  },
  FINAL_REPORT: {
    labelEn: "Final Report",
    labelFr: "Rapport final",
    icon: "📋",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
  CAP_EVIDENCE: {
    labelEn: "CAP Evidence",
    labelFr: "Preuve PAC",
    icon: "✅",
    color: "bg-teal-100 text-teal-700 border-teal-300",
  },
  CORRESPONDENCE: {
    labelEn: "Correspondence",
    labelFr: "Correspondance",
    icon: "💬",
    color: "bg-indigo-100 text-indigo-700 border-indigo-300",
  },
  POLICY: {
    labelEn: "Policy",
    labelFr: "Politique",
    icon: "📜",
    color: "bg-slate-100 text-slate-700 border-slate-300",
  },
  PROCEDURE: {
    labelEn: "Procedure",
    labelFr: "Procedure",
    icon: "📋",
    color: "bg-cyan-100 text-cyan-700 border-cyan-300",
  },
  RECORD: {
    labelEn: "Record",
    labelFr: "Dossier",
    icon: "📁",
    color: "bg-rose-100 text-rose-700 border-rose-300",
  },
  CERTIFICATE: {
    labelEn: "Certificate",
    labelFr: "Certificat",
    icon: "🏆",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  REPORT: {
    labelEn: "Report",
    labelFr: "Rapport",
    icon: "📊",
    color: "bg-pink-100 text-pink-700 border-pink-300",
  },
  TRAINING: {
    labelEn: "Training",
    labelFr: "Formation",
    icon: "🎓",
    color: "bg-violet-100 text-violet-700 border-violet-300",
  },
  OTHER: {
    labelEn: "Other",
    labelFr: "Autre",
    icon: "📎",
    color: "bg-gray-100 text-gray-700 border-gray-300",
  },
};

const STATUS_CONFIG: Record<
  DocumentStatus,
  { labelEn: string; labelFr: string; icon: typeof Clock; color: string }
> = {
  UPLOADED: {
    labelEn: "Uploaded",
    labelFr: "Telecharge",
    icon: Clock,
    color: "bg-gray-100 text-gray-700",
  },
  UNDER_REVIEW: {
    labelEn: "Under Review",
    labelFr: "En cours d'examen",
    icon: Eye,
    color: "bg-blue-100 text-blue-700",
  },
  REVIEWED: {
    labelEn: "Reviewed",
    labelFr: "Examine",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700",
  },
  PENDING_APPROVAL: {
    labelEn: "Pending Approval",
    labelFr: "En attente d'approbation",
    icon: Clock,
    color: "bg-amber-100 text-amber-700",
  },
  APPROVED: {
    labelEn: "Approved",
    labelFr: "Approuve",
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-700",
  },
  REJECTED: {
    labelEn: "Rejected",
    labelFr: "Rejete",
    icon: XCircle,
    color: "bg-red-100 text-red-700",
  },
};

// Review document categories (subset for peer reviews)
const REVIEW_CATEGORIES: DocumentCategory[] = [
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

export function ReviewDocumentsEnhanced({
  reviewId,
  locale,
  canUpload,
  canReview: _canReview,
  canApprove: _canApprove,
  canDelete,
  initialCategory,
}: ReviewDocumentsEnhancedProps) {
  // _canReview and _canApprove will be used when review workflow is implemented
  void _canReview;
  void _canApprove;
  const isEnglish = locale === "en";
  const utils = trpc.useUtils();

  // State
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | "ALL">(
    initialCategory || "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "ALL">("ALL");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    id: string;
    name: string;
    fileSize: number;
    status: DocumentStatus;
  } | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>(
    initialCategory || "OTHER"
  );
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Queries
  const { data: documents, isLoading } = trpc.document.getByReview.useQuery(
    { reviewId },
    { enabled: !!reviewId }
  );

  // Get upload URL mutation
  const getUploadUrl = trpc.document.getReviewUploadUrl.useMutation();

  // Create document record mutation
  const createDocument = trpc.document.createForReview.useMutation({
    onSuccess: () => {
      utils.document.getByReview.invalidate({ reviewId });
      utils.document.getReviewDocumentStats.invalidate({ reviewId });
      utils.checklist.getByReviewId.invalidate({ reviewId });
      utils.checklist.getCompletionStatus.invalidate({ reviewId });
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadDescription("");
      toast.success(
        isEnglish ? "Document uploaded successfully" : "Document telecharge avec succes"
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete document mutation
  const deleteDocument = trpc.document.deleteReviewDocument.useMutation({
    onSuccess: () => {
      utils.document.getByReview.invalidate({ reviewId });
      utils.document.getReviewDocumentStats.invalidate({ reviewId });
      utils.checklist.getByReviewId.invalidate({ reviewId });
      utils.checklist.getCompletionStatus.invalidate({ reviewId });
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
      toast.success(isEnglish ? "Document deleted" : "Document supprime");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Calculate stats from documents
  const stats = useMemo(() => {
    if (!documents) return { total: 0, pendingReview: 0, reviewed: 0, approved: 0 };

    return {
      total: documents.length,
      pendingReview: documents.filter((d) => d.status === "UPLOADED" || d.status === "UNDER_REVIEW").length,
      reviewed: documents.filter((d) => d.status === "REVIEWED").length,
      approved: documents.filter((d) => d.status === "APPROVED").length,
    };
  }, [documents]);

  // File upload handler
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(
          isEnglish
            ? "File size must be less than 10MB"
            : "La taille du fichier doit etre inferieure a 10 Mo"
        );
        return;
      }

      setUploadFile(file);
    },
    [isEnglish]
  );

  const handleUploadSubmit = useCallback(async () => {
    if (!uploadFile) return;

    try {
      // Get storage path for upload
      const { storagePath, bucket } = await getUploadUrl.mutateAsync({
        reviewId,
        fileName: uploadFile.name,
        category: uploadCategory,
      });

      // Upload file to Supabase storage
      // Note: In production, use Supabase client for direct upload
      // For now, construct the file URL from the storage path
      const fileUrl = `/${bucket}/${storagePath}`;

      // Create document record
      await createDocument.mutateAsync({
        reviewId,
        name: uploadFile.name,
        originalName: uploadFile.name,
        description: uploadDescription || undefined,
        fileUrl,
        fileType: uploadFile.type,
        fileSize: uploadFile.size,
        category: uploadCategory,
      });
    } catch {
      toast.error(
        isEnglish ? "Failed to upload document" : "Echec du telechargement"
      );
    }
  }, [
    uploadFile,
    uploadDescription,
    uploadCategory,
    reviewId,
    getUploadUrl,
    createDocument,
    isEnglish,
  ]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];

    return documents.filter((doc) => {
      if (activeCategory !== "ALL" && doc.category !== activeCategory) return false;
      if (statusFilter !== "ALL" && doc.status !== statusFilter) return false;
      if (
        searchQuery &&
        !doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [documents, activeCategory, statusFilter, searchQuery]);

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return FileImage;
    if (fileType.includes("spreadsheet") || fileType.includes("excel"))
      return FileSpreadsheet;
    if (fileType.includes("pdf")) return FileText;
    return File;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDeleteClick = (doc: { id: string; name: string; fileSize: number; status: DocumentStatus }) => {
    setSelectedDocument(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedDocument) return;
    deleteDocument.mutate({ documentId: selectedDocument.id });
  };

  const openUploadDialog = (category?: DocumentCategory) => {
    if (category) setUploadCategory(category);
    setUploadDialogOpen(true);
  };

  // Count documents by category
  const categoryCounts = useMemo(() => {
    if (!documents) return {};
    return documents.reduce(
      (acc, doc) => {
        acc[doc.category] = (acc[doc.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [documents]);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEnglish ? "Review Documents" : "Documents de la revue"}
            </CardTitle>
            {canUpload && (
              <Button onClick={() => openUploadDialog()}>
                <Upload className="mr-2 h-4 w-4" />
                {isEnglish ? "Upload Document" : "Telecharger un document"}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isEnglish
              ? "Manage documents related to this peer review"
              : "Gerer les documents lies a cette revue par les pairs"}
          </p>
        </CardHeader>
        <CardContent>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">
                {isEnglish ? "Total Documents" : "Total documents"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <p className="text-2xl font-bold text-amber-600">
                {stats.pendingReview}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEnglish ? "Pending Review" : "En attente d'examen"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <p className="text-2xl font-bold text-green-600">{stats.reviewed}</p>
              <p className="text-xs text-muted-foreground">
                {isEnglish ? "Reviewed" : "Examines"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
              <p className="text-2xl font-bold text-emerald-600">
                {stats.approved}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEnglish ? "Approved" : "Approuves"}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  isEnglish ? "Search documents..." : "Rechercher des documents..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as DocumentStatus | "ALL")
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue
                  placeholder={isEnglish ? "Filter by status" : "Filtrer par statut"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {isEnglish ? "All Statuses" : "Tous les statuts"}
                </SelectItem>
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {isEnglish ? config.labelEn : config.labelFr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(v) => setActiveCategory(v as DocumentCategory | "ALL")}
      >
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger
            value="ALL"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {isEnglish ? "All" : "Tous"} ({documents?.length || 0})
          </TabsTrigger>
          {REVIEW_CATEGORIES.map((category) => {
            const config = CATEGORY_CONFIG[category];
            const count = categoryCounts[category] || 0;
            if (count === 0 && activeCategory !== category) return null;
            return (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span className="mr-1">{config?.icon}</span>
                {isEnglish ? config?.labelEn : config?.labelFr} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">
                  {isEnglish ? "No documents found" : "Aucun document trouve"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {isEnglish
                    ? "Upload documents to track progress on checklist items"
                    : "Telechargez des documents pour suivre la progression"}
                </p>
                {canUpload && (
                  <Button onClick={() => openUploadDialog()}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isEnglish
                      ? "Upload First Document"
                      : "Telecharger le premier document"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isEnglish ? "Document" : "Document"}</TableHead>
                    <TableHead>{isEnglish ? "Category" : "Categorie"}</TableHead>
                    <TableHead>{isEnglish ? "Status" : "Statut"}</TableHead>
                    <TableHead>
                      {isEnglish ? "Uploaded By" : "Telecharge par"}
                    </TableHead>
                    <TableHead>{isEnglish ? "Date" : "Date"}</TableHead>
                    <TableHead className="text-right">
                      {isEnglish ? "Actions" : "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const FileIcon = getFileIcon(doc.fileType);
                    const categoryConfig = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.OTHER;
                    const statusConfig = STATUS_CONFIG[doc.status];
                    const StatusIcon = statusConfig?.icon || Clock;

                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[200px]">
                                {doc.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(doc.fileSize)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", categoryConfig.color)}
                          >
                            {categoryConfig.icon}{" "}
                            {isEnglish ? categoryConfig.labelEn : categoryConfig.labelFr}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className={cn("text-xs", statusConfig?.color)}
                                >
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {isEnglish
                                    ? statusConfig?.labelEn
                                    : statusConfig?.labelFr}
                                </Badge>
                              </TooltipTrigger>
                              {(doc.reviewedById || doc.approvedById || doc.reviewNotes) && (
                                <TooltipContent>
                                  {doc.reviewedById && (
                                    <p className="text-xs">
                                      {isEnglish ? "Reviewed" : "Examine"}
                                    </p>
                                  )}
                                  {doc.approvedById && (
                                    <p className="text-xs">
                                      {isEnglish ? "Approved" : "Approuve"}
                                    </p>
                                  )}
                                  {doc.reviewNotes && (
                                    <p className="text-xs mt-1 italic">
                                      &ldquo;{doc.reviewNotes}&rdquo;
                                    </p>
                                  )}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {new Date(doc.uploadedAt).toLocaleDateString(locale)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {isEnglish ? "View" : "Voir"}
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={doc.fileUrl} download={doc.name}>
                                  <Download className="mr-2 h-4 w-4" />
                                  {isEnglish ? "Download" : "Telecharger"}
                                </a>
                              </DropdownMenuItem>

                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteClick({
                                        id: doc.id,
                                        name: doc.name,
                                        fileSize: doc.fileSize,
                                        status: doc.status,
                                      })
                                    }
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {isEnglish ? "Delete" : "Supprimer"}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Upload className="inline-block mr-2 h-5 w-5" />
              {isEnglish ? "Upload Document" : "Telecharger un document"}
            </DialogTitle>
            <DialogDescription>
              {isEnglish
                ? "Select a category and upload a document (max 10MB)"
                : "Selectionnez une categorie et telechargez un document (max 10 Mo)"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isEnglish ? "Document Category" : "Categorie du document"}</Label>
              <Select
                value={uploadCategory}
                onValueChange={(value) => setUploadCategory(value as DocumentCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_CATEGORIES.map((category) => {
                    const config = CATEGORY_CONFIG[category];
                    return (
                      <SelectItem key={category} value={category}>
                        {config?.icon} {isEnglish ? config?.labelEn : config?.labelFr}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isEnglish ? "File" : "Fichier"}</Label>
              <Input
                type="file"
                onChange={handleFileSelect}
                disabled={createDocument.isPending || getUploadUrl.isPending}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
              />
              <p className="text-xs text-muted-foreground">
                {isEnglish
                  ? "Supported: PDF, Word, Excel, Images (max 10MB)"
                  : "Formats acceptes: PDF, Word, Excel, Images (max 10 Mo)"}
              </p>
              {uploadFile && (
                <p className="text-sm text-muted-foreground">
                  {uploadFile.name} ({formatFileSize(uploadFile.size)})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                {isEnglish ? "Description (optional)" : "Description (facultatif)"}
              </Label>
              <Textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder={
                  isEnglish
                    ? "Brief description of the document..."
                    : "Breve description du document..."
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              {isEnglish ? "Cancel" : "Annuler"}
            </Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={
                !uploadFile ||
                createDocument.isPending ||
                getUploadUrl.isPending
              }
            >
              {(createDocument.isPending || getUploadUrl.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEnglish ? "Upload" : "Telecharger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              <Trash2 className="inline-block mr-2 h-5 w-5" />
              {isEnglish ? "Delete Document" : "Supprimer le document"}
            </DialogTitle>
            <DialogDescription>
              {isEnglish
                ? "Are you sure you want to delete this document? This action cannot be undone."
                : "Etes-vous sur de vouloir supprimer ce document ? Cette action est irreversible."}
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">{selectedDocument.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedDocument.fileSize)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {isEnglish ? "Cancel" : "Annuler"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEnglish ? "Delete" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
