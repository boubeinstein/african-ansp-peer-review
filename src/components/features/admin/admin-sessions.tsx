"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow, format } from "date-fns";
import {
  Monitor,
  Smartphone,
  Tablet,
  HelpCircle,
  Users,
  Activity,
  Layers,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface AdminSessionsClientProps {
  locale: string;
}

export function AdminSessionsClient({ locale }: AdminSessionsClientProps) {
  const t = useTranslations("admin.sessions");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string;
    userName: string;
    device: string;
  } | null>(null);

  const { data: stats, isLoading: statsLoading } =
    trpc.loginSession.adminSessionStats.useQuery();

  const { data: sessionsData, isLoading, refetch } =
    trpc.loginSession.adminListAllSessions.useQuery({
      page,
      pageSize: 20,
      search: search || undefined,
      organizationId: orgFilter || undefined,
    });

  const { data: orgs } = trpc.organization.listForDropdown.useQuery();

  const revokeMutation = trpc.loginSession.adminRevokeSession.useMutation({
    onSuccess: () => {
      toast.success(t("sessionRevokedSuccess"));
      refetch();
      setRevokeTarget(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      case "desktop":
        return <Monitor className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  const maskIp = (ip: string | null) => {
    if (!ip) return "—";
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip.slice(0, 8) + "***";
  };

  const getOrgDisplayName = (org: { nameEn: string; nameFr: string; organizationCode: string | null } | null) => {
    if (!org) return "—";
    return org.organizationCode || (locale === "fr" ? org.nameFr : org.nameEn);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.totalActive")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalActive ?? 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.currentlyOnline")}</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.recentlyActive ?? 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.uniqueUsers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.uniqueUsers ?? 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.multiDevice")}</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.multiSessionUsers ?? 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchUsers")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={orgFilter || "all"}
          onValueChange={(v) => {
            setOrgFilter(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t("filterByOrg")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allOrganizations")}</SelectItem>
            {orgs?.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {getOrgDisplayName(org)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sessions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.user")}</TableHead>
              <TableHead>{t("table.organization")}</TableHead>
              <TableHead>{t("table.device")}</TableHead>
              <TableHead>{t("table.ipAddress")}</TableHead>
              <TableHead>{t("table.lastActive")}</TableHead>
              <TableHead>{t("table.signedIn")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sessionsData?.sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t("noSessions")}
                </TableCell>
              </TableRow>
            ) : (
              sessionsData?.sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {session.user.firstName} {session.user.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">{session.user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getOrgDisplayName(session.user.organization)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(session.deviceType)}
                      <span className="text-sm">{session.deviceName || "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{maskIp(session.ipAddress)}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>{format(new Date(session.createdAt), "MMM d, HH:mm")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        setRevokeTarget({
                          id: session.id,
                          userName: `${session.user.firstName} ${session.user.lastName}`,
                          device: session.deviceName || "device",
                        })
                      }
                    >
                      {t("forceRevoke")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {sessionsData && sessionsData.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {tCommon("previous")}
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {page} / {sessionsData.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= sessionsData.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {tCommon("next")}
          </Button>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("forceRevokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("forceRevokeConfirm", {
                user: revokeTarget?.userName ?? "",
                device: revokeTarget?.device ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && revokeMutation.mutate({ sessionId: revokeTarget.id })}
              disabled={revokeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("forceRevoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
