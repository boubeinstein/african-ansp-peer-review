"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Award, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MaturityLevelBadge, getMaturityLevelName } from "./maturity-level-badge";
import { getScoreColor, getScoreProgressColor } from "./ei-score-gauge";
import {
  AuditAreaBreakdown,
  CriticalElementBreakdown,
  SMSComponentBreakdown,
  StudyAreaBreakdown,
} from "./score-breakdown";
import type { MaturityLevel, QuestionnaireType } from "@/types/prisma-enums";

interface AssessmentScoreSummaryProps {
  assessment: {
    id: string;
    status: string;
    overallScore: number | null;
    eiScore: number | null;
    maturityLevel: MaturityLevel | null;
    categoryScores: Record<string, number> | null;
    questionnaire: {
      type: QuestionnaireType;
    };
    submittedAt: Date | null;
    completedAt: Date | null;
  };
}

export function AssessmentScoreSummary({ assessment }: AssessmentScoreSummaryProps) {
  const isANS = assessment.questionnaire.type === "ANS_USOAP_CMA";
  const hasScore = assessment.overallScore !== null || assessment.eiScore !== null || assessment.maturityLevel !== null;

  // Don't show scores for draft assessments
  if (assessment.status === "DRAFT" || !hasScore) {
    return null;
  }

  // Parse category scores if they're a string
  const categoryScores = typeof assessment.categoryScores === "string"
    ? JSON.parse(assessment.categoryScores)
    : assessment.categoryScores;

  if (isANS) {
    return <ANSScoreSummary assessment={assessment} categoryScores={categoryScores} />;
  }

  return <SMSScoreSummary assessment={assessment} categoryScores={categoryScores} />;
}

interface ANSScoreSummaryProps {
  assessment: {
    eiScore: number | null;
    overallScore: number | null;
    submittedAt: Date | null;
  };
  categoryScores: Record<string, number> | null;
}

function ANSScoreSummary({ assessment, categoryScores }: ANSScoreSummaryProps) {
  const t = useTranslations("assessment.score");
  const score = assessment.eiScore ?? assessment.overallScore;

  // Extract audit area and critical element scores from categoryScores
  const auditAreaScores: Record<string, number> = {};
  const criticalElementScores: Record<string, number> = {};

  if (categoryScores) {
    Object.entries(categoryScores).forEach(([key, value]) => {
      // Audit areas are typically 3-letter codes like AGA, ANS, OPS
      if (key.length === 3 && key === key.toUpperCase()) {
        auditAreaScores[key] = value;
      }
      // Critical elements are typically CE1, CE2, etc.
      if (key.startsWith("CE") || key.match(/^CE\d+$/)) {
        criticalElementScores[key] = value;
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Overall EI Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle>{t("eiScore")}</CardTitle>
          </div>
          <CardDescription>{t("eiDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className={cn("text-5xl font-bold", getScoreColor(score))}>
              {score !== null ? `${score.toFixed(1)}%` : "-"}
            </div>
            <div className="flex-1 max-w-xs">
              <Progress
                value={score ?? 0}
                className={cn("h-4", getScoreProgressColor(score))}
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  (score ?? 0) >= 80
                    ? "default"
                    : (score ?? 0) >= 60
                    ? "secondary"
                    : "destructive"
                }
                className="text-sm"
              >
                {getEILabel(score)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Audit Area */}
      {Object.keys(auditAreaScores).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>{t("byAuditArea")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <AuditAreaBreakdown scores={auditAreaScores} />
          </CardContent>
        </Card>
      )}

      {/* Breakdown by Critical Element */}
      {Object.keys(criticalElementScores).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>{t("byCriticalElement")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CriticalElementBreakdown scores={criticalElementScores} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SMSScoreSummaryProps {
  assessment: {
    maturityLevel: MaturityLevel | null;
    overallScore: number | null;
    submittedAt: Date | null;
  };
  categoryScores: Record<string, number> | null;
}

function SMSScoreSummary({ assessment, categoryScores }: SMSScoreSummaryProps) {
  const t = useTranslations("assessment.score");
  const locale = useLocale();

  // Extract component and study area scores from categoryScores
  const componentScores: Record<string, number> = {};
  const studyAreaScores: Record<string, number> = {};

  if (categoryScores) {
    Object.entries(categoryScores).forEach(([key, value]) => {
      // SMS Components are typically like COMPONENT_1, COMPONENT_2, etc.
      if (key.includes("COMPONENT") || key.match(/^[1-4]$/)) {
        componentScores[key] = value;
      }
      // Study areas have more descriptive names
      else if (key.includes("_") || key.length > 5) {
        studyAreaScores[key] = value;
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Overall Maturity Level */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle>{t("maturityLevel")}</CardTitle>
          </div>
          <CardDescription>{t("maturityDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <MaturityLevelBadge level={assessment.maturityLevel} size="xl" />
            <div className="flex-1">
              <div className="text-3xl font-bold mb-1">
                {assessment.overallScore !== null
                  ? `${assessment.overallScore.toFixed(1)}%`
                  : "-"}
              </div>
              <div className="text-lg text-muted-foreground">
                {getMaturityLevelName(assessment.maturityLevel, locale)}
              </div>
            </div>
            <MaturityPyramid currentLevel={assessment.maturityLevel} />
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Component */}
      {Object.keys(componentScores).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>{t("byComponent")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <SMSComponentBreakdown scores={componentScores} />
          </CardContent>
        </Card>
      )}

      {/* Breakdown by Study Area */}
      {Object.keys(studyAreaScores).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>{t("byStudyArea")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <StudyAreaBreakdown scores={studyAreaScores} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getEILabel(score: number | null): string {
  if (score === null) return "No Data";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Improvement";
  return "Critical";
}

interface MaturityPyramidProps {
  currentLevel: MaturityLevel | null;
}

function MaturityPyramid({ currentLevel }: MaturityPyramidProps) {
  const levels = ["E", "D", "C", "B", "A"];
  const currentLetter = currentLevel?.replace("LEVEL_", "") || null;

  return (
    <div className="flex flex-col items-center gap-1">
      {levels.map((level, index) => {
        const isActive = currentLetter === level;
        const isPassed = currentLetter && levels.indexOf(currentLetter) <= levels.indexOf(level);
        const width = 40 + index * 16;

        return (
          <div
            key={level}
            style={{ width: `${width}px` }}
            className={cn(
              "h-5 flex items-center justify-center text-xs font-bold rounded-sm transition-colors",
              isActive
                ? getLevelActiveColor(level)
                : isPassed
                ? getLevelPassedColor(level)
                : "bg-gray-100 text-gray-400"
            )}
          >
            {level}
          </div>
        );
      })}
    </div>
  );
}

function getLevelActiveColor(level: string): string {
  switch (level) {
    case "E":
      return "bg-green-500 text-white";
    case "D":
      return "bg-blue-500 text-white";
    case "C":
      return "bg-yellow-500 text-white";
    case "B":
      return "bg-orange-500 text-white";
    case "A":
      return "bg-red-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

function getLevelPassedColor(level: string): string {
  switch (level) {
    case "E":
      return "bg-green-200 text-green-800";
    case "D":
      return "bg-blue-200 text-blue-800";
    case "C":
      return "bg-yellow-200 text-yellow-800";
    case "B":
      return "bg-orange-200 text-orange-800";
    case "A":
      return "bg-red-200 text-red-800";
    default:
      return "bg-gray-200 text-gray-600";
  }
}
