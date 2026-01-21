/**
 * Auth Router - Authentication and password management procedures
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { router, protectedProcedure, publicProcedure } from "@/server/trpc/trpc";
import { prisma } from "@/lib/db";

export const authRouter = router({
  /**
   * Request password reset - sends email with token
   * Always returns success to prevent email enumeration attacks
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        console.log(
          `Password reset requested for non-existent email: ${input.email}`
        );
        return { success: true };
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any existing reset tokens for this user
      await prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Create new reset token
      await prisma.passwordReset.create({
        data: {
          token: hashedToken,
          userId: user.id,
          expiresAt,
        },
      });

      // TODO: Send email with reset link
      // For now, log the token (remove in production)
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/en/reset-password?token=${token}`;
      console.log(`Password reset link for ${input.email}: ${resetUrl}`);

      // In production, use email service:
      // await sendPasswordResetEmail(user.email, user.firstName, resetUrl);

      return { success: true };
    }),

  /**
   * Verify reset token is valid (for UI feedback)
   */
  verifyResetToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const hashedToken = crypto
        .createHash("sha256")
        .update(input.token)
        .digest("hex");

      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token: hashedToken,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: { select: { email: true, firstName: true } },
        },
      });

      if (!resetRecord) {
        return { valid: false, email: null };
      }

      // Mask email for privacy (e.g., jo***@example.com)
      const email = resetRecord.user.email;
      const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

      return {
        valid: true,
        email: maskedEmail,
      };
    }),

  /**
   * Reset password with token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z
          .string()
          .min(12, "Password must be at least 12 characters")
          .regex(/[a-z]/, "Password must contain a lowercase letter")
          .regex(/[A-Z]/, "Password must contain an uppercase letter")
          .regex(/[0-9]/, "Password must contain a number")
          .regex(
            /[@$!%*?&#^()_+=[\]{}|\\:";'<>,.?/~`-]/,
            "Password must contain a special character"
          ),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.password !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      const hashedToken = crypto
        .createHash("sha256")
        .update(input.token)
        .digest("hex");

      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token: hashedToken,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!resetRecord) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Update password and mark token as used in a transaction
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetRecord.userId },
          data: {
            passwordHash: hashedPassword,
            mustChangePassword: false,
          },
        }),
        prisma.passwordReset.update({
          where: { id: resetRecord.id },
          data: { usedAt: new Date() },
        }),
      ]);

      // Log for audit
      await prisma.auditLog.create({
        data: {
          action: "PASSWORD_RESET",
          entityType: "User",
          entityId: resetRecord.userId,
          userId: resetRecord.userId,
        },
      });

      return { success: true };
    }),

  /**
   * Change password for the current user
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
          .regex(/[a-z]/, "Password must contain at least one lowercase letter")
          .regex(/[0-9]/, "Password must contain at least one number"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { passwordHash: true },
      });

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User has no password set",
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(
        input.currentPassword,
        user.passwordHash
      );
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect",
        });
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 12);

      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          passwordHash: hashedPassword,
          mustChangePassword: false,
        },
      });

      return { success: true };
    }),

  /**
   * Check if user must change password
   */
  checkMustChangePassword: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { mustChangePassword: true },
    });
    return { mustChangePassword: user?.mustChangePassword ?? false };
  }),
});
