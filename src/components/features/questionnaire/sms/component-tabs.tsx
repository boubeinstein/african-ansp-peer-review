"use client";

import { useTranslations } from "next-intl";
import { Shield, AlertTriangle, CheckCircle, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSMSComponentsArray } from "@/lib/questionnaire/constants";
import type { SMSComponent } from "@prisma/client";

interface ComponentTabsProps {
  selected: SMSComponent;
  onChange: (component: SMSComponent) => void;
  locale: string;
}

const componentIcons: Record<SMSComponent, typeof Shield> = {
  SAFETY_POLICY_OBJECTIVES: Shield,
  SAFETY_RISK_MANAGEMENT: AlertTriangle,
  SAFETY_ASSURANCE: CheckCircle,
  SAFETY_PROMOTION: Megaphone,
};

const componentColors: Record<
  SMSComponent,
  {
    bg: string;
    bgActive: string;
    border: string;
    text: string;
    textActive: string;
    icon: string;
    iconActive: string;
    weight: string;
  }
> = {
  SAFETY_POLICY_OBJECTIVES: {
    bg: "bg-white dark:bg-gray-900",
    bgActive: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-gray-200 dark:border-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    textActive: "text-emerald-700 dark:text-emerald-400",
    icon: "text-gray-400",
    iconActive: "text-emerald-600 dark:text-emerald-400",
    weight: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
  },
  SAFETY_RISK_MANAGEMENT: {
    bg: "bg-white dark:bg-gray-900",
    bgActive: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-gray-200 dark:border-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    textActive: "text-amber-700 dark:text-amber-400",
    icon: "text-gray-400",
    iconActive: "text-amber-600 dark:text-amber-400",
    weight: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
  },
  SAFETY_ASSURANCE: {
    bg: "bg-white dark:bg-gray-900",
    bgActive: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-gray-200 dark:border-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    textActive: "text-blue-700 dark:text-blue-400",
    icon: "text-gray-400",
    iconActive: "text-blue-600 dark:text-blue-400",
    weight: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  },
  SAFETY_PROMOTION: {
    bg: "bg-white dark:bg-gray-900",
    bgActive: "bg-purple-50 dark:bg-purple-950/50",
    border: "border-gray-200 dark:border-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    textActive: "text-purple-700 dark:text-purple-400",
    icon: "text-gray-400",
    iconActive: "text-purple-600 dark:text-purple-400",
    weight: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400",
  },
};

export function ComponentTabs({
  selected,
  onChange,
  locale,
}: ComponentTabsProps) {
  const t = useTranslations("smsBrowser");
  const components = getSMSComponentsArray();
  const lang = locale === "fr" ? "fr" : "en";

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      {components.map((component) => {
        const isActive = selected === component.code;
        const Icon = componentIcons[component.code];
        const colors = componentColors[component.code];

        return (
          <button
            key={component.code}
            onClick={() => onChange(component.code)}
            className={cn(
              "flex-shrink-0 rounded-xl border-2 p-4 text-left transition-all min-w-[180px]",
              "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500",
              isActive
                ? cn(colors.bgActive, "border-current", colors.textActive)
                : cn(colors.bg, colors.border, "hover:border-gray-300")
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <Icon
                className={cn(
                  "h-6 w-6",
                  isActive ? colors.iconActive : colors.icon
                )}
              />
              <span
                className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded",
                  colors.weight
                )}
              >
                {Math.round(component.weight * 100)}%
              </span>
            </div>
            <div className="space-y-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isActive ? colors.textActive : colors.text
                )}
              >
                {t(`components.${component.number}.short`)}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {component.name[lang]}
              </p>
            </div>

            {/* Visual weight indicator */}
            <div className="mt-3 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isActive
                    ? componentColors[component.code].iconActive.replace(
                        "text-",
                        "bg-"
                      )
                    : "bg-gray-300 dark:bg-gray-600"
                )}
                style={{ width: `${component.weight * 100}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
