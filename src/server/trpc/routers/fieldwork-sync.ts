import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  FindingSeverity,
  FindingType,
  DocumentCategory,
  type PrismaClient,
} from "@prisma/client";
import {
  uploadFile,
  generateFilePath,
  isStorageConfigured,
} from "@/server/services/storage.service";

// =============================================================================
// Constants
// =============================================================================

const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10 MB decoded

// =============================================================================
// Input schemas
// =============================================================================

const syncChecklistItemSchema = z.object({
  itemId: z.string(),
  reviewId: z.string(),
  isCompleted: z.boolean(),
  completedAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional(),
  clientUpdatedAt: z.coerce.date(),
});

const uploadEvidenceSchema = z.object({
  checklistItemId: z.string(),
  reviewId: z.string(),
  type: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number().max(MAX_BASE64_SIZE),
  gpsLatitude: z.number().optional().nullable(),
  gpsLongitude: z.number().optional().nullable(),
  gpsAccuracy: z.number().optional().nullable(),
  capturedAt: z.coerce.date(),
  caption: z.string().optional(),
  base64Data: z.string(),
});

const syncDraftFindingSchema = z.object({
  clientId: z.string(),
  reviewId: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.nativeEnum(FindingSeverity),
  areaCode: z.string().optional(),
  questionId: z.string().optional().nullable(),
  evidenceDocumentIds: z.array(z.string()).optional(),
  gpsLatitude: z.number().optional().nullable(),
  gpsLongitude: z.number().optional().nullable(),
});

const getReviewOfflineDataSchema = z.object({
  reviewId: z.string(),
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Verify the current user is a team member of the given review.
 * Throws FORBIDDEN if not.
 */
async function verifyTeamMembership(
  db: PrismaClient,
  userId: string,
  reviewId: string
): Promise<void> {
  const member = await db.reviewTeamMember.findUnique({
    where: { reviewId_userId: { reviewId, userId } },
  });

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this review team",
    });
  }
}

/**
 * Generate a unique finding reference number.
 * Format: FND-{ORG_CODE}-{YEAR}-{SEQUENCE}
 */
async function generateFindingReference(
  db: PrismaClient,
  organizationId: string,
  reviewId: string
): Promise<string> {
  const [org, count] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { organizationCode: true },
    }),
    db.finding.count({ where: { reviewId } }),
  ]);

  const orgCode = org?.organizationCode || "UNK";
  const year = new Date().getFullYear();
  const sequence = String(count + 1).padStart(3, "0");

  return `FND-${orgCode}-${year}-${sequence}`;
}

// =============================================================================
// Router
// =============================================================================

export const fieldworkSyncRouter = router({
  // ---------------------------------------------------------------------------
  // syncChecklistItem — update with conflict detection
  // ---------------------------------------------------------------------------

  syncChecklistItem: protectedProcedure
    .input(syncChecklistItemSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyTeamMembership(ctx.db, ctx.session.user.id, input.reviewId);

      const item = await ctx.db.fieldworkChecklistItem.findUnique({
        where: { id: input.itemId },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Checklist item not found",
        });
      }

      // Conflict detection: server wins if its data is newer
      if (item.updatedAt > input.clientUpdatedAt) {
        return {
          status: "conflict" as const,
          serverData: {
            id: item.id,
            isCompleted: item.isCompleted,
            completedAt: item.completedAt,
            updatedAt: item.updatedAt,
          },
        };
      }

      const updated = await ctx.db.fieldworkChecklistItem.update({
        where: { id: input.itemId },
        data: {
          isCompleted: input.isCompleted,
          completedAt: input.completedAt ?? null,
          completedById: input.isCompleted ? ctx.session.user.id : null,
        },
      });

      return {
        status: "synced" as const,
        data: {
          id: updated.id,
          isCompleted: updated.isCompleted,
          completedAt: updated.completedAt,
          updatedAt: updated.updatedAt,
        },
      };
    }),

  // ---------------------------------------------------------------------------
  // uploadEvidence — base64 → Supabase Storage → Document record
  // ---------------------------------------------------------------------------

  uploadEvidence: protectedProcedure
    .input(uploadEvidenceSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyTeamMembership(ctx.db, ctx.session.user.id, input.reviewId);

      if (!isStorageConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Storage is not configured",
        });
      }

      // Decode base64
      const buffer = Buffer.from(input.base64Data, "base64");
      if (buffer.length > MAX_BASE64_SIZE) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "File exceeds 10 MB limit",
        });
      }

      // Upload to Supabase Storage
      const filePath = generateFilePath(
        input.reviewId,
        "fieldwork-evidence",
        input.fileName
      );

      const uploadResult = await uploadFile(buffer, filePath, input.mimeType);

      if (!uploadResult.success || !uploadResult.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: uploadResult.error ?? "Failed to upload evidence",
        });
      }

      // Create Document record
      const document = await ctx.db.document.create({
        data: {
          name: input.fileName,
          originalName: input.fileName,
          description: input.caption ?? null,
          fileUrl: uploadResult.url,
          fileType: input.mimeType,
          fileSize: buffer.length,
          category: DocumentCategory.EVIDENCE,
          tags: [
            "fieldwork",
            input.type.toLowerCase(),
            ...(input.gpsLatitude != null
              ? [`geo:${input.gpsLatitude},${input.gpsLongitude}`]
              : []),
          ],
          reviewId: input.reviewId,
          uploadedById: ctx.session.user.id,
          uploadedAt: input.capturedAt,
        },
      });

      return {
        status: "synced" as const,
        documentId: document.id,
        url: uploadResult.url,
      };
    }),

  // ---------------------------------------------------------------------------
  // syncDraftFinding — create Finding with idempotency
  // ---------------------------------------------------------------------------

  syncDraftFinding: protectedProcedure
    .input(syncDraftFindingSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyTeamMembership(ctx.db, ctx.session.user.id, input.reviewId);

      // Idempotency check: look for existing finding with this clientId
      // stored in icaoReference as "OFFLINE:{clientId}"
      const idempotencyKey = `OFFLINE:${input.clientId}`;
      const existing = await ctx.db.finding.findFirst({
        where: {
          reviewId: input.reviewId,
          icaoReference: idempotencyKey,
        },
        select: { id: true, referenceNumber: true },
      });

      if (existing) {
        return {
          status: "already_synced" as const,
          findingId: existing.id,
          referenceNumber: existing.referenceNumber,
        };
      }

      // Get review to find host organization
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        select: { hostOrganizationId: true },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Generate reference number
      const referenceNumber = await generateFindingReference(
        ctx.db,
        review.hostOrganizationId,
        input.reviewId
      );

      // Build GPS evidence string
      const gpsEvidence =
        input.gpsLatitude != null && input.gpsLongitude != null
          ? `GPS: ${input.gpsLatitude}, ${input.gpsLongitude}`
          : null;

      // Create finding
      const finding = await ctx.db.finding.create({
        data: {
          reviewId: input.reviewId,
          organizationId: review.hostOrganizationId,
          questionId: input.questionId ?? null,
          referenceNumber,
          findingType: FindingType.OBSERVATION,
          severity: input.severity,
          titleEn: input.title,
          titleFr: input.title, // Offline draft — same text for both
          descriptionEn: input.description,
          descriptionFr: input.description, // Offline draft — same text for both
          evidenceEn: gpsEvidence,
          icaoReference: idempotencyKey,
          status: "OPEN",
          identifiedAt: new Date(),
          capRequired: input.severity !== "OBSERVATION",
          ...(input.evidenceDocumentIds?.length
            ? {
                documents: {
                  connect: input.evidenceDocumentIds.map((id) => ({ id })),
                },
              }
            : {}),
        },
      });

      return {
        status: "synced" as const,
        findingId: finding.id,
        referenceNumber: finding.referenceNumber,
      };
    }),

  // ---------------------------------------------------------------------------
  // getReviewOfflineData — prefetch for offline caching
  // ---------------------------------------------------------------------------

  getReviewOfflineData: protectedProcedure
    .input(getReviewOfflineDataSchema)
    .query(async ({ ctx, input }) => {
      await verifyTeamMembership(ctx.db, ctx.session.user.id, input.reviewId);

      const [review, checklistItems, findings, teamMembers] =
        await Promise.all([
          ctx.db.review.findUnique({
            where: { id: input.reviewId },
            select: {
              id: true,
              referenceNumber: true,
              status: true,
              phase: true,
              hostOrganizationId: true,
              hostOrganization: {
                select: {
                  id: true,
                  nameEn: true,
                  nameFr: true,
                  organizationCode: true,
                },
              },
              areasInScope: true,
              questionnairesInScope: true,
              plannedStartDate: true,
              plannedEndDate: true,
            },
          }),

          ctx.db.fieldworkChecklistItem.findMany({
            where: { reviewId: input.reviewId },
            orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
          }),

          ctx.db.finding.findMany({
            where: { reviewId: input.reviewId },
            select: {
              id: true,
              referenceNumber: true,
              titleEn: true,
              titleFr: true,
              severity: true,
              status: true,
              icaoReference: true,
            },
            orderBy: { createdAt: "desc" },
          }),

          ctx.db.reviewTeamMember.findMany({
            where: { reviewId: input.reviewId },
            select: {
              id: true,
              userId: true,
              role: true,
              assignedAreas: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          }),
        ]);

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      return {
        review,
        checklistItems,
        findings,
        teamMembers,
      };
    }),
});
