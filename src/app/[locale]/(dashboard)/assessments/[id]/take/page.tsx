"use client";

import { use } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  HelpCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AssessmentWorkspaceProvider,
  useAssessmentWorkspace,
} from "@/components/features/assessment/assessment-workspace-context";
import { QuestionNavigationSidebar } from "@/components/features/assessment/question-navigation-sidebar";
import { QuestionResponsePanel } from "@/components/features/assessment/question-response-panel";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

function WorkspaceHeader() {
  const t = useTranslations("workspace");
  const tAssessment = useTranslations("assessment");
  const locale = useLocale();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const {
    assessment,
    progressPercent,
    answeredCount,
    totalCount,
    saveStatus,
  } = useAssessmentWorkspace();

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

  const canSubmit = progressPercent === 100;

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
        {/* Submit button */}
        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant={canSubmit ? "default" : "outline"}
              size="sm"
              disabled={!canSubmit}
            >
              <Send className="h-4 w-4 mr-2" />
              {tAssessment("actions.submit")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tAssessment("actions.submit")}</DialogTitle>
              <DialogDescription>
                {tAssessment("validation.canSubmit")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{tAssessment("progress.percentComplete", { percent: progressPercent })}</span>
                <span className="text-sm font-medium">{answeredCount}/{totalCount}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
                {tAssessment("actions.continue")}
              </Button>
              <Button
                onClick={() => {
                  // TODO: Implement submit action
                  setIsSubmitDialogOpen(false);
                }}
              >
                {tAssessment("actions.submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("header.help")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Settings button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("header.settings")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
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
    <div className="flex flex-1 overflow-hidden">
      {/* Left Sidebar - Question Navigation */}
      <QuestionNavigationSidebar />

      {/* Main Content - Question Response */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 overflow-hidden"
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
        <WorkspaceContent />
      </div>
    </AssessmentWorkspaceProvider>
  );
}
