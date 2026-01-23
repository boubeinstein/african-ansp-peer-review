"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutIndicatorProps {
  pendingKey: string | null;
  timeout?: number;
}

export function ShortcutIndicator({ pendingKey, timeout = 1500 }: ShortcutIndicatorProps) {
  const t = useTranslations("shortcuts.indicator");
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  // Derive visibility from pendingKey prop directly
  const visible = pendingKey !== null;

  // Animate progress using requestAnimationFrame
  useEffect(() => {
    if (!pendingKey) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Record start time for this animation cycle
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / timeout) * 100);
      setProgress(remaining);

      if (remaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [pendingKey, timeout]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3",
        "bg-popover border rounded-lg shadow-lg min-w-[200px]",
        "animate-in fade-in slide-in-from-bottom-2 duration-200"
      )}
    >
      <div className="p-2 rounded-md bg-primary/10">
        <Keyboard className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{t("waiting", { key: pendingKey })}</p>
        <p className="text-xs text-muted-foreground">{t("pressNext")}</p>
      </div>
      <kbd className="px-2 py-1 text-sm font-mono bg-muted rounded border">
        {pendingKey}
      </kbd>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted overflow-hidden rounded-b-lg">
        <div
          className="h-full bg-primary/50 transition-all duration-50 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default ShortcutIndicator;
