"use client";

/**
 * ForgotPasswordForm Component
 *
 * Allows users to request a password reset link via email.
 * Includes email enumeration protection (always shows success).
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const locale = useLocale();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    setSubmittedEmail(data.email);
    requestReset.mutate({ email: data.email });
  };

  // Success state after submitting
  if (isSubmitted) {
    return (
      <Card className="border-0 shadow-xl bg-card">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground font-montserrat">
            {t("successTitle")}
          </CardTitle>
          <CardDescription className="mt-2 text-muted-foreground">
            {t("successMessage", { email: submittedEmail })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Email delivery notice */}
          <Alert className="bg-blue-50 border-blue-200">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              {t("checkInbox")}
            </AlertDescription>
          </Alert>

          <Button asChild variant="outline" className="w-full h-11">
            <Link href={`/${locale}/login`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToLogin")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-card">
      <CardHeader className="space-y-4 text-center pb-2">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-7 w-7 text-blue-600" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-foreground font-montserrat">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            {t("subtitle")}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              {t("emailLabel")}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                className={cn(
                  "pl-10 h-11 bg-muted/50 border-input focus:bg-background transition-colors",
                  errors.email && "border-red-500 focus:ring-red-500"
                )}
                {...register("email")}
                disabled={requestReset.isPending}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Error Alert */}
          {requestReset.error && (
            <Alert variant="destructive">
              <AlertDescription>{requestReset.error.message}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 bg-aviation-button hover:opacity-90 text-white font-medium shadow-aviation transition-all duration-200"
            disabled={requestReset.isPending}
          >
            {requestReset.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submitButton")
            )}
          </Button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-icao transition-colors"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            {t("rememberPassword")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
