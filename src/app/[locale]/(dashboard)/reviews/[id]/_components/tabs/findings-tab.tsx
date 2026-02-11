"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { FindingList } from "./findings/finding-list";
import { FindingDetail } from "./findings/finding-detail";
import { CreateFindingDialog } from "@/components/findings/create-finding-dialog";
import { EditFindingDialog } from "@/components/findings/edit-finding-dialog";
import { useFocusTracker } from "@/hooks/use-focus-tracker";
import { useEditLock } from "@/hooks/use-edit-lock";
import type { ReviewData } from "../../_lib/fetch-review-data";

interface FindingsTabProps {
  review: ReviewData;
  userId?: string;
  userName?: string;
}

interface TransformedFinding {
  id: string;
  reference: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  category?: string;
  assignee: { id: string; name: string } | null;
  cap: { id: string; status: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export function FindingsTab({ review, userId, userName }: FindingsTabProps) {
  const t = useTranslations("reviews.detail.findings");
  const locale = useLocale();

  const utils = trpc.useUtils();
  const { getViewers, setFocus, clearFocus } = useFocusTracker({
    reviewId: review.id,
    userId: userId ?? "",
    userName: userName ?? "",
  });
  const { acquireLock, releaseLock, isLockedByOther } = useEditLock({
    reviewId: review.id,
    userId: userId ?? "",
    userName: userName ?? "",
  });
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    null
  );
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch full findings data via tRPC
  const { data: findingsData, isLoading } = trpc.finding.getByReview.useQuery(
    { reviewId: review.id },
    { enabled: !!review.id }
  );

  // Transform findings to match FindingList interface
  const findings: TransformedFinding[] =
    findingsData?.map((finding: { id: string; referenceNumber: string; titleFr: string | null; titleEn: string | null; descriptionFr: string | null; descriptionEn: string | null; severity: string; status: string; criticalElement?: string | null; assignedTo?: { id: string; firstName: string; lastName: string } | null; correctiveActionPlan?: { id: string; status: string } | null; createdAt: Date | string; updatedAt: Date | string }) => ({
      id: finding.id,
      reference: finding.referenceNumber,
      title: (locale === "fr" ? finding.titleFr : finding.titleEn) || "Untitled",
      description:
        (locale === "fr" ? finding.descriptionFr : finding.descriptionEn) || undefined,
      severity: finding.severity,
      status: finding.status,
      category: finding.criticalElement || undefined,
      assignee: finding.assignedTo
        ? {
            id: finding.assignedTo.id,
            name: `${finding.assignedTo.firstName} ${finding.assignedTo.lastName}`,
          }
        : null,
      cap: finding.correctiveActionPlan
        ? {
            id: finding.correctiveActionPlan.id,
            status: finding.correctiveActionPlan.status,
          }
        : null,
      createdAt: new Date(finding.createdAt),
      updatedAt: new Date(finding.updatedAt),
    })) || [];

  // Calculate summary stats
  const stats = {
    total: findings.length,
    critical: findings.filter((f) => f.severity === "CRITICAL").length,
    major: findings.filter((f) => f.severity === "MAJOR").length,
    open: findings.filter(
      (f) =>
        f.status === "OPEN" ||
        f.status === "CAP_REQUIRED" ||
        f.status === "CAP_SUBMITTED" ||
        f.status === "CAP_ACCEPTED" ||
        f.status === "IN_PROGRESS" ||
        f.status === "VERIFICATION"
    ).length,
  };

  // Handle edit with lock guard
  const handleEditFinding = (findingId: string) => {
    const lock = isLockedByOther(`finding:${findingId}`);
    if (lock) {
      toast.warning(`${lock.userName} is currently editing this finding`);
      return;
    }
    const acquired = acquireLock(`finding:${findingId}`);
    if (acquired) {
      setEditingFindingId(findingId);
    }
  };

  const handleEditClose = () => {
    if (editingFindingId) {
      releaseLock(`finding:${editingFindingId}`);
    }
    setEditingFindingId(null);
  };

  const handleEditSaved = () => {
    if (editingFindingId) {
      releaseLock(`finding:${editingFindingId}`);
    }
    setEditingFindingId(null);
    utils.finding.getByReview.invalidate({ reviewId: review.id });
  };

  // Get the finding data for the edit dialog
  const editingFinding = editingFindingId
    ? findingsData?.find((f: { id: string }) => f.id === editingFindingId)
    : null;

  // Show detail view if a finding is selected
  if (selectedFindingId) {
    return (
      <div className="p-4 md:p-6">
        <FindingDetail
          findingId={selectedFindingId}
          reviewId={review.id}
          onBack={() => setSelectedFindingId(null)}
          onEdit={() => handleEditFinding(selectedFindingId)}
          editLock={isLockedByOther(`finding:${selectedFindingId}`)}
          getViewers={getViewers}
          setFocus={setFocus}
          clearFocus={clearFocus}
        />

        {editingFinding && (
          <EditFindingDialog
            open={!!editingFindingId}
            onOpenChange={(open) => { if (!open) handleEditClose(); }}
            finding={{
              id: editingFinding.id,
              reviewId: review.id,
              referenceNumber: editingFinding.referenceNumber,
              titleEn: editingFinding.titleEn || "",
              titleFr: editingFinding.titleFr,
              descriptionEn: editingFinding.descriptionEn || "",
              descriptionFr: editingFinding.descriptionFr,
              severity: editingFinding.severity,
              status: editingFinding.status,
              findingType: editingFinding.findingType,
              criticalElement: editingFinding.criticalElement,
            }}
            onUpdated={handleEditSaved}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("summary", {
              total: stats.total,
              critical: stats.critical,
              major: stats.major,
              open: stats.open,
            })}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addFinding")}
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : findings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">{t("empty.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("empty.description")}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("addFinding")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <FindingList
          findings={findings}
          reviewId={review.id}
          onSelect={(finding) => setSelectedFindingId(finding.id)}
          getViewers={getViewers}
          isLockedByOther={isLockedByOther}
        />
      )}

      <CreateFindingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        reviewId={review.id}
        organizationId={review.hostOrganizationId}
        onCreated={() => {
          setShowCreateDialog(false);
          utils.finding.getByReview.invalidate({ reviewId: review.id });
        }}
      />
    </div>
  );
}
