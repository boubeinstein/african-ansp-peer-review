/**
 * Assessment Reference Number Migration Script
 *
 * Updates existing assessments with unique reference numbers.
 * Safe to run multiple times - will only update assessments without reference numbers.
 *
 * Reference Number Format: {ORG_CODE}-{TYPE}-{YEAR}-{SEQUENCE}
 * Example: NAMA-ANS-2026-001
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type AssessmentTypeCode = "ANS" | "SMS";

/**
 * Normalize organization code for reference number
 */
function normalizeOrgCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 10);
}

/**
 * Get assessment type code from questionnaire type
 */
function getAssessmentTypeCode(
  questionnaireType: "ANS_USOAP_CMA" | "SMS_CANSO_SOE"
): AssessmentTypeCode {
  return questionnaireType === "SMS_CANSO_SOE" ? "SMS" : "ANS";
}

/**
 * Generate assessment title
 */
function generateTitle(
  assessmentType: AssessmentTypeCode,
  referenceNumber: string
): string {
  const typeLabel = assessmentType === "ANS" ? "ANS Assessment" : "SMS Assessment";
  return `${typeLabel} - ${referenceNumber}`;
}

async function migrateAssessmentReferences() {
  console.log("=".repeat(60));
  console.log("ASSESSMENT REFERENCE NUMBER MIGRATION");
  console.log("=".repeat(60));
  console.log("");

  // 1. Find assessments without reference numbers
  const assessments = await prisma.assessment.findMany({
    where: {
      OR: [{ referenceNumber: null }, { referenceNumber: "" }],
    },
    include: {
      organization: { select: { icaoCode: true, nameEn: true } },
      questionnaire: { select: { type: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${assessments.length} assessments to migrate\n`);

  if (assessments.length === 0) {
    console.log("No assessments need migration. All assessments have reference numbers.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  // 2. Track sequences per org/type/year combination
  // First, get existing sequences from the database
  const existingRefs = await prisma.assessment.findMany({
    where: {
      referenceNumber: { not: null },
    },
    select: { referenceNumber: true },
  });

  // Build sequence map from existing references
  const sequences: Record<string, number> = {};
  for (const ref of existingRefs) {
    if (!ref.referenceNumber) continue;
    const parts = ref.referenceNumber.split("-");
    if (parts.length !== 4) continue;

    const key = `${parts[0]}-${parts[1]}-${parts[2]}`;
    const seq = parseInt(parts[3], 10);
    if (!isNaN(seq)) {
      sequences[key] = Math.max(sequences[key] || 0, seq);
    }
  }

  console.log("Current sequence state:");
  Object.entries(sequences).forEach(([key, seq]) => {
    console.log(`  ${key}: ${seq}`);
  });
  console.log("");

  // 3. Migrate each assessment
  let migrated = 0;
  let errors = 0;

  for (const assessment of assessments) {
    try {
      const orgCode = normalizeOrgCode(
        assessment.organization.icaoCode || assessment.organization.nameEn.substring(0, 6)
      );
      const typeCode = getAssessmentTypeCode(assessment.questionnaire.type);
      const year = assessment.createdAt.getFullYear();

      const key = `${orgCode}-${typeCode}-${year}`;
      sequences[key] = (sequences[key] || 0) + 1;

      const referenceNumber = `${key}-${sequences[key].toString().padStart(3, "0")}`;
      const title = generateTitle(typeCode, referenceNumber);

      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          referenceNumber,
          title,
        },
      });

      migrated++;
      console.log(`Migrated: ${assessment.id.slice(0, 8)}... -> ${referenceNumber}`);
    } catch (error: unknown) {
      errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error migrating ${assessment.id}: ${message}`);
    }
  }

  // 4. Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Migrated: ${migrated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${assessments.length}`);

  // 5. Verify all assessments now have reference numbers
  const remaining = await prisma.assessment.count({
    where: {
      OR: [{ referenceNumber: null }, { referenceNumber: "" }],
    },
  });

  if (remaining > 0) {
    console.log(`\nWarning: ${remaining} assessments still without reference numbers`);
  } else {
    console.log("\nAll assessments now have reference numbers.");
  }

  // 6. List all assessments with their new reference numbers
  const allAssessments = await prisma.assessment.findMany({
    select: {
      id: true,
      referenceNumber: true,
      title: true,
      status: true,
      organization: { select: { nameEn: true } },
    },
    orderBy: { referenceNumber: "asc" },
  });

  console.log("");
  console.log("=".repeat(60));
  console.log("ALL ASSESSMENTS");
  console.log("=".repeat(60));
  allAssessments.forEach((a) => {
    console.log(`${a.referenceNumber || "(no ref)"} | ${a.status} | ${a.organization.nameEn}`);
  });

  await prisma.$disconnect();
  await pool.end();

  console.log("\nMigration complete!");
}

migrateAssessmentReferences().catch(async (error) => {
  console.error("Migration failed:", error);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
