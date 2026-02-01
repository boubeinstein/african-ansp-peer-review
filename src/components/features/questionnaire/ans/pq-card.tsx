"use client";

import { useTranslations } from "next-intl";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";
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
import { USOAP_AUDIT_AREAS, CRITICAL_ELEMENTS } from "@/lib/questionnaire/constants";
import type { USOAPAuditArea, CriticalElement } from "@/types/prisma-enums";

interface ICAOReference {
  id: string;
  referenceType: string;
  document: string;
  chapter: string | null;
  description: string | null;
}

interface PQCardProps {
  question: {
    id: string;
    pqNumber: string;
    questionTextEn: string;
    questionTextFr: string;
    guidanceEn: string | null;
    guidanceFr: string | null;
    auditArea: USOAPAuditArea | null;
    criticalElement: CriticalElement | null;
    isPriorityPQ: boolean;
    requiresOnSite: boolean;
    pqStatus: "NO_CHANGE" | "REVISED" | "NEW";
    icaoReferences: ICAOReference[];
  };
  locale: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function PQCard({ question, locale, isExpanded, onToggle }: PQCardProps) {
  const t = useTranslations("ansBrowser");
  const lang = locale === "fr" ? "fr" : "en";

  const questionText =
    lang === "fr" ? question.questionTextFr : question.questionTextEn;
  const guidanceText =
    lang === "fr" ? question.guidanceFr : question.guidanceEn;

  const auditAreaMeta = question.auditArea
    ? USOAP_AUDIT_AREAS[question.auditArea]
    : null;
  const ceMeta = question.criticalElement
    ? CRITICAL_ELEMENTS[question.criticalElement]
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
                  {questionText}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {auditAreaMeta && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                    >
                      {auditAreaMeta.code}: {auditAreaMeta.name[lang]}
                    </Badge>
                  )}
                  {ceMeta && (
                    <Badge
                      variant="secondary"
                      className="bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400"
                    >
                      {ceMeta.code.replace("_", "-")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Expand Button */}
              <Button variant="ghost" size="icon" className="shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <CardContent className="p-4 bg-muted/20">
            <div className="space-y-4">
              {/* Guidance */}
              {guidanceText && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    {t("pq.guidance")}
                  </h4>
                  <p className="text-sm text-muted-foreground pl-6">
                    {guidanceText}
                  </p>
                </div>
              )}

              {/* ICAO References */}
              {question.icaoReferences.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                    {t("pq.icaoReferences")}
                  </h4>
                  <div className="space-y-2 pl-6">
                    {question.icaoReferences.map((ref) => (
                      <div
                        key={ref.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {ref.referenceType}
                        </Badge>
                        <div>
                          <span className="font-medium">{ref.document}</span>
                          {ref.chapter && (
                            <span className="text-muted-foreground">
                              {" "}
                              - {ref.chapter}
                            </span>
                          )}
                          {ref.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ref.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Critical Element Description */}
              {ceMeta && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    >
                      {ceMeta.code.replace("_", "-")}
                    </Badge>
                    {ceMeta.name[lang]}
                  </h4>
                  <p className="text-sm text-muted-foreground pl-6">
                    {ceMeta.description[lang]}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
