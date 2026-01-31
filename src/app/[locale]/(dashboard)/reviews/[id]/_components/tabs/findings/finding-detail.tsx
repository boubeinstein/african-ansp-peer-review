"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreHorizontal,
  Edit,
  Clock,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Plus,
  ClipboardCheck,
  Send,
  ThumbsUp,
  Search,
  PauseCircle,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format, formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FindingDetailProps {
  findingId: string;
  reviewId: string;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUSES = [
  "OPEN",
  "CAP_REQUIRED",
  "CAP_SUBMITTED",
  "CAP_ACCEPTED",
  "IN_PROGRESS",
  "VERIFICATION",
  "CLOSED",
  "DEFERRED",
] as const;

const severityConfig = {
  CRITICAL: { color: "bg-red-100 text-red-800 border-red-300", icon: "🔴" },
  MAJOR: { color: "bg-orange-100 text-orange-800 border-orange-300", icon: "🟠" },
  MINOR: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "🟡" },
  OBSERVATION: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: "🔵" },
};

const statusConfig = {
  OPEN: { color: "bg-gray-100 text-gray-800", icon: AlertCircle },
  CAP_REQUIRED: { color: "bg-amber-100 text-amber-800", icon: ClipboardCheck },
  CAP_SUBMITTED: { color: "bg-blue-100 text-blue-800", icon: Send },
  CAP_ACCEPTED: { color: "bg-teal-100 text-teal-800", icon: ThumbsUp },
  IN_PROGRESS: { color: "bg-indigo-100 text-indigo-800", icon: Clock },
  VERIFICATION: { color: "bg-purple-100 text-purple-800", icon: Search },
  CLOSED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  DEFERRED: { color: "bg-slate-100 text-slate-800", icon: PauseCircle },
};

export function FindingDetail({
  findingId,
  onBack,
  onEdit,
}: FindingDetailProps) {
  const t = useTranslations("reviews.detail.findings.detail");
  const tSeverity = useTranslations("reviews.detail.findings.severity");
  const tStatus = useTranslations("reviews.detail.findings.status");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  const { data: finding, isLoading } = trpc.finding.getById.useQuery(
    { id: findingId },
    { enabled: !!findingId }
  );

  const updateStatusMutation = trpc.finding.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t("statusUpdated"));
      utils.finding.getById.invalidate({ id: findingId });
    },
    onError: (error) => toast.error(error.message || t("updateError")),
  });

  const handleStatusChange = (status: string) => {
    updateStatusMutation.mutate({
      id: findingId,
      status: status as (typeof STATUSES)[number],
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
      </div>
    );
  }

  const severity =
    severityConfig[finding.severity as keyof typeof severityConfig];

  // Get localized content
  const title = locale === "fr" ? finding.titleFr : finding.titleEn;
  const description =
    locale === "fr" ? finding.descriptionFr : finding.descriptionEn;
  const evidence = locale === "fr" ? finding.evidenceFr : finding.evidenceEn;

  // Get assignee name
  const assigneeName = finding.assignedTo
    ? `${finding.assignedTo.firstName} ${finding.assignedTo.lastName}`
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                {t("edit")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Finding Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              {/* Reference & Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-sm">
                  {finding.referenceNumber}
                </Badge>
                <Badge variant="secondary" className={cn(severity?.color)}>
                  {severity?.icon} {tSeverity(finding.severity)}
                </Badge>
              </div>
              {/* Title */}
              <CardTitle className="text-xl">{title}</CardTitle>
            </div>

            {/* Status Selector */}
            <Select value={finding.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => {
                  const config = statusConfig[s];
                  const Icon = config.icon;
                  return (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {tStatus(s)}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {description && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t("description")}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {description}
              </p>
            </div>
          )}

          {/* Evidence */}
          {evidence && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t("evidence")}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {evidence}
              </p>
            </div>
          )}

          <Separator />

          {/* Meta Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {/* Finding Type */}
            <div>
              <span className="text-muted-foreground">{t("findingType")}:</span>{" "}
              <span className="font-medium">{finding.findingType}</span>
            </div>

            {/* Critical Element */}
            {finding.criticalElement && (
              <div>
                <span className="text-muted-foreground">
                  {t("criticalElement")}:
                </span>{" "}
                <span className="font-medium">{finding.criticalElement}</span>
              </div>
            )}

            {/* ICAO Reference */}
            {finding.icaoReference && (
              <div>
                <span className="text-muted-foreground">
                  {t("icaoReference")}:
                </span>{" "}
                <span className="font-medium font-mono">
                  {finding.icaoReference}
                </span>
              </div>
            )}

            {/* Assignee */}
            {assigneeName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("assignee")}:</span>{" "}
                <span className="font-medium">{assigneeName}</span>
              </div>
            )}

            {/* Target Close Date */}
            {finding.targetCloseDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("targetDate")}:</span>{" "}
                <span>
                  {format(new Date(finding.targetCloseDate), "PPP", {
                    locale: dateLocale,
                  })}
                </span>
              </div>
            )}

            {/* Created */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("created")}:</span>{" "}
              <span>
                {format(new Date(finding.createdAt), "PPP", {
                  locale: dateLocale,
                })}
              </span>
            </div>

            {/* Updated */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("updated")}:</span>{" "}
              <span>
                {formatDistanceToNow(new Date(finding.updatedAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked CAP */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("correctiveActionPlan")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finding.correctiveActionPlan ? (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">{t("capTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("capStatus")}: {finding.correctiveActionPlan.status}
                </p>
                {finding.correctiveActionPlan.dueDate && (
                  <p className="text-sm text-muted-foreground">
                    {t("capDueDate")}:{" "}
                    {format(
                      new Date(finding.correctiveActionPlan.dueDate),
                      "PPP",
                      { locale: dateLocale }
                    )}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/${locale}/caps/${finding.correctiveActionPlan.id}`}>
                  {t("viewCap")}
                  <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                {t("noCapLinked")}
              </p>
              {finding.capRequired && (
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  {t("createCap")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence Documents */}
      {finding.documents && finding.documents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("evidenceDocuments")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {finding.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {doc.name || doc.originalName || "Document"}
                    </span>
                  </div>
                  {doc.fileUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
