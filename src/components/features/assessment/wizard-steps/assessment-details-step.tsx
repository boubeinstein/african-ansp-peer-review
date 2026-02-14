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
import { trpc } from "@/lib/trpc/client";
import type { QuestionnaireType, AssessmentType, ANSReviewArea } from "@/types/prisma-enums";

// 7 ANS review areas (replaces the old 9 USOAP audit areas)
const ANS_REVIEW_AREAS: ANSReviewArea[] = [
  "ATS",
  "FPD",
  "AIS",
  "MAP",
  "MET",
  "CNS",
  "SAR",
];

const AREA_BADGE_BG: Record<string, string> = {
  ATS: "bg-blue-600",
  FPD: "bg-indigo-600",
  AIS: "bg-teal-600",
  MAP: "bg-emerald-600",
  MET: "bg-sky-600",
  CNS: "bg-violet-600",
  SAR: "bg-orange-600",
};

interface AssessmentDetailsStepProps {
  questionnaireType: QuestionnaireType | null;
  assessmentType: AssessmentType | null;
  title: string;
  description: string;
  dueDate: Date | null;
  selectedAreas: ANSReviewArea[];
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onDueDateChange: (date: Date | null) => void;
  onSelectedAreasChange: (areas: ANSReviewArea[]) => void;
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
  const tAreas = useTranslations("reviewAreas");

  const isANS = questionnaireType === "ANS_USOAP_CMA";
  const areas = isANS ? ANS_REVIEW_AREAS : [];

  // Fetch PQ counts per area for ANS assessments
  const { data: ansStats } = trpc.questionnaire.getANSStats.useQuery(
    undefined,
    { enabled: isANS, staleTime: 5 * 60 * 1000 }
  );
  const countsByArea = ansStats?.countsByArea ?? {};

  // Auto-generate title on mount if empty
  useEffect(() => {
    if (!title && questionnaireType && assessmentType) {
      onTitleChange(generateDefaultTitle(questionnaireType, assessmentType, t));
    }
  }, [title, questionnaireType, assessmentType, onTitleChange, t]);

  // Handle select all / deselect all (only for ANS assessments)
  const handleSelectAll = () => {
    if (!isANS) return;
    if (selectedAreas.length === ANS_REVIEW_AREAS.length) {
      onSelectedAreasChange([]);
    } else {
      onSelectedAreasChange([...ANS_REVIEW_AREAS]);
    }
  };

  // Handle individual area toggle (only for ANS assessments)
  const handleAreaToggle = (area: ANSReviewArea) => {
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

  // Calculate total PQs for selected areas
  const totalSelectedPQs = selectedAreas.reduce(
    (sum, area) => sum + (countsByArea[area] ?? 0),
    0
  );

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

        {/* Scope selection — ANS review areas */}
        {isANS && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {t("details.scope.ansTitle")}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t("details.scope.ansDescription")}
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
              <div className="space-y-1">
                {areas.map((area, index) => {
                  const isSelected = selectedAreas.includes(area);
                  const name = tAreas(`${area}.name`);
                  const count = countsByArea[area] ?? 0;
                  const badgeBg = AREA_BADGE_BG[area] ?? "bg-gray-600";

                  return (
                    <motion.div
                      key={area}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <label
                        className={cn(
                          "flex items-center gap-3 rounded-md p-2.5 cursor-pointer transition-colors",
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/30"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleAreaToggle(area)}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <span
                          className={cn(
                            "font-mono text-xs font-bold px-1.5 py-0.5 rounded text-white shrink-0",
                            badgeBg
                          )}
                        >
                          {area}
                        </span>
                        <span className="text-sm flex-1 truncate">{name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {count} PQs
                        </span>
                      </label>
                    </motion.div>
                  );
                })}
              </div>

              {/* Selection summary */}
              <div className="mt-4 flex items-center gap-2 text-sm border-t pt-3">
                <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  {selectedAreas.length === 0
                    ? t("details.scope.noneSelected")
                    : selectedAreas.length === areas.length
                    ? t("details.scope.allSelected")
                    : t("details.scope.someSelected", {
                        count: selectedAreas.length,
                        total: areas.length,
                      })}
                  {selectedAreas.length > 0 &&
                    ` · ${totalSelectedPQs} Protocol Questions`}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SMS scope info (no area selection for SMS) */}
        {!isANS && questionnaireType === "SMS_CANSO_SOE" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("details.scope.smsTitle")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("details.scope.smsDescription")}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
