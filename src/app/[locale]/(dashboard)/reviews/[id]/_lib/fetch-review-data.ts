import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";

// Define the include type for type safety
const reviewInclude = {
  hostOrganization: {
    select: { id: true, organizationCode: true, nameEn: true, nameFr: true },
  },
  teamMembers: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      reviewerProfile: { select: { id: true, isLeadQualified: true } },
    },
  },
  documents: {
    where: { isDeleted: false },
    select: { id: true, category: true },
  },
  findings: {
    select: { id: true, severity: true, status: true },
  },
  discussions: {
    select: { id: true, isResolved: true },
  },
  tasks: {
    select: { id: true, status: true },
  },
  assessments: {
    select: { id: true, title: true, status: true },
  },
  report: {
    select: { id: true, status: true },
  },
} satisfies Prisma.ReviewInclude;

export type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: typeof reviewInclude;
}>;

export interface ReviewCounts {
  discussions: number;
  openDiscussions: number;
  tasks: number;
  openTasks: number;
  documents: number;
  findings: number;
  criticalFindings: number;
}

export async function fetchReviewWithCounts(reviewId: string) {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    include: reviewInclude,
  });

  if (!review) notFound();

  // Compute counts for tab badges
  const counts: ReviewCounts = {
    discussions: review.discussions.length,
    openDiscussions: review.discussions.filter(d => !d.isResolved).length,
    tasks: review.tasks.length,
    openTasks: review.tasks.filter(t => t.status !== "COMPLETED" && t.status !== "CANCELLED").length,
    documents: review.documents.length,
    findings: review.findings.length,
    criticalFindings: review.findings.filter(f => f.severity === "CRITICAL").length,
  };

  // Transform hostOrganization to match expected interface
  const transformedReview = {
    ...review,
    hostOrganization: {
      ...review.hostOrganization,
      code: review.hostOrganization.organizationCode ?? "",
    },
  };

  return { review: transformedReview, counts };
}

export type ReviewWithCounts = Awaited<ReturnType<typeof fetchReviewWithCounts>>;
export type ReviewData = ReviewWithCounts["review"];
