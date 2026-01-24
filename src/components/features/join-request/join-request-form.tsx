"use client";

/**
 * JoinRequestForm Component
 *
 * Public form for organizations to apply for programme participation.
 * Uses free-text entry for organization details (new organizations).
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Mail,
  User,
  Phone,
  Briefcase,
  Building2,
  CheckCircle,
  ArrowLeft,
  Globe,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { FileUpload } from "@/components/ui/file-upload";

const joinRequestSchema = z.object({
  // Organization details (free-text entry)
  organizationName: z.string().min(2, "Organization name is required"),
  organizationCountry: z.string().min(2, "Country is required"),
  organizationCode: z.string().optional(),

  // Contact details
  contactName: z.string().min(2, "Name must be at least 2 characters"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
  contactJobTitle: z.string().min(2, "Job title is required"),

  // Application details
  currentSmsMaturity: z.enum(["A", "B", "C", "D", "E"]).optional(),
  motivationStatement: z
    .string()
    .min(100, "Motivation must be at least 100 characters"),
  proposedReviewerCount: z.number().min(2).max(10),
  preferredTeam: z.number().min(1).max(5).optional(),
  preferredLanguage: z.enum(["en", "fr", "both"]),
  additionalNotes: z.string().optional(),
  commitmentLetterUrl: z.string().optional(),
});

type JoinRequestFormData = z.infer<typeof joinRequestSchema>;

export function JoinRequestForm() {
  const t = useTranslations("joinRequest");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const createMutation = trpc.joinRequest.create.useMutation({
    onSuccess: (data) => {
      console.log("✅ Application submitted successfully:", data.id);
      setReferenceId(data.id);
      setSubmitted(true);
      toast.success(t("success.title"));
    },
    onError: (error) => {
      console.error("❌ Submission error:", error);
      toast.error(error.message || "Failed to submit application");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JoinRequestFormData>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: {
      proposedReviewerCount: 2,
      preferredLanguage: locale as "en" | "fr",
    },
    mode: "onChange",
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() is not memoizable
  const motivationLength = watch("motivationStatement")?.length || 0;

  async function onSubmit(data: JoinRequestFormData) {
    console.log("📤 Submitting application:", data);
    setIsLoading(true);
    createMutation.mutate({
      ...data,
      requestType: "PROGRAMME_JOIN",
    });
  }

  function onInvalid(errors: Record<string, unknown>) {
    console.error("❌ Form validation failed:", errors);
    toast.error("Please fill in all required fields correctly");
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">
              {t("success.title")}
            </CardTitle>
            <p className="text-slate-600 mt-2">{t("success.message")}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {referenceId && (
              <div className="bg-slate-100 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-600">{t("success.reference")}</p>
                <p className="font-mono text-lg font-semibold mt-1">
                  {referenceId}
                </p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">{t("success.nextSteps")}</h3>
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="font-semibold text-icao">1.</span>
                  {t("success.step1")}
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-icao">2.</span>
                  {t("success.step2")}
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-icao">3.</span>
                  {t("success.step3")}
                </li>
              </ol>
            </div>

            <Button asChild className="w-full">
              <Link href={`/${locale}/login`}>{t("success.backToLogin")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-aviation-gradient text-white py-12 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Logos */}
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-white rounded-lg p-2 shadow-md">
              <Image
                src="/images/logos/International_Civil_Aviation_Organization_logo.svg"
                alt="ICAO"
                width={80}
                height={32}
                className="h-8 w-auto"
              />
            </div>
            <div className="bg-white rounded-lg p-2 shadow-md">
              <Image
                src="/images/logos/CANSO.svg"
                alt="CANSO"
                width={80}
                height={32}
                className="h-8 w-auto"
              />
            </div>
          </div>

          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center text-sm text-white/70 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {locale === "fr" ? "Retour à la connexion" : "Back to Sign In"}
          </Link>

          <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
          <p className="text-white/80">{t("subtitle")}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Eligibility Requirements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">{t("eligibility.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                {t("eligibility.item1")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                {t("eligibility.item2")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                {t("eligibility.item3")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                {t("eligibility.item4")}
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Application Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">
              {/* Organization Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">
                  {t("form.organizationSection")}
                </h3>

                <div className="space-y-2">
                  <Label>{t("form.organizationName")}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder={t("form.organizationNamePlaceholder")}
                      className={cn(
                        "pl-10",
                        errors.organizationName && "border-red-500"
                      )}
                      {...register("organizationName")}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("form.organizationNameHelp")}
                  </p>
                  {errors.organizationName && (
                    <p className="text-xs text-red-500">
                      {errors.organizationName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("form.country")}</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder={t("form.countryPlaceholder")}
                        className={cn(
                          "pl-10",
                          errors.organizationCountry && "border-red-500"
                        )}
                        {...register("organizationCountry")}
                      />
                    </div>
                    {errors.organizationCountry && (
                      <p className="text-xs text-red-500">
                        {errors.organizationCountry.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("form.organizationCode")} <span className="text-slate-400">({t("form.optional")})</span></Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="e.g., HKJK"
                        className="pl-10"
                        {...register("organizationCode")}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {t("form.organizationCodeHelp")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">
                  {t("form.contactSection")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("form.contactName")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder={t("form.contactNamePlaceholder")}
                        className={cn(
                          "pl-10",
                          errors.contactName && "border-red-500"
                        )}
                        {...register("contactName")}
                      />
                    </div>
                    {errors.contactName && (
                      <p className="text-xs text-red-500">
                        {errors.contactName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("form.contactJobTitle")}</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder={t("form.contactJobTitlePlaceholder")}
                        className={cn(
                          "pl-10",
                          errors.contactJobTitle && "border-red-500"
                        )}
                        {...register("contactJobTitle")}
                      />
                    </div>
                    {errors.contactJobTitle && (
                      <p className="text-xs text-red-500">
                        {errors.contactJobTitle.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("form.contactEmail")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="email"
                        placeholder={t("form.contactEmailPlaceholder")}
                        className={cn(
                          "pl-10",
                          errors.contactEmail && "border-red-500"
                        )}
                        {...register("contactEmail")}
                      />
                    </div>
                    {errors.contactEmail && (
                      <p className="text-xs text-red-500">
                        {errors.contactEmail.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("form.contactPhone")} <span className="text-slate-400">({t("form.optional")})</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder={t("form.contactPhonePlaceholder")}
                        className="pl-10"
                        {...register("contactPhone")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Details Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">
                  {t("form.applicationSection")}
                </h3>

                <div className="space-y-2">
                  <Label>{t("form.smsMaturity")}</Label>
                  <Select
                    onValueChange={(value) =>
                      setValue(
                        "currentSmsMaturity",
                        value as "A" | "B" | "C" | "D" | "E"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("form.smsMaturityPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">{t("form.maturityA")}</SelectItem>
                      <SelectItem value="B">{t("form.maturityB")}</SelectItem>
                      <SelectItem value="C">{t("form.maturityC")}</SelectItem>
                      <SelectItem value="D">{t("form.maturityD")}</SelectItem>
                      <SelectItem value="E">{t("form.maturityE")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    {t("form.smsMaturityHelp")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t("form.motivationStatement")}</Label>
                  <Textarea
                    placeholder={t("form.motivationStatementPlaceholder")}
                    className={cn(
                      "min-h-[120px]",
                      errors.motivationStatement && "border-red-500"
                    )}
                    {...register("motivationStatement")}
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">
                      {t("form.motivationStatementHelp")}
                    </span>
                    <span
                      className={cn(
                        motivationLength < 100 ? "text-amber-600" : "text-green-600"
                      )}
                    >
                      {motivationLength}/100
                    </span>
                  </div>
                  {errors.motivationStatement && (
                    <p className="text-xs text-red-500">
                      {errors.motivationStatement.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("form.proposedReviewerCount")}</Label>
                    <Select
                      defaultValue="2"
                      onValueChange={(value) =>
                        setValue("proposedReviewerCount", parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      {t("form.proposedReviewerCountHelp")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("form.preferredLanguage")}</Label>
                    <Select
                      defaultValue={locale}
                      onValueChange={(value) =>
                        setValue("preferredLanguage", value as "en" | "fr" | "both")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{t("form.languageEn")}</SelectItem>
                        <SelectItem value="fr">{t("form.languageFr")}</SelectItem>
                        <SelectItem value="both">{t("form.languageBoth")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("form.preferredTeam")}</Label>
                  <Select
                    onValueChange={(value) =>
                      setValue("preferredTeam", parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("form.preferredTeamPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("form.team1")}</SelectItem>
                      <SelectItem value="2">{t("form.team2")}</SelectItem>
                      <SelectItem value="3">{t("form.team3")}</SelectItem>
                      <SelectItem value="4">{t("form.team4")}</SelectItem>
                      <SelectItem value="5">{t("form.team5")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    {t("form.preferredTeamHelp")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t("form.additionalNotes")} <span className="text-slate-400">({t("form.optional")})</span></Label>
                  <Textarea
                    placeholder={t("form.additionalNotesPlaceholder")}
                    className="min-h-[80px]"
                    {...register("additionalNotes")}
                  />
                </div>

                {/* Commitment Letter Upload */}
                <FileUpload
                  value={watch("commitmentLetterUrl")}
                  onChange={(url) => setValue("commitmentLetterUrl", url)}
                  label={t("form.commitmentLetter")}
                  helpText={t("form.commitmentLetterHelp")}
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-aviation-button hover:opacity-90 text-white font-medium shadow-aviation"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("form.submitting")}
                  </>
                ) : (
                  t("form.submit")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
