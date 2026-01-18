"use client";

/**
 * Finding Form Component
 *
 * Form for creating and editing findings with PQ (Protocol Question) linking,
 * validation using react-hook-form and Zod.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  FileText,
  Search,
  AlertTriangle,
  Check,
  CalendarIcon,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import type {
  FindingType,
  FindingSeverity,
  CriticalElement,
} from "@prisma/client";

// =============================================================================
// FORM SCHEMA
// =============================================================================

const findingFormSchema = z.object({
  // Classification
  findingType: z.enum([
    "NON_CONFORMITY",
    "OBSERVATION",
    "RECOMMENDATION",
    "GOOD_PRACTICE",
    "CONCERN",
  ]),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "OBSERVATION"]),

  // Details
  titleEn: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  titleFr: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  descriptionEn: z
    .string()
    .min(20, "Description must be at least 20 characters"),
  descriptionFr: z
    .string()
    .min(20, "Description must be at least 20 characters"),

  // Evidence
  evidenceEn: z.string().optional(),
  evidenceFr: z.string().optional(),
  icaoReference: z.string().optional(),
  criticalElement: z
    .enum(["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"])
    .optional()
    .nullable(),

  // Question Link
  questionId: z.string().optional().nullable(),

  // Assignment
  capRequired: z.boolean().default(true),
  targetCloseDate: z.date().optional().nullable(),
});

type FindingFormValues = z.infer<typeof findingFormSchema>;

// =============================================================================
// TYPES
// =============================================================================

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

interface FindingFormProps {
  reviewId: string;
  organizationId: string;
  questionnaireId?: string;
  initialData?: Partial<FindingFormValues> & {
    question?: Question | null;
  };
  onSubmit: (data: FindingFormValues) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isCreate?: boolean;
  className?: string;
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

const CRITICAL_ELEMENTS: CriticalElement[] = [
  "CE_1",
  "CE_2",
  "CE_3",
  "CE_4",
  "CE_5",
  "CE_6",
  "CE_7",
  "CE_8",
];

const CRITICAL_ELEMENT_LABELS: Record<CriticalElement, string> = {
  CE_1: "CE-1: Primary Aviation Legislation",
  CE_2: "CE-2: Specific Operating Regulations",
  CE_3: "CE-3: State Civil Aviation System",
  CE_4: "CE-4: Technical Personnel Qualification",
  CE_5: "CE-5: Technical Guidance & Tools",
  CE_6: "CE-6: Licensing & Certification Obligations",
  CE_7: "CE-7: Surveillance Obligations",
  CE_8: "CE-8: Resolution of Safety Issues",
};

// Auto-suggest severity based on finding type
const SUGGESTED_SEVERITY: Record<FindingType, FindingSeverity> = {
  NON_CONFORMITY: "MAJOR",
  OBSERVATION: "MINOR",
  RECOMMENDATION: "OBSERVATION",
  GOOD_PRACTICE: "OBSERVATION",
  CONCERN: "MINOR",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function FindingForm({
  reviewId,
  organizationId,
  questionnaireId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isCreate = false,
  className,
}: FindingFormProps) {
  const t = useTranslations("findings");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "en" | "fr";

  const [activeTab, setActiveTab] = useState("classification");
  const [questionSearch, setQuestionSearch] = useState("");
  const [isQuestionPopoverOpen, setIsQuestionPopoverOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    initialData?.question || null
  );

  const form = useForm<FindingFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(findingFormSchema) as any,
    defaultValues: {
      findingType: initialData?.findingType || "OBSERVATION",
      severity: initialData?.severity || "MINOR",
      titleEn: initialData?.titleEn || "",
      titleFr: initialData?.titleFr || "",
      descriptionEn: initialData?.descriptionEn || "",
      descriptionFr: initialData?.descriptionFr || "",
      evidenceEn: initialData?.evidenceEn || "",
      evidenceFr: initialData?.evidenceFr || "",
      icaoReference: initialData?.icaoReference || "",
      criticalElement: initialData?.criticalElement || null,
      questionId: initialData?.questionId || null,
      capRequired: initialData?.capRequired ?? true,
      targetCloseDate: initialData?.targetCloseDate || null,
    },
  });

  // Watch finding type to auto-suggest severity
  const watchFindingType = form.watch("findingType");

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

  // Auto-suggest severity when finding type changes (only if user hasn't manually changed it)
  useEffect(() => {
    if (isCreate && watchFindingType) {
      const suggested = SUGGESTED_SEVERITY[watchFindingType];
      if (suggested) {
        form.setValue("severity", suggested);
      }
    }
  }, [watchFindingType, isCreate, form]);

  // Handle question selection
  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    form.setValue("questionId", question.id);
    setIsQuestionPopoverOpen(false);
    setQuestionSearch("");
  };

  // Clear selected question
  const handleClearQuestion = () => {
    setSelectedQuestion(null);
    form.setValue("questionId", null);
  };

  async function handleSubmit(data: FindingFormValues) {
    await onSubmit(data);
  }

  const getQuestionText = (question: Question) => {
    return locale === "fr" ? question.questionTextFr : question.questionTextEn;
  };

  const getCategoryName = (question: Question) => {
    if (!question.category) return "";
    return locale === "fr"
      ? question.category.nameFr
      : question.category.nameEn;
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-6", className)}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="classification">
              {t("form.sections.classification")}
            </TabsTrigger>
            <TabsTrigger value="details">
              {t("form.sections.details")}
            </TabsTrigger>
            <TabsTrigger value="evidence">
              {t("form.sections.evidence")}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Classification */}
          <TabsContent value="classification" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5" />
                  {t("form.sections.classification")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="findingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("filterByType")} *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("filterByType")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FINDING_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {t(`type.${type}`)}
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
                              <SelectValue
                                placeholder={t("filterBySeverity")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SEVERITIES.map((severity) => (
                              <SelectItem key={severity} value={severity}>
                                {t(`severity.${severity}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* PQ Search */}
                {questionnaireId && (
                  <div className="space-y-2">
                    <FormLabel>{t("detail.question")}</FormLabel>
                    {selectedQuestion ? (
                      <div className="flex items-start gap-2 p-3 border rounded-lg bg-muted/50">
                        <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {selectedQuestion.pqNumber}
                            </Badge>
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
                        <PopoverContent
                          className="w-[400px] p-0"
                          align="start"
                        >
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
                                      {locale === "fr"
                                        ? q.category.nameFr
                                        : q.category.nameEn}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm mt-1 line-clamp-2">
                                  {locale === "fr"
                                    ? q.questionTextFr
                                    : q.questionTextEn}
                                </p>
                              </button>
                            ))}
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    )}
                    <FormDescription>
                      Link this finding to a specific Protocol Question
                    </FormDescription>
                  </div>
                )}

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
                            <SelectValue
                              placeholder={t("form.selectCriticalElement")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CRITICAL_ELEMENTS.map((ce) => (
                            <SelectItem key={ce} value={ce}>
                              {CRITICAL_ELEMENT_LABELS[ce]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Details */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  {t("form.sections.details")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormLabel>{t("form.titleFr")} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("form.titleFrPlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="descriptionEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.descriptionEn")} *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("form.descriptionEnPlaceholder")}
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descriptionFr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.descriptionFr")} *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("form.descriptionFrPlaceholder")}
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Evidence & Assignment */}
          <TabsContent value="evidence" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Check className="h-5 w-5" />
                  {t("form.sections.evidence")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="evidenceEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.evidenceEn")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("form.evidenceEnPlaceholder")}
                            className="min-h-[100px]"
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
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="icaoReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.icaoReference")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("form.icaoReferencePlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">
                    {t("form.sections.assignment")}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="capRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>{t("form.capRequired")}</FormLabel>
                            <FormDescription className="text-xs">
                              {t("form.capRequiredDescription")}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

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
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeTab !== "classification" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const tabs = ["classification", "details", "evidence"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1]);
                  }
                }}
              >
                Previous
              </Button>
            )}
            {activeTab !== "evidence" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const tabs = ["classification", "details", "evidence"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
              >
                Next
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isCreate ? t("actions.create") : tCommon("actions.save")}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default FindingForm;
