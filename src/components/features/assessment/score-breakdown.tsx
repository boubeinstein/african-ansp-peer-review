"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getScoreColor, getScoreProgressColor } from "./ei-score-gauge";
import { MaturityLevelBadge } from "./maturity-level-badge";

interface CategoryScore {
  category: string;
  score: number;
  satisfactory?: number;
  notSatisfactory?: number;
  notApplicable?: number;
  total?: number;
}

interface AuditAreaBreakdownProps {
  scores: Record<string, number> | CategoryScore[] | null | undefined;
  showDetails?: boolean;
}

export function AuditAreaBreakdown({ scores, showDetails = false }: AuditAreaBreakdownProps) {
  if (!scores) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No score data available
      </div>
    );
  }

  // Normalize scores to array format
  const scoreArray: CategoryScore[] = Array.isArray(scores)
    ? scores
    : Object.entries(scores).map(([category, score]) => ({
        category,
        score: typeof score === "number" ? score : 0,
      }));

  if (scoreArray.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No score data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scoreArray.map((area) => (
        <div key={area.category} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {area.category}
              </Badge>
              {showDetails && area.total && (
                <span className="text-xs text-muted-foreground">
                  ({area.total} questions)
                </span>
              )}
            </div>
            <span className={cn("font-semibold", getScoreColor(area.score))}>
              {area.score.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={area.score}
            className={cn("h-2", getScoreProgressColor(area.score))}
          />
          {showDetails && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              {area.satisfactory !== undefined && (
                <span className="text-green-600">S: {area.satisfactory}</span>
              )}
              {area.notSatisfactory !== undefined && (
                <span className="text-red-600">NS: {area.notSatisfactory}</span>
              )}
              {area.notApplicable !== undefined && (
                <span className="text-gray-500">NA: {area.notApplicable}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface CriticalElementBreakdownProps {
  scores: Record<string, number> | null | undefined;
}

export function CriticalElementBreakdown({ scores }: CriticalElementBreakdownProps) {
  if (!scores || Object.keys(scores).length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No critical element data available
      </div>
    );
  }

  const criticalElements = Object.entries(scores).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {criticalElements.map(([ce, score]) => (
        <div
          key={ce}
          className={cn(
            "p-3 rounded-lg border text-center",
            score >= 80
              ? "border-green-200 bg-green-50"
              : score >= 60
              ? "border-yellow-200 bg-yellow-50"
              : score >= 40
              ? "border-orange-200 bg-orange-50"
              : "border-red-200 bg-red-50"
          )}
        >
          <div className="text-xs text-muted-foreground mb-1">{ce}</div>
          <div className={cn("text-lg font-bold", getScoreColor(score))}>
            {score.toFixed(0)}%
          </div>
        </div>
      ))}
    </div>
  );
}

interface SMSComponentBreakdownProps {
  scores: Record<string, number> | null | undefined;
}

export function SMSComponentBreakdown({ scores }: SMSComponentBreakdownProps) {
  if (!scores || Object.keys(scores).length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No component data available
      </div>
    );
  }

  const components = Object.entries(scores).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      {components.map(([component, score]) => (
        <div key={component} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {component}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold", getScoreColor(score))}>
                {score.toFixed(1)}%
              </span>
              <MaturityLevelBadge level={scoreToMaturityLevel(score)} size="sm" />
            </div>
          </div>
          <Progress
            value={score}
            className={cn("h-2", getScoreProgressColor(score))}
          />
        </div>
      ))}
    </div>
  );
}

interface StudyAreaBreakdownProps {
  scores: Record<string, number> | null | undefined;
}

export function StudyAreaBreakdown({ scores }: StudyAreaBreakdownProps) {
  if (!scores || Object.keys(scores).length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No study area data available
      </div>
    );
  }

  const studyAreas = Object.entries(scores).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-3">
      {studyAreas.map(([area, score]) => (
        <div key={area} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{formatStudyAreaName(area)}</span>
            <span className={cn("font-semibold", getScoreColor(score))}>
              {score.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={score}
            className={cn("h-2", getScoreProgressColor(score))}
          />
        </div>
      ))}
    </div>
  );
}

// Helper function to convert score percentage to maturity level
function scoreToMaturityLevel(score: number): string {
  if (score >= 90) return "E";
  if (score >= 70) return "D";
  if (score >= 50) return "C";
  if (score >= 30) return "B";
  return "A";
}

// Helper function to format study area names
function formatStudyAreaName(area: string): string {
  return area
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
