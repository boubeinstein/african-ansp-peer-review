"use client";

/**
 * COI Check Component
 *
 * Real-time conflict of interest check against a target organization.
 * Used in reviewer assignment workflows.
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";
import { COIStatusIndicator, type COISeverity } from "./coi-badge";

// =============================================================================
// TYPES
// =============================================================================

export interface COICheckResult {
  hasConflict: boolean;
  severity: COISeverity | null;
  reason: string | null;
  description?: string | null;
  coiType?: string | null;
  canOverride: boolean;
  waiverExpiry?: Date | null;
}

interface COICheckProps {
  reviewerId: string;
  targetOrganizationId: string;
  targetOrganizationName?: string;
  checkResult?: COICheckResult | null;
  isLoading?: boolean;
  onResult?: (result: COICheckResult) => void;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function COICheck({
  // These props are available for API integration
  reviewerId: _reviewerId,
  targetOrganizationId: _targetOrganizationId,
  targetOrganizationName,
  checkResult,
  isLoading = false,
  onResult,
  showDetails = true,
  compact = false,
  className,
}: COICheckProps) {
  const t = useTranslations("reviewer.coi");
  // Silence unused variable warnings - reserved for future use
  void _reviewerId;
  void _targetOrganizationId;

  // Call onResult when checkResult changes
  useEffect(() => {
    if (checkResult && onResult) {
      onResult(checkResult);
    }
  }, [checkResult, onResult]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t("check.checking")}</span>
      </div>
    );
  }

  if (!checkResult) {
    return null;
  }

  const { hasConflict, severity, reason, description, canOverride } = checkResult;

  if (compact) {
    return (
      <COIStatusIndicator
        hasConflict={hasConflict}
        severity={severity}
        size="sm"
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main Status */}
      <div className="flex items-center gap-3">
        <COIStatusIndicator
          hasConflict={hasConflict}
          severity={severity}
          size="md"
        />

        {hasConflict && canOverride && (
          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">
            {t("check.canOverride")}
          </Badge>
        )}
      </div>

      {/* Details */}
      {showDetails && hasConflict && (reason || description) && (
        <Card className={cn(
          "border",
          severity === "HARD" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
        )}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Info className={cn(
                "h-4 w-4 mt-0.5",
                severity === "HARD" ? "text-red-600" : "text-yellow-600"
              )} />
              <div className="flex-1 space-y-1">
                {targetOrganizationName && (
                  <p className="text-sm font-medium">
                    {t("check.conflictWith", { org: targetOrganizationName })}
                  </p>
                )}
                {reason && (
                  <p className="text-sm text-muted-foreground">{reason}</p>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// INLINE COI CHECK
// =============================================================================

interface InlineCOICheckProps {
  hasConflict: boolean;
  severity?: COISeverity | null;
  reason?: string | null;
  className?: string;
}

export function InlineCOICheck({
  hasConflict,
  severity,
  reason,
  className,
}: InlineCOICheckProps) {
  const t = useTranslations("reviewer.coi.check");

  if (!hasConflict) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <CheckCircle2 className={cn("h-4 w-4 text-green-600", className)} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("noConflict")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isHard = severity === "HARD";
  const Icon = isHard ? XCircle : AlertTriangle;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon
            className={cn(
              "h-4 w-4",
              isHard ? "text-red-600" : "text-yellow-600",
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">
            {isHard ? t("cannotAssign") : t("hasConflict")}
          </p>
          {reason && (
            <p className="text-xs text-muted-foreground">{reason}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// COI CHECK SKELETON
// =============================================================================

export function COICheckSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export default COICheck;
