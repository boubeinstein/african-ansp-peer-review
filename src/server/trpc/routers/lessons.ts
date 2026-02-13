/**
 * Lessons Learned tRPC Router
 *
 * Powers the cross-review knowledge base — searchable library of lessons
 * extracted during retrospectives. Supports full-text search, voting,
 * bookmarking, and curated "review prep" queries.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  AfricanRegion,
  ANSReviewArea,
  ImpactLevel,
  LessonApplicability,
  LessonCategory,
  LessonStatus,
  MaturityLevel,
  ReviewPhase,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  sendNotification,
} from "@/server/services/notification-service";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const searchSchema = z.object({
  query: z.string().optional(),
  retrospectiveId: z.string().optional(),
  category: z.nativeEnum(LessonCategory).optional(),
  reviewArea: z.nativeEnum(ANSReviewArea).optional(),
  soeAreaCode: z.string().optional(),
  hostRegion: z.nativeEnum(AfricanRegion).optional(),
  hostMaturityLevel: z.nativeEnum(MaturityLevel).optional(),
  reviewPhase: z.nativeEnum(ReviewPhase).optional(),
  tags: z.array(z.string()).optional(),
  applicability: z.nativeEnum(LessonApplicability).optional(),
  sortBy: z.enum(["recent", "helpful", "views"]).default("recent"),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(12),
});

const createLessonSchema = z.object({
  retrospectiveId: z.string(),
  titleEn: z.string().min(5),
  titleFr: z.string().min(5),
  contentEn: z.string().min(20),
  contentFr: z.string().min(20),
  category: z.nativeEnum(LessonCategory),
  impactLevel: z.nativeEnum(ImpactLevel).default("MODERATE"),
  applicability: z.nativeEnum(LessonApplicability).default("GENERAL"),
  reviewPhase: z.nativeEnum(ReviewPhase).optional(),
  reviewArea: z.nativeEnum(ANSReviewArea).optional(),
  soeAreaCode: z.string().optional(),
  actionableAdvice: z.string().optional(),
  estimatedTimeImpact: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isAnonymized: z.boolean().default(false),
});

const updateLessonSchema = z.object({
  id: z.string(),
  titleEn: z.string().min(5).optional(),
  titleFr: z.string().min(5).optional(),
  contentEn: z.string().min(20).optional(),
  contentFr: z.string().min(20).optional(),
  category: z.nativeEnum(LessonCategory).optional(),
  impactLevel: z.nativeEnum(ImpactLevel).optional(),
  applicability: z.nativeEnum(LessonApplicability).optional(),
  reviewPhase: z.nativeEnum(ReviewPhase).optional(),
  reviewArea: z.nativeEnum(ANSReviewArea).optional(),
  soeAreaCode: z.string().optional(),
  actionableAdvice: z.string().optional(),
  estimatedTimeImpact: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isAnonymized: z.boolean().optional(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const lessonsRouter = router({
  /**
   * Full-text search across the published lessons knowledge base
   */
  search: protectedProcedure
    .input(searchSchema)
    .query(async ({ ctx, input }) => {
      const { query, sortBy, page, pageSize, tags, retrospectiveId, ...filters } = input;

      // Build WHERE clause — only published unless scoped to a retrospective
      const where: Prisma.LessonLearnedWhereInput = {
        ...(retrospectiveId
          ? { retrospectiveId }
          : { status: LessonStatus.PUBLISHED }),
      };

      // Full-text search across bilingual fields
      if (query && query.trim().length > 0) {
        const term = query.trim();
        where.OR = [
          { titleEn: { contains: term, mode: "insensitive" } },
          { titleFr: { contains: term, mode: "insensitive" } },
          { contentEn: { contains: term, mode: "insensitive" } },
          { contentFr: { contains: term, mode: "insensitive" } },
          { actionableAdvice: { contains: term, mode: "insensitive" } },
        ];
      }

      // Classification filters
      if (filters.category) where.category = filters.category;
      if (filters.reviewArea) where.reviewArea = filters.reviewArea;
      if (filters.soeAreaCode) where.soeAreaCode = filters.soeAreaCode;
      if (filters.hostRegion) where.hostRegion = filters.hostRegion;
      if (filters.hostMaturityLevel) where.hostMaturityLevel = filters.hostMaturityLevel;
      if (filters.reviewPhase) where.reviewPhase = filters.reviewPhase;
      if (filters.applicability) where.applicability = filters.applicability;

      // Tag filter
      if (tags && tags.length > 0) {
        where.tags = { some: { tag: { in: tags } } };
      }

      // Sort order
      const orderBy: Prisma.LessonLearnedOrderByWithRelationInput =
        sortBy === "helpful"
          ? { helpfulCount: "desc" }
          : sortBy === "views"
            ? { viewCount: "desc" }
            : { publishedAt: "desc" };

      const [items, totalCount] = await Promise.all([
        ctx.db.lessonLearned.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                organization: { select: { nameEn: true, nameFr: true } },
              },
            },
            tags: { select: { id: true, tag: true, tagFr: true } },
            _count: { select: { votes: true, bookmarks: true } },
            bookmarks: {
              where: { userId: ctx.session.user.id },
              select: { id: true },
              take: 1,
            },
            votes: {
              where: { userId: ctx.session.user.id },
              select: { id: true, isHelpful: true },
              take: 1,
            },
          },
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.lessonLearned.count({ where }),
      ]);

      return {
        items: items.map((item) => ({
          ...item,
          isBookmarked: item.bookmarks.length > 0,
          currentUserVote: item.votes[0] ?? null,
          bookmarks: undefined,
          votes: undefined,
        })),
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    }),

  /**
   * Get a single lesson by ID with full context
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const lesson = await ctx.db.lessonLearned.findUnique({
        where: { id: input.id },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              organization: { select: { nameEn: true, nameFr: true } },
            },
          },
          retrospective: {
            select: {
              id: true,
              review: {
                select: {
                  id: true,
                  referenceNumber: true,
                  hostOrganization: {
                    select: { nameEn: true, nameFr: true, region: true },
                  },
                },
              },
            },
          },
          tags: { select: { id: true, tag: true, tagFr: true } },
          _count: { select: { votes: true, bookmarks: true } },
          bookmarks: {
            where: { userId: ctx.session.user.id },
            select: { id: true, notes: true },
            take: 1,
          },
          votes: {
            where: { userId: ctx.session.user.id },
            select: { id: true, isHelpful: true },
            take: 1,
          },
        },
      });

      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      }

      // Debounced view count: only increment if user hasn't viewed in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentView = await ctx.db.lessonVote.findFirst({
        where: {
          lessonId: input.id,
          userId: ctx.session.user.id,
          createdAt: { gte: oneHourAgo },
        },
        select: { id: true },
      });

      if (!recentView) {
        await ctx.db.lessonLearned.update({
          where: { id: input.id },
          data: { viewCount: { increment: 1 } },
        });
      }

      // Related lessons: same review area or same host region, limit 5
      const relatedWhere: Prisma.LessonLearnedWhereInput = {
        id: { not: input.id },
        status: LessonStatus.PUBLISHED,
        OR: [
          ...(lesson.reviewArea
            ? [{ reviewArea: lesson.reviewArea }]
            : []),
          ...(lesson.hostRegion ? [{ hostRegion: lesson.hostRegion }] : []),
        ],
      };

      const relatedLessons =
        relatedWhere.OR && (relatedWhere.OR as Prisma.LessonLearnedWhereInput[]).length > 0
          ? await ctx.db.lessonLearned.findMany({
              where: relatedWhere,
              select: {
                id: true,
                titleEn: true,
                titleFr: true,
                category: true,
                helpfulCount: true,
                hostRegion: true,
                reviewArea: true,
              },
              orderBy: { helpfulCount: "desc" },
              take: 5,
            })
          : [];

      // Strip host org name if anonymized
      const reviewContext = lesson.isAnonymized
        ? {
            ...lesson.retrospective,
            review: {
              ...lesson.retrospective.review,
              hostOrganization: null,
            },
          }
        : lesson.retrospective;

      return {
        ...lesson,
        retrospective: reviewContext,
        isBookmarked: lesson.bookmarks.length > 0,
        bookmarkNotes: lesson.bookmarks[0]?.notes ?? null,
        currentUserVote: lesson.votes[0] ?? null,
        bookmarks: undefined,
        votes: undefined,
        relatedLessons,
      };
    }),

  /**
   * Get current user's bookmarked lessons
   */
  getMyBookmarks: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;

      const [bookmarks, totalCount] = await Promise.all([
        ctx.db.lessonBookmark.findMany({
          where: { userId: ctx.session.user.id },
          include: {
            lesson: {
              include: {
                author: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    organization: { select: { nameEn: true, nameFr: true } },
                  },
                },
                tags: { select: { id: true, tag: true, tagFr: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.db.lessonBookmark.count({
          where: { userId: ctx.session.user.id },
        }),
      ]);

      return {
        items: bookmarks,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    }),

  /**
   * Get popular tags with usage counts (for tag cloud / search UI)
   */
  getPopularTags: protectedProcedure.query(async ({ ctx }) => {
    const tags = await ctx.db.lessonTag.groupBy({
      by: ["tag"],
      _count: { tag: true },
      orderBy: { _count: { tag: "desc" } },
      take: 30,
    });

    // Fetch French translations for the top tags
    const tagNames = tags.map((t) => t.tag);
    const tagRecords = await ctx.db.lessonTag.findMany({
      where: { tag: { in: tagNames } },
      select: { tag: true, tagFr: true },
      distinct: ["tag"],
    });

    const frMap = new Map(tagRecords.map((r) => [r.tag, r.tagFr]));

    return tags.map((t) => ({
      tag: t.tag,
      tagFr: frMap.get(t.tag) ?? null,
      count: t._count.tag,
    }));
  }),

  /**
   * Curated "briefing packet" — most helpful lessons relevant to an upcoming review
   */
  getForReviewPrep: protectedProcedure
    .input(
      z.object({
        hostRegion: z.nativeEnum(AfricanRegion),
        hostMaturityLevel: z.nativeEnum(MaturityLevel).optional(),
        reviewAreas: z.array(z.nativeEnum(ANSReviewArea)).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.LessonLearnedWhereInput = {
        status: LessonStatus.PUBLISHED,
        OR: [
          { hostRegion: input.hostRegion },
          { applicability: LessonApplicability.GENERAL },
          ...(input.hostMaturityLevel
            ? [
                { hostMaturityLevel: input.hostMaturityLevel },
                { applicability: LessonApplicability.MATURITY_LEVEL },
              ]
            : []),
          ...(input.reviewAreas && input.reviewAreas.length > 0
            ? [{ reviewArea: { in: input.reviewAreas } }]
            : []),
        ],
      };

      const lessons = await ctx.db.lessonLearned.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              organization: { select: { nameEn: true, nameFr: true } },
            },
          },
          tags: { select: { id: true, tag: true, tagFr: true } },
        },
        orderBy: { helpfulCount: "desc" },
        take: 20,
      });

      // Group by category
      const grouped = new Map<LessonCategory, typeof lessons>();
      for (const lesson of lessons) {
        const existing = grouped.get(lesson.category) ?? [];
        existing.push(lesson);
        grouped.set(lesson.category, existing);
      }

      return {
        total: lessons.length,
        byCategory: Object.fromEntries(grouped),
        items: lessons,
      };
    }),

  /**
   * Create a new lesson from a retrospective
   */
  create: protectedProcedure
    .input(createLessonSchema)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...data } = input;

      // Verify retrospective exists and user is author or admin
      const retrospective = await ctx.db.reviewRetrospective.findUnique({
        where: { id: input.retrospectiveId },
        include: {
          review: {
            include: {
              hostOrganization: {
                select: { region: true },
              },
              assessments: {
                where: { maturityLevel: { not: null } },
                select: { maturityLevel: true },
                orderBy: { updatedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      if (!retrospective) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Retrospective not found",
        });
      }

      const isAuthor = retrospective.submittedById === ctx.session.user.id;
      const isAdmin = ["SUPER_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.session.user.role
      );

      if (!isAuthor && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the retrospective author or admins can create lessons",
        });
      }

      // Auto-derive host region and maturity level from the review
      const hostRegion = data.isAnonymized
        ? null
        : retrospective.review.hostOrganization.region;
      const hostMaturityLevel =
        retrospective.review.assessments[0]?.maturityLevel ?? null;

      // Create lesson + tags in a transaction
      return ctx.db.$transaction(async (tx) => {
        const lesson = await tx.lessonLearned.create({
          data: {
            retrospectiveId: data.retrospectiveId,
            authorId: ctx.session.user.id,
            titleEn: data.titleEn,
            titleFr: data.titleFr,
            contentEn: data.contentEn,
            contentFr: data.contentFr,
            category: data.category,
            impactLevel: data.impactLevel,
            applicability: data.applicability,
            reviewPhase: data.reviewPhase,
            reviewArea: data.reviewArea,
            soeAreaCode: data.soeAreaCode,
            actionableAdvice: data.actionableAdvice,
            estimatedTimeImpact: data.estimatedTimeImpact,
            isAnonymized: data.isAnonymized,
            hostRegion,
            hostMaturityLevel,
          },
        });

        if (tags && tags.length > 0) {
          await tx.lessonTag.createMany({
            data: tags.map((tag) => ({
              lessonId: lesson.id,
              tag,
            })),
          });
        }

        return tx.lessonLearned.findUnique({
          where: { id: lesson.id },
          include: {
            tags: { select: { id: true, tag: true, tagFr: true } },
          },
        });
      });
    }),

  /**
   * Update a draft lesson
   */
  update: protectedProcedure
    .input(updateLessonSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...data } = input;

      const lesson = await ctx.db.lessonLearned.findUnique({
        where: { id },
      });

      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      }

      if (lesson.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft lessons can be edited",
        });
      }

      const isAuthor = lesson.authorId === ctx.session.user.id;
      const isAdmin = ["SUPER_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.session.user.role
      );

      if (!isAuthor && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the lesson author or admins can update lessons",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.lessonLearned.update({
          where: { id },
          data,
        });

        // Replace tags if provided
        if (tags !== undefined) {
          await tx.lessonTag.deleteMany({ where: { lessonId: id } });
          if (tags.length > 0) {
            await tx.lessonTag.createMany({
              data: tags.map((tag) => ({ lessonId: id, tag })),
            });
          }
        }

        return tx.lessonLearned.findUnique({
          where: { id: updated.id },
          include: {
            tags: { select: { id: true, tag: true, tagFr: true } },
          },
        });
      });
    }),

  /**
   * Vote on a lesson (helpful / not helpful). Upsert pattern.
   */
  vote: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        isHelpful: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lesson = await ctx.db.lessonLearned.findUnique({
        where: { id: input.lessonId },
        select: { id: true, helpfulCount: true },
      });

      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      }

      // Check for existing vote
      const existingVote = await ctx.db.lessonVote.findUnique({
        where: {
          lessonId_userId: {
            lessonId: input.lessonId,
            userId: ctx.session.user.id,
          },
        },
      });

      return ctx.db.$transaction(async (tx) => {
        let helpfulDelta = 0;

        if (existingVote) {
          if (existingVote.isHelpful === input.isHelpful) {
            // Same vote — remove it (toggle off)
            await tx.lessonVote.delete({ where: { id: existingVote.id } });
            helpfulDelta = existingVote.isHelpful ? -1 : 0;
          } else {
            // Changed vote
            await tx.lessonVote.update({
              where: { id: existingVote.id },
              data: { isHelpful: input.isHelpful },
            });
            helpfulDelta = input.isHelpful ? 1 : -1;
          }
        } else {
          // New vote
          await tx.lessonVote.create({
            data: {
              lessonId: input.lessonId,
              userId: ctx.session.user.id,
              isHelpful: input.isHelpful,
            },
          });
          helpfulDelta = input.isHelpful ? 1 : 0;
        }

        // Update the denormalized helpfulCount
        if (helpfulDelta !== 0) {
          await tx.lessonLearned.update({
            where: { id: input.lessonId },
            data: { helpfulCount: { increment: helpfulDelta } },
          });
        }

        // Return updated lesson counts
        const updated = await tx.lessonLearned.findUnique({
          where: { id: input.lessonId },
          select: { helpfulCount: true, viewCount: true },
        });

        return {
          helpfulCount: updated?.helpfulCount ?? 0,
          viewCount: updated?.viewCount ?? 0,
        };
      });
    }),

  /**
   * Toggle bookmark on a lesson
   */
  bookmark: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lesson = await ctx.db.lessonLearned.findUnique({
        where: { id: input.lessonId },
        select: { id: true },
      });

      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      }

      const existing = await ctx.db.lessonBookmark.findUnique({
        where: {
          lessonId_userId: {
            lessonId: input.lessonId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (existing) {
        // Toggle off — remove bookmark
        await ctx.db.lessonBookmark.delete({ where: { id: existing.id } });
        return { bookmarked: false };
      }

      // Create bookmark
      await ctx.db.lessonBookmark.create({
        data: {
          lessonId: input.lessonId,
          userId: ctx.session.user.id,
          notes: input.notes,
        },
      });

      return { bookmarked: true };
    }),

  /**
   * Update personal notes on a bookmark
   */
  updateBookmarkNotes: protectedProcedure
    .input(
      z.object({
        bookmarkId: z.string(),
        notes: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bookmark = await ctx.db.lessonBookmark.findUnique({
        where: { id: input.bookmarkId },
      });

      if (!bookmark || bookmark.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bookmark not found",
        });
      }

      return ctx.db.lessonBookmark.update({
        where: { id: input.bookmarkId },
        data: { notes: input.notes },
      });
    }),

  /**
   * Publish a draft lesson (admin/coordinator only)
   */
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ["SUPER_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.session.user.role
      );

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Programme Coordinators or Super Admins can publish lessons",
        });
      }

      const lesson = await ctx.db.lessonLearned.findUnique({
        where: { id: input.id },
      });

      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      }

      if (lesson.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lesson is already published",
        });
      }

      const published = await ctx.db.lessonLearned.update({
        where: { id: input.id },
        data: {
          status: LessonStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        include: {
          tags: { select: { id: true, tag: true, tagFr: true } },
        },
      });

      // Notify the lesson author
      if (lesson.authorId !== ctx.session.user.id) {
        const author = await ctx.db.user.findUnique({
          where: { id: lesson.authorId },
          include: {
            preferences: { select: { emailNotifications: true } },
          },
        });
        if (author) {
          await sendNotification(
            [{
              userId: author.id,
              email: author.email,
              locale: author.locale,
              emailNotifications: author.preferences?.emailNotifications ?? true,
              firstName: author.firstName,
              lastName: author.lastName,
            }],
            {
              type: "SYSTEM_ANNOUNCEMENT",
              titleEn: "Lesson Published",
              titleFr: "Leçon publiée",
              messageEn: `Your lesson "${lesson.titleEn}" has been published to the knowledge base.`,
              messageFr: `Votre leçon « ${lesson.titleFr} » a été publiée dans la base de connaissances.`,
              entityType: "LESSON",
              entityId: lesson.id,
              actionUrl: `/lessons/${lesson.id}`,
            }
          );
        }
      }

      return published;
    }),
});
