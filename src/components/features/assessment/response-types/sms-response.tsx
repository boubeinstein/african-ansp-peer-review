"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SMSMaturityLevel } from "../assessment-workspace-context";

interface SMSResponseProps {
  value: SMSMaturityLevel | null;
  onChange: (value: SMSMaturityLevel) => void;
  disabled?: boolean;
}

interface MaturityOption {
  value: SMSMaturityLevel;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBg: string;
  selectedBg: string;
  selectedBorder: string;
  score: number;
}

export function SMSResponse({ value, onChange, disabled }: SMSResponseProps) {
  const t = useTranslations("workspace.smsResponse");

  const options: MaturityOption[] = [
    {
      value: "A",
      label: t("levelA"),
      description: t("levelADescription"),
      color: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      hoverBg: "hover:bg-red-100",
      selectedBg: "bg-red-600",
      selectedBorder: "border-red-600",
      score: 1,
    },
    {
      value: "B",
      label: t("levelB"),
      description: t("levelBDescription"),
      color: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      hoverBg: "hover:bg-orange-100",
      selectedBg: "bg-orange-500",
      selectedBorder: "border-orange-500",
      score: 2,
    },
    {
      value: "C",
      label: t("levelC"),
      description: t("levelCDescription"),
      color: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      hoverBg: "hover:bg-yellow-100",
      selectedBg: "bg-yellow-500",
      selectedBorder: "border-yellow-500",
      score: 3,
    },
    {
      value: "D",
      label: t("levelD"),
      description: t("levelDDescription"),
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      hoverBg: "hover:bg-blue-100",
      selectedBg: "bg-blue-600",
      selectedBorder: "border-blue-600",
      score: 4,
    },
    {
      value: "E",
      label: t("levelE"),
      description: t("levelEDescription"),
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      hoverBg: "hover:bg-green-100",
      selectedBg: "bg-green-600",
      selectedBorder: "border-green-600",
      score: 5,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{t("title")}</h3>
        <Badge variant="outline" className="text-xs">
          {t("cansoSoE")}
        </Badge>
      </div>

      {/* Maturity scale visualization */}
      <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg">
        <span className="text-xs text-muted-foreground mr-2">{t("maturityScale")}</span>
        {options.map((option, index) => (
          <div key={option.value} className="flex items-center">
            <div
              className={cn(
                "h-2 w-8 rounded-sm transition-all",
                value === option.value
                  ? option.selectedBg
                  : value && options.findIndex(o => o.value === value) > index
                  ? option.selectedBg + "/60"
                  : "bg-gray-200"
              )}
            />
            {index < options.length - 1 && <div className="h-px w-1 bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Maturity level options */}
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              whileHover={{ x: disabled ? 0 : 4 }}
              whileTap={{ scale: disabled ? 1 : 0.99 }}
              className={cn(
                "relative w-full flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                disabled && "cursor-not-allowed opacity-50",
                isSelected
                  ? cn("border-transparent shadow-md", option.selectedBg, "text-white")
                  : cn(
                      option.bgColor,
                      option.borderColor,
                      option.hoverBg,
                      "cursor-pointer"
                    )
              )}
            >
              {/* Level indicator */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-lg",
                  isSelected
                    ? "bg-white/20 text-white"
                    : cn("bg-white", option.color)
                )}
              >
                {option.value}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{option.label}</span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-white text-muted-foreground"
                    )}
                  >
                    {t("score", { score: option.score })}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-sm mt-1",
                    isSelected ? "text-white/90" : "text-muted-foreground"
                  )}
                >
                  {option.description}
                </p>
              </div>

              {/* Keyboard shortcut */}
              <span
                className={cn(
                  "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded text-xs font-mono",
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {option.value}
              </span>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 bottom-3"
                >
                  <svg
                    className="h-5 w-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Current selection summary */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 bg-muted rounded-lg"
        >
          <span className="text-sm text-muted-foreground">
            {t("selectedLevel")}
          </span>
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold", options.find(o => o.value === value)?.color)}>
              {t("level")} {value}
            </span>
            <span className="text-sm text-muted-foreground">
              ({options.find(o => o.value === value)?.label})
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
