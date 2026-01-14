"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CRITICAL_ELEMENTS, getCriticalElementsArray } from "@/lib/questionnaire/constants";
import type { CriticalElement } from "@prisma/client";

interface CriticalElementFilterProps {
  selected: CriticalElement[];
  onChange: (elements: CriticalElement[]) => void;
  locale: string;
}

export function CriticalElementFilter({
  selected,
  onChange,
  locale,
}: CriticalElementFilterProps) {
  const t = useTranslations("ansBrowser");
  const elements = getCriticalElementsArray();
  const lang = locale === "fr" ? "fr" : "en";

  const handleToggle = (element: CriticalElement) => {
    if (selected.includes(element)) {
      onChange(selected.filter((e) => e !== element));
    } else {
      onChange([...selected, element]);
    }
  };

  const selectAll = () => {
    onChange(elements.map((e) => e.code));
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

      {/* Element List */}
      <div className="space-y-1">
        {elements.map((element) => {
          const isSelected = selected.includes(element.code);
          const displayCode = element.code.replace("_", "-");

          return (
            <label
              key={element.code}
              className={cn(
                "flex items-start gap-3 rounded-md p-2 cursor-pointer transition-colors",
                isSelected
                  ? "bg-purple-50 dark:bg-purple-950/30"
                  : "hover:bg-muted/50"
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggle(element.code)}
                className="mt-0.5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={cn(
                      "font-mono text-xs font-bold px-1.5 py-0.5 rounded",
                      isSelected
                        ? "bg-purple-600 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {displayCode}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {element.name[lang]}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
