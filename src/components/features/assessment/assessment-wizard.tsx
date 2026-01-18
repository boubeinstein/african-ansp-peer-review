"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import type { QuestionnaireType, AssessmentType, USOAPAuditArea } from "@prisma/client";

// Step components
import { WizardStepper, type WizardStep } from "./wizard-steps/wizard-stepper";
import { QuestionnaireTypeStep } from "./wizard-steps/questionnaire-type-step";
import { AssessmentTypeStep } from "./wizard-steps/assessment-type-step";
import { AssessmentDetailsStep } from "./wizard-steps/assessment-details-step";
import { ReviewConfirmStep } from "./wizard-steps/review-confirm-step";

// Default selected areas - typed as USOAPAuditArea for ANS assessments
const DEFAULT_ANS_AREAS: USOAPAuditArea[] = ["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"];
const DEFAULT_SMS_COMPONENTS = [
  "SAFETY_POLICY_OBJECTIVES",
  "SAFETY_RISK_MANAGEMENT",
  "SAFETY_ASSURANCE",
  "SAFETY_PROMOTION",
];

interface WizardData {
  questionnaireType: QuestionnaireType | null;
  assessmentType: AssessmentType | null;
  title: string;
  description: string;
  dueDate: Date | null;
  selectedAreas: USOAPAuditArea[];
  confirmed: boolean;
}

const initialData: WizardData = {
  questionnaireType: null,
  assessmentType: null,
  title: "",
  description: "",
  dueDate: null,
  selectedAreas: [],
  confirmed: false,
};

type WizardState = "wizard" | "creating" | "success";

interface CreatedAssessment {
  id: string;
  title: string;
  questionCount: number;
}

export function AssessmentWizard() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("wizard");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [state, setState] = useState<WizardState>("wizard");
  const [createdAssessment, setCreatedAssessment] = useState<CreatedAssessment | null>(null);

  // tRPC mutation for creating assessment
  const createMutation = trpc.assessment.create.useMutation({
    onSuccess: (result) => {
      setCreatedAssessment({
        id: result.id,
        title: data.title,
        questionCount: 0, // Will be updated after creation
      });
      setState("success");
      toast.success(t("success.created"));
    },
    onError: (error) => {
      toast.error(error.message || t("errors.createFailed"));
      setState("wizard");
    },
  });

  // Steps configuration
  const steps: WizardStep[] = [
    {
      title: t("steps.questionnaireType"),
      description: t("steps.questionnaireTypeDesc"),
      isCompleted: step > 1,
      isActive: step === 1,
    },
    {
      title: t("steps.assessmentType"),
      description: t("steps.assessmentTypeDesc"),
      isCompleted: step > 2,
      isActive: step === 2,
    },
    {
      title: t("steps.details"),
      description: t("steps.detailsDesc"),
      isCompleted: step > 3,
      isActive: step === 3,
    },
    {
      title: t("steps.review"),
      description: t("steps.reviewDesc"),
      isCompleted: step > 4,
      isActive: step === 4,
    },
  ];

  // Update wizard data
  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Handle questionnaire type change
  const handleQuestionnaireTypeChange = useCallback(
    (questionnaireType: QuestionnaireType) => {
      // selectedAuditAreas is only applicable to ANS USOAP assessments
      const selectedAreas: USOAPAuditArea[] =
        questionnaireType === "ANS_USOAP_CMA"
          ? DEFAULT_ANS_AREAS
          : []; // SMS assessments don't use selectedAuditAreas
      updateData({ questionnaireType, selectedAreas, title: "" });
    },
    [updateData]
  );

  // Validation for each step
  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 1:
        return data.questionnaireType !== null;
      case 2:
        return data.assessmentType !== null;
      case 3:
        return data.title.trim().length > 0 && data.selectedAreas.length > 0;
      case 4:
        return data.confirmed;
      default:
        return false;
    }
  }, [step, data]);

  // Handle create assessment
  const handleCreate = useCallback(() => {
    if (!data.questionnaireType || !data.assessmentType || !data.title.trim()) return;

    console.log("[Assessment Wizard] Creating assessment with selectedAuditAreas:", data.selectedAreas);

    setState("creating");
    createMutation.mutate({
      questionnaireType: data.questionnaireType,
      assessmentType: data.assessmentType,
      title: data.title,
      description: data.description || undefined,
      dueDate: data.dueDate || undefined,
      selectedAuditAreas: data.selectedAreas,
    });
  }, [data, createMutation]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (!canProceed()) return;

    if (step < 4) {
      setStep((prev) => prev + 1);
    } else {
      // Submit and create assessment
      handleCreate();
    }
  }, [step, canProceed, handleCreate]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  }, [step]);

  // Handle start assessment
  const handleStartAssessment = useCallback(() => {
    if (createdAssessment) {
      router.push(`/${locale}/assessments/${createdAssessment.id}`);
    }
  }, [createdAssessment, router, locale]);

  // Handle view dashboard
  const handleViewDashboard = useCallback(() => {
    router.push(`/${locale}/assessments`);
  }, [router, locale]);

  // Handle create another
  const handleCreateAnother = useCallback(() => {
    setData(initialData);
    setStep(1);
    setState("wizard");
    setCreatedAssessment(null);
  }, []);

  // Animation variants for step transitions
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  // Track direction for animations
  const [direction, setDirection] = useState(0);

  // Creating state UI
  if (state === "creating") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-12 w-12 text-primary" />
          </motion.div>
          <h3 className="mt-6 text-lg font-semibold">{t("creating.title")}</h3>
          <p className="mt-2 text-center text-muted-foreground">
            {t("creating.description")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Success state UI
  if (state === "success" && createdAssessment) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10 }}
          >
            <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </motion.div>
          <h3 className="mt-6 text-xl font-semibold">{t("success.title")}</h3>
          <p className="mt-2 text-center text-muted-foreground">
            {t("success.description")}
          </p>

          <div className="mt-6 w-full rounded-lg border bg-muted/50 p-4">
            <div className="text-sm text-muted-foreground">
              {t("success.assessmentId")}
            </div>
            <div className="font-mono text-sm">{createdAssessment.id}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {t("success.assessmentTitle")}
            </div>
            <div className="font-medium">{createdAssessment.title}</div>
          </div>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <Button onClick={handleStartAssessment} className="flex-1 gap-2">
              <Sparkles className="h-4 w-4" />
              {t("success.startAssessment")}
            </Button>
            <Button
              variant="outline"
              onClick={handleViewDashboard}
              className="flex-1"
            >
              {t("success.viewDashboard")}
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={handleCreateAnother}
            className="mt-4"
          >
            {t("success.createAnother")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Wizard UI
  return (
    <div className="space-y-8">
      {/* Stepper - hide on mobile */}
      <div className="hidden sm:block">
        <WizardStepper currentStep={step} totalSteps={4} steps={steps} />
      </div>

      {/* Mobile step indicator */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("steps.stepOf", { current: step, total: 4 })}
          </span>
          <span className="font-medium">{steps[step - 1]?.title}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-primary"
          />
        </div>
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {step === 1 && (
                <QuestionnaireTypeStep
                  value={data.questionnaireType}
                  onChange={handleQuestionnaireTypeChange}
                />
              )}
              {step === 2 && (
                <AssessmentTypeStep
                  value={data.assessmentType}
                  onChange={(type) => updateData({ assessmentType: type })}
                />
              )}
              {step === 3 && (
                <AssessmentDetailsStep
                  questionnaireType={data.questionnaireType}
                  assessmentType={data.assessmentType}
                  title={data.title}
                  description={data.description}
                  dueDate={data.dueDate}
                  selectedAreas={data.selectedAreas}
                  onTitleChange={(title) => updateData({ title })}
                  onDescriptionChange={(description) =>
                    updateData({ description })
                  }
                  onDueDateChange={(dueDate) => updateData({ dueDate })}
                  onSelectedAreasChange={(selectedAreas) =>
                    updateData({ selectedAreas })
                  }
                />
              )}
              {step === 4 && (
                <ReviewConfirmStep
                  questionnaireType={data.questionnaireType}
                  assessmentType={data.assessmentType}
                  title={data.title}
                  description={data.description}
                  dueDate={data.dueDate}
                  selectedAreas={data.selectedAreas}
                  confirmed={data.confirmed}
                  onConfirmedChange={(confirmed) => updateData({ confirmed })}
                  isSubmitting={createMutation.isPending}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setDirection(-1);
            handlePrevious();
          }}
          disabled={step === 1}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("actions.back")}
        </Button>

        <div className="flex items-center gap-2">
          {step < 4 ? (
            <Button
              onClick={() => {
                setDirection(1);
                handleNext();
              }}
              disabled={!canProceed()}
              className="gap-2"
            >
              {tCommon("actions.next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("creating.button")}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {t("review.createButton")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
