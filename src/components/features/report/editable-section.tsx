"use client";

/**
 * Editable Section Component
 *
 * Bilingual (EN/FR) text section with view and edit modes.
 * Used for Executive Summary, Recommendations, and Conclusion in reports.
 * Saves via trpc.report.updateSection.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface EditableSectionProps {
  reviewId: string;
  sectionKey: "executiveSummary" | "recommendations" | "conclusion";
  title: string;
  contentEn: string;
  contentFr: string;
  readOnly?: boolean;
  onSaved?: () => void;
}

export function EditableSection({
  reviewId,
  sectionKey,
  title,
  contentEn: initialEn,
  contentFr: initialFr,
  readOnly = false,
  onSaved,
}: EditableSectionProps) {
  const t = useTranslations("report");
  const [isEditing, setIsEditing] = useState(false);
  const [langTab, setLangTab] = useState<"en" | "fr">("en");
  const [contentEn, setContentEn] = useState(initialEn);
  const [contentFr, setContentFr] = useState(initialFr);

  const updateMutation = trpc.report.updateSection.useMutation({
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      setIsEditing(false);
      onSaved?.();
    },
    onError: (error) => {
      toast.error(error.message || t("saveError"));
    },
  });

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      reviewId,
      sectionKey,
      contentEn,
      contentFr,
    });
  }, [updateMutation, reviewId, sectionKey, contentEn, contentFr]);

  const handleCancel = useCallback(() => {
    setContentEn(initialEn);
    setContentFr(initialFr);
    setIsEditing(false);
  }, [initialEn, initialFr]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {!readOnly && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {t("actions.edit")}
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                {t("actions.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                {t("actions.save")}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={langTab}
          onValueChange={(v) => setLangTab(v as "en" | "fr")}
        >
          <TabsList className="mb-3">
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="fr">Français</TabsTrigger>
          </TabsList>
          <TabsContent value="en">
            {isEditing ? (
              <Textarea
                value={contentEn}
                onChange={(e) => setContentEn(e.target.value)}
                placeholder={t(`${sectionKey}PlaceholderEn`)}
                className="min-h-[200px] resize-y"
              />
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-muted-foreground min-h-[60px] p-3 bg-muted/30 rounded-md">
                {contentEn || (
                  <span className="italic opacity-60">
                    {t(`${sectionKey}PlaceholderEn`)}
                  </span>
                )}
              </div>
            )}
          </TabsContent>
          <TabsContent value="fr">
            {isEditing ? (
              <Textarea
                value={contentFr}
                onChange={(e) => setContentFr(e.target.value)}
                placeholder={t(`${sectionKey}PlaceholderFr`)}
                className="min-h-[200px] resize-y"
              />
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-muted-foreground min-h-[60px] p-3 bg-muted/30 rounded-md">
                {contentFr || (
                  <span className="italic opacity-60">
                    {t(`${sectionKey}PlaceholderFr`)}
                  </span>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
