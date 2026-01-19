"use client";

/**
 * Notification Settings Component
 *
 * Allows users to configure notification preferences including
 * email notifications and digest frequency.
 */

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Bell,
  Mail,
  ClipboardCheck,
  FileSearch,
  FileCheck,
  FileText,
  Clock,
  Save,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { DigestFrequency } from "@prisma/client";

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  notifyOnReviewAssignment: z.boolean(),
  notifyOnFindingCreated: z.boolean(),
  notifyOnCAPStatusChange: z.boolean(),
  notifyOnReportReady: z.boolean(),
  digestFrequency: z.nativeEnum(DigestFrequency),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

function NotificationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function NotificationSettings() {
  const t = useTranslations("settings.notifications");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: preferences, isLoading, refetch } = trpc.settings.getPreferences.useQuery();
  const updateNotifications = trpc.settings.updateNotifications.useMutation();

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      notifyOnReviewAssignment: true,
      notifyOnFindingCreated: true,
      notifyOnCAPStatusChange: true,
      notifyOnReportReady: true,
      digestFrequency: "IMMEDIATE",
    },
    values: preferences
      ? {
          emailNotifications: preferences.emailNotifications,
          notifyOnReviewAssignment: preferences.notifyOnReviewAssignment,
          notifyOnFindingCreated: preferences.notifyOnFindingCreated,
          notifyOnCAPStatusChange: preferences.notifyOnCAPStatusChange,
          notifyOnReportReady: preferences.notifyOnReportReady,
          digestFrequency: preferences.digestFrequency,
        }
      : undefined,
  });

  const emailNotificationsEnabled = form.watch("emailNotifications");

  const onSubmit = async (data: NotificationFormValues) => {
    setIsSubmitting(true);
    try {
      await updateNotifications.mutateAsync(data);
      toast.success(t("updateSuccess"));
      refetch();
    } catch (error) {
      toast.error(t("updateError"));
      console.error("Failed to update notifications:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <NotificationSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Master Toggle */}
            <FormField
              control={form.control}
              name="emailNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4" />
                      {t("emailNotifications")}
                    </FormLabel>
                    <FormDescription>{t("emailNotificationsDescription")}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            {/* Individual Notification Types */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t("notificationTypes")}</h3>

              <FormField
                control={form.control}
                name="notifyOnReviewAssignment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        {t("reviewAssignment")}
                      </FormLabel>
                      <FormDescription>{t("reviewAssignmentDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!emailNotificationsEnabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifyOnFindingCreated"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <FileSearch className="h-4 w-4" />
                        {t("findingCreated")}
                      </FormLabel>
                      <FormDescription>{t("findingCreatedDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!emailNotificationsEnabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifyOnCAPStatusChange"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        {t("capStatusChange")}
                      </FormLabel>
                      <FormDescription>{t("capStatusChangeDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!emailNotificationsEnabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifyOnReportReady"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t("reportReady")}
                      </FormLabel>
                      <FormDescription>{t("reportReadyDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!emailNotificationsEnabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Digest Frequency */}
            <FormField
              control={form.control}
              name="digestFrequency"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t("digestFrequency")}
                    </FormLabel>
                    <FormDescription>{t("digestFrequencyDescription")}</FormDescription>
                  </div>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!emailNotificationsEnabled}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IMMEDIATE">{t("immediate")}</SelectItem>
                        <SelectItem value="DAILY">{t("daily")}</SelectItem>
                        <SelectItem value="WEEKLY">{t("weekly")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
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

export default NotificationSettings;
