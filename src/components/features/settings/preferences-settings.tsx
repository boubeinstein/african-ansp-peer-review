"use client";

/**
 * Preferences Settings Component
 *
 * Allows users to customize display preferences including
 * language, theme, date format, and feature toggles.
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme } from "next-themes";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Globe,
  Palette,
  Calendar,
  LayoutGrid,
  GraduationCap,
  Save,
  Loader2,
  Sun,
  Moon,
  Monitor,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Define types locally to avoid importing @prisma/client in client component
type Locale = "EN" | "FR";
type Theme = "LIGHT" | "DARK" | "SYSTEM";
import { useOnboardingOptional } from "@/components/onboarding";

const preferencesSchema = z.object({
  locale: z.enum(["EN", "FR"]),
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  showTrainingModule: z.boolean(),
  compactView: z.boolean(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

function PreferencesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Theme preview component
function ThemePreview({ theme }: { theme: Theme }) {
  const icons = {
    LIGHT: Sun,
    DARK: Moon,
    SYSTEM: Monitor,
  };
  const Icon = icons[theme];

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
        theme === "LIGHT" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        theme === "DARK" && "bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-800",
        theme === "SYSTEM" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      )}
    >
      <Icon className="h-4 w-4" />
    </div>
  );
}

export function PreferencesSettings() {
  const t = useTranslations("settings.preferences");
  const tCommon = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const utils = trpc.useUtils();
  const onboarding = useOnboardingOptional();
  const { setTheme: setNextTheme } = useTheme();

  const { data: preferences, isLoading } = trpc.settings.getPreferences.useQuery();

  // Sync database theme preference to next-themes on load
  useEffect(() => {
    if (preferences?.theme) {
      // Convert Prisma enum (LIGHT, DARK, SYSTEM) to next-themes format (light, dark, system)
      setNextTheme(preferences.theme.toLowerCase());
    }
  }, [preferences?.theme, setNextTheme]);

  const updateMutation = trpc.settings.updatePreferences.useMutation({
    onSuccess: (_, variables) => {
      toast.success(t("updateSuccess"));
      utils.settings.getPreferences.invalidate();
      // Reload page if locale changed to apply new language
      if (variables.locale && variables.locale !== preferences?.locale) {
        window.location.reload();
      }
    },
    onError: () => {
      toast.error(t("updateError"));
    },
  });

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    values: {
      locale: preferences?.locale || "EN",
      theme: preferences?.theme || "SYSTEM",
      dateFormat: (preferences?.dateFormat as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD") || "DD/MM/YYYY",
      showTrainingModule: preferences?.showTrainingModule ?? true,
      compactView: preferences?.compactView ?? false,
    },
  });

  const onSubmit = (data: PreferencesFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <PreferencesSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Language & Region Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                {t("languageSection")}
              </h3>

              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("language")}</FormLabel>
                      <FormDescription>{t("languageDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN">
                            <span className="flex items-center gap-2">
                              <span className="text-lg">🇬🇧</span>
                              English
                            </span>
                          </SelectItem>
                          <SelectItem value="FR">
                            <span className="flex items-center gap-2">
                              <span className="text-lg">🇫🇷</span>
                              Français
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateFormat"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t("dateFormat")}
                      </FormLabel>
                      <FormDescription>{t("dateFormatDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (19/01/2026)</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (01/19/2026)</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-01-19)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Appearance Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Palette className="h-4 w-4" />
                {t("appearanceSection")}
              </h3>

              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("theme")}</FormLabel>
                      <FormDescription>{t("themeDescription")}</FormDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <ThemePreview theme={field.value} />
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Apply theme immediately via next-themes
                            setNextTheme(value.toLowerCase());
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LIGHT">
                              <span className="flex items-center gap-2">
                                <Sun className="h-4 w-4" />
                                {t("themeLight")}
                              </span>
                            </SelectItem>
                            <SelectItem value="DARK">
                              <span className="flex items-center gap-2">
                                <Moon className="h-4 w-4" />
                                {t("themeDark")}
                              </span>
                            </SelectItem>
                            <SelectItem value="SYSTEM">
                              <span className="flex items-center gap-2">
                                <Monitor className="h-4 w-4" />
                                {t("themeSystem")}
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="compactView"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        {t("compactView")}
                      </FormLabel>
                      <FormDescription>{t("compactViewDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Features Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                {t("featuresSection")}
              </h3>

              <FormField
                control={form.control}
                name="showTrainingModule"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("showTraining")}</FormLabel>
                      <FormDescription>{t("showTrainingDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Onboarding Section */}
            {onboarding && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  {t("onboardingSection")}
                </h3>

                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <p className="text-base font-medium">{t("tour")}</p>
                    <p className="text-sm text-muted-foreground">{t("tourDescription")}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onboarding.resetTour();
                      onboarding.startTour();
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {tOnboarding("restartTour")}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={updateMutation.isPending || !form.formState.isDirty}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {tCommon("save")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default PreferencesSettings;
