"use client";

/**
 * Assessments Combined Client — unified Questionnaires + Assessments hub
 *
 * Three tabs:
 *   1. My Assessments — self-assessment list, stats, filters
 *   2. USOAP CMA Questions — ANS questionnaire browser
 *   3. CANSO SoE Framework — SMS questionnaire browser
 */

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck,
  FileText,
  Shield,
  Plus,
  BookOpen,
  Layers,
  Target,
  Award,
  BarChart3,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AssessmentsStats } from "@/components/features/assessments/assessments-stats";
import { AssessmentsFilters } from "@/components/features/assessments/assessments-filters";
import { AssessmentsList } from "@/components/features/assessments/assessments-list";
import { QuestionnaireTypeCard } from "@/components/features/questionnaire/questionnaire-type-card";
import {
  TOTAL_USOAP_PQ_COUNT,
  QUESTIONNAIRE_METADATA,
} from "@/lib/questionnaire/constants";

// =============================================================================
// TYPES
// =============================================================================

interface AssessmentsCombinedClientProps {
  locale: string;
  canFilterByOrg: boolean;
  canCreate: boolean;
  effectiveOrgFilter?: string;
  initialFilters: {
    organizationId?: string;
    status?: string;
    type?: string;
  };
}

type AssessmentsTab = "myAssessments" | "usoap" | "cansoSoe";

const VALID_TABS: AssessmentsTab[] = ["myAssessments", "usoap", "cansoSoe"];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AssessmentsCombinedClient({
  locale,
  canFilterByOrg,
  canCreate,
  effectiveOrgFilter,
  initialFilters,
}: AssessmentsCombinedClientProps) {
  const t = useTranslations("assessments");
  const tQ = useTranslations("questionnaire");
  const searchParams = useSearchParams();

  // Support ?tab= deep linking (e.g. redirect from /questionnaires)
  const tabParam = searchParams.get("tab") as AssessmentsTab | null;
  const defaultTab: AssessmentsTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "myAssessments";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("combinedTitle")}
          </h1>
          <p className="text-muted-foreground">{t("combinedSubtitle")}</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href={`/${locale}/assessments/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t("createAssessment")}
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="myAssessments" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4 hidden sm:inline" />
            {t("tabs.myAssessments")}
          </TabsTrigger>
          <TabsTrigger value="usoap" className="gap-1.5">
            <FileText className="h-4 w-4 hidden sm:inline" />
            {t("tabs.usoap")}
          </TabsTrigger>
          <TabsTrigger value="cansoSoe" className="gap-1.5">
            <Shield className="h-4 w-4 hidden sm:inline" />
            {t("tabs.cansoSoe")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: My Assessments */}
        <TabsContent value="myAssessments" className="space-y-6">
          <AssessmentsStats organizationId={effectiveOrgFilter} />
          <AssessmentsFilters
            showOrganizationFilter={canFilterByOrg}
            initialFilters={initialFilters}
          />
          <AssessmentsList
            organizationId={effectiveOrgFilter}
            status={initialFilters.status}
            questionnaireType={initialFilters.type}
          />
        </TabsContent>

        {/* Tab 2: USOAP CMA Questions */}
        <TabsContent value="usoap" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{tQ("ans.title")}</h2>
            <div className="max-w-xl">
              <QuestionnaireTypeCard
                type="ans"
                title={tQ("ans.title")}
                fullTitle={tQ("ans.fullTitle")}
                description={tQ("ans.description")}
                effectiveDate={tQ("ans.effectiveDate")}
                browseLabel={tQ("ans.browse")}
                href="/questionnaires/ans"
                locale={locale}
                isNew
                stats={[
                  {
                    label: tQ("stats.totalQuestions"),
                    value: TOTAL_USOAP_PQ_COUNT,
                    icon: <BookOpen className="h-4 w-4" />,
                  },
                  {
                    label: tQ("ans.auditAreas"),
                    value: QUESTIONNAIRE_METADATA.ANS_USOAP_CMA.auditAreas,
                    icon: <Layers className="h-4 w-4" />,
                  },
                  {
                    label: tQ("ans.criticalElements"),
                    value: QUESTIONNAIRE_METADATA.ANS_USOAP_CMA.criticalElements,
                    icon: <Target className="h-4 w-4" />,
                  },
                  {
                    label: tQ("stats.priorityQuestions"),
                    value: "128",
                    icon: <BarChart3 className="h-4 w-4" />,
                  },
                ]}
              />
            </div>
          </div>

          {/* Quick Info */}
          <div className="rounded-lg border bg-muted/30 p-6">
            <h3 className="font-semibold mb-3">{tQ("info.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {tQ("info.ansDescription")}
            </p>
          </div>
        </TabsContent>

        {/* Tab 3: CANSO SoE Framework */}
        <TabsContent value="cansoSoe" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{tQ("sms.title")}</h2>
            <div className="max-w-xl">
              <QuestionnaireTypeCard
                type="sms"
                title={tQ("sms.title")}
                fullTitle={tQ("sms.fullTitle")}
                description={tQ("sms.description")}
                browseLabel={tQ("sms.browse")}
                href="/questionnaires/sms"
                locale={locale}
                isNew
                stats={[
                  {
                    label: tQ("sms.components"),
                    value: QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.components,
                    icon: <Layers className="h-4 w-4" />,
                  },
                  {
                    label: tQ("sms.studyAreas"),
                    value: QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.studyAreas,
                    icon: <Target className="h-4 w-4" />,
                  },
                  {
                    label: tQ("sms.maturityLevels"),
                    value: QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.maturityLevels,
                    icon: <Award className="h-4 w-4" />,
                  },
                  {
                    label: tQ("stats.totalQuestions"),
                    value: QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.totalQuestions,
                    icon: <BookOpen className="h-4 w-4" />,
                  },
                ]}
              />
            </div>
          </div>

          {/* Quick Info */}
          <div className="rounded-lg border bg-muted/30 p-6">
            <h3 className="font-semibold mb-3">{tQ("info.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {tQ("info.smsDescription")}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AssessmentsCombinedClient;
