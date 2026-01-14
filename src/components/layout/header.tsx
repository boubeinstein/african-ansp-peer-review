"use client";

import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, Globe, LogOut, User, Settings } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  locale: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export function Header({ locale, user }: HeaderProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const otherLocale = locale === "en" ? "fr" : "en";
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push(`/${locale}/login`);
  };

  const switchLocale = () => {
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(`/${locale}`, `/${otherLocale}`);
    router.push(newPath);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">{t("appName")}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={switchLocale}>
          <Globe className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
            3
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-sm md:flex">
                <span className="font-medium">{user.firstName} {user.lastName}</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  {user.role.replace("_", " ")}
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.firstName} {user.lastName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/profile`}>
                <User className="mr-2 h-4 w-4" />
                {t("actions.profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                {t("actions.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t("actions.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
