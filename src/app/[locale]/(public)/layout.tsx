import { TRPCProvider } from "@/lib/trpc/provider";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
