/**
 * Audit Router
 *
 * API endpoints for audit log management and querying.
 * Access restricted to admin roles only.
 */

import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { AuditAction } from "@prisma/client";
import {
  getAuditLogs,
  getEntityAuditLogs,
  getUserAuditLogs,
  getEntityTypes,
  exportAuditLogsToCSV,
} from "@/server/services/audit";

export const auditRouter = router({
  /**
   * Get paginated audit logs with filters
   */
  getLogs: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(10).max(100).default(50),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        userId: z.string().optional(),
        action: z.nativeEnum(AuditAction).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        orderBy: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, orderBy, ...filters } = input;

      return getAuditLogs({
        filters,
        page,
        pageSize,
        orderBy,
      });
    }),

  /**
   * Get audit logs for a specific entity
   */
  getEntityLogs: adminProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string(),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ input }) => {
      return getEntityAuditLogs({
        entityType: input.entityType,
        entityId: input.entityId,
        limit: input.limit,
      });
    }),

  /**
   * Get audit logs for a specific user
   */
  getUserLogs: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ input }) => {
      return getUserAuditLogs({
        userId: input.userId,
        limit: input.limit,
      });
    }),

  /**
   * Get distinct entity types for filtering
   */
  getEntityTypes: adminProcedure.query(async () => {
    return getEntityTypes();
  }),

  /**
   * Get all available audit actions for filtering
   */
  getActions: adminProcedure.query(async () => {
    return Object.values(AuditAction);
  }),

  /**
   * Export audit logs to CSV
   */
  exportToCSV: adminProcedure
    .input(
      z.object({
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        userId: z.string().optional(),
        action: z.nativeEnum(AuditAction).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { logs } = await getAuditLogs({
        filters: input,
        pageSize: 10000, // Max export size
      });

      return exportAuditLogsToCSV(logs);
    }),

  /**
   * Get audit log summary statistics
   */
  getSummary: adminProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const [
        totalLogs,
        logsByAction,
        logsByEntityType,
        recentActivity,
      ] = await Promise.all([
        // Total logs in period
        db.auditLog.count({
          where: { createdAt: { gte: startDate } },
        }),
        // Logs grouped by action
        db.auditLog.groupBy({
          by: ["action"],
          where: { createdAt: { gte: startDate } },
          _count: true,
        }),
        // Logs grouped by entity type
        db.auditLog.groupBy({
          by: ["entityType"],
          where: { createdAt: { gte: startDate } },
          _count: true,
          orderBy: { _count: { entityType: "desc" } },
          take: 10,
        }),
        // Recent activity (last 10)
        db.auditLog.findMany({
          where: { createdAt: { gte: startDate } },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      return {
        totalLogs,
        byAction: logsByAction.map((l) => ({
          action: l.action,
          count: l._count,
        })),
        byEntityType: logsByEntityType.map((l) => ({
          entityType: l.entityType,
          count: l._count,
        })),
        recentActivity: recentActivity.map((l) => ({
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          userName: `${l.user.firstName} ${l.user.lastName}`,
          createdAt: l.createdAt,
        })),
      };
    }),
});

export default auditRouter;
