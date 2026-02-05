import { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { UserRole, Locale } from "@/types/prisma-enums";

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,    // 8 hours — matches one work day
    updateAge: 60 * 60,      // Refresh token every 1 hour of activity
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.locale = user.locale;
        token.tokenVersion = user.tokenVersion;
      }

      // Periodically verify token is still valid (every 5 minutes)
      // This catches deactivated users and role changes
      const REVALIDATION_INTERVAL = 5 * 60; // 5 minutes in seconds
      const now = Math.floor(Date.now() / 1000);
      const lastChecked = (token.lastChecked as number) || 0;

      if (now - lastChecked > REVALIDATION_INTERVAL && token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { tokenVersion: true, isActive: true, role: true },
          });

          // Invalidate if user deleted, deactivated, or token version mismatch
          if (!dbUser || !dbUser.isActive || dbUser.tokenVersion !== token.tokenVersion) {
            return { ...token, id: null, expired: true };
          }

          // Also refresh role in case it changed
          token.role = dbUser.role;
          token.lastChecked = now;
        } catch (error) {
          console.error("[Auth] Token revalidation failed:", error);
          // On error, allow token to continue (don't lock users out due to transient DB issues)
        }
      }

      return token;
    },
    async session({ session, token }) {
      // If token was invalidated by revalidation, return empty session
      if (token.expired || !token.id) {
        return { ...session, user: undefined } as unknown as typeof session;
      }

      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.organizationId = token.organizationId as string | null;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.locale = token.locale as Locale;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      try {
        const { logLogin } = await import("@/server/services/audit");
        await logLogin({
          userId: user.id!,
          metadata: {
            email: user.email,
            role: (user as unknown as Record<string, unknown>).role,
            provider: "credentials",
          },
        });
      } catch (error) {
        console.error("[Auth] Failed to log sign-in:", error);
      }
    },
    async signOut(message) {
      try {
        const { logLogout } = await import("@/server/services/audit");
        const token = "token" in message ? message.token : null;
        if (token?.sub) {
          await logLogout({ userId: token.sub });
        }
      } catch (error) {
        console.error("[Auth] Failed to log sign-out:", error);
      }
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;

        if (!email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            firstName: true,
            lastName: true,
            role: true,
            organizationId: true,
            locale: true,
            isActive: true,
            tokenVersion: true,
          },
        });

        // User not found — cannot write audit log (FK requires valid user)
        if (!user || !user.passwordHash) {
          console.warn(`[Auth] Failed login attempt for unknown email: ${email}`);
          return null;
        }

        // Account deactivated
        if (!user.isActive) {
          import("@/server/services/audit").then(({ logLoginFailed }) =>
            logLoginFailed({
              userId: user.id,
              metadata: { email, reason: "account_deactivated" },
            })
          ).catch(() => {});
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        // Wrong password
        if (!isPasswordValid) {
          import("@/server/services/audit").then(({ logLoginFailed }) =>
            logLoginFailed({
              userId: user.id,
              metadata: { email, reason: "invalid_password" },
            })
          ).catch(() => {});
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
          locale: user.locale,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
};
