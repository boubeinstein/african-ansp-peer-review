/**
 * ANS Protocol Questions Seeder V2
 *
 * Seeds additional ANS questions from V2 parsing that weren't in V1.
 * Run after seed-ans-questions.ts to add missing questions.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ParsedQuestion {
  pqNumber: string;
  questionTextEn: string;
  questionTextFr: string;
  guidanceEn: string;
  guidanceFr: string;
  icaoReferences: string;
  isPriorityPQ: boolean;
  criticalElement: string;
  requiresOnSite: boolean;
  auditArea: string;
}

const VALID_CE = ["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"];

async function seedANSQuestionsV2() {
  console.log("🚀 Starting ANS questions V2 seeding...\\n");

  // 1. Load V2 parsed questions
  const v2Path = path.join(process.cwd(), "scripts", "parsed-ans-questions-v2.json");

  if (!fs.existsSync(v2Path)) {
    console.error("❌ parsed-ans-questions-v2.json not found.");
    console.error("   Run 'npx tsx scripts/parse-ans-questions-v2.ts' first.");
    process.exit(1);
  }

  const v2Questions: ParsedQuestion[] = JSON.parse(
    fs.readFileSync(v2Path, "utf-8")
  );
  console.log(`📄 Loaded ${v2Questions.length} questions from V2 JSON\\n`);

  // 2. Find the ANS questionnaire
  const questionnaire = await prisma.questionnaire.findFirst({
    where: { type: "ANS_USOAP_CMA" },
  });

  if (!questionnaire) {
    console.error("❌ ANS_USOAP_CMA questionnaire not found.");
    console.error("   Run 'npx tsx scripts/seed-ans-questions.ts' first.");
    process.exit(1);
  }

  console.log(`📋 Using questionnaire: ${questionnaire.code}\\n`);

  // 3. Get existing questions
  const existingQuestions = await prisma.question.findMany({
    where: {
      questionnaireId: questionnaire.id,
      auditArea: "ANS",
    },
    select: { pqNumber: true },
  });

  const existingPQs = new Set(existingQuestions.map((q) => q.pqNumber));
  console.log(`📊 Found ${existingPQs.size} existing ANS questions\\n`);

  // 4. Get categories
  const categories = await prisma.questionnaireCategory.findMany({
    where: { questionnaireId: questionnaire.id },
    select: { id: true, code: true, criticalElement: true },
  });

  const categoryMap = new Map<string, string>();
  categories.forEach((c) => {
    if (c.criticalElement) {
      categoryMap.set(c.criticalElement, c.id);
    }
  });

  // 5. Insert new questions
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const q of v2Questions) {
    if (existingPQs.has(q.pqNumber)) {
      skipped++;
      continue;
    }

    try {
      const ce = (VALID_CE.includes(q.criticalElement)
        ? q.criticalElement
        : "CE_1") as "CE_1" | "CE_2" | "CE_3" | "CE_4" | "CE_5" | "CE_6" | "CE_7" | "CE_8";
      const categoryId = categoryMap.get(ce);

      if (!categoryId) {
        console.error(`❌ No category found for CE: ${ce}`);
        errors++;
        continue;
      }

      await prisma.question.create({
        data: {
          questionnaireId: questionnaire.id,
          categoryId: categoryId,
          pqNumber: q.pqNumber,
          auditArea: "ANS",
          criticalElement: ce,
          isPriorityPQ: q.isPriorityPQ,
          requiresOnSite: q.requiresOnSite,
          pqStatus: "NO_CHANGE",
          questionTextEn: q.questionTextEn || `Protocol Question ${q.pqNumber}`,
          questionTextFr: q.questionTextFr || `[FR] Protocol Question ${q.pqNumber}`,
          guidanceEn: q.guidanceEn || "",
          guidanceFr: q.guidanceFr || "",
          sortOrder: parseInt(q.pqNumber.replace("7.", "")) || 0,
        },
      });
      created++;
      process.stdout.write(`✅ ${q.pqNumber} `);

      if (created % 10 === 0) console.log();
    } catch (error: unknown) {
      errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\\n❌ Error creating ${q.pqNumber}:`, message);
    }
  }

  // 6. Final summary
  console.log("\\n\\n" + "=".repeat(50));
  console.log("📊 V2 SEEDING SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped (existing): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  // 7. Verify final count
  const finalCount = await prisma.question.count({
    where: {
      questionnaireId: questionnaire.id,
      auditArea: "ANS",
    },
  });
  console.log(`\\n📈 Total ANS questions in database: ${finalCount}`);

  // 8. Show breakdown by CE
  const byCE = await prisma.question.groupBy({
    by: ["criticalElement"],
    where: {
      questionnaireId: questionnaire.id,
      auditArea: "ANS",
    },
    _count: true,
  });

  console.log("\\n📊 ANS Questions by Critical Element:");
  byCE.forEach((ce) => {
    console.log(`   ${ce.criticalElement}: ${ce._count}`);
  });

  // 9. Show all questions by audit area
  const byArea = await prisma.question.groupBy({
    by: ["auditArea"],
    _count: true,
  });

  console.log("\\n📊 All Questions by Audit Area:");
  byArea.forEach((area) => {
    console.log(`   ${area.auditArea || "NULL"}: ${area._count}`);
  });

  const total = await prisma.question.count();
  console.log(`\\n📈 Total questions in database: ${total}`);

  // 10. List missing PQs for documentation
  const allParsedPQs = new Set(v2Questions.map(q => q.pqNumber));
  const expectedPQs = [
    "7.003", "7.005", "7.042", "7.085", "7.111", "7.133", "7.135", "7.137",
    "7.183", "7.185", "7.189", "7.201", "7.215", "7.229", "7.255", "7.303",
    "7.311", "7.321", "7.361", "7.363", "7.390", "7.393", "7.403", "7.429",
    "7.451", "7.461", "7.467", "7.477", "7.519"
  ];

  const stillMissing = expectedPQs.filter(pq => !allParsedPQs.has(pq) && !existingPQs.has(pq));
  if (stillMissing.length > 0) {
    console.log(`\\n⚠️  ${stillMissing.length} PQs require manual entry (PDF conversion artifacts):`);
    console.log(`   ${stillMissing.join(", ")}`);
  }

  await prisma.$disconnect();
  await pool.end();

  console.log("\\n✅ V2 Seeding complete!");
}

seedANSQuestionsV2().catch(async (error) => {
  console.error("💥 Seeding failed:", error);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
