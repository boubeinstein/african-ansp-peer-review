import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkQuestions() {
  console.log("=== QUESTIONNAIRE DIAGNOSTICS ===\n");

  // 1. Check questionnaires
  const questionnaires = await prisma.questionnaire.findMany({
    select: {
      id: true,
      code: true,
      type: true,
      titleEn: true,
      _count: {
        select: {
          questions: true,
          categories: true,
        },
      },
    },
  });

  console.log("QUESTIONNAIRES:");
  if (questionnaires.length === 0) {
    console.log("  ❌ NO QUESTIONNAIRES FOUND");
  } else {
    questionnaires.forEach((q) => {
      console.log(`  - ${q.code} (${q.type}): ${q._count.questions} questions, ${q._count.categories} categories`);
    });
  }

  // 2. Check categories per questionnaire
  console.log("\nCATEGORIES BY QUESTIONNAIRE:");
  for (const q of questionnaires) {
    const categories = await prisma.questionnaireCategory.findMany({
      where: { questionnaireId: q.id },
      select: {
        code: true,
        auditArea: true,
        nameEn: true,
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    console.log(`\n  ${q.code}:`);
    if (categories.length === 0) {
      console.log("    ❌ NO CATEGORIES");
    } else {
      categories.forEach((c) => {
        console.log(`    - ${c.code} (${c.auditArea || "N/A"}): ${c._count.questions} questions - "${c.nameEn?.substring(0, 50)}..."`);
      });
    }
  }

  // 3. Check total questions by audit area
  console.log("\n\nQUESTIONS BY AUDIT AREA:");
  const byAuditArea = await prisma.question.groupBy({
    by: ["auditArea"],
    _count: { id: true },
  });

  if (byAuditArea.length === 0) {
    console.log("  ❌ NO QUESTIONS FOUND");
  } else {
    byAuditArea.forEach((area) => {
      console.log(`  - ${area.auditArea || "NULL"}: ${area._count.id} questions`);
    });
  }

  // 4. Check expected vs actual for ANS questionnaire (USOAP CMA 2024)
  console.log("\n=== EXPECTED VS ACTUAL (USOAP CMA 2024) ===");
  const expected: Record<string, number> = {
    LEG: 23,
    ORG: 13,
    PEL: 100,
    OPS: 136,
    AIR: 198,
    AIG: 84,
    ANS: 128,
    AGA: 153,
    SSP: 16,
  };

  let totalExpected = 0;
  let totalActual = 0;

  for (const [area, count] of Object.entries(expected)) {
    const actual = byAuditArea.find((a) => a.auditArea === area)?._count.id || 0;
    const status = actual === count ? "✅" : actual === 0 ? "❌ MISSING" : `⚠️ ${actual}/${count}`;
    console.log(`  ${area}: Expected ${count}, Actual ${actual} ${status}`);
    totalExpected += count;
    totalActual += actual;
  }

  console.log(`\n  TOTAL: Expected ${totalExpected}, Actual ${totalActual}`);

  if (totalActual < totalExpected) {
    console.log("\n⚠️  DATABASE IS INCOMPLETE - Need to seed remaining questions");
  } else if (totalActual === totalExpected) {
    console.log("\n✅ All USOAP CMA 2024 questions present");
  }

  // 5. Check SMS questionnaire
  console.log("\n=== SMS QUESTIONNAIRE (CANSO SoE) ===");
  const smsQuestionnaire = questionnaires.find(q => q.type === "SMS_CANSO_SOE");
  if (smsQuestionnaire) {
    console.log(`  SMS Questions: ${smsQuestionnaire._count.questions}`);
    console.log(`  SMS Categories: ${smsQuestionnaire._count.categories}`);
  } else {
    console.log("  ❌ SMS Questionnaire not found");
  }

  // 6. Sample questions
  console.log("\n=== SAMPLE QUESTIONS ===");
  const sampleQuestions = await prisma.question.findMany({
    take: 5,
    select: {
      pqNumber: true,
      auditArea: true,
      questionTextEn: true,
      category: {
        select: {
          code: true,
        },
      },
    },
    orderBy: { pqNumber: "asc" },
  });

  sampleQuestions.forEach((q) => {
    console.log(`  - ${q.pqNumber} (${q.auditArea}): "${q.questionTextEn?.substring(0, 60)}..."`);
  });

  await prisma.$disconnect();
  await pool.end();
}

checkQuestions().catch(async (error) => {
  console.error("Error:", error);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
