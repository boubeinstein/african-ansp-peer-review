"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, MessageSquare, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobilePanelsBarProps {
  evidenceContent: React.ReactNode;
  notesContent: React.ReactNode;
  evidenceCount: number;
  hasNotes: boolean;
}

export function MobilePanelsBar({
  evidenceContent,
  notesContent,
  evidenceCount,
  hasNotes,
}: MobilePanelsBarProps) {
  const t = useTranslations("workspace");
  const [activeSheet, setActiveSheet] = useState<"evidence" | "notes" | null>(null);

  return (
    <>
      {/* Fixed bar above sticky navigation - hidden on xl+ screens */}
      <div className="xl:hidden fixed bottom-[5.5rem] left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-around p-2 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="flex-col gap-1 h-auto py-2 px-4"
            onClick={() => setActiveSheet("evidence")}
          >
            <div className="relative">
              <Paperclip className="h-5 w-5" />
              {evidenceCount > 0 && (
                <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
                  {evidenceCount}
                </span>
              )}
            </div>
            <span className="text-xs">{t("mobile.evidence")}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex-col gap-1 h-auto py-2 px-4"
            onClick={() => setActiveSheet("notes")}
          >
            <div className="relative">
              <MessageSquare className="h-5 w-5" />
              {hasNotes && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500" />
              )}
            </div>
            <span className="text-xs">{t("mobile.notes")}</span>
          </Button>
        </div>
      </div>

      {/* Evidence Sheet */}
      <Sheet open={activeSheet === "evidence"} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[75vh] flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("evidence.title")}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {evidenceContent}
          </div>
        </SheetContent>
      </Sheet>

      {/* Notes Sheet */}
      <Sheet open={activeSheet === "notes"} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <SheetContent side="bottom" className="h-[75vh] flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t("panel.notes")}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {notesContent}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
