import { UserRole, Locale } from "@/types/prisma-enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organizationId: string | null;
    locale: Locale;
    tokenVersion: number;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      organizationId: string | null;
      locale: Locale;
    } & DefaultSession["user"];
    loginSessionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    loginSessionId?: string;
  }
}
