"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { maturityColors } from "./maturity-legend";
import { getMaturityLevelsArray } from "@/lib/questionnaire/constants";
import type { CANSOStudyArea, MaturityLevel } from "@/types/prisma-enums";

interface MaturityTableProps {
  studyArea: CANSOStudyArea;
  locale: string;
  componentNumber: number;
  searchQuery?: string;
}

// Mock objectives data for each study area
interface ObjectiveMaturity {
  id: string;
  objectiveNumber: number;
  titleEn: string;
  titleFr: string;
  maturityDescriptors: Record<
    MaturityLevel,
    { en: string; fr: string }
  >;
}

const mockObjectives: Partial<Record<CANSOStudyArea, ObjectiveMaturity[]>> = {
  SA_1_1: [
    {
      id: "obj-1-1-1",
      objectiveNumber: 1,
      titleEn: "Senior management demonstrates commitment to safety",
      titleFr: "La haute direction démontre son engagement envers la sécurité",
      maturityDescriptors: {
        LEVEL_A: {
          en: "No formal safety commitment documented",
          fr: "Aucun engagement formel en matière de sécurité documenté",
        },
        LEVEL_B: {
          en: "Safety policy exists but not actively communicated",
          fr: "La politique de sécurité existe mais n'est pas activement communiquée",
        },
        LEVEL_C: {
          en: "Safety policy signed and communicated to all staff",
          fr: "Politique de sécurité signée et communiquée à tout le personnel",
        },
        LEVEL_D: {
          en: "Management actively promotes safety in daily operations",
          fr: "La direction promeut activement la sécurité dans les opérations quotidiennes",
        },
        LEVEL_E: {
          en: "Safety leadership recognized as industry benchmark",
          fr: "Leadership en sécurité reconnu comme référence de l'industrie",
        },
      },
    },
    {
      id: "obj-1-1-2",
      objectiveNumber: 2,
      titleEn: "Adequate resources are allocated to safety activities",
      titleFr: "Des ressources adéquates sont allouées aux activités de sécurité",
      maturityDescriptors: {
        LEVEL_A: {
          en: "Safety activities funded on ad-hoc basis",
          fr: "Activités de sécurité financées de manière ponctuelle",
        },
        LEVEL_B: {
          en: "Basic budget allocated but often insufficient",
          fr: "Budget de base alloué mais souvent insuffisant",
        },
        LEVEL_C: {
          en: "Dedicated budget with annual planning process",
          fr: "Budget dédié avec processus de planification annuel",
        },
        LEVEL_D: {
          en: "Resources optimized based on risk assessment",
          fr: "Ressources optimisées sur la base de l'évaluation des risques",
        },
        LEVEL_E: {
          en: "Investment in safety innovation and best practices",
          fr: "Investissement dans l'innovation en sécurité et les meilleures pratiques",
        },
      },
    },
    {
      id: "obj-1-1-3",
      objectiveNumber: 3,
      titleEn: "Safety objectives are defined and measurable",
      titleFr: "Les objectifs de sécurité sont définis et mesurables",
      maturityDescriptors: {
        LEVEL_A: {
          en: "No formal safety objectives established",
          fr: "Aucun objectif de sécurité formel établi",
        },
        LEVEL_B: {
          en: "General safety goals exist without specific targets",
          fr: "Des objectifs généraux de sécurité existent sans cibles spécifiques",
        },
        LEVEL_C: {
          en: "SMART objectives defined with regular monitoring",
          fr: "Objectifs SMART définis avec suivi régulier",
        },
        LEVEL_D: {
          en: "Objectives aligned with organizational strategy",
          fr: "Objectifs alignés sur la stratégie organisationnelle",
        },
        LEVEL_E: {
          en: "Objectives set to exceed industry benchmarks",
          fr: "Objectifs fixés pour dépasser les références de l'industrie",
        },
      },
    },
    {
      id: "obj-1-1-4",
      objectiveNumber: 4,
      titleEn: "Safety performance is regularly reviewed by management",
      titleFr: "Les performances de sécurité sont régulièrement examinées par la direction",
      maturityDescriptors: {
        LEVEL_A: {
          en: "No formal safety performance review process",
          fr: "Aucun processus formel d'évaluation des performances de sécurité",
        },
        LEVEL_B: {
          en: "Annual review of major incidents only",
          fr: "Évaluation annuel des incidents majeurs uniquement",
        },
        LEVEL_C: {
          en: "Quarterly management review of safety metrics",
          fr: "Revue trimestrielle par la direction des indicateurs de sécurité",
        },
        LEVEL_D: {
          en: "Real-time monitoring with proactive interventions",
          fr: "Surveillance en temps réel avec interventions proactives",
        },
        LEVEL_E: {
          en: "Predictive analytics driving continuous improvement",
          fr: "Analyses prédictives favorisant l'amélioration continue",
        },
      },
    },
  ],
  SA_2_1: [
    {
      id: "obj-2-1-1",
      objectiveNumber: 1,
      titleEn: "Hazard identification processes are established",
      titleFr: "Les processus d'identification des dangers sont établis",
      maturityDescriptors: {
        LEVEL_A: {
          en: "Reactive hazard identification only",
          fr: "Identification des dangers réactive uniquement",
        },
        LEVEL_B: {
          en: "Basic reporting system in place",
          fr: "Système de signalement de base en place",
        },
        LEVEL_C: {
          en: "Proactive hazard identification program",
          fr: "Programme proactif d'identification des dangers",
        },
        LEVEL_D: {
          en: "Predictive methods integrated with operations",
          fr: "Méthodes prédictives intégrées aux opérations",
        },
        LEVEL_E: {
          en: "Industry-leading predictive capabilities",
          fr: "Capacités prédictives de premier plan dans l'industrie",
        },
      },
    },
  ],
};

// Get objectives for a study area (with fallback)
function getObjectivesForStudyArea(studyArea: CANSOStudyArea): ObjectiveMaturity[] {
  return mockObjectives[studyArea] || mockObjectives.SA_1_1 || [];
}

export function MaturityTable({
  studyArea,
  locale,
  searchQuery,
}: MaturityTableProps) {
  const t = useTranslations("smsBrowser");
  const lang = locale === "fr" ? "fr" : "en";
  const levels = getMaturityLevelsArray();
  const objectives = getObjectivesForStudyArea(studyArea);

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        {t("maturity.objectivesTitle")}
      </h4>

      {objectives.map((objective) => (
        <ObjectiveCard
          key={objective.id}
          objective={objective}
          levels={levels}
          lang={lang}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}

// =============================================================================
// OBJECTIVE CARD — Expandable card with collapsible maturity grid
// =============================================================================

interface ObjectiveCardProps {
  objective: ObjectiveMaturity;
  levels: ReturnType<typeof getMaturityLevelsArray>;
  lang: "en" | "fr";
  searchQuery?: string;
}

function ObjectiveCard({ objective, levels, lang, searchQuery }: ObjectiveCardProps) {
  const t = useTranslations("smsBrowser");
  const [isOpen, setIsOpen] = useState(false);

  const titleText = lang === "fr" ? objective.titleFr : objective.titleEn;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border bg-card overflow-hidden transition-all",
          isOpen && "ring-2 ring-emerald-500/20"
        )}
      >
        {/* Objective Header — clickable to expand */}
        <CollapsibleTrigger asChild>
          <div className="p-3 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <span className="shrink-0 font-mono text-xs font-bold px-2 py-1 rounded bg-muted">
                {objective.objectiveNumber}
              </span>
              <p className="text-sm font-medium flex-1">
                {searchQuery
                  ? highlightMatch(titleText, searchQuery)
                  : titleText}
              </p>
              <div className="shrink-0 flex items-center gap-2">
                {/* Inline maturity level badges (collapsed preview) */}
                {!isOpen && (
                  <div className="hidden sm:flex gap-0.5">
                    {levels.map((level) => {
                      const colors = maturityColors[level.code];
                      return (
                        <div
                          key={level.code}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white",
                            colors.fill
                          )}
                          title={level.name[lang]}
                        >
                          {level.level}
                        </div>
                      );
                    })}
                  </div>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded maturity descriptors */}
        <CollapsibleContent>
          {/* Guidance-style header */}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <BookOpen className="h-4 w-4" />
              {t("maturity.objectivesTitle")}
            </div>
          </div>

          {/* Maturity Levels Grid */}
          <div className="grid grid-cols-5 mx-3 mb-3 rounded-lg overflow-hidden border">
            {levels.map((level, index) => {
              const colors = maturityColors[level.code];
              const descriptor = objective.maturityDescriptors[level.code];
              const descriptorText = lang === "fr" ? descriptor.fr : descriptor.en;

              return (
                <div
                  key={level.code}
                  className={cn(
                    "p-3 min-h-[100px]",
                    index < 4 && "border-r",
                    colors.bg
                  )}
                >
                  {/* Level Badge */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white",
                        colors.fill
                      )}
                    >
                      {level.level}
                    </div>
                    <span className={cn("text-xs font-medium", colors.text)}>
                      {level.name[lang]}
                    </span>
                  </div>

                  {/* Descriptor */}
                  <p className="text-xs text-muted-foreground">
                    {searchQuery
                      ? highlightMatch(descriptorText, searchQuery)
                      : descriptorText}
                  </p>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// =============================================================================
// SEARCH HIGHLIGHT (same pattern as ANS browser pq-card.tsx)
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
