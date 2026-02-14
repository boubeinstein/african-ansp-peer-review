"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Info,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ANSReviewArea } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

interface ICAOReference {
  id: string;
  referenceType: string;
  document: string;
  chapter: string | null;
  description: string | null;
}

export interface AssessmentContext {
  assessmentId: string;
  responseStatus: "satisfactory" | "notSatisfactory" | "notApplicable" | "unanswered";
}

export interface PQCardProps {
  question: {
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
    icaoReferences: ICAOReference[];
  };
  locale: string;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery?: string;
  assessmentContext?: AssessmentContext;
}

// =============================================================================
// REVIEW AREA COLORS
// =============================================================================

const AREA_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  ATS: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  FPD: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400" },
  AIS: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-400" },
  MAP: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  MET: { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-400" },
  CNS: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-400" },
  SAR: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
};

const RESPONSE_STATUS_STYLES: Record<string, string> = {
  satisfactory: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  notSatisfactory: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  notApplicable: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  unanswered: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

// =============================================================================
// GUIDANCE TEXT PARSER
// =============================================================================

interface GuidanceParsed {
  items: GuidanceNode[];
}

type GuidanceNode =
  | { type: "text"; content: string }
  | { type: "numbered"; number: string; content: string; subItems: { letter: string; content: string }[] }
  | { type: "note"; content: string };

/**
 * Parse guidance text into structured items.
 * Recognizes:
 *   - Numbered items: "1)" or "1." at the start of a line
 *   - Sub-items: "a)" or "a." at the start of a line (indented)
 *   - Notes: lines starting with "Note:" or "Note to the Review Team:"
 *   - Plain text paragraphs
 */
function parseGuidanceText(text: string): GuidanceParsed {
  const lines = text.split("\n");
  const items: GuidanceNode[] = [];
  let currentNumbered: GuidanceNode | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for "Note:" or "Note to the Review Team:" prefix
    const noteMatch = line.match(/^Note(?:\s+to\s+the\s+Review\s+Team)?:\s*(.*)/i);
    if (noteMatch) {
      // Flush any pending numbered item
      if (currentNumbered) {
        items.push(currentNumbered);
        currentNumbered = null;
      }
      items.push({ type: "note", content: noteMatch[1] || line });
      continue;
    }

    // Check for numbered items: "1)" or "1."
    const numberedMatch = line.match(/^(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      // Flush previous numbered item
      if (currentNumbered) {
        items.push(currentNumbered);
      }
      currentNumbered = {
        type: "numbered",
        number: numberedMatch[1],
        content: numberedMatch[2],
        subItems: [],
      };
      continue;
    }

    // Check for sub-items: "a)" or "a." — only valid inside a numbered item
    const subItemMatch = line.match(/^([a-z])[.)]\s+(.*)/);
    if (subItemMatch && currentNumbered && currentNumbered.type === "numbered") {
      currentNumbered.subItems.push({
        letter: subItemMatch[1],
        content: subItemMatch[2],
      });
      continue;
    }

    // Plain text — flush numbered item first, then add as text
    if (currentNumbered) {
      items.push(currentNumbered);
      currentNumbered = null;
    }
    // Merge adjacent text nodes
    const lastItem = items[items.length - 1];
    if (lastItem && lastItem.type === "text") {
      lastItem.content += " " + line;
    } else {
      items.push({ type: "text", content: line });
    }
  }

  // Flush trailing numbered item
  if (currentNumbered) {
    items.push(currentNumbered);
  }

  // If no structure was found, wrap the entire text as a single text node
  if (items.length === 0) {
    items.push({ type: "text", content: text });
  }

  return { items };
}

/**
 * Linkify PQ cross-references in text.
 * Matches patterns like "PQ ATM001", "PQ 7.012", "ATM001", "IFPD005", etc.
 */
function linkifyPQReferences(text: string): React.ReactNode {
  // Match PQ references: optional "PQ " prefix + known prefixes + digits
  const pqRefRegex = /(?:PQ\s+)?(?:(ATM|IFPD|AIS|CHART|CNS|MET|SAR)\d{3})/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = pqRefRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const ref = match[0];
    // Extract just the PQ number (without "PQ " prefix)
    const pqNum = ref.replace(/^PQ\s+/, "");
    parts.push(
      <span
        key={`${match.index}-${pqNum}`}
        className="font-mono text-blue-600 dark:text-blue-400 font-medium"
        title={pqNum}
      >
        {ref}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (parts.length === 0) return text;
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

// =============================================================================
// SEARCH HIGHLIGHT
// =============================================================================

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// =============================================================================
// GUIDANCE RENDERER
// =============================================================================

function GuidanceContent({
  text,
  noteLabel,
}: {
  text: string;
  noteLabel: string;
}) {
  const parsed = parseGuidanceText(text);

  return (
    <div className="space-y-3">
      {parsed.items.map((item, idx) => {
        if (item.type === "note") {
          return (
            <div
              key={idx}
              className="flex gap-2 rounded-md border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-950/30"
            >
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div className="text-sm">
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  {noteLabel}:
                </span>{" "}
                <span className="text-muted-foreground">
                  {linkifyPQReferences(item.content)}
                </span>
              </div>
            </div>
          );
        }

        if (item.type === "numbered") {
          return (
            <div key={idx} className="text-sm text-muted-foreground">
              <div className="flex gap-2">
                <span className="font-semibold text-foreground shrink-0 w-5 text-right">
                  {item.number})
                </span>
                <span>{linkifyPQReferences(item.content)}</span>
              </div>
              {item.subItems.length > 0 && (
                <div className="ml-7 mt-1 space-y-0.5">
                  {item.subItems.map((sub) => (
                    <div key={sub.letter} className="flex gap-2">
                      <span className="text-muted-foreground/70 shrink-0 w-4 text-right">
                        {sub.letter})
                      </span>
                      <span>{linkifyPQReferences(sub.content)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // text node
        return (
          <p key={idx} className="text-sm text-muted-foreground">
            {linkifyPQReferences(item.content)}
          </p>
        );
      })}
    </div>
  );
}

// =============================================================================
// PQ CARD COMPONENT
// =============================================================================

export function PQCard({
  question,
  locale,
  isExpanded,
  onToggle,
  searchQuery,
  assessmentContext,
}: PQCardProps) {
  const t = useTranslations("ansBrowser");
  const lang = locale === "fr" ? "fr" : "en";
  const [guidanceOpen, setGuidanceOpen] = useState(false);

  const questionText =
    lang === "fr" ? question.questionTextFr : question.questionTextEn;
  const guidanceText =
    lang === "fr" ? question.guidanceFr : question.guidanceEn;

  const areaStyle = question.reviewArea
    ? AREA_BADGE_STYLES[question.reviewArea]
    : null;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card
        className={cn(
          "transition-all",
          isExpanded && "ring-2 ring-blue-500/20",
          question.pqStatus === "NEW" && "border-l-4 border-l-green-500",
          question.pqStatus === "REVISED" && "border-l-4 border-l-amber-500"
        )}
      >
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-4">
              {/* PQ Number */}
              <div className="shrink-0">
                <div
                  className={cn(
                    "font-mono text-sm font-bold px-2 py-1 rounded-md text-center min-w-[60px]",
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  )}
                >
                  {question.pqNumber}
                </div>
                {/* Status badges under PQ number */}
                <div className="flex flex-col gap-1 mt-2">
                  {question.isPriorityPQ && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
                    >
                      <Star className="h-3 w-3 mr-0.5 fill-current" />
                      {t("pq.priority")}
                    </Badge>
                  )}
                  {question.requiresOnSite && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                    >
                      <MapPin className="h-3 w-3 mr-0.5" />
                      {t("pq.onSite")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Question Content */}
              <div className="flex-1 min-w-0">
                {/* Amendment Status */}
                {question.pqStatus !== "NO_CHANGE" && (
                  <div className="mb-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        question.pqStatus === "NEW" &&
                          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        question.pqStatus === "REVISED" &&
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {question.pqStatus === "NEW"
                        ? t("pq.newIn2024")
                        : t("pq.revisedIn2024")}
                    </Badge>
                  </div>
                )}

                {/* Question Text */}
                <p
                  className={cn(
                    "text-sm",
                    !isExpanded && "line-clamp-2"
                  )}
                >
                  {highlightMatch(questionText, searchQuery || "")}
                </p>

                {/* ICAO References inline (collapsed view) */}
                {!isExpanded && question.icaoReferences.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {question.icaoReferences.map((ref) => (
                      <Badge
                        key={ref.id}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground"
                      >
                        {ref.document}
                        {ref.chapter ? `, ${ref.chapter}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Top-right: Review Area Badge + Expand */}
              <div className="shrink-0 flex flex-col items-end gap-2">
                {/* Review Area Badge */}
                {areaStyle && question.reviewArea && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-mono text-xs font-bold",
                      areaStyle.bg,
                      areaStyle.text
                    )}
                  >
                    {question.reviewArea}
                  </Badge>
                )}

                {/* Assessment Status Badge */}
                {assessmentContext && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      RESPONSE_STATUS_STYLES[assessmentContext.responseStatus]
                    )}
                  >
                    {t(`pq.responseStatus.${assessmentContext.responseStatus}`)}
                  </Badge>
                )}

                {/* Expand Button */}
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <CardContent className="p-4 bg-muted/20 space-y-4">
            {/* Guidance (collapsible within expanded card) */}
            {guidanceText && (
              <Collapsible open={guidanceOpen} onOpenChange={setGuidanceOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full text-left group">
                    <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                    <h4 className="text-sm font-semibold flex-1">
                      {t("pq.guidance")}
                    </h4>
                    {guidanceOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 pl-6">
                    <GuidanceContent
                      text={guidanceText}
                      noteLabel={t("pq.noteToTeam")}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* ICAO References (detailed) */}
            {question.icaoReferences.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                  {t("pq.icaoReferences")}
                </h4>
                <div className="flex flex-wrap gap-2 pl-6">
                  {question.icaoReferences.map((ref) => (
                    <Badge
                      key={ref.id}
                      variant="outline"
                      className="text-xs font-normal gap-1"
                    >
                      <span className="font-semibold text-foreground">
                        {ref.referenceType}
                      </span>
                      <span>{ref.document}</span>
                      {ref.chapter && (
                        <span className="text-muted-foreground">
                          {ref.chapter}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
                {/* Show descriptions if any ref has one */}
                {question.icaoReferences.some((r) => r.description) && (
                  <div className="mt-2 pl-6 space-y-1">
                    {question.icaoReferences
                      .filter((r) => r.description)
                      .map((ref) => (
                        <p
                          key={ref.id}
                          className="text-xs text-muted-foreground"
                        >
                          <span className="font-medium">{ref.document}:</span>{" "}
                          {ref.description}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Assessment link */}
            {assessmentContext && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      RESPONSE_STATUS_STYLES[assessmentContext.responseStatus]
                    )}
                  >
                    {t(`pq.responseStatus.${assessmentContext.responseStatus}`)}
                  </Badge>
                  <Link
                    href={`/${locale}/assessments/${assessmentContext.assessmentId}?question=${question.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1"
                  >
                    {t("pq.viewInAssessment")}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
