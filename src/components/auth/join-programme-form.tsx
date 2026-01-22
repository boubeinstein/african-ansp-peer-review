"use client";

/**
 * JoinProgrammeForm Component
 *
 * Form for organizations not yet in the programme to submit join requests.
 * Shows only organizations that are NOT programme members (not in any team).
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Mail,
  User,
  Building2,
  Briefcase,
  Phone,
  CheckCircle2,
  Globe,
  Users,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

const joinProgrammeSchema = z.object({
  organizationId: z.string().min(1, "Please select an organization"),
  contactName: z.string().min(2, "Name must be at least 2 characters"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
  contactJobTitle: z.string().min(2, "Job title is required"),
  currentSmsMaturity: z.enum(["A", "B", "C", "D", "E"]).optional(),
  motivationStatement: z.string().min(100, "Motivation must be at least 100 characters"),
  proposedReviewerCount: z.number().min(2).max(10).optional(),
  preferredTeam: z.number().min(1).max(5).optional(),
  preferredLanguage: z.enum(["en", "fr", "both"]).optional(),
  additionalNotes: z.string().optional(),
});

type JoinProgrammeFormData = z.infer<typeof joinProgrammeSchema>;

const SMS_MATURITY_OPTIONS = [
  { value: "A", label: "A - Initial" },
  { value: "B", label: "B - Planning" },
  { value: "C", label: "C - Implementing" },
  { value: "D", label: "D - Operating" },
  { value: "E", label: "E - Optimizing" },
];

const TEAM_OPTIONS = [
  { value: 1, label: "Team 1 (Central/Southern Africa)" },
  { value: 2, label: "Team 2 (East Africa)" },
  { value: 3, label: "Team 3 (West Africa)" },
  { value: 4, label: "Team 4 (Southern Africa)" },
  { value: 5, label: "Team 5 (North Africa)" },
];

export function JoinProgrammeForm() {
  const t = useTranslations("auth.joinProgramme");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch non-member organizations
  const { data: organizations, isLoading: orgsLoading } =
    trpc.joinRequest.getOrganizationsForProgrammeJoin.useQuery();

  // Submit join request
  const submitMutation = trpc.joinRequest.create.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success(t("success"));
    },
    onError: (error) => {
      toast.error(error.message || t("error"));
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<JoinProgrammeFormData>({
    resolver: zodResolver(joinProgrammeSchema),
    defaultValues: {
      proposedReviewerCount: 2,
      preferredLanguage: locale === "fr" ? "fr" : "en",
    },
  });

  async function onSubmit(data: JoinProgrammeFormData) {
    submitMutation.mutate({
      requestType: "PROGRAMME_JOIN" as const,
      organizationId: data.organizationId,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      contactJobTitle: data.contactJobTitle,
      currentSmsMaturity: data.currentSmsMaturity,
      motivationStatement: data.motivationStatement,
      proposedReviewerCount: data.proposedReviewerCount ?? 2,
      preferredTeam: data.preferredTeam,
      preferredLanguage: data.preferredLanguage ?? (locale === "fr" ? "fr" : "en"),
      additionalNotes: data.additionalNotes,
    });
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900">{t("successTitle")}</h3>
        <p className="text-slate-600 max-w-md mx-auto">{t("successMessage")}</p>
        <div className="text-sm text-slate-500 mt-2">
          <p>{t("nextSteps")}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/login`)}
          className="mt-4"
        >
          {t("backToLogin")}
        </Button>
      </div>
    );
  }

  // No eligible organizations
  if (!orgsLoading && (!organizations || organizations.length === 0)) {
    return (
      <div className="text-center py-8 space-y-4">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {t("noOrganizations")}
          </AlertDescription>
        </Alert>
        <p className="text-sm text-slate-600">{t("contactCoordinator")}</p>
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/login`)}
          className="mt-4"
        >
          {t("backToLogin")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Description */}
      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
        <p className="text-sm text-green-800">{t("description")}</p>
      </div>

      {/* Organization Selection */}
      <div className="space-y-2">
        <Label htmlFor="organization" className="text-sm font-medium text-slate-700">
          {t("organization")} <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
          <Select
            onValueChange={(value) => setValue("organizationId", value)}
            disabled={orgsLoading || submitMutation.isPending}
          >
            <SelectTrigger
              className={cn(
                "w-full pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white text-left",
                errors.organizationId && "border-red-500"
              )}
            >
              <SelectValue placeholder={orgsLoading ? tCommon("actions.loading") : t("selectOrganization")} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {organizations?.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  <div className="flex items-center gap-2">
                    <span>{locale === "fr" ? org.nameFr : org.nameEn}</span>
                    {org.icaoCode && (
                      <span className="text-xs text-muted-foreground">({org.icaoCode})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {errors.organizationId && (
          <p className="text-xs text-red-500">{errors.organizationId.message}</p>
        )}
      </div>

      {/* Contact Name */}
      <div className="space-y-2">
        <Label htmlFor="contactName" className="text-sm font-medium text-slate-700">
          {t("contactName")} <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="contactName"
            placeholder={t("contactNamePlaceholder")}
            className={cn(
              "pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
              errors.contactName && "border-red-500"
            )}
            {...register("contactName")}
            disabled={submitMutation.isPending}
          />
        </div>
        {errors.contactName && (
          <p className="text-xs text-red-500">{errors.contactName.message}</p>
        )}
      </div>

      {/* Contact Email and Phone - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactEmail" className="text-sm font-medium text-slate-700">
            {t("email")} <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="contactEmail"
              type="email"
              placeholder={t("emailPlaceholder")}
              className={cn(
                "pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
                errors.contactEmail && "border-red-500"
              )}
              {...register("contactEmail")}
              disabled={submitMutation.isPending}
            />
          </div>
          {errors.contactEmail && (
            <p className="text-xs text-red-500">{errors.contactEmail.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone" className="text-sm font-medium text-slate-700">
            {t("phone")}
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="contactPhone"
              placeholder={t("phonePlaceholder")}
              className={cn(
                "pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              )}
              {...register("contactPhone")}
              disabled={submitMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Job Title */}
      <div className="space-y-2">
        <Label htmlFor="contactJobTitle" className="text-sm font-medium text-slate-700">
          {t("jobTitle")} <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="contactJobTitle"
            placeholder={t("jobTitlePlaceholder")}
            className={cn(
              "pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
              errors.contactJobTitle && "border-red-500"
            )}
            {...register("contactJobTitle")}
            disabled={submitMutation.isPending}
          />
        </div>
        {errors.contactJobTitle && (
          <p className="text-xs text-red-500">{errors.contactJobTitle.message}</p>
        )}
      </div>

      {/* SMS Maturity and Preferred Team - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="smsMaturity" className="text-sm font-medium text-slate-700">
            {t("smsMaturity")}
          </Label>
          <Select
            onValueChange={(value) => setValue("currentSmsMaturity", value as "A" | "B" | "C" | "D" | "E")}
            disabled={submitMutation.isPending}
          >
            <SelectTrigger className="h-10 bg-slate-50 border-slate-200 focus:bg-white">
              <SelectValue placeholder={t("selectMaturity")} />
            </SelectTrigger>
            <SelectContent>
              {SMS_MATURITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredTeam" className="text-sm font-medium text-slate-700">
            {t("preferredTeam")}
          </Label>
          <Select
            onValueChange={(value) => setValue("preferredTeam", parseInt(value))}
            disabled={submitMutation.isPending}
          >
            <SelectTrigger className="h-10 bg-slate-50 border-slate-200 focus:bg-white">
              <SelectValue placeholder={t("selectTeam")} />
            </SelectTrigger>
            <SelectContent>
              {TEAM_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Proposed Reviewers and Language - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="proposedReviewerCount" className="text-sm font-medium text-slate-700">
            {t("proposedReviewers")}
          </Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="proposedReviewerCount"
              type="number"
              min={2}
              max={10}
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white"
              {...register("proposedReviewerCount", { valueAsNumber: true })}
              disabled={submitMutation.isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredLanguage" className="text-sm font-medium text-slate-700">
            {t("preferredLanguage")}
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
            <Select
              defaultValue={locale === "fr" ? "fr" : "en"}
              onValueChange={(value) => setValue("preferredLanguage", value as "en" | "fr" | "both")}
              disabled={submitMutation.isPending}
            >
              <SelectTrigger className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Fran&ccedil;ais</SelectItem>
                <SelectItem value="both">{t("bothLanguages")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Motivation Statement */}
      <div className="space-y-2">
        <Label htmlFor="motivationStatement" className="text-sm font-medium text-slate-700">
          {t("motivation")} <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="motivationStatement"
          placeholder={t("motivationPlaceholder")}
          className={cn(
            "min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-none",
            errors.motivationStatement && "border-red-500"
          )}
          {...register("motivationStatement")}
          disabled={submitMutation.isPending}
        />
        <p className="text-xs text-slate-500">{t("motivationHelp")}</p>
        {errors.motivationStatement && (
          <p className="text-xs text-red-500">{errors.motivationStatement.message}</p>
        )}
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label htmlFor="additionalNotes" className="text-sm font-medium text-slate-700">
          {t("additionalNotes")}
        </Label>
        <Textarea
          id="additionalNotes"
          placeholder={t("additionalNotesPlaceholder")}
          className="min-h-[80px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-none"
          {...register("additionalNotes")}
          disabled={submitMutation.isPending}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-11 bg-aviation-button hover:opacity-90 text-white font-medium shadow-aviation transition-all duration-200 mt-6"
        disabled={submitMutation.isPending || orgsLoading}
      >
        {submitMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>

      {/* Sign In Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-600">
          {t("haveAccount")}{" "}
          <Link
            href={`/${locale}/login`}
            className="font-medium text-icao hover:text-canso transition-colors"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>
    </form>
  );
}
