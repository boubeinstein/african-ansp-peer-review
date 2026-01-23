"use client";

/**
 * CAP Evidence Upload Component
 *
 * Allows host organizations to upload implementation evidence for CAPs.
 * Supports:
 * - File upload with categorization
 * - Link to specific milestones
 * - Description and date of evidence
 * - Verification workflow (reviewer approval/rejection)
 */

import { useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EvidenceCategory, EvidenceStatus, MilestoneStatus } from "@prisma/client";
import {
  Upload,
  FileText,
  Loader2,
  X,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Trash2,
  MessageSquare,
  Calendar,
  Tag,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Clock,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

interface Milestone {
  id: string;
  titleEn: string;
  titleFr: string | null;
  status: MilestoneStatus;
  targetDate: Date | string;
}

interface Evidence {
  id: string;
  category: EvidenceCategory;
  titleEn: string;
  titleFr: string | null;
  descriptionEn: string | null;
  descriptionFr: string | null;
  evidenceDate: Date | string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: EvidenceStatus;
  uploadedAt: Date | string;
  reviewedAt: Date | string | null;
  reviewerCommentEn: string | null;
  reviewerCommentFr: string | null;
  rejectionReason: string | null;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  reviewedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  milestone?: Milestone | null;
}

interface CAPEvidenceUploadProps {
  capId: string;
  evidence?: Evidence[];
  milestones?: Milestone[];
  canUpload?: boolean;
  canReview?: boolean;
  onEvidenceChange?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const EVIDENCE_CATEGORIES: { value: EvidenceCategory; labelKey: string; icon: React.ReactNode }[] = [
  { value: "PROCEDURE_UPDATE", labelKey: "procedureUpdate", icon: <FileText className="w-4 h-4" /> },
  { value: "TRAINING_RECORD", labelKey: "trainingRecord", icon: <FileText className="w-4 h-4" /> },
  { value: "PHOTO", labelKey: "photo", icon: <FileText className="w-4 h-4" /> },
  { value: "REPORT", labelKey: "report", icon: <FileText className="w-4 h-4" /> },
  { value: "OTHER", labelKey: "other", icon: <FileText className="w-4 h-4" /> },
];

const STATUS_CONFIG: Record<EvidenceStatus, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  PENDING: { variant: "secondary", icon: <Clock className="w-3 h-3" /> },
  UNDER_REVIEW: { variant: "outline", icon: <Eye className="w-3 h-3" /> },
  ACCEPTED: { variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
  REJECTED: { variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  MORE_INFO_REQUIRED: { variant: "outline", icon: <HelpCircle className="w-3 h-3" /> },
};

// =============================================================================
// UPLOAD FORM SCHEMA
// =============================================================================

const uploadFormSchema = z.object({
  titleEn: z.string().min(3, "Title must be at least 3 characters"),
  titleFr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionFr: z.string().optional(),
  category: z.nativeEnum(EvidenceCategory),
  evidenceDate: z.string().min(1, "Evidence date is required"),
  milestoneId: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

// =============================================================================
// REVIEW FORM SCHEMA
// =============================================================================

const reviewFormSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED", "MORE_INFO_REQUIRED"]),
  reviewerCommentEn: z.string().optional(),
  reviewerCommentFr: z.string().optional(),
  rejectionReason: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// EVIDENCE STATUS BADGE
// =============================================================================

function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  const t = useTranslations("cap.evidence.status");
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {t(status.toLowerCase())}
    </Badge>
  );
}

// =============================================================================
// UPLOAD DIALOG
// =============================================================================

interface UploadDialogProps {
  capId: string;
  milestones?: Milestone[];
  onSuccess?: () => void;
}

function UploadDialog({ capId, milestones = [], onSuccess }: UploadDialogProps) {
  const t = useTranslations("cap.evidence");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; type: string; size: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      titleEn: "",
      titleFr: "",
      descriptionEn: "",
      descriptionFr: "",
      category: "OTHER",
      evidenceDate: new Date().toISOString().split("T")[0],
      milestoneId: "",
    },
  });

  const createEvidence = trpc.capEvidence.create.useMutation({
    onSuccess: () => {
      toast.success(t("uploadSuccess"));
      setOpen(false);
      form.reset();
      setUploadedFile(null);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("fileTooLarge"));
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/public", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const { url } = await response.json();
      setUploadedFile({
        url,
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Auto-fill title if empty
      if (!form.getValues("titleEn")) {
        const titleFromFile = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        form.setValue("titleEn", titleFromFile);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (data: UploadFormData) => {
    if (!uploadedFile) {
      toast.error(t("noFileSelected"));
      return;
    }

    createEvidence.mutate({
      capId,
      ...data,
      fileUrl: uploadedFile.url,
      fileName: uploadedFile.name,
      fileType: uploadedFile.type,
      fileSize: uploadedFile.size,
      evidenceDate: new Date(data.evidenceDate),
      milestoneId: data.milestoneId || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          {t("upload")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("uploadTitle")}</DialogTitle>
          <DialogDescription>{t("uploadDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("file")} *</label>
              {uploadedFile ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-green-800 truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-green-600">{formatFileSize(uploadedFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                    isUploading ? "border-blue-300 bg-blue-50" : "border-slate-300 hover:border-slate-400"
                  )}
                  onClick={() => inputRef.current?.click()}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <span className="text-sm text-slate-600">{t("uploading")}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-400" />
                      <span className="text-sm text-slate-600">{t("dragOrClick")}</span>
                      <span className="text-xs text-slate-400">{t("acceptedFormats")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("category")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectCategory")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVIDENCE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            {cat.icon}
                            {t(`categories.${cat.labelKey}`)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Link to Milestone */}
            {milestones.length > 0 && (
              <FormField
                control={form.control}
                name="milestoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("linkToMilestone")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectMilestone")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">
                          <span className="text-muted-foreground">{t("noMilestone")}</span>
                        </SelectItem>
                        {milestones.map((milestone) => (
                          <SelectItem key={milestone.id} value={milestone.id}>
                            <span className="flex items-center gap-2">
                              <LinkIcon className="w-3 h-3" />
                              {locale === "fr" && milestone.titleFr
                                ? milestone.titleFr
                                : milestone.titleEn}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("milestoneHelp")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Evidence Date */}
            <FormField
              control={form.control}
              name="evidenceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("evidenceDate")} *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>{t("evidenceDateHelp")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title EN */}
            <FormField
              control={form.control}
              name="titleEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("titleEn")} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t("titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title FR */}
            <FormField
              control={form.control}
              name="titleFr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("titleFr")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("titlePlaceholderFr")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description EN */}
            <FormField
              control={form.control}
              name="descriptionEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("descriptionEn")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("descriptionPlaceholder")}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!uploadedFile || createEvidence.isPending}
              >
                {createEvidence.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// REVIEW DIALOG
// =============================================================================

interface ReviewDialogProps {
  evidence: Evidence;
  onSuccess?: () => void;
}

function ReviewDialog({ evidence, onSuccess }: ReviewDialogProps) {
  const t = useTranslations("cap.evidence");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const [open, setOpen] = useState(false);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      status: "ACCEPTED",
      reviewerCommentEn: "",
      reviewerCommentFr: "",
      rejectionReason: "",
    },
  });

  const reviewEvidence = trpc.capEvidence.review.useMutation({
    onSuccess: () => {
      toast.success(t("reviewSuccess"));
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const selectedStatus = form.watch("status");

  const handleSubmit = (data: ReviewFormData) => {
    reviewEvidence.mutate({
      evidenceId: evidence.id,
      ...data,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Eye className="w-4 h-4 mr-2" />
          {t("review")}
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("reviewTitle")}</DialogTitle>
          <DialogDescription>{t("reviewDescription")}</DialogDescription>
        </DialogHeader>

        {/* Evidence Details */}
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">
                  {locale === "fr" && evidence.titleFr ? evidence.titleFr : evidence.titleEn}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {evidence.fileName} ({formatFileSize(evidence.fileSize)})
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={evidence.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-4 h-4 mr-2" />
                  {t("viewFile")}
                </a>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("category")}:</span>
                <span className="ml-2">{t(`categories.${evidence.category.toLowerCase()}`)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("evidenceDate")}:</span>
                <span className="ml-2">{format(new Date(evidence.evidenceDate), "PP", { locale: dateLocale })}</span>
              </div>
            </div>

            {(evidence.descriptionEn || evidence.descriptionFr) && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t("descriptionEn")}:</span>
                <p className="mt-1">
                  {locale === "fr" && evidence.descriptionFr
                    ? evidence.descriptionFr
                    : evidence.descriptionEn}
                </p>
              </div>
            )}

            {evidence.milestone && (
              <div className="flex items-center gap-2 text-sm">
                <LinkIcon className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{t("linkedMilestone")}:</span>
                <span>
                  {locale === "fr" && evidence.milestone.titleFr
                    ? evidence.milestone.titleFr
                    : evidence.milestone.titleEn}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Review Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("decision")} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACCEPTED">
                          <span className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            {t("acceptEvidence")}
                          </span>
                        </SelectItem>
                        <SelectItem value="MORE_INFO_REQUIRED">
                          <span className="flex items-center gap-2 text-amber-600">
                            <HelpCircle className="w-4 h-4" />
                            {t("requestMoreInfo")}
                          </span>
                        </SelectItem>
                        <SelectItem value="REJECTED">
                          <span className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-4 h-4" />
                            {t("rejectEvidence")}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedStatus === "REJECTED" && (
                <FormField
                  control={form.control}
                  name="rejectionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("rejectionReason")} *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("rejectionReasonPlaceholder")}
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reviewerCommentEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("reviewerComment")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("commentPlaceholder")}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("commentHelp")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={reviewEvidence.isPending}
                  variant={selectedStatus === "REJECTED" ? "destructive" : "default"}
                >
                  {reviewEvidence.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("submitReview")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// EVIDENCE CARD
// =============================================================================

interface EvidenceCardProps {
  evidence: Evidence;
  canReview?: boolean;
  onDelete?: () => void;
  onReviewComplete?: () => void;
}

function EvidenceCard({ evidence, canReview, onDelete, onReviewComplete }: EvidenceCardProps) {
  const t = useTranslations("cap.evidence");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  const deleteEvidence = trpc.capEvidence.delete.useMutation({
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      onDelete?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const title = locale === "fr" && evidence.titleFr ? evidence.titleFr : evidence.titleEn;
  const categoryLabel = t(`categories.${evidence.category.toLowerCase()}`);

  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-muted rounded-lg shrink-0">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{title}</h4>
                <EvidenceStatusBadge status={evidence.status} />
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {evidence.fileName} • {formatFileSize(evidence.fileSize)}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {categoryLabel}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(evidence.evidenceDate), "PP", { locale: dateLocale })}
                </span>
                {evidence.milestone && (
                  <span className="flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    {locale === "fr" && evidence.milestone.titleFr
                      ? evidence.milestone.titleFr
                      : evidence.milestone.titleEn}
                  </span>
                )}
              </div>

              {/* Reviewer Comment */}
              {evidence.reviewerCommentEn && (
                <div className="mt-3 p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MessageSquare className="w-3 h-3" />
                    {t("reviewerComment")}
                  </div>
                  <p className="text-sm">
                    {locale === "fr" && evidence.reviewerCommentFr
                      ? evidence.reviewerCommentFr
                      : evidence.reviewerCommentEn}
                  </p>
                </div>
              )}

              {/* Rejection Reason */}
              {evidence.status === "REJECTED" && evidence.rejectionReason && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {evidence.rejectionReason}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={evidence.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-4 h-4 mr-2" />
                  {t("viewFile")}
                </a>
              </DropdownMenuItem>

              {canReview && evidence.status !== "ACCEPTED" && (
                <ReviewDialog evidence={evidence} onSuccess={onReviewComplete} />
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm(t("confirmDelete"))) {
                    deleteEvidence.mutate({ evidenceId: evidence.id });
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CAPEvidenceUpload({
  capId,
  evidence = [],
  milestones = [],
  canUpload = false,
  canReview = false,
  onEvidenceChange,
}: CAPEvidenceUploadProps) {
  const t = useTranslations("cap.evidence");

  // Summary stats
  const totalEvidence = evidence.length;
  const acceptedCount = evidence.filter((e) => e.status === "ACCEPTED").length;
  const pendingCount = evidence.filter((e) => e.status === "PENDING" || e.status === "UNDER_REVIEW").length;
  const rejectedCount = evidence.filter((e) => e.status === "REJECTED").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {canUpload && (
            <UploadDialog capId={capId} milestones={milestones} onSuccess={onEvidenceChange} />
          )}
        </div>

        {/* Summary Stats */}
        {totalEvidence > 0 && (
          <div className="flex items-center gap-4 mt-4 text-sm">
            <span className="text-muted-foreground">
              {t("total")}: <strong>{totalEvidence}</strong>
            </span>
            {acceptedCount > 0 && (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {acceptedCount} {t("accepted")}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {pendingCount} {t("pending")}
              </span>
            )}
            {rejectedCount > 0 && (
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                {rejectedCount} {t("rejected")}
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {evidence.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t("noEvidence")}</p>
            {canUpload && (
              <p className="text-sm mt-1">{t("uploadPrompt")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {evidence.map((item) => (
              <EvidenceCard
                key={item.id}
                evidence={item}
                canReview={canReview}
                onDelete={onEvidenceChange}
                onReviewComplete={onEvidenceChange}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
