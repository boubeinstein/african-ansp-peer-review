"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { QuestionnaireType } from "@/types/prisma-enums";
import {
  isANSResponseAnswered,
  isSMSResponseAnswered,
} from "@/lib/utils/assessment-helpers";

// Types
export type ANSResponseValue =
  | "SATISFACTORY"
  | "NOT_SATISFACTORY"
  | "NOT_APPLICABLE"
  | "NOT_REVIEWED";

export type SMSMaturityLevel = "A" | "B" | "C" | "D" | "E";

export interface QuestionData {
  id: string;
  pqNumber?: string;
  questionTextEn: string;
  questionTextFr: string;
  guidanceTextEn?: string;
  guidanceTextFr?: string;
  auditArea?: string;
  criticalElement?: string;
  smsComponent?: string;
  studyArea?: string;
  isPriorityPQ: boolean;
  requiresOnSite: boolean;
  weight: number;
  icaoReferences?: string[];
  categoryId?: string;
  categoryCode?: string;
  categoryName?: string;
}

export interface ResponseData {
  id: string;
  questionId: string;
  responseValue: ANSResponseValue | null;
  maturityLevel: SMSMaturityLevel | null;
  notes: string;
  evidenceUrls: string[];
  evidenceDescription: string;
  assessorNotes: string;
  internalNotes: string;
  isFlagged: boolean;
  isComplete: boolean;
}

export interface AssessmentData {
  id: string;
  title: string;
  type: string;
  status: string;
  questionnaireType: QuestionnaireType;
  questionnaire: {
    id: string;
    code: string;
    titleEn: string;
    titleFr: string;
  };
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
  };
  progress: number;
}

export type QuestionFilter = "all" | "answered" | "unanswered" | "flagged" | "priority";

interface AssessmentWorkspaceContextValue {
  // Assessment data
  assessment: AssessmentData | null;
  isLoading: boolean;
  error: string | null;

  // Questions
  questions: QuestionData[];
  responses: Map<string, ResponseData>;
  currentQuestionIndex: number;
  currentQuestion: QuestionData | null;
  currentResponse: ResponseData | null;

  // Navigation
  goToQuestion: (index: number) => void;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  goToQuestionById: (questionId: string) => void;

  // Filtering
  filter: QuestionFilter;
  setFilter: (filter: QuestionFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredQuestions: QuestionData[];

  // Response actions
  updateResponse: (questionId: string, updates: Partial<ResponseData>) => void;
  saveCurrentResponse: () => Promise<void>;
  saveAllPendingResponses: () => Promise<void>;
  refreshResponseCount: () => Promise<void>;
  toggleFlag: (questionId: string) => void;
  hasPendingChanges: boolean;
  pendingSavesCount: number;
  canSubmit: boolean;

  // UI state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isEvidencePanelOpen: boolean;
  toggleEvidencePanel: () => void;
  isSubmitDialogOpen: boolean;
  setIsSubmitDialogOpen: (open: boolean) => void;

  // Navigation helpers
  isOnLastQuestion: boolean;

  // Save status
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  lastSavedAt: Date | null;

  // Progress
  answeredCount: number;
  totalCount: number;
  progressPercent: number;
}

const AssessmentWorkspaceContext = createContext<AssessmentWorkspaceContextValue | null>(null);

export function useAssessmentWorkspace() {
  const context = useContext(AssessmentWorkspaceContext);
  if (!context) {
    throw new Error(
      "useAssessmentWorkspace must be used within AssessmentWorkspaceProvider"
    );
  }
  return context;
}

interface AssessmentWorkspaceProviderProps {
  assessmentId: string;
  children: ReactNode;
}

export function AssessmentWorkspaceProvider({
  assessmentId,
  children,
}: AssessmentWorkspaceProviderProps) {
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [filter, setFilter] = useState<QuestionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [localEdits, setLocalEdits] = useState<Map<string, Partial<ResponseData>>>(new Map());
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  // Fetch assessment data
  const {
    data: assessmentData,
    isLoading: isLoadingAssessment,
    error: assessmentError,
  } = trpc.assessment.getById.useQuery(
    { id: assessmentId },
    { enabled: !!assessmentId }
  );

  // Fetch responses - load all questions at once (max 500)
  // Use refetchOnMount to ensure fresh data when loading the assessment
  const {
    data: responsesData,
    isLoading: isLoadingResponses,
  } = trpc.assessment.getResponses.useQuery(
    { assessmentId, limit: 500 },
    {
      enabled: !!assessmentId,
      refetchOnMount: "always", // Always fetch fresh data when mounting
      staleTime: 0, // Consider data stale immediately to ensure fresh counts
    }
  );

  // Save mutation
  const saveMutation = trpc.assessment.saveResponse.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      setLastSavedAt(new Date());
    },
    onError: (error) => {
      setSaveStatus("error");
      toast.error(error.message || "Failed to save response");
    },
  });

  // Derive questionnaire type - use this consistently for all type checks
  const questionnaireType = useMemo(() => {
    return assessmentData?.questionnaire?.type ?? null;
  }, [assessmentData?.questionnaire?.type]);

  const isANS = questionnaireType === "ANS_USOAP_CMA";

  // Build questions list from responses
  const questions = useMemo<QuestionData[]>(() => {
    if (!responsesData?.responses) return [];
    return responsesData.responses.map((r) => ({
      id: r.question.id,
      pqNumber: r.question.pqNumber ?? undefined,
      questionTextEn: r.question.questionTextEn,
      questionTextFr: r.question.questionTextFr,
      guidanceTextEn: r.question.guidanceEn ?? undefined,
      guidanceTextFr: r.question.guidanceFr ?? undefined,
      auditArea: r.question.auditArea ?? undefined,
      criticalElement: r.question.criticalElement ?? undefined,
      smsComponent: r.question.smsComponent ?? undefined,
      studyArea: r.question.studyArea ?? undefined,
      isPriorityPQ: r.question.isPriorityPQ,
      requiresOnSite: r.question.requiresOnSite,
      weight: r.question.weight,
    }));
  }, [responsesData]);

  // Build server responses map (immutable, from API)
  const serverResponses = useMemo(() => {
    const responseMap = new Map<string, ResponseData>();
    if (!responsesData?.responses) return responseMap;

    // Debug: Track value breakdown from API
    const apiValueBreakdown: Record<string, number> = {};

    for (const r of responsesData.responses) {
      const hasContent = (r.notes && r.notes.length > 0) ||
        (r.evidenceUrls && r.evidenceUrls.length > 0);

      // Track API values for debugging
      const val = r.responseValue ?? "NULL";
      apiValueBreakdown[val] = (apiValueBreakdown[val] || 0) + 1;

      responseMap.set(r.questionId, {
        id: r.id,
        questionId: r.questionId,
        responseValue: r.responseValue as ANSResponseValue | null,
        maturityLevel: r.maturityLevel as SMSMaturityLevel | null,
        notes: r.notes || "",
        evidenceUrls: r.evidenceUrls || [],
        evidenceDescription: "",
        assessorNotes: r.notes || "",
        internalNotes: "",
        isFlagged: false,
        isComplete: hasContent,
      });
    }

    // Debug: Log what came from API
    console.log("[SERVER_RESPONSES DEBUG] API data breakdown:", {
      totalFromAPI: responsesData.responses.length,
      valueBreakdown: apiValueBreakdown,
    });

    return responseMap;
  }, [responsesData]);

  // Merge server responses with local edits
  const localResponses = useMemo(() => {
    const merged = new Map<string, ResponseData>();
    for (const [id, response] of serverResponses) {
      const edits = localEdits.get(id);
      merged.set(id, edits ? { ...response, ...edits } : response);
    }
    // Add any new responses that don't exist on server yet
    for (const [id, edits] of localEdits) {
      if (!merged.has(id)) {
        merged.set(id, {
          id: "",
          questionId: id,
          responseValue: null,
          maturityLevel: null,
          notes: "",
          evidenceUrls: [],
          evidenceDescription: "",
          assessorNotes: "",
          internalNotes: "",
          isFlagged: false,
          isComplete: false,
          ...edits,
        } as ResponseData);
      }
    }
    return merged;
  }, [serverResponses, localEdits]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    // Don't apply answer-based filters if questionnaire type is unknown yet
    // (prevents showing all questions as "unanswered" during loading)
    if (questionnaireType === null && (filter === "answered" || filter === "unanswered" || filter === "flagged")) {
      return filtered;
    }

    // Apply filter - use centralized helpers for consistent counting
    switch (filter) {
      case "answered":
        filtered = filtered.filter((q) => {
          const response = localResponses.get(q.id);
          if (!response) return false; // No response = not answered
          if (isANS) {
            return isANSResponseAnswered(response.responseValue);
          }
          return isSMSResponseAnswered(response.maturityLevel);
        });
        break;
      case "unanswered":
        filtered = filtered.filter((q) => {
          const response = localResponses.get(q.id);
          if (!response) return true; // No response = unanswered
          if (isANS) {
            return !isANSResponseAnswered(response.responseValue);
          }
          return !isSMSResponseAnswered(response.maturityLevel);
        });
        break;
      case "flagged":
        filtered = filtered.filter((q) => {
          const response = localResponses.get(q.id);
          return response?.isFlagged === true;
        });
        break;
      case "priority":
        filtered = filtered.filter((q) => q.isPriorityPQ);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.pqNumber?.toLowerCase().includes(query) ||
          q.questionTextEn.toLowerCase().includes(query) ||
          q.questionTextFr.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [questions, filter, searchQuery, localResponses, questionnaireType, isANS]);

  // Current question and response
  const currentQuestion = filteredQuestions[currentQuestionIndex] || null;
  const currentResponse = currentQuestion
    ? localResponses.get(currentQuestion.id) || null
    : null;

  // Navigation
  const goToQuestion = useCallback(
    (index: number) => {
      if (index >= 0 && index < filteredQuestions.length) {
        setCurrentQuestionIndex(index);
      }
    },
    [filteredQuestions.length]
  );

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }, [currentQuestionIndex, filteredQuestions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  const goToQuestionById = useCallback(
    (questionId: string) => {
      const index = filteredQuestions.findIndex((q) => q.id === questionId);
      if (index !== -1) {
        setCurrentQuestionIndex(index);
      }
    },
    [filteredQuestions]
  );

  // Update response locally
  const updateResponse = useCallback(
    (questionId: string, updates: Partial<ResponseData>) => {
      setLocalEdits((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(questionId) || {};
        newMap.set(questionId, { ...existing, ...updates });
        return newMap;
      });
      setPendingChanges((prev) => new Set(prev).add(questionId));
      setSaveStatus("unsaved");
    },
    []
  );

  // Save current response
  const saveCurrentResponse = useCallback(async () => {
    if (!currentQuestion || !currentResponse) return;

    setSaveStatus("saving");
    try {
      await saveMutation.mutateAsync({
        assessmentId,
        questionId: currentQuestion.id,
        responseValue: currentResponse.responseValue,
        maturityLevel: currentResponse.maturityLevel,
        notes: currentResponse.notes || undefined,
        evidenceUrls: currentResponse.evidenceUrls,
      });
      setPendingChanges((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentQuestion.id);
        return newSet;
      });
    } catch {
      // Error handled in mutation
    }
  }, [assessmentId, currentQuestion, currentResponse, saveMutation]);

  // Save ALL pending responses (for submission)
  const saveAllPendingResponses = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    setSaveStatus("saving");
    const pendingQuestionIds = Array.from(pendingChanges);

    try {
      // Save all pending responses in parallel
      await Promise.all(
        pendingQuestionIds.map(async (questionId) => {
          const response = localResponses.get(questionId);
          if (!response) return;

          await saveMutation.mutateAsync({
            assessmentId,
            questionId,
            responseValue: response.responseValue,
            maturityLevel: response.maturityLevel,
            notes: response.notes || undefined,
            evidenceUrls: response.evidenceUrls,
          });
        })
      );

      // Clear all pending changes
      setPendingChanges(new Set());
      setSaveStatus("saved");
      setLastSavedAt(new Date());
    } catch {
      setSaveStatus("error");
    }
  }, [assessmentId, pendingChanges, localResponses, saveMutation]);

  // Computed: has pending changes
  const hasPendingChanges = pendingChanges.size > 0;
  const pendingSavesCount = pendingChanges.size;

  // Refresh response count from server (for accurate submission check)
  const utils = trpc.useUtils();
  const refreshResponseCount = useCallback(async () => {
    try {
      await utils.assessment.getResponseCount.invalidate({ assessmentId });
    } catch {
      // Silently fail - this is just a refresh
    }
  }, [assessmentId, utils]);

  // Toggle flag
  const toggleFlag = useCallback(
    (questionId: string) => {
      const response = localResponses.get(questionId);
      updateResponse(questionId, { isFlagged: !response?.isFlagged });
    },
    [localResponses, updateResponse]
  );

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  // Toggle evidence panel
  const toggleEvidencePanel = useCallback(() => {
    setIsEvidencePanelOpen((prev) => !prev);
  }, []);

  // Progress calculations - use centralized helper for consistent counting
  const answeredCount = useMemo(() => {
    // Don't count if questionnaire type is unknown
    if (questionnaireType === null) return 0;

    let count = 0;
    const valueBreakdown: Record<string, number> = {};

    for (const response of localResponses.values()) {
      // Track all response values for debugging
      const val = response.responseValue ?? "NULL";
      valueBreakdown[val] = (valueBreakdown[val] || 0) + 1;

      if (isANS) {
        // Use centralized helper for ANS responses
        if (isANSResponseAnswered(response.responseValue)) {
          count++;
        }
      } else {
        // Use centralized helper for SMS responses
        if (isSMSResponseAnswered(response.maturityLevel)) {
          count++;
        }
      }
    }

    // Debug: Log the actual breakdown
    console.log("[ANSWERED_COUNT DEBUG]", {
      questionnaireType,
      isANS,
      totalResponses: localResponses.size,
      answeredCount: count,
      valueBreakdown,
    });

    return count;
  }, [localResponses, questionnaireType, isANS]);

  const totalCount = questions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const isOnLastQuestion = currentQuestionIndex >= filteredQuestions.length - 1;

  // Can submit: all questions answered, no pending saves, status is editable
  const canSubmit = useMemo(() => {
    const isEditable = assessmentData?.status === "DRAFT";
    const allAnswered = answeredCount >= totalCount && totalCount > 0;
    const notSaving = saveStatus !== "saving" && pendingChanges.size === 0;

    return isEditable && allAnswered && notSaving;
  }, [assessmentData?.status, answeredCount, totalCount, saveStatus, pendingChanges.size]);

  // Auto-save effect (debounced) - saves ALL pending changes
  useEffect(() => {
    if (pendingChanges.size === 0) return;

    const timer = setTimeout(async () => {
      // Save all pending responses, not just current question
      if (pendingChanges.size > 0) {
        console.log("[AUTO_SAVE] Saving", pendingChanges.size, "pending changes");

        const pendingQuestionIds = Array.from(pendingChanges);
        setSaveStatus("saving");

        try {
          // Save all pending responses
          for (const questionId of pendingQuestionIds) {
            const response = localResponses.get(questionId);
            if (!response) continue;

            await saveMutation.mutateAsync({
              assessmentId,
              questionId,
              responseValue: response.responseValue,
              maturityLevel: response.maturityLevel,
              notes: response.notes || undefined,
              evidenceUrls: response.evidenceUrls,
            });

            // Remove from pending after successful save
            setPendingChanges((prev) => {
              const newSet = new Set(prev);
              newSet.delete(questionId);
              return newSet;
            });
          }

          setSaveStatus("saved");
          setLastSavedAt(new Date());
          console.log("[AUTO_SAVE] All pending changes saved successfully");
        } catch (error) {
          console.error("[AUTO_SAVE] Error saving:", error);
          setSaveStatus("error");
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [pendingChanges, localResponses, assessmentId, saveMutation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToPreviousQuestion();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNextQuestion();
          break;
        case "f":
        case "F":
          if (currentQuestion) {
            e.preventDefault();
            toggleFlag(currentQuestion.id);
          }
          break;
        case "s":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            saveCurrentResponse();
          }
          break;
        case "Enter":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            saveCurrentResponse().then(() => goToNextQuestion());
          }
          break;
        case "Escape":
          setIsEvidencePanelOpen(false);
          break;
        // Quick response for ANS (1-4)
        case "1":
          if (isANS && currentQuestion) {
            updateResponse(currentQuestion.id, { responseValue: "SATISFACTORY" });
          }
          break;
        case "2":
          if (isANS && currentQuestion) {
            updateResponse(currentQuestion.id, { responseValue: "NOT_SATISFACTORY" });
          }
          break;
        case "3":
          if (isANS && currentQuestion) {
            updateResponse(currentQuestion.id, { responseValue: "NOT_APPLICABLE" });
          }
          break;
        case "4":
          if (isANS && currentQuestion) {
            updateResponse(currentQuestion.id, { responseValue: "NOT_REVIEWED" });
          }
          break;
        // Quick response for SMS (A-E)
        case "a":
        case "A":
          if (!isANS && currentQuestion && !e.ctrlKey && !e.metaKey) {
            updateResponse(currentQuestion.id, { maturityLevel: "A" });
          }
          break;
        case "b":
        case "B":
          if (!isANS && currentQuestion) {
            updateResponse(currentQuestion.id, { maturityLevel: "B" });
          }
          break;
        case "c":
        case "C":
          if (!isANS && currentQuestion && !e.ctrlKey && !e.metaKey) {
            updateResponse(currentQuestion.id, { maturityLevel: "C" });
          }
          break;
        case "d":
        case "D":
          if (!isANS && currentQuestion) {
            updateResponse(currentQuestion.id, { maturityLevel: "D" });
          }
          break;
        case "e":
        case "E":
          if (!isANS && currentQuestion) {
            updateResponse(currentQuestion.id, { maturityLevel: "E" });
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isANS,
    currentQuestion,
    goToNextQuestion,
    goToPreviousQuestion,
    saveCurrentResponse,
    toggleFlag,
    updateResponse,
  ]);

  // Build assessment object
  const assessment: AssessmentData | null = assessmentData
    ? {
        id: assessmentData.id,
        title: (assessmentData as { title?: string }).title || `${assessmentData.organization.nameEn} - ${assessmentData.type}`,
        type: assessmentData.type,
        status: assessmentData.status,
        questionnaireType: assessmentData.questionnaire.type,
        questionnaire: {
          id: assessmentData.questionnaire.id,
          code: assessmentData.questionnaire.code,
          titleEn: assessmentData.questionnaire.titleEn,
          titleFr: assessmentData.questionnaire.titleFr,
        },
        organization: {
          id: assessmentData.organization.id,
          nameEn: assessmentData.organization.nameEn,
          nameFr: assessmentData.organization.nameFr,
        },
        progress: progressPercent,
      }
    : null;

  const isLoading = isLoadingAssessment || isLoadingResponses;
  const error = assessmentError?.message || null;

  const value: AssessmentWorkspaceContextValue = {
    assessment,
    isLoading,
    error,
    questions,
    responses: localResponses,
    currentQuestionIndex,
    currentQuestion,
    currentResponse,
    goToQuestion,
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestionById,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    filteredQuestions,
    updateResponse,
    saveCurrentResponse,
    saveAllPendingResponses,
    refreshResponseCount,
    toggleFlag,
    hasPendingChanges,
    pendingSavesCount,
    canSubmit,
    isSidebarOpen,
    toggleSidebar,
    isEvidencePanelOpen,
    toggleEvidencePanel,
    isSubmitDialogOpen,
    setIsSubmitDialogOpen,
    isOnLastQuestion,
    saveStatus,
    lastSavedAt,
    answeredCount,
    totalCount,
    progressPercent,
  };

  return (
    <AssessmentWorkspaceContext.Provider value={value}>
      {children}
    </AssessmentWorkspaceContext.Provider>
  );
}
