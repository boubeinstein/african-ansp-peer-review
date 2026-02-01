"use client";

/**
 * Expertise Selector Component
 *
 * Multi-select component for managing reviewer expertise areas
 * with proficiency levels and years of experience.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertCircle,
  ChevronDown,
  GripVertical,
  Star,
  Trash2,
} from "lucide-react";
import type { ExpertiseArea, ProficiencyLevel } from "@/types/prisma-enums";
import {
  getExpertiseAreasByCategory,
  PROFICIENCY_LEVEL_LABELS,
  EXPERTISE_AREA_ABBREV,
} from "@/lib/reviewer/labels";
import { QUALIFICATION_REQUIREMENTS } from "@/lib/reviewer/constants";

// =============================================================================
// TYPES
// =============================================================================

export interface ExpertiseItem {
  expertiseArea: ExpertiseArea;
  proficiencyLevel: ProficiencyLevel;
  yearsInArea?: number | null;
  isPrimary?: boolean;
}

interface ExpertiseSelectorProps {
  value: ExpertiseItem[];
  onChange: (expertise: ExpertiseItem[]) => void;
  maxItems?: number;
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ExpertiseSelector({
  value,
  onChange,
  maxItems = QUALIFICATION_REQUIREMENTS.MAX_EXPERTISE_AREAS,
  disabled = false,
  className,
}: ExpertiseSelectorProps) {
  const t = useTranslations("reviewer");
  const locale = useLocale() as "en" | "fr";
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const categories = getExpertiseAreasByCategory(locale);
  const selectedAreas = new Set(value.map((e) => e.expertiseArea));
  const proficiencyOptions = Object.entries(PROFICIENCY_LEVEL_LABELS).map(([key, label]) => ({
    value: key as ProficiencyLevel,
    label: label[locale],
  }));

  const canAddMore = value.length < maxItems;

  function toggleCategory(category: string) {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  }

  function handleAddExpertise(area: ExpertiseArea) {
    if (!canAddMore || disabled || selectedAreas.has(area)) return;

    const newExpertise: ExpertiseItem = {
      expertiseArea: area,
      proficiencyLevel: "COMPETENT",
      yearsInArea: null,
      isPrimary: value.length === 0, // First item is primary by default
    };

    onChange([...value, newExpertise]);
  }

  function handleRemoveExpertise(area: ExpertiseArea) {
    if (disabled) return;

    const newValue = value.filter((e) => e.expertiseArea !== area);

    // If we removed the primary, make the first item primary
    if (newValue.length > 0 && !newValue.some((e) => e.isPrimary)) {
      newValue[0].isPrimary = true;
    }

    onChange(newValue);
  }

  function handleUpdateExpertise(
    area: ExpertiseArea,
    updates: Partial<ExpertiseItem>
  ) {
    if (disabled) return;

    onChange(
      value.map((e) =>
        e.expertiseArea === area ? { ...e, ...updates } : e
      )
    );
  }

  function handleSetPrimary(area: ExpertiseArea) {
    if (disabled) return;

    onChange(
      value.map((e) => ({
        ...e,
        isPrimary: e.expertiseArea === area,
      }))
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selected Expertise */}
      {value.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>{t("expertise.selected")} ({value.length}/{maxItems})</span>
              {value.length >= QUALIFICATION_REQUIREMENTS.MIN_EXPERTISE_AREAS && (
                <Badge variant="secondary" className="text-green-600">
                  {t("expertise.requirementMet")}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {value.map((expertise) => (
              <div
                key={expertise.expertiseArea}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  expertise.isPrimary && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <Badge variant="secondary" className="font-mono">
                    {EXPERTISE_AREA_ABBREV[expertise.expertiseArea]}
                  </Badge>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Proficiency Level */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t("expertise.proficiency")}
                    </Label>
                    <Select
                      value={expertise.proficiencyLevel}
                      onValueChange={(val) =>
                        handleUpdateExpertise(expertise.expertiseArea, {
                          proficiencyLevel: val as ProficiencyLevel,
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8">
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

                  {/* Years in Area */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t("expertise.yearsExperience")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      className="h-8"
                      value={expertise.yearsInArea || ""}
                      onChange={(e) =>
                        handleUpdateExpertise(expertise.expertiseArea, {
                          yearsInArea: parseInt(e.target.value) || null,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>

                  {/* Primary Toggle */}
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      variant={expertise.isPrimary ? "default" : "outline"}
                      size="sm"
                      className="h-8"
                      onClick={() => handleSetPrimary(expertise.expertiseArea)}
                      disabled={disabled || expertise.isPrimary}
                    >
                      <Star
                        className={cn(
                          "h-3 w-3 mr-1",
                          expertise.isPrimary && "fill-current"
                        )}
                      />
                      {t("expertise.primary")}
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveExpertise(expertise.expertiseArea)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expertise Area Picker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {t("expertise.addExpertise")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!canAddMore && (
            <div className="flex items-center gap-2 text-yellow-600 text-sm mb-3">
              <AlertCircle className="h-4 w-4" />
              <span>{t("expertise.maxReached")}</span>
            </div>
          )}

          {categories.map((category) => (
            <Collapsible
              key={category.category}
              open={expandedCategories.includes(category.category)}
              onOpenChange={() => toggleCategory(category.category)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto"
                  type="button"
                >
                  <span className="font-medium text-sm">{category.category}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expandedCategories.includes(category.category) && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                  {category.areas.map((area) => {
                    const isSelected = selectedAreas.has(area.value);
                    return (
                      <div
                        key={area.value}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted/50",
                          (!canAddMore && !isSelected) && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => {
                          if (isSelected) {
                            handleRemoveExpertise(area.value);
                          } else {
                            handleAddExpertise(area.value);
                          }
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={disabled || (!canAddMore && !isSelected)}
                          onCheckedChange={() => {
                            if (isSelected) {
                              handleRemoveExpertise(area.value);
                            } else {
                              handleAddExpertise(area.value);
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {area.abbrev}
                          </Badge>
                          <span className="text-sm">{area.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Validation Message */}
      {value.length < QUALIFICATION_REQUIREMENTS.MIN_EXPERTISE_AREAS && (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>
            {t("expertise.minimumRequired", {
              min: QUALIFICATION_REQUIREMENTS.MIN_EXPERTISE_AREAS,
            })}
          </span>
        </div>
      )}
    </div>
  );
}

export default ExpertiseSelector;
