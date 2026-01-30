"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useTranslations } from "next-intl";
import type { WorkflowEntityType } from "@prisma/client";

interface SLAIndicatorProps {
  entityType: WorkflowEntityType;
  entityId: string;
}

export function SLAIndicator({ entityType, entityId }: SLAIndicatorProps) {
  const t = useTranslations("workflow.sla");

  // Only query when we have both required props
  const hasValidInput = !!entityType && !!entityId;

  const { data: sla } = trpc.workflow.getCurrentSLA.useQuery(
    { entityType, entityId },
    {
      enabled: hasValidInput,
      // Don't error if no SLA exists
      retry: false,
    }
  );

  // Early return if missing required props or no SLA
  if (!hasValidInput || !sla) return null;

  const getVariant = (): "destructive" | "secondary" | "outline" => {
    if (sla.isBreached) return "destructive";
    if (sla.remainingDays !== undefined && sla.remainingDays <= 1)
      return "destructive";
    if (sla.remainingDays !== undefined && sla.remainingDays <= 3)
      return "secondary";
    return "outline";
  };

  const getIcon = () => {
    if (sla.isBreached) return <AlertTriangle className="h-3 w-3" />;
    if (sla.status === "COMPLETED") return <CheckCircle className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const getDisplayText = () => {
    if (sla.isBreached) return t("breached");
    if (sla.status === "COMPLETED") return t("completed");
    if (sla.remainingDays !== undefined) {
      return `${sla.remainingDays}${t("days").charAt(0)}`;
    }
    return t("running");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getVariant()} className="gap-1 cursor-help">
            {getIcon()}
            {getDisplayText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>
              {t("target")}: {sla.targetDays} {t("days")}
            </div>
            {sla.percentComplete !== undefined && (
              <div>
                {t("progress")}: {sla.percentComplete}%
              </div>
            )}
            {sla.isBreached && (
              <div className="text-red-400">{t("breachedMessage")}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
