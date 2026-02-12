"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Download,
  Send,
  CheckCircle2,
  FileText,
  Undo2,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type ReportStatus = "DRAFT" | "UNDER_REVIEW" | "FINALIZED";

const REGENERATE_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "LEAD_REVIEWER",
];

const SUBMIT_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "LEAD_REVIEWER",
];

const FINALIZE_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "LEAD_REVIEWER",
];

const RETURN_TO_DRAFT_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
];

interface ReportWorkflowActionsProps {
  status: ReportStatus;
  version: number;
  userRole: string;
  canRegenerate: boolean;
  isRegenerating: boolean;
  isUpdatingStatus: boolean;
  onRegenerate: () => void;
  onSubmitForReview: () => void;
  onFinalize: () => void;
  onReturnToDraft: () => void;
  onDownload: () => void;
}

const STATUS_CONFIG: Record<
  ReportStatus,
  { color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    color: "bg-gray-100 text-gray-800",
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  UNDER_REVIEW: {
    color: "bg-blue-100 text-blue-800",
    icon: <Send className="h-3.5 w-3.5" />,
  },
  FINALIZED: {
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

export function ReportWorkflowActions({
  status,
  version,
  userRole,
  canRegenerate,
  isRegenerating,
  isUpdatingStatus,
  onRegenerate,
  onSubmitForReview,
  onFinalize,
  onReturnToDraft,
  onDownload,
}: ReportWorkflowActionsProps) {
  const t = useTranslations("reviews.detail.report");
  const tWorkflow = useTranslations("reviews.detail.report.workflow");

  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      {/* Left: Status + Version */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className={cn("gap-1", config.color)}>
          {config.icon}
          <span>{t(`status.${status}`)}</span>
        </Badge>
        <span className="text-sm text-muted-foreground">
          {tWorkflow("currentVersion", { version })}
        </span>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {status === "DRAFT" && (
          <>
            {REGENERATE_ROLES.includes(userRole) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={!canRegenerate || isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                {tWorkflow("regenerate")}
              </Button>
            )}
            {SUBMIT_ROLES.includes(userRole) && (
              <Button
                size="sm"
                onClick={onSubmitForReview}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                {tWorkflow("submitForReview")}
              </Button>
            )}
          </>
        )}

        {status === "UNDER_REVIEW" && (
          <>
            {FINALIZE_ROLES.includes(userRole) && (
              <Button
                size="sm"
                onClick={onFinalize}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                {tWorkflow("finalize")}
              </Button>
            )}
            {RETURN_TO_DRAFT_ROLES.includes(userRole) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReturnToDraft}
                disabled={isUpdatingStatus}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                {tWorkflow("returnToDraft")}
              </Button>
            )}
          </>
        )}

        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4 mr-1" />
          {tWorkflow("download")}
        </Button>
      </div>
    </div>
  );
}
