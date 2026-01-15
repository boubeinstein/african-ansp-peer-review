"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Lock,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CommentsSectionProps {
  assessorNotes: string;
  internalNotes: string;
  onAssessorNotesChange: (value: string) => void;
  onInternalNotesChange: (value: string) => void;
  disabled?: boolean;
  isReviewMode?: boolean;
}

export function CommentsSection({
  assessorNotes,
  internalNotes,
  onAssessorNotesChange,
  onInternalNotesChange,
  disabled,
  isReviewMode = false,
}: CommentsSectionProps) {
  const t = useTranslations("workspace.comments");
  const [isAssessorOpen, setIsAssessorOpen] = useState(true);
  const [isInternalOpen, setIsInternalOpen] = useState(!!internalNotes);

  return (
    <div className="space-y-4">
      {/* Assessor Notes - Visible to reviewers */}
      <Collapsible open={isAssessorOpen} onOpenChange={setIsAssessorOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="font-medium">{t("assessorNotes")}</span>
              {assessorNotes && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {t("hasContent")}
                </span>
              )}
            </div>
            {isAssessorOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pb-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="assessor-notes" className="text-sm text-muted-foreground">
                    {t("assessorNotesDescription")}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">{t("assessorNotesTooltip")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  id="assessor-notes"
                  value={assessorNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onAssessorNotesChange(e.target.value)}
                  placeholder={t("assessorNotesPlaceholder")}
                  disabled={disabled || isReviewMode}
                  className={cn(
                    "min-h-[100px] resize-y",
                    isReviewMode && "bg-muted"
                  )}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {assessorNotes.length > 0 && (
                      <>{assessorNotes.length} {t("characters")}</>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {t("visibleToReviewers")}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>

      {/* Internal Notes - Private to self-assessment team */}
      <Collapsible open={isInternalOpen} onOpenChange={setIsInternalOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-orange-500" />
              <span className="font-medium">{t("internalNotes")}</span>
              {internalNotes && (
                <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full">
                  {t("hasContent")}
                </span>
              )}
            </div>
            {isInternalOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pb-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="internal-notes" className="text-sm text-muted-foreground">
                    {t("internalNotesDescription")}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">{t("internalNotesTooltip")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  id="internal-notes"
                  value={internalNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onInternalNotesChange(e.target.value)}
                  placeholder={t("internalNotesPlaceholder")}
                  disabled={disabled}
                  className="min-h-[100px] resize-y border-orange-200 focus:border-orange-400"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {internalNotes.length > 0 && (
                      <>{internalNotes.length} {t("characters")}</>
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-orange-600">
                    <Lock className="h-3 w-3" />
                    {t("privateNote")}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>

      {/* Quick tips */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">{t("tips.title")}</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>{t("tips.tip1")}</li>
              <li>{t("tips.tip2")}</li>
              <li>{t("tips.tip3")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
