/**
 * Auth Router - Authentication and password management procedures
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { prisma } from "@/lib/db";

export const authRouter = router({
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
