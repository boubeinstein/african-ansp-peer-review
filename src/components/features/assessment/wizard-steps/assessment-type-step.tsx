"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Search,
  Users,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AssessmentType } from "@prisma/client";

interface AssessmentTypeStepProps {
  value: AssessmentType | null;
  onChange: (value: AssessmentType) => void;
}

interface AssessmentOption {
  type: AssessmentType;
  icon: typeof ClipboardList;
  color: string;
  bgColor: string;
  borderColor: string;
  recommended?: boolean;
}

const assessmentOptions: AssessmentOption[] = [
  {
    type: "SELF_ASSESSMENT",
    icon: ClipboardList,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    recommended: true,
  },
  {
    type: "GAP_ANALYSIS",
    icon: Search,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    type: "PEER_REVIEW",
    icon: Users,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  {
    type: "FOLLOW_UP",
    icon: RefreshCw,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
];

export function AssessmentTypeStep({
  value,
  onChange,
}: AssessmentTypeStepProps) {
  const t = useTranslations("wizard");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("assessmentType.title")}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {t("assessmentType.description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {assessmentOptions.map((option, index) => {
          const Icon = option.icon;
          const isSelected = value === option.type;
          const typeKey = option.type.toLowerCase();

          return (
            <motion.div
              key={option.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  "relative cursor-pointer transition-all duration-200 hover:shadow-md h-full",
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
                    <CheckCircle className="h-4 w-4" />
                  </motion.div>
                )}

                {/* Recommended badge */}
                {option.recommended && (
                  <div className="absolute -top-2.5 left-3">
                    <Badge
                      variant="secondary"
                      className="text-xs shadow-sm"
                    >
                      {t("common.recommended")}
                    </Badge>
                  </div>
                )}

                <CardContent className={cn("p-5", option.recommended && "pt-6")}>
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        option.bgColor,
                        option.borderColor,
                        "border"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", option.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">
                        {t(`assessmentType.types.${typeKey}.title`)}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {t(`assessmentType.types.${typeKey}.description`)}
                      </p>
                    </div>
                  </div>

                  {/* Purpose callout */}
                  <div
                    className={cn(
                      "mt-4 rounded-lg border p-2.5",
                      option.bgColor,
                      option.borderColor
                    )}
                  >
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">
                        {t("assessmentType.bestFor")}:
                      </span>{" "}
                      {t(`assessmentType.types.${typeKey}.bestFor`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
