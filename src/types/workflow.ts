import type { WorkflowEntityType, TransitionTrigger, EscalationAction, SLAStatus } from "@prisma/client";

export type ConditionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "exists" | "regex";

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface ConditionGroup {
  logic: "AND" | "OR";
  conditions: (Condition | ConditionGroup)[];
}

export interface TransitionConditions {
  logic?: "AND" | "OR";
  rules: (Condition | ConditionGroup)[];
}

export interface TransitionAction {
  type: "NOTIFY" | "UPDATE_FIELD" | "CREATE_TASK" | "SEND_EMAIL" | "WEBHOOK";
  config: Record<string, unknown>;
}

export interface EscalationConfig {
  notifyRoles?: string[];
  notifyUsers?: string[];
  reassignToRole?: string;
  reassignToUserId?: string;
  message?: { en: string; fr: string };
}

export interface TransitionRequest {
  entityType: WorkflowEntityType;
  entityId: string;
  transitionCode: string;
  performedById: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  previousState: string | null;
  newState: string;
  executionId: string;
  historyId: string;
  errors?: string[];
}

export interface EntityContext {
  id: string;
  type: WorkflowEntityType;
  currentStatus: string;
  data: Record<string, unknown>;
  relations?: {
    documents?: { count: number };
    assignedTo?: { id: string; role: string } | null;
    organization?: { id: string; code: string };
    review?: { id: string; status: string };
  };
}

// Re-export Prisma types for convenience
export type { WorkflowEntityType, TransitionTrigger, EscalationAction, SLAStatus };
