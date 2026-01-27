"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  CheckCircle,
  Heart,
  Loader2,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Adoption {
  id: string;
  adoptedAt: Date;
  implementationStatus: string | null;
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
  };
}

interface BestPractice {
  id: string;
  organizationId: string;
  status: string;
  adoptions: Adoption[];
  organization: {
    id: string;
    nameEn: string;
    nameFr: string;
    organizationCode: string | null;
    country: string;
  };
}

interface BestPracticeSidebarProps {
  practice: BestPractice;
  locale: string;
  canAdopt: boolean;
  hasAdopted: boolean;
  isOwnOrg: boolean;
}

export function BestPracticeSidebar({
  practice,
  locale,
  canAdopt,
  hasAdopted,
  isOwnOrg,
}: BestPracticeSidebarProps) {
  const t = useTranslations("bestPractices.detail");
  const utils = trpc.useUtils();

  const [adoptDialogOpen, setAdoptDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [implementationNotes, setImplementationNotes] = useState("");

  const adoptMutation = trpc.bestPractice.adopt.useMutation({
    onSuccess: () => {
      toast.success(t("adoption.adoptSuccess"));
      utils.bestPractice.getById.invalidate({ id: practice.id });
      setAdoptDialogOpen(false);
      setImplementationNotes("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMutation = trpc.bestPractice.removeAdoption.useMutation({
    onSuccess: () => {
      toast.success(t("adoption.removeSuccess"));
      utils.bestPractice.getById.invalidate({ id: practice.id });
      setRemoveDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAdopt = () => {
    adoptMutation.mutate({
      bestPracticeId: practice.id,
      implementationNotes: implementationNotes || undefined,
    });
  };

  const handleRemoveAdoption = () => {
    removeMutation.mutate({ bestPracticeId: practice.id });
  };

  const orgName =
    locale === "fr"
      ? practice.organization.nameFr
      : practice.organization.nameEn;

  return (
    <div className="space-y-6">
      {/* Adoption Action Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-primary" />
            {t("adoption.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwnOrg ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{t("adoption.ownPractice")}</span>
            </div>
          ) : hasAdopted ? (
            <>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>{t("adoption.alreadyAdopted")}</span>
              </div>
              <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <XCircle className="mr-2 h-4 w-4" />
                    {t("adoption.remove")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("adoption.removeTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("adoption.removeDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setRemoveDialogOpen(false)}
                    >
                      {t("adoption.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRemoveAdoption}
                      disabled={removeMutation.isPending}
                    >
                      {removeMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("adoption.confirmRemove")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : canAdopt ? (
            <Dialog open={adoptDialogOpen} onOpenChange={setAdoptDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Heart className="mr-2 h-4 w-4" />
                  {t("adoption.adopt")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("adoption.adoptTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("adoption.adoptDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("adoption.notes")}
                    </label>
                    <Textarea
                      placeholder={t("adoption.notesPlaceholder")}
                      value={implementationNotes}
                      onChange={(e) => setImplementationNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAdoptDialogOpen(false)}
                  >
                    {t("adoption.cancel")}
                  </Button>
                  <Button
                    onClick={handleAdopt}
                    disabled={adoptMutation.isPending}
                  >
                    {adoptMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("adoption.confirmAdopt")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("adoption.loginToAdopt")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Source Organization Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {t("sourceOrg.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-medium">{orgName}</p>
            {practice.organization.organizationCode && (
              <Badge variant="outline">
                {practice.organization.organizationCode}
              </Badge>
            )}
            <p className="text-sm text-muted-foreground">
              {practice.organization.country}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Adopting Organizations */}
      {practice.adoptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              {t("adopters.title")} ({practice.adoptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {practice.adoptions.slice(0, 5).map((adoption) => {
                const adopterName =
                  locale === "fr"
                    ? adoption.organization.nameFr
                    : adoption.organization.nameEn;
                return (
                  <div
                    key={adoption.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{adopterName}</span>
                    {adoption.implementationStatus && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-xs flex-shrink-0"
                      >
                        {adoption.implementationStatus}
                      </Badge>
                    )}
                  </div>
                );
              })}
              {practice.adoptions.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  {t("adopters.andMore", {
                    count: practice.adoptions.length - 5,
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
