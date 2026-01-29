/**
 * Seed Script: Demo Reviews with Team-Compliant Assignments
 *
 * Creates demo reviews with proper team assignments:
 * - Rule 1: Team members MUST be from same team as host
 * - Rule 2: Team members CANNOT be from host organization
 *
 * Usage:
 *   npx tsx prisma/seed-demo-reviews.ts          # Seed data
 *   npx tsx prisma/seed-demo-reviews.ts cleanup  # Clean reviews
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  ReviewStatus,
  ReviewPhase,
  ReviewType,
  TeamRole,
} from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// REVIEW CONFIGURATIONS
// =============================================================================

interface TeamMemberConfig {
  orgIcaoCode: string;
  role: TeamRole;
}

interface ReviewConfig {
  referenceNumber: string;
  hostOrgIcaoCode: string;
  status: ReviewStatus;
  phase: ReviewPhase;
  type: ReviewType;
  startDaysFromNow: number;
  endDaysFromNow: number;
  teamMembers: TeamMemberConfig[];
}

// 5 demo reviews, one per team
const DEMO_REVIEWS: ReviewConfig[] = [
  {
    // Team 2 - East African Community
    referenceNumber: "AAPRP-2026-001",
    hostOrgIcaoCode: "KCAA", // Kenya
    status: "COMPLETED" as ReviewStatus,
    phase: "CLOSED" as ReviewPhase,
    type: "FULL" as ReviewType,
    startDaysFromNow: -60,
    endDaysFromNow: -46,
    teamMembers: [
      { orgIcaoCode: "TCAA", role: "LEAD_REVIEWER" as TeamRole }, // Tanzania
      { orgIcaoCode: "UCAA", role: "REVIEWER" as TeamRole }, // Uganda
      { orgIcaoCode: "RCAA", role: "REVIEWER" as TeamRole }, // Rwanda
    ],
  },
  {
    // Team 4 - Southern & Eastern Africa
    referenceNumber: "AAPRP-2026-002",
    hostOrgIcaoCode: "ADM", // Mozambique
    status: "IN_PROGRESS" as ReviewStatus,
    phase: "ON_SITE" as ReviewPhase,
    type: "FULL" as ReviewType,
    startDaysFromNow: -5,
    endDaysFromNow: 6,
    teamMembers: [
      { orgIcaoCode: "ADM", role: "LEAD_REVIEWER" as TeamRole }, // Zimbabwe
      { orgIcaoCode: "ACM", role: "REVIEWER" as TeamRole }, // Madagascar
      { orgIcaoCode: "ZACL", role: "REVIEWER" as TeamRole }, // Zambia
    ],
  },
  {
    // Team 3 - West African Anglophone
    referenceNumber: "AAPRP-2026-003",
    hostOrgIcaoCode: "NAMA", // Nigeria
    status: "APPROVED" as ReviewStatus,
    phase: "PLANNING" as ReviewPhase,
    type: "FULL" as ReviewType,
    startDaysFromNow: 30,
    endDaysFromNow: 41,
    teamMembers: [
      { orgIcaoCode: "GCAA", role: "LEAD_REVIEWER" as TeamRole }, // Ghana
      { orgIcaoCode: "RFIR", role: "REVIEWER" as TeamRole }, // Roberts FIR
    ],
  },
  {
    // Team 5 - Northern Africa
    referenceNumber: "AAPRP-2026-004",
    hostOrgIcaoCode: "DGAC", // Morocco
    status: "REQUESTED" as ReviewStatus,
    phase: "PLANNING" as ReviewPhase,
    type: "FOCUSED" as ReviewType,
    startDaysFromNow: 60,
    endDaysFromNow: 65,
    teamMembers: [], // Not yet assigned
  },
  {
    // Team 1 - ASECNANA & Southern Africa
    referenceNumber: "AAPRP-2026-005",
    hostOrgIcaoCode: "ATNS", // South Africa
    status: "PLANNING" as ReviewStatus,
    phase: "PREPARATION" as ReviewPhase,
    type: "FULL" as ReviewType,
    startDaysFromNow: 45,
    endDaysFromNow: 59,
    teamMembers: [
      { orgIcaoCode: "ASECNA", role: "LEAD_REVIEWER" as TeamRole }, // ASECNANA
      { orgIcaoCode: "CAAB", role: "REVIEWER" as TeamRole }, // Botswana
    ],
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedReviews(): Promise<void> {
  console.log("\n📋 Seeding Demo Reviews...\n");

  const today = new Date();
  let reviewCount = 0;
  let teamMemberCount = 0;

  for (const reviewConfig of DEMO_REVIEWS) {
    // Find host organization
    const hostOrg = await prisma.organization.findFirst({
      where: { organizationCode: reviewConfig.hostOrgIcaoCode },
    });

    if (!hostOrg) {
      console.log(`  ⚠️ Host org not found: ${reviewConfig.hostOrgIcaoCode}`);
      continue;
    }

    // Create or update review
    let review = await prisma.review.findFirst({
      where: { referenceNumber: reviewConfig.referenceNumber },
    });

    const reviewData = {
      referenceNumber: reviewConfig.referenceNumber,
      hostOrganizationId: hostOrg.id,
      status: reviewConfig.status,
      phase: reviewConfig.phase,
      reviewType: reviewConfig.type,
      requestedDate: addDays(today, reviewConfig.startDaysFromNow - 30),
      plannedStartDate: addDays(today, reviewConfig.startDaysFromNow),
      plannedEndDate: addDays(today, reviewConfig.endDaysFromNow),
      objectives: `Comprehensive peer review of ${hostOrg.nameEn} air navigation services to assess compliance with ICAO standards and identify areas for improvement.`,
      specialRequirements:
        reviewConfig.type === "FOCUSED"
          ? "Focus on SMS implementation and safety risk management"
          : null,
      accommodationProvided: true,
      transportationProvided: true,
    };

    if (review) {
      review = await prisma.review.update({
        where: { id: review.id },
        data: reviewData,
      });
    } else {
      review = await prisma.review.create({
        data: reviewData,
      });
    }
    reviewCount++;

    console.log(
      `  ✅ ${reviewConfig.referenceNumber}: ${hostOrg.nameEn} (${reviewConfig.status})`
    );

    // Assign team members
    for (const member of reviewConfig.teamMembers) {
      const memberOrg = await prisma.organization.findFirst({
        where: { organizationCode: member.orgIcaoCode },
      });

      if (!memberOrg) {
        console.log(`    ⚠️ Member org not found: ${member.orgIcaoCode}`);
        continue;
      }

      // Find a reviewer from this organization with appropriate qualification
      const reviewer = await prisma.reviewerProfile.findFirst({
        where: {
          homeOrganizationId: memberOrg.id,
          status:
            member.role === "LEAD_REVIEWER" ? "LEAD_QUALIFIED" : "CERTIFIED",
        },
        include: { user: true },
      });

      if (!reviewer) {
        // Try to find any reviewer from this org
        const anyReviewer = await prisma.reviewerProfile.findFirst({
          where: {
            homeOrganizationId: memberOrg.id,
          },
          include: { user: true },
        });

        if (!anyReviewer) {
          console.log(
            `    ⚠️ No reviewer found for ${member.orgIcaoCode}`
          );
          continue;
        }

        // Use the reviewer we found
        const existingMember = await prisma.reviewTeamMember.findFirst({
          where: {
            reviewId: review.id,
            userId: anyReviewer.userId,
          },
        });

        if (!existingMember) {
          await prisma.reviewTeamMember.create({
            data: {
              reviewId: review.id,
              userId: anyReviewer.userId,
              reviewerProfileId: anyReviewer.id,
              role: member.role,
              confirmedAt: new Date(),
            },
          });
          teamMemberCount++;
          console.log(
            `    + ${anyReviewer.user.firstName} ${anyReviewer.user.lastName} (${member.role})`
          );
        }
        continue;
      }

      // Create team member assignment
      const existingMember = await prisma.reviewTeamMember.findFirst({
        where: {
          reviewId: review.id,
          userId: reviewer.userId,
        },
      });

      if (!existingMember) {
        await prisma.reviewTeamMember.create({
          data: {
            reviewId: review.id,
            userId: reviewer.userId,
            reviewerProfileId: reviewer.id,
            role: member.role,
            confirmedAt: new Date(),
          },
        });
        teamMemberCount++;
        console.log(
          `    + ${reviewer.user.firstName} ${reviewer.user.lastName} (${member.role})`
        );
      }
    }
  }

  console.log(`\n  Total: ${reviewCount} reviews, ${teamMemberCount} team assignments`);
}

async function cleanup(): Promise<void> {
  console.log("\n🗑️ Cleaning up demo reviews...\n");

  // Delete in correct order for foreign keys
  console.log("  Deleting review team members...");
  await prisma.reviewTeamMember.deleteMany({});

  console.log("  Deleting reviews...");
  await prisma.review.deleteMany({});

  console.log("\n✅ Cleanup complete");
}

async function printSummary(): Promise<void> {
  console.log("\n" + "═".repeat(60));
  console.log("📊 REVIEW SEED SUMMARY");
  console.log("═".repeat(60));

  const reviews = await prisma.review.findMany({
    include: {
      hostOrganization: {
        include: { regionalTeam: true },
      },
      teamMembers: {
        include: {
          user: true,
          reviewerProfile: {
            include: { homeOrganization: true },
          },
        },
      },
    },
    orderBy: { referenceNumber: "asc" },
  });

  for (const review of reviews) {
    console.log(`\n${review.referenceNumber} - ${review.hostOrganization.nameEn}`);
    console.log(`  Status: ${review.status} | Phase: ${review.phase}`);
    console.log(`  Team: ${review.hostOrganization.regionalTeam?.nameEn || "N/A"}`);
    console.log("  Members:");

    if (review.teamMembers.length === 0) {
      console.log("    (No team assigned yet)");
    } else {
      for (const member of review.teamMembers) {
        const orgCode = member.reviewerProfile?.homeOrganization?.organizationCode || "N/A";
        const sameTeam =
          member.reviewerProfile?.homeOrganization?.regionalTeamId ===
          review.hostOrganization.regionalTeamId;
        const teamCheck = sameTeam ? "✓" : "✗ WRONG TEAM!";
        console.log(
          `    - ${member.user.firstName} ${member.user.lastName} (${orgCode}) - ${member.role} ${teamCheck}`
        );
      }
    }
  }

  const totalReviews = await prisma.review.count();
  const totalMembers = await prisma.reviewTeamMember.count();

  console.log("\n" + "═".repeat(60));
  console.log(`Total: ${totalReviews} reviews, ${totalMembers} team assignments`);
  console.log("═".repeat(60));
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const command = process.argv[2];

  try {
    if (command === "cleanup") {
      await cleanup();
    } else {
      await seedReviews();
      await printSummary();
    }
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
