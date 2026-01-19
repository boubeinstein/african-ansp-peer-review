import { z } from "zod";
import { router, publicProcedure } from "../trpc";

/**
 * Training Module Router
 *
 * Provides access to training modules and their content.
 * All procedures are public as training content should be accessible
 * to anyone who wants to learn about the peer review programme.
 */
export const trainingRouter = router({
  /**
   * List all active and enabled training modules
   */
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.trainingModule.findMany({
      where: {
        isActive: true,
        isEnabled: true,
      },
      include: {
        topics: {
          orderBy: { sortOrder: "asc" },
        },
        resources: true,
      },
      orderBy: { sortOrder: "asc" },
    });
  }),

  /**
   * Get a single training module by ID with all related content
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.trainingModule.findUnique({
        where: { id: input.id },
        include: {
          topics: {
            orderBy: { sortOrder: "asc" },
          },
          resources: true,
        },
      });
    }),

  /**
   * Get a training module by its code (M0, M1, M2, etc.)
   */
  getByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.trainingModule.findUnique({
        where: { code: input.code },
        include: {
          topics: {
            orderBy: { sortOrder: "asc" },
          },
          resources: true,
        },
      });
    }),

  /**
   * Get training module statistics
   */
  getStats: publicProcedure.query(async ({ ctx }) => {
    const modules = await ctx.db.trainingModule.findMany({
      where: {
        isActive: true,
        isEnabled: true,
      },
      include: {
        topics: true,
        resources: true,
      },
    });

    return {
      totalModules: modules.length,
      totalTopics: modules.reduce((acc, m) => acc + m.topics.length, 0),
      totalResources: modules.reduce((acc, m) => acc + m.resources.length, 0),
      modules: modules.map((m) => ({
        id: m.id,
        code: m.code,
        titleEn: m.titleEn,
        titleFr: m.titleFr,
        topicsCount: m.topics.length,
        resourcesCount: m.resources.length,
      })),
    };
  }),
});

export type TrainingRouter = typeof trainingRouter;
