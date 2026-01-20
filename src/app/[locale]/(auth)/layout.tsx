import { TRPCProvider } from "@/lib/trpc/provider";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
