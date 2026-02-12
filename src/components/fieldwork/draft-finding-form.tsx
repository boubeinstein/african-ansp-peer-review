"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCurrentPosition } from "@/lib/offline/media-capture";
import { USOAP_AUDIT_AREAS } from "@/lib/questionnaire/constants";
import { useOfflineFieldworkStore } from "@/stores/offline-fieldwork-store";
import type { OfflineDraftFinding } from "@/lib/offline/types";
import { EvidencePicker } from "./evidence-picker";

// =============================================================================
// Constants
// =============================================================================

const SEVERITIES = ["OBSERVATION", "MINOR", "MAJOR", "CRITICAL"] as const;
type Severity = (typeof SEVERITIES)[number];

const SEVERITY_COLORS: Record<Severity, string> = {
  OBSERVATION:
    "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  MINOR:
    "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300",
  MAJOR:
    "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
  CRITICAL:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300",
};

const AREA_ENTRIES = Object.values(USOAP_AUDIT_AREAS).sort(
  (a, b) => a.sortOrder - b.sortOrder
);

// =============================================================================
// Props
// =============================================================================

interface DraftFindingFormProps {
  reviewId: string;
  existingFinding?: OfflineDraftFinding;
  onSave?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function DraftFindingForm({
  reviewId,
  existingFinding,
  onSave,
}: DraftFindingFormProps) {
  const t = useTranslations("fieldwork.findings");
  const locale = useLocale();
  const saveDraftFinding = useOfflineFieldworkStore((s) => s.saveDraftFinding);

  const isEditing = !!existingFinding;

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------

  const [title, setTitle] = useState(existingFinding?.title ?? "");
  const [description, setDescription] = useState(
    existingFinding?.description ?? ""
  );
  const [severity, setSeverity] = useState<Severity>(
    existingFinding?.severity ?? "OBSERVATION"
  );
  const [areaCode, setAreaCode] = useState(existingFinding?.areaCode ?? "");
  const [evidenceIds, setEvidenceIds] = useState<string[]>(
    existingFinding?.evidenceIds ?? []
  );
  const [gpsLat, setGpsLat] = useState<number | null>(
    existingFinding?.gpsLatitude ?? null
  );
  const [gpsLng, setGpsLng] = useState<number | null>(
    existingFinding?.gpsLongitude ?? null
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: boolean; description?: boolean }>({});

  // ---------------------------------------------------------------------------
  // Auto-capture GPS on mount (new findings only)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isEditing) return;
    void getCurrentPosition().then((pos) => {
      if (pos) {
        setGpsLat(pos.latitude);
        setGpsLng(pos.longitude);
      }
    });
  }, [isEditing]);

  // ---------------------------------------------------------------------------
  // Validate
  // ---------------------------------------------------------------------------

  function validate(): boolean {
    const errs: { title?: boolean; description?: boolean } = {};
    if (!title.trim()) errs.title = true;
    if (!description.trim()) errs.description = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await saveDraftFinding({
        ...(existingFinding?.id ? { id: existingFinding.id } : {}),
        reviewId,
        title: title.trim(),
        description: description.trim(),
        severity,
        areaCode,
        questionId: null,
        evidenceIds,
        gpsLatitude: gpsLat,
        gpsLongitude: gpsLng,
      });
      toast.success(t("saved"));
      onSave?.();
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="finding-title">{t("titleLabel")}</Label>
        <Input
          id="finding-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((p) => ({ ...p, title: false }));
          }}
          placeholder={t("titlePlaceholder")}
          aria-invalid={errors.title || undefined}
          className="h-11"
        />
        {errors.title && (
          <p className="text-xs text-destructive">{t("titleRequired")}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="finding-desc">{t("descriptionLabel")}</Label>
        <Textarea
          id="finding-desc"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description)
              setErrors((p) => ({ ...p, description: false }));
          }}
          placeholder={t("descriptionPlaceholder")}
          rows={5}
          aria-invalid={errors.description || undefined}
          className="resize-none text-sm"
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {t("descriptionRequired")}
          </p>
        )}
      </div>

      {/* Severity */}
      <div className="space-y-2">
        <Label>{t("severityLabel")}</Label>
        <RadioGroup
          value={severity}
          onValueChange={(v) => setSeverity(v as Severity)}
          className="grid grid-cols-2 gap-2"
        >
          {SEVERITIES.map((s) => (
            <label
              key={s}
              className={cn(
                "flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 cursor-pointer transition-colors min-h-[44px]",
                severity === s
                  ? SEVERITY_COLORS[s]
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              <RadioGroupItem value={s} className="shrink-0" />
              <span className="text-sm font-medium">{t(`severity.${s}`)}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Area selector */}
      <div className="space-y-1.5">
        <Label>{t("areaLabel")}</Label>
        <Select value={areaCode} onValueChange={setAreaCode}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder={t("selectArea")} />
          </SelectTrigger>
          <SelectContent>
            {AREA_ENTRIES.map((area) => (
              <SelectItem key={area.code} value={area.code}>
                {area.code} — {locale === "fr" ? area.name.fr : area.name.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Evidence picker */}
      <div className="space-y-2">
        <Label>{t("linkedEvidence")}</Label>
        <EvidencePicker
          reviewId={reviewId}
          selectedIds={evidenceIds}
          onChange={setEvidenceIds}
        />
      </div>

      {/* GPS location */}
      {gpsLat !== null && gpsLng !== null && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>
            {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
          </span>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        className="w-full min-h-[48px]"
        disabled={saving}
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
        {saving ? t("saving") : isEditing ? t("edit") : t("save")}
      </Button>
    </form>
  );
}
