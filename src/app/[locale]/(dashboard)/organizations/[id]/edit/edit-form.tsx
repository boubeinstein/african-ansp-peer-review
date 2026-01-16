"use client";

/**
 * Organization Edit Form Wrapper
 *
 * Client component that handles the organization edit logic
 * with tRPC mutation and navigation.
 */

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, Building2 } from "lucide-react";
import { OrganizationForm, type OrganizationFormValues } from "@/components/features/organization";

interface OrganizationEditFormProps {
  locale: string;
  organizationId: string;
}

function EditFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Form skeleton */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function OrganizationEditForm({ locale, organizationId }: OrganizationEditFormProps) {
  const router = useRouter();
  const t = useTranslations("organizations");
  const utils = trpc.useUtils();

  // Fetch organization data
  const { data: organization, isLoading, error } = trpc.organization.getById.useQuery(
    { id: organizationId },
    { retry: false }
  );

  const updateMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success(t("form.updateSuccess"));
      // Invalidate caches
      utils.organization.list.invalidate();
      utils.organization.getById.invalidate({ id: organizationId });
      utils.organization.getStats.invalidate();
      // Redirect back to organization detail page
      router.push(`/${locale}/organizations/${organizationId}`);
    },
    onError: (error) => {
      toast.error(t("form.updateError"), {
        description: error.message,
      });
    },
  });

  const handleSubmit = async (data: OrganizationFormValues) => {
    await updateMutation.mutateAsync({
      id: organizationId,
      nameEn: data.nameEn,
      nameFr: data.nameFr,
      icaoCode: data.icaoCode,
      country: data.country,
      city: data.city,
      region: data.region,
      membershipStatus: data.membershipStatus,
    });
  };

  const handleCancel = () => {
    router.push(`/${locale}/organizations/${organizationId}`);
  };

  const handleBack = () => {
    router.push(`/${locale}/organizations`);
  };

  // Loading state
  if (isLoading) {
    return <EditFormSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("form.editTitle")}</h1>
          </div>
        </div>

        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-destructive/10 p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">{t("error.title")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {error.message}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("detail.backToList")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!organization) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("form.editTitle")}</h1>
          </div>
        </div>

        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t("detail.notFound")}</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              {t("detail.notFoundDescription")}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("detail.backToList")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("form.editTitle")}</h1>
          <p className="text-muted-foreground">
            {t("form.editDescription", { name: organization.nameEn })}
          </p>
        </div>
      </div>

      {/* Form */}
      <OrganizationForm
        organization={organization}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
