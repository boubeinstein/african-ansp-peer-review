import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "@/server/trpc/trpc";
import { workflowService, slaService } from "@/server/services/workflow";
import { WorkflowEntityType, UserRole } from "@prisma/client";

const OVERSIGHT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
];

const entityInput = z.object({
  entityType: z.nativeEnum(WorkflowEntityType),
  entityId: z.string(),
});

export const workflowRouter = router({
  /**
   * Get available transitions for an entity based on current state and user role
   */
  getAvailableTransitions: protectedProcedure
    .input(entityInput)
    .query(async ({ ctx, input }) => {
      const transitions = await workflowService.getAvailableTransitions(
        input.entityType,
        input.entityId,
        ctx.session.user.role
      );

      return transitions.map((t) => ({
        code: t.code,
        labelEn: t.labelEn,
        labelFr: t.labelFr,
        toState: t.toState.code,
        trigger: t.trigger,
        buttonVariant: t.buttonVariant,
        confirmRequired: t.confirmRequired,
        confirmMessageEn: t.confirmMessageEn,
        confirmMessageFr: t.confirmMessageFr,
      }));
    }),

  /**
   * Execute a state transition
   */
  executeTransition: protectedProcedure
    .input(
      z.object({
        entityType: z.nativeEnum(WorkflowEntityType),
        entityId: z.string(),
        transitionCode: z.string(),
        comment: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return workflowService.executeTransition({
        entityType: input.entityType,
        entityId: input.entityId,
        transitionCode: input.transitionCode,
        performedById: ctx.session.user.id,
        comment: input.comment,
        metadata: input.metadata,
      });
    }),

  /**
   * Get full transition history for an entity
   */
  getHistory: protectedProcedure
    .input(entityInput)
    .query(async ({ input }) => {
      const history = await workflowService.getHistory(
        input.entityType,
        input.entityId
      );

      return history.map((h) => ({
        id: h.id,
        fromStateCode: h.fromStateCode,
        toStateCode: h.toStateCode,
        transitionCode: h.transitionCode,
        trigger: h.trigger,
        performedBy: h.performedBy,
        comment: h.comment,
        performedAt: h.performedAt,
        durationInState: h.durationInState,
      }));
    }),

  /**
   * Get current state for an entity
   */
  getCurrentState: protectedProcedure
    .input(entityInput)
    .query(async ({ input }) => {
      return workflowService.getCurrentState(input.entityType, input.entityId);
    }),

  /**
   * Get current SLA information for an entity
   */
  getCurrentSLA: protectedProcedure
    .input(entityInput)
    .query(async ({ input }) => {
      return slaService.getCurrentSLA(input.entityType, input.entityId);
    }),

  /**
   * Get SLA history for an entity
   */
  getSLAHistory: protectedProcedure
    .input(entityInput)
    .query(async ({ input }) => {
      return slaService.getSLAHistory(input.entityType, input.entityId);
    }),

  /**
   * Get SLA statistics (oversight roles only)
   */
  getSLAStats: protectedProcedure
    .input(
      z
        .object({
          entityType: z.nativeEnum(WorkflowEntityType).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!OVERSIGHT_ROLES.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This action requires oversight role",
        });
      }
      return slaService.getStats(input);
    }),

  /**
   * Pause an SLA clock (admin only)
   */
  pauseSLA: adminProcedure
    .input(z.object({ slaId: z.string() }))
    .mutation(async ({ input }) => {
      await slaService.pauseSLA(input.slaId);
      return { success: true };
    }),

  /**
   * Resume a paused SLA clock (admin only)
   */
  resumeSLA: adminProcedure
    .input(z.object({ slaId: z.string() }))
    .mutation(async ({ input }) => {
      await slaService.resumeSLA(input.slaId);
      return { success: true };
    }),

  /**
   * Extend an SLA deadline (admin only)
   */
  extendSLA: adminProcedure
    .input(
      z.object({
        slaId: z.string(),
        additionalDays: z.number().min(1).max(365),
      })
    )
    .mutation(async ({ input }) => {
      await slaService.extendSLA(input.slaId, input.additionalDays);
      return { success: true };
    }),

  /**
   * List workflow definitions (admin only)
   */
  listDefinitions: adminProcedure
    .input(
      z.object({
        entityType: z.nativeEnum(WorkflowEntityType).optional(),
        includeInactive: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.workflowDefinition.findMany({
        where: {
          ...(input.entityType && { entityType: input.entityType }),
          ...(!input.includeInactive && { isActive: true }),
        },
        include: {
          states: { orderBy: { sortOrder: "asc" } },
          _count: { select: { executions: true } },
        },
        orderBy: { entityType: "asc" },
      });
    }),

  /**
   * Get a specific workflow definition with full details (admin only)
   */
  getDefinition: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflowDefinition.findUnique({
        where: { id: input.id },
        include: {
          states: { orderBy: { sortOrder: "asc" } },
          transitions: {
            include: {
              fromState: { select: { code: true, labelEn: true } },
              toState: { select: { code: true, labelEn: true } },
            },
          },
          escalationRules: {
            include: {
              state: { select: { code: true, labelEn: true } },
            },
          },
        },
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow definition not found",
        });
      }

      return workflow;
    }),

  /**
   * Get workflow analytics (oversight roles only)
   */
  getAnalytics: protectedProcedure
    .input(
      z.object({
        workflowId: z.string().optional(),
        entityType: z.nativeEnum(WorkflowEntityType).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!OVERSIGHT_ROLES.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This action requires oversight role",
        });
      }

      const executionWhere: Record<string, unknown> = {};
      if (input.workflowId) executionWhere.workflowId = input.workflowId;
      if (input.entityType) executionWhere.entityType = input.entityType;

      // Get current state distribution
      const executions = await ctx.db.workflowExecution.groupBy({
        by: ["currentStateCode"],
        where: executionWhere,
        _count: true,
      });

      // Get history stats with time filters
      const historyWhere: Record<string, unknown> = {
        durationInState: { not: null },
      };
      if (input.dateFrom) {
        historyWhere.performedAt = {
          ...(historyWhere.performedAt as Record<string, unknown> || {}),
          gte: input.dateFrom,
        };
      }
      if (input.dateTo) {
        historyWhere.performedAt = {
          ...(historyWhere.performedAt as Record<string, unknown> || {}),
          lte: input.dateTo,
        };
      }

      const historyStats = await ctx.db.workflowHistory.groupBy({
        by: ["toStateCode"],
        where: historyWhere,
        _avg: { durationInState: true },
        _count: true,
      });

      // Identify bottleneck states (longest average time)
      const bottlenecks = historyStats
        .filter((s) => s._avg.durationInState)
        .sort(
          (a, b) =>
            (b._avg.durationInState || 0) - (a._avg.durationInState || 0)
        )
        .slice(0, 5);

      return {
        executionsByState: executions.map((e) => ({
          state: e.currentStateCode,
          count: e._count,
        })),
        averageTimeByState: historyStats.map((s) => ({
          state: s.toStateCode,
          avgSeconds: Math.round(s._avg.durationInState || 0),
          avgDays:
            Math.round(((s._avg.durationInState || 0) / 86400) * 10) / 10,
          transitions: s._count,
        })),
        bottleneckStates: bottlenecks.map((b) => ({
          state: b.toStateCode,
          avgDays:
            Math.round(((b._avg.durationInState || 0) / 86400) * 10) / 10,
        })),
      };
    }),

  /**
   * Get approaching SLA breaches (oversight roles only)
   */
  getApproachingBreaches: protectedProcedure
    .input(
      z.object({
        warningDays: z.number().min(1).max(30).optional().default(3),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!OVERSIGHT_ROLES.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This action requires oversight role",
        });
      }
      return slaService.getApproachingBreaches(input.warningDays);
    }),
});
