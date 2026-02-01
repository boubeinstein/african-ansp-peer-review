"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ClipboardCheck, Shield, CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuestionnaireType } from "@/types/prisma-enums";

interface QuestionnaireTypeStepProps {
  value: QuestionnaireType | null;
  onChange: (value: QuestionnaireType) => void;
}

interface QuestionnaireOption {
  type: QuestionnaireType;
  icon: typeof ClipboardCheck;
  color: string;
  bgColor: string;
  borderColor: string;
  recommended?: boolean;
}

const questionnaireOptions: QuestionnaireOption[] = [
  {
    type: "ANS_USOAP_CMA",
    icon: ClipboardCheck,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    recommended: true,
  },
  {
    type: "SMS_CANSO_SOE",
    icon: Shield,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
];

export function QuestionnaireTypeStep({
  value,
  onChange,
}: QuestionnaireTypeStepProps) {
  const t = useTranslations("wizard");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("questionnaireType.title")}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {t("questionnaireType.description")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {questionnaireOptions.map((option, index) => {
          const Icon = option.icon;
          const isSelected = value === option.type;
          const isANS = option.type === "ANS_USOAP_CMA";

          return (
            <motion.div
              key={option.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "relative cursor-pointer transition-all duration-200 hover:shadow-md",
                  isSelected
                    ? `ring-2 ring-primary shadow-md ${option.bgColor}`
                    : "hover:border-primary/50"
                )}
                onClick={() => onChange(option.type)}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-2 -top-2 rounded-full bg-primary p-1 text-primary-foreground shadow-lg"
                  >
                    <CheckCircle className="h-5 w-5" />
                  </motion.div>
                )}

                {/* Recommended badge */}
                {option.recommended && (
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-primary text-primary-foreground shadow-sm">
                      <Sparkles className="mr-1 h-3 w-3" />
                      {t("common.recommended")}
                    </Badge>
                  </div>
                )}

                <CardContent className="p-6 pt-8">
                  {/* Icon and title */}
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                        option.bgColor,
                        option.borderColor,
                        "border"
                      )}
                    >
                      <Icon className={cn("h-6 w-6", option.color)} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {isANS
                          ? t("questionnaireType.ans.title")
                          : t("questionnaireType.sms.title")}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isANS
                          ? t("questionnaireType.ans.subtitle")
                          : t("questionnaireType.sms.subtitle")}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-4 text-sm text-muted-foreground">
                    {isANS
                      ? t("questionnaireType.ans.description")
                      : t("questionnaireType.sms.description")}
                  </p>

                  {/* Features list */}
                  <ul className="mt-4 space-y-2">
                    {(isANS
                      ? [
                          { label: t("questionnaireType.ans.feature1"), value: "851" },
                          { label: t("questionnaireType.ans.feature2"), value: "9" },
                          { label: t("questionnaireType.ans.feature3"), value: "8" },
                        ]
                      : [
                          { label: t("questionnaireType.sms.feature1"), value: "A-E" },
                          { label: t("questionnaireType.sms.feature2"), value: "4" },
                          { label: t("questionnaireType.sms.feature3"), value: "12" },
                        ]
                    ).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle
                          className={cn("h-4 w-4 shrink-0", option.color)}
                        />
                        <span className="text-muted-foreground">
                          {feature.label}:{" "}
                          <span className="font-medium text-foreground">
                            {feature.value}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Key difference callout */}
                  <div
                    className={cn(
                      "mt-4 rounded-lg border p-3",
                      option.bgColor,
                      option.borderColor
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {isANS
                        ? t("questionnaireType.ans.keyDifference")
                        : t("questionnaireType.sms.keyDifference")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {t("questionnaireType.helpText")}
        </p>
      </div>
    </div>
  );
}
