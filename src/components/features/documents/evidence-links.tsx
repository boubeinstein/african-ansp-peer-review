"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Link2,
  Plus,
  CheckCircle,
  XCircle,
  Trash2,
  ExternalLink,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface EvidenceLinksProps {
  entityType: string;
  entityId: string;
  canVerify?: boolean;
  canAdd?: boolean;
  canDelete?: boolean;
}

export function EvidenceLinks({
  entityType,
  entityId,
  canVerify = false,
  canAdd = false,
  canDelete = false,
}: EvidenceLinksProps) {
  const t = useTranslations("documentManagement.evidence");
  const locale = useLocale();
  const utils = trpc.useUtils();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: links, isLoading } =
    trpc.documentEnhanced.getEntityEvidenceLinks.useQuery({
      entityType,
      entityId,
    });

  const { data: stats } = trpc.documentEnhanced.getEvidenceStats.useQuery({
    entityType,
    entityId,
  });

  const verifyMutation = trpc.documentEnhanced.verifyEvidenceLink.useMutation({
    onSuccess: () => {
      toast.success(t("verified"));
      utils.documentEnhanced.getEntityEvidenceLinks.invalidate({
        entityType,
        entityId,
      });
      utils.documentEnhanced.getEvidenceStats.invalidate({
        entityType,
        entityId,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.documentEnhanced.deleteEvidenceLink.useMutation({
    onSuccess: () => {
      toast.success(t("deleted"));
      utils.documentEnhanced.getEntityEvidenceLinks.invalidate({
        entityType,
        entityId,
      });
      utils.documentEnhanced.getEvidenceStats.invalidate({
        entityType,
        entityId,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const getLinkTypeLabel = (linkType: string) => {
    const labels: Record<string, { en: string; fr: string }> = {
      SUPPORTS: { en: "Supports", fr: "Soutient" },
      PROVES: { en: "Proves", fr: "Prouve" },
      REFERENCES: { en: "References", fr: "Référence" },
      CONTRADICTS: { en: "Contradicts", fr: "Contredit" },
      SUPERSEDES: { en: "Supersedes", fr: "Remplace" },
    };
    return labels[linkType]?.[locale as "en" | "fr"] || linkType;
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          {t("title")}
          {stats && (
            <div className="flex gap-1">
              <Badge variant="secondary">{stats.total}</Badge>
              <Badge variant="outline" className="text-green-600">
                {stats.verified} {t("verifiedBadge")}
              </Badge>
            </div>
          )}
        </CardTitle>
        {canAdd && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("add")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addTitle")}</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground">{t("selectDocument")}</p>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {links?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 opacity-50" />
            <p>{t("empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {links?.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {link.isVerified ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {link.document.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {getLinkTypeLabel(link.linkType)}
                      </Badge>
                      <span>{link.document.fileType}</span>
                      {link.relevanceScore !== null && (
                        <span className="text-xs">
                          {t("relevance")}: {link.relevanceScore}%
                        </span>
                      )}
                    </div>
                    {(link.notesEn || link.notesFr) && (
                      <p className="text-xs text-muted-foreground mt-1 italic truncate">
                        {locale === "fr" ? link.notesFr || link.notesEn : link.notesEn || link.notesFr}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {canVerify && !link.isVerified && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => verifyMutation.mutate({ linkId: link.id })}
                      disabled={verifyMutation.isPending}
                      title={t("verifyLink")}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={link.document.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("viewDocument")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ linkId: link.id })}
                      disabled={deleteMutation.isPending}
                      title={t("deleteLink")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
