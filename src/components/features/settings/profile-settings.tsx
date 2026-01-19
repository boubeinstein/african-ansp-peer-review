"use client";

/**
 * Profile Settings Component
 *
 * Allows users to view and update their profile information
 * including name, title, phone, and organization details.
 */

import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Save,
  User,
  Building2,
  Mail,
  Phone,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(100),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(100),
  title: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSettingsProps {
  firstName: string;
  lastName: string;
  email: string;
}

function ProfileSettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileSettings({
  firstName: _initialFirstName,
  lastName: _initialLastName,
  email: _initialEmail,
}: ProfileSettingsProps) {
  const t = useTranslations("settings.profile");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery();

  const updateMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(t("updateSuccess"));
      utils.settings.getProfile.invalidate();
    },
    onError: () => {
      toast.error(t("updateError"));
    },
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      title: profile?.title || "",
      phone: profile?.phone || "",
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <ProfileSettingsSkeleton />;
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("loadError")}
        </CardContent>
      </Card>
    );
  }

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const organizationName =
    locale === "fr" ? profile.organization?.nameFr : profile.organization?.nameEn;

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and basic info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{fullName}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {profile.email}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{profile.role.replace(/_/g, " ")}</Badge>
                {profile.reviewerProfile?.isLeadQualified && (
                  <Badge variant="secondary">{t("leadQualified")}</Badge>
                )}
                {profile.organization && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {organizationName}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Edit Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("firstName")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lastName")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {t("jobTitle")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder={t("jobTitlePlaceholder")}
                        />
                      </FormControl>
                      <FormDescription>{t("jobTitleDescription")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {t("phone")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder={t("phonePlaceholder")}
                          type="tel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
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

      {/* Reviewer Profile Link (if applicable) */}
      {profile.reviewerProfile && (
        <Card>
          <CardHeader>
            <CardTitle>{t("reviewerProfile.title")}</CardTitle>
            <CardDescription>{t("reviewerProfile.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    profile.reviewerProfile.selectionStatus === "SELECTED"
                      ? "default"
                      : "secondary"
                  }
                >
                  {profile.reviewerProfile.selectionStatus?.replace(/_/g, " ")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t("reviewerProfile.linkedProfile")}
                </span>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/${locale}/reviewers/${profile.reviewerProfile.id}`}>
                  {t("reviewerProfile.viewProfile")}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProfileSettings;
