"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserRole } from "@/types/prisma-enums";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { getRoleDisplayName } from "@/lib/permissions/user-management";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    title: string | null;
    role: UserRole;
    organizationId: string | null;
    organization?: {
      id: string;
      nameEn: string;
      nameFr: string | null;
      organizationCode: string | null;
    } | null;
  } | null;
  onSuccess?: () => void;
}

// =============================================================================
// SCHEMA
// =============================================================================

const createUserSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  title: z.string().optional(),
  role: z.nativeEnum(UserRole),
  organizationId: z.string().optional().nullable(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  title: z.string().optional().nullable(),
  organizationId: z.string().optional().nullable(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type UpdateUserFormData = z.infer<typeof updateUserSchema>;

// =============================================================================
// COMPONENT
// =============================================================================

export function UserFormModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormModalProps) {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");
  const isEdit = !!user;

  // Fetch organizations for dropdown
  const { data: orgsData } = trpc.organization.listForDropdown.useQuery(
    undefined,
    { enabled: open }
  );

  // Fetch assignable roles
  const { data: assignableRoles } = trpc.admin.user.getAssignableRoles.useQuery(
    { targetOrgId: user?.organizationId ?? null },
    { enabled: open }
  );

  // Fetch permissions
  const { data: permissionsData } = trpc.admin.user.getMyPermissions.useQuery(
    undefined,
    { enabled: open }
  );

  const utils = trpc.useUtils();

  // Create mutation
  const createMutation = trpc.admin.user.create.useMutation({
    onSuccess: (data: { user: unknown; tempPassword?: string }) => {
      toast.success(t("userCreated"));
      if (data.tempPassword) {
        toast.info(`Temporary password: ${data.tempPassword}`, {
          duration: 10000,
        });
      }
      utils.admin.user.list.invalidate();
      utils.admin.user.getStats.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = trpc.admin.user.update.useMutation({
    onSuccess: () => {
      toast.success(t("userUpdated"));
      utils.admin.user.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  // Form setup
  const form = useForm<CreateUserFormData | UpdateUserFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      title: "",
      role: UserRole.STAFF,
      organizationId: null,
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        title: user.title ?? "",
        organizationId: user.organizationId,
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        title: "",
        role: UserRole.STAFF,
        organizationId: null,
      });
    }
  }, [user, form]);

  const onSubmit = (data: CreateUserFormData | UpdateUserFormData) => {
    if (isEdit && user) {
      updateMutation.mutate({
        id: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        title: data.title || null,
        organizationId: data.organizationId || null,
      });
    } else {
      const createData = data as CreateUserFormData;
      createMutation.mutate({
        firstName: createData.firstName,
        lastName: createData.lastName,
        email: createData.email,
        title: createData.title,
        role: createData.role,
        organizationId: createData.organizationId || null,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const canCreate = permissionsData?.permissions.canCreate ?? false;

  // Don't render create form if user can't create
  if (!isEdit && !canCreate) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editUser") : t("createUser")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("form.editDescription")
              : t("form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.firstName")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John" />
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
                    <FormLabel>{t("form.lastName")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEdit && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.email")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="john.doe@organization.aero"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.title")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Safety Manager"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.organization")}</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? null : value)
                    }
                    value={field.value ?? "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.selectOrganization")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("form.noOrganization")}
                      </SelectItem>
                      {orgsData?.map((org: { id: string; nameEn: string; organizationCode: string | null }) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.organizationCode ? `${org.organizationCode} - ` : ""}{org.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.role")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.selectRole")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableRoles?.map((role: UserRole) => (
                          <SelectItem key={role} value={role}>
                            {getRoleDisplayName(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {tCommon("actions.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? tCommon("actions.save") : t("createUser")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
