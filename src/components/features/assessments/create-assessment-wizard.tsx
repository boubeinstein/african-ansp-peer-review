"use client";

/**
 * Multi-step Assessment Creation Wizard
 *
 * Guides users through creating a new assessment with:
 * 1. Organization selection (for global roles) or auto-select (for org roles)
 * 2. Questionnaire type selection (ANS USOAP CMA or SMS CANSO SoE)
 * 3. Assessment details (title, description)
 * 4. Review and confirm
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Building2,
  FileQuestion,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { QuestionnaireType } from "@/types/prisma-enums";

// =============================================================================
// TYPES
// =============================================================================

const STEPS = ["organization", "questionnaire", "details", "confirm"] as const;
type Step = (typeof STEPS)[number];

interface AssessmentDraft {
  organizationId: string | null;
  organizationName: string | null;
  questionnaireType: QuestionnaireType | null;
  questionnaireName: string | null;
  title: string;
  description: string;
}

interface CreationContext {
  userRole: string;
  userOrganizationId: string | null;
  userOrganizationName: string | null;
  canSelectOrganization: boolean;
  availableOrganizations: {
    id: string;
    name: string;
    code: string;
    country: string;
  }[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CreateAssessmentWizard() {
  const t = useTranslations("assessments.create");
  const locale = useLocale();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>("organization");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [draft, setDraft] = useState<AssessmentDraft>({
    organizationId: null,
    organizationName: null,
    questionnaireType: null,
    questionnaireName: null,
    title: "",
    description: "",
  });

  // Fetch creation context
  const { data: context, isLoading: contextLoading } =
    trpc.assessment.getCreationContext.useQuery();

  // Fetch questionnaires
  const { data: questionnaires } = trpc.questionnaire.list.useQuery({});

  // Create mutation
  const createMutation = trpc.assessment.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("success"));
      router.push(`/${locale}/assessments/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Compute effective organization (auto-select for non-coordinator users)
  const effectiveOrganizationId =
    context && !context.canSelectOrganization && context.userOrganizationId
      ? context.userOrganizationId
      : draft.organizationId;

  const effectiveOrganizationName =
    context && !context.canSelectOrganization && context.userOrganizationName
      ? context.userOrganizationName
      : draft.organizationName;

  const currentStepIndex = STEPS.indexOf(currentStep);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case "organization":
        return !!effectiveOrganizationId;
      case "questionnaire":
        return !!draft.questionnaireType;
      case "details":
        return draft.title.trim().length >= 3;
      case "confirm":
        return true;
      default:
        return false;
    }
  }, [currentStep, draft, effectiveOrganizationId]);

  const goNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    }
  };

  const handleCreate = () => {
    if (!effectiveOrganizationId || !draft.questionnaireType) return;
    setShowConfirmDialog(true);
  };

  const confirmCreate = () => {
    if (!effectiveOrganizationId || !draft.questionnaireType) return;

    createMutation.mutate({
      organizationId: effectiveOrganizationId,
      questionnaireType: draft.questionnaireType,
      title: draft.title || undefined,
      description: draft.description || undefined,
    });
    setShowConfirmDialog(false);
  };

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">{t("errorLoadingContext")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} t={t} />

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{t(`steps.${currentStep}.title`)}</CardTitle>
          <CardDescription>
            {t(`steps.${currentStep}.description`)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === "organization" && (
            <OrganizationStep
              context={context}
              draft={draft}
              setDraft={setDraft}
              t={t}
            />
          )}
          {currentStep === "questionnaire" && (
            <QuestionnaireStep
              questionnaires={questionnaires?.questionnaires ?? []}
              draft={draft}
              setDraft={setDraft}
              t={t}
              locale={locale}
            />
          )}
          {currentStep === "details" && (
            <DetailsStep
              draft={draft}
              setDraft={setDraft}
              t={t}
              effectiveOrganizationName={effectiveOrganizationName}
            />
          )}
          {currentStep === "confirm" && (
            <ConfirmStep
              draft={draft}
              t={t}
              effectiveOrganizationName={effectiveOrganizationName}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>

        {currentStep === "confirm" ? (
          <Button
            onClick={handleCreate}
            disabled={!canProceed() || createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {t("createAssessment")}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed()}>
            {t("next")}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("confirmDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDialog.description", {
                organization: effectiveOrganizationName ?? "",
                questionnaire: draft.questionnaireName ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("confirmDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreate}>
              {t("confirmDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// STEP INDICATOR
// =============================================================================

function StepIndicator({
  steps,
  currentStep,
  t,
}: {
  steps: readonly Step[];
  currentStep: Step;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const getStepStatus = (step: Step) => {
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "current";
    return "upcoming";
  };

  const icons: Record<Step, React.ReactNode> = {
    organization: <Building2 className="h-5 w-5" />,
    questionnaire: <FileQuestion className="h-5 w-5" />,
    details: <FileText className="h-5 w-5" />,
    confirm: <CheckCircle2 className="h-5 w-5" />,
  };

  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between">
        {steps.map((step: Step, index: number) => {
          const status = getStepStatus(step);
          return (
            <li key={step} className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2",
                  status === "complete" &&
                    "bg-green-100 border-green-500 text-green-600",
                  status === "current" &&
                    "bg-primary/10 border-primary text-primary",
                  status === "upcoming" &&
                    "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {status === "complete" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  icons[step]
                )}
              </div>
              <span
                className={cn(
                  "ml-3 text-sm font-medium hidden sm:block",
                  status === "current" && "text-primary",
                  status === "upcoming" && "text-muted-foreground"
                )}
              >
                {t(`steps.${step}.label`)}
              </span>
              {index < steps.length - 1 && (
                <ChevronRight className="h-5 w-5 mx-4 text-muted-foreground" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// =============================================================================
// ORGANIZATION STEP
// =============================================================================

function OrganizationStep({
  context,
  draft,
  setDraft,
  t,
}: {
  context: CreationContext;
  draft: AssessmentDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssessmentDraft>>;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (!context.canSelectOrganization) {
    // User can only assess their own organization
    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            {t("organizationFixed")}
          </p>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">{context.userOrganizationName}</p>
              <p className="text-sm text-muted-foreground">
                {t("yourOrganization")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Programme coordinator can select any organization
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="organization">{t("selectOrganization")}</Label>
        <Select
          value={draft.organizationId ?? ""}
          onValueChange={(value) => {
            const org = context.availableOrganizations.find(
              (o: { id: string; name: string }) => o.id === value
            );
            setDraft((prev) => ({
              ...prev,
              organizationId: value,
              organizationName: org?.name ?? null,
            }));
          }}
        >
          <SelectTrigger id="organization" className="w-full">
            <SelectValue placeholder={t("selectOrganizationPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {context.availableOrganizations.map((org: { id: string; name: string; code: string; country: string }) => (
              <SelectItem key={org.id} value={org.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{org.name}</span>
                  {org.code && (
                    <span className="text-muted-foreground">({org.code})</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {draft.organizationId && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            {t("organizationSelected", { name: draft.organizationName ?? "" })}
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// QUESTIONNAIRE STEP
// =============================================================================

function QuestionnaireStep({
  questionnaires,
  draft,
  setDraft,
  t,
  locale,
}: {
  questionnaires: {
    id: string;
    type: QuestionnaireType;
    titleEn: string;
    titleFr: string;
  }[];
  draft: AssessmentDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssessmentDraft>>;
  t: (key: string, values?: Record<string, string | number>) => string;
  locale: string;
}) {
  // Filter to only active questionnaires (one per type)
  const availableTypes = new Map<
    QuestionnaireType,
    { id: string; titleEn: string; titleFr: string }
  >();
  questionnaires.forEach((q) => {
    if (!availableTypes.has(q.type)) {
      availableTypes.set(q.type, q);
    }
  });

  const questionnaireOptions = Array.from(availableTypes.entries());

  if (questionnaireOptions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("noQuestionnairesAvailable")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={draft.questionnaireType ?? ""}
        onValueChange={(value) => {
          const q = availableTypes.get(value as QuestionnaireType);
          setDraft((prev) => ({
            ...prev,
            questionnaireType: value as QuestionnaireType,
            questionnaireName: q
              ? locale === "fr"
                ? q.titleFr
                : q.titleEn
              : null,
          }));
        }}
        className="space-y-3"
      >
        {questionnaireOptions.map(([type, q]: [QuestionnaireType, { id: string; titleEn: string; titleFr: string }]) => (
          <div
            key={type}
            className={cn(
              "flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
              draft.questionnaireType === type
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value={type} id={q.id} className="mt-1" />
            <Label htmlFor={q.id} className="cursor-pointer flex-1">
              <span className="font-semibold block">
                {locale === "fr" ? q.titleFr : q.titleEn}
              </span>
              <span className="text-sm text-muted-foreground block mt-1">
                {type === "ANS_USOAP_CMA"
                  ? t("questionnaireDescANS")
                  : t("questionnaireDescSMS")}
              </span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

// =============================================================================
// DETAILS STEP
// =============================================================================

function DetailsStep({
  draft,
  setDraft,
  t,
  effectiveOrganizationName,
}: {
  draft: AssessmentDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssessmentDraft>>;
  t: (key: string, values?: Record<string, string | number>) => string;
  effectiveOrganizationName: string | null;
}) {
  const defaultTitle = `${draft.questionnaireName ?? ""} - ${effectiveOrganizationName ?? ""} - ${new Date().toISOString().split("T")[0]}`;

  // Compute effective title - use draft title or default
  const displayTitle = draft.title || defaultTitle;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("assessmentTitle")}</Label>
        <Input
          id="title"
          value={displayTitle}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder={defaultTitle}
        />
        <p className="text-xs text-muted-foreground">{t("titleHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          value={draft.description}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder={t("descriptionPlaceholder")}
          rows={3}
        />
      </div>
    </div>
  );
}

// =============================================================================
// CONFIRM STEP
// =============================================================================

function ConfirmStep({
  draft,
  t,
  effectiveOrganizationName,
}: {
  draft: AssessmentDraft;
  t: (key: string, values?: Record<string, string | number>) => string;
  effectiveOrganizationName: string | null;
}) {
  // Compute effective title with default
  const defaultTitle = `${draft.questionnaireName ?? ""} - ${effectiveOrganizationName ?? ""} - ${new Date().toISOString().split("T")[0]}`;
  const displayTitle = draft.title || defaultTitle;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {t("reviewBeforeCreating")}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {t("reviewWarning")}
            </p>
          </div>
        </div>
      </div>

      <dl className="divide-y">
        <div className="py-3 flex justify-between">
          <dt className="text-muted-foreground">{t("organization")}</dt>
          <dd className="font-medium">{effectiveOrganizationName}</dd>
        </div>
        <div className="py-3 flex justify-between">
          <dt className="text-muted-foreground">{t("questionnaire")}</dt>
          <dd className="font-medium">{draft.questionnaireName}</dd>
        </div>
        <div className="py-3 flex justify-between">
          <dt className="text-muted-foreground">{t("title")}</dt>
          <dd className="font-medium">{displayTitle}</dd>
        </div>
        {draft.description && (
          <div className="py-3">
            <dt className="text-muted-foreground mb-1">{t("description")}</dt>
            <dd className="text-sm">{draft.description}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
