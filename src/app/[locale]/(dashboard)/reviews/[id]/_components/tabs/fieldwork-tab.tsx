"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardCheck,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useOfflineFieldwork } from "@/hooks/use-offline-fieldwork";
import { OfflineChecklist } from "@/components/fieldwork/offline-checklist";
import { DraftFindingsList } from "@/components/fieldwork/draft-findings-list";
import { DraftFindingForm } from "@/components/fieldwork/draft-finding-form";
import { SyncStatusPanel } from "@/components/fieldwork/sync-status-panel";
import { SyncProgressIndicator } from "@/components/fieldwork/sync-progress-indicator";
import type { OfflineDraftFinding } from "@/lib/offline/types";
import type { ReviewData } from "../../_lib/fetch-review-data";

// =============================================================================
// Props
// =============================================================================

interface FieldworkTabProps {
  review: ReviewData;
  userId: string;
}

// =============================================================================
// Component
// =============================================================================

export function FieldworkTab({ review }: FieldworkTabProps) {
  const t = useTranslations("fieldwork.mode");
  const {
    isOnline,
    syncStatus,
    checklistItems,
    draftFindings,
  } = useOfflineFieldwork(review.id);

  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<string>("checklist");
  const [findingFormOpen, setFindingFormOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<OfflineDraftFinding | undefined>();

  // Compute counts
  const itemsArray = Array.from(checklistItems.values());
  const completedItems = itemsArray.filter((i) => i.isCompleted).length;
  const totalItems = itemsArray.length;
  const findingsCount = draftFindings.length;
  const pendingSync = syncStatus.pending + syncStatus.failed;

  // Finding handlers
  const handleAddFinding = useCallback(() => {
    setEditingFinding(undefined);
    setFindingFormOpen(true);
  }, []);

  const handleEditFinding = useCallback((finding: OfflineDraftFinding) => {
    setEditingFinding(finding);
    setFindingFormOpen(true);
  }, []);

  const handleFindingSaved = useCallback(() => {
    setFindingFormOpen(false);
    setEditingFinding(undefined);
  }, []);

  // If the form is open, show that instead
  if (findingFormOpen) {
    return (
      <div className="space-y-4">
        <DraftFindingForm
          reviewId={review.id}
          existingFinding={editingFinding}
          onSave={handleFindingSaved}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Badge
          variant={isOnline ? "default" : "destructive"}
          className="gap-1"
        >
          {isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      {/* Phase warning */}
      {review.phase !== "ON_SITE" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              {t("reviewPhase")}: {review.phase}
            </p>
            <p className="text-amber-600 dark:text-amber-500 mt-0.5">
              {t("phaseNotOnSite")}
            </p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t("itemsCount", { completed: completedItems, total: totalItems })}
          icon={<ClipboardCheck className="h-4 w-4 text-blue-500" />}
        />
        <StatCard
          label={t("findingsCount", { count: findingsCount })}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        />
        <button
          type="button"
          onClick={() => setSyncPanelOpen(true)}
          className="text-left"
        >
          <StatCard
            label={t("pendingSyncCount", { count: pendingSync })}
            icon={<RefreshCw className="h-4 w-4 text-green-500" />}
            interactive
          />
        </button>
      </div>

      {/* Sub-tabs: Checklist, Findings, Sync */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="checklist" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("tabChecklist")}</span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {completedItems}/{totalItems}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="findings" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("tabFindings")}</span>
            {findingsCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {findingsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("tabSync")}</span>
            {pendingSync > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {pendingSync}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-4">
          <OfflineChecklist reviewId={review.id} />
        </TabsContent>

        <TabsContent value="findings" className="mt-4">
          <DraftFindingsList
            reviewId={review.id}
            onAdd={handleAddFinding}
            onEdit={handleEditFinding}
          />
        </TabsContent>

        <TabsContent value="sync" className="mt-4">
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              {t("pendingSyncCount", { count: pendingSync })}
            </p>
            <button
              type="button"
              onClick={() => setSyncPanelOpen(true)}
              className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {t("tabSync")}
            </button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating sync indicator */}
      <SyncProgressIndicator onTap={() => setSyncPanelOpen(true)} />

      {/* Sync status panel (bottom sheet) */}
      <SyncStatusPanel
        open={syncPanelOpen}
        onOpenChange={setSyncPanelOpen}
      />
    </div>
  );
}

// =============================================================================
// Stat card
// =============================================================================

function StatCard({
  label,
  icon,
  interactive,
}: {
  label: string;
  icon: React.ReactNode;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 flex items-center gap-2.5 ${
        interactive
          ? "hover:bg-muted/50 transition-colors cursor-pointer"
          : ""
      }`}
    >
      {icon}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
