"use client";

/**
 * Assessments Combined Client — unified Questionnaires + Assessments hub
 *
 * Three tabs:
 *   1. My Assessments — self-assessment list, stats, filters, summary row
 *   2. ANS Protocol Questions — review area navigation grid (7 areas)
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
  Layers,
  Target,
  Award,
  BookOpen,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AssessmentsStats } from "@/components/features/assessments/assessments-stats";
import { AssessmentsFilters } from "@/components/features/assessments/assessments-filters";
import { AssessmentsList } from "@/components/features/assessments/assessments-list";
import { ANSReviewAreaGrid } from "@/components/features/assessments/ans-review-area-grid";
import { QuestionnaireTypeCard } from "@/components/features/questionnaire/questionnaire-type-card";
import { QUESTIONNAIRE_METADATA } from "@/lib/questionnaire/constants";
import { trpc } from "@/lib/trpc/client";

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

  // Fetch dynamic ANS stats for About section interpolation
  const { data: ansStats } = trpc.questionnaire.getANSStats.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 }
  );
  const ansCount = ansStats?.totalCount ?? 0;
  const areaCount = Object.keys(ansStats?.countsByArea ?? {}).length || 7;

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

        {/* Tab 2: ANS Protocol Questions — Review Area Grid */}
        <TabsContent value="usoap" className="space-y-6">
          <ANSReviewAreaGrid locale={locale} />

          {/* About section */}
          <div className="rounded-lg border bg-muted/30 p-6 space-y-3">
            <h3 className="font-semibold">{tQ("info.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {tQ("info.ansDescription", { ansCount, areaCount })}
            </p>
            <p className="text-sm text-muted-foreground">
              {tQ("info.together")}
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

          {/* About section */}
          <div className="rounded-lg border bg-muted/30 p-6 space-y-3">
            <h3 className="font-semibold">{tQ("info.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {tQ("info.smsDescription")}
            </p>
            <p className="text-sm text-muted-foreground">
              {tQ("info.together")}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AssessmentsCombinedClient;
