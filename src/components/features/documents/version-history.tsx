"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { History, Lock, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface VersionHistoryProps {
  documentId: string;
  canLock?: boolean;
}

export function VersionHistory({
  documentId,
  canLock = false,
}: VersionHistoryProps) {
  const t = useTranslations("documentManagement.versions");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const utils = trpc.useUtils();

  const { data: versions, isLoading } =
    trpc.documentEnhanced.getVersions.useQuery({ documentId });

  const lockMutation = trpc.documentEnhanced.lockVersion.useMutation({
    onSuccess: () => {
      toast.success(t("locked"));
      utils.documentEnhanced.getVersions.invalidate({ documentId });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleVerify = async (versionId: string) => {
    try {
      const result = await utils.client.documentEnhanced.verifyIntegrity.query({
        versionId,
      });
      if (result.isValid) {
        toast.success(t("integrityValid"));
      } else {
        toast.error(t("integrityInvalid"));
      }
    } catch {
      toast.error(t("integrityInvalid"));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          {t("title")}
          <Badge variant="secondary">{versions?.length || 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {versions?.map((version, index) => (
            <div
              key={version.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    v{version.versionNumber}
                  </Badge>
                  <span className="text-sm font-medium">{version.fileName}</span>
                  {version.isLocked && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Lock className="h-4 w-4 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>{t("lockedTooltip")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatSize(version.fileSize)}</span>
                  <span>•</span>
                  <span>
                    {version.createdBy.firstName} {version.createdBy.lastName}
                  </span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(version.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerify(version.id)}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("verify")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {canLock && !version.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            lockMutation.mutate({ versionId: version.id })
                          }
                          disabled={lockMutation.isPending}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("lock")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ))}
          {versions?.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              {t("noVersions")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
