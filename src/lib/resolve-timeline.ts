import { format } from "date-fns";
import {
  parseDate,
  minDate,
  addDays,
  hasReachedStatus,
} from "./timeline-utils";
import type { ReviewStatus } from "./timeline-utils";
import type {
  ReviewTimelineData,
  ResolvedTimelineData,
  RawDates,
  InferredDates,
  ValidatedDate,
  TimelineStep,
} from "@/types/timeline";

// =============================================================================
// RAW DATE EXTRACTION
// =============================================================================

function getTeamAssignmentDate(review: ReviewTimelineData): Date | null {
  const dates = review.teamMembers
    ?.map((m) => parseDate(m.confirmedAt) ?? parseDate(m.createdAt))
    .filter((d): d is Date => d !== null);
  return dates?.length ? minDate(...dates) : null;
}

function extractRawDates(review: ReviewTimelineData): RawDates {
  return {
    requested: parseDate(review.requestedDate),
    plannedStart: parseDate(review.plannedStartDate),
    plannedEnd: parseDate(review.plannedEndDate),
    actualStart: parseDate(review.actualStartDate),
    actualEnd: parseDate(review.actualEndDate),
    teamAssigned: getTeamAssignmentDate(review),
    reportDrafted: parseDate(review.report?.draftedAt),
    reportFinalized: parseDate(review.report?.finalizedAt),
    reviewUpdated: parseDate(review.updatedAt),
  };
}

// =============================================================================
// STATUS RESOLUTION
// =============================================================================

type StepStatus = "completed" | "current" | "pending";

interface StepStatuses {
  requested: StepStatus;
  approved: StepStatus;
  teamAssigned: StepStatus;
  datesConfirmed: StepStatus;
  reviewStarted: StepStatus;
  fieldworkComplete: StepStatus;
  reportDrafted: StepStatus;
  reportFinalized: StepStatus;
  reviewClosed: StepStatus;
}

function resolveStatuses(
  review: ReviewTimelineData,
  raw: RawDates
): StepStatuses {
  const status = review.status as ReviewStatus;
  const hasTeam =
    (review.teamMembers?.length ?? review._count?.teamMembers ?? 0) > 0;
  const hasDates = raw.plannedStart && raw.plannedEnd;

  return {
    requested: "completed",

    approved: hasReachedStatus(status, "APPROVED")
      ? "completed"
      : status === "REQUESTED"
        ? "current"
        : "pending",

    teamAssigned:
      hasTeam || hasReachedStatus(status, "SCHEDULED")
        ? "completed"
        : hasReachedStatus(status, "APPROVED")
          ? "current"
          : "pending",

    datesConfirmed:
      hasDates || hasReachedStatus(status, "IN_PROGRESS")
        ? "completed"
        : hasReachedStatus(status, "SCHEDULED")
          ? "current"
          : "pending",

    reviewStarted: hasReachedStatus(status, "REPORT_DRAFTING")
      ? "completed"
      : hasReachedStatus(status, "IN_PROGRESS")
        ? "current"
        : "pending",

    fieldworkComplete: hasReachedStatus(status, "REPORT_DRAFTING")
      ? "completed"
      : status === "IN_PROGRESS"
        ? "current"
        : "pending",

    reportDrafted:
      review.report?.draftedAt || hasReachedStatus(status, "REPORT_REVIEW")
        ? "completed"
        : status === "REPORT_DRAFTING"
          ? "current"
          : "pending",

    reportFinalized:
      review.report?.finalizedAt || hasReachedStatus(status, "COMPLETED")
        ? "completed"
        : status === "REPORT_REVIEW"
          ? "current"
          : "pending",

    reviewClosed:
      status === "COMPLETED"
        ? "completed"
        : status === "REPORT_REVIEW"
          ? "current"
          : "pending",
  };
}

// =============================================================================
// DATE INFERENCE
// =============================================================================

function inferMissingDates(
  review: ReviewTimelineData,
  raw: RawDates,
  statuses: StepStatuses
): InferredDates {
  const result: InferredDates = {
    requested: raw.requested,
    approved: null,
    teamAssigned: raw.teamAssigned,
    datesConfirmed: raw.plannedStart,
    reviewStarted:
      raw.actualStart ??
      (statuses.reviewStarted !== "pending" ? raw.plannedStart : null),
    fieldworkComplete:
      raw.actualEnd ??
      (statuses.fieldworkComplete !== "pending" ? raw.plannedEnd : null),
    reportDrafted: raw.reportDrafted,
    reportFinalized: raw.reportFinalized,
    reviewClosed: null,
  };

  // Infer approval date
  if (statuses.approved === "completed" && !result.approved && raw.requested) {
    const upperBound = minDate(
      result.teamAssigned,
      result.datesConfirmed,
      result.reviewStarted
    );
    const estimated = addDays(raw.requested, 5);
    result.approved =
      upperBound && estimated > upperBound ? raw.requested : estimated;
  }

  // Infer review closed date
  if (statuses.reviewClosed === "completed" && !result.reviewClosed) {
    result.reviewClosed =
      result.reportFinalized ?? result.reportDrafted ?? raw.reviewUpdated;
  }

  // Infer report finalized
  if (statuses.reportFinalized === "completed" && !result.reportFinalized) {
    result.reportFinalized = result.reportDrafted
      ? addDays(result.reportDrafted, 3)
      : result.reviewClosed;
  }

  return result;
}

// =============================================================================
// CHRONOLOGICAL VALIDATION
// =============================================================================

function getRawForKey(key: keyof InferredDates, raw: RawDates): Date | null {
  const mapping: Record<keyof InferredDates, keyof RawDates | null> = {
    requested: "requested",
    approved: null,
    teamAssigned: "teamAssigned",
    datesConfirmed: "plannedStart",
    reviewStarted: "actualStart",
    fieldworkComplete: "actualEnd",
    reportDrafted: "reportDrafted",
    reportFinalized: "reportFinalized",
    reviewClosed: null,
  };
  const rawKey = mapping[key];
  return rawKey ? raw[rawKey] : null;
}

function validateChronology(
  dates: InferredDates,
  raw: RawDates
): Record<keyof InferredDates, ValidatedDate> {
  const keys: (keyof InferredDates)[] = [
    "requested",
    "approved",
    "teamAssigned",
    "datesConfirmed",
    "reviewStarted",
    "fieldworkComplete",
    "reportDrafted",
    "reportFinalized",
    "reviewClosed",
  ];

  // Recorded fields (not inferred)
  const recordedFields = new Set<keyof InferredDates>([
    "requested",
    "datesConfirmed",
    "reviewStarted",
    "fieldworkComplete",
    "reportDrafted",
    "reportFinalized",
  ]);

  const result: Partial<Record<keyof InferredDates, ValidatedDate>> = {};
  let lastValidDate: Date | null = null;

  for (const key of keys) {
    const date = dates[key];
    const hasChronologyIssue = !!(
      date &&
      lastValidDate &&
      date < lastValidDate
    );
    const isInferred =
      !recordedFields.has(key) || dates[key] !== getRawForKey(key, raw);

    result[key] = { date, isInferred, hasChronologyIssue };

    if (date && !hasChronologyIssue) {
      lastValidDate = date;
    }
  }

  return result as Record<keyof InferredDates, ValidatedDate>;
}

// =============================================================================
// BUILD STEPS
// =============================================================================

function buildSteps(
  review: ReviewTimelineData,
  statuses: StepStatuses,
  validated: Record<keyof InferredDates, ValidatedDate>,
  raw: RawDates
): TimelineStep[] {
  const findingsCount =
    review.findings?.length ?? review._count?.findings ?? 0;
  const teamCount =
    review.teamMembers?.length ?? review._count?.teamMembers ?? 0;

  const formatSafe = (vd: ValidatedDate): string | null => {
    if (!vd.date || vd.hasChronologyIssue) return null;
    return format(vd.date, "MMMM d, yyyy");
  };

  const dateRange =
    raw.plannedStart && raw.plannedEnd
      ? `${format(raw.plannedStart, "MMM d, yyyy")} — ${format(raw.plannedEnd, "MMM d, yyyy")}`
      : null;

  return [
    {
      id: "requested",
      labelKey: "requestSubmitted",
      status: statuses.requested,
      date: validated.requested.date,
      displayDate: formatSafe(validated.requested),
      details: null,
      isInferred: validated.requested.isInferred,
      hasChronologyIssue: validated.requested.hasChronologyIssue,
    },
    {
      id: "approved",
      labelKey: "requestApproved",
      status: statuses.approved,
      date: validated.approved.date,
      displayDate: formatSafe(validated.approved),
      details: null,
      isInferred: validated.approved.isInferred,
      hasChronologyIssue: validated.approved.hasChronologyIssue,
    },
    {
      id: "teamAssigned",
      labelKey: "teamAssigned",
      status: statuses.teamAssigned,
      date: validated.teamAssigned.date,
      displayDate: validated.teamAssigned.hasChronologyIssue
        ? null
        : formatSafe(validated.teamAssigned),
      details: teamCount > 0 ? `${teamCount} team members` : null,
      isInferred: validated.teamAssigned.isInferred,
      hasChronologyIssue: validated.teamAssigned.hasChronologyIssue,
    },
    {
      id: "datesConfirmed",
      labelKey: "datesConfirmed",
      status: statuses.datesConfirmed,
      date: validated.datesConfirmed.date,
      displayDate: formatSafe(validated.datesConfirmed),
      details: dateRange,
      isInferred: validated.datesConfirmed.isInferred,
      hasChronologyIssue: validated.datesConfirmed.hasChronologyIssue,
    },
    {
      id: "reviewStarted",
      labelKey: "reviewStarted",
      status: statuses.reviewStarted,
      date: validated.reviewStarted.date,
      displayDate: formatSafe(validated.reviewStarted),
      details: null,
      isInferred: validated.reviewStarted.isInferred,
      hasChronologyIssue: validated.reviewStarted.hasChronologyIssue,
    },
    {
      id: "fieldworkComplete",
      labelKey: "fieldworkComplete",
      status: statuses.fieldworkComplete,
      date: validated.fieldworkComplete.date,
      displayDate: formatSafe(validated.fieldworkComplete),
      details: findingsCount > 0 ? `${findingsCount} findings` : null,
      isInferred: validated.fieldworkComplete.isInferred,
      hasChronologyIssue: validated.fieldworkComplete.hasChronologyIssue,
    },
    {
      id: "reportDrafted",
      labelKey: "reportDrafted",
      status: statuses.reportDrafted,
      date: validated.reportDrafted.date,
      displayDate: formatSafe(validated.reportDrafted),
      details: null,
      isInferred: validated.reportDrafted.isInferred,
      hasChronologyIssue: validated.reportDrafted.hasChronologyIssue,
    },
    {
      id: "reportFinalized",
      labelKey: "reportFinalized",
      status: statuses.reportFinalized,
      date: validated.reportFinalized.date,
      displayDate: formatSafe(validated.reportFinalized),
      details: null,
      isInferred: validated.reportFinalized.isInferred,
      hasChronologyIssue: validated.reportFinalized.hasChronologyIssue,
    },
    {
      id: "reviewClosed",
      labelKey: "reviewClosed",
      status: statuses.reviewClosed,
      date: validated.reviewClosed.date,
      displayDate: formatSafe(validated.reviewClosed),
      details: null,
      isInferred: validated.reviewClosed.isInferred,
      hasChronologyIssue: validated.reviewClosed.hasChronologyIssue,
    },
  ];
}

// =============================================================================
// MAIN RESOLVER
// =============================================================================

export function resolveTimelineData(
  review: ReviewTimelineData
): ResolvedTimelineData {
  const raw = extractRawDates(review);
  const statuses = resolveStatuses(review, raw);
  const inferred = inferMissingDates(review, raw, statuses);
  const validated = validateChronology(inferred, raw);
  const steps = buildSteps(review, statuses, validated, raw);

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const currentStepId = steps.find((s) => s.status === "current")?.id ?? null;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    currentStepId,
  };
}
