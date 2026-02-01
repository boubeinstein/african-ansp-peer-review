"use client";

/**
 * CAP Card Component
 *
 * Displays a CAP summary card with key information, status, and actions.
 * Used in the CAPs list grid view.
 */

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Calendar,
  Eye,
  MoreHorizontal,
  Pencil,
  User,
  Building2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { CAPStatusBadge } from "./cap-status-badge";
import { CAPStatus, FindingSeverity } from "@/types/prisma-enums";

interface CAPCardProps {
  cap: {
    id: string;
    findingId: string;
    status: CAPStatus;
    dueDate: Date | string;
    finding: {
      id: string;
      referenceNumber: string;
      titleEn: string;
      titleFr: string;
      severity: FindingSeverity;
      organization: {
        id: string;
        nameEn: string;
        nameFr: string;
        organizationCode: string;
      };
    };
    assignedTo?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  };
}

export function CAPCard({ cap }: CAPCardProps) {
  const t = useTranslations("cap");
  const tFinding = useTranslations("findings");
  const locale = useLocale();
  const router = useRouter();

  const findingTitle = locale === "fr" ? cap.finding?.titleFr : cap.finding?.titleEn;
  const orgName = locale === "fr" ? cap.finding?.organization?.nameFr : cap.finding?.organization?.nameEn;

  const isOverdue = cap.dueDate &&
    new Date(cap.dueDate) < new Date() &&
    !["VERIFIED", "CLOSED"].includes(cap.status);

  const daysOverdue = isOverdue
    ? differenceInDays(new Date(), new Date(cap.dueDate))
    : 0;

  const assigneeName = cap.assignedTo
    ? `${cap.assignedTo.firstName} ${cap.assignedTo.lastName}`
    : null;

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        isOverdue && "border-red-300 bg-red-50/50 dark:bg-red-950/10"
      )}
      onClick={() => router.push(`/${locale}/findings/${cap.findingId}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {cap.finding?.referenceNumber}
              </code>
              <CAPStatusBadge status={cap.status} size="sm" />
              {isOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t("detail.daysOverdue", { days: daysOverdue })}
                </Badge>
              )}
            </div>
            <CardTitle className="text-base line-clamp-2">
              {findingTitle}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${locale}/findings/${cap.findingId}`);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                {t("view")}
              </DropdownMenuItem>
              {["DRAFT", "REJECTED"].includes(cap.status) && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/${locale}/findings/${cap.findingId}/cap/edit`);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("edit")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Severity Badge */}
        {cap.finding?.severity && (
          <Badge
            variant="outline"
            className={cn(
              cap.finding.severity === "CRITICAL" && "bg-red-100 text-red-800 border-red-200",
              cap.finding.severity === "MAJOR" && "bg-orange-100 text-orange-800 border-orange-200",
              cap.finding.severity === "MINOR" && "bg-yellow-100 text-yellow-800 border-yellow-200"
            )}
          >
            {tFinding(`severity.${cap.finding.severity}`)}
          </Badge>
        )}

        {/* Due Date & Assignee */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className={cn(isOverdue && "text-red-600 font-medium")}>
                    {format(new Date(cap.dueDate), "MMM d, yyyy")}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t("detail.dueDate")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {assigneeName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{assigneeName}</span>
            </div>
          )}
        </div>

        {/* Organization */}
        {orgName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{orgName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
