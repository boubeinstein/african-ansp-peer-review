"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  menu?: React.ReactNode;
}

export function MobileHeader({
  title,
  showBack = false,
  actions,
  menu,
}: MobileHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 bg-background border-b md:hidden safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2 min-w-0">
          {showBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 touch-manipulation"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : menu ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 touch-manipulation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                {menu}
              </SheetContent>
            </Sheet>
          ) : null}
          <h1 className="font-semibold text-lg truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <OfflineIndicator />
          {actions}
        </div>
      </div>
    </header>
  );
}
