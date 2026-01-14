"use client";

import Link from "next/link";
import { FileText, Shield, ArrowRight, BookOpen, Layers, Target, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

interface QuestionnaireTypeCardProps {
  type: "ans" | "sms";
  title: string;
  fullTitle: string;
  description: string;
  effectiveDate?: string;
  stats: StatItem[];
  browseLabel: string;
  href: string;
  locale: string;
  isNew?: boolean;
}

export function QuestionnaireTypeCard({
  type,
  title,
  fullTitle,
  description,
  effectiveDate,
  stats,
  browseLabel,
  href,
  locale,
  isNew = false,
}: QuestionnaireTypeCardProps) {
  const isANS = type === "ans";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-lg",
        isANS
          ? "border-blue-200 hover:border-blue-300 dark:border-blue-900 dark:hover:border-blue-800"
          : "border-emerald-200 hover:border-emerald-300 dark:border-emerald-900 dark:hover:border-emerald-800"
      )}
    >
      {/* Colored top bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isANS ? "bg-blue-500" : "bg-emerald-500"
        )}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              isANS
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            )}
          >
            {isANS ? (
              <FileText className="h-6 w-6" />
            ) : (
              <Shield className="h-6 w-6" />
            )}
          </div>
          {isNew && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              2024
            </Badge>
          )}
        </div>

        <div className="space-y-1 pt-3">
          <CardTitle className="text-xl">{title}</CardTitle>
          <p
            className={cn(
              "text-sm font-medium",
              isANS ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {fullTitle}
          </p>
        </div>

        <CardDescription className="text-sm leading-relaxed pt-2">
          {description}
        </CardDescription>

        {effectiveDate && (
          <p className="text-xs text-muted-foreground pt-1">{effectiveDate}</p>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col rounded-lg p-3",
                isANS
                  ? "bg-blue-50 dark:bg-blue-950/30"
                  : "bg-emerald-50 dark:bg-emerald-950/30"
              )}
            >
              <div className="flex items-center gap-2">
                {stat.icon && (
                  <span
                    className={cn(
                      "text-muted-foreground",
                      isANS ? "text-blue-500" : "text-emerald-500"
                    )}
                  >
                    {stat.icon}
                  </span>
                )}
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          asChild
          className={cn(
            "w-full group",
            isANS
              ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          )}
        >
          <Link href={`/${locale}${href}`}>
            {browseLabel}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Helper to get default stats icons
export function getStatsIcon(type: string) {
  switch (type) {
    case "questions":
      return <BookOpen className="h-4 w-4" />;
    case "areas":
      return <Layers className="h-4 w-4" />;
    case "elements":
      return <Target className="h-4 w-4" />;
    case "levels":
      return <Award className="h-4 w-4" />;
    default:
      return null;
  }
}
