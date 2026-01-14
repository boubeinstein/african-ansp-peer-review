"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronRight, Home, Shield } from "lucide-react";
import { ComponentTabs } from "./component-tabs";
import { StudyAreaAccordion } from "./study-area-accordion";
import { MaturityLegend } from "./maturity-legend";
import { SMS_COMPONENTS } from "@/lib/questionnaire/constants";
import type { SMSComponent, CANSOStudyArea } from "@prisma/client";

interface SMSBrowserProps {
  locale: string;
  initialComponent?: string;
  initialStudyArea?: string;
}

export function SMSBrowser({
  locale,
  initialComponent,
  initialStudyArea,
}: SMSBrowserProps) {
  const t = useTranslations("smsBrowser");
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = locale === "fr" ? "fr" : "en";

  // State
  const [selectedComponent, setSelectedComponent] = useState<SMSComponent>(
    (initialComponent as SMSComponent) || "SAFETY_POLICY_OBJECTIVES"
  );

  // Update URL when component changes
  const handleComponentChange = useCallback(
    (component: SMSComponent) => {
      setSelectedComponent(component);
      const params = new URLSearchParams(searchParams.toString());
      params.set("component", component);
      params.delete("studyArea");
      router.push(`/${locale}/questionnaires/sms?${params.toString()}`);
    },
    [router, searchParams, locale]
  );

  // Update URL when study area is expanded
  const handleStudyAreaChange = useCallback(
    (studyArea: CANSOStudyArea | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (studyArea) {
        params.set("studyArea", studyArea);
      } else {
        params.delete("studyArea");
      }
      router.push(`/${locale}/questionnaires/sms?${params.toString()}`);
    },
    [router, searchParams, locale]
  );

  const componentMeta = SMS_COMPONENTS[selectedComponent];

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb & Header */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link
            href={`/${locale}/questionnaires`}
            className="hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/${locale}/questionnaires`}
            className="hover:text-foreground transition-colors"
          >
            {t("breadcrumb.questionnaires")}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            {t("breadcrumb.sms")}
          </span>
        </nav>

        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-600" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Maturity Legend */}
      <MaturityLegend locale={locale} defaultOpen={false} />

      {/* Component Tabs */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("components.title")}</h2>
        <ComponentTabs
          selected={selectedComponent}
          onChange={handleComponentChange}
          locale={locale}
        />
      </div>

      {/* Component Details */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t("components.selected")}:
          </span>
          <span className="font-semibold">{componentMeta.name[lang]}</span>
          <span className="text-sm px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 font-bold">
            {Math.round(componentMeta.weight * 100)}% {t("components.weight")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {componentMeta.description[lang]}
        </p>
      </div>

      {/* Study Areas */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {t("studyArea.title")}
        </h2>
        <StudyAreaAccordion
          component={selectedComponent}
          locale={locale}
          defaultOpen={initialStudyArea}
          onStudyAreaChange={handleStudyAreaChange}
        />
      </div>
    </div>
  );
}
