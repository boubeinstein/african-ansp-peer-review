/**
 * Audit Service
 *
 * Comprehensive audit logging for compliance tracking.
 * Logs all significant actions including state changes,
 * user context, and request metadata.
 */

import { headers as getRequestHeaders } from "next/headers";
import { prisma } from "@/lib/db";
import { AuditAction, Prisma } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface AuditLogParams {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  request?: Request;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log an audit event
 *
 * @param params - Audit log parameters
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  const {
    userId,
    action,
    entityType,
    entityId,
    previousState,
    newState,
    metadata,
    request,
  } = params;

  // Extract IP and user agent from request or Next.js request context
  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  if (request) {
    // Try multiple headers for IP (proxy-aware)
    ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip") || // Cloudflare
      null;
    userAgent = request.headers.get("user-agent");
  } else {
    // Fallback: try to get headers from Next.js request context
    try {
      const hdrs = await getRequestHeaders();
      ipAddress = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || null;
      userAgent = hdrs.get("user-agent") || null;
    } catch {
      // headers() unavailable outside request context (e.g., background jobs)
    }
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        previousState: previousState as Prisma.InputJsonValue | undefined,
        newState: newState as Prisma.InputJsonValue | undefined,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break operations
    console.error("[Audit] Failed to log audit event:", error, {
      userId,
      action,
      entityType,
      entityId,
    });
  }
}

/**
 * Log a status change with automatic state tracking
 */
export async function logStatusChange(params: {
  userId: string;
  entityType: string;
  entityId: string;
  previousStatus: string;
  newStatus: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "STATUS_CHANGE",
    entityType: params.entityType,
    entityId: params.entityId,
    previousState: { status: params.previousStatus },
    newState: { status: params.newStatus },
    metadata: params.metadata,
    request: params.request,
  });
}

/**
 * Log an entity creation
 */
export async function logCreate(params: {
  userId: string;
  entityType: string;
  entityId: string;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "CREATE",
    entityType: params.entityType,
    entityId: params.entityId,
    newState: params.newState,
    metadata: params.metadata,
    request: params.request,
  });
}

/**
 * Log an entity update
 */
export async function logUpdate(params: {
  userId: string;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "UPDATE",
    entityType: params.entityType,
    entityId: params.entityId,
    previousState: params.previousState,
    newState: params.newState,
    metadata: params.metadata,
    request: params.request,
  });
}

/**
 * Log an entity deletion
 */
export async function logDelete(params: {
  userId: string;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "DELETE",
    entityType: params.entityType,
    entityId: params.entityId,
    previousState: params.previousState,
    metadata: params.metadata,
    request: params.request,
  });
}

/**
 * Log an approval action
 */
export async function logApproval(params: {
  userId: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "APPROVAL",
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata,
    request: params.request,
  });
}

/**
 * Log a rejection action
 */
export async function logRejection(params: {
  userId: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "REJECTION",
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata,
    request: params.request,
  });
}

/**
 * Log an assignment action
 */
export async function logAssignment(params: {
  userId: string;
  entityType: string;
  entityId: string;
  assigneeId: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "ASSIGNMENT",
    entityType: params.entityType,
    entityId: params.entityId,
    newState: { assigneeId: params.assigneeId },
    metadata: params.metadata,
    request: params.request,
  });
}

/**
 * Log a submission action
 */
export async function logSubmission(params: {
  userId: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "SUBMISSION",
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata,
    request: params.request,
  });
}

/**
 * Log a verification action
 */
export async function logVerification(params: {
  userId: string;
  entityType: string;
  entityId: string;
  verified: boolean;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "VERIFICATION",
    entityType: params.entityType,
    entityId: params.entityId,
    newState: { verified: params.verified },
    metadata: params.metadata,
    request: params.request,
  });
}

/**
 * Log a login event
 */
export async function logLogin(params: {
  userId: string;
  request?: Request;
  success?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "LOGIN",
    entityType: "User",
    entityId: params.userId,
    metadata: { success: params.success ?? true, ...params.metadata },
    request: params.request,
  });
}

/**
 * Log a failed login attempt
 */
export async function logLoginFailed(params: {
  userId: string;
  request?: Request;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "LOGIN_FAILED",
    entityType: "User",
    entityId: params.userId,
    metadata: { success: false, ...params.metadata },
    request: params.request,
  });
}

/**
 * Log a logout event
 */
export async function logLogout(params: {
  userId: string;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "LOGOUT",
    entityType: "User",
    entityId: params.userId,
    request: params.request,
  });
}

/**
 * Log an export action
 */
export async function logExport(params: {
  userId: string;
  entityType: string;
  format: string;
  count?: number;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "EXPORT",
    entityType: params.entityType,
    entityId: "export",
    metadata: { format: params.format, count: params.count, ...params.metadata },
    request: params.request,
  });
}

/**
 * Log viewing sensitive data
 */
export async function logViewSensitive(params: {
  userId: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAudit({
    userId: params.userId,
    action: "VIEW_SENSITIVE",
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata,
    request: params.request,
  });
}

// =============================================================================
// AUDIT LOG QUERIES
// =============================================================================

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginatedAuditLogs {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(params: {
  filters?: AuditLogFilters;
  page?: number;
  pageSize?: number;
  orderBy?: "asc" | "desc";
}): Promise<PaginatedAuditLogs> {
  const { filters = {}, page = 1, pageSize = 50, orderBy = "desc" } = params;

  const where: Record<string, unknown> = {};

  if (filters.entityType) {
    where.entityType = filters.entityType;
  }
  if (filters.entityId) {
    where.entityId = filters.entityId;
  }
  if (filters.userId) {
    where.userId = filters.userId;
  }
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: orderBy },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      previousState: log.previousState as Record<string, unknown> | null,
      newState: log.newState as Record<string, unknown> | null,
      metadata: log.metadata as Record<string, unknown> | null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(params: {
  entityType: string;
  entityId: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const { entityType, entityId, limit = 100 } = params;

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((log) => ({
    ...log,
    previousState: log.previousState as Record<string, unknown> | null,
    newState: log.newState as Record<string, unknown> | null,
    metadata: log.metadata as Record<string, unknown> | null,
  }));
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(params: {
  userId: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const { userId, limit = 100 } = params;

  const logs = await prisma.auditLog.findMany({
    where: { userId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((log) => ({
    ...log,
    previousState: log.previousState as Record<string, unknown> | null,
    newState: log.newState as Record<string, unknown> | null,
    metadata: log.metadata as Record<string, unknown> | null,
  }));
}

/**
 * Get distinct entity types (for filtering)
 */
export async function getEntityTypes(): Promise<string[]> {
  const result = await prisma.auditLog.findMany({
    select: { entityType: true },
    distinct: ["entityType"],
    orderBy: { entityType: "asc" },
  });
  return result.map((r) => r.entityType);
}

/**
 * Export audit logs to CSV format
 */
export function exportAuditLogsToCSV(logs: AuditLogEntry[]): string {
  const headers = [
    "Date/Time",
    "User",
    "Email",
    "Action",
    "Entity Type",
    "Entity ID",
    "IP Address",
    "User Agent",
    "Previous State",
    "New State",
    "Metadata",
  ];

  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    `${log.user.firstName} ${log.user.lastName}`,
    log.user.email,
    log.action,
    log.entityType,
    log.entityId,
    log.ipAddress || "",
    log.userAgent || "",
    log.previousState ? JSON.stringify(log.previousState) : "",
    log.newState ? JSON.stringify(log.newState) : "",
    log.metadata ? JSON.stringify(log.metadata) : "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}
