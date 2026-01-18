"use client";

/**
 * Finding Detail Client Component
 *
 * Client-side component for viewing finding details.
 * Displays full finding information with status updates and CAP management.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ArrowLeft,
  AlertCircle,
  Building2,
  Calendar,
  ClipboardList,
  Edit,
  FileText,
  MoreHorizontal,
  Trash2,
  User,
  ExternalLink,
} from "lucide-react";
import type { FindingStatus, FindingSeverity, FindingType } from "@prisma/client";

interface FindingDetailClientProps {
  findingId: string;
}

// Status badge styles
const STATUS_STYLES: Record<
  FindingStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  OPEN: { variant: "destructive" },
  CAP_REQUIRED: { variant: "destructive", className: "bg-orange-500" },
  CAP_SUBMITTED: { variant: "secondary", className: "bg-blue-500 text-white" },
  CAP_ACCEPTED: { variant: "secondary", className: "bg-cyan-500 text-white" },
  IN_PROGRESS: { variant: "secondary", className: "bg-purple-500 text-white" },
  VERIFICATION: { variant: "secondary", className: "bg-indigo-500 text-white" },
  CLOSED: { variant: "default", className: "bg-green-500" },
  DEFERRED: { variant: "outline" },
};

// Severity badge styles
const SEVERITY_STYLES: Record<FindingSeverity, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
  CRITICAL: { variant: "destructive" },
  MAJOR: { variant: "destructive" },
  MINOR: { variant: "secondary" },
  OBSERVATION: { variant: "outline" },
};

// Finding type styles
const TYPE_STYLES: Record<FindingType, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
  NON_CONFORMITY: { variant: "destructive" },
  OBSERVATION: { variant: "secondary" },
  RECOMMENDATION: { variant: "outline" },
  GOOD_PRACTICE: { variant: "default" },
  CONCERN: { variant: "secondary" },
};

export function FindingDetailClient({ findingId }: FindingDetailClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("findings");

  // Fetch finding details
  const findingQuery = trpc.finding.getById.useQuery({ id: findingId });

  // Delete mutation
  const deleteFinding = trpc.finding.delete.useMutation({
    onSuccess: () => {
      toast.success("Finding deleted successfully");
      router.push(`/${locale}/findings`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete finding");
    },
  });

  // Status update mutation
  const updateStatus = trpc.finding.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated successfully");
      findingQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  if (findingQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (findingQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load finding. {findingQuery.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const finding = findingQuery.data!;

  // Get localized content
  const title = locale === "fr" ? finding.titleFr : finding.titleEn;
  const description = locale === "fr" ? finding.descriptionFr : finding.descriptionEn;
  const evidence = locale === "fr" ? finding.evidenceFr : finding.evidenceEn;
  const orgName = locale === "fr"
    ? finding.organization.nameFr
    : finding.organization.nameEn;
  const questionText = finding.question
    ? locale === "fr"
      ? finding.question.questionTextFr
      : finding.question.questionTextEn
    : null;
  const categoryName = finding.question?.category
    ? locale === "fr"
      ? finding.question.category.nameFr
      : finding.question.category.nameEn
    : null;

  // Get allowed status transitions
  const statusTransitions: Record<FindingStatus, FindingStatus[]> = {
    OPEN: ["CAP_REQUIRED", "CLOSED", "DEFERRED"],
    CAP_REQUIRED: ["CAP_SUBMITTED", "DEFERRED"],
    CAP_SUBMITTED: ["CAP_ACCEPTED", "CAP_REQUIRED"],
    CAP_ACCEPTED: ["IN_PROGRESS"],
    IN_PROGRESS: ["VERIFICATION", "DEFERRED"],
    VERIFICATION: ["CLOSED", "IN_PROGRESS"],
    CLOSED: [],
    DEFERRED: ["OPEN", "CAP_REQUIRED"],
  };

  const allowedTransitions = statusTransitions[finding.status] || [];

  return (
    <div className="space-y-6">
      {/* Header with navigation and actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/findings`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detail.backToList")}
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${locale}/findings/${findingId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              {t("actions.edit")}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allowedTransitions.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => updateStatus.mutate({ id: findingId, status })}
                  disabled={updateStatus.isPending}
                >
                  {t("actions.updateStatus")}: {t(`status.${status}`)}
                </DropdownMenuItem>
              ))}
              {allowedTransitions.length > 0 && <Separator className="my-1" />}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("actions.delete")}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Finding?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the finding and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteFinding.mutate({ id: findingId })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and classification */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{finding.referenceNumber}</Badge>
                    <Badge {...TYPE_STYLES[finding.findingType]}>
                      {t(`type.${finding.findingType}`)}
                    </Badge>
                    <Badge {...SEVERITY_STYLES[finding.severity]}>
                      {t(`severity.${finding.severity}`)}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                </div>
                <Badge
                  {...STATUS_STYLES[finding.status]}
                  className={STATUS_STYLES[finding.status].className}
                >
                  {t(`status.${finding.status}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">{description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Evidence */}
          {evidence && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("form.sections.evidence")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{evidence}</p>

                {finding.icaoReference && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      {t("form.icaoReference")}:
                    </span>
                    <p className="font-medium">{finding.icaoReference}</p>
                  </div>
                )}

                {finding.criticalElement && (
                  <div className="mt-2">
                    <span className="text-sm text-muted-foreground">
                      {t("form.criticalElement")}:
                    </span>
                    <p className="font-medium">{finding.criticalElement}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Related Question */}
          {finding.question && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  {t("detail.question")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{finding.question.pqNumber}</Badge>
                  {categoryName && (
                    <span className="text-sm text-muted-foreground">
                      {categoryName}
                    </span>
                  )}
                </div>
                <p className="text-sm">{questionText}</p>
              </CardContent>
            </Card>
          )}

          {/* CAP Section */}
          {finding.correctiveActionPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("detail.cap")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-medium">
                      {finding.correctiveActionPlan.status}
                    </p>
                  </div>
                  {finding.correctiveActionPlan.dueDate && (
                    <div>
                      <span className="text-muted-foreground">Due Date</span>
                      <p className="font-medium">
                        {format(
                          new Date(finding.correctiveActionPlan.dueDate),
                          "PPP"
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {finding.documents && finding.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("detail.documents")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {finding.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{doc.name}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Review Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {t("detail.review")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground">Reference</span>
                <Link
                  href={`/${locale}/reviews/${finding.review.id}`}
                  className="font-medium flex items-center gap-1 hover:underline"
                >
                  {finding.review.referenceNumber}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium">{finding.review.status}</p>
              </div>
            </CardContent>
          </Card>

          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t("detail.organization")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <Link
                  href={`/${locale}/organizations/${finding.organization.id}`}
                  className="font-medium flex items-center gap-1 hover:underline"
                >
                  {orgName}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <div>
                <span className="text-muted-foreground">ICAO Code</span>
                <p className="font-medium">{finding.organization.icaoCode}</p>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {finding.identifiedAt && (
                <div>
                  <span className="text-muted-foreground">
                    {t("detail.identifiedAt")}
                  </span>
                  <p className="font-medium">
                    {format(new Date(finding.identifiedAt), "PPP")}
                  </p>
                </div>
              )}
              {finding.targetCloseDate && (
                <div>
                  <span className="text-muted-foreground">
                    {t("detail.targetCloseDate")}
                  </span>
                  <p className="font-medium">
                    {format(new Date(finding.targetCloseDate), "PPP")}
                  </p>
                </div>
              )}
              {finding.closedAt && (
                <div>
                  <span className="text-muted-foreground">
                    {t("detail.closedAt")}
                  </span>
                  <p className="font-medium">
                    {format(new Date(finding.closedAt), "PPP")}
                  </p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">
                  {format(new Date(finding.createdAt), "PPP")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Assigned To */}
          {finding.assignedTo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("form.assignedTo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">
                  {finding.assignedTo.firstName} {finding.assignedTo.lastName}
                </p>
                <p className="text-muted-foreground">{finding.assignedTo.email}</p>
              </CardContent>
            </Card>
          )}

          {/* CAP Required */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("form.capRequired")}</span>
                <Badge variant={finding.capRequired ? "default" : "secondary"}>
                  {finding.capRequired ? "Yes" : "No"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
