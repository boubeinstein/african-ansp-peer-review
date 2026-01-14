"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, Target, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  CANSO_STUDY_AREAS,
  getStudyAreasByComponent,
} from "@/lib/questionnaire/constants";
import type { SMSComponent, CANSOStudyArea, TransversalArea } from "@prisma/client";

interface StudyAreaAccordionProps {
  component: SMSComponent;
  locale: string;
  defaultOpen?: string;
  onStudyAreaChange?: (studyArea: CANSOStudyArea | undefined) => void;
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
            <Card className={cn("transition-all", borderColor)}>
              <AccordionTrigger asChild>
                <CardHeader className="p-4 cursor-pointer hover:bg-muted/30 transition-colors [&[data-state=open]>div>svg]:rotate-180">
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
                        {studyArea.name[lang]}
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
                </CardHeader>
              </AccordionTrigger>

              <AccordionContent>
                <CardContent className="pt-0 px-4 pb-4">
                  {/* Study Area Description */}
                  <div className="mb-4 p-3 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      {studyArea.description[lang]}
                    </p>
                  </div>

                  {/* Maturity Table */}
                  <MaturityTable
                    studyArea={studyArea.code}
                    locale={locale}
                    componentNumber={componentNumber}
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
