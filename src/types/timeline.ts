import type { ReviewStatus } from "@/lib/timeline-utils";

export interface ReviewTimelineData {
  id: string;
  status: ReviewStatus;
  requestedDate: Date | string;
  plannedStartDate?: Date | string | null;
  plannedEndDate?: Date | string | null;
  actualStartDate?: Date | string | null;
  actualEndDate?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  // Optional fields for backward compatibility
  requestedStartDate?: Date | string | null;
  requestedEndDate?: Date | string | null;
  teamMembers?: {
    id: string;
    confirmedAt?: Date | string | null;
    createdAt?: Date | string | null;
  }[];
  report?: {
    draftedAt?: Date | string | null;
    finalizedAt?: Date | string | null;
    status?: string;
    createdAt?: Date | string | null;
  } | null;
  findings?: { id: string }[];
  approvals?: {
    id: string;
    approvedAt?: Date | string | null;
    createdAt?: Date | string | null;
  }[];
  _count?: {
    teamMembers?: number;
    findings?: number;
  };
}

export interface TimelineStep {
  id: string;
  labelKey: string;
  status: "completed" | "current" | "pending" | "cancelled";
  date: Date | null;
  displayDate: string | null;
  details: string | null;
  isInferred: boolean;
  hasChronologyIssue: boolean;
}

export interface ResolvedTimelineData {
  steps: TimelineStep[];
  completedCount: number;
  totalCount: number;
  currentStepId: string | null;
}

export interface RawDates {
  requested: Date | null;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  teamAssigned: Date | null;
  reportDrafted: Date | null;
  reportFinalized: Date | null;
  reviewUpdated: Date | null;
}

export interface InferredDates {
  requested: Date | null;
  approved: Date | null;
  teamAssigned: Date | null;
  datesConfirmed: Date | null;
  reviewStarted: Date | null;
  fieldworkComplete: Date | null;
  reportDrafted: Date | null;
  reportFinalized: Date | null;
  reviewClosed: Date | null;
}

export interface ValidatedDate {
  date: Date | null;
  isInferred: boolean;
  hasChronologyIssue: boolean;
}
