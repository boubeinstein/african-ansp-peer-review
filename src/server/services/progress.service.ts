/**
 * Progress Service
 *
 * Handles assessment progress tracking, event logging,
 * activity timeline, and organization-level analytics.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type {
  EventType,
  AssessmentStatus,
  AssessmentType,
} from "@prisma/client";
import {
  isANSResponseAnswered,
  isSMSResponseAnswered,
} from "@/lib/utils/assessment-helpers";

// =============================================================================
// TYPES
// =============================================================================

export interface ProgressStats {
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  percentComplete: number;
  byCategory: CategoryProgressStats[];
}

export interface CategoryProgressStats {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  totalQuestions: number;
  answeredQuestions: number;
  percentComplete: number;
}

export interface AssessmentEvent {
  id: string;
  type: EventType;
  description: string;
  metadata: Record<string, unknown> | null;
  userId: string;
  userName: string;
  createdAt: Date;
}

export interface AssessmentTimeline {
  events: AssessmentEvent[];
  totalCount: number;
  hasMore: boolean;
}

export interface OrganizationAnalytics {
  totalAssessments: number;
  completedAssessments: number;
  inProgressAssessments: number;
  averageCompletion: number;
  averageScore: number | null;
  byStatus: Record<AssessmentStatus, number>;
  byType: Record<AssessmentType, number>;
  recentActivity: AssessmentEvent[];
  completionTrend: CompletionTrendPoint[];
}

export interface CompletionTrendPoint {
  date: string;
  completed: number;
  total: number;
}

export interface DashboardStats {
  assessments: {
    total: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  responses: {
    total: number;
    thisWeek: number;
  };
  documents: {
    total: number;
    thisWeek: number;
  };
  activity: AssessmentEvent[];
}

export interface CreateEventInput {
  assessmentId: string;
  type: EventType;
  description: string;
  metadata?: Record<string, unknown>;
  userId: string;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

class ProgressService {
  /**
   * Calculate progress statistics for an assessment
   */
  async getAssessmentProgress(assessmentId: string): Promise<ProgressStats> {
    // Get assessment with questionnaire categories
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questionnaire: {
          include: {
            categories: {
              orderBy: { sortOrder: "asc" },
            },
            questions: {
              where: { isActive: true },
            },
          },
        },
        responses: true,
      },
    });

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    const totalQuestions = assessment.questionnaire.questions.length;
    const questionnaireType = assessment.questionnaire.type;

    // Use centralized helper for consistent answered counting
    const answeredResponses = assessment.responses.filter((r) => {
      if (questionnaireType === "ANS_USOAP_CMA") {
        return isANSResponseAnswered(r.responseValue);
      }
      return isSMSResponseAnswered(r.maturityLevel);
    });
    const answeredQuestions = answeredResponses.length;
    const unansweredQuestions = totalQuestions - answeredQuestions;
    const percentComplete =
      totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

    // Calculate by category - use centralized helper
    const byCategory: CategoryProgressStats[] =
      assessment.questionnaire.categories.map((category) => {
        const categoryQuestions = assessment.questionnaire.questions.filter(
          (q) => q.categoryId === category.id
        );
        const categoryAnswered = assessment.responses.filter((r) => {
          if (!categoryQuestions.some((q) => q.id === r.questionId)) {
            return false;
          }
          if (questionnaireType === "ANS_USOAP_CMA") {
            return isANSResponseAnswered(r.responseValue);
          }
          return isSMSResponseAnswered(r.maturityLevel);
        });

        return {
          categoryId: category.id,
          categoryCode: category.code,
          categoryName: category.nameEn,
          totalQuestions: categoryQuestions.length,
          answeredQuestions: categoryAnswered.length,
          percentComplete:
            categoryQuestions.length > 0
              ? Math.round(
                  (categoryAnswered.length / categoryQuestions.length) * 100
                )
              : 0,
        };
      });

    return {
      totalQuestions,
      answeredQuestions,
      unansweredQuestions,
      percentComplete,
      byCategory,
    };
  }

  /**
   * Update assessment progress percentage in the database
   */
  async updateAssessmentProgress(assessmentId: string): Promise<number> {
    const stats = await this.getAssessmentProgress(assessmentId);

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { progress: stats.percentComplete },
    });

    return stats.percentComplete;
  }

  /**
   * Log an assessment event
   */
  async logEvent(input: CreateEventInput): Promise<void> {
    await prisma.assessmentEvent.create({
      data: {
        assessmentId: input.assessmentId,
        type: input.type,
        description: input.description,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        userId: input.userId,
      },
    });
  }

  /**
   * Get timeline of events for an assessment
   */
  async getAssessmentTimeline(
    assessmentId: string,
    limit = 20,
    offset = 0
  ): Promise<AssessmentTimeline> {
    const [events, totalCount] = await Promise.all([
      prisma.assessmentEvent.findMany({
        where: { assessmentId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.assessmentEvent.count({
        where: { assessmentId },
      }),
    ]);

    return {
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        description: e.description,
        metadata: e.metadata as Record<string, unknown> | null,
        userId: e.userId,
        userName: `${e.user.firstName} ${e.user.lastName}`,
        createdAt: e.createdAt,
      })),
      totalCount,
      hasMore: offset + events.length < totalCount,
    };
  }

  /**
   * Get organization-level analytics
   */
  async getOrganizationAnalytics(
    organizationId: string
  ): Promise<OrganizationAnalytics> {
    // Get all assessments for the organization
    const assessments = await prisma.assessment.findMany({
      where: { organizationId },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const totalAssessments = assessments.length;
    const completedAssessments = assessments.filter(
      (a) => a.status === "COMPLETED"
    ).length;
    const inProgressAssessments = assessments.filter(
      (a) => a.status === "DRAFT" || a.status === "SUBMITTED"
    ).length;

    // Calculate averages
    const averageCompletion =
      totalAssessments > 0
        ? Math.round(
            assessments.reduce((sum, a) => sum + a.progress, 0) /
              totalAssessments
          )
        : 0;

    const scoredAssessments = assessments.filter(
      (a) => a.overallScore !== null
    );
    const averageScore =
      scoredAssessments.length > 0
        ? Math.round(
            (scoredAssessments.reduce(
              (sum, a) => sum + (a.overallScore ?? 0),
              0
            ) /
              scoredAssessments.length) *
              100
          ) / 100
        : null;

    // Count by status
    const byStatus: Record<AssessmentStatus, number> = {
      DRAFT: 0,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      COMPLETED: 0,
      ARCHIVED: 0,
    };
    assessments.forEach((a) => {
      byStatus[a.status]++;
    });

    // Count by type
    const byType: Record<AssessmentType, number> = {
      SELF_ASSESSMENT: 0,
      PEER_REVIEW: 0,
      GAP_ANALYSIS: 0,
      FOLLOW_UP: 0,
    };
    assessments.forEach((a) => {
      byType[a.type]++;
    });

    // Gather recent activity across all assessments
    const recentActivity: AssessmentEvent[] = assessments
      .flatMap((a) =>
        a.events.map((e) => ({
          id: e.id,
          type: e.type,
          description: e.description,
          metadata: e.metadata as Record<string, unknown> | null,
          userId: e.userId,
          userName: `${e.user.firstName} ${e.user.lastName}`,
          createdAt: e.createdAt,
        }))
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    // Calculate completion trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completionTrend = await this.getCompletionTrend(
      organizationId,
      thirtyDaysAgo
    );

    return {
      totalAssessments,
      completedAssessments,
      inProgressAssessments,
      averageCompletion,
      averageScore,
      byStatus,
      byType,
      recentActivity,
      completionTrend,
    };
  }

  /**
   * Get completion trend data
   */
  private async getCompletionTrend(
    organizationId: string,
    since: Date
  ): Promise<CompletionTrendPoint[]> {
    // Get completed assessments grouped by day
    const completedByDay = await prisma.assessment.groupBy({
      by: ["completedAt"],
      where: {
        organizationId,
        status: "COMPLETED",
        completedAt: {
          gte: since,
        },
      },
      _count: true,
    });

    // Get total assessments by creation date
    const totalByDay = await prisma.assessment.groupBy({
      by: ["createdAt"],
      where: {
        organizationId,
        createdAt: {
          gte: since,
        },
      },
      _count: true,
    });

    // Build trend data
    const trend: Map<string, CompletionTrendPoint> = new Map();
    const today = new Date();

    for (let d = new Date(since); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      trend.set(dateStr, { date: dateStr, completed: 0, total: 0 });
    }

    completedByDay.forEach((item) => {
      if (item.completedAt) {
        const dateStr = item.completedAt.toISOString().split("T")[0];
        const point = trend.get(dateStr);
        if (point) {
          point.completed = item._count;
        }
      }
    });

    totalByDay.forEach((item) => {
      const dateStr = item.createdAt.toISOString().split("T")[0];
      const point = trend.get(dateStr);
      if (point) {
        point.total = item._count;
      }
    });

    return Array.from(trend.values());
  }

  /**
   * Get dashboard statistics for a user
   */
  async getDashboardStats(
    userId: string,
    organizationId?: string
  ): Promise<DashboardStats> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build where clause
    const assessmentWhere = organizationId
      ? { organizationId }
      : undefined;

    // Get assessment counts
    const [
      totalAssessments,
      inProgressAssessments,
      completedAssessments,
      overdueAssessments,
    ] = await Promise.all([
      prisma.assessment.count({ where: assessmentWhere }),
      prisma.assessment.count({
        where: {
          ...assessmentWhere,
          status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] },
        },
      }),
      prisma.assessment.count({
        where: { ...assessmentWhere, status: "COMPLETED" },
      }),
      prisma.assessment.count({
        where: {
          ...assessmentWhere,
          status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] },
          dueDate: { lt: now },
        },
      }),
    ]);

    // Get response counts
    const [totalResponses, weeklyResponses] = await Promise.all([
      prisma.assessmentResponse.count({
        where: organizationId
          ? { assessment: { organizationId } }
          : undefined,
      }),
      prisma.assessmentResponse.count({
        where: {
          ...(organizationId
            ? { assessment: { organizationId } }
            : undefined),
          updatedAt: { gte: oneWeekAgo },
        },
      }),
    ]);

    // Get document counts
    const [totalDocuments, weeklyDocuments] = await Promise.all([
      prisma.document.count({
        where: {
          ...(organizationId ? { organizationId } : undefined),
          isDeleted: false,
        },
      }),
      prisma.document.count({
        where: {
          ...(organizationId ? { organizationId } : undefined),
          isDeleted: false,
          createdAt: { gte: oneWeekAgo },
        },
      }),
    ]);

    // Get recent activity
    const recentEvents = await prisma.assessmentEvent.findMany({
      where: organizationId
        ? { assessment: { organizationId } }
        : undefined,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      assessments: {
        total: totalAssessments,
        inProgress: inProgressAssessments,
        completed: completedAssessments,
        overdue: overdueAssessments,
      },
      responses: {
        total: totalResponses,
        thisWeek: weeklyResponses,
      },
      documents: {
        total: totalDocuments,
        thisWeek: weeklyDocuments,
      },
      activity: recentEvents.map((e) => ({
        id: e.id,
        type: e.type,
        description: e.description,
        metadata: e.metadata as Record<string, unknown> | null,
        userId: e.userId,
        userName: `${e.user.firstName} ${e.user.lastName}`,
        createdAt: e.createdAt,
      })),
    };
  }

  /**
   * Get assessment summary with progress
   */
  async getAssessmentSummary(assessmentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        organization: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
          },
        },
        questionnaire: {
          select: {
            id: true,
            titleEn: true,
            titleFr: true,
            type: true,
          },
        },
        _count: {
          select: {
            responses: true,
            events: true,
            documents: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    const progress = await this.getAssessmentProgress(assessmentId);

    return {
      ...assessment,
      progressStats: progress,
    };
  }

  /**
   * Get assessments needing attention (overdue, stalled)
   */
  async getAssessmentsNeedingAttention(
    organizationId?: string,
    limit = 10
  ): Promise<
    Array<{
      id: string;
      title: string;
      status: AssessmentStatus;
      progress: number;
      dueDate: Date | null;
      lastActivity: Date | null;
      reason: "overdue" | "stalled";
    }>
  > {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const where = organizationId ? { organizationId } : {};

    // Get overdue assessments
    const overdueAssessments = await prisma.assessment.findMany({
      where: {
        ...where,
        status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] },
        dueDate: { lt: now },
      },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        dueDate: true,
        updatedAt: true,
      },
      orderBy: { dueDate: "asc" },
      take: limit,
    });

    // Get stalled assessments (no activity in 7 days)
    const stalledAssessments = await prisma.assessment.findMany({
      where: {
        ...where,
        status: { in: ["DRAFT", "SUBMITTED"] },
        updatedAt: { lt: sevenDaysAgo },
        dueDate: { gte: now }, // Not overdue
      },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        dueDate: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
    });

    const result = [
      ...overdueAssessments.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        progress: a.progress,
        dueDate: a.dueDate,
        lastActivity: a.updatedAt as Date | null,
        reason: "overdue" as const,
      })),
      ...stalledAssessments.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        progress: a.progress,
        dueDate: a.dueDate,
        lastActivity: a.updatedAt as Date | null,
        reason: "stalled" as const,
      })),
    ];

    return result.slice(0, limit);
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const progressService = new ProgressService();
