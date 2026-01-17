/**
 * Missing ANS Protocol Questions Seeder
 *
 * Seeds the 23 ANS questions that were missing due to PDF conversion artifacts.
 * These questions were manually extracted from IP03-USOAP-Update.pdf.
 *
 * Run after seed-ans-questions.ts and seed-ans-questions-v2.ts.
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

async function seedMissingANSQuestions() {
  console.log("🚀 Starting missing ANS questions seeding...\n");

  // 1. Load missing questions JSON
  const jsonPath = path.join(process.cwd(), "scripts", "missing-ans-questions.json");

  if (!fs.existsSync(jsonPath)) {
    console.error("❌ missing-ans-questions.json not found.");
    process.exit(1);
  }

  const missingQuestions: ParsedQuestion[] = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8")
  );
  console.log(`📄 Loaded ${missingQuestions.length} questions from JSON\n`);

  // 2. Find the ANS questionnaire
  const questionnaire = await prisma.questionnaire.findFirst({
    where: { type: "ANS_USOAP_CMA" },
  });

  if (!questionnaire) {
    console.error("❌ ANS_USOAP_CMA questionnaire not found.");
    console.error("   Run 'npx tsx scripts/seed-ans-questions.ts' first.");
    process.exit(1);
  }

  console.log(`📋 Using questionnaire: ${questionnaire.code}\n`);

  // 3. Get existing questions to avoid duplicates
  const existingQuestions = await prisma.question.findMany({
    where: {
      questionnaireId: questionnaire.id,
      auditArea: "ANS",
    },
    select: { pqNumber: true },
  });

  const existingPQs = new Set(existingQuestions.map((q) => q.pqNumber));
  console.log(`📊 Found ${existingPQs.size} existing ANS questions\n`);

  // 4. Get categories by Critical Element
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

  console.log(`📂 Found ${categoryMap.size} categories mapped to CEs\n`);

  // 5. Insert new questions
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const q of missingQuestions) {
    if (existingPQs.has(q.pqNumber)) {
      console.log(`⏭️  Skipping ${q.pqNumber} (already exists)`);
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
          questionTextEn: q.questionTextEn,
          questionTextFr: q.questionTextFr,
          guidanceEn: q.guidanceEn,
          guidanceFr: q.guidanceFr,
          sortOrder: parseInt(q.pqNumber.replace("7.", "")) || 0,
        },
      });
      created++;
      console.log(`✅ Created ${q.pqNumber} - ${q.questionTextEn.substring(0, 50)}...`);
    } catch (error: unknown) {
      errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating ${q.pqNumber}:`, message);
    }
  }

  // 6. Final summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 MISSING ANS QUESTIONS SEEDING SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped (existing): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  // 7. Verify final count
  const finalANSCount = await prisma.question.count({
    where: {
      questionnaireId: questionnaire.id,
      auditArea: "ANS",
    },
  });
  console.log(`\n📈 Total ANS questions in database: ${finalANSCount}`);

  // 8. Show breakdown by CE
  const byCE = await prisma.question.groupBy({
    by: ["criticalElement"],
    where: {
      questionnaireId: questionnaire.id,
      auditArea: "ANS",
    },
    _count: true,
  });

  console.log("\n📊 ANS Questions by Critical Element:");
  byCE.sort((a, b) => (a.criticalElement || "").localeCompare(b.criticalElement || ""));
  byCE.forEach((ce) => {
    console.log(`   ${ce.criticalElement}: ${ce._count}`);
  });

  // 9. Show all questions by audit area
  const byArea = await prisma.question.groupBy({
    by: ["auditArea"],
    _count: true,
  });

  console.log("\n📊 All Questions by Audit Area:");
  byArea.forEach((area) => {
    console.log(`   ${area.auditArea || "NULL"}: ${area._count}`);
  });

  const total = await prisma.question.count();
  console.log(`\n📈 Total questions in database: ${total}`);

  // 10. Priority PQ count
  const ppqCount = await prisma.question.count({
    where: {
      questionnaireId: questionnaire.id,
      auditArea: "ANS",
      isPriorityPQ: true,
    },
  });
  console.log(`\n📌 Total ANS Priority PQs (PPQ): ${ppqCount}`);

  await prisma.$disconnect();
  await pool.end();

  console.log("\n✅ Missing ANS questions seeding complete!");
}

seedMissingANSQuestions().catch(async (error) => {
  console.error("💥 Seeding failed:", error);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
