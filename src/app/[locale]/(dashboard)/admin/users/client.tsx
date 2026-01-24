"use client";

/**
 * Admin Users Client Component
 *
 * Enterprise user management interface with role-based CRUD permissions.
 * Provides user listing, filtering, role management, and account controls.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { UserRole } from "@prisma/client";
import {
  getRoleDisplayName,
  canManageUser,
  canDeactivateUser,
  canDeleteUser,
  canResetPassword,
} from "@/lib/permissions/user-management";

// Components
import { UserFormModal } from "@/components/features/admin/user-form-modal";
import { ChangeRoleModal } from "@/components/features/admin/change-role-modal";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Icons
import {
  Users,
  UserCheck,
  UserX,
  Search,
  MoreHorizontal,
  Shield,
  UserCog,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface AdminUsersClientProps {
  userId: string;
  userRole: UserRole;
  userOrgId: string | null;
  locale: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  organizationId: string | null;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string | null;
    organizationCode: string | null;
  } | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const USER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "STEERING_COMMITTEE",
  "PROGRAMME_COORDINATOR",
  "LEAD_REVIEWER",
  "PEER_REVIEWER",
  "ANSP_ADMIN",
  "SAFETY_MANAGER",
  "QUALITY_MANAGER",
  "STAFF",
  "OBSERVER",
];

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  SYSTEM_ADMIN: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  STEERING_COMMITTEE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  PROGRAMME_COORDINATOR: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  LEAD_REVIEWER: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  PEER_REVIEWER: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  ANSP_ADMIN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  SAFETY_MANAGER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  QUALITY_MANAGER: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  STAFF: "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-400",
  OBSERVER: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
};

// =============================================================================
// STAT CARDS
// =============================================================================

interface StatCardsProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    byRole: Partial<Record<UserRole, number>>;
  } | undefined;
  isLoading: boolean;
}

function StatCards({ stats, isLoading }: StatCardsProps) {
  const t = useTranslations("admin.users");

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: t("totalUsers"),
      value: stats?.total ?? 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: t("activeUsers"),
      value: stats?.active ?? 0,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: t("inactiveUsers"),
      value: stats?.inactive ?? 0,
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className={cn("rounded-lg p-3", card.bgColor)}>
              <card.icon className={cn("h-6 w-6", card.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.title}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// FILTERS
// =============================================================================

interface FiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  organizationId: string;
  onOrganizationChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  organizations: Array<{ id: string; nameEn: string; nameFr: string | null; organizationCode: string | null }> | undefined;
  locale: string;
  showOrgFilter: boolean;
}

function Filters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  organizationId,
  onOrganizationChange,
  status,
  onStatusChange,
  organizations,
  locale,
  showOrgFilter,
}: FiltersProps) {
  const t = useTranslations("admin.users");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={role} onValueChange={onRoleChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t("filterByRole")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allRoles")}</SelectItem>
          {USER_ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {getRoleDisplayName(r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showOrgFilter && (
        <Select value={organizationId} onValueChange={onOrganizationChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t("filterByOrg")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allOrganizations")}</SelectItem>
            {organizations?.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.organizationCode ? `${org.organizationCode} - ` : ""}{locale === "fr" && org.nameFr ? org.nameFr : org.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder={t("filterByStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          <SelectItem value="active">{t("active")}</SelectItem>
          <SelectItem value="inactive">{t("inactive")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// =============================================================================
// USERS TABLE
// =============================================================================

interface UsersTableProps {
  users: User[] | undefined;
  isLoading: boolean;
  locale: string;
  currentUserId: string;
  currentUserRole: UserRole;
  currentUserOrgId: string | null;
  onEditUser: (user: User) => void;
  onEditRole: (user: User) => void;
  onToggleActive: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDeleteUser: (user: User) => void;
}

function UsersTable({
  users,
  isLoading,
  locale,
  currentUserId,
  currentUserRole,
  currentUserOrgId,
  onEditUser,
  onEditRole,
  onToggleActive,
  onResetPassword,
  onDeleteUser,
}: UsersTableProps) {
  const t = useTranslations("admin.users");

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("noUsers")}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.name")}</TableHead>
          <TableHead>{t("columns.email")}</TableHead>
          <TableHead>{t("columns.organization")}</TableHead>
          <TableHead>{t("columns.role")}</TableHead>
          <TableHead>{t("columns.status")}</TableHead>
          <TableHead>{t("columns.lastLogin")}</TableHead>
          <TableHead className="w-[70px]">{t("columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const canEdit = canManageUser(
            currentUserRole,
            currentUserOrgId,
            user.role,
            user.organization?.id ?? null
          );
          const canToggle = canDeactivateUser(
            currentUserRole,
            currentUserId,
            currentUserOrgId,
            user.id,
            user.organization?.id ?? null
          );
          const canReset = canResetPassword(
            currentUserRole,
            currentUserId,
            currentUserOrgId,
            user.id,
            user.organization?.id ?? null
          );
          const canDelete = canDeleteUser(
            currentUserRole,
            currentUserId,
            currentUserOrgId,
            user.id,
            user.organization?.id ?? null
          );

          const hasAnyAction = canEdit || canToggle || canReset || canDelete;

          return (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {user.firstName} {user.lastName}
                    {isSelf && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {t("you")}
                      </Badge>
                    )}
                  </p>
                  {user.title && (
                    <p className="text-sm text-muted-foreground">{user.title}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.organization ? (
                  <div>
                    <p className="text-sm">
                      {locale === "fr" && user.organization.nameFr
                        ? user.organization.nameFr
                        : user.organization.nameEn}
                    </p>
                    {user.organization.organizationCode && (
                      <p className="text-xs text-muted-foreground">
                        {user.organization.organizationCode}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={cn("font-medium", ROLE_COLORS[user.role])}>
                  {getRoleDisplayName(user.role)}
                </Badge>
              </TableCell>
              <TableCell>
                {user.isActive ? (
                  <Badge variant="outline" className="border-green-500 text-green-700">
                    {t("active")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500 text-red-700">
                    {t("inactive")}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {user.lastLoginAt ? (
                  format(new Date(user.lastLoginAt), "PP")
                ) : (
                  <span className="text-muted-foreground">{t("never")}</span>
                )}
              </TableCell>
              <TableCell>
                {hasAnyAction && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("columns.actions")}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {canEdit && (
                        <DropdownMenuItem onSelect={() => onEditUser(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t("editUser")}
                        </DropdownMenuItem>
                      )}
                      {canEdit && !isSelf && (
                        <DropdownMenuItem onSelect={() => onEditRole(user)}>
                          <Shield className="h-4 w-4 mr-2" />
                          {t("changeRole")}
                        </DropdownMenuItem>
                      )}
                      {canToggle && (
                        <DropdownMenuItem onSelect={() => onToggleActive(user)}>
                          <UserCog className="h-4 w-4 mr-2" />
                          {user.isActive ? t("actions.deactivate") : t("actions.activate")}
                        </DropdownMenuItem>
                      )}
                      {canReset && (
                        <DropdownMenuItem onSelect={() => onResetPassword(user)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          {t("actions.resetPassword")}
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => onDeleteUser(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("deleteUser")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// =============================================================================
// PAGINATION
// =============================================================================

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const t = useTranslations("admin.users");

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {t("pagination", { page, total: totalPages })}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AdminUsersClient({
  userId,
  userRole,
  userOrgId,
  locale,
}: AdminUsersClientProps) {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");

  // Filters state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Modal state
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changeRoleUser, setChangeRoleUser] = useState<User | null>(null);
  const [toggleActiveUser, setToggleActiveUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  // Fetch permissions
  const { data: permissionsData } = trpc.admin.user.getMyPermissions.useQuery();

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = trpc.admin.user.getStats.useQuery();

  // Fetch organizations for filter
  const { data: organizations } = trpc.organization.listForDropdown.useQuery();

  // Fetch users
  const {
    data: usersData,
    isLoading: usersLoading,
    refetch,
  } = trpc.admin.user.list.useQuery({
    page,
    limit: 20,
    search: search || undefined,
    role: roleFilter !== "all" ? (roleFilter as UserRole) : undefined,
    organizationId: orgFilter !== "all" ? orgFilter : undefined,
    isActive:
      statusFilter === "all" ? undefined : statusFilter === "active" ? true : false,
  });

  const utils = trpc.useUtils();

  // Mutations
  const toggleActiveMutation = trpc.admin.user.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? t("userActivated") : t("userDeactivated"));
      setToggleActiveUser(null);
      utils.admin.user.list.invalidate();
      utils.admin.user.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = trpc.admin.user.resetPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.tempPassword) {
        toast.info(`Temporary password: ${data.tempPassword}`, { duration: 10000 });
      }
      setResetPasswordUser(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.admin.user.delete.useMutation({
    onSuccess: () => {
      toast.success(t("userDeleted"));
      setDeleteUser(null);
      utils.admin.user.list.invalidate();
      utils.admin.user.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handlers
  const handleCreateUser = () => {
    setEditingUser(null);
    setUserFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormOpen(true);
  };

  const handleEditRole = (user: User) => {
    setChangeRoleUser(user);
  };

  const handleToggleActive = (user: User) => {
    setToggleActiveUser(user);
  };

  const handleConfirmToggleActive = () => {
    if (toggleActiveUser) {
      toggleActiveMutation.mutate({
        userId: toggleActiveUser.id,
        isActive: !toggleActiveUser.isActive,
      });
    }
  };

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user);
  };

  const handleConfirmResetPassword = () => {
    if (resetPasswordUser) {
      resetPasswordMutation.mutate({
        userId: resetPasswordUser.id,
      });
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeleteUser(user);
  };

  const handleConfirmDelete = () => {
    if (deleteUser) {
      deleteMutation.mutate({
        userId: deleteUser.id,
      });
    }
  };

  const handleFormSuccess = () => {
    refetch();
  };

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleOrgChange = (value: string) => {
    setOrgFilter(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const canCreate = permissionsData?.permissions.canCreate ?? false;
  const showOrgFilter = permissionsData?.permissions.canRead === "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreateUser}>
            <Plus className="h-4 w-4 mr-2" />
            {t("createUser")}
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <StatCards stats={stats} isLoading={statsLoading} />

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>{t("userList")}</CardTitle>
          <CardDescription>{t("userListDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <Filters
            search={search}
            onSearchChange={handleSearchChange}
            role={roleFilter}
            onRoleChange={handleRoleChange}
            organizationId={orgFilter}
            onOrganizationChange={handleOrgChange}
            status={statusFilter}
            onStatusChange={handleStatusChange}
            organizations={organizations}
            locale={locale}
            showOrgFilter={showOrgFilter}
          />

          {/* Users Table */}
          <UsersTable
            users={usersData?.users}
            isLoading={usersLoading}
            locale={locale}
            currentUserId={userId}
            currentUserRole={userRole}
            currentUserOrgId={userOrgId}
            onEditUser={handleEditUser}
            onEditRole={handleEditRole}
            onToggleActive={handleToggleActive}
            onResetPassword={handleResetPassword}
            onDeleteUser={handleDeleteUser}
          />

          {/* Pagination */}
          {usersData && usersData.totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={usersData.totalPages}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* User Form Modal (Create/Edit) */}
      <UserFormModal
        open={userFormOpen}
        onOpenChange={setUserFormOpen}
        user={editingUser}
        onSuccess={handleFormSuccess}
      />

      {/* Change Role Modal */}
      <ChangeRoleModal
        open={!!changeRoleUser}
        onOpenChange={(open) => !open && setChangeRoleUser(null)}
        user={changeRoleUser}
        onSuccess={handleFormSuccess}
      />

      {/* Toggle Active Alert Dialog */}
      <AlertDialog
        open={!!toggleActiveUser}
        onOpenChange={() => setToggleActiveUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleActiveUser?.isActive ? t("confirmDeactivateTitle") : t("confirmActivateTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleActiveUser?.isActive
                ? t("confirmDeactivate", {
                    name: `${toggleActiveUser?.firstName} ${toggleActiveUser?.lastName}`,
                  })
                : t("confirmActivate", {
                    name: `${toggleActiveUser?.firstName} ${toggleActiveUser?.lastName}`,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggleActive}
              disabled={toggleActiveMutation.isPending}
              className={
                toggleActiveUser?.isActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {toggleActiveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {toggleActiveUser?.isActive ? t("actions.deactivate") : t("actions.activate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Alert Dialog */}
      <AlertDialog
        open={!!resetPasswordUser}
        onOpenChange={() => setResetPasswordUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmResetPasswordTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmResetPassword", {
                name: `${resetPasswordUser?.firstName} ${resetPasswordUser?.lastName}`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("actions.resetPassword")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Alert Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDelete", {
                name: `${deleteUser?.firstName} ${deleteUser?.lastName}`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("deleteUser")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminUsersClient;
