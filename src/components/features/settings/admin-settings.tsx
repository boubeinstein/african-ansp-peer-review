"use client";

/**
 * Admin Settings Component
 *
 * System-wide administration settings for super admins and system admins.
 * Displays system statistics and configuration options.
 */

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Cog,
  Users,
  Building2,
  ClipboardList,
  GraduationCap,
  Shield,
  Server,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
      <div className="p-3 bg-primary/10 rounded-lg">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

export function AdminSettings() {
  const t = useTranslations("settings.admin");

  const { data: adminSettings, isLoading } = trpc.settings.getAdminSettings.useQuery();

  if (isLoading) {
    return <AdminSkeleton />;
  }

  if (!adminSettings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("loadError")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t("systemStats")}
          </CardTitle>
          <CardDescription>{t("systemStatsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={Users}
              label={t("activeUsers")}
              value={adminSettings.statistics.activeUsers}
            />
            <StatCard
              icon={Building2}
              label={t("activeOrganizations")}
              value={adminSettings.statistics.activeOrganizations}
            />
            <StatCard
              icon={ClipboardList}
              label={t("totalReviews")}
              value={adminSettings.statistics.totalReviews}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("systemStatus")}
          </CardTitle>
          <CardDescription>{t("systemStatusDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              {adminSettings.maintenanceMode ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              <div>
                <p className="font-medium">{t("systemHealth")}</p>
                <p className="text-sm text-muted-foreground">
                  {adminSettings.maintenanceMode
                    ? t("maintenanceModeActive")
                    : t("allSystemsOperational")}
                </p>
              </div>
            </div>
            <Badge
              variant={adminSettings.maintenanceMode ? "destructive" : "secondary"}
              className={
                adminSettings.maintenanceMode
                  ? ""
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }
            >
              {adminSettings.maintenanceMode ? t("maintenance") : t("operational")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            {t("featureFlags")}
          </CardTitle>
          <CardDescription>{t("featureFlagsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="training-module" className="font-medium">
                  {t("trainingModule")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("trainingModuleDescription")}
                </p>
              </div>
            </div>
            <Switch
              id="training-module"
              checked={adminSettings.trainingModuleEnabled}
              disabled
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="new-registrations" className="font-medium">
                  {t("allowRegistrations")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("allowRegistrationsDescription")}
                </p>
              </div>
            </div>
            <Switch
              id="new-registrations"
              checked={adminSettings.allowNewRegistrations}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* System Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {t("systemLimits")}
          </CardTitle>
          <CardDescription>{t("systemLimitsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">{t("maxUploadSize")}</p>
              <p className="text-sm text-muted-foreground">
                {t("maxUploadSizeDescription")}
              </p>
            </div>
            <Badge variant="outline" className="text-lg font-mono">
              {adminSettings.maxUploadSizeMB} MB
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">{t("readOnlyNote")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSettings;
