"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Share2, Plus, Copy, Trash2, Clock, Users, Link, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

interface ShareLinksProps {
  documentId: string;
}

export function ShareLinks({ documentId }: ShareLinksProps) {
  const t = useTranslations("documentManagement.sharing");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    expiresInHours: 72,
    maxAccesses: undefined as number | undefined,
    recipientEmail: "",
    recipientName: "",
    purpose: "",
  });

  const { data: linksData, isLoading } =
    trpc.documentEnhanced.getDocumentShareLinks.useQuery({
      documentId,
      includeExpired: true,
    });

  const { data: stats } = trpc.documentEnhanced.getShareStats.useQuery({
    documentId,
  });

  const createMutation = trpc.documentEnhanced.createShareLink.useMutation({
    onSuccess: (data) => {
      toast.success(t("created"));
      // Generate the share URL
      const shareUrl = `${window.location.origin}/api/shared/${data.token}`;
      navigator.clipboard.writeText(shareUrl);
      toast.info(t("copiedToClipboard"));
      utils.documentEnhanced.getDocumentShareLinks.invalidate({ documentId });
      utils.documentEnhanced.getShareStats.invalidate({ documentId });
      setCreateDialogOpen(false);
      setFormData({
        expiresInHours: 72,
        maxAccesses: undefined,
        recipientEmail: "",
        recipientName: "",
        purpose: "",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeMutation = trpc.documentEnhanced.revokeShareLink.useMutation({
    onSuccess: () => {
      toast.success(t("revoked"));
      utils.documentEnhanced.getDocumentShareLinks.invalidate({ documentId });
      utils.documentEnhanced.getShareStats.invalidate({ documentId });
    },
    onError: (error) => toast.error(error.message),
  });

  const copyToClipboard = (token: string) => {
    const shareUrl = `${window.location.origin}/api/shared/${token}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(t("copiedToClipboard"));
  };

  const handleCreate = () => {
    createMutation.mutate({
      documentId,
      expiresInHours: formData.expiresInHours,
      maxAccesses: formData.maxAccesses,
      recipientEmail: formData.recipientEmail || undefined,
      recipientName: formData.recipientName || undefined,
      purpose: formData.purpose || undefined,
    });
  };

  // Separate active and inactive links
  const activeLinks = linksData?.tokens.filter((l) => l.isValid) || [];
  const inactiveLinks = linksData?.tokens.filter((l) => !l.isValid) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          {t("title")}
          <Badge variant="secondary">
            {activeLinks.length} {t("active")}
          </Badge>
        </CardTitle>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t("create")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("expiresIn")}</Label>
                <Input
                  type="number"
                  value={formData.expiresInHours}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expiresInHours: parseInt(e.target.value) || 72,
                    }))
                  }
                  min={1}
                  max={720}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("expiresInHelp")}
                </p>
              </div>
              <div>
                <Label>{t("maxAccesses")}</Label>
                <Input
                  type="number"
                  value={formData.maxAccesses || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxAccesses: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                  min={1}
                  max={100}
                  placeholder={t("unlimitedAccesses")}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("maxAccessesHelp")}
                </p>
              </div>
              <div>
                <Label>{t("recipientEmail")}</Label>
                <Input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recipientEmail: e.target.value,
                    }))
                  }
                  placeholder="auditor@example.com"
                />
              </div>
              <div>
                <Label>{t("recipientName")}</Label>
                <Input
                  value={formData.recipientName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recipientName: e.target.value,
                    }))
                  }
                  placeholder={t("recipientNamePlaceholder")}
                />
              </div>
              <div>
                <Label>{t("purpose")}</Label>
                <Input
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, purpose: e.target.value }))
                  }
                  placeholder={t("purposePlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {t("createLink")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 mb-4 p-3 rounded-lg bg-muted/30">
            <div className="text-center">
              <p className="text-lg font-bold">{stats.activeTokens}</p>
              <p className="text-xs text-muted-foreground">{t("activeLinks")}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stats.expiredTokens}</p>
              <p className="text-xs text-muted-foreground">{t("expiredLinks")}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stats.totalAccesses}</p>
              <p className="text-xs text-muted-foreground">{t("totalAccesses")}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stats.uniqueRecipients}</p>
              <p className="text-xs text-muted-foreground">{t("recipients")}</p>
            </div>
          </div>
        )}

        {/* Active Links */}
        {activeLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Link className="h-10 w-10 mb-2 opacity-50" />
            <p>{t("noActiveLinks")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-mono truncate">
                      {link.token.substring(0, 16)}...
                    </span>
                    {link.purpose && (
                      <Badge variant="outline" className="text-xs truncate">
                        {link.purpose}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(link.expiresAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {link.accessCount}
                      {link.maxAccesses && `/${link.maxAccesses}`}
                    </span>
                    {link.recipientEmail && (
                      <span className="truncate">{link.recipientEmail}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(link.token)}
                    title={t("copyLink")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeMutation.mutate({ tokenId: link.id })}
                    disabled={revokeMutation.isPending}
                    title={t("revokeLink")}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inactive/Expired Links */}
        {inactiveLinks.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t("expiredOrRevoked")} ({inactiveLinks.length})
            </p>
            <div className="space-y-2 opacity-60">
              {inactiveLinks.slice(0, 3).map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-dashed"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    <span className="font-mono truncate">
                      {link.token.substring(0, 12)}...
                    </span>
                    <span className="text-muted-foreground">
                      {t("expired")} {format(new Date(link.expiresAt), "PP", { locale: dateLocale })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
