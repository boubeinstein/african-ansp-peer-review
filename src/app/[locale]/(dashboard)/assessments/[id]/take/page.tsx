"use client";

import { use } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  HelpCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AssessmentWorkspaceProvider,
  useAssessmentWorkspace,
} from "@/components/features/assessment/assessment-workspace-context";
import { QuestionNavigationSidebar } from "@/components/features/assessment/question-navigation-sidebar";
import { QuestionResponsePanel } from "@/components/features/assessment/question-response-panel";
import { AssessmentHelpDialog } from "@/components/features/assessment/assessment-help-dialog";
import { AssessmentSettingsDialog } from "@/components/features/assessment/assessment-settings-dialog";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

function WorkspaceHeader() {
  const t = useTranslations("workspace");
  const tAssessment = useTranslations("assessment");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    assessment,
    progressPercent,
    answeredCount,
    totalCount,
    saveStatus,
    hasPendingChanges,
    pendingSavesCount,
    canSubmit: contextCanSubmit,
    saveAllPendingResponses,
    refreshResponseCount,
    isSubmitDialogOpen,
    setIsSubmitDialogOpen,
  } = useAssessmentWorkspace();

  // Submit mutation
  const submitMutation = trpc.assessment.submit.useMutation({
    onSuccess: () => {
      toast.success(tAssessment("submitSuccess"));
      router.push(`/${locale}/assessments`);
    },
    onError: (error) => {
      toast.error(error.message || tAssessment("submitError"));
    },
  });

  if (!assessment) return null;

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSubmit = async () => {
    if (!assessment?.id) return;

    // First, save all pending responses to ensure data consistency
    if (hasPendingChanges) {
      await saveAllPendingResponses();
    }

    // Refresh response count from server to ensure accuracy
    await refreshResponseCount();

    // Small delay to ensure database is consistent
    await new Promise(resolve => setTimeout(resolve, 200));

    await submitMutation.mutateAsync({ id: assessment.id });
  };

  // Check if assessment can be edited/submitted
  const isAlreadySubmitted = assessment.status === "SUBMITTED" || assessment.status === "UNDER_REVIEW" || assessment.status === "COMPLETED";
  const isSaving = saveStatus === "saving" || pendingSavesCount > 0;
  const canSubmit = contextCanSubmit && !isSaving;
  const isSubmitting = submitMutation.isPending;

  const questionnaireTitle =
    locale === "fr"
      ? assessment.questionnaire.titleFr
      : assessment.questionnaire.titleEn;

  const orgName =
    locale === "fr"
      ? assessment.organization.nameFr
      : assessment.organization.nameEn;

  return (
    <header className="flex items-center justify-between border-b px-4 py-3 bg-background shrink-0">
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/assessments/${assessment.id}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("header.backToAssessments")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-semibold text-lg">{orgName}</h1>
            <Badge
              variant={
                assessment.questionnaireType === "ANS_USOAP_CMA"
                  ? "default"
                  : "secondary"
              }
            >
              {assessment.questionnaireType === "ANS_USOAP_CMA" ? "ANS" : "SMS"}
            </Badge>
            <Badge variant="outline">
              {tAssessment(`status.${assessment.status}`)}
            </Badge>
            {saveStatus === "saving" && (
              <Badge variant="secondary" className="animate-pulse">
                {t("panel.saving")}
              </Badge>
            )}
            {saveStatus === "saved" && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                {t("panel.saved")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{questionnaireTitle}</p>
        </div>
      </div>

      {/* Progress indicator in header */}
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-8">
        <Progress value={progressPercent} className="flex-1" />
        <span className="text-sm font-medium whitespace-nowrap">
          {answeredCount}/{totalCount}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Submit button - only show if assessment is editable */}
        {isAlreadySubmitted ? (
          <Button variant="outline" size="sm" disabled>
            <Lock className="h-4 w-4 mr-2" />
            {tAssessment("alreadySubmitted")}
          </Button>
        ) : (
          <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant={canSubmit ? "default" : "outline"}
                size="sm"
                disabled={!canSubmit || isSubmitting || isSaving}
              >
                {isSubmitting || isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isSubmitting
                  ? tCommon("submitting")
                  : pendingSavesCount > 0
                  ? `${tAssessment("saving")} (${pendingSavesCount})`
                  : saveStatus === "saving"
                  ? tAssessment("saving")
                  : tAssessment("actions.submit")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {canSubmit ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                {tAssessment("confirmSubmit.title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {tAssessment("confirmSubmit.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{tAssessment("progress.percentComplete", { percent: progressPercent })}</span>
                <span className="text-sm font-medium">{answeredCount}/{totalCount}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              {canSubmit && (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {tAssessment("validation.canSubmit")}
                </p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>
                {tCommon("actions.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="bg-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {tCommon("submitting")}
                  </>
                ) : (
                  tCommon("actions.submit")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        )}

        {/* Fullscreen toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreenToggle}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Help button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsHelpOpen(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("header.help")} (? / F1)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Settings button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("header.settings")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Help Dialog */}
      <AssessmentHelpDialog
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        questionnaireType={assessment.questionnaireType as "ANS_USOAP_CMA" | "SMS_CANSO_SOE"}
      />

      {/* Settings Dialog */}
      <AssessmentSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </header>
  );
}

function ReadOnlyBanner() {
  const tAssessment = useTranslations("assessment");
  const { assessment } = useAssessmentWorkspace();

  if (!assessment) return null;

  const isSubmitted = assessment.status === "SUBMITTED" || assessment.status === "UNDER_REVIEW";
  const isCompleted = assessment.status === "COMPLETED" || assessment.status === "ARCHIVED";

  if (!isSubmitted && !isCompleted) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 text-sm",
      isCompleted
        ? "bg-green-50 text-green-800 border-b border-green-200"
        : "bg-amber-50 text-amber-800 border-b border-amber-200"
    )}>
      {isCompleted ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          <span>{tAssessment("completedReadOnly")}</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>{tAssessment("submittedReadOnly")}</span>
        </>
      )}
    </div>
  );
}

function WorkspaceContent() {
  const { isLoading, error } = useAssessmentWorkspace();
  const t = useTranslations("workspace");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            {t("error.title")}
          </h2>
          <p className="text-muted-foreground mb-4">{t("error.description")}</p>
          <Button variant="outline" asChild>
            <Link href="/assessments">{t("error.backButton")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left Sidebar - Question Navigation */}
      <QuestionNavigationSidebar />

      {/* Main Content - Question Response */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 min-h-0 overflow-hidden"
      >
        <QuestionResponsePanel />
      </motion.main>
    </div>
  );
}

export default function AssessmentTakePage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <AssessmentWorkspaceProvider assessmentId={id}>
      <div className="flex flex-col h-screen bg-background">
        <WorkspaceHeader />
        <ReadOnlyBanner />
        <WorkspaceContent />
      </div>
    </AssessmentWorkspaceProvider>
  );
}
