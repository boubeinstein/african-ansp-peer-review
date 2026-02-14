"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ANSReviewArea } from "@/types/prisma-enums";

const ANS_AREAS: ANSReviewArea[] = ["ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR"];

interface ReviewAreaFilterProps {
  selected: ANSReviewArea[];
  onChange: (areas: ANSReviewArea[]) => void;
  counts: Record<string, number>;
  locale: string;
}

export function ReviewAreaFilter({
  selected,
  onChange,
  counts,
  locale: _locale,
}: ReviewAreaFilterProps) {
  const t = useTranslations("ansBrowser");
  const tAreas = useTranslations("reviewAreas");

  const handleToggle = (area: ANSReviewArea) => {
    if (selected.includes(area)) {
      onChange(selected.filter((a) => a !== area));
    } else {
      onChange([...selected, area]);
    }
  };

  const selectAll = () => {
    onChange([...ANS_AREAS]);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={selectAll}
        >
          {t("filters.selectAll")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={clearAll}
          disabled={selected.length === 0}
        >
          {t("filters.clear")}
        </Button>
      </div>

      {/* Area List */}
      <div className="space-y-1">
        {ANS_AREAS.map((area) => {
          const isSelected = selected.includes(area);
          const count = counts[area] ?? 0;
          const name = tAreas(`${area}.name`);

          return (
            <label
              key={area}
              className={cn(
                "flex items-center gap-3 rounded-md p-2 cursor-pointer transition-colors",
                isSelected
                  ? "bg-blue-50 dark:bg-blue-950/30"
                  : "hover:bg-muted/50"
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggle(area)}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-mono text-xs font-bold px-1.5 py-0.5 rounded",
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {area}
                  </span>
                  <span className="text-sm truncate">{name}</span>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs shrink-0",
                  isSelected && "border-blue-300 text-blue-600"
                )}
              >
                {count}
              </Badge>
            </label>
          );
        })}
      </div>
    </div>
  );
}
