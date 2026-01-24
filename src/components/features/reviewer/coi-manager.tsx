"use client";

/**
 * COI Manager Component
 *
 * Manages all conflicts of interest for a reviewer profile.
 * Includes adding, updating, and removing COIs, plus admin verification.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Home,
  Loader2,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { COIBadge, type COISeverity, type COIStatus } from "./coi-badge";
import {
  COIVerificationDialog,
  type VerificationDecision,
} from "./coi-verification-dialog";
import { COI_TYPE_LABELS, getSelectOptions } from "@/lib/reviewer/labels";
import type { COIType } from "@prisma/client";
import type {
  CreateCOIInput,
  UpdateCOIInput,
} from "@/lib/validations/reviewer";

// =============================================================================
// TYPES
// =============================================================================

export interface ConflictOfInterest {
  id: string;
  reviewerProfileId: string;
  organizationId: string;
  coiType: COIType;
  reason?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: Date | null;
  verifiedById?: string | null;
  verifiedByName?: string | null;
  verificationNotes?: string | null;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode?: string | null;
  };
}

interface OrganizationOption {
  id: string;
  nameEn: string;
  nameFr: string;
  organizationCode?: string | null;
}

interface COIManagerProps {
  reviewerProfileId: string;
  reviewerName: string;
  homeOrganizationId: string;
  conflicts: ConflictOfInterest[];
  organizations?: OrganizationOption[];
  onAdd: (data: Omit<CreateCOIInput, "reviewerProfileId">) => Promise<void>;
  onUpdate: (data: UpdateCOIInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onVerify?: (id: string, data: { decision: VerificationDecision; justification: string; waiverExpiryDate?: Date | null }) => Promise<void>;
  isAdmin?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
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

function getStatus(coi: ConflictOfInterest): COIStatus {
  if (!coi.isActive) {
    return "EXPIRED";
  }
  if (coi.verificationNotes?.toLowerCase().includes("waive")) {
    return "WAIVED";
  }
  return "ACTIVE";
}

function formatDate(date: Date | null | undefined, locale: string): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(locale);
}

// =============================================================================
// ADD COI DIALOG
// =============================================================================

interface AddCOIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: OrganizationOption[];
  excludeOrgIds: string[];
  homeOrganizationId: string;
  locale: "en" | "fr";
  onAdd: (data: Omit<CreateCOIInput, "reviewerProfileId">) => Promise<void>;
  isLoading?: boolean;
}

function AddCOIDialog({
  open,
  onOpenChange,
  organizations,
  excludeOrgIds,
  homeOrganizationId,
  locale,
  onAdd,
  isLoading,
}: AddCOIDialogProps) {
  const t = useTranslations("reviewer.coi");
  const tCommon = useTranslations("common");

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [coiType, setCoiType] = useState<COIType>("OTHER");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const coiTypeOptions = getSelectOptions(COI_TYPE_LABELS, locale);
  const availableOrgs = organizations.filter(
    (org) => !excludeOrgIds.includes(org.id) && org.id !== homeOrganizationId
  );

  async function handleSubmit() {
    if (!selectedOrg) return;

    await onAdd({
      organizationId: selectedOrg,
      coiType,
      reason: reason || null,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : null,
    });

    // Reset form
    setSelectedOrg("");
    setCoiType("OTHER");
    setReason("");
    setStartDate("");
    setEndDate("");
    onOpenChange(false);
  }

  function handleCancel() {
    setSelectedOrg("");
    setCoiType("OTHER");
    setReason("");
    setStartDate("");
    setEndDate("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addTitle")}</DialogTitle>
          <DialogDescription>{t("addDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Organization Select */}
          <div className="space-y-2">
            <Label>{t("organization")} *</Label>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectOrganization")} />
              </SelectTrigger>
              <SelectContent>
                {availableOrgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {locale === "fr" ? org.nameFr : org.nameEn}
                    {org.organizationCode && ` (${org.organizationCode})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* COI Type Select */}
          <div className="space-y-2">
            <Label>{t("conflictType")} *</Label>
            <Select value={coiType} onValueChange={(val) => setCoiType(val as COIType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {coiTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t("reason")}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              className="min-h-[80px]"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {tCommon("actions.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedOrg || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function COIManager({
  reviewerProfileId: _reviewerProfileId,
  reviewerName,
  homeOrganizationId,
  conflicts,
  organizations = [],
  onAdd,
  onUpdate: _onUpdate,
  onRemove,
  onVerify,
  isAdmin = false,
  disabled = false,
  isLoading = false,
  className,
}: COIManagerProps) {
  const t = useTranslations("reviewer.coi");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "en" | "fr";

  // Silence unused variable warnings - reserved for future use
  void _reviewerProfileId;
  void _onUpdate;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [verifyingCOI, setVerifyingCOI] = useState<ConflictOfInterest | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Separate home org COI from others
  const homeOrgCOI = conflicts.find((c) => c.organizationId === homeOrganizationId);
  const otherCOIs = conflicts.filter((c) => c.organizationId !== homeOrganizationId);

  const activeCount = conflicts.filter((c) => c.isActive).length;
  const existingOrgIds = conflicts.map((c) => c.organizationId);

  async function handleRemove() {
    if (!removingId) return;
    await onRemove(removingId);
    setRemovingId(null);
  }

  async function handleVerify(input: { decision: VerificationDecision; justification: string; waiverExpiryDate?: Date | null }) {
    if (!verifyingCOI || !onVerify) return;
    await onVerify(verifyingCOI.id, input);
    setVerifyingCOI(null);
  }

  function getOrgName(coi: ConflictOfInterest): string {
    return locale === "fr" ? coi.organization.nameFr : coi.organization.nameEn;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t("title")}
            </span>
            <Badge variant={activeCount > 0 ? "destructive" : "secondary"}>
              {activeCount} {t("active")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Home Organization COI (Always present, read-only) */}
          {homeOrgCOI && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Home className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{getOrgName(homeOrgCOI)}</p>
                      <COIBadge
                        severity="HARD"
                        status="ACTIVE"
                        size="sm"
                        showLabel={false}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("homeOrganization")}
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                      {t("homeOrganizationNote")}
                    </p>
                  </div>
                </div>
                <Badge className="bg-red-600">{t("severity.HARD")}</Badge>
              </div>
            </div>
          )}

          {/* Other COIs */}
          {otherCOIs.length > 0 ? (
            <div className="space-y-3">
              {otherCOIs.map((coi) => {
                const severity = getSeverityFromType(coi.coiType);
                const status = getStatus(coi);

                return (
                  <div
                    key={coi.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      severity === "HARD" ? "bg-red-50/50 border-red-200" : "bg-yellow-50/50 border-yellow-200"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Building2 className={cn(
                          "h-5 w-5 mt-0.5",
                          severity === "HARD" ? "text-red-600" : "text-yellow-600"
                        )} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{getOrgName(coi)}</p>
                            {coi.organization.organizationCode && (
                              <Badge variant="outline" className="text-xs">
                                {coi.organization.organizationCode}
                              </Badge>
                            )}
                            <COIBadge
                              severity={severity}
                              status={status}
                              size="sm"
                            />
                          </div>

                          <p className="text-sm text-muted-foreground mt-1">
                            {COI_TYPE_LABELS[coi.coiType][locale]}
                          </p>

                          {coi.reason && (
                            <p className="text-sm mt-2">{coi.reason}</p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {coi.startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {t("from")}: {formatDate(coi.startDate, locale)}
                              </span>
                            )}
                            {coi.endDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t("until")}: {formatDate(coi.endDate, locale)}
                              </span>
                            )}
                          </div>

                          {/* Verification Status */}
                          {coi.isVerified && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
                              <Shield className="h-3 w-3" />
                              <span>
                                {t("verification.verifiedOn", {
                                  date: formatDate(coi.verifiedAt, locale),
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {isAdmin && onVerify && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setVerifyingCOI(coi)}
                            disabled={disabled}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setRemovingId(coi.id)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4 text-sm">
              {t("noOtherConflicts")}
            </p>
          )}

          {/* Add COI Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAddDialogOpen(true)}
            disabled={disabled || organizations.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        </CardContent>
      </Card>

      {/* Add COI Dialog */}
      <AddCOIDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        organizations={organizations}
        excludeOrgIds={existingOrgIds}
        homeOrganizationId={homeOrganizationId}
        locale={locale}
        onAdd={onAdd}
        isLoading={isLoading}
      />

      {/* Verification Dialog */}
      {verifyingCOI && onVerify && (
        <COIVerificationDialog
          open={!!verifyingCOI}
          onOpenChange={(open) => !open && setVerifyingCOI(null)}
          coi={{
            id: verifyingCOI.id,
            coiType: verifyingCOI.coiType,
            reason: verifyingCOI.reason,
            organizationName: getOrgName(verifyingCOI),
            startDate: verifyingCOI.startDate,
            endDate: verifyingCOI.endDate,
            isActive: verifyingCOI.isActive,
            isVerified: verifyingCOI.isVerified,
            verifiedAt: verifyingCOI.verifiedAt,
            verifiedBy: verifyingCOI.verifiedByName,
            verificationNotes: verifyingCOI.verificationNotes,
          }}
          reviewerName={reviewerName}
          onVerify={handleVerify}
          isLoading={isLoading}
        />
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removingId} onOpenChange={(open) => !open && setRemovingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default COIManager;
