/**
 * Retrospective Analytics tRPC Router
 *
 * Aggregate insights across all retrospectives and lessons.
 * Restricted to SUPER_ADMIN and PROGRAMME_COORDINATOR roles.
 */

import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { RetrospectiveStatus, LessonStatus } from "@prisma/client";

// =============================================================================
// HELPERS
// =============================================================================

const ADMIN_ROLES = ["SUPER_ADMIN", "PROGRAMME_COORDINATOR"];

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ADMIN_ROLES.includes(ctx.session.user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only programme coordinators and admins can access analytics",
    });
  }
  return next();
});

// English stop words to filter from word frequency analysis
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "shall", "this", "that",
  "these", "those", "it", "its", "not", "no", "more", "very", "also",
  "than", "other", "some", "such", "all", "each", "every", "both",
  "few", "many", "much", "most", "own", "same", "so", "just", "about",
  "le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "est",
  "sont", "avec", "pour", "dans", "sur", "par", "plus", "pas", "qui",
  "que", "ce", "cette", "ces", "il", "elle", "nous", "vous", "ils",
]);

// =============================================================================
// ROUTER
// =============================================================================

export const retrospectiveAnalyticsRouter = router({
  /**
   * Overview metrics
   */
  getOverview: adminProcedure.query(async ({ ctx }) => {
    const [
      totalReviews,
      totalWithRetro,
      retrospectives,
      totalLessons,
      publishedLessons,
      totalVotes,
      topLessons,
      topContributors,
    ] = await Promise.all([
      ctx.db.review.count(),
      ctx.db.reviewRetrospective.count({
        where: { status: RetrospectiveStatus.SUBMITTED },
      }),
      ctx.db.reviewRetrospective.findMany({
        where: { status: RetrospectiveStatus.SUBMITTED },
        select: {
          processRating: true,
          whatWentWell: true,
          areasForImprovement: true,
          keyLearnings: true,
          programmeSuggestions: true,
        },
      }),
      ctx.db.lessonLearned.count(),
      ctx.db.lessonLearned.count({
        where: { status: LessonStatus.PUBLISHED },
      }),
      ctx.db.lessonVote.count(),
      ctx.db.lessonLearned.findMany({
        where: { status: LessonStatus.PUBLISHED },
        orderBy: { helpfulCount: "desc" },
        take: 5,
        select: {
          id: true,
          titleEn: true,
          titleFr: true,
          category: true,
          helpfulCount: true,
          viewCount: true,
          author: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      ctx.db.lessonLearned.groupBy({
        by: ["authorId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    // Compute avg process rating
    const avgProcessRating =
      retrospectives.length > 0
        ? retrospectives.reduce((sum, r) => sum + r.processRating, 0) /
          retrospectives.length
        : 0;

    // Compute section completion %
    const allSectionsFilled = retrospectives.filter(
      (r) =>
        r.whatWentWell.length > 0 &&
        r.areasForImprovement.length > 0 &&
        r.keyLearnings.length > 0 &&
        r.programmeSuggestions &&
        r.programmeSuggestions.length > 0
    ).length;
    const completionRate =
      retrospectives.length > 0
        ? (allSectionsFilled / retrospectives.length) * 100
        : 0;

    // Resolve top contributor names
    const contributorIds = topContributors.map((c) => c.authorId);
    const contributorUsers =
      contributorIds.length > 0
        ? await ctx.db.user.findMany({
            where: { id: { in: contributorIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const contributorMap = new Map(
      contributorUsers.map((u) => [u.id, u])
    );

    return {
      totalReviews,
      totalWithRetro,
      submissionRate:
        totalReviews > 0
          ? ((totalWithRetro / totalReviews) * 100).toFixed(1)
          : "0",
      avgProcessRating: parseFloat(avgProcessRating.toFixed(2)),
      completionRate: parseFloat(completionRate.toFixed(1)),
      totalLessons,
      publishedLessons,
      totalVotes,
      topLessons,
      topContributors: topContributors.map((c) => ({
        userId: c.authorId,
        name: contributorMap.has(c.authorId)
          ? `${contributorMap.get(c.authorId)!.firstName} ${contributorMap.get(c.authorId)!.lastName}`
          : "Unknown",
        lessonCount: c._count.id,
      })),
    };
  }),

  /**
   * Process rating trends by month
   */
  getProcessRatingTrends: adminProcedure.query(async ({ ctx }) => {
    const retrospectives = await ctx.db.reviewRetrospective.findMany({
      where: { status: RetrospectiveStatus.SUBMITTED },
      select: {
        submittedAt: true,
        processRating: true,
        preparationEffective: true,
        onSiteEffective: true,
        reportingEffective: true,
      },
      orderBy: { submittedAt: "asc" },
    });

    // Group by month
    const monthly = new Map<
      string,
      {
        ratings: number[];
        prep: number[];
        onsite: number[];
        reporting: number[];
      }
    >();

    for (const r of retrospectives) {
      const key = `${r.submittedAt.getFullYear()}-${String(r.submittedAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly.has(key)) {
        monthly.set(key, {
          ratings: [],
          prep: [],
          onsite: [],
          reporting: [],
        });
      }
      const bucket = monthly.get(key)!;
      bucket.ratings.push(r.processRating);
      if (r.preparationEffective !== null)
        bucket.prep.push(r.preparationEffective ? 1 : 0);
      if (r.onSiteEffective !== null)
        bucket.onsite.push(r.onSiteEffective ? 1 : 0);
      if (r.reportingEffective !== null)
        bucket.reporting.push(r.reportingEffective ? 1 : 0);
    }

    const avg = (arr: number[]) =>
      arr.length > 0
        ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))
        : null;

    return Array.from(monthly.entries()).map(([month, data]) => ({
      month,
      avgRating: avg(data.ratings),
      prepEffective: avg(data.prep) !== null ? (avg(data.prep)! * 100) : null,
      onsiteEffective: avg(data.onsite) !== null ? (avg(data.onsite)! * 100) : null,
      reportingEffective: avg(data.reporting) !== null ? (avg(data.reporting)! * 100) : null,
      count: data.ratings.length,
    }));
  }),

  /**
   * Common themes across lessons and retrospectives
   */
  getCommonThemes: adminProcedure.query(async ({ ctx }) => {
    const [tagCounts, areaCounts, categoryCounts, retrospectives] =
      await Promise.all([
        // Most frequent tags
        ctx.db.lessonTag.groupBy({
          by: ["tag"],
          _count: { tag: true },
          orderBy: { _count: { tag: "desc" } },
          take: 20,
        }),
        // Most frequent audit area codes
        ctx.db.lessonLearned.groupBy({
          by: ["reviewArea"],
          where: {
            reviewArea: { not: null },
            status: LessonStatus.PUBLISHED,
          },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        // Most frequent categories
        ctx.db.lessonLearned.groupBy({
          by: ["category"],
          where: { status: LessonStatus.PUBLISHED },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        // Get areasForImprovement text for word frequency
        ctx.db.reviewRetrospective.findMany({
          where: { status: RetrospectiveStatus.SUBMITTED },
          select: { areasForImprovement: true },
        }),
      ]);

    // Word frequency from improvement areas
    const wordCounts = new Map<string, number>();
    for (const r of retrospectives) {
      const words = r.areasForImprovement
        .toLowerCase()
        .replace(/[^a-zàâçéèêëïîôùûüÿñæœ\s-]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    const topWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    return {
      tags: tagCounts.map((t) => ({ tag: t.tag, count: t._count.tag })),
      auditAreas: areaCounts.map((a) => ({
        code: a.reviewArea!,
        count: a._count.id,
      })),
      categories: categoryCounts.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      topWords,
    };
  }),

  /**
   * Per-region stats
   */
  getRegionalInsights: adminProcedure.query(async ({ ctx }) => {
    const reviews = await ctx.db.review.findMany({
      where: {
        retrospective: {
          status: RetrospectiveStatus.SUBMITTED,
        },
      },
      select: {
        hostOrganization: { select: { region: true } },
        retrospective: {
          select: {
            processRating: true,
            _count: { select: { lessons: true } },
          },
        },
      },
    });

    const regionStats = new Map<
      string,
      { ratings: number[]; lessonCount: number }
    >();

    for (const review of reviews) {
      const region = review.hostOrganization.region;
      const retro = review.retrospective;
      if (!retro) continue;

      if (!regionStats.has(region)) {
        regionStats.set(region, { ratings: [], lessonCount: 0 });
      }
      const stats = regionStats.get(region)!;
      stats.ratings.push(retro.processRating);
      stats.lessonCount += retro._count.lessons;
    }

    return Array.from(regionStats.entries()).map(([region, stats]) => ({
      region,
      avgRating:
        stats.ratings.length > 0
          ? parseFloat(
              (
                stats.ratings.reduce((a, b) => a + b, 0) /
                stats.ratings.length
              ).toFixed(2)
            )
          : 0,
      reviewCount: stats.ratings.length,
      lessonCount: stats.lessonCount,
    }));
  }),

  /**
   * Improvement tracking: repeat-reviewed ANSPs
   */
  getImprovementTracking: adminProcedure.query(async ({ ctx }) => {
    // Find organizations with multiple reviews that have retrospectives
    const reviews = await ctx.db.review.findMany({
      where: {
        retrospective: {
          status: RetrospectiveStatus.SUBMITTED,
        },
      },
      select: {
        id: true,
        referenceNumber: true,
        hostOrganizationId: true,
        hostOrganization: {
          select: { nameEn: true, nameFr: true },
        },
        plannedStartDate: true,
        retrospective: {
          select: { processRating: true },
        },
      },
      orderBy: { plannedStartDate: "asc" },
    });

    // Group by host org
    const byOrg = new Map<
      string,
      Array<{
        reviewId: string;
        referenceNumber: string;
        date: Date | null;
        rating: number;
      }>
    >();

    for (const r of reviews) {
      if (!r.retrospective) continue;
      const key = r.hostOrganizationId;
      if (!byOrg.has(key)) byOrg.set(key, []);
      byOrg.get(key)!.push({
        reviewId: r.id,
        referenceNumber: r.referenceNumber,
        date: r.plannedStartDate,
        rating: r.retrospective.processRating,
      });
    }

    // Only include orgs with 2+ reviews
    const results: Array<{
      orgNameEn: string;
      orgNameFr: string;
      reviews: Array<{
        referenceNumber: string;
        date: Date | null;
        rating: number;
      }>;
      ratingChange: number;
    }> = [];

    for (const [orgId, orgReviews] of byOrg) {
      if (orgReviews.length < 2) continue;
      const orgData = reviews.find(
        (r) => r.hostOrganizationId === orgId
      )!;
      const first = orgReviews[0];
      const last = orgReviews[orgReviews.length - 1];
      results.push({
        orgNameEn: orgData.hostOrganization.nameEn,
        orgNameFr: orgData.hostOrganization.nameFr,
        reviews: orgReviews.map(({ referenceNumber, date, rating }) => ({
          referenceNumber,
          date,
          rating,
        })),
        ratingChange: last.rating - first.rating,
      });
    }

    return results;
  }),
});
