"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Circle,
  CheckCircle,
  Flag,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAssessmentWorkspace,
  type QuestionFilter,
  type QuestionData,
} from "./assessment-workspace-context";

interface QuestionGroup {
  code: string;
  name: string;
  questions: QuestionData[];
  answeredCount: number;
  totalCount: number;
}

export function QuestionNavigationSidebar() {
  const locale = useLocale();
  const t = useTranslations("workspace");
  const {
    assessment,
    responses,
    filteredQuestions,
    currentQuestion,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    goToQuestionById,
    isSidebarOpen,
    toggleSidebar,
    answeredCount,
    totalCount,
    progressPercent,
  } = useAssessmentWorkspace();

  const isANS = assessment?.questionnaireType === "ANS_USOAP_CMA";

  // Group questions by category
  const groupedQuestions = useMemo(() => {
    const groups: Map<string, QuestionGroup> = new Map();

    for (const question of filteredQuestions) {
      const code = isANS
        ? question.auditArea || "OTHER"
        : question.smsComponent || "OTHER";
      const name = code;

      if (!groups.has(code)) {
        groups.set(code, {
          code,
          name,
          questions: [],
          answeredCount: 0,
          totalCount: 0,
        });
      }

      const group = groups.get(code)!;
      group.questions.push(question);
      group.totalCount++;

      const response = responses.get(question.id);
      if (response) {
        const isAnswered = isANS
          ? response.responseValue && response.responseValue !== "NOT_REVIEWED"
          : !!response.maturityLevel;
        if (isAnswered) {
          group.answeredCount++;
        }
      }
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.code.localeCompare(b.code)
    );
  }, [filteredQuestions, responses, isANS]);

  // Get question status
  const getQuestionStatus = (question: QuestionData) => {
    const response = responses.get(question.id);
    if (!response) return "unanswered";

    if (response.isFlagged) return "flagged";

    const isAnswered = isANS
      ? response.responseValue && response.responseValue !== "NOT_REVIEWED"
      : !!response.maturityLevel;

    if (!isAnswered) return "unanswered";
    if (response.isComplete || response.evidenceUrls.length > 0) return "complete";
    return "answered";
  };

  const filterOptions: { value: QuestionFilter; label: string }[] = [
    { value: "all", label: t("filters.all") },
    { value: "unanswered", label: t("filters.unanswered") },
    { value: "flagged", label: t("filters.flagged") },
    ...(isANS ? [{ value: "priority" as QuestionFilter, label: t("filters.priority") }] : []),
  ];

  return (
    <>
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col border-r bg-background"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="font-semibold">{t("sidebar.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("sidebar.progress", {
                    answered: answeredCount,
                    total: totalCount,
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {t("sidebar.overallProgress")}
                </span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Search and filter */}
            <div className="space-y-3 p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("sidebar.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <Select value={filter} onValueChange={(v) => setFilter(v as QuestionFilter)}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Question list */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {groupedQuestions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t("sidebar.noQuestions")}
                  </div>
                ) : (
                  groupedQuestions.map((group) => (
                    <div key={group.code} className="mb-4">
                      {/* Group header */}
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {group.code}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {group.answeredCount}/{group.totalCount}
                          </span>
                        </div>
                        <Progress
                          value={
                            group.totalCount > 0
                              ? (group.answeredCount / group.totalCount) * 100
                              : 0
                          }
                          className="w-16 h-1.5"
                        />
                      </div>

                      {/* Questions in group */}
                      <div className="space-y-0.5">
                        {group.questions.map((question) => {
                          const status = getQuestionStatus(question);
                          const isActive = currentQuestion?.id === question.id;
                          const globalIndex = filteredQuestions.findIndex(
                            (q) => q.id === question.id
                          );

                          return (
                            <button
                              key={question.id}
                              onClick={() => goToQuestionById(question.id)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              )}
                            >
                              {/* Status indicator */}
                              <span className="shrink-0">
                                {status === "complete" && (
                                  <CheckCircle
                                    className={cn(
                                      "h-4 w-4",
                                      isActive
                                        ? "text-primary-foreground"
                                        : "text-green-600"
                                    )}
                                  />
                                )}
                                {status === "answered" && (
                                  <Circle
                                    className={cn(
                                      "h-4 w-4 fill-current",
                                      isActive
                                        ? "text-primary-foreground"
                                        : "text-blue-600"
                                    )}
                                  />
                                )}
                                {status === "flagged" && (
                                  <Flag
                                    className={cn(
                                      "h-4 w-4",
                                      isActive
                                        ? "text-primary-foreground"
                                        : "text-yellow-600"
                                    )}
                                  />
                                )}
                                {status === "unanswered" && (
                                  <Circle
                                    className={cn(
                                      "h-4 w-4",
                                      isActive
                                        ? "text-primary-foreground"
                                        : "text-muted-foreground"
                                    )}
                                  />
                                )}
                              </span>

                              {/* Question number */}
                              <span className="font-mono text-xs shrink-0">
                                {question.pqNumber || `Q${globalIndex + 1}`}
                              </span>

                              {/* Priority indicator */}
                              {question.isPriorityPQ && (
                                <AlertTriangle
                                  className={cn(
                                    "h-3 w-3 shrink-0",
                                    isActive
                                      ? "text-primary-foreground"
                                      : "text-orange-500"
                                  )}
                                />
                              )}

                              {/* Question text preview */}
                              <span className="truncate flex-1 text-xs">
                                {locale === "fr"
                                  ? question.questionTextFr
                                  : question.questionTextEn}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Footer with keyboard shortcuts hint */}
            <div className="border-t p-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-muted font-mono">
                    {"\u2190"}
                  </kbd>{" "}
                  {t("shortcuts.prev")}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-muted font-mono">
                    {"\u2192"}
                  </kbd>{" "}
                  {t("shortcuts.next")}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-muted font-mono">F</kbd>{" "}
                  {t("shortcuts.flag")}
                </span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Collapsed toggle button */}
      {!isSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="absolute left-2 top-20 z-10 h-8 w-8 rounded-full border bg-background shadow-sm"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
