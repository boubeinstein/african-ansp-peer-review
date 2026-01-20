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
  Plane,
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

// Temporary static list of organizations until public API is available
const ORGANIZATIONS = [
  { id: "asecna", name: "ASECNA", icaoCode: "ASECNA" },
  { id: "aca", name: "Algerian Civil Aviation Authority", icaoCode: "ACA" },
  { id: "enna", name: "Egyptian Air Navigation Services", icaoCode: "ENNA" },
  { id: "kaa", name: "Kenya Airports Authority", icaoCode: "KAA" },
  { id: "atns", name: "Air Traffic and Navigation Services", icaoCode: "ATNS" },
  { id: "nama", name: "Nigerian Airspace Management Agency", icaoCode: "NAMA" },
  { id: "gcaa", name: "Ghana Civil Aviation Authority", icaoCode: "GCAA" },
  { id: "onda", name: "Office National des Aéroports (Morocco)", icaoCode: "ONDA" },
  { id: "tcaa", name: "Tanzania Civil Aviation Authority", icaoCode: "TCAA" },
  { id: "ucaa", name: "Uganda Civil Aviation Authority", icaoCode: "UCAA" },
];

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
        {/* App Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-aviation-button flex items-center justify-center shadow-lg shadow-icao/25">
          <Plane className="w-8 h-8 text-white transform -rotate-45" />
        </div>

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
                  placeholder="John"
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
                placeholder="Doe"
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
                    "pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white",
                    errors.organizationId && "border-red-500"
                  )}
                >
                  <SelectValue placeholder={t("organizationPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
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
