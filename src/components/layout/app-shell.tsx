import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
  locale: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export function AppShell({ children, locale, user }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar locale={locale} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header locale={locale} user={user} />
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
