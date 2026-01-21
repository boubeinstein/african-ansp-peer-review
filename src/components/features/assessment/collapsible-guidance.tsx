"use client";

import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CollapsibleGuidanceProps {
  guidance: string;
  references?: string[];
  defaultOpen?: boolean;
}

export function CollapsibleGuidance({
  guidance,
  references,
  defaultOpen = false,
}: CollapsibleGuidanceProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const t = useTranslations("workspace");

  if (!guidance && (!references || references.length === 0)) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 h-7 px-2 text-muted-foreground hover:text-foreground",
            isOpen && "text-blue-600"
          )}
        >
          <Info className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{t("panel.guidance")}</span>
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
          <p className="text-blue-700 leading-relaxed whitespace-pre-wrap">
            {guidance}
          </p>

          {references && references.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs font-medium text-blue-600 mb-1.5">
                {t("panel.references")}
              </p>
              <ul className="text-xs text-blue-700 space-y-0.5">
                {references.map((ref, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-blue-400">•</span>
                    <span>{ref}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
