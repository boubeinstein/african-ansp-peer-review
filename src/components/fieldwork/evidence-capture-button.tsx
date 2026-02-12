"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ImageIcon, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  capturePhoto,
  selectFromGallery,
  getCurrentPosition,
  type CapturedImage,
  type GeoPosition,
} from "@/lib/offline/media-capture";
import { FieldEvidenceType } from "@/lib/offline/types";
import { useOfflineFieldworkStore } from "@/stores/offline-fieldwork-store";

// =============================================================================
// Props
// =============================================================================

interface EvidenceCaptureButtonProps {
  checklistItemId: string;
  reviewId: string;
  onCapture?: (evidenceId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function EvidenceCaptureButton({
  checklistItemId,
  reviewId,
  onCapture,
}: EvidenceCaptureButtonProps) {
  const t = useTranslations("fieldwork.checklist");
  const addEvidence = useOfflineFieldworkStore((s) => s.addEvidence);

  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    image: CapturedImage;
    gps: GeoPosition | null;
    objectUrl: string;
  } | null>(null);
  const [caption, setCaption] = useState("");

  // ---------------------------------------------------------------------------
  // Capture flow
  // ---------------------------------------------------------------------------

  async function handleCapture(mode: "camera" | "gallery") {
    setBusy(true);
    try {
      // Start GPS in parallel with image capture (non-blocking)
      const gpsPromise = getCurrentPosition();

      const image =
        mode === "camera"
          ? await capturePhoto({ facing: "environment" })
          : await selectFromGallery();

      const gps = await gpsPromise;
      const objectUrl = URL.createObjectURL(image.blob);

      setPreview({ image, gps, objectUrl });
      setCaption("");
    } catch (err) {
      // User cancelled or permission denied — don't toast on cancel
      if (err instanceof Error && !err.message.includes("cancelled")) {
        toast.error(t("evidenceFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Confirm & persist
  // ---------------------------------------------------------------------------

  async function handleConfirm() {
    if (!preview) return;
    setBusy(true);

    try {
      await addEvidence(checklistItemId, {
        checklistItemId,
        reviewId,
        type: FieldEvidenceType.PHOTO,
        blob: preview.image.blob,
        thumbnailBlob: preview.image.thumbnail,
        mimeType: "image/jpeg",
        fileName: `evidence_${Date.now()}.jpg`,
        fileSize: preview.image.blob.size,
        gpsLatitude: preview.gps?.latitude ?? null,
        gpsLongitude: preview.gps?.longitude ?? null,
        gpsAccuracy: preview.gps?.accuracy ?? null,
        capturedAt: new Date(),
        annotations: caption,
      });

      toast.success(t("evidenceCaptured"));
      onCapture?.(checklistItemId);
    } catch {
      toast.error(t("evidenceFailed"));
    } finally {
      closePreview();
      setBusy(false);
    }
  }

  function closePreview() {
    if (preview) {
      URL.revokeObjectURL(preview.objectUrl);
    }
    setPreview(null);
    setCaption("");
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] min-w-[44px]"
          disabled={busy}
          onClick={() => handleCapture("camera")}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Camera className="h-4 w-4 mr-1.5" />
          )}
          {t("capturePhoto")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] min-w-[44px]"
          disabled={busy}
          onClick={() => handleCapture("gallery")}
        >
          <ImageIcon className="h-4 w-4 mr-1.5" />
          {t("selectPhoto")}
        </Button>
      </div>

      {/* Preview dialog */}
      <Dialog open={preview !== null} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("evidence")}</DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              {/* Image preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.objectUrl}
                alt="Captured evidence"
                className="w-full rounded-lg object-cover max-h-[300px]"
              />

              {/* GPS info */}
              {preview.gps && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {preview.gps.latitude.toFixed(6)},{" "}
                    {preview.gps.longitude.toFixed(6)}
                  </span>
                  <span className="text-[10px]">
                    (±{preview.gps.accuracy.toFixed(0)}m)
                  </span>
                </div>
              )}

              {/* Caption input */}
              <Textarea
                placeholder={t("notesPlaceholder")}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closePreview} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {t("evidence")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
