"use client";

/**
 * Language Proficiency Manager Component
 *
 * Manages reviewer language proficiencies with required
 * language validation (EN/FR for African programme).
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertCircle,
  Check,
  Languages,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Language, LanguageProficiency } from "@prisma/client";
import {
  LANGUAGE_LABELS,
  LANGUAGE_PROFICIENCY_LABELS,
  getSelectOptions,
  canConductReviewInLanguage,
} from "@/lib/reviewer/labels";

// =============================================================================
// TYPES
// =============================================================================

export interface LanguageItem {
  language: Language;
  proficiencyLevel: LanguageProficiency;
  isNative?: boolean;
  canConduct?: boolean;
}

interface LanguageProficiencyManagerProps {
  value: LanguageItem[];
  onChange: (proficiencies: LanguageItem[]) => void;
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LanguageProficiencyManager({
  value,
  onChange,
  disabled = false,
  className,
}: LanguageProficiencyManagerProps) {
  const t = useTranslations("reviewer");
  const locale = useLocale() as "en" | "fr";
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLanguage, setNewLanguage] = useState<Language | "">("");
  const [newProficiency, setNewProficiency] = useState<LanguageProficiency>("INTERMEDIATE");
  const [newIsNative, setNewIsNative] = useState(false);

  const languageOptions = getSelectOptions(LANGUAGE_LABELS, locale);
  const proficiencyOptions = getSelectOptions(LANGUAGE_PROFICIENCY_LABELS, locale);
  const selectedLanguages = new Set(value.map((l) => l.language));

  const hasEnglish = value.some((l) => l.language === "EN");
  const hasFrench = value.some((l) => l.language === "FR");
  const hasRequiredLanguages = hasEnglish && hasFrench;

  const availableLanguages = languageOptions.filter(
    (opt) => !selectedLanguages.has(opt.value)
  );

  function handleAddLanguage() {
    if (!newLanguage || disabled) return;

    const canConduct = canConductReviewInLanguage(newProficiency) || newIsNative;

    const newItem: LanguageItem = {
      language: newLanguage,
      proficiencyLevel: newProficiency,
      isNative: newIsNative,
      canConduct,
    };

    onChange([...value, newItem]);
    resetAddForm();
    setIsAddDialogOpen(false);
  }

  function handleRemoveLanguage(language: Language) {
    if (disabled) return;
    onChange(value.filter((l) => l.language !== language));
  }

  function handleUpdateLanguage(language: Language, updates: Partial<LanguageItem>) {
    if (disabled) return;

    onChange(
      value.map((l) => {
        if (l.language !== language) return l;

        const updated = { ...l, ...updates };

        // Auto-update canConduct based on proficiency
        if (updates.proficiencyLevel !== undefined || updates.isNative !== undefined) {
          updated.canConduct =
            canConductReviewInLanguage(updated.proficiencyLevel) || updated.isNative;
        }

        return updated;
      })
    );
  }

  function resetAddForm() {
    setNewLanguage("");
    setNewProficiency("INTERMEDIATE");
    setNewIsNative(false);
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Required Languages Status */}
      <Card className={cn(!hasRequiredLanguages && "border-yellow-300")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              {t("language.title")}
            </span>
            <Badge
              variant={hasRequiredLanguages ? "default" : "destructive"}
              className={cn(hasRequiredLanguages && "bg-green-600")}
            >
              {hasRequiredLanguages ? t("language.requirementMet") : t("language.required")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Required Languages Indicator */}
          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {hasEnglish ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )}
              <span className={cn("text-sm", !hasEnglish && "text-red-600")}>
                {LANGUAGE_LABELS.EN[locale]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasFrench ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )}
              <span className={cn("text-sm", !hasFrench && "text-red-600")}>
                {LANGUAGE_LABELS.FR[locale]}
              </span>
            </div>
          </div>

          {/* Language List */}
          {value.length > 0 ? (
            <div className="space-y-3">
              {value.map((lang) => (
                <div
                  key={lang.language}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {LANGUAGE_LABELS[lang.language][locale]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {LANGUAGE_LABELS[lang.language].native}
                      </span>
                    </div>

                    {lang.isNative && (
                      <Badge variant="secondary" className="text-xs">
                        {t("language.native")}
                      </Badge>
                    )}

                    {lang.canConduct && (
                      <Badge
                        variant="outline"
                        className="text-xs text-green-600 border-green-600"
                      >
                        {t("language.canConduct")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Proficiency Selector */}
                    <Select
                      value={lang.proficiencyLevel}
                      onValueChange={(val) =>
                        handleUpdateLanguage(lang.language, {
                          proficiencyLevel: val as LanguageProficiency,
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {proficiencyOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Native Toggle */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={lang.isNative}
                        onCheckedChange={(checked) =>
                          handleUpdateLanguage(lang.language, { isNative: checked })
                        }
                        disabled={disabled}
                      />
                      <Label className="text-xs text-muted-foreground">
                        {t("language.native")}
                      </Label>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveLanguage(lang.language)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              {t("language.noData")}
            </p>
          )}

          {/* Add Language Button */}
          {availableLanguages.length > 0 && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4"
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("language.add")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("language.addTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("language.addDescription")}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Language Select */}
                  <div className="space-y-2">
                    <Label>{t("language.selectLanguage")}</Label>
                    <Select
                      value={newLanguage}
                      onValueChange={(val) => setNewLanguage(val as Language)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("language.selectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanguages.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Proficiency Select */}
                  <div className="space-y-2">
                    <Label>{t("language.level")}</Label>
                    <Select
                      value={newProficiency}
                      onValueChange={(val) => setNewProficiency(val as LanguageProficiency)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {proficiencyOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Native Toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newIsNative}
                      onCheckedChange={setNewIsNative}
                    />
                    <Label>{t("language.isNative")}</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetAddForm();
                      setIsAddDialogOpen(false);
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddLanguage}
                    disabled={!newLanguage}
                  >
                    {t("language.add")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Validation Warning */}
      {!hasRequiredLanguages && (
        <div className="flex items-center gap-2 text-yellow-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{t("language.requiredMissing")}</span>
        </div>
      )}
    </div>
  );
}

export default LanguageProficiencyManager;
