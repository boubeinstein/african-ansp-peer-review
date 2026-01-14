"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BarChart3, Users, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransversalArea } from "@prisma/client";
import { TRANSVERSAL_AREAS } from "@/lib/questionnaire/constants";

interface TransversalBadgeProps {
  area: TransversalArea;
  locale: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const areaConfig: Record<
  TransversalArea,
  {
    icon: typeof BarChart3;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  SPM: {
    icon: BarChart3,
    bgColor: "bg-indigo-100 dark:bg-indigo-950/40",
    textColor: "text-indigo-700 dark:text-indigo-400",
    borderColor: "border-indigo-300 dark:border-indigo-700",
  },
  HP: {
    icon: Users,
    bgColor: "bg-rose-100 dark:bg-rose-950/40",
    textColor: "text-rose-700 dark:text-rose-400",
    borderColor: "border-rose-300 dark:border-rose-700",
  },
  CI: {
    icon: RefreshCw,
    bgColor: "bg-teal-100 dark:bg-teal-950/40",
    textColor: "text-teal-700 dark:text-teal-400",
    borderColor: "border-teal-300 dark:border-teal-700",
  },
};

export function TransversalBadge({
  area,
  locale,
  showLabel = true,
  size = "md",
}: TransversalBadgeProps) {
  const lang = locale === "fr" ? "fr" : "en";
  const config = areaConfig[area];
  const meta = TRANSVERSAL_AREAS[area];
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        config.borderColor,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
      )}
    >
      <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {showLabel ? meta.name[lang] : area}
    </Badge>
  );

  if (!showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{meta.name[lang]}</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              {meta.description[lang]}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

interface TransversalBadgesProps {
  areas: TransversalArea[];
  locale: string;
  size?: "sm" | "md";
}

export function TransversalBadges({
  areas,
  locale,
  size = "sm",
}: TransversalBadgesProps) {
  if (areas.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {areas.map((area) => (
        <TransversalBadge
          key={area}
          area={area}
          locale={locale}
          showLabel={false}
          size={size}
        />
      ))}
    </div>
  );
}
