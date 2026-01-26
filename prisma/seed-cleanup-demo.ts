/**
 * Comprehensive Demo Data Cleanup Script
 *
 * Cleans up all demo and training data in the correct order.
 * Preserves base data (questionnaires, base users).
 *
 * Usage:
 *   npm run db:seed:cleanup          - Full cleanup of demo data
 *   npx tsx prisma/seed-cleanup-demo.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Demo data prefixes
const DEMO_PREFIX = "DEMO-";
const TRAINING_PREFIX = "TRAIN-";

// Wrong users to delete (from seed-ansp-admins.ts)
const WRONG_EMAILS_TO_DELETE = [
  "admin@dca.gov.mw",   // Should be admin@mcaa.gov.mw
  "admin@adema.mg",     // Should be admin@acm.mg
  "admin@onda.ma",      // Should be admin@dgac.ma
  "admin@enna.dz",      // Should be admin@anac.dz
];

async function cleanupTrainingData() {
  console.log("\n🎓 Cleaning up training demo data...\n");

  const deletions = [
    // Training-specific data
    {
      name: "Fieldwork Checklist Items",
      fn: () => prisma.fieldworkChecklistItem.deleteMany({
        where: { review: { referenceNumber: { startsWith: TRAINING_PREFIX } } },
      }),
    },
    {
      name: "Fieldwork Checklists",
      fn: () => prisma.fieldworkChecklist.deleteMany({
        where: { review: { referenceNumber: { startsWith: TRAINING_PREFIX } } },
      }),
    },
    {
      name: "Documents (Training)",
      fn: () => prisma.document.deleteMany({
        where: { review: { referenceNumber: { startsWith: TRAINING_PREFIX } } },
      }),
    },
    {
      name: "CAPs (Training)",
      fn: () => prisma.correctiveActionPlan.deleteMany({
        where: { finding: { referenceNumber: { startsWith: TRAINING_PREFIX } } },
      }),
    },
    {
      name: "Assessment Responses (Training)",
      fn: () => prisma.assessmentResponse.deleteMany({
        where: { assessment: { referenceNumber: { startsWith: TRAINING_PREFIX } } },
      }),
    },
    {
      name: "Assessments (Training)",
      fn: () => prisma.assessment.deleteMany({
        where: { referenceNumber: { startsWith: TRAINING_PREFIX } },
      }),
    },
    {
      name: "Findings (Training)",
      fn: () => prisma.finding.deleteMany({
        where: { referenceNumber: { startsWith: TRAINING_PREFIX } },
      }),
    },
    {
      name: "Review Reports (Training)",
      fn: () => prisma.reviewReport.deleteMany({
        where: { review: { referenceNumber: { startsWith: TRAINING_PREFIX } } },
      }),
    },
    {
      name: "Review Team Members (Training)",
      fn: () => prisma.reviewTeamMember.deleteMany({
        where: { review: { referenceNumber: { startsWith: TRAINING_PREFIX } } },
      }),
    },
    {
      name: "Reviews (Training)",
      fn: () => prisma.review.deleteMany({
        where: { referenceNumber: { startsWith: TRAINING_PREFIX } },
      }),
    },
  ];

  for (const { name, fn } of deletions) {
    try {
      const result = await fn();
      if (result.count > 0) {
        console.log(`   ✓ Deleted ${result.count} ${name}`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${name}: ${(error as Error).message}`);
    }
  }
}

async function cleanupDemoData() {
  console.log("\n🗑️  Cleaning up DEMO- prefixed data...\n");

  const deletions = [
    {
      name: "CAPs",
      fn: () => prisma.correctiveActionPlan.deleteMany({
        where: { finding: { referenceNumber: { startsWith: DEMO_PREFIX } } },
      }),
    },
    {
      name: "Assessment Responses",
      fn: () => prisma.assessmentResponse.deleteMany({
        where: { assessment: { referenceNumber: { startsWith: DEMO_PREFIX } } },
      }),
    },
    {
      name: "Assessments",
      fn: () => prisma.assessment.deleteMany({
        where: { referenceNumber: { startsWith: DEMO_PREFIX } },
      }),
    },
    {
      name: "Findings",
      fn: () => prisma.finding.deleteMany({
        where: { referenceNumber: { startsWith: DEMO_PREFIX } },
      }),
    },
    {
      name: "Review Reports",
      fn: () => prisma.reviewReport.deleteMany({
        where: { review: { referenceNumber: { startsWith: DEMO_PREFIX } } },
      }),
    },
    {
      name: "Review Team Members",
      fn: () => prisma.reviewTeamMember.deleteMany({
        where: { review: { referenceNumber: { startsWith: DEMO_PREFIX } } },
      }),
    },
    {
      name: "Reviews",
      fn: () => prisma.review.deleteMany({
        where: { referenceNumber: { startsWith: DEMO_PREFIX } },
      }),
    },
  ];

  for (const { name, fn } of deletions) {
    try {
      const result = await fn();
      if (result.count > 0) {
        console.log(`   ✓ Deleted ${result.count} ${name}`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${name}: ${(error as Error).message}`);
    }
  }
}

async function cleanupWrongUsers() {
  console.log("\n👤 Cleaning up incorrectly seeded users...\n");

  for (const email of WRONG_EMAILS_TO_DELETE) {
    const result = await prisma.user.deleteMany({ where: { email } });
    if (result.count > 0) {
      console.log(`   ✓ Deleted: ${email}`);
    }
  }
}

async function cleanupOrphanedData() {
  console.log("\n🧹 Cleaning up orphaned data...\n");

  // Delete documents not linked to reviews (with reviewId = null) but are demo/training related
  // Note: Documents may be linked via assessments or findings, so be careful not to delete all unlinked docs
  try {
    const orphanedDocs = await prisma.document.deleteMany({
      where: {
        reviewId: null,
        assessmentId: null,
        findingId: null,
        capId: null,
        isDeleted: true,
      },
    });
    if (orphanedDocs.count > 0) {
      console.log(`   ✓ Deleted ${orphanedDocs.count} orphaned/deleted documents`);
    }
  } catch (error) {
    console.log(`   ⚠️  Document cleanup: ${(error as Error).message}`);
  }
}

async function printStatus() {
  console.log("\n📊 Current Database Status:\n");

  const counts = {
    organizations: await prisma.organization.count(),
    teams: await prisma.regionalTeam.count(),
    users: await prisma.user.count(),
    reviewerProfiles: await prisma.reviewerProfile.count(),
    reviews: await prisma.review.count(),
    demoReviews: await prisma.review.count({
      where: { referenceNumber: { startsWith: DEMO_PREFIX } },
    }),
    trainingReviews: await prisma.review.count({
      where: { referenceNumber: { startsWith: TRAINING_PREFIX } },
    }),
    findings: await prisma.finding.count(),
    caps: await prisma.correctiveActionPlan.count(),
    assessments: await prisma.assessment.count(),
    questionnaires: await prisma.questionnaire.count(),
  };

  console.log("   Organizations:      " + counts.organizations);
  console.log("   Regional Teams:     " + counts.teams);
  console.log("   Users:              " + counts.users);
  console.log("   Reviewer Profiles:  " + counts.reviewerProfiles);
  console.log("   Reviews (total):    " + counts.reviews);
  console.log("   - Demo Reviews:     " + counts.demoReviews);
  console.log("   - Training Reviews: " + counts.trainingReviews);
  console.log("   Findings:           " + counts.findings);
  console.log("   CAPs:               " + counts.caps);
  console.log("   Assessments:        " + counts.assessments);
  console.log("   Questionnaires:     " + counts.questionnaires);
}

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("🧹 AAPRP COMPREHENSIVE DEMO DATA CLEANUP");
  console.log("═".repeat(60));

  try {
    // 1. Show initial status
    console.log("\n📍 BEFORE CLEANUP:");
    await printStatus();

    // 2. Cleanup in order
    await cleanupTrainingData();
    await cleanupDemoData();
    await cleanupWrongUsers();
    await cleanupOrphanedData();

    // 3. Show final status
    console.log("\n📍 AFTER CLEANUP:");
    await printStatus();

    console.log("\n" + "═".repeat(60));
    console.log("✅ CLEANUP COMPLETE");
    console.log("═".repeat(60));
    console.log("\n🔧 Next steps:");
    console.log("   1. npm run db:seed:teams          - Seed teams & organizations");
    console.log("   2. npm run db:seed:ansp-admins    - Seed ANSP admin users");
    console.log("   3. npm run db:seed:training-all   - Seed training demo data");
    console.log("   OR");
    console.log("   npm run db:seed:fresh             - Run all seeds in order\n");

  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
