"use client";

/**
 * ResetPasswordForm Component
 *
 * Allows users to set a new password using a valid reset token.
 * Includes password strength requirements and token validation.
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  KeyRound,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
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

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number")
      .regex(
        /[@$!%*?&#^()_+=[\]{}|\\:";'<>,.?/~`-]/,
        "Password must contain a special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
}

// Password requirement indicator component
function PasswordRequirement({
  met,
  label,
}: {
  met: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <X className="h-3 w-3 text-slate-400" />
      )}
      <span className={met ? "text-green-600" : "text-slate-500"}>{label}</span>
    </div>
  );
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword");
  const locale = useLocale();
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verify token on mount
  const {
    data: tokenStatus,
    isLoading: isVerifying,
  } = trpc.auth.verifyResetToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() is not memoizable
  const watchPassword = watch("password", "");

  // Password requirements
  const requirements = [
    { met: watchPassword.length >= 12, label: t("requirements.length") },
    { met: /[a-z]/.test(watchPassword), label: t("requirements.lowercase") },
    { met: /[A-Z]/.test(watchPassword), label: t("requirements.uppercase") },
    { met: /[0-9]/.test(watchPassword), label: t("requirements.number") },
    {
      met: /[@$!%*?&#^()_+=[\]{}|\\:";'<>,.?/~`-]/.test(watchPassword),
      label: t("requirements.special"),
    },
  ];

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPassword.mutate({
      token,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
  };

  // Loading state while verifying token
  if (isVerifying) {
    return (
      <Card className="border-0 shadow-xl bg-white">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-4 text-sm text-slate-500">{t("verifying")}</p>
        </CardContent>
      </Card>
    );
  }

  // Invalid or expired token
  if (!token || !tokenStatus?.valid) {
    return (
      <Card className="border-0 shadow-xl bg-white">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-7 w-7 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 font-montserrat">
            {t("invalidToken")}
          </CardTitle>
          <CardDescription className="mt-2 text-slate-600">
            {t("expiredToken")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Button asChild className="w-full h-11">
            <Link href={`/${locale}/forgot-password`}>
              {t("requestNewLink")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <Card className="border-0 shadow-xl bg-white">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 font-montserrat">
            {t("successTitle")}
          </CardTitle>
          <CardDescription className="mt-2 text-slate-600">
            {t("successMessage")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Button asChild className="w-full h-11">
            <Link href={`/${locale}/login`}>{t("signIn")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Reset form
  return (
    <Card className="border-0 shadow-xl bg-white">
      <CardHeader className="space-y-4 text-center pb-2">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
          <KeyRound className="h-7 w-7 text-blue-600" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-slate-900 font-montserrat">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            {t("subtitle")}{" "}
            {tokenStatus.email && (
              <span className="font-medium">({tokenStatus.email})</span>
            )}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* New Password Field */}
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              {t("passwordLabel")}
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                className={cn(
                  "pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
                  errors.password && "border-red-500 focus:ring-red-500"
                )}
                {...register("password")}
                disabled={resetPassword.isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}

            {/* Password Requirements */}
            <div className="grid grid-cols-2 gap-1 pt-2">
              {requirements.map((req, i) => (
                <PasswordRequirement key={i} met={req.met} label={req.label} />
              ))}
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-slate-700"
            >
              {t("confirmPasswordLabel")}
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className={cn(
                  "pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
                  errors.confirmPassword && "border-red-500 focus:ring-red-500"
                )}
                {...register("confirmPassword")}
                disabled={resetPassword.isPending}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Error Alert */}
          {resetPassword.error && (
            <Alert variant="destructive">
              <AlertDescription>{resetPassword.error.message}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 bg-aviation-button hover:opacity-90 text-white font-medium shadow-aviation transition-all duration-200"
            disabled={resetPassword.isPending}
          >
            {resetPassword.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submitButton")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
