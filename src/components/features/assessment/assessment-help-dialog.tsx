"use client";

/**
 * Assessment Help & Shortcuts Dialog
 *
 * Enterprise-grade help dialog with keyboard shortcuts, response guide,
 * navigation tips, and FAQ for the assessment workspace.
 */

import { useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Keyboard,
  BookOpen,
  Navigation,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Command,
  Save,
  X,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionnaireType?: "ANS_USOAP_CMA" | "SMS_CANSO_SOE";
}

interface ShortcutRowProps {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
}

function ShortcutRow({ keys, description, icon }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm">{description}</span>
      </div>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            {index > 0 && <span className="text-muted-foreground mx-1">/</span>}
            <kbd className="pointer-events-none inline-flex h-6 min-w-6 select-none items-center justify-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

interface MaturityLevelRowProps {
  level: string;
  name: string;
  description: string;
  color: string;
}

function MaturityLevelRow({ level, name, description, color }: MaturityLevelRowProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Badge className={cn("min-w-8 justify-center", color)}>{level}</Badge>
      <div className="flex-1">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function AssessmentHelpDialog({
  open,
  onOpenChange,
  questionnaireType,
}: AssessmentHelpDialogProps) {
  const t = useTranslations("assessment.help");

  // Global keyboard shortcut to open help
  const handleGlobalKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger if typing in input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "?" || event.key === "F1") {
        event.preventDefault();
        onOpenChange(true);
      }
    },
    [onOpenChange]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "Cmd" : "Ctrl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="shortcuts" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="shortcuts" className="text-xs sm:text-sm">
              <Keyboard className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t("tabs.shortcuts")}</span>
              <span className="sm:hidden">Keys</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="text-xs sm:text-sm">
              <BookOpen className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t("tabs.guide")}</span>
              <span className="sm:hidden">Guide</span>
            </TabsTrigger>
            <TabsTrigger value="navigation" className="text-xs sm:text-sm">
              <Navigation className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t("tabs.navigation")}</span>
              <span className="sm:hidden">Nav</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="text-xs sm:text-sm">
              <HelpCircle className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t("tabs.faq")}</span>
              <span className="sm:hidden">FAQ</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto mt-4">
            {/* Keyboard Shortcuts Tab */}
            <TabsContent value="shortcuts" className="m-0 space-y-4">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  {t("shortcuts.navigation")}
                </h4>
                <div className="rounded-lg border p-3 space-y-1">
                  <ShortcutRow
                    keys={["↑", "↓"]}
                    description={t("shortcuts.navigateQuestions")}
                    icon={<ArrowUp className="h-4 w-4 text-muted-foreground" />}
                  />
                  <ShortcutRow
                    keys={["←", "→"]}
                    description={t("shortcuts.navigateBetween")}
                    icon={<ArrowDown className="h-4 w-4 text-muted-foreground" />}
                  />
                  <ShortcutRow
                    keys={["Enter"]}
                    description={t("shortcuts.openQuestion")}
                    icon={<CornerDownLeft className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t("shortcuts.responses")}
                </h4>
                <div className="rounded-lg border p-3 space-y-1">
                  {questionnaireType === "ANS_USOAP_CMA" ? (
                    <>
                      <ShortcutRow
                        keys={["1"]}
                        description={t("shortcuts.markSatisfactory")}
                        icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                      />
                      <ShortcutRow
                        keys={["2"]}
                        description={t("shortcuts.markNotSatisfactory")}
                        icon={<XCircle className="h-4 w-4 text-red-500" />}
                      />
                      <ShortcutRow
                        keys={["3"]}
                        description={t("shortcuts.markNotApplicable")}
                        icon={<MinusCircle className="h-4 w-4 text-gray-500" />}
                      />
                      <ShortcutRow
                        keys={["4"]}
                        description={t("shortcuts.markNotReviewed")}
                        icon={<HelpCircle className="h-4 w-4 text-amber-500" />}
                      />
                    </>
                  ) : (
                    <>
                      <ShortcutRow
                        keys={["A", "B", "C", "D", "E"]}
                        description={t("shortcuts.selectMaturity")}
                        icon={<Gauge className="h-4 w-4 text-primary" />}
                      />
                    </>
                  )}
                  <ShortcutRow
                    keys={["F"]}
                    description={t("shortcuts.toggleFlag")}
                    icon={<span className="text-amber-500">🚩</span>}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Command className="h-4 w-4 text-primary" />
                  {t("shortcuts.actions")}
                </h4>
                <div className="rounded-lg border p-3 space-y-1">
                  <ShortcutRow
                    keys={[`${modKey}+S`]}
                    description={t("shortcuts.save")}
                    icon={<Save className="h-4 w-4 text-muted-foreground" />}
                  />
                  <ShortcutRow
                    keys={[`${modKey}+Enter`]}
                    description={t("shortcuts.saveAndNext")}
                    icon={<CornerDownLeft className="h-4 w-4 text-muted-foreground" />}
                  />
                  <ShortcutRow
                    keys={["Esc"]}
                    description={t("shortcuts.closeDialog")}
                    icon={<X className="h-4 w-4 text-muted-foreground" />}
                  />
                  <ShortcutRow
                    keys={["?", "F1"]}
                    description={t("shortcuts.showHelp")}
                    icon={<HelpCircle className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Response Guide Tab */}
            <TabsContent value="guide" className="m-0 space-y-6">
              {questionnaireType === "ANS_USOAP_CMA" ? (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Badge>ANS</Badge>
                    {t("guide.ansTitle")}
                  </h4>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-400">
                            {t("guide.satisfactory")}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                            {t("guide.satisfactoryDesc")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-950/20">
                      <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-400">
                            {t("guide.notSatisfactory")}
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-500 mt-1">
                            {t("guide.notSatisfactoryDesc")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-950/20">
                      <div className="flex items-start gap-3">
                        <MinusCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-400">
                            {t("guide.notApplicable")}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-500 mt-1">
                            {t("guide.notApplicableDesc")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/20">
                      <div className="flex items-start gap-3">
                        <HelpCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-400">
                            {t("guide.notReviewed")}
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                            {t("guide.notReviewedDesc")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Badge variant="secondary">SMS</Badge>
                    {t("guide.smsTitle")}
                  </h4>
                  <div className="rounded-lg border divide-y">
                    <MaturityLevelRow
                      level="A"
                      name={t("guide.levelA")}
                      description={t("guide.levelADesc")}
                      color="bg-red-500 hover:bg-red-600"
                    />
                    <MaturityLevelRow
                      level="B"
                      name={t("guide.levelB")}
                      description={t("guide.levelBDesc")}
                      color="bg-orange-500 hover:bg-orange-600"
                    />
                    <MaturityLevelRow
                      level="C"
                      name={t("guide.levelC")}
                      description={t("guide.levelCDesc")}
                      color="bg-yellow-500 hover:bg-yellow-600 text-black"
                    />
                    <MaturityLevelRow
                      level="D"
                      name={t("guide.levelD")}
                      description={t("guide.levelDDesc")}
                      color="bg-lime-500 hover:bg-lime-600 text-black"
                    />
                    <MaturityLevelRow
                      level="E"
                      name={t("guide.levelE")}
                      description={t("guide.levelEDesc")}
                      color="bg-green-500 hover:bg-green-600"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
                <h5 className="font-medium text-blue-800 dark:text-blue-400 mb-2">
                  {t("guide.scoringNote")}
                </h5>
                <p className="text-sm text-blue-700 dark:text-blue-500">
                  {questionnaireType === "ANS_USOAP_CMA"
                    ? t("guide.ansScoring")
                    : t("guide.smsScoring")}
                </p>
              </div>
            </TabsContent>

            {/* Navigation Tips Tab */}
            <TabsContent value="navigation" className="m-0 space-y-4">
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("navigation.sidebarTitle")}</h5>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {t("navigation.sidebarTip1")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {t("navigation.sidebarTip2")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {t("navigation.sidebarTip3")}
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("navigation.searchTitle")}</h5>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {t("navigation.searchTip1")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {t("navigation.searchTip2")}
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("navigation.filtersTitle")}</h5>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {t("navigation.filtersTip1")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {t("navigation.filtersTip2")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {t("navigation.filtersTip3")}
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("navigation.progressTitle")}</h5>
                  <p className="text-sm text-muted-foreground">
                    {t("navigation.progressTip")}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="m-0 space-y-4">
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("faq.saveQuestion")}</h5>
                  <p className="text-sm text-muted-foreground">{t("faq.saveAnswer")}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("faq.editQuestion")}</h5>
                  <p className="text-sm text-muted-foreground">{t("faq.editAnswer")}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("faq.scoreQuestion")}</h5>
                  <p className="text-sm text-muted-foreground">{t("faq.scoreAnswer")}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("faq.accessQuestion")}</h5>
                  <p className="text-sm text-muted-foreground">{t("faq.accessAnswer")}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("faq.evidenceQuestion")}</h5>
                  <p className="text-sm text-muted-foreground">{t("faq.evidenceAnswer")}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <h5 className="font-medium mb-2">{t("faq.submitQuestion")}</h5>
                  <p className="text-sm text-muted-foreground">{t("faq.submitAnswer")}</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <Separator className="my-4" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("footer.pressEscape")}</span>
          <span>{t("footer.version")}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
