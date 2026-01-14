import { getTranslations } from "next-intl/server";
import { BookOpen, Layers, Target, Award, BarChart3 } from "lucide-react";
import { QuestionnaireTypeCard } from "@/components/features/questionnaire/questionnaire-type-card";
import {
  TOTAL_USOAP_PQ_COUNT,
  QUESTIONNAIRE_METADATA,
} from "@/lib/questionnaire/constants";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "questionnaire" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function QuestionnairesPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "questionnaire" });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Type Selection */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("selectType")}</h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ANS USOAP CMA Card */}
          <QuestionnaireTypeCard
            type="ans"
            title={t("ans.title")}
            fullTitle={t("ans.fullTitle")}
            description={t("ans.description")}
            effectiveDate={t("ans.effectiveDate")}
            browseLabel={t("ans.browse")}
            href="/questionnaires/ans"
            locale={locale}
            isNew
            stats={[
              {
                label: t("stats.totalQuestions"),
                value: TOTAL_USOAP_PQ_COUNT,
                icon: <BookOpen className="h-4 w-4" />,
              },
              {
                label: t("ans.auditAreas"),
                value: QUESTIONNAIRE_METADATA.ANS_USOAP_CMA.auditAreas,
                icon: <Layers className="h-4 w-4" />,
              },
              {
                label: t("ans.criticalElements"),
                value: QUESTIONNAIRE_METADATA.ANS_USOAP_CMA.criticalElements,
                icon: <Target className="h-4 w-4" />,
              },
              {
                label: t("stats.priorityQuestions"),
                value: "128",
                icon: <BarChart3 className="h-4 w-4" />,
              },
            ]}
          />

          {/* SMS CANSO SoE Card */}
          <QuestionnaireTypeCard
            type="sms"
            title={t("sms.title")}
            fullTitle={t("sms.fullTitle")}
            description={t("sms.description")}
            browseLabel={t("sms.browse")}
            href="/questionnaires/sms"
            locale={locale}
            isNew
            stats={[
              {
                label: t("sms.components"),
                value: QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.components,
                icon: <Layers className="h-4 w-4" />,
              },
              {
                label: t("sms.studyAreas"),
                value: QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.studyAreas,
                icon: <Target className="h-4 w-4" />,
              },
              {
                label: t("sms.maturityLevels"),
                value: QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.maturityLevels,
                icon: <Award className="h-4 w-4" />,
              },
              {
                label: t("stats.totalQuestions"),
                value: QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.totalQuestions,
                icon: <BookOpen className="h-4 w-4" />,
              },
            ]}
          />
        </div>
      </div>

      {/* Quick Info Section */}
      <div className="rounded-lg border bg-muted/30 p-6">
        <h3 className="font-semibold mb-3">{t("info.title")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
              {t("ans.title")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t("info.ansDescription")}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">
              {t("sms.title")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t("info.smsDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
