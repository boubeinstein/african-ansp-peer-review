"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { Monitor, Smartphone, Tablet, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";

export function ActiveSessions() {
  const t = useTranslations("settings.security");
  const tCommon = useTranslations("common");
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; device: string } | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);

  const { data: sessions, isLoading, refetch } = trpc.loginSession.listMySessions.useQuery();

  const handleConflictOrError = (error: { data?: { code?: string } | null; message: string }) => {
    if (error.data?.code === "CONFLICT") {
      toast.error(t("sessionConflict"));
      signOut({ callbackUrl: "/login?error=SessionRevoked" });
    } else {
      toast.error(error.message);
    }
  };

  const revokeMutation = trpc.loginSession.revokeSession.useMutation({
    onSuccess: () => {
      toast.success(t("sessionRevoked"));
      refetch();
      setRevokeTarget(null);
    },
    onError: handleConflictOrError,
  });

  const revokeAllMutation = trpc.loginSession.revokeAllOtherSessions.useMutation({
    onSuccess: (data) => {
      toast.success(t("allSessionsRevoked", { count: data.revokedCount }));
      refetch();
      setShowRevokeAllDialog(false);
    },
    onError: handleConflictOrError,
  });

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-5 w-5 text-muted-foreground" />;
      case "tablet":
        return <Tablet className="h-5 w-5 text-muted-foreground" />;
      case "desktop":
        return <Monitor className="h-5 w-5 text-muted-foreground" />;
      default:
        return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const otherSessions = sessions?.filter((s) => !s.isCurrent) || [];

  return (
    <div className="space-y-4">
      {otherSessions.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRevokeAllDialog(true)}
            disabled={revokeAllMutation.isPending}
          >
            {t("revokeAllOther")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {sessions?.map((session) => (
          <Card key={session.id} className={session.isCurrent ? "border-primary" : ""}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-lg">
                  {getDeviceIcon(session.deviceType)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {session.deviceName || t("unknownDevice")}
                    </span>
                    {session.isCurrent && (
                      <Badge variant="default" className="bg-green-600 text-xs">
                        {t("currentSession")}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {maskIp(session.ipAddress)} · {t("lastActive")}{" "}
                    {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() =>
                    setRevokeTarget({
                      id: session.id,
                      device: session.deviceName || t("unknownDevice"),
                    })
                  }
                  disabled={revokeMutation.isPending}
                >
                  {t("revoke")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {sessions?.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("noOtherSessions")}
          </p>
        )}
      </div>

      {/* Revoke single session dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("revokeConfirmDescription", { device: revokeTarget?.device ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && revokeMutation.mutate({ sessionId: revokeTarget.id })}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke all dialog */}
      <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeAllConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("revokeAllConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeAllMutation.mutate()}
              disabled={revokeAllMutation.isPending}
            >
              {revokeAllMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("revokeAllOther")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
