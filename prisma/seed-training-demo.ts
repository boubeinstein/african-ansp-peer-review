/**
 * AAPRP Training Demo Data Seed Script
 *
 * Creates comprehensive demo data for the AFI Peer Reviewers' Refresher Training
 * Date: March 23-26, 2026 (Dar es Salaam, Tanzania)
 *
 * Run with: npm run db:seed:training-demo
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

// Initialize Prisma with pg adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

async function getOrganizationByCode(code: string) {
  const org = await prisma.organization.findFirst({
    where: { organizationCode: code },
  });
  if (!org) throw new Error(`Organization not found: ${code}`);
  return org;
}

async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) throw new Error(`User not found: ${email}`);
  return user;
}

async function getCoordinator() {
  // Find any user with PROGRAMME_COORDINATOR role
  const coordinator = await prisma.user.findFirst({
    where: { role: "PROGRAMME_COORDINATOR" },
  });
  if (!coordinator) throw new Error("No programme coordinator found");
  return coordinator;
}

async function getReviewerForOrg(orgCode: string, leadQualified: boolean = false) {
  const org = await getOrganizationByCode(orgCode);
  const profile = await prisma.reviewerProfile.findFirst({
    where: {
      homeOrganizationId: org.id,
      ...(leadQualified ? { status: "LEAD_QUALIFIED" } : {}),
    },
    include: { user: true },
  });
  return profile;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ─────────────────────────────────────────────────────────────────
// REVIEW CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────

interface TeamMemberConfig {
  orgCode: string;
  role: TeamRole;
}

interface ReviewConfig {
  referenceNumber: string;
  hostOrgCode: string;
  status: ReviewStatus;
  phase: ReviewPhase;
  reviewType: ReviewType;
  description: string;
  startDaysFromNow: number;
  endDaysFromNow: number;
  teamMembers: TeamMemberConfig[];
}

// 5 demo reviews at different stages for training
const DEMO_REVIEWS: ReviewConfig[] = [
  {
    // Completed review with full workflow
    referenceNumber: "AAPRP-DEMO-001",
    hostOrgCode: "FVHA", // Zimbabwe
    status: "COMPLETED" as ReviewStatus,
    phase: "CLOSED" as ReviewPhase,
    reviewType: "FULL" as ReviewType,
    description: "Completed peer review demonstrating full workflow with findings and CAPs",
    startDaysFromNow: -60,
    endDaysFromNow: -46,
    teamMembers: [
      { orgCode: "FBSK", role: "LEAD_REVIEWER" as TeamRole }, // Botswana
      { orgCode: "FMMI", role: "REVIEWER" as TeamRole }, // Madagascar
      { orgCode: "FLKK", role: "REVIEWER" as TeamRole }, // Zambia
    ],
  },
  {
    // Review in reporting phase
    referenceNumber: "AAPRP-DEMO-002",
    hostOrgCode: "HKJK", // Kenya
    status: "IN_PROGRESS" as ReviewStatus,
    phase: "REPORTING" as ReviewPhase,
    reviewType: "FULL" as ReviewType,
    description: "Review in reporting phase - draft report being prepared",
    startDaysFromNow: -20,
    endDaysFromNow: -6,
    teamMembers: [
      { orgCode: "HTDA", role: "LEAD_REVIEWER" as TeamRole }, // Tanzania
      { orgCode: "HUEN", role: "REVIEWER" as TeamRole }, // Uganda
      { orgCode: "HRYR", role: "REVIEWER" as TeamRole }, // Rwanda
    ],
  },
  {
    // Review in fieldwork phase (active)
    referenceNumber: "AAPRP-DEMO-003",
    hostOrgCode: "DNAA", // Nigeria
    status: "IN_PROGRESS" as ReviewStatus,
    phase: "ON_SITE" as ReviewPhase,
    reviewType: "FULL" as ReviewType,
    description: "Active fieldwork phase - on-site activities in progress",
    startDaysFromNow: -5,
    endDaysFromNow: 6,
    teamMembers: [
      { orgCode: "DGAA", role: "LEAD_REVIEWER" as TeamRole }, // Ghana
      { orgCode: "GLRB", role: "REVIEWER" as TeamRole }, // Roberts FIR
    ],
  },
  {
    // Review in planning phase
    referenceNumber: "AAPRP-DEMO-004",
    hostOrgCode: "FQMA", // Mozambique
    status: "APPROVED" as ReviewStatus,
    phase: "PLANNING" as ReviewPhase,
    reviewType: "FULL" as ReviewType,
    description: "Review in planning phase - team assignment complete",
    startDaysFromNow: 30,
    endDaysFromNow: 41,
    teamMembers: [
      { orgCode: "ATNS", role: "LEAD_REVIEWER" as TeamRole }, // South Africa
      { orgCode: "FMMI", role: "REVIEWER" as TeamRole }, // Madagascar
    ],
  },
  {
    // Newly requested review
    referenceNumber: "AAPRP-DEMO-005",
    hostOrgCode: "GMMN", // Morocco
    status: "REQUESTED" as ReviewStatus,
    phase: "PLANNING" as ReviewPhase,
    reviewType: "FOCUSED" as ReviewType,
    description: "Newly requested review awaiting approval - SMS focus",
    startDaysFromNow: 60,
    endDaysFromNow: 65,
    teamMembers: [], // Not yet assigned
  },
];

// ─────────────────────────────────────────────────────────────────
// SEED: PEER REVIEWS
// ─────────────────────────────────────────────────────────────────

async function seedReviews() {
  console.log("\n📋 Creating demo peer reviews...\n");

  const today = new Date();
  const createdReviews: Array<{
    id: string;
    hostOrgCode: string;
    phase: string;
    referenceNumber: string;
  }> = [];

  for (const config of DEMO_REVIEWS) {
    // Check if review already exists
    let review = await prisma.review.findFirst({
      where: { referenceNumber: config.referenceNumber },
    });

    if (review) {
      console.log(`   ⏭️  Review already exists: ${config.referenceNumber}`);
      createdReviews.push({
        id: review.id,
        hostOrgCode: config.hostOrgCode,
        phase: config.phase,
        referenceNumber: config.referenceNumber,
      });
      continue;
    }

    const hostOrg = await getOrganizationByCode(config.hostOrgCode);

    const reviewData = {
      referenceNumber: config.referenceNumber,
      hostOrganizationId: hostOrg.id,
      status: config.status,
      phase: config.phase,
      reviewType: config.reviewType,
      requestedDate: addDays(today, config.startDaysFromNow - 30),
      plannedStartDate: addDays(today, config.startDaysFromNow),
      plannedEndDate: addDays(today, config.endDaysFromNow),
      objectives: config.description,
      specialRequirements:
        config.reviewType === "FOCUSED"
          ? "Focus on SMS implementation and safety risk management"
          : null,
      accommodationProvided: true,
      transportationProvided: true,
    };

    review = await prisma.review.create({
      data: reviewData,
    });

    console.log(
      `   ✅ Created review: ${config.referenceNumber} - ${hostOrg.nameEn} (${config.phase})`
    );
    createdReviews.push({
      id: review.id,
      hostOrgCode: config.hostOrgCode,
      phase: config.phase,
      referenceNumber: config.referenceNumber,
    });
  }

  return createdReviews;
}

// ─────────────────────────────────────────────────────────────────
// SEED: REVIEW TEAM MEMBERS
// ─────────────────────────────────────────────────────────────────

async function seedTeamMembers(
  reviews: Array<{
    id: string;
    hostOrgCode: string;
    phase: string;
    referenceNumber: string;
  }>
) {
  console.log("\n👥 Assigning review team members...\n");

  for (const review of reviews) {
    // Find the config for this review
    const config = DEMO_REVIEWS.find(
      (c) => c.referenceNumber === review.referenceNumber
    );
    if (!config || config.teamMembers.length === 0) continue;

    for (const memberConfig of config.teamMembers) {
      // Get reviewer profile from this organization
      const profile = await getReviewerForOrg(
        memberConfig.orgCode,
        memberConfig.role === "LEAD_REVIEWER"
      );

      if (!profile) {
        // Try without lead qualification requirement
        const anyProfile = await getReviewerForOrg(memberConfig.orgCode, false);
        if (!anyProfile) {
          console.log(
            `   ⚠️  No reviewer found for ${memberConfig.orgCode}`
          );
          continue;
        }

        // Check if already assigned
        const existing = await prisma.reviewTeamMember.findFirst({
          where: {
            reviewId: review.id,
            userId: anyProfile.userId,
          },
        });

        if (existing) continue;

        await prisma.reviewTeamMember.create({
          data: {
            reviewId: review.id,
            userId: anyProfile.userId,
            reviewerProfileId: anyProfile.id,
            role: memberConfig.role,
            confirmedAt: new Date(),
          },
        });

        console.log(
          `   ✅ Assigned ${anyProfile.user.firstName} ${anyProfile.user.lastName} (${memberConfig.role}) to ${review.referenceNumber}`
        );
        continue;
      }

      // Check if already assigned
      const existing = await prisma.reviewTeamMember.findFirst({
        where: {
          reviewId: review.id,
          userId: profile.userId,
        },
      });

      if (existing) continue;

      await prisma.reviewTeamMember.create({
        data: {
          reviewId: review.id,
          userId: profile.userId,
          reviewerProfileId: profile.id,
          role: memberConfig.role,
          confirmedAt: new Date(),
        },
      });

      console.log(
        `   ✅ Assigned ${profile.user.firstName} ${profile.user.lastName} (${memberConfig.role}) to ${review.referenceNumber}`
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────

export {
  seedReviews,
  seedTeamMembers,
  getOrganizationByCode,
  getUserByEmail,
  getCoordinator,
  getReviewerForOrg,
  addDays,
  prisma,
  pool,
  DEMO_REVIEWS,
};

// ─────────────────────────────────────────────────────────────────
// RUN IF EXECUTED DIRECTLY
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║     AAPRP Training Demo Data - Part 1: Reviews             ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n"
  );

  try {
    const reviews = await seedReviews();
    await seedTeamMembers(reviews);

    console.log("\n✅ Part 1 complete! Run seed-training-demo-part2.ts next.\n");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Only run if this is the main module
const isMainModule = require.main === module;
if (isMainModule) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
