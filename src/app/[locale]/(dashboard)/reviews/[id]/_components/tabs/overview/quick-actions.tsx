"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  CheckSquare,
  Upload,
  AlertTriangle
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

interface QuickActionsProps {
  reviewId: string;
  canEdit: boolean;
}

export function QuickActions({ reviewId, canEdit }: QuickActionsProps) {
  const t = useTranslations("reviews.detail.overview.quickActions");
  const locale = useLocale();
  const router = useRouter();

  const actions = [
    {
      icon: AlertTriangle,
      label: t("addFinding"),
      href: `/${locale}/reviews/${reviewId}?tab=findings&action=new`,
      variant: "outline" as const,
    },
    {
      icon: Upload,
      label: t("uploadDocument"),
      href: `/${locale}/reviews/${reviewId}?tab=documents&action=upload`,
      variant: "outline" as const,
    },
    {
      icon: MessageSquare,
      label: t("newDiscussion"),
      href: `/${locale}/reviews/${reviewId}?tab=workspace&action=discussion`,
      variant: "outline" as const,
    },
    {
      icon: CheckSquare,
      label: t("createTask"),
      href: `/${locale}/reviews/${reviewId}?tab=workspace&action=task`,
      variant: "outline" as const,
    },
  ];

  if (!canEdit) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              size="sm"
              className="justify-start h-auto py-2"
              onClick={() => router.push(action.href)}
            >
              <action.icon className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
