/**
 * Fix NULL Audit Area Questions
 *
 * Diagnoses and fixes questions with NULL audit area.
 */

import { PrismaClient, USOAPAuditArea } from "@prisma/client";
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

async function diagnoseAndFix() {
  console.log("🔍 Diagnosing NULL audit area questions...\n");

  // 1. Get all questions with NULL audit area
  const nullQuestions = await prisma.question.findMany({
    where: { auditArea: null },
    include: {
      questionnaire: { select: { id: true, code: true, type: true } },
      category: { select: { id: true, code: true, auditArea: true } },
    },
  });

  console.log(`Found ${nullQuestions.length} questions with NULL audit area\n`);

  if (nullQuestions.length === 0) {
    console.log("✅ No questions with NULL audit area - nothing to fix!");
    await cleanup();
    return;
  }

  // 2. Group by questionnaire
  const byQuestionnaire: Record<string, { type: string | null; count: number; questions: typeof nullQuestions }> = {};
  nullQuestions.forEach(q => {
    const key = q.questionnaire?.code || "NO_QUESTIONNAIRE";
    if (!byQuestionnaire[key]) {
      byQuestionnaire[key] = { type: q.questionnaire?.type || null, count: 0, questions: [] };
    }
    byQuestionnaire[key].count++;
    byQuestionnaire[key].questions.push(q);
  });

  console.log("📊 NULL questions by questionnaire:");
  Object.entries(byQuestionnaire).forEach(([code, info]) => {
    console.log(`   ${code} (${info.type}): ${info.count} questions`);
  });

  // 3. Determine fix strategy
  console.log("\n🔧 Fixing NULL audit areas...\n");

  let fixed = 0;
  let errors = 0;

  for (const q of nullQuestions) {
    let auditArea: string | null = null;

    // Strategy 1: Use category's audit area if available
    if (q.category?.auditArea) {
      auditArea = q.category.auditArea;
    }
    // Strategy 2: Infer from PQ number prefix for USOAP questions
    else if (q.pqNumber) {
      const prefix = q.pqNumber.split(".")[0].replace(/\D/g, ""); // Extract number
      const AUDIT_AREA_MAP: Record<string, string> = {
        "1": "LEG",
        "2": "ORG",
        "3": "PEL",
        "4": "OPS",
        "5": "AIR",
        "6": "AIG",
        "7": "ANS",
        "8": "AGA",
        "9": "SSP",
      };
      auditArea = AUDIT_AREA_MAP[prefix] || null;
    }
    // Strategy 3: For SMS questions (SMS-SA_X_X-X format), set to SSP (State Safety Programme)
    if (q.pqNumber?.startsWith("SMS-")) {
      auditArea = "SSP";
    }
    // Strategy 4: For CANSO SoE questionnaire, set to SSP
    else if (q.questionnaire?.type === "SMS_CANSO_SOE") {
      auditArea = "SSP";
    }

    if (auditArea) {
      try {
        await prisma.question.update({
          where: { id: q.id },
          data: { auditArea: auditArea as USOAPAuditArea },
        });
        console.log(`✅ ${q.pqNumber || q.id.substring(0, 8)} -> ${auditArea}`);
        fixed++;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to update ${q.pqNumber || q.id}: ${msg}`);
        errors++;
      }
    } else {
      console.log(`⚠️  Cannot determine audit area for: ${q.pqNumber || q.id}`);
      errors++;
    }
  }

  // 4. Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 FIX SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`❌ Errors: ${errors}`);

  // 5. Verify final state
  const finalCounts = await prisma.question.groupBy({
    by: ["auditArea"],
    _count: true,
  });

  console.log("\n📊 Final question counts by audit area:");
  finalCounts.forEach((c) => {
    console.log(`   ${c.auditArea || "NULL"}: ${c._count}`);
  });

  const nullRemaining = await prisma.question.count({ where: { auditArea: null } });
  console.log(`\n⚠️  Questions still with NULL audit area: ${nullRemaining}`);

  const total = await prisma.question.count();
  console.log(`📈 Total questions: ${total}`);

  await cleanup();
}

async function cleanup() {
  await prisma.$disconnect();
  await pool.end();
}

diagnoseAndFix().catch(async (error) => {
  console.error("💥 Error:", error);
  await cleanup();
  process.exit(1);
});
