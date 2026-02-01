"use client";

import { useState } from "react";
import { UserRole } from "@/types/prisma-enums";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import {
  getRoleDisplayName,
  ROLE_HIERARCHY,
} from "@/lib/permissions/user-management";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

interface ChangeRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    organizationId: string | null;
  } | null;
  onSuccess?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ChangeRoleModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ChangeRoleModalProps) {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Fetch assignable roles
  const { data: assignableRoles } = trpc.admin.user.getAssignableRoles.useQuery(
    { targetOrgId: user?.organizationId ?? null },
    { enabled: open && !!user }
  );

  const utils = trpc.useUtils();

  // Update role mutation
  const updateRoleMutation = trpc.admin.user.updateRole.useMutation({
    onSuccess: () => {
      toast.success(t("roleChanged"));
      utils.admin.user.list.invalidate();
      utils.admin.user.getStats.invalidate();
      onOpenChange(false);
      setSelectedRole(null);
      onSuccess?.();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (!user || !selectedRole) return;

    updateRoleMutation.mutate({
      userId: user.id,
      role: selectedRole,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedRole(null);
    }
    onOpenChange(newOpen);
  };

  if (!user) return null;

  const currentRoleLevel = ROLE_HIERARCHY[user.role];
  const newRoleLevel = selectedRole ? ROLE_HIERARCHY[selectedRole] : null;
  const isDowngrade = newRoleLevel !== null && newRoleLevel < currentRoleLevel;
  const isUpgrade = newRoleLevel !== null && newRoleLevel > currentRoleLevel;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            {t("changeRole")}
          </DialogTitle>
          <DialogDescription>
            {t("changeRoleDescription", {
              name: `${user.firstName} ${user.lastName}`,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Role */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("currentRole")}
              </p>
              <Badge variant="secondary" className="font-medium">
                {getRoleDisplayName(user.role)}
              </Badge>
            </div>
            {selectedRole && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1 text-right">
                  <p className="text-sm text-muted-foreground">{t("newRole")}</p>
                  <Badge
                    variant={isDowngrade ? "destructive" : "default"}
                    className="font-medium"
                  >
                    {getRoleDisplayName(selectedRole)}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* Role Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("selectNewRole")}</label>
            <Select
              value={selectedRole ?? undefined}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("form.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles
                  ?.filter((role: UserRole) => role !== user.role)
                  .map((role: UserRole) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <span>{getRoleDisplayName(role)}</span>
                        {ROLE_HIERARCHY[role] < currentRoleLevel && (
                          <Badge variant="outline" className="text-xs">
                            {t("downgrade")}
                          </Badge>
                        )}
                        {ROLE_HIERARCHY[role] > currentRoleLevel && (
                          <Badge variant="outline" className="text-xs">
                            {t("upgrade")}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning for downgrade */}
          {isDowngrade && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("warnings.downgradeTitle")}</AlertTitle>
              <AlertDescription>
                {t("warnings.downgradeDescription")}
              </AlertDescription>
            </Alert>
          )}

          {/* Info for upgrade */}
          {isUpgrade && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>{t("warnings.upgradeTitle")}</AlertTitle>
              <AlertDescription>
                {t("warnings.upgradeDescription")}
              </AlertDescription>
            </Alert>
          )}

          {/* No assignable roles message */}
          {assignableRoles?.filter((r: UserRole) => r !== user.role).length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("permissions.noRoleChangePermission")}</AlertTitle>
              <AlertDescription>
                {t("permissions.noAssignableRoles")}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={updateRoleMutation.isPending}
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedRole ||
              updateRoleMutation.isPending ||
              assignableRoles?.filter((r: UserRole) => r !== user.role).length === 0
            }
            variant={isDowngrade ? "destructive" : "default"}
          >
            {updateRoleMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {tCommon("actions.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
