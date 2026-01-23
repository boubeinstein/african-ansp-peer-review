/**
 * Document Router
 *
 * tRPC procedures for document and evidence management.
 * Handles document CRUD operations and linking to assessment responses.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { documentService } from "@/server/services/document.service";
import { prisma } from "@/lib/db";
import { DocumentCategory } from "@prisma/client";
import {
  getSignedDownloadUrl,
  deleteFile,
  extractPathFromUrl,
} from "@/server/services/storage.service";

// All document categories as zod enum
const AllDocumentCategories = z.nativeEnum(DocumentCategory);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const CreateDocumentInput = z.object({
  name: z.string().min(1).max(255),
  originalName: z.string().optional(),
  description: z.string().max(1000).optional(),
  fileUrl: z.string().min(1).refine((val) => val.startsWith("/") || val.startsWith("http"), { message: "Must be a valid URL or path" }),
  fileType: z.string(),
  fileSize: z.number().min(0),
  category: AllDocumentCategories.optional(),
  tags: z.array(z.string()).optional(),
  language: z.enum(["EN", "FR"]).optional(),
  organizationId: z.string().cuid().optional(),
  assessmentId: z.string().cuid().optional(),
});

const CreateUrlReferenceInput = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: AllDocumentCategories.optional(),
  organizationId: z.string().cuid().optional(),
  assessmentId: z.string().cuid().optional(),
});

const LinkToResponseInput = z.object({
  documentId: z.string().cuid(),
  responseId: z.string().cuid(),
  notes: z.string().max(500).optional(),
});

const UnlinkFromResponseInput = z.object({
  documentId: z.string().cuid(),
  responseId: z.string().cuid(),
});

const GetByAssessmentInput = z.object({
  assessmentId: z.string().cuid(),
});

const GetByResponseInput = z.object({
  responseId: z.string().cuid(),
});

const GetByOrganizationInput = z.object({
  organizationId: z.string().cuid(),
  category: AllDocumentCategories.optional(),
  assessmentId: z.string().cuid().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
});

const UpdateDocumentInput = z.object({
  documentId: z.string().cuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: AllDocumentCategories.optional(),
  tags: z.array(z.string()).optional(),
  language: z.enum(["EN", "FR"]).optional(),
});

const DeleteDocumentInput = z.object({
  documentId: z.string().cuid(),
});

const GetDocumentInput = z.object({
  documentId: z.string().cuid(),
});

const CreateReviewDocumentInput = z.object({
  reviewId: z.string().cuid(),
  name: z.string().min(1).max(255),
  originalName: z.string().optional(),
  description: z.string().max(1000).optional(),
  fileUrl: z.string().min(1),
  fileType: z.string(),
  fileSize: z.number().min(0).max(52428800), // 50MB max
  category: AllDocumentCategories,
  isConfidential: z.boolean().default(false),
});

const GetReviewDocumentsInput = z.object({
  reviewId: z.string().cuid(),
  category: AllDocumentCategories.optional(),
});

const UpdateReviewDocumentInput = z.object({
  documentId: z.string().cuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: AllDocumentCategories.optional(),
  isConfidential: z.boolean().optional(),
});

const GetUploadUrlInput = z.object({
  reviewId: z.string().cuid(),
  fileName: z.string(),
  category: AllDocumentCategories,
});

// =============================================================================
// DOCUMENT ROUTER
// =============================================================================

export const documentRouter = router({
  /**
   * Create a document record (after file upload)
   */
  create: protectedProcedure
    .input(CreateDocumentInput)
    .mutation(async ({ input, ctx }) => {
      // Verify organization access if provided
      if (input.organizationId) {
        const isAdmin =
          ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
        const isOrgMember = ctx.user.organizationId === input.organizationId;

        if (!isAdmin && !isOrgMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to upload to this organization",
          });
        }
      }

      // Verify assessment access if provided
      if (input.assessmentId) {
        const assessment = await prisma.assessment.findUnique({
          where: { id: input.assessmentId },
        });

        if (!assessment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Assessment not found",
          });
        }

        const isAdmin =
          ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
        const isOrgMember = ctx.user.organizationId === assessment.organizationId;

        if (!isAdmin && !isOrgMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to upload to this assessment",
          });
        }
      }

      try {
        const document = await documentService.createDocument({
          ...input,
          organizationId: input.organizationId ?? ctx.user.organizationId ?? undefined,
          uploadedById: ctx.user.id,
        });

        return {
          success: true,
          document,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create document",
        });
      }
    }),

  /**
   * Create an external URL reference
   */
  createUrlReference: protectedProcedure
    .input(CreateUrlReferenceInput)
    .mutation(async ({ input, ctx }) => {
      // Validate URL
      const validation = documentService.validateUrl(input.url);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.errors.join("; "),
        });
      }

      // Verify organization access if provided
      if (input.organizationId) {
        const isAdmin =
          ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
        const isOrgMember = ctx.user.organizationId === input.organizationId;

        if (!isAdmin && !isOrgMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission for this organization",
          });
        }
      }

      try {
        const document = await documentService.createUrlReference(
          input.url,
          input.name,
          ctx.user.id,
          {
            description: input.description,
            category: input.category,
            organizationId: input.organizationId ?? ctx.user.organizationId ?? undefined,
            assessmentId: input.assessmentId,
          }
        );

        return {
          success: true,
          document,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create URL reference",
        });
      }
    }),

  /**
   * Link a document to an assessment response
   */
  linkToResponse: protectedProcedure
    .input(LinkToResponseInput)
    .mutation(async ({ input, ctx }) => {
      // Verify response exists and user has access
      const response = await prisma.assessmentResponse.findUnique({
        where: { id: input.responseId },
        include: { assessment: true },
      });

      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember =
        ctx.user.organizationId === response.assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to modify this response",
        });
      }

      try {
        await documentService.linkToResponse({
          documentId: input.documentId,
          responseId: input.responseId,
          notes: input.notes,
          addedById: ctx.user.id,
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Failed to link document to response",
        });
      }
    }),

  /**
   * Unlink a document from an assessment response
   */
  unlinkFromResponse: protectedProcedure
    .input(UnlinkFromResponseInput)
    .mutation(async ({ input, ctx }) => {
      // Verify response exists and user has access
      const response = await prisma.assessmentResponse.findUnique({
        where: { id: input.responseId },
        include: { assessment: true },
      });

      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember =
        ctx.user.organizationId === response.assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to modify this response",
        });
      }

      try {
        await documentService.unlinkFromResponse(
          input.documentId,
          input.responseId
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Failed to unlink document from response",
        });
      }
    }),

  /**
   * Get a single document by ID
   */
  get: protectedProcedure
    .input(GetDocumentInput)
    .query(async ({ input, ctx }) => {
      const document = await documentService.getDocument(input.documentId);

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check access
      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const canAccess = await documentService.canAccessDocument(
        input.documentId,
        ctx.user.id,
        ctx.user.organizationId,
        isAdmin
      );

      if (!canAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this document",
        });
      }

      return document;
    }),

  /**
   * Get documents for an assessment
   */
  getByAssessment: protectedProcedure
    .input(GetByAssessmentInput)
    .query(async ({ input, ctx }) => {
      // Verify user has access to assessment
      const assessment = await prisma.assessment.findUnique({
        where: { id: input.assessmentId },
      });

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember =
        ctx.user.organizationId === assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this assessment",
        });
      }

      const documents = await documentService.getAssessmentDocuments(
        input.assessmentId
      );

      return documents;
    }),

  /**
   * Get documents for a specific response
   */
  getByResponse: protectedProcedure
    .input(GetByResponseInput)
    .query(async ({ input, ctx }) => {
      // Verify user has access to response
      const response = await prisma.assessmentResponse.findUnique({
        where: { id: input.responseId },
        include: { assessment: true },
      });

      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember =
        ctx.user.organizationId === response.assessment.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this response",
        });
      }

      const documents = await documentService.getResponseDocuments(
        input.responseId
      );

      return documents;
    }),

  /**
   * Get documents for an organization (document library)
   */
  getByOrganization: protectedProcedure
    .input(GetByOrganizationInput)
    .query(async ({ input, ctx }) => {
      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const isOrgMember = ctx.user.organizationId === input.organizationId;

      if (!isAdmin && !isOrgMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this organization",
        });
      }

      const documents = await documentService.getOrganizationDocuments(
        input.organizationId,
        {
          category: input.category,
          assessmentId: input.assessmentId,
          tags: input.tags,
          search: input.search,
        }
      );

      return documents;
    }),

  /**
   * Update document metadata
   */
  update: protectedProcedure
    .input(UpdateDocumentInput)
    .mutation(async ({ input, ctx }) => {
      // Check access
      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const canAccess = await documentService.canAccessDocument(
        input.documentId,
        ctx.user.id,
        ctx.user.organizationId,
        isAdmin
      );

      if (!canAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this document",
        });
      }

      try {
        const { documentId, ...updateData } = input;
        const document = await documentService.updateDocument(
          documentId,
          updateData,
          ctx.user.id
        );

        return {
          success: true,
          document,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Failed to update document",
        });
      }
    }),

  /**
   * Delete a document (soft delete)
   */
  delete: protectedProcedure
    .input(DeleteDocumentInput)
    .mutation(async ({ input, ctx }) => {
      // Check access
      const isAdmin =
        ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "SYSTEM_ADMIN";
      const canAccess = await documentService.canAccessDocument(
        input.documentId,
        ctx.user.id,
        ctx.user.organizationId,
        isAdmin
      );

      if (!canAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this document",
        });
      }

      try {
        await documentService.deleteDocument(input.documentId, ctx.user.id);

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Failed to delete document",
        });
      }
    }),

  /**
   * Get upload constraints for client-side validation
   */
  getConstraints: protectedProcedure.query(() => {
    return documentService.getConstraints();
  }),

  // ===========================================================================
  // REVIEW DOCUMENT PROCEDURES
  // ===========================================================================

  /**
   * Get documents for a review
   */
  getByReview: protectedProcedure
    .input(GetReviewDocumentsInput)
    .query(async ({ input, ctx }) => {
      // Verify review exists
      const review = await prisma.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: { select: { userId: true } },
          hostOrganization: { select: { id: true } },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check access - must be admin, team member, or host org member
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR", "STEERING_COMMITTEE"].includes(
        ctx.user.role as string
      );
      const isTeamMember = review.teamMembers.some((m) => m.userId === ctx.user.id);
      const isHostOrg = ctx.user.organizationId === review.hostOrganization.id;

      if (!isAdmin && !isTeamMember && !isHostOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view documents for this review",
        });
      }

      const where: {
        reviewId: string;
        isDeleted: boolean;
        category?: typeof input.category;
        isConfidential?: boolean;
      } = {
        reviewId: input.reviewId,
        isDeleted: false,
      };

      if (input.category) {
        where.category = input.category;
      }

      // Non-admin host org members can only see non-confidential documents
      if (isHostOrg && !isAdmin && !isTeamMember) {
        where.isConfidential = false;
      }

      const documents = await prisma.document.findMany({
        where,
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [{ category: "asc" }, { uploadedAt: "desc" }],
      });

      return documents;
    }),

  /**
   * Create a document record for a review
   */
  createForReview: protectedProcedure
    .input(CreateReviewDocumentInput)
    .mutation(async ({ input, ctx }) => {
      // Verify review exists
      const review = await prisma.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: { select: { userId: true } },
          hostOrganization: { select: { id: true } },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check access - must be admin, team member, or host org member
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.user.role as string
      );
      const isTeamMember = review.teamMembers.some((m) => m.userId === ctx.user.id);
      const isHostOrg = ctx.user.organizationId === review.hostOrganization.id;

      if (!isAdmin && !isTeamMember && !isHostOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to upload documents for this review",
        });
      }

      // Host org members can only upload HOST_SUBMISSION and CAP_EVIDENCE
      if (isHostOrg && !isTeamMember && !isAdmin) {
        const allowedCategories = ["HOST_SUBMISSION", "CAP_EVIDENCE"];
        if (!allowedCategories.includes(input.category)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only upload host submissions and CAP evidence",
          });
        }
      }

      const document = await prisma.document.create({
        data: {
          name: input.name,
          originalName: input.originalName,
          description: input.description,
          fileUrl: input.fileUrl,
          fileType: input.fileType,
          fileSize: input.fileSize,
          category: input.category,
          isConfidential: input.isConfidential,
          reviewId: input.reviewId,
          uploadedById: ctx.user.id,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return document;
    }),

  /**
   * Update a review document
   */
  updateReviewDocument: protectedProcedure
    .input(UpdateReviewDocumentInput)
    .mutation(async ({ input, ctx }) => {
      const document = await prisma.document.findUnique({
        where: { id: input.documentId },
        include: {
          review: {
            include: {
              teamMembers: { select: { userId: true } },
            },
          },
        },
      });

      if (!document || !document.review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check access - must be admin, team member, or document uploader
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.user.role as string
      );
      const isTeamMember = document.review.teamMembers.some((m) => m.userId === ctx.user.id);
      const isUploader = document.uploadedById === ctx.user.id;

      if (!isAdmin && !isTeamMember && !isUploader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this document",
        });
      }

      const { documentId, ...updateData } = input;

      const updated = await prisma.document.update({
        where: { id: documentId },
        data: updateData,
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return updated;
    }),

  /**
   * Delete a review document
   * Performs soft delete in database and deletes file from storage
   */
  deleteReviewDocument: protectedProcedure
    .input(DeleteDocumentInput)
    .mutation(async ({ input, ctx }) => {
      const document = await prisma.document.findUnique({
        where: { id: input.documentId },
        include: {
          review: {
            include: {
              teamMembers: { select: { userId: true } },
            },
          },
        },
      });

      if (!document || !document.review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check access - must be admin, team lead, or document uploader
      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(ctx.user.role as string);
      const isUploader = document.uploadedById === ctx.user.id;

      if (!isAdmin && !isUploader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this document",
        });
      }

      // Delete from storage if it's a Supabase Storage URL
      const storagePath = extractPathFromUrl(document.fileUrl);
      if (storagePath) {
        const deleted = await deleteFile(storagePath);
        if (!deleted) {
          console.warn(
            `[deleteReviewDocument] Failed to delete file from storage: ${storagePath}`
          );
          // Continue with soft delete even if storage delete fails
        }
      }

      // Soft delete in database
      await prisma.document.update({
        where: { id: input.documentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return { success: true };
    }),

  /**
   * Get signed upload URL for Supabase Storage
   */
  getReviewUploadUrl: protectedProcedure
    .input(GetUploadUrlInput)
    .mutation(async ({ input, ctx }) => {
      // Verify review exists and user has access
      const review = await prisma.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: { select: { userId: true } },
          hostOrganization: { select: { id: true } },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      const isAdmin = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROGRAMME_COORDINATOR"].includes(
        ctx.user.role as string
      );
      const isTeamMember = review.teamMembers.some((m) => m.userId === ctx.user.id);
      const isHostOrg = ctx.user.organizationId === review.hostOrganization.id;

      if (!isAdmin && !isTeamMember && !isHostOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to upload documents for this review",
        });
      }

      // Generate storage path
      const timestamp = Date.now();
      const safeName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `reviews/${input.reviewId}/${input.category}/${timestamp}_${safeName}`;

      // Return the path for client-side upload
      // Client will use Supabase client to upload directly
      return {
        storagePath,
        bucket: "review-documents",
      };
    }),

  /**
   * Get signed download URL for a document
   * Returns a time-limited signed URL for secure file access
   */
  getDownloadUrl: protectedProcedure
    .input(
      z.object({
        documentId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const document = await prisma.document.findUnique({
        where: { id: input.documentId },
        include: {
          review: {
            include: {
              teamMembers: { select: { userId: true } },
              hostOrganization: { select: { id: true } },
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check access permissions
      const userId = ctx.user.id;
      const userOrgId = ctx.user.organizationId;
      const isTeamMember = document.review?.teamMembers.some(
        (m) => m.userId === userId
      );
      const isHostOrg = document.review?.hostOrganizationId === userOrgId;
      const isAdmin = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
      ].includes(ctx.user.role as string);

      if (!isTeamMember && !isHostOrg && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Handle confidential documents
      if (document.isConfidential && !isTeamMember && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Document is confidential",
        });
      }

      // Extract storage path and generate signed URL
      const storagePath = extractPathFromUrl(document.fileUrl);

      if (!storagePath) {
        // Return original URL for legacy/placeholder URLs (local storage)
        return {
          url: document.fileUrl,
          isSignedUrl: false,
          expiresIn: null,
        };
      }

      // Generate signed URL with 1 hour expiry
      const result = await getSignedDownloadUrl(
        storagePath,
        document.originalName || document.name,
        3600
      );

      if (!result.success || !result.signedUrl) {
        // Fallback to original URL if signed URL generation fails
        console.error("[getDownloadUrl] Failed to generate signed URL:", result.error);
        return {
          url: document.fileUrl,
          isSignedUrl: false,
          expiresIn: null,
        };
      }

      return {
        url: result.signedUrl,
        isSignedUrl: true,
        expiresIn: 3600,
      };
    }),

  /**
   * Get review document statistics
   */
  getReviewDocumentStats: protectedProcedure
    .input(z.object({ reviewId: z.string().cuid() }))
    .query(async ({ input }) => {
      const review = await prisma.review.findUnique({
        where: { id: input.reviewId },
        include: {
          teamMembers: { select: { userId: true } },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      const documents = await prisma.document.findMany({
        where: {
          reviewId: input.reviewId,
          isDeleted: false,
        },
        select: {
          category: true,
          fileSize: true,
        },
      });

      const byCategory: Record<string, number> = {};
      let totalSize = 0;

      documents.forEach((doc) => {
        byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
        totalSize += doc.fileSize;
      });

      return {
        total: documents.length,
        byCategory,
        totalSize,
      };
    }),
});
