/**
 * User Onboarding tRPC Router
 *
 * Handles persistence of user onboarding state including tour progress,
 * completed/skipped steps, and tooltip preferences.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const updateStateSchema = z.object({
  completedSteps: z.array(z.string()).optional(),
  skippedSteps: z.array(z.string()).optional(),
  currentStep: z.string().nullable().optional(),
  tourStartedAt: z.date().nullable().optional(),
  tourCompletedAt: z.date().nullable().optional(),
  tourDismissedAt: z.date().nullable().optional(),
  showTooltips: z.boolean().optional(),
  showWelcome: z.boolean().optional(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const onboardingRouter = router({
  /**
   * Get current onboarding state for the authenticated user
   * Creates a new record if one doesn't exist
   */
  getState: protectedProcedure.query(async ({ ctx }) => {
    let state = await ctx.db.userOnboarding.findUnique({
      where: { userId: ctx.session.user.id },
    });

    // Create default state if not exists
    if (!state) {
      state = await ctx.db.userOnboarding.create({
        data: { userId: ctx.session.user.id },
      });
    }

    return state;
  }),

  /**
   * Update onboarding state (partial update)
   */
  updateState: protectedProcedure
    .input(updateStateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userOnboarding.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          ...input,
        },
        update: input,
      });
    }),

  /**
   * Mark a specific step as completed
   */
  completeStep: protectedProcedure
    .input(z.object({ stepId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.userOnboarding.findUnique({
        where: { userId: ctx.session.user.id },
      });

      const completedSteps = current?.completedSteps || [];
      if (!completedSteps.includes(input.stepId)) {
        completedSteps.push(input.stepId);
      }

      return ctx.db.userOnboarding.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          completedSteps,
        },
        update: {
          completedSteps,
        },
      });
    }),

  /**
   * Mark a specific step as skipped
   */
  skipStep: protectedProcedure
    .input(z.object({ stepId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.userOnboarding.findUnique({
        where: { userId: ctx.session.user.id },
      });

      const skippedSteps = current?.skippedSteps || [];
      if (!skippedSteps.includes(input.stepId)) {
        skippedSteps.push(input.stepId);
      }

      return ctx.db.userOnboarding.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          skippedSteps,
        },
        update: {
          skippedSteps,
        },
      });
    }),

  /**
   * Start the onboarding tour
   */
  startTour: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.userOnboarding.upsert({
      where: { userId: ctx.session.user.id },
      create: {
        userId: ctx.session.user.id,
        tourStartedAt: new Date(),
        showWelcome: false,
      },
      update: {
        tourStartedAt: new Date(),
        tourCompletedAt: null,
        tourDismissedAt: null,
        showWelcome: false,
      },
    });
  }),

  /**
   * Complete the onboarding tour
   */
  completeTour: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.userOnboarding.upsert({
      where: { userId: ctx.session.user.id },
      create: {
        userId: ctx.session.user.id,
        tourCompletedAt: new Date(),
        showWelcome: false,
      },
      update: {
        tourCompletedAt: new Date(),
        showWelcome: false,
      },
    });
  }),

  /**
   * Dismiss the onboarding tour without completing
   */
  dismissTour: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.userOnboarding.upsert({
      where: { userId: ctx.session.user.id },
      create: {
        userId: ctx.session.user.id,
        tourDismissedAt: new Date(),
        showWelcome: false,
      },
      update: {
        tourDismissedAt: new Date(),
        showWelcome: false,
      },
    });
  }),

  /**
   * Reset the onboarding tour (allows restarting)
   */
  resetTour: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.userOnboarding.upsert({
      where: { userId: ctx.session.user.id },
      create: {
        userId: ctx.session.user.id,
      },
      update: {
        completedSteps: [],
        skippedSteps: [],
        currentStep: null,
        tourStartedAt: null,
        tourCompletedAt: null,
        tourDismissedAt: null,
        showWelcome: true,
      },
    });
  }),

  /**
   * Toggle tooltip visibility
   */
  toggleTooltips: protectedProcedure
    .input(z.object({ show: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userOnboarding.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          showTooltips: input.show,
        },
        update: {
          showTooltips: input.show,
        },
      });
    }),

  /**
   * Dismiss the welcome message
   */
  dismissWelcome: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.userOnboarding.upsert({
      where: { userId: ctx.session.user.id },
      create: {
        userId: ctx.session.user.id,
        showWelcome: false,
      },
      update: {
        showWelcome: false,
      },
    });
  }),
});
