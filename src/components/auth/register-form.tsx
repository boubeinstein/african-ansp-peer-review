"use client";

/**
 * RegisterForm Component
 *
 * Access request form for new users to join the platform.
 * Features organization selection, job title, and professional styling.
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  organizationId: z.string().min(1, "Please select an organization"),
  jobTitle: z.string().min(2, "Job title is required"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

// 20 Programme Participants (5 teams × 4 each) - sorted alphabetically
const ORGANIZATIONS = [
  // Northern Africa Team
  { id: "enna", name: "Établissement National de la Navigation Aérienne (Algeria)", icaoCode: "ENNA" },
  { id: "nansc", name: "National Air Navigation Services Company (Egypt)", icaoCode: "NANSC" },
  { id: "onda", name: "Office National des Aéroports (Morocco)", icaoCode: "ONDA" },
  { id: "oaca", name: "Office de l'Aviation Civile et des Aéroports (Tunisia)", icaoCode: "OACA" },
  // ESAF Team 1
  { id: "ecaa", name: "Ethiopian Civil Aviation Authority", icaoCode: "ECAA" },
  { id: "kcaa", name: "Kenya Civil Aviation Authority", icaoCode: "KCAA" },
  { id: "rcaa", name: "Rwanda Civil Aviation Authority", icaoCode: "RCAA" },
  { id: "ucaa", name: "Uganda Civil Aviation Authority", icaoCode: "UCAA" },
  // ESAF Team 2
  { id: "caam", name: "Civil Aviation Authority of Mozambique", icaoCode: "CAAM" },
  { id: "tcaa", name: "Tanzania Civil Aviation Authority", icaoCode: "TCAA" },
  { id: "zcaa", name: "Zambia Civil Aviation Authority", icaoCode: "ZCAA" },
  // WACAF Team 1
  { id: "gcaa", name: "Ghana Civil Aviation Authority", icaoCode: "GCAA" },
  { id: "lcaa", name: "Liberia Civil Aviation Authority", icaoCode: "LCAA" },
  { id: "nama", name: "Nigerian Airspace Management Agency", icaoCode: "NAMA" },
  { id: "slcaa", name: "Sierra Leone Civil Aviation Authority", icaoCode: "SLCAA" },
  // WACAF Team 2
  { id: "asecna", name: "ASECNA", icaoCode: "ASECNA" },
  { id: "acm", name: "Aviation Civile de Madagascar", icaoCode: "ACM" },
  { id: "mcaa", name: "Mauritius Civil Aviation Authority", icaoCode: "MCAA" },
  { id: "rfir", name: "Roberts FIR (Liberia)", icaoCode: "RFIR" },
].sort((a, b) => a.name.localeCompare(b.name));

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    setIsLoading(true);
    try {
      // TODO: Implement access request API
      // This would create an access request that admins can approve
      console.log("Access request:", data);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(t("success"));
      router.push(`/${locale}/login`);
    } catch {
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-xl bg-white">
      <CardHeader className="space-y-4 text-center pb-2">
        <div>
          <CardTitle className="text-2xl font-bold text-slate-900 font-montserrat">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            {t("description")}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Fields - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="firstName"
                className="text-sm font-medium text-slate-700"
              >
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
                  disabled={isLoading}
                />
              </div>
              {errors.firstName && (
                <p className="text-xs text-red-500">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="lastName"
                className="text-sm font-medium text-slate-700"
              >
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
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-slate-700"
            >
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
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Organization Field */}
          <div className="space-y-2">
            <Label
              htmlFor="organization"
              className="text-sm font-medium text-slate-700"
            >
              {t("organization")}
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
              <Select
                onValueChange={(value) => setValue("organizationId", value)}
                disabled={isLoading}
              >
                <SelectTrigger
                  className={cn(
                    "w-full pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white text-left",
                    errors.organizationId && "border-red-500"
                  )}
                >
                  <SelectValue placeholder={t("organizationPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {ORGANIZATIONS.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.icaoCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.organizationId && (
              <p className="text-xs text-red-500">
                {errors.organizationId.message}
              </p>
            )}
          </div>

          {/* Job Title Field */}
          <div className="space-y-2">
            <Label
              htmlFor="jobTitle"
              className="text-sm font-medium text-slate-700"
            >
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
                disabled={isLoading}
              />
            </div>
            {errors.jobTitle && (
              <p className="text-xs text-red-500">{errors.jobTitle.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 bg-aviation-button hover:opacity-90 text-white font-medium shadow-aviation transition-all duration-200 mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>

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
      </CardContent>
    </Card>
  );
}
