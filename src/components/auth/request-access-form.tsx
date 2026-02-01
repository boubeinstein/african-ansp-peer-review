"use client";

/**
 * RequestAccessForm Component
 *
 * Form for users to request access to existing member organizations.
 * Shows only organizations that are already programme members (in a team).
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
  CheckCircle2,
  Users,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

const accessRequestSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  organizationId: z.string().min(1, "Please select an organization"),
  jobTitle: z.string().min(2, "Job title is required"),
  justification: z.string().min(20, "Please explain why you need access"),
});

type AccessRequestFormData = z.infer<typeof accessRequestSchema>;

export function RequestAccessForm() {
  const t = useTranslations("auth.requestAccess");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch member organizations (those in teams)
  const { data: organizations, isLoading: orgsLoading } =
    trpc.joinRequest.getOrganizationsForAccessRequest.useQuery();

  // Submit access request
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
    watch,
    formState: { errors },
  } = useForm<AccessRequestFormData>({
    resolver: zodResolver(accessRequestSchema),
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() is not memoizable
  const selectedOrgId = watch("organizationId");
  const selectedOrg = organizations?.find((org: { id: string; nameEn: string; nameFr: string; organizationCode: string | null }) => org.id === selectedOrgId);

  async function onSubmit(data: AccessRequestFormData) {
    submitMutation.mutate({
      requestType: "USER_ACCESS" as const,
      organizationId: data.organizationId,
      contactName: `${data.firstName} ${data.lastName}`,
      contactEmail: data.email,
      contactJobTitle: data.jobTitle,
      motivationStatement: data.justification,
      preferredLanguage: locale === "fr" ? "fr" : "en",
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
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">{t("description")}</p>
      </div>

      {/* Organization Selection */}
      <div className="space-y-2">
        <Label htmlFor="organization" className="text-sm font-medium text-slate-700">
          {t("organization")}
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
              {organizations?.map((org: { id: string; nameEn: string; nameFr: string; organizationCode: string | null }) => (
                <SelectItem key={org.id} value={org.id}>
                  <div className="flex items-center gap-2">
                    <span>{locale === "fr" ? org.nameFr : org.nameEn}</span>
                    {org.organizationCode && (
                      <span className="text-xs text-muted-foreground">({org.organizationCode})</span>
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

        {/* Show team info for selected org */}
        {selectedOrg?.regionalTeam && (
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <Users className="h-3 w-3" />
            <span>Team {selectedOrg.regionalTeam.teamNumber}: {selectedOrg.regionalTeam.nameEn}</span>
          </div>
        )}
      </div>

      {/* Name Fields - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
            {t("firstName")}
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="firstName"
              placeholder="Daniel"
              className={cn(
                "pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
                errors.firstName && "border-red-500"
              )}
              {...register("firstName")}
              disabled={submitMutation.isPending}
            />
          </div>
          {errors.firstName && (
            <p className="text-xs text-red-500">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
            {t("lastName")}
          </Label>
          <Input
            id="lastName"
            placeholder="Johnson"
            className={cn(
              "h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
              errors.lastName && "border-red-500"
            )}
            {...register("lastName")}
            disabled={submitMutation.isPending}
          />
          {errors.lastName && (
            <p className="text-xs text-red-500">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
          {t("email")}
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            className={cn(
              "pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
              errors.email && "border-red-500"
            )}
            {...register("email")}
            disabled={submitMutation.isPending}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* Job Title Field */}
      <div className="space-y-2">
        <Label htmlFor="jobTitle" className="text-sm font-medium text-slate-700">
          {t("jobTitle")}
        </Label>
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="jobTitle"
            placeholder={t("jobTitlePlaceholder")}
            className={cn(
              "pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
              errors.jobTitle && "border-red-500"
            )}
            {...register("jobTitle")}
            disabled={submitMutation.isPending}
          />
        </div>
        {errors.jobTitle && (
          <p className="text-xs text-red-500">{errors.jobTitle.message}</p>
        )}
      </div>

      {/* Justification Field */}
      <div className="space-y-2">
        <Label htmlFor="justification" className="text-sm font-medium text-slate-700">
          {t("justification")}
        </Label>
        <Textarea
          id="justification"
          placeholder={t("justificationPlaceholder")}
          className={cn(
            "min-h-[80px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-none",
            errors.justification && "border-red-500"
          )}
          {...register("justification")}
          disabled={submitMutation.isPending}
        />
        {errors.justification && (
          <p className="text-xs text-red-500">{errors.justification.message}</p>
        )}
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
