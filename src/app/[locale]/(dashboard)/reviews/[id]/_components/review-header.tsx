"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreHorizontal,
  Edit,
  Download,
  Send,
  Upload,
  Calendar,
  Building2,
  Keyboard,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ReviewHeaderProps {
  review: {
    id: string;
    reviewNumber: string;
    status: string;
    hostOrganization: { nameEn: string; nameFr: string; code: string };
    reviewType: string;
    scheduledStartDate: Date | null;
    scheduledEndDate: Date | null;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
  REQUESTED: "bg-yellow-100 text-yellow-800 border-yellow-300",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-300",
  APPROVED: "bg-green-100 text-green-800 border-green-300",
  PLANNING: "bg-cyan-100 text-cyan-800 border-cyan-300",
  SCHEDULED: "bg-purple-100 text-purple-800 border-purple-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-300",
  REPORT_DRAFTING: "bg-indigo-100 text-indigo-800 border-indigo-300",
  REPORT_REVIEW: "bg-violet-100 text-violet-800 border-violet-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

export function ReviewHeader({ review }: ReviewHeaderProps) {
  const t = useTranslations("reviews.detail");
  const locale = useLocale();
  const router = useRouter();
  const dateLocale = locale === "fr" ? fr : enUS;

  const orgName = locale === "fr"
    ? review.hostOrganization.nameFr || review.hostOrganization.nameEn
    : review.hostOrganization.nameEn;

  const dateRange = review.scheduledStartDate && review.scheduledEndDate
    ? `${format(new Date(review.scheduledStartDate), "MMM d", { locale: dateLocale })} - ${format(new Date(review.scheduledEndDate), "MMM d, yyyy", { locale: dateLocale })}`
    : null;

  return (
    <header className="sticky top-0 z-40 bg-background border-b">
      <div className="px-4 md:px-6 py-3">
        {/* Top Row: Back + Title + Status + Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => router.push(`/${locale}/reviews`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold truncate">
                  {review.reviewNumber}
                </h1>
                <Badge
                  variant="outline"
                  className={cn("shrink-0", statusColors[review.status])}
                >
                  {t(`status.${review.status}`)}
                </Badge>
              </div>

              {/* Subtitle: Org + Type + Dates */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {orgName}
                </span>
                <span>•</span>
                <span>{t(`type.${review.reviewType}`)}</span>
                {dateRange && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {dateRange}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Edit className="h-4 w-4 mr-1.5" />
              {t("actions.edit")}
            </Button>

            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-1.5" />
              {t("actions.submit")}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("show-keyboard-shortcuts"));
                  }}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("actions.keyboardShortcuts")}</p>
                <p className="text-xs text-muted-foreground">Press ? for help</p>
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="sm:hidden">
                  <Edit className="h-4 w-4 mr-2" />
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  {t("actions.download")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("actions.upload")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  {t("actions.cancel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
