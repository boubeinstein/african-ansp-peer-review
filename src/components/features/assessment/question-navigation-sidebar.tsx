"use client";

import { useMemo, useEffect, useRef, useCallback } from "react";
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

type QuestionStatus = "complete" | "answered" | "flagged" | "unanswered";

interface QuestionNavItemProps {
  question: QuestionData;
  globalIndex: number;
  status: QuestionStatus;
  isActive: boolean;
  onClick: () => void;
  questionText: string;
  itemRef?: React.RefObject<HTMLButtonElement | null>;
}

function QuestionNavItem({
  question,
  globalIndex,
  status,
  isActive,
  onClick,
  questionText,
  itemRef,
}: QuestionNavItemProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={itemRef}
            onClick={onClick}
            className={cn(
              "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {/* Status indicator */}
            <span className="shrink-0 mt-0.5">
              {status === "complete" && (
                <CheckCircle
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-primary-foreground" : "text-green-600"
                  )}
                />
              )}
              {status === "answered" && (
                <Circle
                  className={cn(
                    "h-4 w-4 fill-current",
                    isActive ? "text-primary-foreground" : "text-blue-600"
                  )}
                />
              )}
              {status === "flagged" && (
                <Flag
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-primary-foreground" : "text-yellow-600"
                  )}
                />
              )}
              {status === "unanswered" && (
                <Circle
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
              )}
            </span>

            {/* Question content */}
            <div className="flex-1 min-w-0">
              {/* Question number and badges */}
              <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                <span
                  className={cn(
                    "font-mono text-xs shrink-0 font-medium",
                    isActive ? "text-primary-foreground" : "text-foreground"
                  )}
                >
                  {question.pqNumber || `Q${globalIndex + 1}`}
                </span>
                {question.isPriorityPQ && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] px-1 py-0 h-4"
                  >
                    PPQ
                  </Badge>
                )}
              </div>

              {/* Question text - 2 lines with ellipsis */}
              <p
                className={cn(
                  "text-xs leading-relaxed line-clamp-2",
                  isActive
                    ? "text-primary-foreground opacity-90"
                    : "text-muted-foreground"
                )}
              >
                {questionText}
              </p>
            </div>
          </button>
        </TooltipTrigger>

        {/* Full question text on hover */}
        <TooltipContent
          side="right"
          className="max-w-sm p-3"
          sideOffset={5}
        >
          <p className="text-sm">
            <strong className="font-mono">
              {question.pqNumber || `Q${globalIndex + 1}`}:
            </strong>{" "}
            {questionText}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function QuestionNavigationSidebar() {
  const locale = useLocale();
  const t = useTranslations("workspace");
  const {
    assessment,
    responses,
    filteredQuestions,
    currentQuestion,
    currentQuestionIndex,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    goToQuestionById,
    goToNextQuestion,
    goToPreviousQuestion,
    isSidebarOpen,
    toggleSidebar,
    answeredCount,
    totalCount,
    progressPercent,
  } = useAssessmentWorkspace();

  const isANS = assessment?.questionnaireType === "ANS_USOAP_CMA";

  // Ref for the active question item for auto-scrolling
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active question when it changes
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeItem = activeItemRef.current;

      // Calculate if the item is outside the visible area
      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();

      const isAboveViewport = itemRect.top < containerRect.top;
      const isBelowViewport = itemRect.bottom > containerRect.bottom;

      if (isAboveViewport || isBelowViewport) {
        activeItem.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [currentQuestionIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle if sidebar is focused or we're in the workspace
      if (!isSidebarOpen) return;

      // Don't interfere with input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goToPreviousQuestion();
      } else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goToNextQuestion();
      }
    },
    [isSidebarOpen, goToNextQuestion, goToPreviousQuestion]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
  const getQuestionStatus = (question: QuestionData): QuestionStatus => {
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

  // Get question text in current locale
  const getQuestionText = (question: QuestionData): string => {
    return locale === "fr" ? question.questionTextFr : question.questionTextEn;
  };

  const filterOptions: { value: QuestionFilter; label: string }[] = [
    { value: "all", label: t("filters.all") },
    { value: "unanswered", label: t("filters.unanswered") },
    { value: "flagged", label: t("filters.flagged") },
    ...(isANS
      ? [{ value: "priority" as QuestionFilter, label: t("filters.priority") }]
      : []),
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
            className="flex flex-col border-r bg-background h-full min-h-0"
          >
            {/* Header - fixed */}
            <div className="flex-shrink-0 flex items-center justify-between border-b p-4">
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

            {/* Progress bar - fixed */}
            <div className="flex-shrink-0 px-4 py-3 border-b">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {t("sidebar.overallProgress")}
                </span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Search and filter - fixed */}
            <div className="flex-shrink-0 space-y-3 p-4 border-b">
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

              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as QuestionFilter)}
              >
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

            {/* Question list - SCROLLABLE */}
            <div
              ref={scrollContainerRef}
              className="flex-1 min-h-0 overflow-y-auto question-list-scroll"
            >
              <div className="p-2">
                {groupedQuestions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t("sidebar.noQuestions")}
                  </div>
                ) : (
                  groupedQuestions.map((group) => (
                    <div key={group.code} className="mb-4">
                      {/* Group header */}
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1 sticky top-0 bg-background z-10">
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
                      <div className="space-y-1">
                        {group.questions.map((question) => {
                          const status = getQuestionStatus(question);
                          const isActive = currentQuestion?.id === question.id;
                          const globalIndex = filteredQuestions.findIndex(
                            (q) => q.id === question.id
                          );

                          return (
                            <QuestionNavItem
                              key={question.id}
                              question={question}
                              globalIndex={globalIndex}
                              status={status}
                              isActive={isActive}
                              onClick={() => goToQuestionById(question.id)}
                              questionText={getQuestionText(question)}
                              itemRef={isActive ? activeItemRef : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer with keyboard shortcuts hint - fixed */}
            <div className="flex-shrink-0 border-t p-3 text-xs text-muted-foreground bg-muted/30">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">
                    ↑/k
                  </kbd>{" "}
                  {t("shortcuts.prev")}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">
                    ↓/j
                  </kbd>{" "}
                  {t("shortcuts.next")}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">
                    F
                  </kbd>{" "}
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
