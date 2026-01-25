/**
 * AAPRP Training Demo Data Seed Script - Part 4
 * Creates sample self-assessments with responses
 *
 * Run with: npm run db:seed:training-part4
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  AssessmentStatus,
  QuestionnaireType,
} from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────
// ASSESSMENT DEFINITIONS
// ─────────────────────────────────────────────────────────────────

interface AssessmentDef {
  orgCode: string;
  type: QuestionnaireType;
  status: AssessmentStatus;
  progress: number;
  title: string;
}

const DEMO_ASSESSMENTS: AssessmentDef[] = [
  {
    orgCode: "ASEC",
    type: "ANS_USOAP_CMA" as QuestionnaireType,
    status: "COMPLETED" as AssessmentStatus,
    progress: 100,
    title: "ASECNA ANS Self-Assessment 2025",
  },
  {
    orgCode: "ASEC",
    type: "SMS_CANSO_SOE" as QuestionnaireType,
    status: "COMPLETED" as AssessmentStatus,
    progress: 100,
    title: "ASECNA SMS Self-Assessment 2025",
  },
  {
    orgCode: "ATNS",
    type: "ANS_USOAP_CMA" as QuestionnaireType,
    status: "SUBMITTED" as AssessmentStatus,
    progress: 100,
    title: "ATNS ANS Self-Assessment 2025",
  },
  {
    orgCode: "HKJK",
    type: "ANS_USOAP_CMA" as QuestionnaireType,
    status: "UNDER_REVIEW" as AssessmentStatus,
    progress: 100,
    title: "KCAA ANS Self-Assessment 2026",
  },
  {
    orgCode: "HKJK",
    type: "SMS_CANSO_SOE" as QuestionnaireType,
    status: "DRAFT" as AssessmentStatus,
    progress: 40,
    title: "KCAA SMS Self-Assessment 2026",
  },
  {
    orgCode: "GLRB",
    type: "ANS_USOAP_CMA" as QuestionnaireType,
    status: "DRAFT" as AssessmentStatus,
    progress: 75,
    title: "Roberts FIR ANS Self-Assessment 2026",
  },
  {
    orgCode: "GLRB",
    type: "SMS_CANSO_SOE" as QuestionnaireType,
    status: "DRAFT" as AssessmentStatus,
    progress: 20,
    title: "Roberts FIR SMS Self-Assessment 2026",
  },
  {
    orgCode: "DNAA",
    type: "ANS_USOAP_CMA" as QuestionnaireType,
    status: "COMPLETED" as AssessmentStatus,
    progress: 100,
    title: "NAMA ANS Self-Assessment 2025",
  },
  {
    orgCode: "HTDA",
    type: "ANS_USOAP_CMA" as QuestionnaireType,
    status: "DRAFT" as AssessmentStatus,
    progress: 10,
    title: "TCAA ANS Self-Assessment 2026",
  },
  {
    orgCode: "DGAA",
    type: "SMS_CANSO_SOE" as QuestionnaireType,
    status: "DRAFT" as AssessmentStatus,
    progress: 55,
    title: "GCAA SMS Self-Assessment 2026",
  },
];

// ─────────────────────────────────────────────────────────────────
// SEED ASSESSMENTS
// ─────────────────────────────────────────────────────────────────

async function seedAssessments() {
  console.log("\n📊 Creating demo assessments...\n");

  let assessmentCount = 0;
  let responseCount = 0;

  for (const def of DEMO_ASSESSMENTS) {
    // Get organization
    const org = await prisma.organization.findFirst({
      where: { organizationCode: def.orgCode },
    });

    if (!org) {
      console.log(`   ⚠️  Organization not found: ${def.orgCode}`);
      continue;
    }

    // Check if assessment already exists
    const existing = await prisma.assessment.findFirst({
      where: {
        organizationId: org.id,
        title: def.title,
      },
    });

    if (existing) {
      console.log(`   ⏭️  Assessment exists: ${def.title}`);
      continue;
    }

    // Get questionnaire
    const questionnaire = await prisma.questionnaire.findFirst({
      where: { type: def.type },
    });

    if (!questionnaire) {
      console.log(`   ⚠️  Questionnaire not found: ${def.type}`);
      continue;
    }

    // Get creator (user from organization)
    const creator = await prisma.user.findFirst({
      where: { organizationId: org.id },
    });

    if (!creator) {
      console.log(`   ⚠️  No user found for: ${def.orgCode}`);
      continue;
    }

    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        title: def.title,
        description: `Self-assessment for ${org.nameEn} - ${def.type === "ANS_USOAP_CMA" ? "ANS USOAP CMA" : "SMS CANSO SoE"}`,
        organizationId: org.id,
        questionnaireId: questionnaire.id,
        status: def.status,
        progress: def.progress,
        submittedAt: ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(def.status)
          ? new Date()
          : null,
        completedAt: def.status === "COMPLETED" ? new Date() : null,
      },
    });

    assessmentCount++;
    console.log(
      `   ✅ Created: ${def.title} (${def.status}, ${def.progress}%)`
    );

    // Add sample responses if progress > 0
    if (def.progress > 0) {
      const addedResponses = await seedAssessmentResponses(
        assessment.id,
        questionnaire.id,
        def.progress,
        creator.id
      );
      responseCount += addedResponses;
    }
  }

  console.log(
    `\n   📊 Summary: ${assessmentCount} assessments, ${responseCount} responses created`
  );
}

// ─────────────────────────────────────────────────────────────────
// SEED ASSESSMENT RESPONSES
// ─────────────────────────────────────────────────────────────────

async function seedAssessmentResponses(
  assessmentId: string,
  questionnaireId: string,
  progress: number,
  responderId: string
): Promise<number> {
  // Get questions for this questionnaire
  const questions = await prisma.question.findMany({
    where: { questionnaireId },
    orderBy: { sortOrder: "asc" },
  });

  const totalQuestions = questions.length;
  const questionsToAnswer = Math.floor((progress / 100) * totalQuestions);

  if (totalQuestions === 0) {
    console.log(`      ⚠️  No questions found for questionnaire`);
    return 0;
  }

  // Sample responses for SATISFACTORY_NOT type
  const responseOptions = ["SATISFACTORY", "NOT_SATISFACTORY", "NOT_APPLICABLE"];
  const weights = [0.7, 0.2, 0.1]; // 70% satisfactory, 20% not satisfactory, 10% N/A

  let addedCount = 0;

  for (let i = 0; i < questionsToAnswer && i < questions.length; i++) {
    const question = questions[i];

    // Check if response exists
    const existing = await prisma.assessmentResponse.findFirst({
      where: {
        assessmentId,
        questionId: question.id,
      },
    });

    if (existing) continue;

    // Weighted random response
    const rand = Math.random();
    let responseValue: string;
    if (rand < weights[0]) {
      responseValue = responseOptions[0];
    } else if (rand < weights[0] + weights[1]) {
      responseValue = responseOptions[1];
    } else {
      responseValue = responseOptions[2];
    }

    await prisma.assessmentResponse.create({
      data: {
        assessmentId,
        questionId: question.id,
        responseValue,
        notes:
          responseValue === "NOT_SATISFACTORY"
            ? "Improvement needed in this area. Action plan being developed."
            : null,
        respondedById: responderId,
        respondedAt: new Date(),
      },
    });

    addedCount++;
  }

  console.log(`      📝 Added ${addedCount} responses`);
  return addedCount;
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║     AAPRP Training Demo Data - Part 4: Assessments         ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n"
  );

  try {
    await seedAssessments();
    console.log("\n✅ Part 4 complete! All demo data seeded.\n");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
