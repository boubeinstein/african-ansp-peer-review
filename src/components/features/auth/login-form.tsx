"use client";

/**
 * Login Form Component (Refined)
 *
 * Streamlined login form for the split-panel layout.
 * Features password visibility toggle, form validation,
 * and links to registration and programme joining.
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "./language-selector";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations("auth.login");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") || `/${locale}/dashboard`;
  const errorParam = searchParams.get("error");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
        toast.error(t("invalidCredentials"));
      } else if (result?.ok) {
        fetch("/api/audit/login", { method: "POST" }).catch(() => {});
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError(t("loginFailed"));
      toast.error(t("loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  // Map URL error params to user-friendly messages
  const getErrorMessage = () => {
    if (error) return error;
    if (errorParam === "CredentialsSignin") return t("invalidCredentials");
    if (errorParam === "SessionRequired") return t("sessionRequired");
    if (errorParam) return t("loginFailed");
    return null;
  };

  const displayError = getErrorMessage();

  return (
    <div className="space-y-6">
      {/* Mobile Language Selector - only visible on small screens */}
      <div className="flex justify-center lg:hidden">
        <LanguageSelector variant="light" size="sm" />
      </div>

      {/* Header */}
      <div className="space-y-4 text-center">
        {/* AAPRP Brand Banner */}
        <div className="flex justify-center">
          <Image
            src="/images/logos/aaprp-brand-logo.png"
            alt="AAPRP - African ANSP Peer Review Programme"
            width={350}
            height={104}
            className="h-auto w-[280px] sm:w-[320px] lg:w-[350px]"
            priority
          />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            {t("email")}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              className={cn(
                "pl-10 h-11",
                form.formState.errors.email && "border-destructive"
              )}
              {...form.register("email")}
              disabled={isLoading}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{t("invalidEmail")}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              {t("password")}
            </Label>
            <Link
              href={`/${locale}/forgot-password`}
              className="text-xs text-primary hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={cn(
                "pl-10 pr-10 h-11",
                form.formState.errors.password && "border-destructive"
              )}
              {...form.register("password")}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {displayError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 bg-[#1B3A5C] hover:bg-[#142D48] text-white font-medium rounded-lg transition-colors"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("signingIn")}
            </>
          ) : (
            t("signIn")
          )}
        </Button>
      </form>

    </div>
  );
}
