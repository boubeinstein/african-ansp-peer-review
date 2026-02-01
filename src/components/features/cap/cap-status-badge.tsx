"use client";

/**
 * CAP Status Badge Component
 *
 * Displays a styled badge for CAP status with appropriate colors and icons.
 * Follows the AFI Programme CAP workflow status flow.
 */

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  FileEdit,
  Send,
  Search,
  CheckCircle,
  XCircle,
  Wrench,
  ClipboardCheck,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CAPStatus } from "@/types/prisma-enums";

interface CAPStatusBadgeProps {
  status: CAPStatus;
  showIcon?: boolean;
  size?: "sm" | "default";
}

const STATUS_CONFIG: Record<CAPStatus, {
  color: string;
  icon: React.ElementType;
}> = {
  DRAFT: {
    color: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    icon: FileEdit,
  },
  SUBMITTED: {
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Send,
  },
  UNDER_REVIEW: {
    color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Search,
  },
  ACCEPTED: {
    color: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
    icon: CheckCircle,
  },
  REJECTED: {
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    icon: XCircle,
  },
  IN_PROGRESS: {
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Wrench,
  },
  COMPLETED: {
    color: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300",
    icon: ClipboardCheck,
  },
  VERIFIED: {
    color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: ShieldCheck,
  },
  CLOSED: {
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    icon: Lock,
  },
};

export function CAPStatusBadge({ status, showIcon = true, size = "default" }: CAPStatusBadgeProps) {
  const t = useTranslations("cap.status");

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        config.color,
        size === "sm" && "text-xs px-1.5 py-0"
      )}
    >
      {showIcon && <Icon className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />}
      {t(status)}
    </Badge>
  );
}
