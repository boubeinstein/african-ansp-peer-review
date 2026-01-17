/**
 * ANS Protocol Questions Seeder
 *
 * Seeds parsed ANS questions into the Prisma database.
 * Run `npx tsx scripts/parse-ans-questions.ts` first to generate the JSON file.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
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

// Valid Critical Element values
const VALID_CE = ["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"];

async function seedANSQuestions() {
  console.log("🚀 Starting ANS questions seeding...\n");

  // 1. Load parsed questions
  const jsonPath = path.join(process.cwd(), "scripts", "parsed-ans-questions.json");

  if (!fs.existsSync(jsonPath)) {
    console.error("❌ parsed-ans-questions.json not found.");
    console.error("   Run 'npx tsx scripts/parse-ans-questions.ts' first.");
    process.exit(1);
  }

  const parsedQuestions: ParsedQuestion[] = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8")
  );
  console.log(`📄 Loaded ${parsedQuestions.length} questions from JSON\n`);

  // 2. Find or create the ANS questionnaire
  let questionnaire = await prisma.questionnaire.findFirst({
    where: { type: "ANS_USOAP_CMA" },
  });

  if (!questionnaire) {
    console.log("Creating ANS USOAP CMA questionnaire...");
    questionnaire = await prisma.questionnaire.create({
      data: {
        code: "USOAP-CMA-2024",
        type: "ANS_USOAP_CMA",
        version: "2024",
        titleEn: "ICAO USOAP CMA Protocol Questions 2024",
        titleFr: "Questions du Protocole USOAP CMA de l'OACI 2024",
        descriptionEn:
          "Universal Safety Oversight Audit Programme Continuous Monitoring Approach Protocol Questions - 2024 Edition (851 PQs across 9 audit areas)",
        descriptionFr:
          "Questions du protocole USOAP CMA - Édition 2024 (851 PQ réparties sur 9 domaines d'audit)",
        effectiveDate: new Date("2025-07-01"),
        isActive: true,
      },
    });
    console.log(`✅ Created questionnaire: ${questionnaire.id}\n`);
  } else {
    console.log(`📋 Using existing questionnaire: ${questionnaire.code}\n`);
  }

  // 3. Find or create ANS categories by CE
  const categories: Map<string, string> = new Map();

  const categoryConfigs = [
    {
      ce: "CE_1",
      code: "ANS-CE1",
      nameEn: "ANS - Primary Aviation Legislation",
      nameFr: "ANS - Législation Aéronautique Primaire",
      sortOrder: 1,
    },
    {
      ce: "CE_2",
      code: "ANS-CE2",
      nameEn: "ANS - Specific Operating Regulations",
      nameFr: "ANS - Règlements d'Exploitation Spécifiques",
      sortOrder: 2,
    },
    {
      ce: "CE_3",
      code: "ANS-CE3",
      nameEn: "ANS - Civil Aviation System and Safety Oversight Functions",
      nameFr: "ANS - Système d'Aviation Civile et Fonctions de Surveillance",
      sortOrder: 3,
    },
    {
      ce: "CE_4",
      code: "ANS-CE4",
      nameEn: "ANS - Technical Personnel Qualification and Training",
      nameFr: "ANS - Qualification et Formation du Personnel Technique",
      sortOrder: 4,
    },
    {
      ce: "CE_5",
      code: "ANS-CE5",
      nameEn: "ANS - Technical Guidance, Tools and Safety-Critical Information",
      nameFr: "ANS - Orientations Techniques, Outils et Informations Critiques",
      sortOrder: 5,
    },
    {
      ce: "CE_6",
      code: "ANS-CE6",
      nameEn: "ANS - Licensing, Certification, Authorization and Approval",
      nameFr: "ANS - Licence, Certification, Autorisation et Approbation",
      sortOrder: 6,
    },
    {
      ce: "CE_7",
      code: "ANS-CE7",
      nameEn: "ANS - Surveillance Obligations",
      nameFr: "ANS - Obligations de Surveillance",
      sortOrder: 7,
    },
    {
      ce: "CE_8",
      code: "ANS-CE8",
      nameEn: "ANS - Resolution of Safety Concerns",
      nameFr: "ANS - Résolution des Problèmes de Sécurité",
      sortOrder: 8,
    },
  ];

  for (const config of categoryConfigs) {
    let category = await prisma.questionnaireCategory.findFirst({
      where: {
        questionnaireId: questionnaire.id,
        code: config.code,
      },
    });

    if (!category) {
      category = await prisma.questionnaireCategory.create({
        data: {
          questionnaireId: questionnaire.id,
          code: config.code,
          sortOrder: config.sortOrder,
          nameEn: config.nameEn,
          nameFr: config.nameFr,
          descriptionEn: `Protocol questions for ${config.nameEn}`,
          descriptionFr: `Questions du protocole pour ${config.nameFr}`,
          auditArea: "ANS",
          criticalElement: config.ce as "CE_1" | "CE_2" | "CE_3" | "CE_4" | "CE_5" | "CE_6" | "CE_7" | "CE_8",
        },
      });
      console.log(`✅ Created category: ${config.code}`);
    }
    categories.set(config.ce, category.id);
  }

  console.log(`\n📁 ${categories.size} categories ready\n`);

  // 4. Get existing questions to avoid duplicates
  const existingQuestions = await prisma.question.findMany({
    where: {
      questionnaireId: questionnaire.id,
      auditArea: "ANS",
    },
    select: { pqNumber: true },
  });

  const existingPQs = new Set(existingQuestions.map((q) => q.pqNumber));
  console.log(`📊 Found ${existingPQs.size} existing ANS questions\n`);

  // 5. Insert new questions
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const q of parsedQuestions) {
    if (existingPQs.has(q.pqNumber)) {
      skipped++;
      continue;
    }

    try {
      // Ensure valid CE
      const ce = (VALID_CE.includes(q.criticalElement)
        ? q.criticalElement
        : "CE_1") as "CE_1" | "CE_2" | "CE_3" | "CE_4" | "CE_5" | "CE_6" | "CE_7" | "CE_8";
      const categoryId = categories.get(ce);

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

      // New line every 10 questions for readability
      if (created % 10 === 0) console.log();
    } catch (error: unknown) {
      errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Error creating ${q.pqNumber}:`, message);
    }
  }

  // 6. Final summary
  console.log("\n\n" + "=".repeat(50));
  console.log("📊 SEEDING SUMMARY");
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
  console.log(`\n📈 Total ANS questions in database: ${finalCount}`);

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
  byCE.forEach((ce) => {
    console.log(`   ${ce.criticalElement}: ${ce._count}`);
  });

  // 9. Show total questions by audit area
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

  await prisma.$disconnect();
  await pool.end();

  console.log("\n✅ Seeding complete!");
}

seedANSQuestions().catch(async (error) => {
  console.error("💥 Seeding failed:", error);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
