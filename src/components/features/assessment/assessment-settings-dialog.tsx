"use client";

/**
 * Assessment Settings Dialog
 *
 * Enterprise-grade settings panel for the assessment workspace.
 * Provides display, auto-save, notification, and accessibility settings.
 */

import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Monitor,
  Save,
  Bell,
  Accessibility,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAssessmentSettings,
  type AssessmentSettings,
} from "@/stores/assessment-settings-store";

// =============================================================================
// TYPES
// =============================================================================

interface AssessmentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

interface SettingSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

// =============================================================================
// COMPONENTS
// =============================================================================

function SettingRow({ label, description, children, htmlFor }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5 flex-1">
        <Label
          htmlFor={htmlFor}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingSection({ icon, title, children }: SettingSectionProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-2">
        <span className="text-primary">{icon}</span>
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <div className="rounded-lg border bg-card p-1">{children}</div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AssessmentSettingsDialog({
  open,
  onOpenChange,
}: AssessmentSettingsDialogProps) {
  const t = useTranslations("assessment.settings");
  const tCommon = useTranslations("common");

  // Get all settings from the store
  const settings = useAssessmentSettings();
  const {
    questionTextSize,
    showQuestionNumbers,
    showIcaoReferences,
    showGuidanceByDefault,
    sidebarPosition,
    compactMode,
    themeOverride,
    autoSaveEnabled,
    autoSaveInterval,
    saveIndicatorDuration,
    confirmBeforeLeaving,
    showSaveToast,
    showShortcutHints,
    showProgressMilestones,
    reduceMotion,
    highContrast,
    screenReaderAnnouncements,
    enhancedFocusIndicators,
    updateSetting,
    resetToDefaults,
  } = settings;

  // Helper to create toggle handler
  const handleToggle = (key: keyof AssessmentSettings) => (checked: boolean) => {
    updateSetting(key, checked);
  };

  // Helper to create select handler
  const handleSelect =
    <K extends keyof AssessmentSettings>(key: K) =>
    (value: string) => {
      // Handle numeric values
      if (
        key === "autoSaveInterval" ||
        key === "saveIndicatorDuration"
      ) {
        updateSetting(key, parseInt(value, 10) as AssessmentSettings[K]);
      } else {
        updateSetting(key, value as AssessmentSettings[K]);
      }
    };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("title")}
          </SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Display Settings */}
          <SettingSection
            icon={<Monitor className="h-4 w-4" />}
            title={t("sections.display")}
          >
            {/* Question Text Size */}
            <SettingRow label={t("display.textSize")}>
              <Select
                value={questionTextSize}
                onValueChange={handleSelect("questionTextSize")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{t("display.textSizeSmall")}</SelectItem>
                  <SelectItem value="medium">{t("display.textSizeMedium")}</SelectItem>
                  <SelectItem value="large">{t("display.textSizeLarge")}</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            {/* Show Question Numbers */}
            <SettingRow
              label={t("display.showQuestionNumbers")}
              htmlFor="showQuestionNumbers"
            >
              <Switch
                id="showQuestionNumbers"
                checked={showQuestionNumbers}
                onCheckedChange={handleToggle("showQuestionNumbers")}
              />
            </SettingRow>

            <Separator />

            {/* Show ICAO References */}
            <SettingRow
              label={t("display.showIcaoReferences")}
              htmlFor="showIcaoReferences"
            >
              <Switch
                id="showIcaoReferences"
                checked={showIcaoReferences}
                onCheckedChange={handleToggle("showIcaoReferences")}
              />
            </SettingRow>

            <Separator />

            {/* Show Guidance by Default */}
            <SettingRow
              label={t("display.showGuidanceByDefault")}
              htmlFor="showGuidanceByDefault"
            >
              <Switch
                id="showGuidanceByDefault"
                checked={showGuidanceByDefault}
                onCheckedChange={handleToggle("showGuidanceByDefault")}
              />
            </SettingRow>

            <Separator />

            {/* Sidebar Position */}
            <SettingRow label={t("display.sidebarPosition")}>
              <Select
                value={sidebarPosition}
                onValueChange={handleSelect("sidebarPosition")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">
                    <div className="flex items-center gap-2">
                      <PanelLeft className="h-4 w-4" />
                      {t("display.sidebarLeft")}
                    </div>
                  </SelectItem>
                  <SelectItem value="right">
                    <div className="flex items-center gap-2">
                      <PanelRight className="h-4 w-4" />
                      {t("display.sidebarRight")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            {/* Compact Mode */}
            <SettingRow label={t("display.compactMode")} htmlFor="compactMode">
              <Switch
                id="compactMode"
                checked={compactMode}
                onCheckedChange={handleToggle("compactMode")}
              />
            </SettingRow>

            <Separator />

            {/* Theme Override */}
            <SettingRow label={t("display.theme")}>
              <Select
                value={themeOverride}
                onValueChange={handleSelect("themeOverride")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-4 w-4" />
                      {tCommon("theme.system")}
                    </div>
                  </SelectItem>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      {tCommon("theme.light")}
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      {tCommon("theme.dark")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </SettingSection>

          {/* Auto-save Settings */}
          <SettingSection
            icon={<Save className="h-4 w-4" />}
            title={t("sections.autoSave")}
          >
            {/* Enable Auto-save */}
            <SettingRow label={t("autoSave.enabled")} htmlFor="autoSaveEnabled">
              <Switch
                id="autoSaveEnabled"
                checked={autoSaveEnabled}
                onCheckedChange={handleToggle("autoSaveEnabled")}
              />
            </SettingRow>

            <Separator />

            {/* Auto-save Interval */}
            <SettingRow label={t("autoSave.interval")}>
              <Select
                value={String(autoSaveInterval)}
                onValueChange={handleSelect("autoSaveInterval")}
                disabled={!autoSaveEnabled}
              >
                <SelectTrigger className={cn("w-32", !autoSaveEnabled && "opacity-50")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">
                    {t("autoSave.intervalSeconds", { seconds: 10 })}
                  </SelectItem>
                  <SelectItem value="30">
                    {t("autoSave.intervalSeconds", { seconds: 30 })}
                  </SelectItem>
                  <SelectItem value="60">
                    {t("autoSave.intervalSeconds", { seconds: 60 })}
                  </SelectItem>
                  <SelectItem value="120">
                    {t("autoSave.intervalSeconds", { seconds: 120 })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            {/* Save Indicator Duration */}
            <SettingRow label={t("autoSave.indicatorDuration")}>
              <Select
                value={String(saveIndicatorDuration)}
                onValueChange={handleSelect("saveIndicatorDuration")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">
                    {t("autoSave.intervalSeconds", { seconds: 2 })}
                  </SelectItem>
                  <SelectItem value="5">
                    {t("autoSave.intervalSeconds", { seconds: 5 })}
                  </SelectItem>
                  <SelectItem value="0">{t("autoSave.alwaysVisible")}</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            {/* Confirm Before Leaving */}
            <SettingRow
              label={t("autoSave.confirmLeaving")}
              htmlFor="confirmBeforeLeaving"
            >
              <Switch
                id="confirmBeforeLeaving"
                checked={confirmBeforeLeaving}
                onCheckedChange={handleToggle("confirmBeforeLeaving")}
              />
            </SettingRow>
          </SettingSection>

          {/* Notification Preferences */}
          <SettingSection
            icon={<Bell className="h-4 w-4" />}
            title={t("sections.notifications")}
          >
            {/* Show Save Toast */}
            <SettingRow label={t("notifications.showSaveToast")} htmlFor="showSaveToast">
              <Switch
                id="showSaveToast"
                checked={showSaveToast}
                onCheckedChange={handleToggle("showSaveToast")}
              />
            </SettingRow>

            <Separator />

            {/* Show Shortcut Hints */}
            <SettingRow
              label={t("notifications.showShortcutHints")}
              htmlFor="showShortcutHints"
            >
              <Switch
                id="showShortcutHints"
                checked={showShortcutHints}
                onCheckedChange={handleToggle("showShortcutHints")}
              />
            </SettingRow>

            <Separator />

            {/* Show Progress Milestones */}
            <SettingRow
              label={t("notifications.showProgressMilestones")}
              description={t("notifications.progressMilestonesDesc")}
              htmlFor="showProgressMilestones"
            >
              <Switch
                id="showProgressMilestones"
                checked={showProgressMilestones}
                onCheckedChange={handleToggle("showProgressMilestones")}
              />
            </SettingRow>
          </SettingSection>

          {/* Accessibility Settings */}
          <SettingSection
            icon={<Accessibility className="h-4 w-4" />}
            title={t("sections.accessibility")}
          >
            {/* Reduce Motion */}
            <SettingRow label={t("accessibility.reduceMotion")} htmlFor="reduceMotion">
              <Switch
                id="reduceMotion"
                checked={reduceMotion}
                onCheckedChange={handleToggle("reduceMotion")}
              />
            </SettingRow>

            <Separator />

            {/* High Contrast */}
            <SettingRow label={t("accessibility.highContrast")} htmlFor="highContrast">
              <Switch
                id="highContrast"
                checked={highContrast}
                onCheckedChange={handleToggle("highContrast")}
              />
            </SettingRow>

            <Separator />

            {/* Screen Reader Announcements */}
            <SettingRow
              label={t("accessibility.screenReader")}
              htmlFor="screenReaderAnnouncements"
            >
              <Switch
                id="screenReaderAnnouncements"
                checked={screenReaderAnnouncements}
                onCheckedChange={handleToggle("screenReaderAnnouncements")}
              />
            </SettingRow>

            <Separator />

            {/* Enhanced Focus Indicators */}
            <SettingRow
              label={t("accessibility.focusIndicators")}
              htmlFor="enhancedFocusIndicators"
            >
              <Switch
                id="enhancedFocusIndicators"
                checked={enhancedFocusIndicators}
                onCheckedChange={handleToggle("enhancedFocusIndicators")}
              />
            </SettingRow>
          </SettingSection>
        </div>

        <SheetFooter className="border-t pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("resetDefaults")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("resetConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("resetConfirmDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={resetToDefaults}>
                  {t("resetDefaults")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AssessmentSettingsDialog;
