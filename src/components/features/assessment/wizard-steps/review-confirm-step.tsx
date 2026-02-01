"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Shield,
  Calendar,
  Clock,
  CheckCircle,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { QuestionnaireType, AssessmentType } from "@/types/prisma-enums";

interface ReviewConfirmStepProps {
  questionnaireType: QuestionnaireType | null;
  assessmentType: AssessmentType | null;
  title: string;
  description: string;
  dueDate: Date | null;
  selectedAreas: string[];
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  isSubmitting?: boolean;
}

// Estimated questions per area
const QUESTIONS_PER_ANS_AREA: Record<string, number> = {
  LEG: 45,
  ORG: 52,
  PEL: 89,
  OPS: 156,
  AIR: 134,
  AIG: 67,
  ANS: 145,
  AGA: 98,
  SSP: 65,
};

const QUESTIONS_PER_SMS_COMPONENT: Record<string, number> = {
  SAFETY_POLICY_OBJECTIVES: 25,
  SAFETY_RISK_MANAGEMENT: 35,
  SAFETY_ASSURANCE: 30,
  SAFETY_PROMOTION: 15,
};

export function ReviewConfirmStep({
  questionnaireType,
  assessmentType,
  title,
  description,
  dueDate,
  selectedAreas,
  confirmed,
  onConfirmedChange,
  isSubmitting,
}: ReviewConfirmStepProps) {
  const t = useTranslations("wizard");
  const tAudit = useTranslations("auditAreas");
  const tSms = useTranslations("smsComponents");

  const isANS = questionnaireType === "ANS_USOAP_CMA";

  // Calculate estimated questions
  const questionsMap = isANS
    ? QUESTIONS_PER_ANS_AREA
    : QUESTIONS_PER_SMS_COMPONENT;
  const estimatedQuestions = selectedAreas.reduce(
    (total, area) => total + (questionsMap[area] || 0),
    0
  );

  // Estimate time (5 minutes per question average)
  const estimatedMinutes = estimatedQuestions * 5;
  const estimatedHours = Math.ceil(estimatedMinutes / 60);

  // Tips for success
  const tips = [
    t("review.tips.gather"),
    t("review.tips.collaborate"),
    t("review.tips.evidence"),
    t("review.tips.honest"),
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("review.title")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("review.description")}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Summary card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isANS ? (
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
              ) : (
                <Shield className="h-5 w-5 text-green-600" />
              )}
              {t("review.summaryTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Assessment title */}
            <div>
              <div className="text-sm text-muted-foreground">
                {t("review.assessmentTitle")}
              </div>
              <div className="font-medium">{title}</div>
            </div>

            {/* Type badges */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn(
                  isANS
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                    : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                )}
              >
                {isANS
                  ? t("questionnaireType.ans.title")
                  : t("questionnaireType.sms.title")}
              </Badge>
              {assessmentType && (
                <Badge variant="secondary">
                  {t(`assessmentType.types.${assessmentType.toLowerCase()}.title`)}
                </Badge>
              )}
            </div>

            {/* Description */}
            {description && (
              <div>
                <div className="text-sm text-muted-foreground">
                  {t("review.descriptionLabel")}
                </div>
                <div className="text-sm">{description}</div>
              </div>
            )}

            <Separator />

            {/* Scope */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">
                {isANS ? t("review.auditAreas") : t("review.smsComponents")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedAreas.map((area) => {
                  const name = isANS ? tAudit(`${area}.name`) : tSms(`${area}.name`);
                  const code = isANS ? area : tSms(`${area}.code`);
                  return (
                    <Badge key={area} variant="outline" className="text-xs">
                      {code}: {name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Questions */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{estimatedQuestions}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("review.estimatedQuestions")}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {estimatedHours}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {t("review.hours")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("review.estimatedTime")}
                  </div>
                </div>
              </div>

              {/* Due date */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    {dueDate ? format(dueDate, "MMM d, yyyy") : t("review.noDueDate")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("review.targetDate")}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips for success */}
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              {t("review.tipsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Confirmation checkbox */}
        <Card
          className={cn(
            "transition-colors",
            confirmed
              ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
              : ""
          )}
        >
          <CardContent className="pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => onConfirmedChange(checked === true)}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor="confirm"
                  className="text-sm font-medium cursor-pointer"
                >
                  {t("review.confirmLabel")}
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("review.confirmDescription")}
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Warning if not confirmed */}
        {!confirmed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{t("review.confirmRequired")}</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
