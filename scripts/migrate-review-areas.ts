/**
 * One-time migration: populate reviewArea on QuestionnaireCategory, Question,
 * and Assessment records based on questionnaire type, PQ number prefixes,
 * and ICAO reference content analysis.
 *
 * Run with: npx tsx scripts/migrate-review-areas.ts
 *           — or —  npm run db:migrate:review-areas
 *
 * ANSReviewArea values: ATS, FPD, AIS, MAP, MET, CNS, SAR, SMS
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { ANSReviewArea } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// REVIEW AREA MAPPING HELPERS
// =============================================================================

/**
 * Valid ANSReviewArea enum values.
 */
const VALID_REVIEW_AREAS: ANSReviewArea[] = [
  "ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR", "SMS",
];

const ALL_ANS_REVIEW_AREAS: ANSReviewArea[] = [
  "ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR",
];

/**
 * Map a category code to an ANSReviewArea using prefix/keyword matching.
 * Returns null if no match is found.
 */
function mapCategoryCodeToReviewArea(code: string): ANSReviewArea | null {
  const upper = code.toUpperCase();

  // Direct prefix/keyword matches
  if (upper.includes("ATM") || upper.includes("ATC")) return "ATS";
  if (upper.includes("IFPD") || upper.includes("PANS") || upper.includes("OPS")) return "FPD";
  if (upper.includes("AIS") || upper.includes("AIM")) return "AIS";
  if (upper.includes("CHART") || upper.includes("MAP")) return "MAP";
  if (upper.includes("CNS") || upper.includes("TELECOM") || upper.includes("COMM")) return "CNS";
  if (upper.includes("MET") || upper.includes("METEO")) return "MET";
  if (upper.includes("SAR") || upper.includes("SEARCH")) return "SAR";
  if (upper.includes("SMS") || upper.includes("SAFETY_M")) return "SMS";

  return null;
}

/**
 * Map a PQ number to an ANSReviewArea using prefix matching.
 *
 * Handles two formats:
 * - Named prefixes: ATM-xxx → ATS, AIS-xxx → AIS, etc.
 * - Numeric ICAO format: 7.xxx (ANS audit area PQs) — requires content fallback
 */
function mapPqNumberToReviewArea(pqNumber: string | null): ANSReviewArea | null {
  if (!pqNumber) return null;

  const upper = pqNumber.toUpperCase().trim();

  // Named prefix matching (future-proof for alternate PQ numbering)
  if (upper.startsWith("ATM") || upper.startsWith("ATC")) return "ATS";
  if (upper.startsWith("IFPD") || upper.startsWith("OPS") || upper.startsWith("PANS")) return "FPD";
  if (upper.startsWith("AIS") || upper.startsWith("AIM")) return "AIS";
  if (upper.startsWith("CHART") || upper.startsWith("MAP")) return "MAP";
  if (upper.startsWith("CNS")) return "CNS";
  if (upper.startsWith("MET")) return "MET";
  if (upper.startsWith("SAR")) return "SAR";
  if (upper.startsWith("SMS")) return "SMS";

  return null;
}

/**
 * Infer review area from ICAO reference content and question text.
 *
 * Uses ICAO Annex mapping:
 * - Annex 2 (Rules of Air) → ATS
 * - Annex 3 (Meteorology) → MET
 * - Annex 4 (Charts) → MAP
 * - Annex 10 (Telecommunications) → CNS
 * - Annex 11 (Air Traffic Services) → ATS
 * - Annex 12 (SAR) → SAR
 * - Annex 15 (AIS) → AIS
 * - Doc 10066 (AIM) → AIS
 * - PANS-OPS / Doc 8168 → FPD
 * - Doc 9859 (SMM) → SMS
 */
function inferReviewAreaFromContent(
  questionText: string,
  icaoRefs: string | null,
  guidanceText: string | null,
): ANSReviewArea | null {
  const combined = [questionText, icaoRefs || "", guidanceText || ""]
    .join(" ")
    .toUpperCase();

  // Score-based approach: count references to each area
  const scores: Record<string, number> = {};

  // ATS signals: Annex 2, Annex 11, air traffic, ATS, ATSEP, rules of the air
  const atsPatterns = [/ANNEX\s*11/g, /\bATS\b/g, /AIR\s*TRAFFIC/g, /RULES\s*OF\s*(THE\s*)?AIR/g, /\bATSEP\b/g, /\bA11\b/g, /\bA2\b/g];
  scores.ATS = atsPatterns.reduce((sum, p) => sum + (combined.match(p) || []).length, 0);

  // FPD signals: PANS-OPS, Doc 8168, flight procedure, instrument flight
  const fpdPatterns = [/PANS[\s-]*OPS/g, /DOC\s*8168/g, /FLIGHT\s*PROCED/g, /INSTRUMENT\s*FLIGHT/g, /\bIFPD\b/g];
  scores.FPD = fpdPatterns.reduce((sum, p) => sum + (combined.match(p) || []).length, 0);

  // AIS signals: Annex 15, AIS, AIM, NOTAM, AIP, Doc 10066
  const aisPatterns = [/ANNEX\s*15/g, /\bAIS\b/g, /\bAIM\b/g, /\bNOTAM/g, /\bAIP\b/g, /DOC\s*10066/g, /\bA15\b/g, /AERONAUTICAL\s*INFO/g];
  scores.AIS = aisPatterns.reduce((sum, p) => sum + (combined.match(p) || []).length, 0);

  // MAP signals: Annex 4, aeronautical chart, cartograph
  const mapPatterns = [/ANNEX\s*4\b/g, /\bA4\b/g, /AERONAUTICAL\s*CHART/g, /CHART/g, /CARTOGRAPH/g];
  scores.MAP = mapPatterns.reduce((sum, p) => sum + (combined.match(p) || []).length, 0);

  // MET signals: Annex 3, meteorolog, weather, MET, WMO
  const metPatterns = [/ANNEX\s*3\b/g, /\bA3\b/g, /METEOROLOG/g, /\bMET\b/g, /\bWMO\b/g, /WEATHER/g];
  scores.MET = metPatterns.reduce((sum, p) => sum + (combined.match(p) || []).length, 0);

  // CNS signals: Annex 10, CNS, telecomm, navigation aid, surveillance, radar, radio
  const cnsPatterns = [/ANNEX\s*10/g, /\bA10\b/g, /\bCNS\b/g, /TELECOMM/g, /NAVIGATION\s*AID/g, /SURVEILLANCE/g, /\bRADAR\b/g, /\bRADIO\b/g];
  scores.CNS = cnsPatterns.reduce((sum, p) => sum + (combined.match(p) || []).length, 0);

  // SAR signals: Annex 12, search and rescue, SAR
  const sarPatterns = [/ANNEX\s*12/g, /\bA12\b/g, /SEARCH\s*AND\s*RESCUE/g, /\bSAR\b/g];
  scores.SAR = sarPatterns.reduce((sum, p) => sum + (combined.match(p) || []).length, 0);

  // Find highest-scoring area (must have at least 1 hit)
  let bestArea: string | null = null;
  let bestScore = 0;
  for (const [area, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestArea = area;
    }
  }

  if (bestArea && bestScore > 0 && VALID_REVIEW_AREAS.includes(bestArea as ANSReviewArea)) {
    return bestArea as ANSReviewArea;
  }

  return null;
}

// =============================================================================
// MIGRATION STEPS
// =============================================================================

interface MigrationStats {
  categoriesUpdated: number;
  categoriesSkipped: number;
  questionsUpdated: number;
  questionsSkipped: number;
  questionsContentMapped: number;
  assessmentsUpdated: number;
  warnings: string[];
}

async function migrateCategories(stats: MigrationStats): Promise<void> {
  console.log("\n📂 Step 1: Migrating QuestionnaireCategory review areas...\n");

  // 1a. ANS questionnaire categories
  const ansCategories = await prisma.questionnaireCategory.findMany({
    where: {
      questionnaire: { type: "ANS_USOAP_CMA" },
      reviewArea: null, // Only update records without reviewArea
    },
    include: {
      questionnaire: { select: { type: true } },
    },
  });

  for (const cat of ansCategories) {
    const mapped = mapCategoryCodeToReviewArea(cat.code);
    if (mapped) {
      await prisma.questionnaireCategory.update({
        where: { id: cat.id },
        data: { reviewArea: mapped },
      });
      stats.categoriesUpdated++;
      console.log(`   ✓ Category ${cat.code} → ${mapped}`);
    } else {
      // ANS categories organized by CE (ANS-CE1, AGA-CE2, etc.) are cross-cutting
      // and span multiple review areas. Log warning and skip.
      stats.categoriesSkipped++;
      stats.warnings.push(`Category ${cat.code} (${cat.nameEn}) — no direct review area mapping (CE-based cross-cutting category)`);
      console.log(`   ⚠ Category ${cat.code} — skipped (CE-based, cross-cutting)`);
    }
  }

  // 1b. SMS questionnaire categories → all SMS
  const smsCategories = await prisma.questionnaireCategory.findMany({
    where: {
      questionnaire: { type: "SMS_CANSO_SOE" },
      reviewArea: null,
    },
  });

  if (smsCategories.length > 0) {
    const result = await prisma.questionnaireCategory.updateMany({
      where: {
        id: { in: smsCategories.map((c) => c.id) },
      },
      data: { reviewArea: "SMS" },
    });
    stats.categoriesUpdated += result.count;
    console.log(`   ✓ ${result.count} SMS categories → SMS`);
  }
}

async function migrateQuestions(stats: MigrationStats): Promise<void> {
  console.log("\n📝 Step 2: Migrating Question review areas...\n");

  // 2a. ANS questionnaire questions
  const ansQuestions = await prisma.question.findMany({
    where: {
      questionnaire: { type: "ANS_USOAP_CMA" },
      reviewArea: null,
    },
    include: {
      category: { select: { id: true, code: true, reviewArea: true } },
      icaoReferences: { select: { document: true, chapter: true } },
    },
  });

  console.log(`   Found ${ansQuestions.length} ANS questions without reviewArea`);

  for (const q of ansQuestions) {
    // Strategy 1: Map by PQ number prefix
    let reviewArea = mapPqNumberToReviewArea(q.pqNumber);

    // Strategy 2: Infer from ICAO references and question content
    if (!reviewArea) {
      const icaoRefStr = q.icaoReferences
        .map((r) => `${r.document} ${r.chapter || ""}`)
        .join(" ");
      reviewArea = inferReviewAreaFromContent(
        q.questionTextEn,
        icaoRefStr || null,
        q.guidanceEn,
      );
      if (reviewArea) {
        stats.questionsContentMapped++;
      }
    }

    // Strategy 3: Fall back to category's reviewArea
    if (!reviewArea && q.category?.reviewArea) {
      reviewArea = q.category.reviewArea as ANSReviewArea;
    }

    if (reviewArea) {
      await prisma.question.update({
        where: { id: q.id },
        data: { reviewArea },
      });
      stats.questionsUpdated++;
    } else {
      stats.questionsSkipped++;
      stats.warnings.push(`Question ${q.pqNumber || q.id} — could not determine review area`);
    }
  }

  if (ansQuestions.length > 0) {
    console.log(`   ✓ ${stats.questionsUpdated} ANS questions mapped`);
    if (stats.questionsContentMapped > 0) {
      console.log(`     (${stats.questionsContentMapped} via content analysis)`);
    }
    if (stats.questionsSkipped > 0) {
      console.log(`   ⚠ ${stats.questionsSkipped} ANS questions skipped (no mapping found)`);
    }
  }

  // 2b. SMS questionnaire questions → all SMS
  const smsResult = await prisma.question.updateMany({
    where: {
      questionnaire: { type: "SMS_CANSO_SOE" },
      reviewArea: null,
    },
    data: { reviewArea: "SMS" },
  });

  if (smsResult.count > 0) {
    stats.questionsUpdated += smsResult.count;
    console.log(`   ✓ ${smsResult.count} SMS questions → SMS`);
  }
}

async function migrateAssessments(stats: MigrationStats): Promise<void> {
  console.log("\n📊 Step 3: Populating Assessment selectedReviewAreas...\n");

  const assessments = await prisma.assessment.findMany({
    where: {
      selectedReviewAreas: { isEmpty: true },
    },
    include: {
      questionnaire: { select: { type: true } },
    },
  });

  console.log(`   Found ${assessments.length} assessments with empty selectedReviewAreas`);

  for (const assessment of assessments) {
    let selectedReviewAreas: ANSReviewArea[];

    if (assessment.questionnaire.type === "SMS_CANSO_SOE") {
      // SMS assessments → SMS
      selectedReviewAreas = ["SMS"];
    } else {
      // ANS assessments: derive from selectedAuditAreas or set all 7 ANS areas
      const auditAreas = assessment.selectedAuditAreas as string[];

      if (auditAreas.length === 0 || auditAreas.includes("ANS")) {
        // Broad ANS scope → all 7 ANS review areas
        selectedReviewAreas = [...ALL_ANS_REVIEW_AREAS];
      } else {
        // Get unique review areas from questions that belong to this assessment's responses
        const responseQuestions = await prisma.assessmentResponse.findMany({
          where: { assessmentId: assessment.id },
          select: {
            question: { select: { reviewArea: true } },
          },
        });

        const reviewAreaSet = new Set<ANSReviewArea>();
        for (const r of responseQuestions) {
          if (r.question.reviewArea) {
            reviewAreaSet.add(r.question.reviewArea as ANSReviewArea);
          }
        }

        // Fall back to all ANS review areas if no specific mapping found
        selectedReviewAreas = reviewAreaSet.size > 0
          ? Array.from(reviewAreaSet)
          : [...ALL_ANS_REVIEW_AREAS];
      }
    }

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { selectedReviewAreas },
    });
    stats.assessmentsUpdated++;
  }

  if (assessments.length > 0) {
    console.log(`   ✓ ${stats.assessmentsUpdated} assessments updated`);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  AAPRP Review Area Migration");
  console.log("  Populating reviewArea on categories, questions, and assessments");
  console.log("═══════════════════════════════════════════════════════════");

  const stats: MigrationStats = {
    categoriesUpdated: 0,
    categoriesSkipped: 0,
    questionsUpdated: 0,
    questionsSkipped: 0,
    questionsContentMapped: 0,
    assessmentsUpdated: 0,
    warnings: [],
  };

  try {
    await migrateCategories(stats);
    await migrateQuestions(stats);
    await migrateAssessments(stats);

    // Summary
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  Migration Summary");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  Categories updated: ${stats.categoriesUpdated}`);
    console.log(`  Categories skipped: ${stats.categoriesSkipped}`);
    console.log(`  Questions updated:  ${stats.questionsUpdated}`);
    console.log(`  Questions skipped:  ${stats.questionsSkipped}`);
    console.log(`    (content-mapped): ${stats.questionsContentMapped}`);
    console.log(`  Assessments updated: ${stats.assessmentsUpdated}`);

    if (stats.warnings.length > 0) {
      console.log(`\n⚠ Warnings (${stats.warnings.length}):`);
      for (const w of stats.warnings.slice(0, 20)) {
        console.log(`   - ${w}`);
      }
      if (stats.warnings.length > 20) {
        console.log(`   ... and ${stats.warnings.length - 20} more`);
      }
    }

    console.log("\n✅ Migration complete!\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
