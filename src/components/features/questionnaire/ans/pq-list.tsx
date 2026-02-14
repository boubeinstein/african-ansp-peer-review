"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileQuestion,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PQCard } from "./pq-card";
import { trpc } from "@/lib/trpc";
import type { ANSReviewArea } from "@/types/prisma-enums";

// The 7 ANS review areas (excludes SMS which uses separate questionnaire)
type ANSOnlyArea = "ATS" | "FPD" | "AIS" | "MAP" | "MET" | "CNS" | "SAR";

interface PQListProps {
  locale: string;
  filters: {
    reviewAreas: ANSReviewArea[];
    isPriority: boolean;
    isNewRevised: boolean;
    search: string;
  };
  onCountsLoaded: (counts: Record<string, number>) => void;
}

// Review area metadata for section headers
const AREA_COLORS: Record<string, string> = {
  ATS: "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  FPD: "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20",
  AIS: "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20",
  MAP: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
  MET: "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20",
  CNS: "border-violet-500 bg-violet-50/50 dark:bg-violet-950/20",
  SAR: "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
};

const AREA_BADGE_COLORS: Record<string, string> = {
  ATS: "bg-blue-600",
  FPD: "bg-indigo-600",
  AIS: "bg-teal-600",
  MAP: "bg-emerald-600",
  MET: "bg-sky-600",
  CNS: "bg-violet-600",
  SAR: "bg-orange-600",
};

// Mock data types
interface MockQuestion {
  id: string;
  pqNumber: string;
  questionTextEn: string;
  questionTextFr: string;
  guidanceEn: string | null;
  guidanceFr: string | null;
  reviewArea: ANSReviewArea | null;
  isPriorityPQ: boolean;
  requiresOnSite: boolean;
  pqStatus: "NO_CHANGE" | "REVISED" | "NEW";
  icaoReferences: Array<{
    id: string;
    referenceType: string;
    document: string;
    chapter: string | null;
    description: string | null;
  }>;
}

interface AreaGroup {
  reviewArea: string;
  questions: MockQuestion[];
  filteredCount: number;
}

function generateMockGroups(filters: PQListProps["filters"]): {
  groups: AreaGroup[];
  totalCount: number;
  countsByArea: Record<string, number>;
} {
  const areaConfig: Array<{
    area: ANSReviewArea;
    prefix: string;
    count: number;
    sampleTexts: string[];
  }> = [
    {
      area: "ATS",
      prefix: "ATM",
      count: 56,
      sampleTexts: [
        "Are the relevant ICAO documents and other technical and regulatory publications readily available to all ANS internal safety personnel?",
        "Has the ANSP established for ANS internal safety auditors: a) job descriptions b) appropriate qualifications c) training requirements?",
        "Has the ANSP implemented procedures for the provision of air traffic services in accordance with ICAO Standards?",
        "Does the ANSP maintain an adequate system for monitoring controller competency and proficiency?",
      ],
    },
    {
      area: "FPD",
      prefix: "IFPD",
      count: 12,
      sampleTexts: [
        "Has the ANSP promulgated procedures as bases for instrument flight procedures design?",
        "Does the ANSP ensure that flight procedure designers are adequately qualified and trained?",
        "Has the ANSP established a quality assurance programme for flight procedure design?",
      ],
    },
    {
      area: "AIS",
      prefix: "AIS",
      count: 16,
      sampleTexts: [
        "Has the ANSP established an aeronautical information management system?",
        "Does the ANSP publish and maintain an Aeronautical Information Publication (AIP)?",
        "Has the ANSP implemented the NOTAM system in accordance with ICAO requirements?",
      ],
    },
    {
      area: "MAP",
      prefix: "CHART",
      count: 5,
      sampleTexts: [
        "Does the ANSP produce aeronautical charts in accordance with ICAO Annex 4 specifications?",
        "Has the ANSP established procedures for the update and maintenance of aeronautical charts?",
      ],
    },
    {
      area: "CNS",
      prefix: "CNS",
      count: 11,
      sampleTexts: [
        "Has the ANSP established a maintenance programme for CNS equipment?",
        "Does the ANSP ensure adequate communication coverage within its area of responsibility?",
        "Has the ANSP implemented surveillance systems in accordance with ICAO requirements?",
      ],
    },
    {
      area: "MET",
      prefix: "MET",
      count: 17,
      sampleTexts: [
        "Does the ANSP provide meteorological information in accordance with ICAO Annex 3?",
        "Has the ANSP established procedures for the issuance of aviation weather warnings?",
        "Does the ANSP maintain adequate meteorological observation facilities?",
      ],
    },
    {
      area: "SAR",
      prefix: "SAR",
      count: 15,
      sampleTexts: [
        "Has the ANSP established search and rescue coordination procedures?",
        "Does the ANSP maintain an up-to-date SAR plan in accordance with ICAO Annex 12?",
        "Has the ANSP established alerting services to notify appropriate SAR authorities?",
      ],
    },
  ];

  const countsByArea: Record<string, number> = {};
  const groups: AreaGroup[] = [];

  for (const config of areaConfig) {
    countsByArea[config.area] = config.count;

    // Skip if filtered out
    if (
      filters.reviewAreas.length > 0 &&
      !filters.reviewAreas.includes(config.area)
    ) {
      continue;
    }

    const questions: MockQuestion[] = [];

    for (let i = 1; i <= config.count; i++) {
      const isPriority = i % 7 === 0;
      const requiresOnSite = i % 5 === 0;
      const pqStatus: MockQuestion["pqStatus"] =
        i % 15 === 0 ? "NEW" : i % 10 === 0 ? "REVISED" : "NO_CHANGE";
      const sampleText =
        config.sampleTexts[(i - 1) % config.sampleTexts.length];

      const q: MockQuestion = {
        id: `${config.prefix.toLowerCase()}-${i}`,
        pqNumber: `${config.prefix}${String(i).padStart(3, "0")}`,
        questionTextEn: sampleText,
        questionTextFr: `[FR] ${sampleText}`,
        guidanceEn:
          "Review the relevant documentation and verify that adequate procedures are in place. Check for evidence of implementation and compliance monitoring.",
        guidanceFr:
          "Examiner la documentation pertinente et vérifier que des procédures adéquates sont en place. Vérifier les preuves de mise en œuvre et de surveillance de la conformité.",
        reviewArea: config.area,
        isPriorityPQ: isPriority,
        requiresOnSite,
        pqStatus,
        icaoReferences: [
          {
            id: `ref-${config.prefix}-${i}-1`,
            referenceType: "STD",
            document: `Annex ${config.area === "ATS" ? "11" : config.area === "MET" ? "3" : config.area === "AIS" ? "15" : config.area === "MAP" ? "4" : config.area === "SAR" ? "12" : "10"}`,
            chapter: `Chapter ${1 + (i % 8)}`,
            description: null,
          },
        ],
      };

      // Apply filters
      if (filters.isPriority && !q.isPriorityPQ) continue;
      if (filters.isNewRevised && q.pqStatus === "NO_CHANGE") continue;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (
          !q.pqNumber.toLowerCase().includes(s) &&
          !q.questionTextEn.toLowerCase().includes(s) &&
          !q.questionTextFr.toLowerCase().includes(s)
        )
          continue;
      }

      questions.push(q);
    }

    if (questions.length > 0) {
      groups.push({
        reviewArea: config.area,
        questions,
        filteredCount: questions.length,
      });
    }
  }

  const totalCount = groups.reduce((sum, g) => sum + g.filteredCount, 0);
  return { groups, totalCount, countsByArea };
}

export function PQList({
  locale,
  filters,
  onCountsLoaded,
}: PQListProps) {
  const t = useTranslations("ansBrowser");
  const tAreas = useTranslations("reviewAreas");
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );

  // Filter to only valid ANS areas (exclude SMS)
  const validAnsAreas: ANSOnlyArea[] = ["ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR"];
  const filteredAreas = filters.reviewAreas.filter(
    (a): a is ANSOnlyArea => validAnsAreas.includes(a as ANSOnlyArea)
  );

  // Try real data from tRPC
  const { data, isLoading, error } = trpc.questionnaire.getANSQuestionsGrouped.useQuery(
    {
      reviewAreas: filteredAreas.length > 0 ? filteredAreas : undefined,
      isPriorityPQ: filters.isPriority || undefined,
      isNewOrRevised: filters.isNewRevised || undefined,
      search: filters.search || undefined,
    },
    {
      staleTime: 60_000,
    }
  );

  // Use real data if available, otherwise fall back to mock
  const mockData = useMemo(() => generateMockGroups(filters), [filters]);

  const hasRealData = data && data.groups.length > 0;
  const totalCount = hasRealData ? data.totalCount : mockData.totalCount;
  const countsByArea = hasRealData
    ? (data.countsByArea as Record<string, number>)
    : mockData.countsByArea;

  // Normalize groups into a common shape
  const groups: AreaGroup[] = useMemo(() => {
    if (hasRealData) {
      return data.groups.map((g) => ({
        reviewArea: g.reviewArea,
        filteredCount: g.filteredCount,
        questions: g.questions.map((q) => ({
          id: q.id,
          pqNumber: q.pqNumber ?? "",
          questionTextEn: q.questionTextEn,
          questionTextFr: q.questionTextFr,
          guidanceEn: q.guidanceEn,
          guidanceFr: q.guidanceFr,
          reviewArea: q.reviewArea,
          isPriorityPQ: q.isPriorityPQ,
          requiresOnSite: q.requiresOnSite,
          pqStatus: q.pqStatus as MockQuestion["pqStatus"],
          icaoReferences: q.icaoReferences.map((ref) => ({
            id: ref.id,
            referenceType: String(ref.referenceType),
            document: ref.document,
            chapter: ref.chapter,
            description: ref.description,
          })),
        })),
      }));
    }
    return mockData.groups;
  }, [hasRealData, data, mockData.groups]);

  // Propagate counts to parent
  useEffect(() => {
    if (Object.keys(countsByArea).length > 0) {
      onCountsLoaded(countsByArea);
    }
  }, [countsByArea, onCountsLoaded]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSection = (area: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(area)) {
        next.delete(area);
      } else {
        next.add(area);
      }
      return next;
    });
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error.title")}</AlertTitle>
        <AlertDescription>{t("error.description")}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-1">{t("empty.title")}</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {t("empty.description")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>
          {t("results.total", { count: totalCount })}
        </span>
        <span>
          {t("results.areas", { count: groups.length })}
        </span>
      </div>

      {/* Grouped Sections */}
      {groups.map((group) => {
        const area = group.reviewArea;
        const isCollapsed = collapsedSections.has(area);
        const areaName = tAreas(`${area}.name`);
        const areaDescription = tAreas(`${area}.description`);
        const colorClass = AREA_COLORS[area] || "";
        const badgeColor = AREA_BADGE_COLORS[area] || "bg-gray-600";

        return (
          <Collapsible
            key={area}
            open={!isCollapsed}
            onOpenChange={() => toggleSection(area)}
          >
            {/* Section Header */}
            <CollapsibleTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-l-4 cursor-pointer transition-colors hover:opacity-90",
                  colorClass
                )}
              >
                <div className="shrink-0">
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={cn(
                    "font-mono text-sm font-bold px-2 py-1 rounded text-white",
                    badgeColor
                  )}
                >
                  {area}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-base">{areaName}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {group.filteredCount} {t("section.pqs")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {areaDescription}
                  </p>
                </div>
              </div>
            </CollapsibleTrigger>

            {/* Questions in this area */}
            <CollapsibleContent>
              <div className="space-y-2 mt-2 ml-2 pl-4 border-l-2 border-muted">
                {group.questions.map((question) => (
                  <PQCard
                    key={question.id}
                    question={{
                      ...question,
                      reviewArea: question.reviewArea as ANSReviewArea | null,
                    }}
                    locale={locale}
                    isExpanded={expandedQuestions.has(question.id)}
                    onToggle={() => toggleQuestion(question.id)}
                    searchQuery={filters.search}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
