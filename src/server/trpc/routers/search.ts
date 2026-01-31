/**
 * Search Router - Global Search for Command Palette
 *
 * Provides unified search across multiple entity types:
 * - Reviews
 * - Findings
 * - CAPs
 * - Organizations
 * - Best Practices
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

// =============================================================================
// TYPES
// =============================================================================

interface SearchResult {
  id: string;
  type: "review" | "finding" | "cap" | "organization" | "bestPractice";
  title: string;
  subtitle?: string;
  status?: string;
}

// =============================================================================
// ROUTER
// =============================================================================

export const searchRouter = router({
  /**
   * Global search across multiple entity types
   */
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(100),
        limit: z.number().min(1).max(20).default(8),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      const results: SearchResult[] = [];

      // Search Reviews
      const reviews = await ctx.db.review.findMany({
        where: {
          OR: [
            { referenceNumber: { contains: query, mode: "insensitive" } },
            { hostOrganization: { nameEn: { contains: query, mode: "insensitive" } } },
            { hostOrganization: { nameFr: { contains: query, mode: "insensitive" } } },
            { hostOrganization: { organizationCode: { contains: query, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          hostOrganization: {
            select: { nameEn: true, organizationCode: true },
          },
        },
        take: Math.ceil(limit / 4),
        orderBy: { createdAt: "desc" },
      });

      for (const review of reviews) {
        results.push({
          id: review.id,
          type: "review",
          title: review.referenceNumber || "Review",
          subtitle: review.hostOrganization?.nameEn || undefined,
          status: review.status,
        });
      }

      // Search Findings
      const findings = await ctx.db.finding.findMany({
        where: {
          OR: [
            { referenceNumber: { contains: query, mode: "insensitive" } },
            { titleEn: { contains: query, mode: "insensitive" } },
            { titleFr: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          referenceNumber: true,
          titleEn: true,
          status: true,
          severity: true,
        },
        take: Math.ceil(limit / 4),
        orderBy: { createdAt: "desc" },
      });

      for (const finding of findings) {
        results.push({
          id: finding.id,
          type: "finding",
          title: finding.referenceNumber || finding.titleEn || "Finding",
          subtitle: finding.severity ? `${finding.severity} severity` : undefined,
          status: finding.status,
        });
      }

      // Search CAPs (via finding reference)
      const caps = await ctx.db.correctiveActionPlan.findMany({
        where: {
          OR: [
            { finding: { referenceNumber: { contains: query, mode: "insensitive" } } },
            { rootCauseEn: { contains: query, mode: "insensitive" } },
            { correctiveActionEn: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          status: true,
          finding: {
            select: { referenceNumber: true, titleEn: true },
          },
        },
        take: Math.ceil(limit / 4),
        orderBy: { createdAt: "desc" },
      });

      for (const cap of caps) {
        results.push({
          id: cap.id,
          type: "cap",
          title: cap.finding.referenceNumber ? `CAP - ${cap.finding.referenceNumber}` : "CAP",
          subtitle: cap.finding.titleEn || undefined,
          status: cap.status,
        });
      }

      // Search Organizations
      const organizations = await ctx.db.organization.findMany({
        where: {
          OR: [
            { nameEn: { contains: query, mode: "insensitive" } },
            { nameFr: { contains: query, mode: "insensitive" } },
            { organizationCode: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          nameEn: true,
          organizationCode: true,
          country: true,
        },
        take: Math.ceil(limit / 4),
        orderBy: { nameEn: "asc" },
      });

      for (const org of organizations) {
        results.push({
          id: org.id,
          type: "organization",
          title: org.nameEn,
          subtitle: org.organizationCode || org.country || undefined,
        });
      }

      // Search Best Practices
      const bestPractices = await ctx.db.bestPractice.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { referenceNumber: { contains: query, mode: "insensitive" } },
            { titleEn: { contains: query, mode: "insensitive" } },
            { titleFr: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          referenceNumber: true,
          titleEn: true,
          category: true,
        },
        take: Math.ceil(limit / 4),
        orderBy: { createdAt: "desc" },
      });

      for (const bp of bestPractices) {
        results.push({
          id: bp.id,
          type: "bestPractice",
          title: bp.referenceNumber || bp.titleEn || "Best Practice",
          subtitle: bp.category || undefined,
        });
      }

      // Sort by relevance (exact matches first) and limit
      const sortedResults = results
        .sort((a, b) => {
          const aExact = a.title.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
          const bExact = b.title.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
          return aExact - bExact;
        })
        .slice(0, limit);

      return { results: sortedResults, total: results.length };
    }),
});
