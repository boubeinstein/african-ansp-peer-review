"use client";

/**
 * Availability Quick Actions Component
 *
 * Quick buttons for common availability operations:
 * - Mark next month available
 * - Mark next 3 months available
 * - Block selected dates
 * - Clear future availability
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  ChevronDown,
  Loader2,
  Trash2,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface AvailabilityQuickActionsProps {
  reviewerProfileId: string;
  onMarkAvailable: (startDate: Date, endDate: Date) => Promise<void>;
  onMarkUnavailable: (startDate: Date, endDate: Date) => Promise<void>;
  onClearFuture: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}


// =============================================================================
// HELPERS
// =============================================================================

function getNextMonthRange(monthsFromNow: number = 0): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + monthsFromNow + 1, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + monthsFromNow + 2, 0);
  return { start, end };
}

function getNextNMonthsRange(months: number): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + months + 1, 0);
  return { start, end };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AvailabilityQuickActions({
  onMarkAvailable,
  onMarkUnavailable,
  onClearFuture,
  isLoading = false,
  disabled = false,
  compact = false,
  className,
}: AvailabilityQuickActionsProps) {
  const t = useTranslations("reviewer.availability");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleAction = async (
    actionId: string,
    action: () => Promise<void>
  ) => {
    setActionInProgress(actionId);
    try {
      await action();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkNextMonth = async () => {
    const range = getNextMonthRange(0);
    await handleAction("nextMonth", () => onMarkAvailable(range.start, range.end));
  };

  const handleMarkNext3Months = async () => {
    const range = getNextNMonthsRange(3);
    await handleAction("next3Months", () => onMarkAvailable(range.start, range.end));
  };

  const handleBlockNextMonth = async () => {
    const range = getNextMonthRange(0);
    await handleAction("blockNextMonth", () => onMarkUnavailable(range.start, range.end));
  };

  const handleClearFuture = async () => {
    await handleAction("clearFuture", onClearFuture);
  };

  const isDisabled = disabled || isLoading;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isDisabled}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4 mr-2" />
              )}
              {t("quickActions.title")}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleMarkNextMonth}
              disabled={actionInProgress === "nextMonth"}
            >
              <CalendarCheck className="h-4 w-4 mr-2 text-green-600" />
              {t("quickActions.markNextMonth")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleMarkNext3Months}
              disabled={actionInProgress === "next3Months"}
            >
              <CalendarCheck className="h-4 w-4 mr-2 text-green-600" />
              {t("quickActions.mark3Months")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleBlockNextMonth}
              disabled={actionInProgress === "blockNextMonth"}
            >
              <CalendarX className="h-4 w-4 mr-2 text-red-600" />
              {t("quickActions.blockNextMonth")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("quickActions.clearConfirm.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("quickActions.clearConfirm.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearFuture}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t("quickActions.clearFuture")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" />
          {t("quickActions.title")}
        </CardTitle>
        <CardDescription>{t("quickActions.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mark Next Month Available */}
        <Button
          variant="outline"
          className="w-full justify-start"
          disabled={isDisabled}
          onClick={handleMarkNextMonth}
        >
          {actionInProgress === "nextMonth" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CalendarCheck className="h-4 w-4 mr-2 text-green-600" />
          )}
          {t("quickActions.markNextMonth")}
        </Button>

        {/* Mark Next 3 Months Available */}
        <Button
          variant="outline"
          className="w-full justify-start"
          disabled={isDisabled}
          onClick={handleMarkNext3Months}
        >
          {actionInProgress === "next3Months" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CalendarCheck className="h-4 w-4 mr-2 text-green-600" />
          )}
          {t("quickActions.mark3Months")}
        </Button>

        {/* Block Next Month */}
        <Button
          variant="outline"
          className="w-full justify-start"
          disabled={isDisabled}
          onClick={handleBlockNextMonth}
        >
          {actionInProgress === "blockNextMonth" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CalendarX className="h-4 w-4 mr-2 text-red-600" />
          )}
          {t("quickActions.blockNextMonth")}
        </Button>

        {/* Clear Future Availability */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              disabled={isDisabled}
            >
              {actionInProgress === "clearFuture" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("quickActions.clearFuture")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("quickActions.clearConfirm.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("quickActions.clearConfirm.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearFuture}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t("quickActions.clearFuture")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default AvailabilityQuickActions;
