"use client";

/**
 * Finding Entry Wizard Component
 *
 * A structured 5-step wizard for entering findings during peer reviews:
 * 1. Classification - Type, severity, audit area, ICAO reference
 * 2. Description - Bilingual titles and descriptions
 * 3. Evidence - Document uploads, interview note links
 * 4. Discussion - Host response, agreement/disagreement
 * 5. CAP Requirement - CAP required, timeline, responsible party
 *
 * Features:
 * - Auto-save draft functionality
 * - ICAO reference autocomplete
 * - Bilingual support (EN/FR)
 * - Progress tracking with stepper
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// UI Components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Icons
import {
  Loader2,
  FileText,
  Search,
  AlertTriangle,
  Check,
  CalendarIcon,
  X,
  ChevronRight,
  ChevronLeft,
  Save,
  Upload,
  MessageSquare,
  ClipboardList,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Building2,
  Link2,
  FileUp,
  Plus,
} from "lucide-react";

// Utilities and API
import { trpc } from "@/lib/trpc/client";
import { WizardStepper, type WizardStep } from "../assessment/wizard-steps/wizard-stepper";
import {
  USOAP_AUDIT_AREAS,
  CRITICAL_ELEMENTS,
  ICAO_REFERENCE_TYPES,
} from "@/lib/questionnaire/constants";

// Types
import type {
  FindingType,
  FindingSeverity,
  CriticalElement,
  USOAPAuditArea,
} from "@prisma/client";

// =============================================================================
// FORM SCHEMA
// =============================================================================

const findingWizardSchema = z.object({
  // Step 1: Classification
  findingType: z.enum([
    "NON_CONFORMITY",
    "OBSERVATION",
    "RECOMMENDATION",
    "GOOD_PRACTICE",
    "CONCERN",
  ]),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "OBSERVATION"]),
  auditArea: z.enum(["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"]).optional(),
  icaoReference: z.string().optional(),
  criticalElement: z
    .enum(["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"])
    .optional()
    .nullable(),
  questionId: z.string().optional().nullable(),

  // Step 2: Description
  titleEn: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  titleFr: z.string().max(200, "Title must be less than 200 characters").optional(),
  descriptionEn: z
    .string()
    .min(20, "Description must be at least 20 characters"),
  descriptionFr: z.string().optional(),
  evidenceSummary: z.string().optional(),

  // Step 3: Evidence
  evidenceEn: z.string().optional(),
  evidenceFr: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
  interviewNoteIds: z.array(z.string()).optional(),
  procedureReferences: z.array(z.string()).optional(),

  // Step 4: Discussion
  hostResponse: z.string().optional(),
  hostAgreement: z.enum(["AGREED", "PARTIALLY_AGREED", "DISAGREED"]).optional(),
  additionalContext: z.string().optional(),
  discussionNotes: z.string().optional(),

  // Step 5: CAP Requirement
  capRequired: z.boolean().default(true),
  targetCloseDate: z.date().optional().nullable(),
  suggestedTimeline: z.enum(["30_DAYS", "60_DAYS", "90_DAYS", "180_DAYS", "1_YEAR"]).optional(),
  responsibleParty: z.string().optional(),
  responsibleDepartment: z.string().optional(),
});

type FindingWizardValues = z.infer<typeof findingWizardSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface FindingEntryWizardProps {
  reviewId: string;
  organizationId: string;
  questionnaireId?: string;
  draftId?: string;
  initialData?: Partial<FindingWizardValues>;
  onSubmit: (data: FindingWizardValues) => void | Promise<void>;
  onCancel: () => void;
  onSaveDraft?: (data: Partial<FindingWizardValues>) => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
}

interface Question {
  id: string;
  pqNumber: string | null;
  questionTextEn: string;
  questionTextFr: string;
  category?: {
    id: string;
    nameEn: string;
    nameFr: string;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const FINDING_TYPES: FindingType[] = [
  "NON_CONFORMITY",
  "OBSERVATION",
  "RECOMMENDATION",
  "GOOD_PRACTICE",
  "CONCERN",
];

const SEVERITIES: FindingSeverity[] = ["CRITICAL", "MAJOR", "MINOR", "OBSERVATION"];

const CRITICAL_ELEMENT_LIST: CriticalElement[] = [
  "CE_1",
  "CE_2",
  "CE_3",
  "CE_4",
  "CE_5",
  "CE_6",
  "CE_7",
  "CE_8",
];

const AUDIT_AREAS: USOAPAuditArea[] = [
  "LEG",
  "ORG",
  "PEL",
  "OPS",
  "AIR",
  "AIG",
  "ANS",
  "AGA",
  "SSP",
];

// Auto-suggest severity based on finding type
const SUGGESTED_SEVERITY: Record<FindingType, FindingSeverity> = {
  NON_CONFORMITY: "MAJOR",
  OBSERVATION: "MINOR",
  RECOMMENDATION: "OBSERVATION",
  GOOD_PRACTICE: "OBSERVATION",
  CONCERN: "MINOR",
};

// Finding type styling
const FINDING_TYPE_STYLES: Record<FindingType, { color: string; icon: string }> = {
  NON_CONFORMITY: { color: "bg-red-100 text-red-800 border-red-300", icon: "AlertTriangle" },
  OBSERVATION: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "Eye" },
  RECOMMENDATION: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: "Lightbulb" },
  GOOD_PRACTICE: { color: "bg-green-100 text-green-800 border-green-300", icon: "CheckCircle" },
  CONCERN: { color: "bg-orange-100 text-orange-800 border-orange-300", icon: "AlertCircle" },
};

// Severity styling
const SEVERITY_STYLES: Record<FindingSeverity, { color: string; priority: number }> = {
  CRITICAL: { color: "bg-red-600 text-white", priority: 1 },
  MAJOR: { color: "bg-orange-500 text-white", priority: 2 },
  MINOR: { color: "bg-yellow-500 text-black", priority: 3 },
  OBSERVATION: { color: "bg-blue-400 text-white", priority: 4 },
};

// Timeline options
const TIMELINE_OPTIONS = [
  { value: "30_DAYS", label: "30 Days", days: 30 },
  { value: "60_DAYS", label: "60 Days", days: 60 },
  { value: "90_DAYS", label: "90 Days", days: 90 },
  { value: "180_DAYS", label: "180 Days (6 months)", days: 180 },
  { value: "1_YEAR", label: "1 Year", days: 365 },
];

// =============================================================================
// ICAO REFERENCE AUTOCOMPLETE DATA
// =============================================================================

const COMMON_ICAO_REFERENCES = [
  { code: "Annex 1", description: "Personnel Licensing" },
  { code: "Annex 2", description: "Rules of the Air" },
  { code: "Annex 3", description: "Meteorological Service" },
  { code: "Annex 4", description: "Aeronautical Charts" },
  { code: "Annex 5", description: "Units of Measurement" },
  { code: "Annex 6", description: "Operation of Aircraft" },
  { code: "Annex 7", description: "Aircraft Nationality and Registration Marks" },
  { code: "Annex 8", description: "Airworthiness of Aircraft" },
  { code: "Annex 9", description: "Facilitation" },
  { code: "Annex 10", description: "Aeronautical Telecommunications" },
  { code: "Annex 11", description: "Air Traffic Services" },
  { code: "Annex 12", description: "Search and Rescue" },
  { code: "Annex 13", description: "Aircraft Accident Investigation" },
  { code: "Annex 14", description: "Aerodromes" },
  { code: "Annex 15", description: "Aeronautical Information Services" },
  { code: "Annex 16", description: "Environmental Protection" },
  { code: "Annex 17", description: "Security" },
  { code: "Annex 18", description: "Dangerous Goods" },
  { code: "Annex 19", description: "Safety Management" },
  { code: "Doc 4444", description: "PANS-ATM" },
  { code: "Doc 7030", description: "Regional Supplementary Procedures" },
  { code: "Doc 8168", description: "PANS-OPS" },
  { code: "Doc 9426", description: "ATS Planning Manual" },
  { code: "Doc 9613", description: "PBN Manual" },
  { code: "Doc 9734", description: "Safety Oversight Manual" },
  { code: "Doc 9859", description: "Safety Management Manual" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function FindingEntryWizard({
  reviewId,
  organizationId,
  questionnaireId,
  draftId,
  initialData,
  onSubmit,
  onCancel,
  onSaveDraft,
  isLoading = false,
  className,
}: FindingEntryWizardProps) {
  const t = useTranslations("findings");
  const tCommon = useTranslations("common");
  const tWizard = useTranslations("findings.wizard");
  const locale = useLocale() as "en" | "fr";

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [questionSearch, setQuestionSearch] = useState("");
  const [isQuestionPopoverOpen, setIsQuestionPopoverOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [icaoSearch, setIcaoSearch] = useState("");
  const [isIcaoPopoverOpen, setIsIcaoPopoverOpen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form setup
  const form = useForm<FindingWizardValues>({
    resolver: zodResolver(findingWizardSchema) as any,
    defaultValues: {
      findingType: initialData?.findingType || "OBSERVATION",
      severity: initialData?.severity || "MINOR",
      auditArea: initialData?.auditArea,
      icaoReference: initialData?.icaoReference || "",
      criticalElement: initialData?.criticalElement || null,
      questionId: initialData?.questionId || null,
      titleEn: initialData?.titleEn || "",
      titleFr: initialData?.titleFr || "",
      descriptionEn: initialData?.descriptionEn || "",
      descriptionFr: initialData?.descriptionFr || "",
      evidenceSummary: initialData?.evidenceSummary || "",
      evidenceEn: initialData?.evidenceEn || "",
      evidenceFr: initialData?.evidenceFr || "",
      documentIds: initialData?.documentIds || [],
      interviewNoteIds: initialData?.interviewNoteIds || [],
      procedureReferences: initialData?.procedureReferences || [],
      hostResponse: initialData?.hostResponse || "",
      hostAgreement: initialData?.hostAgreement,
      additionalContext: initialData?.additionalContext || "",
      discussionNotes: initialData?.discussionNotes || "",
      capRequired: initialData?.capRequired ?? true,
      targetCloseDate: initialData?.targetCloseDate || null,
      suggestedTimeline: initialData?.suggestedTimeline,
      responsibleParty: initialData?.responsibleParty || "",
      responsibleDepartment: initialData?.responsibleDepartment || "",
    },
  });

  // Watch form values for auto-save and auto-suggestions
  const watchFindingType = useWatch({ control: form.control, name: "findingType" });
  const watchSeverity = useWatch({ control: form.control, name: "severity" });
  const watchSuggestedTimeline = useWatch({ control: form.control, name: "suggestedTimeline" });
  const formValues = useWatch({ control: form.control });

  // Auto-suggest severity when finding type changes
  useEffect(() => {
    if (watchFindingType) {
      const suggested = SUGGESTED_SEVERITY[watchFindingType];
      if (suggested && !initialData?.severity) {
        form.setValue("severity", suggested);
      }

      // Auto-set CAP required for non-conformities
      if (watchFindingType === "NON_CONFORMITY") {
        form.setValue("capRequired", true);
      }
    }
  }, [watchFindingType, form, initialData?.severity]);

  // Auto-set target close date when timeline is selected
  useEffect(() => {
    if (watchSuggestedTimeline) {
      const option = TIMELINE_OPTIONS.find((o) => o.value === watchSuggestedTimeline);
      if (option) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + option.days);
        form.setValue("targetCloseDate", targetDate);
      }
    }
  }, [watchSuggestedTimeline, form]);

  // Auto-save draft every 30 seconds if changes detected
  useEffect(() => {
    if (!onSaveDraft) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      await handleSaveDraft();
    }, 30000); // 30 seconds

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formValues, onSaveDraft]);

  // Query for questions (PQ search)
  const questionsQuery = trpc.questionnaire.getQuestions.useQuery(
    {
      questionnaireId: questionnaireId || "",
      search: questionSearch,
      limit: 20,
    },
    {
      enabled: !!questionnaireId && questionSearch.length >= 2,
    }
  );

  // Handlers
  const handleSaveDraft = useCallback(async () => {
    if (!onSaveDraft || isSavingDraft) return;

    setIsSavingDraft(true);
    try {
      await onSaveDraft(form.getValues());
      setLastSavedAt(new Date());
    } catch (error) {
      console.error("Failed to save draft:", error);
    } finally {
      setIsSavingDraft(false);
    }
  }, [onSaveDraft, form, isSavingDraft]);

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    form.setValue("questionId", question.id);
    setIsQuestionPopoverOpen(false);
    setQuestionSearch("");
  };

  const handleClearQuestion = () => {
    setSelectedQuestion(null);
    form.setValue("questionId", null);
  };

  const handleSelectIcaoReference = (reference: string) => {
    form.setValue("icaoReference", reference);
    setIsIcaoPopoverOpen(false);
    setIcaoSearch("");
  };

  const handleNextStep = async () => {
    // Validate current step before proceeding
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitForm = async (data: FindingWizardValues) => {
    await onSubmit(data);
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      setShowExitDialog(true);
    } else {
      onCancel();
    }
  };

  // Helper functions
  const getFieldsForStep = (step: number): (keyof FindingWizardValues)[] => {
    switch (step) {
      case 1:
        return ["findingType", "severity"];
      case 2:
        return ["titleEn", "descriptionEn"];
      case 3:
        return [];
      case 4:
        return [];
      case 5:
        return ["capRequired"];
      default:
        return [];
    }
  };

  const getQuestionText = (question: Question) => {
    return locale === "fr" ? question.questionTextFr : question.questionTextEn;
  };

  const getCategoryName = (question: Question) => {
    if (!question.category) return "";
    return locale === "fr" ? question.category.nameFr : question.category.nameEn;
  };

  const filteredIcaoReferences = COMMON_ICAO_REFERENCES.filter(
    (ref) =>
      ref.code.toLowerCase().includes(icaoSearch.toLowerCase()) ||
      ref.description.toLowerCase().includes(icaoSearch.toLowerCase())
  );

  // Build wizard steps
  const steps: WizardStep[] = [
    {
      title: tWizard("steps.classification.title"),
      description: tWizard("steps.classification.description"),
      isCompleted: currentStep > 1,
      isActive: currentStep === 1,
    },
    {
      title: tWizard("steps.description.title"),
      description: tWizard("steps.description.description"),
      isCompleted: currentStep > 2,
      isActive: currentStep === 2,
    },
    {
      title: tWizard("steps.evidence.title"),
      description: tWizard("steps.evidence.description"),
      isCompleted: currentStep > 3,
      isActive: currentStep === 3,
    },
    {
      title: tWizard("steps.discussion.title"),
      description: tWizard("steps.discussion.description"),
      isCompleted: currentStep > 4,
      isActive: currentStep === 4,
    },
    {
      title: tWizard("steps.cap.title"),
      description: tWizard("steps.cap.description"),
      isCompleted: false,
      isActive: currentStep === 5,
    },
  ];

  return (
    <>
      <div className={cn("space-y-6", className)}>
        {/* Header with auto-save indicator */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{tWizard("title")}</h2>
            <p className="text-muted-foreground">{tWizard("subtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            {lastSavedAt && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Check className="h-4 w-4 text-green-500" />
                {tWizard("draftSavedAt", { time: format(lastSavedAt, "HH:mm") })}
              </span>
            )}
            {onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
              >
                {isSavingDraft ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {tWizard("saveDraft")}
              </Button>
            )}
          </div>
        </div>

        {/* Wizard Stepper */}
        <WizardStepper
          currentStep={currentStep}
          totalSteps={5}
          steps={steps}
        />

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Classification */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        {tWizard("steps.classification.title")}
                      </CardTitle>
                      <CardDescription>
                        {tWizard("steps.classification.instructions")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Finding Type and Severity */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="findingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("filterByType")} *</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("filterByType")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {FINDING_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-xs",
                                            FINDING_TYPE_STYLES[type].color
                                          )}
                                        >
                                          {t(`type.${type}`)}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="severity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("filterBySeverity")} *</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("filterBySeverity")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SEVERITIES.map((severity) => (
                                    <SelectItem key={severity} value={severity}>
                                      <div className="flex items-center gap-2">
                                        <Badge className={cn("text-xs", SEVERITY_STYLES[severity].color)}>
                                          {t(`severity.${severity}`)}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                {watchFindingType && t(`severityHint.${watchFindingType}`)}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Audit Area and Critical Element */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="auditArea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{tWizard("fields.auditArea")}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={tWizard("fields.selectAuditArea")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {AUDIT_AREAS.map((area) => (
                                    <SelectItem key={area} value={area}>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono">
                                          {area}
                                        </Badge>
                                        <span className="text-sm">
                                          {locale === "fr"
                                            ? USOAP_AUDIT_AREAS[area].name.fr
                                            : USOAP_AUDIT_AREAS[area].name.en}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="criticalElement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("form.criticalElement")}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("form.selectCriticalElement")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CRITICAL_ELEMENT_LIST.map((ce) => (
                                    <SelectItem key={ce} value={ce}>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono text-xs">
                                          {ce.replace("_", "-")}
                                        </Badge>
                                        <span className="text-sm truncate">
                                          {locale === "fr"
                                            ? CRITICAL_ELEMENTS[ce].name.fr
                                            : CRITICAL_ELEMENTS[ce].name.en}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* ICAO Reference with Autocomplete */}
                      <FormField
                        control={form.control}
                        name="icaoReference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("form.icaoReference")}</FormLabel>
                            <Popover open={isIcaoPopoverOpen} onOpenChange={setIsIcaoPopoverOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value || tWizard("fields.searchIcaoReference")}
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0" align="start">
                                <div className="p-2">
                                  <Input
                                    placeholder={tWizard("fields.searchIcaoPlaceholder")}
                                    value={icaoSearch}
                                    onChange={(e) => setIcaoSearch(e.target.value)}
                                    className="h-8"
                                    autoFocus
                                  />
                                </div>
                                <ScrollArea className="h-[300px]">
                                  {filteredIcaoReferences.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                      {tWizard("fields.noIcaoFound")}
                                    </div>
                                  ) : (
                                    <div className="px-2 py-1">
                                      <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                                        {tWizard("fields.commonReferences")}
                                      </div>
                                      {filteredIcaoReferences.map((ref) => (
                                        <button
                                          key={ref.code}
                                          type="button"
                                          className="w-full p-2 text-left hover:bg-muted rounded-md flex items-center gap-2"
                                          onClick={() => handleSelectIcaoReference(ref.code)}
                                        >
                                          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                                          <span className="font-medium">{ref.code}</span>
                                          <span className="text-muted-foreground">-</span>
                                          <span className="text-sm text-muted-foreground truncate">
                                            {ref.description}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </ScrollArea>
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              {tWizard("fields.icaoReferenceHint")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* PQ Link (if questionnaire available) */}
                      {questionnaireId && (
                        <div className="space-y-2">
                          <FormLabel>{t("detail.question")}</FormLabel>
                          {selectedQuestion ? (
                            <div className="flex items-start gap-2 p-3 border rounded-lg bg-muted/50">
                              <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{selectedQuestion.pqNumber}</Badge>
                                  {selectedQuestion.category && (
                                    <span className="text-xs text-muted-foreground">
                                      {getCategoryName(selectedQuestion)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm mt-1 line-clamp-2">
                                  {getQuestionText(selectedQuestion)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={handleClearQuestion}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Popover
                              open={isQuestionPopoverOpen}
                              onOpenChange={setIsQuestionPopoverOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-start text-muted-foreground"
                                >
                                  <Search className="h-4 w-4 mr-2" />
                                  {t("searchPlaceholder")}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0" align="start">
                                <div className="p-2">
                                  <Input
                                    placeholder="Search by PQ number or text..."
                                    value={questionSearch}
                                    onChange={(e) => setQuestionSearch(e.target.value)}
                                    className="h-8"
                                    autoFocus
                                  />
                                </div>
                                <ScrollArea className="h-[300px]">
                                  {questionsQuery.isLoading && (
                                    <div className="flex items-center justify-center p-4">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  )}
                                  {questionsQuery.data?.questions.length === 0 &&
                                    questionSearch.length >= 2 && (
                                      <div className="p-4 text-center text-sm text-muted-foreground">
                                        No questions found
                                      </div>
                                    )}
                                  {questionSearch.length < 2 && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                      Type at least 2 characters to search
                                    </div>
                                  )}
                                  {questionsQuery.data?.questions.map((q) => (
                                    <button
                                      key={q.id}
                                      type="button"
                                      className="w-full p-2 text-left hover:bg-muted border-b last:border-b-0"
                                      onClick={() => handleSelectQuestion(q as Question)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="shrink-0">
                                          {q.pqNumber}
                                        </Badge>
                                        {q.category && (
                                          <span className="text-xs text-muted-foreground">
                                            {locale === "fr" ? q.category.nameFr : q.category.nameEn}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm mt-1 line-clamp-2">
                                        {locale === "fr" ? q.questionTextFr : q.questionTextEn}
                                      </p>
                                    </button>
                                  ))}
                                </ScrollArea>
                              </PopoverContent>
                            </Popover>
                          )}
                          <FormDescription>
                            {tWizard("fields.pqLinkHint")}
                          </FormDescription>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 2: Description */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {tWizard("steps.description.title")}
                      </CardTitle>
                      <CardDescription>
                        {tWizard("steps.description.instructions")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Titles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="titleEn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("form.titleEn")} *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t("form.titleEnPlaceholder")}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="titleFr"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("form.titleFr")}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {tWizard("fields.optional")}
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t("form.titleFrPlaceholder")}
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                {tWizard("fields.autoTranslateHint")}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Description EN */}
                      <FormField
                        control={form.control}
                        name="descriptionEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("form.descriptionEn")} *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={t("form.descriptionEnPlaceholder")}
                                className="min-h-[150px] resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {tWizard("fields.descriptionHint")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Description FR */}
                      <FormField
                        control={form.control}
                        name="descriptionFr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("form.descriptionFr")}
                              <Badge variant="outline" className="ml-2 text-xs">
                                {tWizard("fields.optional")}
                              </Badge>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={t("form.descriptionFrPlaceholder")}
                                className="min-h-[150px] resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Evidence Summary */}
                      <FormField
                        control={form.control}
                        name="evidenceSummary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{tWizard("fields.evidenceSummary")}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={tWizard("fields.evidenceSummaryPlaceholder")}
                                className="min-h-[100px] resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {tWizard("fields.evidenceSummaryHint")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 3: Evidence */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        {tWizard("steps.evidence.title")}
                      </CardTitle>
                      <CardDescription>
                        {tWizard("steps.evidence.instructions")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Evidence Description */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="evidenceEn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("form.evidenceEn")}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={t("form.evidenceEnPlaceholder")}
                                  className="min-h-[120px] resize-y"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="evidenceFr"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("form.evidenceFr")}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={t("form.evidenceFrPlaceholder")}
                                  className="min-h-[120px] resize-y"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Document Upload Placeholder */}
                      <div className="space-y-3">
                        <Label>{tWizard("fields.supportingDocuments")}</Label>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
                          <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground mb-2">
                            {tWizard("fields.dragDropHint")}
                          </p>
                          <Button type="button" variant="outline" size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            {tWizard("fields.browseFiles")}
                          </Button>
                        </div>
                        <FormDescription>
                          {tWizard("fields.documentsHint")}
                        </FormDescription>
                      </div>

                      {/* Interview Notes Link */}
                      <div className="space-y-3">
                        <Label>{tWizard("fields.interviewNotes")}</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={tWizard("fields.interviewNotesPlaceholder")}
                            className="flex-1"
                          />
                          <Button type="button" variant="outline">
                            <Link2 className="h-4 w-4 mr-2" />
                            {tWizard("fields.link")}
                          </Button>
                        </div>
                        <FormDescription>
                          {tWizard("fields.interviewNotesHint")}
                        </FormDescription>
                      </div>

                      {/* Procedure References */}
                      <div className="space-y-3">
                        <Label>{tWizard("fields.procedureReferences")}</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={tWizard("fields.procedureReferencesPlaceholder")}
                            className="flex-1"
                          />
                          <Button type="button" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            {tWizard("fields.add")}
                          </Button>
                        </div>
                        <FormDescription>
                          {tWizard("fields.procedureReferencesHint")}
                        </FormDescription>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 4: Discussion */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        {tWizard("steps.discussion.title")}
                      </CardTitle>
                      <CardDescription>
                        {tWizard("steps.discussion.instructions")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Host Response */}
                      <FormField
                        control={form.control}
                        name="hostResponse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{tWizard("fields.hostResponse")}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={tWizard("fields.hostResponsePlaceholder")}
                                className="min-h-[120px] resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {tWizard("fields.hostResponseHint")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Agreement Status */}
                      <FormField
                        control={form.control}
                        name="hostAgreement"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>{tWizard("fields.hostAgreement")}</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-col space-y-2"
                              >
                                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                  <RadioGroupItem value="AGREED" id="agreed" />
                                  <Label htmlFor="agreed" className="flex items-center gap-2 cursor-pointer flex-1">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    {tWizard("fields.agreed")}
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                  <RadioGroupItem value="PARTIALLY_AGREED" id="partially" />
                                  <Label htmlFor="partially" className="flex items-center gap-2 cursor-pointer flex-1">
                                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                                    {tWizard("fields.partiallyAgreed")}
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                  <RadioGroupItem value="DISAGREED" id="disagreed" />
                                  <Label htmlFor="disagreed" className="flex items-center gap-2 cursor-pointer flex-1">
                                    <X className="h-4 w-4 text-red-500" />
                                    {tWizard("fields.disagreed")}
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Additional Context */}
                      <FormField
                        control={form.control}
                        name="additionalContext"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{tWizard("fields.additionalContext")}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={tWizard("fields.additionalContextPlaceholder")}
                                className="min-h-[100px] resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Discussion Notes */}
                      <FormField
                        control={form.control}
                        name="discussionNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{tWizard("fields.discussionNotes")}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={tWizard("fields.discussionNotesPlaceholder")}
                                className="min-h-[100px] resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {tWizard("fields.discussionNotesHint")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 5: CAP Requirement */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        {tWizard("steps.cap.title")}
                      </CardTitle>
                      <CardDescription>
                        {tWizard("steps.cap.instructions")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* CAP Required Toggle */}
                      <FormField
                        control={form.control}
                        name="capRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                {t("form.capRequired")}
                              </FormLabel>
                              <FormDescription>
                                {t("form.capRequiredDescription")}
                              </FormDescription>
                              {(watchFindingType === "NON_CONFORMITY" &&
                                (watchSeverity === "CRITICAL" || watchSeverity === "MAJOR")) && (
                                <Badge variant="destructive" className="mt-2">
                                  {tWizard("fields.capAutoRequired")}
                                </Badge>
                              )}
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={
                                  watchFindingType === "NON_CONFORMITY" &&
                                  (watchSeverity === "CRITICAL" || watchSeverity === "MAJOR")
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch("capRequired") && (
                        <>
                          {/* Suggested Timeline */}
                          <FormField
                            control={form.control}
                            name="suggestedTimeline"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{tWizard("fields.suggestedTimeline")}</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={tWizard("fields.selectTimeline")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {TIMELINE_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-muted-foreground" />
                                          {option.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  {tWizard("fields.timelineHint")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Target Close Date */}
                          <FormField
                            control={form.control}
                            name="targetCloseDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("form.targetCloseDate")}</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>{tWizard("fields.pickDate")}</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value || undefined}
                                      onSelect={field.onChange}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Responsible Party */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="responsibleParty"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{tWizard("fields.responsibleParty")}</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        className="pl-9"
                                        placeholder={tWizard("fields.responsiblePartyPlaceholder")}
                                        {...field}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    {tWizard("fields.responsiblePartyHint")}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="responsibleDepartment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{tWizard("fields.responsibleDepartment")}</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        className="pl-9"
                                        placeholder={tWizard("fields.responsibleDepartmentPlaceholder")}
                                        {...field}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}

                      {/* Summary Card */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            {tWizard("fields.findingSummary")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-24">{t("filterByType")}:</span>
                            <Badge
                              variant="outline"
                              className={cn(FINDING_TYPE_STYLES[watchFindingType]?.color)}
                            >
                              {t(`type.${watchFindingType}`)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-24">{t("filterBySeverity")}:</span>
                            <Badge className={cn(SEVERITY_STYLES[watchSeverity]?.color)}>
                              {t(`severity.${watchSeverity}`)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-24">{t("form.capRequired")}:</span>
                            <span>{form.watch("capRequired") ? tCommon("yes") : tCommon("no")}</span>
                          </div>
                          {form.watch("targetCloseDate") && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-24">{t("form.targetCloseDate")}:</span>
                              <span>{format(form.watch("targetCloseDate")!, "PPP")}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousStep}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {tCommon("actions.previous")}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  {tCommon("actions.cancel")}
                </Button>

                {currentStep < 5 ? (
                  <Button type="button" onClick={handleNextStep}>
                    {tCommon("actions.next")}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t("actions.create")}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tWizard("exitDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tWizard("exitDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tWizard("exitDialog.cancel")}</AlertDialogCancel>
            {onSaveDraft && (
              <AlertDialogAction
                onClick={async () => {
                  await handleSaveDraft();
                  onCancel();
                }}
              >
                {tWizard("exitDialog.saveAndExit")}
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={onCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tWizard("exitDialog.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default FindingEntryWizard;
