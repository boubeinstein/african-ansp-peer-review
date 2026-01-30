import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import {
  documentVersionService,
  documentIntegrityService,
  evidenceLinkService,
  documentSharingService,
} from "@/server/services/document";

const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

export const documentEnhancedRouter = router({
  // ==========================================================================
  // VERSION MANAGEMENT
  // ==========================================================================

  /**
   * Get all versions of a document
   */
  getVersions: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      return documentVersionService.getVersions(input.documentId);
    }),

  /**
   * Get a specific version by ID
   */
  getVersion: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ input }) => {
      return documentVersionService.getVersion(input.versionId);
    }),

  /**
   * Get the current (latest) version of a document
   */
  getCurrentVersion: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      return documentVersionService.getCurrentVersion(input.documentId);
    }),

  /**
   * Compare two versions
   */
  compareVersions: protectedProcedure
    .input(z.object({ versionId1: z.string(), versionId2: z.string() }))
    .query(async ({ input }) => {
      return documentVersionService.compareVersions(
        input.versionId1,
        input.versionId2
      );
    }),

  /**
   * Get version history summary
   */
  getVersionHistory: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      return documentVersionService.getVersionHistorySummary(input.documentId);
    }),

  // ==========================================================================
  // INTEGRITY VERIFICATION
  // ==========================================================================

  /**
   * Verify integrity of a specific version
   */
  verifyIntegrity: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return documentIntegrityService.verifyVersion(
        input.versionId,
        ctx.session.user.id
      );
    }),

  /**
   * Verify all versions of a document
   */
  verifyDocumentIntegrity: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return documentIntegrityService.verifyDocument(
        input.documentId,
        ctx.session.user.id
      );
    }),

  /**
   * Generate integrity report for a document (Admin only)
   */
  generateIntegrityReport: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ADMIN_ROLES.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can generate integrity reports",
        });
      }
      return documentIntegrityService.generateIntegrityReport(
        input.documentId,
        ctx.session.user.id
      );
    }),

  /**
   * Lock a version (Admin only)
   */
  lockVersion: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ADMIN_ROLES.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can lock versions",
        });
      }
      await documentIntegrityService.lockVersion(
        input.versionId,
        ctx.session.user.id
      );
      return { success: true };
    }),

  /**
   * Unlock a version (Admin only)
   */
  unlockVersion: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ADMIN_ROLES.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can unlock versions",
        });
      }
      await documentIntegrityService.unlockVersion(input.versionId);
      return { success: true };
    }),

  /**
   * Check if document has any tampered versions
   */
  hasTamperedVersions: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return documentIntegrityService.hasTamperedVersions(
        input.documentId,
        ctx.session.user.id
      );
    }),

  // ==========================================================================
  // EVIDENCE LINKS
  // ==========================================================================

  /**
   * Create an evidence link between a document and an entity
   */
  createEvidenceLink: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        entityType: z.string(),
        entityId: z.string(),
        linkType: z.string().optional(),
        relevanceScore: z.number().min(0).max(100).optional(),
        notesEn: z.string().optional(),
        notesFr: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return evidenceLinkService.createLink({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  /**
   * Get a specific evidence link
   */
  getEvidenceLink: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .query(async ({ input }) => {
      return evidenceLinkService.getLink(input.linkId);
    }),

  /**
   * Get all evidence links for an entity (Finding, CAP, etc.)
   */
  getEntityEvidenceLinks: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string(),
        verifiedOnly: z.boolean().optional(),
        linkType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return evidenceLinkService.getLinksForEntity(
        input.entityType,
        input.entityId,
        {
          verifiedOnly: input.verifiedOnly,
          linkType: input.linkType,
        }
      );
    }),

  /**
   * Get all evidence links for a document
   */
  getDocumentEvidenceLinks: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      return evidenceLinkService.getLinksForDocument(input.documentId);
    }),

  /**
   * Update an evidence link
   */
  updateEvidenceLink: protectedProcedure
    .input(
      z.object({
        linkId: z.string(),
        linkType: z.string().optional(),
        relevanceScore: z.number().min(0).max(100).optional(),
        notesEn: z.string().optional(),
        notesFr: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { linkId, ...updateData } = input;
      return evidenceLinkService.updateLink(linkId, updateData);
    }),

  /**
   * Verify an evidence link (Authorized roles only)
   */
  verifyEvidenceLink: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const allowedRoles = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
        "LEAD_REVIEWER",
      ];
      if (!allowedRoles.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to verify evidence links",
        });
      }
      await evidenceLinkService.verifyLink(input.linkId, ctx.session.user.id);
      return { success: true };
    }),

  /**
   * Unverify an evidence link (Authorized roles only)
   */
  unverifyEvidenceLink: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const allowedRoles = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
        "LEAD_REVIEWER",
      ];
      if (!allowedRoles.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to unverify evidence links",
        });
      }
      await evidenceLinkService.unverifyLink(input.linkId);
      return { success: true };
    }),

  /**
   * Delete an evidence link
   */
  deleteEvidenceLink: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ input }) => {
      await evidenceLinkService.deleteLink(input.linkId);
      return { success: true };
    }),

  /**
   * Get evidence statistics for an entity
   */
  getEvidenceStats: protectedProcedure
    .input(z.object({ entityType: z.string(), entityId: z.string() }))
    .query(async ({ input }) => {
      return evidenceLinkService.getEntityEvidenceStats(
        input.entityType,
        input.entityId
      );
    }),

  /**
   * Get evidence statistics for a document
   */
  getDocumentEvidenceStats: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      return evidenceLinkService.getDocumentEvidenceStats(input.documentId);
    }),

  /**
   * Bulk link documents to an entity
   */
  bulkLinkDocuments: protectedProcedure
    .input(
      z.object({
        documentIds: z.array(z.string()),
        entityType: z.string(),
        entityId: z.string(),
        linkType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return evidenceLinkService.bulkLink(
        input.documentIds,
        input.entityType,
        input.entityId,
        ctx.session.user.id,
        input.linkType
      );
    }),

  /**
   * Bulk verify evidence links (Authorized roles only)
   */
  bulkVerifyLinks: protectedProcedure
    .input(z.object({ linkIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const allowedRoles = [
        "SUPER_ADMIN",
        "SYSTEM_ADMIN",
        "PROGRAMME_COORDINATOR",
        "LEAD_REVIEWER",
      ];
      if (!allowedRoles.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to verify evidence links",
        });
      }
      const count = await evidenceLinkService.bulkVerify(
        input.linkIds,
        ctx.session.user.id
      );
      return { success: true, verifiedCount: count };
    }),

  /**
   * Get unverified evidence links for review
   */
  getUnverifiedLinks: protectedProcedure
    .input(
      z.object({
        entityType: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ input }) => {
      return evidenceLinkService.getUnverifiedLinks(input);
    }),

  /**
   * Check if a document is linked to an entity
   */
  isDocumentLinked: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        entityType: z.string(),
        entityId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return evidenceLinkService.isLinked(
        input.documentId,
        input.entityType,
        input.entityId
      );
    }),

  // ==========================================================================
  // DOCUMENT SHARING
  // ==========================================================================

  /**
   * Create a share link for a document
   */
  createShareLink: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        expiresInHours: z.number().min(1).max(720).optional(),
        maxAccesses: z.number().min(1).max(100).optional(),
        permissions: z.array(z.string()).optional(),
        recipientEmail: z.string().email().optional(),
        recipientName: z.string().optional(),
        purpose: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return documentSharingService.createToken({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  /**
   * Get all share links for a document
   */
  getDocumentShareLinks: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        includeExpired: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return documentSharingService.listTokens({
        documentId: input.documentId,
        includeExpired: input.includeExpired,
      });
    }),

  /**
   * Get a specific share link
   */
  getShareLink: protectedProcedure
    .input(z.object({ tokenId: z.string() }))
    .query(async ({ input }) => {
      return documentSharingService.getToken(input.tokenId);
    }),

  /**
   * Revoke a share link
   */
  revokeShareLink: protectedProcedure
    .input(z.object({ tokenId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await documentSharingService.revokeToken(
        input.tokenId,
        ctx.session.user.id
      );
      return { success: true };
    }),

  /**
   * Revoke all share links for a document
   */
  revokeAllShareLinks: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const count = await documentSharingService.revokeAllTokensForDocument(
        input.documentId,
        ctx.session.user.id
      );
      return { success: true, revokedCount: count };
    }),

  /**
   * Extend a share link's expiry
   */
  extendShareLink: protectedProcedure
    .input(
      z.object({
        tokenId: z.string(),
        additionalHours: z.number().min(1).max(720),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return documentSharingService.extendToken(
        input.tokenId,
        input.additionalHours,
        ctx.session.user.id
      );
    }),

  /**
   * Get access statistics for document sharing
   */
  getShareStats: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      return documentSharingService.getDocumentAccessStats(input.documentId);
    }),

  /**
   * Check if a share token is valid
   */
  isShareLinkValid: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      return documentSharingService.isTokenValid(input.token);
    }),
});
