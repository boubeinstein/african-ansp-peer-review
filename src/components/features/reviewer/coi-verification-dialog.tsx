"use client";

/**
 * COI Verification Dialog
 *
 * Admin dialog for verifying or waiving conflicts of interest.
 * Includes audit trail and justification requirements.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Loader2,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { COIBadge, type COISeverity } from "./coi-badge";
import { COI_TYPE_LABELS } from "@/lib/reviewer/labels";
import type { COIType } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export type VerificationDecision = "CONFIRM" | "WAIVE" | "REJECT";

interface COIVerificationInput {
  decision: VerificationDecision;
  justification: string;
  waiverExpiryDate?: Date | null;
}

interface COIEntry {
  id: string;
  coiType: COIType;
  reason?: string | null;
  organizationName: string;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
  verificationNotes?: string | null;
}

interface COIVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coi: COIEntry;
  reviewerName: string;
  onVerify: (input: COIVerificationInput) => Promise<void>;
  isLoading?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function getSeverityFromType(coiType: COIType): COISeverity {
  // HOME_ORGANIZATION and FAMILY_RELATIONSHIP are hard blocks
  if (coiType === "HOME_ORGANIZATION" || coiType === "FAMILY_RELATIONSHIP") {
    return "HARD";
  }
  // Everything else is soft warning
  return "SOFT";
}

function formatDate(date: Date | null | undefined, locale: string): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(locale);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function COIVerificationDialog({
  open,
  onOpenChange,
  coi,
  reviewerName,
  onVerify,
  isLoading = false,
}: COIVerificationDialogProps) {
  const t = useTranslations("reviewer.coi");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "en" | "fr";

  const [decision, setDecision] = useState<VerificationDecision>("CONFIRM");
  const [justification, setJustification] = useState("");
  const [waiverExpiryDate, setWaiverExpiryDate] = useState<string>("");

  const severity = getSeverityFromType(coi.coiType);
  const requiresJustification = decision === "WAIVE" || decision === "REJECT";

  async function handleSubmit() {
    if (requiresJustification && !justification.trim()) {
      return;
    }

    await onVerify({
      decision,
      justification: justification.trim(),
      waiverExpiryDate: waiverExpiryDate ? new Date(waiverExpiryDate) : null,
    });

    // Reset form
    setDecision("CONFIRM");
    setJustification("");
    setWaiverExpiryDate("");
    onOpenChange(false);
  }

  function handleCancel() {
    setDecision("CONFIRM");
    setJustification("");
    setWaiverExpiryDate("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("verification.title")}
          </DialogTitle>
          <DialogDescription>
            {t("verification.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* COI Summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{reviewerName}</span>
              </div>
              <COIBadge
                severity={severity}
                status={coi.isActive ? "ACTIVE" : "EXPIRED"}
                size="sm"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t("organization")}</p>
                <p className="font-medium">{coi.organizationName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("conflictType")}</p>
                <p className="font-medium">{COI_TYPE_LABELS[coi.coiType][locale]}</p>
              </div>
              {coi.reason && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">{t("reason")}</p>
                  <p className="text-sm">{coi.reason}</p>
                </div>
              )}
              {coi.startDate && (
                <div>
                  <p className="text-muted-foreground">{t("startDate")}</p>
                  <p>{formatDate(coi.startDate, locale)}</p>
                </div>
              )}
              {coi.endDate && (
                <div>
                  <p className="text-muted-foreground">{t("endDate")}</p>
                  <p>{formatDate(coi.endDate, locale)}</p>
                </div>
              )}
            </div>

            {/* Previous Verification */}
            {coi.isVerified && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>
                    {t("verification.previouslyVerified", {
                      date: formatDate(coi.verifiedAt, locale),
                      by: coi.verifiedBy || "Admin",
                    })}
                  </span>
                </div>
                {coi.verificationNotes && (
                  <p className="text-xs text-muted-foreground ml-6">
                    {coi.verificationNotes}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Decision Selection */}
          <div className="space-y-3">
            <Label>{t("verification.decision")}</Label>
            <RadioGroup
              value={decision}
              onValueChange={(val) => setDecision(val as VerificationDecision)}
              className="space-y-2"
            >
              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
                  decision === "CONFIRM" && "border-primary bg-primary/5"
                )}
              >
                <RadioGroupItem value="CONFIRM" id="confirm" />
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <Label htmlFor="confirm" className="cursor-pointer">
                    {t("verification.confirm")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("verification.confirmDescription")}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
                  decision === "WAIVE" && "border-yellow-400 bg-yellow-50"
                )}
              >
                <RadioGroupItem value="WAIVE" id="waive" />
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <div className="flex-1">
                  <Label htmlFor="waive" className="cursor-pointer">
                    {t("verification.waive")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("verification.waiveDescription")}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
                  decision === "REJECT" && "border-red-400 bg-red-50"
                )}
              >
                <RadioGroupItem value="REJECT" id="reject" />
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <Label htmlFor="reject" className="cursor-pointer">
                    {t("verification.reject")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("verification.rejectDescription")}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Waiver Expiry Date */}
          {decision === "WAIVE" && (
            <div className="space-y-2">
              <Label htmlFor="waiverExpiry">{t("verification.waiverExpiry")}</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="waiverExpiry"
                  type="date"
                  value={waiverExpiryDate}
                  onChange={(e) => setWaiverExpiryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("verification.waiverExpiryDescription")}
              </p>
            </div>
          )}

          {/* Justification */}
          {requiresJustification && (
            <div className="space-y-2">
              <Label htmlFor="justification">
                {t("verification.justification")} *
              </Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={t("verification.justificationPlaceholder")}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                {t("verification.justificationRequired")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || (requiresJustification && !justification.trim())}
            className={cn(
              decision === "WAIVE" && "bg-yellow-600 hover:bg-yellow-700",
              decision === "REJECT" && "bg-red-600 hover:bg-red-700"
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {decision === "CONFIRM" && t("verification.confirmAction")}
            {decision === "WAIVE" && t("verification.waiveAction")}
            {decision === "REJECT" && t("verification.rejectAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default COIVerificationDialog;
