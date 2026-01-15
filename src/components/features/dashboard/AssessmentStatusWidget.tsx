"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  FileText,
  Send,
  Search,
  CheckCircle2,
  Archive,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AssessmentStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface AssessmentStatusWidgetProps {
  byStatus: Record<AssessmentStatus, number>;
  overdueCount?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_CONFIG: Record<
  AssessmentStatus,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    icon: FileText,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  SUBMITTED: {
    label: "Submitted",
    icon: Send,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    icon: Search,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  ARCHIVED: {
    label: "Archived",
    icon: Archive,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function AssessmentStatusWidget({
  byStatus,
  overdueCount = 0,
  showViewAll = true,
  onViewAll,
  className,
}: AssessmentStatusWidgetProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  // Calculate totals
  const total = useMemo(() => {
    return Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  }, [byStatus]);

  const activeCount = useMemo(() => {
    return byStatus.DRAFT + byStatus.SUBMITTED + byStatus.UNDER_REVIEW;
  }, [byStatus]);

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push("/assessments");
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("assessments.title")}</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {total} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status breakdown */}
        <div className="space-y-3">
          {(Object.keys(STATUS_CONFIG) as AssessmentStatus[]).map((status) => {
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            const count = byStatus[status] || 0;

            if (count === 0 && status === "ARCHIVED") return null;

            return (
              <div
                key={status}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      config.bgColor
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                <span className="text-lg font-semibold">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Overdue warning */}
        {overdueCount > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {overdueCount} {t("assessments.overdue")}
              </span>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {activeCount} {t("assessments.active")}
              </span>
            </div>
            {showViewAll && (
              <Button variant="ghost" size="sm" onClick={handleViewAll}>
                {t("assessments.viewAll")}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPACT STATUS WIDGET
// =============================================================================

interface CompactStatusWidgetProps {
  byStatus: Record<AssessmentStatus, number>;
  className?: string;
}

export function CompactStatusWidget({
  byStatus,
  className,
}: CompactStatusWidgetProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {(Object.keys(STATUS_CONFIG) as AssessmentStatus[]).map((status) => {
        const config = STATUS_CONFIG[status];
        const count = byStatus[status] || 0;

        if (count === 0) return null;

        return (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                config.color.replace("text-", "bg-")
              )}
            />
            <span className="text-xs text-muted-foreground">{config.label}</span>
            <span className="text-xs font-medium">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default AssessmentStatusWidget;
