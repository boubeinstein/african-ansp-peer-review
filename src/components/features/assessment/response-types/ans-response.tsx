"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ANSResponseValue } from "../assessment-workspace-context";

interface ANSResponseProps {
  value: ANSResponseValue | null;
  onChange: (value: ANSResponseValue) => void;
  disabled?: boolean;
}

interface ResponseOption {
  value: ANSResponseValue;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBg: string;
  selectedBg: string;
  selectedText: string;
  shortcut: string;
}

export function ANSResponse({ value, onChange, disabled }: ANSResponseProps) {
  const t = useTranslations("workspace.ansResponse");

  const options: ResponseOption[] = [
    {
      value: "SATISFACTORY",
      label: t("satisfactory"),
      description: t("satisfactoryDescription"),
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      hoverBg: "hover:bg-green-100",
      selectedBg: "bg-green-600",
      selectedText: "text-white",
      shortcut: "1",
    },
    {
      value: "NOT_SATISFACTORY",
      label: t("notSatisfactory"),
      description: t("notSatisfactoryDescription"),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      hoverBg: "hover:bg-red-100",
      selectedBg: "bg-red-600",
      selectedText: "text-white",
      shortcut: "2",
    },
    {
      value: "NOT_APPLICABLE",
      label: t("notApplicable"),
      description: t("notApplicableDescription"),
      icon: MinusCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      hoverBg: "hover:bg-gray-100",
      selectedBg: "bg-gray-600",
      selectedText: "text-white",
      shortcut: "3",
    },
    {
      value: "NOT_REVIEWED",
      label: t("notReviewed"),
      description: t("notReviewedDescription"),
      icon: HelpCircle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      hoverBg: "hover:bg-yellow-100",
      selectedBg: "bg-yellow-600",
      selectedText: "text-white",
      shortcut: "4",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{t("title")}</h3>
        <Badge variant="outline" className="text-xs">
          {t("protocol")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                disabled && "cursor-not-allowed opacity-50",
                isSelected
                  ? cn(option.selectedBg, option.selectedText, "border-transparent shadow-lg")
                  : cn(
                      option.bgColor,
                      option.borderColor,
                      option.hoverBg,
                      "cursor-pointer"
                    )
              )}
            >
              {/* Keyboard shortcut badge */}
              <span
                className={cn(
                  "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-xs font-mono",
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {option.shortcut}
              </span>

              <Icon
                className={cn(
                  "h-8 w-8",
                  isSelected ? "text-white" : option.color
                )}
              />

              <div className="text-center">
                <div className="font-semibold text-sm">{option.label}</div>
                <div
                  className={cn(
                    "text-xs mt-1",
                    isSelected ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {option.description}
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  layoutId="ans-selection"
                  className="absolute inset-0 rounded-lg border-2 border-white/50"
                  initial={false}
                  transition={{ type: "spring", duration: 0.3 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Status message */}
      {value && value !== "NOT_REVIEWED" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-sm text-center p-2 rounded-md",
            value === "SATISFACTORY" && "bg-green-50 text-green-700",
            value === "NOT_SATISFACTORY" && "bg-red-50 text-red-700",
            value === "NOT_APPLICABLE" && "bg-gray-50 text-gray-700"
          )}
        >
          {value === "SATISFACTORY" && t("satisfactoryMessage")}
          {value === "NOT_SATISFACTORY" && t("notSatisfactoryMessage")}
          {value === "NOT_APPLICABLE" && t("notApplicableMessage")}
        </motion.div>
      )}
    </div>
  );
}
