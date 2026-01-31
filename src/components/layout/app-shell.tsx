import { UserRole } from "@prisma/client";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { SkipLinks } from "./skip-links";

interface AppShellProps {
  children: React.ReactNode;
  locale: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
  };
}

export function AppShell({ children, locale, user }: AppShellProps) {
  return (
    <>
      <SkipLinks />
      <div className="flex h-screen overflow-hidden">
        <Sidebar locale={locale} userRole={user.role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header locale={locale} user={user} />
          <main
            id="main-content"
            className="flex-1 overflow-auto bg-muted/30 p-6 pb-20 md:pb-6"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </>
  );
}
