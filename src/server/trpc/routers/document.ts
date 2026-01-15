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

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const CreateDocumentInput = z.object({
  name: z.string().min(1).max(255),
  originalName: z.string().optional(),
  description: z.string().max(1000).optional(),
  fileUrl: z.string().url(),
  fileType: z.string(),
  fileSize: z.number().min(0),
  category: z
    .enum([
      "POLICY",
      "PROCEDURE",
      "RECORD",
      "CERTIFICATE",
      "REPORT",
      "TRAINING",
      "EVIDENCE",
      "OTHER",
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
  language: z.enum(["EN", "FR"]).optional(),
  organizationId: z.string().cuid().optional(),
  assessmentId: z.string().cuid().optional(),
});

const CreateUrlReferenceInput = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: z
    .enum([
      "POLICY",
      "PROCEDURE",
      "RECORD",
      "CERTIFICATE",
      "REPORT",
      "TRAINING",
      "EVIDENCE",
      "OTHER",
    ])
    .optional(),
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
  category: z
    .enum([
      "POLICY",
      "PROCEDURE",
      "RECORD",
      "CERTIFICATE",
      "REPORT",
      "TRAINING",
      "EVIDENCE",
      "OTHER",
    ])
    .optional(),
  assessmentId: z.string().cuid().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
});

const UpdateDocumentInput = z.object({
  documentId: z.string().cuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z
    .enum([
      "POLICY",
      "PROCEDURE",
      "RECORD",
      "CERTIFICATE",
      "REPORT",
      "TRAINING",
      "EVIDENCE",
      "OTHER",
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
  language: z.enum(["EN", "FR"]).optional(),
});

const DeleteDocumentInput = z.object({
  documentId: z.string().cuid(),
});

const GetDocumentInput = z.object({
  documentId: z.string().cuid(),
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
});
