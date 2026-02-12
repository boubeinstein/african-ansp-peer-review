"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useOfflineFieldwork } from "@/hooks/use-offline-fieldwork";
import type { OfflineChecklistItem } from "@/lib/offline/types";
import { ChecklistItemCard } from "./checklist-item-card";
import { ChecklistProgressBar } from "./checklist-progress-bar";

// =============================================================================
// Constants
// =============================================================================

const PHASES = ["PRE_VISIT", "ON_SITE", "POST_VISIT"] as const;
type Phase = (typeof PHASES)[number];

// =============================================================================
// Props
// =============================================================================

interface OfflineChecklistProps {
  reviewId: string;
}

// =============================================================================
// Component
// =============================================================================

export function OfflineChecklist({ reviewId }: OfflineChecklistProps) {
  const t = useTranslations("fieldwork.checklist");

  const {
    isOnline,
    syncStatus,
    isSyncing,
    checklistItems,
    evidence,
    actions,
  } = useOfflineFieldwork(reviewId);

  const [activePhase, setActivePhase] = useState<Phase>("PRE_VISIT");

  // ---------------------------------------------------------------------------
  // Derive items by phase
  // ---------------------------------------------------------------------------

  const itemsByPhase = useMemo(() => {
    const map: Record<Phase, OfflineChecklistItem[]> = {
      PRE_VISIT: [],
      ON_SITE: [],
      POST_VISIT: [],
    };

    for (const item of checklistItems.values()) {
      const phase = item.phase as Phase;
      if (map[phase]) {
        map[phase].push(item);
      }
    }

    // Sort each phase by sortOrder
    for (const phase of PHASES) {
      map[phase].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return map;
  }, [checklistItems]);

  const activeItems = itemsByPhase[activePhase];
  const pendingCount = syncStatus.pending + syncStatus.failed;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Offline / Online badge */}
        <Badge
          variant={isOnline ? "success" : "warning"}
          className="gap-1"
        >
          {isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {isOnline ? t("online") : t("offline")}
        </Badge>

        {/* Sync status pill */}
        <Badge variant="outline" className="gap-1">
          {isSyncing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("syncing")}
            </>
          ) : pendingCount > 0 ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              {t("pendingSyncCount", { count: pendingCount })}
            </>
          ) : (
            t("allSynced")
          )}
        </Badge>

        <div className="flex-1" />

        {/* Manual sync button */}
        {pendingCount > 0 && isOnline && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => void actions.triggerSync()}
            disabled={isSyncing}
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 mr-1",
                isSyncing && "animate-spin"
              )}
            />
          </Button>
        )}
      </div>

      {/* Phase tabs */}
      <Tabs
        value={activePhase}
        onValueChange={(v) => setActivePhase(v as Phase)}
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-full min-w-fit">
            {PHASES.map((phase) => {
              const count = itemsByPhase[phase].length;
              const completed = itemsByPhase[phase].filter(
                (i) => i.isCompleted
              ).length;
              return (
                <TabsTrigger
                  key={phase}
                  value={phase}
                  className="flex-1 min-w-[100px] text-xs sm:text-sm"
                >
                  {t(`phase.${phase}`)}
                  {count > 0 && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      {completed}/{count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Phase content */}
        {PHASES.map((phase) => (
          <TabsContent key={phase} value={phase} className="space-y-3 mt-3">
            <ChecklistProgressBar items={itemsByPhase[phase]} />

            {itemsByPhase[phase].length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                —
              </p>
            ) : (
              <div className="space-y-2">
                {itemsByPhase[phase].map((item) => (
                  <ChecklistItemCard
                    key={item.id}
                    item={item}
                    evidenceItems={evidence.get(item.id) ?? []}
                    onUpdate={actions.updateChecklistItem}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
