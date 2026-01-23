"use client";

/**
 * Auto-Translate Button Component
 *
 * Provides a button to auto-translate content between English and French.
 * Shows a preview dialog before applying the translation.
 * Indicates when content was auto-translated.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Languages, Loader2, Check, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface AutoTranslateButtonProps {
  /** The source text to translate */
  sourceText: string;
  /** The current value of the target field (for preview/comparison) */
  targetValue?: string;
  /** Target language for translation */
  targetLanguage: "en" | "fr";
  /** Callback when translation is applied */
  onTranslate: (translatedText: string) => void;
  /** Optional field name for context */
  fieldName?: string;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "link";
  /** Button size */
  size?: "default" | "sm" | "icon";
  /** Additional class names */
  className?: string;
  /** Disable the button */
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AutoTranslateButton({
  sourceText,
  targetValue,
  targetLanguage,
  onTranslate,
  fieldName,
  variant = "outline",
  size = "sm",
  className,
  disabled = false,
}: AutoTranslateButtonProps) {
  const t = useTranslations("translation");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [isEdited, setIsEdited] = useState(false);

  // Check if translation service is available
  const { data: status } = trpc.translation.getStatus.useQuery();

  // Translation mutation
  const translateMutation = trpc.translation.translate.useMutation({
    onSuccess: (data) => {
      setPreviewText(data.translatedText);
      setIsEdited(false);
      setIsPreviewOpen(true);
    },
  });

  const handleTranslate = () => {
    if (!sourceText?.trim()) return;
    translateMutation.mutate({
      text: sourceText,
      targetLanguage,
    });
  };

  const handleApply = () => {
    onTranslate(previewText);
    setIsPreviewOpen(false);
  };

  const handlePreviewChange = (value: string) => {
    setPreviewText(value);
    setIsEdited(true);
  };

  const isLoading = translateMutation.isPending;
  const isDisabled = disabled || !sourceText?.trim() || !status?.available;
  const targetLabel = targetLanguage === "fr" ? "French" : "English";

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={variant}
              size={size}
              onClick={handleTranslate}
              disabled={isDisabled}
              className={cn("gap-1", className)}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Languages className="h-4 w-4" />
              )}
              {size !== "icon" && (
                <span>
                  {t("translateTo", { language: targetLabel })}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {!status?.available
              ? t("serviceUnavailable")
              : !sourceText?.trim()
                ? t("enterSourceText")
                : t("clickToTranslate", { language: targetLabel })}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t("translationPreview")}
            </DialogTitle>
            <DialogDescription>
              {t("reviewTranslation", { language: targetLabel })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Source Text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  {t("sourceText")} ({targetLanguage === "fr" ? "English" : "French"})
                </label>
                {fieldName && (
                  <Badge variant="outline" className="text-xs">
                    {fieldName}
                  </Badge>
                )}
              </div>
              <div className="p-3 bg-muted rounded-md text-sm">
                {sourceText}
              </div>
            </div>

            {/* Translated Text (editable) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  {t("translatedText")} ({targetLabel})
                </label>
                <div className="flex items-center gap-2">
                  {translateMutation.data?.cached && (
                    <Badge variant="secondary" className="text-xs">
                      {t("cached")}
                    </Badge>
                  )}
                  {translateMutation.data?.provider && (
                    <Badge variant="outline" className="text-xs">
                      {translateMutation.data.provider}
                    </Badge>
                  )}
                  {isEdited && (
                    <Badge className="text-xs bg-blue-100 text-blue-800">
                      {t("edited")}
                    </Badge>
                  )}
                </div>
              </div>
              <Textarea
                value={previewText}
                onChange={(e) => handlePreviewChange(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("editBeforeApplying")}
              </p>
            </div>

            {/* Warning if target already has content */}
            {targetValue && targetValue !== previewText && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("existingContentWarning")}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleApply} className="gap-2">
              <Check className="h-4 w-4" />
              {t("applyTranslation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// AUTO-TRANSLATED INDICATOR
// =============================================================================

interface AutoTranslatedIndicatorProps {
  /** Show the indicator */
  show: boolean;
  /** Additional class names */
  className?: string;
}

export function AutoTranslatedIndicator({
  show,
  className,
}: AutoTranslatedIndicatorProps) {
  const t = useTranslations("translation");

  if (!show) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn(
              "gap-1 text-xs bg-purple-100 text-purple-800 border-purple-200",
              className
            )}
          >
            <Sparkles className="h-3 w-3" />
            {t("autoTranslated")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {t("autoTranslatedTooltip")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// BILINGUAL FIELD GROUP
// =============================================================================

interface BilingualFieldGroupProps {
  /** English field value */
  englishValue: string;
  /** French field value */
  frenchValue: string;
  /** Callback when English value changes */
  onEnglishChange: (value: string) => void;
  /** Callback when French value changes */
  onFrenchChange: (value: string) => void;
  /** Field name for labels */
  fieldName: string;
  /** English field label */
  englishLabel?: string;
  /** French field label */
  frenchLabel?: string;
  /** Whether to use textarea instead of input */
  multiline?: boolean;
  /** Number of rows for textarea */
  rows?: number;
  /** Show auto-translate buttons */
  showTranslate?: boolean;
  /** Track if French was auto-translated */
  frenchAutoTranslated?: boolean;
  /** Track if English was auto-translated */
  englishAutoTranslated?: boolean;
  /** Callback when auto-translate status changes */
  onAutoTranslateChange?: (field: "en" | "fr", autoTranslated: boolean) => void;
  /** Error messages */
  errors?: {
    english?: string;
    french?: string;
  };
  /** Required fields */
  required?: {
    english?: boolean;
    french?: boolean;
  };
}

export function BilingualFieldGroup({
  englishValue,
  frenchValue,
  onEnglishChange,
  onFrenchChange,
  fieldName,
  englishLabel,
  frenchLabel,
  multiline = false,
  rows = 3,
  showTranslate = true,
  frenchAutoTranslated = false,
  englishAutoTranslated = false,
  onAutoTranslateChange,
  errors,
  required,
}: BilingualFieldGroupProps) {
  const handleEnglishTranslate = (text: string) => {
    onEnglishChange(text);
    onAutoTranslateChange?.("en", true);
  };

  const handleFrenchTranslate = (text: string) => {
    onFrenchChange(text);
    onAutoTranslateChange?.("fr", true);
  };

  const handleEnglishManualChange = (value: string) => {
    onEnglishChange(value);
    if (englishAutoTranslated) {
      onAutoTranslateChange?.("en", false);
    }
  };

  const handleFrenchManualChange = (value: string) => {
    onFrenchChange(value);
    if (frenchAutoTranslated) {
      onAutoTranslateChange?.("fr", false);
    }
  };

  return (
    <div className="space-y-4">
      {/* English Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            {englishLabel || `${fieldName} (English)`}
            {required?.english && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2">
            {englishAutoTranslated && <AutoTranslatedIndicator show />}
            {showTranslate && frenchValue && (
              <AutoTranslateButton
                sourceText={frenchValue}
                targetValue={englishValue}
                targetLanguage="en"
                onTranslate={handleEnglishTranslate}
                fieldName={fieldName}
                size="sm"
              />
            )}
          </div>
        </div>
        {multiline ? (
          <Textarea
            value={englishValue}
            onChange={(e) => handleEnglishManualChange(e.target.value)}
            rows={rows}
            className={errors?.english ? "border-red-500" : ""}
          />
        ) : (
          <input
            type="text"
            value={englishValue}
            onChange={(e) => handleEnglishManualChange(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              errors?.english && "border-red-500"
            )}
          />
        )}
        {errors?.english && (
          <p className="text-sm text-red-500">{errors.english}</p>
        )}
      </div>

      {/* French Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            {frenchLabel || `${fieldName} (Français)`}
            {required?.french && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2">
            {frenchAutoTranslated && <AutoTranslatedIndicator show />}
            {showTranslate && englishValue && (
              <AutoTranslateButton
                sourceText={englishValue}
                targetValue={frenchValue}
                targetLanguage="fr"
                onTranslate={handleFrenchTranslate}
                fieldName={fieldName}
                size="sm"
              />
            )}
          </div>
        </div>
        {multiline ? (
          <Textarea
            value={frenchValue}
            onChange={(e) => handleFrenchManualChange(e.target.value)}
            rows={rows}
            className={errors?.french ? "border-red-500" : ""}
          />
        ) : (
          <input
            type="text"
            value={frenchValue}
            onChange={(e) => handleFrenchManualChange(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              errors?.french && "border-red-500"
            )}
          />
        )}
        {errors?.french && (
          <p className="text-sm text-red-500">{errors.french}</p>
        )}
      </div>
    </div>
  );
}

export default AutoTranslateButton;
