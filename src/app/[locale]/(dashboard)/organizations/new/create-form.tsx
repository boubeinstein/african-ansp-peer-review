"use client";

/**
 * Organization Create Form Wrapper
 *
 * Client component that handles the organization creation logic
 * with tRPC mutation and navigation.
 */

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { OrganizationForm, type OrganizationFormValues } from "@/components/features/organization";

interface OrganizationCreateFormProps {
  locale: string;
}

export function OrganizationCreateForm({ locale }: OrganizationCreateFormProps) {
  const router = useRouter();
  const t = useTranslations("organizations");
  const utils = trpc.useUtils();

  const createMutation = trpc.organization.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("form.createSuccess"));
      // Invalidate organization list cache
      utils.organization.list.invalidate();
      utils.organization.getStats.invalidate();
      // Redirect to the new organization's detail page
      router.push(`/${locale}/organizations/${data.id}`);
    },
    onError: (error) => {
      toast.error(t("form.createError"), {
        description: error.message,
      });
    },
  });

  const handleSubmit = async (data: OrganizationFormValues) => {
    await createMutation.mutateAsync({
      nameEn: data.nameEn,
      nameFr: data.nameFr,
      organizationCode: data.organizationCode,
      country: data.country,
      city: data.city,
      region: data.region,
      membershipStatus: data.membershipStatus,
    });
  };

  const handleCancel = () => {
    router.push(`/${locale}/organizations`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("form.createTitle")}</h1>
          <p className="text-muted-foreground">{t("form.createDescription")}</p>
        </div>
      </div>

      {/* Form */}
      <OrganizationForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
