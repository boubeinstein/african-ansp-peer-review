/**
 * Audit Service Index
 *
 * Central export point for audit logging functionality.
 */

export {
  // Core logging functions
  logAudit,
  logStatusChange,
  logCreate,
  logUpdate,
  logDelete,
  logApproval,
  logRejection,
  logAssignment,
  logSubmission,
  logVerification,
  logLogin,
  logLoginFailed,
  logLogout,
  logExport,
  logViewSensitive,
  // Query functions
  getAuditLogs,
  getEntityAuditLogs,
  getUserAuditLogs,
  getEntityTypes,
  exportAuditLogsToCSV,
  // Types
  type AuditLogParams,
  type AuditLogEntry,
  type AuditLogFilters,
  type PaginatedAuditLogs,
} from "./audit-service";
