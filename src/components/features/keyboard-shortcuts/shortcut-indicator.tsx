"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutIndicatorProps {
  pendingKey: string | null;
  timeout?: number;
}

export function ShortcutIndicator({ pendingKey, timeout = 1500 }: ShortcutIndicatorProps) {
  const t = useTranslations("shortcuts.indicator");
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (pendingKey) {
      setVisible(true);
      setProgress(100);
      const interval = setInterval(() => setProgress((p) => Math.max(0, p - 100 / (timeout / 50))), 50);
      const timer = setTimeout(() => setVisible(false), timeout);
      return () => { clearInterval(interval); clearTimeout(timer); };
    } else {
      setVisible(false);
    }
  }, [pendingKey, timeout]);

  if (!visible || !pendingKey) return null;

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3",
      "bg-popover border rounded-lg shadow-lg min-w-[200px]"
    )}>
      <div className="p-2 rounded-md bg-primary/10">
        <Keyboard className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{t("waiting", { key: pendingKey })}</p>
        <p className="text-xs text-muted-foreground">{t("pressNext")}</p>
      </div>
      <kbd className="px-2 py-1 text-sm font-mono bg-muted rounded border">{pendingKey}</kbd>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted overflow-hidden rounded-b-lg">
        <div className="h-full bg-primary/50 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default ShortcutIndicator;
