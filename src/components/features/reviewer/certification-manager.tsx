"use client";

/**
 * Certification Manager Component
 *
 * Manages reviewer certifications with expiry tracking
 * and validity status indicators.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Plus,
  Trash2,
} from "lucide-react";
import type { CertificationType } from "@/types/prisma-enums";
import {
  CERTIFICATION_TYPE_LABELS,
  getSelectOptions,
} from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

export interface CertificationItem {
  id?: string;
  certificationType: CertificationType;
  certificationName: string;
  certificationNameFr?: string | null;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate?: Date | null;
  certificateNumber?: string | null;
}

interface CertificationManagerProps {
  value: CertificationItem[];
  onChange: (certifications: CertificationItem[]) => void;
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getCertificationStatus(expiryDate: Date | null | undefined): {
  status: "valid" | "expired" | "expiringSoon";
  color: string;
  bgColor: string;
} {
  if (!expiryDate) {
    return { status: "valid", color: "text-green-600", bgColor: "bg-green-50" };
  }

  const now = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  if (new Date(expiryDate) < now) {
    return { status: "expired", color: "text-red-600", bgColor: "bg-red-50" };
  } else if (new Date(expiryDate) < threeMonthsFromNow) {
    return { status: "expiringSoon", color: "text-yellow-600", bgColor: "bg-yellow-50" };
  }
  return { status: "valid", color: "text-green-600", bgColor: "bg-green-50" };
}

function formatDateForInput(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CertificationManager({
  value,
  onChange,
  disabled = false,
  className,
}: CertificationManagerProps) {
  const t = useTranslations("reviewer");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "en" | "fr";

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CertificationItem>>({
    certificationType: "PEER_REVIEWER",
    certificationName: "",
    issuingAuthority: "",
    issueDate: new Date(),
    expiryDate: null,
    certificateNumber: "",
  });

  const certTypeOptions = getSelectOptions(CERTIFICATION_TYPE_LABELS, locale);

  function resetForm() {
    setFormData({
      certificationType: "PEER_REVIEWER",
      certificationName: "",
      issuingAuthority: "",
      issueDate: new Date(),
      expiryDate: null,
      certificateNumber: "",
    });
    setEditingIndex(null);
  }

  function handleOpenAddDialog() {
    resetForm();
    setIsAddDialogOpen(true);
  }

  function handleOpenEditDialog(index: number) {
    const cert = value[index];
    setFormData({
      ...cert,
      issueDate: new Date(cert.issueDate),
      expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
    });
    setEditingIndex(index);
    setIsAddDialogOpen(true);
  }

  function handleSave() {
    if (!formData.certificationName || !formData.issuingAuthority || !formData.issueDate) {
      return;
    }

    const newCert: CertificationItem = {
      certificationType: formData.certificationType || "PEER_REVIEWER",
      certificationName: formData.certificationName,
      certificationNameFr: formData.certificationNameFr || null,
      issuingAuthority: formData.issuingAuthority,
      issueDate: formData.issueDate,
      expiryDate: formData.expiryDate || null,
      certificateNumber: formData.certificateNumber || null,
    };

    if (editingIndex !== null) {
      // Update existing
      const newValue = [...value];
      newValue[editingIndex] = { ...value[editingIndex], ...newCert };
      onChange(newValue);
    } else {
      // Add new
      onChange([...value, newCert]);
    }

    setIsAddDialogOpen(false);
    resetForm();
  }

  function handleRemove(index: number) {
    if (disabled) return;
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  }

  const validCerts = value.filter(
    (c) => getCertificationStatus(c.expiryDate).status !== "expired"
  );

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              {t("certification.title")}
            </span>
            <Badge variant="secondary">
              {validCerts.length} {t("certification.valid")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {value.length > 0 ? (
            <div className="space-y-3">
              {value.map((cert, index) => {
                const { status, color, bgColor } = getCertificationStatus(cert.expiryDate);
                return (
                  <div
                    key={cert.id || index}
                    className={cn(
                      "p-4 rounded-lg border",
                      bgColor
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">
                            {locale === "fr" && cert.certificationNameFr
                              ? cert.certificationNameFr
                              : cert.certificationName}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {CERTIFICATION_TYPE_LABELS[cert.certificationType][locale]}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2">
                          {cert.issuingAuthority}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t("certification.issued")}: {new Date(cert.issueDate).toLocaleDateString(locale)}
                          </span>
                          {cert.expiryDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t("certification.expires")}: {new Date(cert.expiryDate).toLocaleDateString(locale)}
                            </span>
                          )}
                          {cert.certificateNumber && (
                            <span>#{cert.certificateNumber}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Indicator */}
                        <div className={cn("flex items-center gap-1", color)}>
                          {status === "valid" && <CheckCircle2 className="h-4 w-4" />}
                          {status === "expiringSoon" && <Clock className="h-4 w-4" />}
                          {status === "expired" && <AlertCircle className="h-4 w-4" />}
                          <span className="text-xs font-medium">
                            {t(`certification.status.${status}`)}
                          </span>
                        </div>

                        {/* Edit Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEditDialog(index)}
                          disabled={disabled}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        {/* Remove Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(index)}
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
            <p className="text-muted-foreground text-sm text-center py-6">
              {t("certification.noData")}
            </p>
          )}

          {/* Add Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-4"
                onClick={handleOpenAddDialog}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("certification.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingIndex !== null
                    ? t("certification.editTitle")
                    : t("certification.addTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("certification.addDescription")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Certification Type */}
                <div className="space-y-2">
                  <Label>{t("certification.type")} *</Label>
                  <Select
                    value={formData.certificationType}
                    onValueChange={(val) =>
                      setFormData({ ...formData, certificationType: val as CertificationType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {certTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Certification Name */}
                <div className="space-y-2">
                  <Label>{t("certification.name")} *</Label>
                  <Input
                    value={formData.certificationName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, certificationName: e.target.value })
                    }
                    placeholder={t("certification.namePlaceholder")}
                  />
                </div>

                {/* Certification Name (French) */}
                <div className="space-y-2">
                  <Label>{t("certification.nameFr")}</Label>
                  <Input
                    value={formData.certificationNameFr || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, certificationNameFr: e.target.value })
                    }
                    placeholder={t("certification.namePlaceholderFr")}
                  />
                </div>

                {/* Issuing Authority */}
                <div className="space-y-2">
                  <Label>{t("certification.issuingAuthority")} *</Label>
                  <Input
                    value={formData.issuingAuthority || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, issuingAuthority: e.target.value })
                    }
                    placeholder={t("certification.authorityPlaceholder")}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("certification.issuedDate")} *</Label>
                    <Input
                      type="date"
                      value={formatDateForInput(formData.issueDate)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          issueDate: e.target.value ? new Date(e.target.value) : new Date(),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("certification.expiryDate")}</Label>
                    <Input
                      type="date"
                      value={formatDateForInput(formData.expiryDate)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expiryDate: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Certificate Number */}
                <div className="space-y-2">
                  <Label>{t("certification.number")}</Label>
                  <Input
                    value={formData.certificateNumber || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, certificateNumber: e.target.value })
                    }
                    placeholder={t("certification.numberPlaceholder")}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}
                >
                  {tCommon("actions.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    !formData.certificationName ||
                    !formData.issuingAuthority ||
                    !formData.issueDate
                  }
                >
                  {editingIndex !== null ? tCommon("actions.save") : t("certification.add")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Expiring Soon Warning */}
      {value.some((c) => getCertificationStatus(c.expiryDate).status === "expiringSoon") && (
        <div className="flex items-center gap-2 text-yellow-600 text-sm">
          <Clock className="h-4 w-4" />
          <span>{t("certification.expiringSoonWarning")}</span>
        </div>
      )}
    </div>
  );
}

export default CertificationManager;
