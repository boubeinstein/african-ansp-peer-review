/**
 * JoinRequest Router - Programme Participation Application API
 *
 * Handles the admin lifecycle of join requests:
 * - Coordinator review and recommendation
 * - Steering Committee decision
 * - Organization status updates
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
} from "@/server/trpc/trpc";
import { prisma } from "@/lib/db";
import { JoinRequestStatus, ParticipationStatus, UserRole } from "@prisma/client";
import { createUserFromJoinRequest } from "@/lib/services/user-service";
import {
  sendForwardedToSCEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendMoreInfoRequestEmail,
  sendCredentialsEmail,
} from "@/lib/email";
import { logUpdate, logApproval, logRejection } from "@/server/services/audit";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const coordinatorReviewSchema = z.object({
  id: z.string(),
  coordinatorNotes: z.string().min(10, "Notes are required"),
  coordinatorRecommendation: z.enum(["APPROVE", "REJECT", "MORE_INFO"]),
  coordinatorRecommendedTeam: z.number().min(1).max(5).optional(),
});

const scDecisionSchema = z.object({
  id: z.string(),
  scDecision: z.enum(["APPROVED", "REJECTED", "MORE_INFO"]),
  scDecisionNotes: z.string().optional(),
  scAssignedTeam: z.number().min(1).max(5).optional(),
  rejectionReason: z.string().optional(),
  additionalInfoRequest: z.string().optional(),
});

const listSchema = z.object({
  status: z.nativeEnum(JoinRequestStatus).optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

/** Roles that can review join requests as coordinator */
const coordinatorRoles: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.PROGRAMME_COORDINATOR,
];

/** Roles that can make SC decisions */
const scRoles: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.STEERING_COMMITTEE,
];

// =============================================================================
// ROUTER
// =============================================================================

export const joinRequestRouter = router({
  /**
   * List join requests (Protected - Coordinators and SC)
   */
  list: protectedProcedure
    .input(listSchema)
    .query(async ({ ctx, input }) => {
      const { status, limit, cursor } = input;

      // Check permissions
      if (
        !coordinatorRoles.includes(ctx.session.user.role) &&
        !scRoles.includes(ctx.session.user.role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view join requests",
        });
      }

      const where = status ? { status } : {};

      const items = await prisma.joinRequest.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          organization: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              organizationCode: true,
              country: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),

  /**
   * Get single join request (Protected - Coordinators and SC)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check permissions
      if (
        !coordinatorRoles.includes(ctx.session.user.role) &&
        !scRoles.includes(ctx.session.user.role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view this request",
        });
      }

      const joinRequest = await prisma.joinRequest.findUnique({
        where: { id: input.id },
        include: {
          organization: true,
          coordinatorReviewedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          scDecisionBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!joinRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Join request not found",
        });
      }

      return joinRequest;
    }),

  /**
   * Coordinator review (Protected - Coordinators only)
   */
  coordinatorReview: protectedProcedure
    .input(coordinatorReviewSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!coordinatorRoles.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coordinators can perform this action",
        });
      }

      const joinRequest = await prisma.joinRequest.findUnique({
        where: { id: input.id },
      });

      if (!joinRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Join request not found",
        });
      }

      if (
        joinRequest.status !== JoinRequestStatus.PENDING &&
        joinRequest.status !== JoinRequestStatus.COORDINATOR_REVIEW
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join request cannot be reviewed in current status",
        });
      }

      // Update the join request
      const updated = await prisma.joinRequest.update({
        where: { id: input.id },
        data: {
          status: JoinRequestStatus.SC_REVIEW,
          coordinatorNotes: input.coordinatorNotes,
          coordinatorRecommendation: input.coordinatorRecommendation,
          coordinatorRecommendedTeam: input.coordinatorRecommendedTeam,
          coordinatorReviewedAt: new Date(),
          coordinatorReviewedById: ctx.session.user.id,
        },
        include: { organization: true },
      });

      // Audit log
      logUpdate({
        userId: ctx.session.user.id,
        entityType: "JoinRequest",
        entityId: input.id,
        previousState: { status: joinRequest.status },
        newState: { status: JoinRequestStatus.SC_REVIEW, recommendation: input.coordinatorRecommendation },
        metadata: { action: "coordinator_review" },
      }).catch(() => {});

      // Update organization status if organization exists
      if (updated.organizationId) {
        await prisma.organization.update({
          where: { id: updated.organizationId },
          data: { participationStatus: ParticipationStatus.UNDER_REVIEW },
        });
      }

      // Get organization name (from linked org or free-text field)
      const orgName = updated.organization?.nameEn || updated.organizationName || "Unknown Organization";

      // Send notification email to applicant
      await sendForwardedToSCEmail({
        applicantEmail: updated.contactEmail,
        applicantName: updated.contactName,
        organizationName: orgName,
        recommendation: input.coordinatorRecommendation,
      });

      return updated;
    }),

  /**
   * Steering Committee decision (Protected - SC members only)
   */
  scDecision: protectedProcedure
    .input(scDecisionSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!scRoles.includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Steering Committee members can perform this action",
        });
      }

      const joinRequest = await prisma.joinRequest.findUnique({
        where: { id: input.id },
      });

      if (!joinRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Join request not found",
        });
      }

      if (joinRequest.status !== JoinRequestStatus.SC_REVIEW) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join request is not ready for SC decision",
        });
      }

      // Validation based on decision
      if (input.scDecision === "APPROVED" && !input.scAssignedTeam) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team assignment is required for approval",
        });
      }

      if (input.scDecision === "REJECTED" && !input.rejectionReason) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rejection reason is required",
        });
      }

      if (input.scDecision === "MORE_INFO" && !input.additionalInfoRequest) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please specify what additional information is needed",
        });
      }

      // Map decision to status
      const statusMap: Record<string, JoinRequestStatus> = {
        APPROVED: JoinRequestStatus.APPROVED,
        REJECTED: JoinRequestStatus.REJECTED,
        MORE_INFO: JoinRequestStatus.MORE_INFO,
      };

      // Update join request
      const updated = await prisma.joinRequest.update({
        where: { id: input.id },
        data: {
          status: statusMap[input.scDecision],
          scDecision: input.scDecision,
          scDecisionNotes: input.scDecisionNotes,
          scAssignedTeam: input.scAssignedTeam,
          scDecisionAt: new Date(),
          scDecisionById: ctx.session.user.id,
          rejectionReason: input.rejectionReason,
          additionalInfoRequest: input.additionalInfoRequest,
        },
        include: { organization: true },
      });

      // Audit log for SC decision
      const auditFn = input.scDecision === "APPROVED" ? logApproval : input.scDecision === "REJECTED" ? logRejection : logUpdate;
      auditFn({
        userId: ctx.session.user.id,
        entityType: "JoinRequest",
        entityId: input.id,
        metadata: {
          action: "sc_decision",
          decision: input.scDecision,
          assignedTeam: input.scAssignedTeam,
        },
      }).catch(() => {});

      // Get organization name (from linked org or free-text field)
      const orgName = updated.organization?.nameEn || updated.organizationName || "Unknown Organization";
      let organizationId = updated.organizationId;

      // Update organization based on decision
      if (input.scDecision === "APPROVED") {
        // For free-text programme join requests, create the organization first
        if (!updated.organizationId && updated.organizationName) {
          // Derive region from assigned team
          const teamToRegion: Record<number, "WACAF" | "ESAF" | "NORTHERN"> = {
            1: "ESAF",     // Central/Southern Africa
            2: "ESAF",     // East Africa
            3: "WACAF",    // West Africa
            4: "ESAF",     // Southern Africa
            5: "NORTHERN", // North Africa
          };
          const region = input.scAssignedTeam ? teamToRegion[input.scAssignedTeam] ?? "WACAF" : "WACAF";

          const newOrg = await prisma.organization.create({
            data: {
              nameEn: updated.organizationName,
              nameFr: updated.organizationName, // Use same name for now
              country: updated.organizationCountry || "Unknown",
              region,
              organizationCode: updated.organizationCode,
              participationStatus: ParticipationStatus.ACTIVE,
              peerReviewTeam: input.scAssignedTeam,
              joinedProgrammeAt: new Date(),
            },
          });
          organizationId = newOrg.id;

          // Link the join request to the new organization
          await prisma.joinRequest.update({
            where: { id: input.id },
            data: { organizationId: newOrg.id },
          });
        } else if (updated.organizationId) {
          await prisma.organization.update({
            where: { id: updated.organizationId },
            data: {
              participationStatus: ParticipationStatus.ACTIVE,
              peerReviewTeam: input.scAssignedTeam,
              joinedProgrammeAt: new Date(),
            },
          });
        }
      } else if (input.scDecision === "REJECTED" && updated.organizationId) {
        await prisma.organization.update({
          where: { id: updated.organizationId },
          data: {
            participationStatus: ParticipationStatus.REJECTED,
          },
        });
      }

      // Send notification email based on decision
      if (input.scDecision === "APPROVED") {
        // Send approval notification email
        await sendApprovalEmail({
          applicantEmail: updated.contactEmail,
          applicantName: updated.contactName,
          organizationName: orgName,
          assignedTeam: input.scAssignedTeam!,
        });

        // Create user account for the applicant
        if (organizationId) {
          try {
            // Parse contact name into first/last name
            const nameParts = updated.contactName.trim().split(/\s+/);
            const firstName = nameParts[0] || "User";
            const lastName = nameParts.slice(1).join(" ") || updated.contactName;

            const { temporaryPassword } = await createUserFromJoinRequest({
              email: updated.contactEmail,
              firstName,
              lastName,
              organizationId,
              jobTitle: updated.contactJobTitle,
            });

            // Send credentials email
            const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;
            await sendCredentialsEmail({
              applicantEmail: updated.contactEmail,
              applicantName: updated.contactName,
              organizationName: orgName,
              temporaryPassword,
              loginUrl,
            });

            console.log(
              `✅ User account created and credentials sent to ${updated.contactEmail}`
            );
          } catch (error) {
            // Log error but don't fail the approval - admin can manually create account
            console.error("Failed to create user account:", error);
          }
        }
      } else if (input.scDecision === "REJECTED") {
        await sendRejectionEmail({
          applicantEmail: updated.contactEmail,
          applicantName: updated.contactName,
          organizationName: orgName,
          reason: input.rejectionReason!,
        });
      } else if (input.scDecision === "MORE_INFO") {
        await sendMoreInfoRequestEmail({
          applicantEmail: updated.contactEmail,
          applicantName: updated.contactName,
          organizationName: orgName,
          infoRequested: input.additionalInfoRequest!,
        });
      }

      return updated;
    }),

  /**
   * Get join request statistics (Protected - Coordinators and SC)
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    // Check permissions
    if (
      !coordinatorRoles.includes(ctx.session.user.role) &&
      !scRoles.includes(ctx.session.user.role)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to view statistics",
      });
    }

    const [total, pending, approved, rejected] = await Promise.all([
      prisma.joinRequest.count(),
      prisma.joinRequest.count({
        where: {
          status: {
            in: [
              JoinRequestStatus.PENDING,
              JoinRequestStatus.COORDINATOR_REVIEW,
              JoinRequestStatus.SC_REVIEW,
              JoinRequestStatus.MORE_INFO,
            ],
          },
        },
      }),
      prisma.joinRequest.count({
        where: { status: JoinRequestStatus.APPROVED },
      }),
      prisma.joinRequest.count({
        where: { status: JoinRequestStatus.REJECTED },
      }),
    ]);

    return { total, pending, approved, rejected };
  }),
});
