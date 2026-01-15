"use client";

import { useTranslations } from "next-intl";
import { use } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Settings, HelpCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const { assessment, progressPercent, answeredCount, totalCount } =
    useAssessmentWorkspace();

  if (!assessment) return null;

  return (
    <header className="flex items-center justify-between border-b px-4 py-3 bg-background">
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/assessments">
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
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg">{assessment.title}</h1>
            <Badge
              variant={
                assessment.questionnaireType === "ANS_USOAP_CMA"
                  ? "default"
                  : "secondary"
              }
            >
              {assessment.questionnaireType === "ANS_USOAP_CMA" ? "ANS" : "SMS"}
            </Badge>
            <Badge variant="outline">{assessment.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("header.progress", {
              answered: answeredCount,
              total: totalCount,
              percent: progressPercent,
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
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

export default function AssessmentWorkspacePage({ params }: PageProps) {
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
