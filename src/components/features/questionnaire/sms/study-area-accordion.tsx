"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, FileQuestion, Target } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { TransversalBadges } from "./transversal-badge";
import { MaturityTable } from "./maturity-table";
import { getStudyAreasByComponent } from "@/lib/questionnaire/constants";
import type { SMSComponent, CANSOStudyArea, TransversalArea } from "@/types/prisma-enums";

interface StudyAreaAccordionProps {
  component: SMSComponent;
  locale: string;
  defaultOpen?: string;
  onStudyAreaChange?: (studyArea: CANSOStudyArea | undefined) => void;
  searchQuery?: string;
  onResultCounts?: (counts: { objectives: number; studyAreas: number }) => void;
}

// Mock data for transversal areas associated with each study area
const studyAreaTransversals: Partial<Record<CANSOStudyArea, TransversalArea[]>> = {
  SA_1_1: ["SPM"],
  SA_1_2: ["HP"],
  SA_2_1: ["SPM", "HP"],
  SA_2_2: ["SPM", "CI"],
  SA_3_1: ["SPM", "CI"],
  SA_3_2: ["CI"],
  SA_3_3: ["CI"],
  SA_4_1: ["HP"],
  SA_4_2: ["HP", "CI"],
};

// Mock objective counts per study area
const studyAreaObjectiveCounts: Partial<Record<CANSOStudyArea, number>> = {
  SA_1_1: 4,
  SA_1_2: 3,
  SA_1_3: 2,
  SA_1_4: 3,
  SA_1_5: 2,
  SA_2_1: 5,
  SA_2_2: 4,
  SA_3_1: 4,
  SA_3_2: 3,
  SA_3_3: 3,
  SA_4_1: 3,
  SA_4_2: 3,
};

const componentColors: Record<number, string> = {
  1: "border-emerald-200 dark:border-emerald-800",
  2: "border-amber-200 dark:border-amber-800",
  3: "border-blue-200 dark:border-blue-800",
  4: "border-purple-200 dark:border-purple-800",
};

const componentBgColors: Record<number, string> = {
  1: "bg-emerald-50 dark:bg-emerald-950/30",
  2: "bg-amber-50 dark:bg-amber-950/30",
  3: "bg-blue-50 dark:bg-blue-950/30",
  4: "bg-purple-50 dark:bg-purple-950/30",
};

const componentTextColors: Record<number, string> = {
  1: "text-emerald-700 dark:text-emerald-400",
  2: "text-amber-700 dark:text-amber-400",
  3: "text-blue-700 dark:text-blue-400",
  4: "text-purple-700 dark:text-purple-400",
};

export function StudyAreaAccordion({
  component,
  locale,
  defaultOpen,
  onStudyAreaChange,
  searchQuery,
  onResultCounts,
}: StudyAreaAccordionProps) {
  const t = useTranslations("smsBrowser");
  const lang = locale === "fr" ? "fr" : "en";

  // Get study areas for the selected component
  const studyAreas = getStudyAreasByComponent(
    parseInt(component.split("_")[2]) || 1
  );

  const componentNumber = studyAreas[0]?.componentNumber || 1;
  const borderColor = componentColors[componentNumber];
  const bgColor = componentBgColors[componentNumber];
  const textColor = componentTextColors[componentNumber];

  const handleValueChange = (value: string) => {
    if (onStudyAreaChange) {
      onStudyAreaChange(value ? (value as CANSOStudyArea) : undefined);
    }
  };

  // Compute result counts when searching (use ref to prevent infinite loop)
  const prevResultRef = useRef<string>("");

  useEffect(() => {
    if (!onResultCounts) return;

    let totalObjectives: number;
    let totalAreas: number;

    if (!searchQuery) {
      // When not searching, sum all objective counts for this component
      totalObjectives = studyAreas.reduce(
        (sum, sa) => sum + (studyAreaObjectiveCounts[sa.code] || 0),
        0
      );
      totalAreas = studyAreas.length;
    } else {
      const s = searchQuery.toLowerCase();
      let matchingObjectives = 0;
      let matchingAreas = 0;

      for (const sa of studyAreas) {
        const nameMatch =
          sa.name[lang].toLowerCase().includes(s) ||
          sa.description[lang].toLowerCase().includes(s);
        const objectiveCount = studyAreaObjectiveCounts[sa.code] || 0;

        if (nameMatch) {
          matchingObjectives += objectiveCount;
          matchingAreas++;
        } else {
          // Check objective titles (approximate — count matching objectives)
          // Since we use mock data fallback, approximate: count all if area name matches
          matchingObjectives += objectiveCount;
          matchingAreas++;
        }
      }

      totalObjectives = matchingObjectives;
      totalAreas = matchingAreas;
    }

    // Only call onResultCounts if values changed
    const resultKey = `${totalObjectives}-${totalAreas}`;
    if (resultKey !== prevResultRef.current) {
      prevResultRef.current = resultKey;
      onResultCounts({ objectives: totalObjectives, studyAreas: totalAreas });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, studyAreas, lang]);

  // When searching with no results for this component, show empty state
  if (searchQuery && studyAreas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-1">
          {t("results.noResults")}
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {t("results.noResultsDescription")}
        </p>
      </div>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen}
      onValueChange={handleValueChange}
      className="space-y-3"
    >
      {studyAreas.map((studyArea) => {
        const transversals = studyAreaTransversals[studyArea.code] || [];
        const objectiveCount = studyAreaObjectiveCounts[studyArea.code] || 0;
        const displayCode = studyArea.code.replace(/_/g, " ").replace("SA ", "");

        return (
          <AccordionItem
            key={studyArea.code}
            value={studyArea.code}
            className="border-0"
          >
            <Card className={cn("transition-all hover:shadow-sm", borderColor)}>
              <CardHeader className="p-0">
                <AccordionTrigger className="p-4 hover:bg-muted/30 hover:no-underline w-full [&[data-state=open]>div>svg]:rotate-180">
                  <div className="flex items-center gap-4 w-full">
                    {/* Study Area Code Badge */}
                    <div
                      className={cn(
                        "shrink-0 px-3 py-2 rounded-lg font-mono font-bold text-sm",
                        bgColor,
                        textColor
                      )}
                    >
                      SA {displayCode}
                    </div>

                    {/* Title and Meta */}
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="font-semibold text-sm mb-1">
                        {searchQuery
                          ? highlightMatch(studyArea.name[lang], searchQuery)
                          : studyArea.name[lang]}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {t("studyArea.objectives", { count: objectiveCount })}
                        </span>
                        {transversals.length > 0 && (
                          <TransversalBadges
                            areas={transversals}
                            locale={locale}
                            size="sm"
                          />
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
                  </div>
                </AccordionTrigger>
              </CardHeader>

              <AccordionContent>
                <CardContent className="pt-0 px-4 pb-4">
                  {/* Study Area Description */}
                  <div className="mb-4 p-3 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? highlightMatch(studyArea.description[lang], searchQuery)
                        : studyArea.description[lang]}
                    </p>
                  </div>

                  {/* Maturity Table */}
                  <MaturityTable
                    studyArea={studyArea.code}
                    locale={locale}
                    componentNumber={componentNumber}
                    searchQuery={searchQuery}
                  />
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

// =============================================================================
// SEARCH HIGHLIGHT (matching ANS browser pq-card.tsx pattern)
// =============================================================================

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}
