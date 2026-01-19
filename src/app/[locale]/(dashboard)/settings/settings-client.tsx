"use client";

/**
 * Settings Page Client Component
 *
 * Provides a tabbed interface for managing user settings with role-based
 * tab visibility. Admin and organization settings are only visible to
 * users with appropriate roles.
 */

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Settings, Bell, Shield, Building2, Cog } from "lucide-react";
import { ProfileSettings } from "@/components/features/settings/profile-settings";
import { PreferencesSettings } from "@/components/features/settings/preferences-settings";
import { NotificationSettings } from "@/components/features/settings/notification-settings";
import { SecuritySettings } from "@/components/features/settings/security-settings";
import { OrganizationSettings } from "@/components/features/settings/organization-settings";
import { AdminSettings } from "@/components/features/settings/admin-settings";

// Roles that have access to system administration settings
const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

// Roles that have access to organization settings
const ORG_ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "ANSP_ADMIN"];

interface SettingsClientProps {
  userId: string;
  userRole: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  organizationId?: string | null;
}

export function SettingsClient({
  userRole,
  userEmail,
  firstName,
  lastName,
  organizationId,
}: SettingsClientProps) {
  const t = useTranslations("settings");

  const isAdmin = ADMIN_ROLES.includes(userRole);
  const isOrgAdmin = ORG_ADMIN_ROLES.includes(userRole);

  return (
    <div className="container mx-auto py-6 px-4 lg:px-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 lg:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.preferences")}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.notifications")}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.security")}</span>
          </TabsTrigger>
          {isOrgAdmin && (
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabs.organization")}</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabs.admin")}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings
            firstName={firstName}
            lastName={lastName}
            email={userEmail}
          />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings email={userEmail} />
        </TabsContent>

        {isOrgAdmin && (
          <TabsContent value="organization">
            <OrganizationSettings organizationId={organizationId} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="admin">
            <AdminSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default SettingsClient;
