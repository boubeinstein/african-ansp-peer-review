"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Calendar, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { QuestionnaireType, AssessmentType, USOAPAuditArea } from "@prisma/client";

// Audit areas for ANS USOAP CMA - properly typed
const ANS_AUDIT_AREAS: USOAPAuditArea[] = [
  "LEG",
  "ORG",
  "PEL",
  "OPS",
  "AIR",
  "AIG",
  "ANS",
  "AGA",
  "SSP",
];

interface AssessmentDetailsStepProps {
  questionnaireType: QuestionnaireType | null;
  assessmentType: AssessmentType | null;
  title: string;
  description: string;
  dueDate: Date | null;
  selectedAreas: USOAPAuditArea[];
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onDueDateChange: (date: Date | null) => void;
  onSelectedAreasChange: (areas: USOAPAuditArea[]) => void;
}

function generateDefaultTitle(
  questionnaireType: QuestionnaireType | null,
  assessmentType: AssessmentType | null,
  t: (key: string) => string
): string {
  if (!questionnaireType || !assessmentType) return "";

  const qType = questionnaireType === "ANS_USOAP_CMA" ? "ANS" : "SMS";
  const aType = t(`assessmentType.types.${assessmentType.toLowerCase()}.short`);
  const date = format(new Date(), "yyyy-MM");

  return `${qType} ${aType} - ${date}`;
}

export function AssessmentDetailsStep({
  questionnaireType,
  assessmentType,
  title,
  description,
  dueDate,
  selectedAreas,
  onTitleChange,
  onDescriptionChange,
  onDueDateChange,
  onSelectedAreasChange,
}: AssessmentDetailsStepProps) {
  const t = useTranslations("wizard");
  const tAudit = useTranslations("auditAreas");
  const tSms = useTranslations("smsComponents");

  const isANS = questionnaireType === "ANS_USOAP_CMA";
  // For ANS assessments, use typed audit areas; for SMS, we don't use selectedAuditAreas
  const areas = isANS ? ANS_AUDIT_AREAS : [];

  // Auto-generate title on mount if empty
  useEffect(() => {
    if (!title && questionnaireType && assessmentType) {
      onTitleChange(generateDefaultTitle(questionnaireType, assessmentType, t));
    }
  }, [title, questionnaireType, assessmentType, onTitleChange, t]);

  // Handle select all / deselect all (only for ANS assessments)
  const handleSelectAll = () => {
    if (!isANS) return;
    if (selectedAreas.length === ANS_AUDIT_AREAS.length) {
      onSelectedAreasChange([]);
    } else {
      onSelectedAreasChange([...ANS_AUDIT_AREAS]);
    }
  };

  // Handle individual area toggle (only for ANS assessments)
  const handleAreaToggle = (area: USOAPAuditArea) => {
    if (!isANS) return;
    if (selectedAreas.includes(area)) {
      onSelectedAreasChange(selectedAreas.filter((a) => a !== area));
    } else {
      onSelectedAreasChange([...selectedAreas, area]);
    }
  };

  // Regenerate title
  const handleRegenerateTitle = () => {
    onTitleChange(generateDefaultTitle(questionnaireType, assessmentType, t));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("details.title")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("details.description")}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Title field */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            {t("details.titleLabel")} <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t("details.titlePlaceholder")}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRegenerateTitle}
              title={t("details.regenerateTitle")}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("details.titleHint")}
          </p>
        </div>

        {/* Description field */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            {t("details.descriptionLabel")}
          </Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("details.descriptionPlaceholder")}
            rows={3}
            className={cn(
              "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-input/30"
            )}
          />
        </div>

        {/* Due date field */}
        <div className="space-y-2">
          <Label htmlFor="dueDate" className="text-sm font-medium">
            {t("details.dueDateLabel")}
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dueDate"
              type="date"
              value={dueDate ? format(dueDate, "yyyy-MM-dd") : ""}
              onChange={(e) =>
                onDueDateChange(e.target.value ? new Date(e.target.value) : null)
              }
              min={format(new Date(), "yyyy-MM-dd")}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("details.dueDateHint")}
          </p>
        </div>

        {/* Scope selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {isANS
                    ? t("details.scope.ansTitle")
                    : t("details.scope.smsTitle")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {isANS
                    ? t("details.scope.ansDescription")
                    : t("details.scope.smsDescription")}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedAreas.length === areas.length
                  ? t("details.scope.deselectAll")
                  : t("details.scope.selectAll")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "grid gap-3",
                isANS ? "sm:grid-cols-3" : "sm:grid-cols-2"
              )}
            >
              {areas.map((area, index) => {
                const isSelected = selectedAreas.includes(area);
                const name = isANS
                  ? tAudit(`${area}.name`)
                  : tSms(`${area}.name`);
                const code = isANS ? area : tSms(`${area}.code`);

                return (
                  <motion.div
                    key={area}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <label
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleAreaToggle(area)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {code}
                          </span>
                        </div>
                        <span className="text-sm font-medium line-clamp-1">
                          {name}
                        </span>
                      </div>
                    </label>
                  </motion.div>
                );
              })}
            </div>

            {/* Selection summary */}
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>
                {selectedAreas.length === 0
                  ? t("details.scope.noneSelected")
                  : selectedAreas.length === areas.length
                  ? t("details.scope.allSelected")
                  : t("details.scope.someSelected", {
                      count: selectedAreas.length,
                      total: areas.length,
                    })}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
