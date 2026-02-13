"use client";

/**
 * Review Request Wizard Component
 *
 * Multi-step wizard for requesting a peer review. Guides users through:
 * 1. Assessment selection
 * 2. Scope definition
 * 3. Schedule preferences
 * 4. Logistics details
 * 5. Final review and submission
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ANSReviewArea } from "@prisma/client";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Icons
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarIcon,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

// =============================================================================
// SIMPLE CHECKBOX (Bypasses Radix Presence issue)
// =============================================================================

interface SimpleCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  id?: string;
}

function SimpleCheckbox({
  checked,
  onCheckedChange,
  className,
  id,
}: SimpleCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      id={id}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange(!checked);
      }}
      className={cn(
        "size-4 shrink-0 rounded-[4px] border shadow-xs outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-primary border-primary"
          : "border-input bg-background hover:bg-accent",
        className
      )}
    >
      {checked && (
        <svg
          className="size-3.5 text-primary-foreground mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  );
}

// =============================================================================
// SIMPLE RADIO GROUP (Bypasses Radix Presence issue)
// =============================================================================

interface SimpleRadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

interface SimpleRadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SimpleRadioOption[];
  className?: string;
  variant?: "card" | "inline";
}

function SimpleRadioGroup({
  value,
  onValueChange,
  options,
  className,
  variant = "card",
}: SimpleRadioGroupProps) {
  // Radio indicator component with hardcoded colors for visibility
  const RadioIndicator = ({ isSelected }: { isSelected: boolean }) => (
    <span
      className="shrink-0"
      style={{
        display: 'inline-block',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: '2px solid',
        borderColor: isSelected ? '#2563eb' : '#9ca3af',
        backgroundColor: isSelected ? '#2563eb' : 'transparent',
        position: 'relative',
      }}
    >
      {isSelected && (
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
          }}
        />
      )}
    </span>
  );

  if (variant === "inline") {
    return (
      <div className={cn("flex gap-4", className)} role="radiogroup">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onValueChange(option.value)}
            >
              <RadioIndicator isSelected={isSelected} />
              <span className="font-normal">{option.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  // Card variant
  return (
    <div className={cn("space-y-3", className)} role="radiogroup">
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <div
            key={option.value}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onValueChange(option.value);
              }
            }}
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
              isSelected
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
            )}
          >
            <span className="mt-0.5">
              <RadioIndicator isSelected={isSelected} />
            </span>
            <div className="flex-1">
              <div className="font-medium">{option.label}</div>
              {option.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewRequestWizardProps {
  userOrganizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
  locale: string;
}

interface WizardStep {
  id: string;
  icon: React.ElementType;
  labelKey: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS: WizardStep[] = [
  { id: "assessment", icon: FileText, labelKey: "steps.assessment" },
  { id: "scope", icon: Globe, labelKey: "steps.scope" },
  { id: "schedule", icon: CalendarIcon, labelKey: "steps.schedule" },
  { id: "logistics", icon: MapPin, labelKey: "steps.logistics" },
  { id: "review", icon: CheckCircle2, labelKey: "steps.review" },
];

// Focus areas for review scope
const ANS_FOCUS_AREAS = ["ATS", "AIM", "MET", "CNS", "SAR"] as const;
const SMS_FOCUS_AREAS = ["SMS_POLICY", "SMS_RISK", "SMS_ASSURANCE", "SMS_PROMOTION"] as const;

// Questionnaire type enum values
type QuestionnaireType = "ANS_USOAP_CMA" | "SMS_CANSO_SOE";

// Assessment type from prerequisites
interface SubmittedAssessment {
  id: string;
  type: QuestionnaireType;
  submittedAt: Date | null;
  overallScore: number | null;
}

// =============================================================================
// FORM SCHEMA
// =============================================================================

// Base schema for the form (without refinements for proper type inference)
const reviewRequestBaseSchema = z.object({
  assessmentIds: z
    .array(z.string())
    .min(1, "At least one assessment must be selected"),
  reviewType: z.enum(["FULL", "FOCUSED", "FOLLOW_UP"]),
  focusAreas: z.array(z.string()),
  requestedStartDate: z.date().optional(),
  requestedEndDate: z.date().optional(),
  locationType: z.enum(["ON_SITE", "HYBRID", "REMOTE"]),
  accommodationProvided: z.boolean(),
  transportationProvided: z.boolean(),
  languagePreference: z.enum(["EN", "FR", "BOTH"]),
  primaryContactName: z.string().min(1, "Primary contact name is required"),
  primaryContactEmail: z.string().email("Invalid email address"),
  primaryContactPhone: z.string().optional(),
  specialRequirements: z.string().optional(),
});

// Full schema with refinements for validation on submit
export const reviewRequestFormSchema = reviewRequestBaseSchema
  .refine(
    (data) => data.requestedStartDate !== undefined,
    {
      message: "Start date is required",
      path: ["requestedStartDate"],
    }
  )
  .refine(
    (data) => data.requestedEndDate !== undefined,
    {
      message: "End date is required",
      path: ["requestedEndDate"],
    }
  )
  .refine(
    (data) => {
      if (!data.requestedStartDate || !data.requestedEndDate) return true;
      return data.requestedEndDate > data.requestedStartDate;
    },
    {
      message: "End date must be after start date",
      path: ["requestedEndDate"],
    }
  )
  .refine(
    (data) => {
      if (!data.requestedStartDate || !data.requestedEndDate) return true;
      const diffTime = data.requestedEndDate.getTime() - data.requestedStartDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 3 && diffDays <= 10;
    },
    {
      message: "Review duration must be between 3 and 10 days",
      path: ["requestedEndDate"],
    }
  );

export type ReviewRequestFormData = z.infer<typeof reviewRequestBaseSchema>;

// =============================================================================
// STEP COMPONENTS
// =============================================================================

/**
 * Step 1: Assessment Selection
 */
interface AssessmentStepProps {
  form: UseFormReturn<ReviewRequestFormData>;
  assessments: SubmittedAssessment[];
}

function AssessmentStep({ form, assessments }: AssessmentStepProps) {
  const t = useTranslations("review.request");

  if (assessments.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("assessment.noAssessments")}</AlertTitle>
        <AlertDescription>
          {t("assessment.noAssessmentsDescription")}
        </AlertDescription>
      </Alert>
    );
  }

  const getScoreBadgeVariant = (score: number | null): "default" | "secondary" | "destructive" => {
    if (score === null) return "secondary";
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const getAssessmentLabel = (type: "ANS_USOAP_CMA" | "SMS_CANSO_SOE"): string => {
    return type === "ANS_USOAP_CMA"
      ? "ANS (USOAP CMA 2024)"
      : "SMS (CANSO SoE)";
  };

  return (
    <FormField
      control={form.control}
      name="assessmentIds"
      render={() => (
        <FormItem>
          <div className="mb-4">
            <FormLabel>{t("assessment.selectLabel")}</FormLabel>
            <FormDescription>
              {t("assessment.selectDescription")}
            </FormDescription>
          </div>
          <div className="space-y-3">
            {assessments.map((assessment) => (
              <FormField
                key={assessment.id}
                control={form.control}
                name="assessmentIds"
                render={({ field }) => {
                  const isSelected = field.value?.includes(assessment.id) ?? false;

                  const handleChange = (checked: boolean) => {
                    const currentValue = field.value || [];
                    const newValue = checked
                      ? [...currentValue, assessment.id]
                      : currentValue.filter((id) => id !== assessment.id);
                    field.onChange(newValue);
                  };

                  return (
                    <FormItem>
                      <FormControl>
                        <label
                          htmlFor={`assessment-${assessment.id}`}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all cursor-pointer",
                            isSelected
                              ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <SimpleCheckbox
                            id={`assessment-${assessment.id}`}
                            checked={isSelected}
                            onCheckedChange={handleChange}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {getAssessmentLabel(assessment.type)}
                              </span>
                              <Badge variant={getScoreBadgeVariant(assessment.overallScore)}>
                                {assessment.overallScore !== null
                                  ? `${Math.round(assessment.overallScore)}%`
                                  : "N/A"}
                              </Badge>
                            </div>
                            {assessment.submittedAt && (
                              <p className="text-sm text-muted-foreground">
                                {t("assessment.submittedOn", {
                                  date: format(new Date(assessment.submittedAt), "PPP"),
                                })}
                              </p>
                            )}
                          </div>
                        </label>
                      </FormControl>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Step 2: Review Scope
 */
interface ScopeStepProps {
  form: UseFormReturn<ReviewRequestFormData>;
}

function ScopeStep({ form }: ScopeStepProps) {
  const t = useTranslations("review.request");
  const reviewType = form.watch("reviewType");

  return (
    <div className="space-y-6">
      {/* Review Type Selection */}
      <FormField
        control={form.control}
        name="reviewType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("scope.typeLabel")}</FormLabel>
            <FormControl>
              <SimpleRadioGroup
                value={field.value}
                onValueChange={field.onChange}
                variant="card"
                options={[
                  {
                    value: "FULL",
                    label: t("scope.types.ansOnly"),
                    description: t("scope.types.ansOnlyDesc"),
                  },
                  {
                    value: "FOCUSED",
                    label: t("scope.types.smsOnly"),
                    description: t("scope.types.smsOnlyDesc"),
                  },
                  {
                    value: "FOLLOW_UP",
                    label: t("scope.types.comprehensive"),
                    description: t("scope.types.comprehensiveDesc"),
                  },
                ]}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      {/* Focus Areas */}
      <FormField
        control={form.control}
        name="focusAreas"
        render={() => (
          <FormItem>
            <div className="mb-4">
              <FormLabel>{t("scope.focusAreasLabel")}</FormLabel>
              <FormDescription>
                {t("scope.focusAreasDescription")}
              </FormDescription>
            </div>

            {/* ANS Focus Areas */}
            {(reviewType === "FULL" || reviewType === "FOLLOW_UP") && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">ANS Areas</p>
                <div className="grid grid-cols-2 gap-2">
                  {ANS_FOCUS_AREAS.map((area) => (
                    <FormField
                      key={area}
                      control={form.control}
                      name="focusAreas"
                      render={({ field }) => {
                        const isSelected = field.value?.includes(area) ?? false;

                        const handleChange = (checked: boolean) => {
                          const currentValue = field.value || [];
                          const newValue = checked
                            ? [...currentValue, area]
                            : currentValue.filter((a) => a !== area);
                          field.onChange(newValue);
                        };

                        return (
                          <FormItem>
                            <FormControl>
                              <label
                                htmlFor={`focus-area-ans-${area}`}
                                className={cn(
                                  "w-full flex items-center gap-2 p-3 rounded-md border-2 text-left transition-all text-sm cursor-pointer",
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                <SimpleCheckbox
                                  id={`focus-area-ans-${area}`}
                                  checked={isSelected}
                                  onCheckedChange={handleChange}
                                />
                                <span>{t(`scope.focusAreas.${area}`)}</span>
                              </label>
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SMS Focus Areas */}
            {(reviewType === "FOCUSED" || reviewType === "FOLLOW_UP") && (
              <div>
                <p className="text-sm font-medium mb-2">SMS Components</p>
                <div className="grid grid-cols-2 gap-2">
                  {SMS_FOCUS_AREAS.map((area) => (
                    <FormField
                      key={area}
                      control={form.control}
                      name="focusAreas"
                      render={({ field }) => {
                        const isSelected = field.value?.includes(area) ?? false;

                        const handleChange = (checked: boolean) => {
                          const currentValue = field.value || [];
                          const newValue = checked
                            ? [...currentValue, area]
                            : currentValue.filter((a) => a !== area);
                          field.onChange(newValue);
                        };

                        return (
                          <FormItem>
                            <FormControl>
                              <label
                                htmlFor={`focus-area-sms-${area}`}
                                className={cn(
                                  "w-full flex items-center gap-2 p-3 rounded-md border-2 text-left transition-all text-sm cursor-pointer",
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                <SimpleCheckbox
                                  id={`focus-area-sms-${area}`}
                                  checked={isSelected}
                                  onCheckedChange={handleChange}
                                />
                                <span>{t(`scope.focusAreas.${area}`)}</span>
                              </label>
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/**
 * Step 3: Schedule
 */
interface ScheduleStepProps {
  form: UseFormReturn<ReviewRequestFormData>;
}

function ScheduleStep({ form }: ScheduleStepProps) {
  const t = useTranslations("review.request");

  const startDate = form.watch("requestedStartDate");
  const endDate = form.watch("requestedEndDate");

  // Calculate minimum start date (30 days from today)
  const minStartDate = new Date();
  minStartDate.setDate(minStartDate.getDate() + 30);

  // Calculate duration in days
  const durationDays =
    startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  return (
    <div className="space-y-6">
      {/* Duration Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("schedule.durationNote")}</AlertTitle>
        <AlertDescription>
          {t("schedule.durationDescription")}
        </AlertDescription>
      </Alert>

      {/* Date Selection */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Start Date */}
        <FormField
          control={form.control}
          name="requestedStartDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("schedule.startDate")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>{t("schedule.selectDate")}</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      // Clear end date if start date changes
                      if (date) {
                        form.setValue("requestedEndDate", undefined);
                      }
                    }}
                    disabled={(date) => date < minStartDate}
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                {t("schedule.startDateHelp")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* End Date */}
        <FormField
          control={form.control}
          name="requestedEndDate"
          render={({ field }) => {
            // Calculate valid end date range (3-10 days after start)
            const minEndDate = startDate
              ? new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000)
              : undefined;
            const maxEndDate = startDate
              ? new Date(startDate.getTime() + 10 * 24 * 60 * 60 * 1000)
              : undefined;

            return (
              <FormItem className="flex flex-col">
                <FormLabel>{t("schedule.endDate")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={!startDate}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>{t("schedule.selectDate")}</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        if (!minEndDate || !maxEndDate) return true;
                        return date < minEndDate || date > maxEndDate;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  {t("schedule.endDateHelp")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>

      {/* Duration Indicator */}
      {durationDays !== null && (
        <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("schedule.duration", { days: durationDays })}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Step 4: Logistics
 */
interface LogisticsStepProps {
  form: UseFormReturn<ReviewRequestFormData>;
}

function LogisticsStep({ form }: LogisticsStepProps) {
  const t = useTranslations("review.request");
  const locationType = form.watch("locationType");

  return (
    <div className="space-y-6">
      {/* Location Type */}
      <FormField
        control={form.control}
        name="locationType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("logistics.locationLabel")}</FormLabel>
            <FormControl>
              <SimpleRadioGroup
                value={field.value}
                onValueChange={field.onChange}
                variant="card"
                options={[
                  {
                    value: "ON_SITE",
                    label: t("logistics.location.onSite"),
                    description: t("logistics.location.onSiteDesc"),
                  },
                  {
                    value: "HYBRID",
                    label: t("logistics.location.hybrid"),
                    description: t("logistics.location.hybridDesc"),
                  },
                  {
                    value: "REMOTE",
                    label: t("logistics.location.remote"),
                    description: t("logistics.location.remoteDesc"),
                  },
                ]}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Support Options (not shown for REMOTE) */}
      {locationType !== "REMOTE" && (
        <>
          <Separator />

          <div className="space-y-4">
            <Label>{t("logistics.supportLabel")}</Label>

            <FormField
              control={form.control}
              name="accommodationProvided"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <SimpleCheckbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    {t("logistics.accommodationProvided")}
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transportationProvided"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <SimpleCheckbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    {t("logistics.transportationProvided")}
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
        </>
      )}

      <Separator />

      {/* Language Preference */}
      <FormField
        control={form.control}
        name="languagePreference"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("logistics.languageLabel")}</FormLabel>
            <FormDescription>{t("logistics.languageDescription")}</FormDescription>
            <FormControl>
              <SimpleRadioGroup
                value={field.value}
                onValueChange={field.onChange}
                variant="inline"
                className="pt-2"
                options={[
                  { value: "EN", label: "English" },
                  { value: "FR", label: "Français" },
                  { value: "BOTH", label: t("logistics.bothLanguages") },
                ]}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      {/* Contact Information */}
      <div className="space-y-4">
        <Label>{t("logistics.contactLabel")}</Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="primaryContactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("logistics.contactName")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input {...field} className="pl-9" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="primaryContactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("logistics.contactEmail")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input {...field} type="email" className="pl-9" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="primaryContactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("logistics.contactPhone")}
                <span className="text-muted-foreground ml-1">(optional)</span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input {...field} type="tel" className="pl-9" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />

      {/* Special Requirements */}
      <FormField
        control={form.control}
        name="specialRequirements"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("logistics.specialRequirements")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("logistics.specialRequirementsPlaceholder")}
                rows={3}
              />
            </FormControl>
            <FormDescription>
              {t("logistics.specialRequirementsHelp")}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/**
 * Step 5: Review Summary
 */
interface ReviewSummaryStepProps {
  form: UseFormReturn<ReviewRequestFormData>;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
  } | null | undefined;
  assessments: SubmittedAssessment[];
}

function ReviewSummaryStep({ form, organization, assessments }: ReviewSummaryStepProps) {
  const t = useTranslations("review.request");

  const formValues = form.getValues();
  const selectedAssessments = assessments.filter((a) =>
    formValues.assessmentIds.includes(a.id)
  );

  // Calculate duration
  const durationDays =
    formValues.requestedStartDate && formValues.requestedEndDate
      ? Math.ceil(
          (formValues.requestedEndDate.getTime() - formValues.requestedStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  // Label lookups
  const reviewTypeLabels: Record<string, string> = {
    FULL: t("review.types.ansOnly"),
    FOCUSED: t("review.types.smsOnly"),
    FOLLOW_UP: t("review.types.comprehensive"),
  };

  const locationLabels: Record<string, string> = {
    ON_SITE: t("review.locations.onSite"),
    HYBRID: t("review.locations.hybrid"),
    REMOTE: t("review.locations.remote"),
  };

  const languageLabels: Record<string, string> = {
    EN: "English",
    FR: "Français",
    BOTH: t("review.bothLanguages"),
  };

  const getAssessmentLabel = (type: QuestionnaireType): string => {
    return type === "ANS_USOAP_CMA"
      ? "ANS (USOAP CMA 2024)"
      : "SMS (CANSO SoE)";
  };

  return (
    <div className="space-y-6">
      {/* Confirmation Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("review.confirmTitle")}</AlertTitle>
        <AlertDescription>
          {t("review.confirmDescription")}
        </AlertDescription>
      </Alert>

      {/* Organization */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {t("review.organization")}
        </p>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{organization?.nameEn}</span>
          {organization?.organizationCode && (
            <Badge variant="secondary">{organization.organizationCode}</Badge>
          )}
        </div>
      </div>

      {/* Assessments */}
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {t("review.assessments")}
        </p>
        <div className="space-y-2">
          {selectedAssessments.map((assessment) => (
            <div key={assessment.id} className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{getAssessmentLabel(assessment.type)}</span>
              {assessment.overallScore !== null && (
                <Badge variant="outline">
                  {Math.round(assessment.overallScore)}%
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Review Type */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {t("review.reviewType")}
        </p>
        <p className="font-medium">{reviewTypeLabels[formValues.reviewType]}</p>
      </div>

      {/* Schedule */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {t("review.schedule")}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {formValues.requestedStartDate && formValues.requestedEndDate && (
            <span>
              {format(formValues.requestedStartDate, "PPP")} –{" "}
              {format(formValues.requestedEndDate, "PPP")}
            </span>
          )}
          {durationDays !== null && (
            <Badge variant="secondary">
              {t("review.days", { count: durationDays })}
            </Badge>
          )}
        </div>
      </div>

      {/* Location and Language */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Location */}
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("review.location")}
          </p>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{locationLabels[formValues.locationType]}</span>
          </div>
          {formValues.locationType !== "REMOTE" && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formValues.accommodationProvided && (
                <Badge variant="outline">{t("review.accommodationIncluded")}</Badge>
              )}
              {formValues.transportationProvided && (
                <Badge variant="outline">{t("review.transportationIncluded")}</Badge>
              )}
            </div>
          )}
        </div>

        {/* Language */}
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("review.language")}
          </p>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>{languageLabels[formValues.languagePreference]}</span>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {t("review.contact")}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{formValues.primaryContactName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{formValues.primaryContactEmail}</span>
          </div>
          {formValues.primaryContactPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{formValues.primaryContactPhone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Special Requirements */}
      {formValues.specialRequirements && (
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("review.specialRequirements")}
          </p>
          <p className="text-sm whitespace-pre-wrap">{formValues.specialRequirements}</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewRequestWizard(props: ReviewRequestWizardProps) {
  const { userOrganizationId, userName, userEmail, locale } = props;
  const t = useTranslations("review.request");
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Form setup
  const form = useForm<ReviewRequestFormData>({
    resolver: zodResolver(reviewRequestFormSchema),
    defaultValues: {
      assessmentIds: [],
      reviewType: "FULL",
      focusAreas: [],
      locationType: "ON_SITE",
      accommodationProvided: false,
      transportationProvided: false,
      languagePreference: "EN",
      primaryContactName: userName,
      primaryContactEmail: userEmail,
      primaryContactPhone: "",
      specialRequirements: "",
    },
  });

  // Check prerequisites
  const {
    data: prerequisites,
    isLoading: prerequisitesLoading,
    error: prerequisitesError,
  } = trpc.review.checkPrerequisites.useQuery({
    organizationId: userOrganizationId,
  });

  // Get organization details
  const { data: organization, isLoading: orgLoading } =
    trpc.organization.getById.useQuery(
      { id: userOrganizationId },
      { enabled: !!userOrganizationId }
    );

  // Create mutation
  const createMutation = trpc.review.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("success.title"), {
        description: t("success.description", { referenceNumber: data.referenceNumber }),
      });
      router.push(`/${locale}/reviews/${data.id}`);
    },
    onError: (error) => {
      toast.error(t("error.title"), {
        description: error.message,
      });
    },
  });

  // Watch selected assessments to auto-set review type
  const selectedAssessmentIds = useWatch({ control: form.control, name: "assessmentIds" });

  // Auto-set review type based on selected assessments
  useEffect(() => {
    if (!prerequisites?.submittedAssessments || selectedAssessmentIds.length === 0) {
      return;
    }

    const selectedAssessments = prerequisites.submittedAssessments.filter(
      (a) => selectedAssessmentIds.includes(a.id)
    );

    if (selectedAssessments.length === 0) return;

    // Check what types of assessments are selected
    const hasANS = selectedAssessments.some((a) => a.type === "ANS_USOAP_CMA");
    const hasSMS = selectedAssessments.some((a) => a.type === "SMS_CANSO_SOE");

    // Auto-set review type based on selection
    if (hasANS && hasSMS) {
      // Multiple assessments of different types -> Comprehensive
      form.setValue("reviewType", "FOLLOW_UP");
    } else if (selectedAssessments.length > 1) {
      // Multiple assessments of same type -> Comprehensive
      form.setValue("reviewType", "FOLLOW_UP");
    } else if (hasANS) {
      // Single ANS assessment -> ANS Only (FULL)
      form.setValue("reviewType", "FULL");
    } else if (hasSMS) {
      // Single SMS assessment -> SMS Only (FOCUSED)
      form.setValue("reviewType", "FOCUSED");
    }
  }, [selectedAssessmentIds, prerequisites?.submittedAssessments, form]);

  // Navigation handlers
  const nextStep = async () => {
    // Validate current step fields before proceeding
    let fieldsToValidate: (keyof ReviewRequestFormData)[] = [];

    switch (currentStep) {
      case 0: // Assessment
        fieldsToValidate = ["assessmentIds"];
        break;
      case 1: // Scope
        fieldsToValidate = ["reviewType", "focusAreas"];
        break;
      case 2: // Schedule
        fieldsToValidate = ["requestedStartDate", "requestedEndDate"];
        break;
      case 3: // Logistics
        fieldsToValidate = [
          "locationType",
          "accommodationProvided",
          "transportationProvided",
          "languagePreference",
          "primaryContactName",
          "primaryContactEmail",
        ];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    // Only allow going to completed steps or current step
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const onSubmit = (data: ReviewRequestFormData) => {
    // The schema refinements guarantee dates are present when form is submitted
    if (!data.requestedStartDate || !data.requestedEndDate) {
      return;
    }

    createMutation.mutate({
      hostOrganizationId: userOrganizationId,
      assessmentIds: data.assessmentIds,
      reviewType: data.reviewType,
      focusAreas: data.focusAreas as ANSReviewArea[],
      requestedStartDate: data.requestedStartDate,
      requestedEndDate: data.requestedEndDate,
      locationType: data.locationType,
      accommodationProvided: data.accommodationProvided,
      transportationProvided: data.transportationProvided,
      languagePreference: data.languagePreference,
      primaryContactName: data.primaryContactName,
      primaryContactEmail: data.primaryContactEmail,
      primaryContactPhone: data.primaryContactPhone,
      specialRequirements: data.specialRequirements,
    });
  };

  // Loading state
  if (prerequisitesLoading || orgLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (prerequisitesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error.prerequisitesTitle")}</AlertTitle>
        <AlertDescription>{prerequisitesError.message}</AlertDescription>
      </Alert>
    );
  }

  // Prerequisites not met
  if (prerequisites && !prerequisites.canRequestReview) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href={`/${locale}/reviews`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToReviews")}
          </Link>
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("prerequisites.notMetTitle")}</AlertTitle>
          <AlertDescription>
            <p className="mb-4">{t("prerequisites.notMetDescription")}</p>
            <ul className="list-disc list-inside space-y-1">
              {prerequisites.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        {!prerequisites.hasSubmittedAssessment && (
          <Card>
            <CardHeader>
              <CardTitle>{t("prerequisites.noAssessmentTitle")}</CardTitle>
              <CardDescription>
                {t("prerequisites.noAssessmentDescription")}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href={`/${locale}/assessments`}>
                  {t("prerequisites.goToAssessments")}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    );
  }

  // Progress percentage
  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href={`/${locale}/reviews`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToReviews")}
          </Link>
        </Button>
      </div>

      {/* Title and Organization Badge */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
        {organization && (
          <Badge variant="secondary" className="mt-2">
            <Building2 className="mr-1 h-3 w-3" />
            {organization.nameEn}
            {organization.organizationCode && ` (${organization.organizationCode})`}
          </Badge>
        )}
      </div>

      {/* Progress Steps */}
      <div className="space-y-4">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isClickable = index <= currentStep;

            return (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-1 text-xs transition-colors",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed",
                  isCurrent
                    ? "text-primary font-medium"
                    : isCompleted
                      ? "text-primary/70"
                      : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted-foreground/30 bg-background"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="hidden sm:block">{t(step.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>
                {t(`${STEPS[currentStep].id}.title`)}
              </CardTitle>
              <CardDescription>
                {t(`${STEPS[currentStep].id}.description`)}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              {/* Step 1: Assessment Selection */}
              {currentStep === 0 && (
                <AssessmentStep
                  form={form}
                  assessments={(prerequisites?.submittedAssessments as SubmittedAssessment[]) || []}
                />
              )}
              {/* Step 2: Review Scope */}
              {currentStep === 1 && (
                <ScopeStep form={form} />
              )}
              {/* Step 3: Schedule */}
              {currentStep === 2 && <ScheduleStep form={form} />}
              {/* Step 4: Logistics */}
              {currentStep === 3 && <LogisticsStep form={form} />}
              {/* Step 5: Review & Submit */}
              {currentStep === 4 && (
                <ReviewSummaryStep
                  form={form}
                  organization={organization}
                  assessments={(prerequisites?.submittedAssessments as SubmittedAssessment[]) || []}
                />
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("navigation.previous")}
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  {t("navigation.next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("navigation.submitting")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t("navigation.submit")}
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
