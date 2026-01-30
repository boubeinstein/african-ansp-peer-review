"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle,
  Circle,
  Camera,
  MapPin,
  ChevronRight,
  X,
  ImageIcon,
  Trash2,
  WifiOff,
} from "lucide-react";
import {
  offlineChecklistService,
  type ChecklistItem,
  type CapturedEvidence,
} from "@/lib/offline/checklist-service";
import { usePhotoCapture } from "@/hooks/use-photo-capture";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

interface MobileChecklistProps {
  reviewId: string;
  userId: string;
  initialItems?: ChecklistItem[];
}

export function MobileChecklist({
  reviewId,
  userId,
  initialItems,
}: MobileChecklistProps) {
  const t = useTranslations("fieldwork.checklist");
  const locale = useLocale();
  const { isOnline } = useNetworkStatus();
  const { capturePhoto, selectFromGallery, isCapturing } = usePhotoCapture();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
  });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [itemEvidence, setItemEvidence] = useState<
    Record<string, CapturedEvidence[]>
  >({});
  const [evidenceToDelete, setEvidenceToDelete] = useState<{
    itemId: string;
    evidenceId: string;
  } | null>(null);

  // Load checklist
  useEffect(() => {
    const load = async () => {
      if (initialItems) {
        await offlineChecklistService.initializeChecklist(reviewId, initialItems);
      }
      const checklist = await offlineChecklistService.getChecklist(reviewId);
      if (checklist) {
        setItems(checklist.items);
      }
      const prog = await offlineChecklistService.getProgress(reviewId);
      setProgress(prog);
    };
    load();
  }, [reviewId, initialItems]);

  const handleStatusChange = useCallback(
    async (itemId: string, status: ChecklistItem["status"]) => {
      try {
        if (status === "COMPLETED") {
          await offlineChecklistService.completeItem(reviewId, itemId, userId);
        } else {
          await offlineChecklistService.updateItem(reviewId, itemId, { status });
        }

        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, status } : i))
        );
        const prog = await offlineChecklistService.getProgress(reviewId);
        setProgress(prog);
        toast.success(t("itemUpdated"));
      } catch {
        toast.error(t("updateFailed"));
      }
    },
    [reviewId, userId, t]
  );

  const handleNotesChange = useCallback(
    async (itemId: string, notes: string) => {
      try {
        await offlineChecklistService.updateItem(reviewId, itemId, { notes });
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, notes } : i))
        );
      } catch {
        toast.error(t("updateFailed"));
      }
    },
    [reviewId, t]
  );

  const handleCaptureEvidence = useCallback(
    async (itemId: string, fromGallery = false) => {
      try {
        const photo = fromGallery ? await selectFromGallery() : await capturePhoto();
        const evidenceId = await offlineChecklistService.addEvidence(
          reviewId,
          itemId,
          {
            type: "PHOTO",
            dataUrl: photo.dataUrl,
            fileName: photo.fileName,
            mimeType: photo.mimeType,
            size: photo.size,
            metadata: photo.metadata,
          }
        );

        // Update local state
        const evidence = await offlineChecklistService.getEvidence(evidenceId);
        if (evidence) {
          setItemEvidence((prev) => ({
            ...prev,
            [itemId]: [...(prev[itemId] || []), evidence],
          }));
        }

        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, evidenceIds: [...i.evidenceIds, evidenceId] }
              : i
          )
        );
        toast.success(t("evidenceCaptured"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("cancelled")) {
          // User cancelled, don't show error
          return;
        }
        toast.error(t("evidenceFailed"));
      }
    },
    [reviewId, capturePhoto, selectFromGallery, t]
  );

  const handleDeleteEvidence = useCallback(async () => {
    if (!evidenceToDelete) return;

    try {
      await offlineChecklistService.removeEvidence(
        reviewId,
        evidenceToDelete.itemId,
        evidenceToDelete.evidenceId
      );

      setItemEvidence((prev) => ({
        ...prev,
        [evidenceToDelete.itemId]: (prev[evidenceToDelete.itemId] || []).filter(
          (e) => e.id !== evidenceToDelete.evidenceId
        ),
      }));

      setItems((prev) =>
        prev.map((i) =>
          i.id === evidenceToDelete.itemId
            ? {
                ...i,
                evidenceIds: i.evidenceIds.filter(
                  (id) => id !== evidenceToDelete.evidenceId
                ),
              }
            : i
        )
      );

      toast.success(t("evidenceDeleted"));
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setEvidenceToDelete(null);
    }
  }, [reviewId, evidenceToDelete, t]);

  const loadItemEvidence = useCallback(
    async (itemId: string) => {
      if (itemEvidence[itemId]) return;
      const evidence = await offlineChecklistService.getItemEvidence(
        reviewId,
        itemId
      );
      setItemEvidence((prev) => ({ ...prev, [itemId]: evidence }));
    },
    [reviewId, itemEvidence]
  );

  const getStatusIcon = (status: ChecklistItem["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "IN_PROGRESS":
        return <Circle className="h-5 w-5 text-amber-500 fill-amber-500" />;
      case "NOT_APPLICABLE":
        return <X className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStatusVariant = (
    status: ChecklistItem["status"],
    currentStatus: ChecklistItem["status"]
  ): "default" | "outline" | "secondary" => {
    if (status === currentStatus) return "default";
    return "outline";
  };

  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.categoryId]) acc[item.categoryId] = [];
      acc[item.categoryId].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Progress Header */}
      <Card className="sticky top-0 z-10 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t("progress")}</span>
            <span className="text-sm text-muted-foreground">
              {progress.completed}/{progress.total}
            </span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {!isOnline && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <WifiOff className="h-3 w-3 mr-1" />
                {t("offlineMode")}
              </Badge>
            )}
            <span>{progress.percentage}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <Accordion type="single" collapsible className="space-y-2">
        {Object.entries(groupedItems).map(([categoryId, categoryItems]) => (
          <Card key={categoryId}>
            <AccordionItem value={categoryId} className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{categoryId}</span>
                  <Badge variant="secondary">
                    {categoryItems.filter((i) => i.status === "COMPLETED").length}/
                    {categoryItems.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "border-t p-4 space-y-3 transition-colors",
                      selectedItem === item.id && "bg-muted/50"
                    )}
                    onClick={() => {
                      setSelectedItem(selectedItem === item.id ? null : item.id);
                      loadItemEvidence(item.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="mt-0.5 touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus =
                            item.status === "COMPLETED"
                              ? "NOT_STARTED"
                              : "COMPLETED";
                          handleStatusChange(item.id, nextStatus);
                        }}
                      >
                        {getStatusIcon(item.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          {locale === "fr"
                            ? item.questionTextFr
                            : item.questionTextEn}
                        </p>
                        {item.evidenceIds.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Camera className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {item.evidenceIds.length}
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-5 w-5 text-muted-foreground shrink-0 transition-transform",
                          selectedItem === item.id && "rotate-90"
                        )}
                      />
                    </div>

                    {selectedItem === item.id && (
                      <div className="pl-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                        {/* Status Buttons */}
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              "NOT_STARTED",
                              "IN_PROGRESS",
                              "COMPLETED",
                              "NOT_APPLICABLE",
                            ] as const
                          ).map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={getStatusVariant(status, item.status)}
                              className="touch-manipulation"
                              onClick={() => handleStatusChange(item.id, status)}
                            >
                              {t(`status.${status}`)}
                            </Button>
                          ))}
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            {t("notes")}
                          </label>
                          <Textarea
                            placeholder={t("notesPlaceholder")}
                            value={item.notes}
                            onChange={(e) =>
                              handleNotesChange(item.id, e.target.value)
                            }
                            rows={2}
                            className="resize-none"
                          />
                        </div>

                        {/* Evidence */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {t("evidence")}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="touch-manipulation"
                                onClick={() => handleCaptureEvidence(item.id, true)}
                                disabled={isCapturing}
                              >
                                <ImageIcon className="h-4 w-4 mr-1" />
                                {t("selectPhoto")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="touch-manipulation"
                                onClick={() => handleCaptureEvidence(item.id, false)}
                                disabled={isCapturing}
                              >
                                <Camera className="h-4 w-4 mr-1" />
                                {t("capturePhoto")}
                              </Button>
                            </div>
                          </div>

                          {itemEvidence[item.id]?.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {itemEvidence[item.id].map((evidence) => (
                                <div
                                  key={evidence.id}
                                  className="relative aspect-square rounded-lg overflow-hidden border group"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element -- Base64 data URLs don't benefit from next/image optimization */}
                                <img
                                    src={evidence.dataUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                  {evidence.metadata.latitude && (
                                    <div className="absolute bottom-1 left-1">
                                      <Badge
                                        variant="secondary"
                                        className="text-xs bg-black/50 text-white border-0"
                                      >
                                        <MapPin className="h-3 w-3 mr-0.5" />
                                        GPS
                                      </Badge>
                                    </div>
                                  )}
                                  <button
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
                                    onClick={() =>
                                      setEvidenceToDelete({
                                        itemId: item.id,
                                        evidenceId: evidence.id,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Card>
        ))}
      </Accordion>

      {/* Delete Evidence Confirmation */}
      <AlertDialog
        open={!!evidenceToDelete}
        onOpenChange={(open) => !open && setEvidenceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteEvidenceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteEvidenceDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvidence}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
