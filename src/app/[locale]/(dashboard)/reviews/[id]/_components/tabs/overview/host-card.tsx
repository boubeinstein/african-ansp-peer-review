"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Mail, Phone } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

interface HostCardProps {
  organization: {
    id: string;
    code: string;
    nameEn: string;
    nameFr: string;
  };
  primaryContact?: {
    name: string;
    email: string;
    phone?: string;
  } | null;
}

export function HostCard({ organization, primaryContact }: HostCardProps) {
  const t = useTranslations("reviews.detail.overview.host");
  const locale = useLocale();
  const router = useRouter();

  const orgName = locale === "fr" ? organization.nameFr : organization.nameEn;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="font-medium">{orgName}</p>
          <p className="text-sm text-muted-foreground">{organization.code}</p>
        </div>

        {primaryContact && (
          <div className="pt-2 border-t space-y-1.5">
            <p className="text-xs text-muted-foreground">{t("primaryContact")}</p>
            <p className="text-sm font-medium">{primaryContact.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{primaryContact.email}</span>
            </div>
            {primaryContact.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{primaryContact.phone}</span>
              </div>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => router.push(`/${locale}/organizations/${organization.id}`)}
        >
          {t("viewProfile")}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
