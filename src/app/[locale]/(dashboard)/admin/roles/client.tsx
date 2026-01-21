"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserRole } from "@prisma/client";
import {
  ROLE_HIERARCHY,
  ASSIGNABLE_ROLES,
  USER_CRUD_PERMISSIONS,
  getRoleDisplayName,
} from "@/lib/permissions/user-management";
import {
  ROLE_DESCRIPTIONS,
  ROLES_BY_HIERARCHY,
} from "@/lib/permissions/role-descriptions";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  ShieldAlert,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Users,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface RolesDocumentationClientProps {
  locale: string;
}

// =============================================================================
// PERMISSION DISPLAY HELPERS
// =============================================================================

function PermissionValue({
  value,
  t,
}: {
  value: string | boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  if (value === true || value === "all") {
    return (
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <Check className="h-4 w-4" />
        {value === true ? "" : t("accessLevels.all")}
      </span>
    );
  }
  if (value === false || value === "none") {
    return (
      <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
        <X className="h-4 w-4" />
      </span>
    );
  }
  if (value === "own_org") {
    return (
      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <Check className="h-4 w-4" />
        {t("accessLevels.ownOrg")}
      </span>
    );
  }
  if (value === "self") {
    return (
      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
        <Check className="h-4 w-4" />
        {t("accessLevels.self")}
      </span>
    );
  }
  if (value === "lower_hierarchy" || value === "own_org_limited") {
    return (
      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <Check className="h-4 w-4" />
        {t("accessLevels.lowerHierarchy")}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}

// =============================================================================
// ROLE CARD COMPONENT
// =============================================================================

function RoleCard({
  role,
  t,
}: {
  role: UserRole;
  t: ReturnType<typeof useTranslations>;
}) {
  const description = ROLE_DESCRIPTIONS[role];
  const hierarchy = ROLE_HIERARCHY[role];
  const permissions = USER_CRUD_PERMISSIONS[role];
  const assignableRoles = ASSIGNABLE_ROLES[role];

  const IconComponent = description.icon;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${description.color}`}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{t(description.titleKey)}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {t("hierarchy")} {hierarchy}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2">
          {t(description.descriptionKey)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Permissions */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <ShieldAlert className="h-4 w-4" />
            {t("permissions")}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("permissionLabels.create")}:
              </span>
              <PermissionValue value={permissions.canCreate} t={t} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("permissionLabels.read")}:
              </span>
              <PermissionValue value={permissions.canRead} t={t} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("permissionLabels.update")}:
              </span>
              <PermissionValue value={permissions.canUpdate} t={t} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("permissionLabels.delete")}:
              </span>
              <PermissionValue value={permissions.canDelete} t={t} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("permissionLabels.changeRole")}:
              </span>
              <PermissionValue value={permissions.canChangeRole} t={t} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("permissionLabels.deactivate")}:
              </span>
              <PermissionValue value={permissions.canDeactivate} t={t} />
            </div>
          </div>
        </div>

        {/* Assignable Roles */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Users className="h-4 w-4" />
            {t("canAssign")}
          </h4>
          {assignableRoles.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {assignableRoles.map((assignableRole) => (
                <Badge key={assignableRole} variant="secondary" className="text-xs">
                  {getRoleDisplayName(assignableRole)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {t("noAssignableRoles")}
            </p>
          )}
        </div>

        {/* Typical Users */}
        <div>
          <h4 className="text-sm font-medium mb-2">{t("typicalUsers")}</h4>
          <ul className="text-sm text-muted-foreground list-disc list-inside">
            {description.typicalUsers.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// HIERARCHY VISUALIZATION
// =============================================================================

function HierarchyVisualization({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  // Group roles by hierarchy level
  const rolesByLevel = ROLES_BY_HIERARCHY.reduce(
    (acc, role) => {
      const level = ROLE_HIERARCHY[role];
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level].push(role);
      return acc;
    },
    {} as Record<number, UserRole[]>
  );

  const sortedLevels = Object.keys(rolesByLevel)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("hierarchy")}</CardTitle>
        <CardDescription>
          {t("pageSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedLevels.map((level) => (
            <div
              key={level}
              className="flex items-center gap-4 p-2 rounded-lg bg-muted/50"
            >
              <Badge variant="outline" className="min-w-[70px] justify-center">
                Level {level}
              </Badge>
              <div className="flex flex-wrap gap-2">
                {rolesByLevel[level].map((role) => {
                  const desc = ROLE_DESCRIPTIONS[role];
                  return (
                    <Badge
                      key={role}
                      className={desc.color}
                      variant="secondary"
                    >
                      {getRoleDisplayName(role)}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PERMISSION MATRIX TABLE
// =============================================================================

function PermissionMatrix({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t("permissionMatrix")}</CardTitle>
              <CardDescription>
                {t("pageSubtitle")}
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                {isOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    {t("collapseMatrix")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    {t("expandMatrix")}
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Role</TableHead>
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger>{t("permissionLabels.create")}</TooltipTrigger>
                          <TooltipContent>Can create new users</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger>{t("permissionLabels.read")}</TooltipTrigger>
                          <TooltipContent>Can view user data</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger>{t("permissionLabels.update")}</TooltipTrigger>
                          <TooltipContent>Can edit user data</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger>{t("permissionLabels.delete")}</TooltipTrigger>
                          <TooltipContent>Can delete users</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger>{t("permissionLabels.changeRole")}</TooltipTrigger>
                          <TooltipContent>Can change user roles</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger>{t("permissionLabels.deactivate")}</TooltipTrigger>
                          <TooltipContent>Can deactivate users</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger>{t("permissionLabels.resetPassword")}</TooltipTrigger>
                          <TooltipContent>Can reset passwords</TooltipContent>
                        </Tooltip>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROLES_BY_HIERARCHY.map((role) => {
                      const permissions = USER_CRUD_PERMISSIONS[role];
                      const desc = ROLE_DESCRIPTIONS[role];
                      return (
                        <TableRow key={role}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded ${desc.color}`}>
                                <desc.icon className="h-4 w-4" />
                              </div>
                              <span className="font-medium text-sm">
                                {getRoleDisplayName(role)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <PermissionValue value={permissions.canCreate} t={t} />
                          </TableCell>
                          <TableCell className="text-center">
                            <PermissionValue value={permissions.canRead} t={t} />
                          </TableCell>
                          <TableCell className="text-center">
                            <PermissionValue value={permissions.canUpdate} t={t} />
                          </TableCell>
                          <TableCell className="text-center">
                            <PermissionValue value={permissions.canDelete} t={t} />
                          </TableCell>
                          <TableCell className="text-center">
                            <PermissionValue value={permissions.canChangeRole} t={t} />
                          </TableCell>
                          <TableCell className="text-center">
                            <PermissionValue value={permissions.canDeactivate} t={t} />
                          </TableCell>
                          <TableCell className="text-center">
                            <PermissionValue value={permissions.canResetPassword} t={t} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RolesDocumentationClient({ locale }: RolesDocumentationClientProps) {
  const t = useTranslations("roles");

  // Suppress unused variable warning
  void locale;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
            <p className="text-muted-foreground">{t("pageSubtitle")}</p>
          </div>
        </div>

        {/* Read-only Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Documentation</AlertTitle>
          <AlertDescription>{t("readOnlyNotice")}</AlertDescription>
        </Alert>
      </div>

      {/* Hierarchy Visualization */}
      <HierarchyVisualization t={t} />

      {/* Permission Matrix */}
      <PermissionMatrix t={t} />

      {/* Role Cards Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Role Details</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES_BY_HIERARCHY.map((role) => (
            <RoleCard key={role} role={role} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
