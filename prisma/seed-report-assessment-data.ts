/**
 * Seed Report Assessment Data
 *
 * Creates ANS (USOAP CMA) and SMS (CANSO SoE) assessments with realistic
 * responses linked to reviews, so report generation populates the Scores tab.
 *
 * Usage:
 *   npx tsx prisma/seed-report-assessment-data.ts           # Seed data
 *   npx tsx prisma/seed-report-assessment-data.ts cleanup   # Remove seeded data
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  MaturityLevel,
  USOAPAuditArea,
} from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Reviews to create assessment data for */
const REVIEWS = [
  {
    label: "AAPRP-2026-001 (Kenya)",
    reviewId: "cmkzdwynu0000wdusvst4louf",
    orgId: "cmkzbnxui000465usvwi32jk2",
    leadUserId: "cmkzboxly000n8wusa1l0e474",
    ansRefNum: "ASM-ANS-2026-001",
    smsRefNum: "ASM-SMS-2026-001",
  },
  {
    label: "REV-2026-001 (Mozambique)",
    reviewId: "cmkzccugr0000adusg3bgj8oc",
    orgId: "cmkzbo3hr000c65usih8it9ji",
    leadUserId: "cmkzbop7c00038wushvygmesx",
    ansRefNum: "ASM-ANS-2026-002",
    smsRefNum: "ASM-SMS-2026-002",
  },
];

// ---------------------------------------------------------------------------
// ANS response distribution: target ~72% overall EI
// Responses per question are seeded with a deterministic pattern.
// ---------------------------------------------------------------------------

/**
 * Per-review EI targets.
 * Kenya (review index 0): ~72% — moderately strong
 * Mozambique (review index 1): ~65% — slightly weaker
 */
const ANS_REVIEW_TARGETS = [0.72, 0.65];

function getANSResponse(
  _auditArea: string | null,
  index: number,
  reviewIndex: number
): { responseValue: string; score: number | null } {
  const target = ANS_REVIEW_TARGETS[reviewIndex] ?? 0.72;

  // ~9% NOT_APPLICABLE (every 11th question)
  if (index % 11 === 9) {
    return { responseValue: "NOT_APPLICABLE", score: null };
  }

  // Deterministic but varied — use golden ratio hash for good distribution
  const hash = ((index * 2654435761 + reviewIndex * 37) >>> 0) % 100;
  const threshold = target * 100;

  if (hash < threshold) {
    return { responseValue: "SATISFACTORY", score: 1.0 };
  }
  return { responseValue: "NOT_SATISFACTORY", score: 0.0 };
}

// ---------------------------------------------------------------------------
// SMS response distribution: target overall Level C (~score 55)
// ---------------------------------------------------------------------------

/**
 * Per-component maturity distribution, per review.
 * Index 0 = Kenya (stronger), Index 1 = Mozambique (slightly weaker)
 */
const SMS_COMPONENT_LEVELS: Record<string, MaturityLevel[][]> = {
  SAFETY_POLICY_OBJECTIVES: [
    // Kenya: mostly C-D (strong area, avg ~63)
    ["LEVEL_C", "LEVEL_D", "LEVEL_C", "LEVEL_D", "LEVEL_C", "LEVEL_D", "LEVEL_C", "LEVEL_C", "LEVEL_D", "LEVEL_C"],
    // Mozambique: mostly B-C (avg ~48)
    ["LEVEL_B", "LEVEL_C", "LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_C"],
  ],
  SAFETY_RISK_MANAGEMENT: [
    // Kenya: mixed B-C (avg ~48)
    ["LEVEL_B", "LEVEL_C", "LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_C"],
    // Mozambique: mostly B (avg ~38)
    ["LEVEL_B", "LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_B", "LEVEL_B", "LEVEL_C"],
  ],
  SAFETY_ASSURANCE: [
    // Kenya: mixed B-C (avg ~50)
    ["LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_C"],
    // Mozambique: mostly B (avg ~40)
    ["LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_B", "LEVEL_C"],
  ],
  SAFETY_PROMOTION: [
    // Kenya: mostly B-C (avg ~42)
    ["LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_C", "LEVEL_B", "LEVEL_B", "LEVEL_C"],
    // Mozambique: mostly A-B (avg ~28)
    ["LEVEL_A", "LEVEL_B", "LEVEL_B", "LEVEL_A", "LEVEL_B", "LEVEL_B", "LEVEL_A", "LEVEL_B", "LEVEL_A", "LEVEL_B"],
  ],
};

const MATURITY_SCORES: Record<MaturityLevel, number> = {
  LEVEL_A: 15,
  LEVEL_B: 35,
  LEVEL_C: 55,
  LEVEL_D: 75,
  LEVEL_E: 90,
};

function getSMSResponse(
  component: string | null,
  index: number,
  reviewIndex: number
): { maturityLevel: MaturityLevel; score: number } {
  const comp = component ?? "SAFETY_POLICY_OBJECTIVES";
  const compLevels = SMS_COMPONENT_LEVELS[comp] ?? SMS_COMPONENT_LEVELS.SAFETY_POLICY_OBJECTIVES;
  const levels = compLevels[reviewIndex] ?? compLevels[0];
  const level = levels[index % levels.length];
  return { maturityLevel: level, score: MATURITY_SCORES[level] };
}

// ---------------------------------------------------------------------------
// Finding type fix mapping
// ---------------------------------------------------------------------------

const SEVERITY_TO_TYPE: Record<string, string> = {
  CRITICAL: "NON_CONFORMITY",
  MAJOR: "NON_CONFORMITY",
  MINOR: "RECOMMENDATION",
  OBSERVATION: "OBSERVATION",
};

// ---------------------------------------------------------------------------
// Main seed logic
// ---------------------------------------------------------------------------

async function seedAssessments(): Promise<void> {
  // 1. Find the 2024 questionnaires (prefer them; fall back to any)
  const ansQuestionnaires = await db.questionnaire.findMany({
    where: { type: "ANS_USOAP_CMA" },
    orderBy: { createdAt: "desc" },
  });
  const smsQuestionnaires = await db.questionnaire.findMany({
    where: { type: "SMS_CANSO_SOE" },
    orderBy: { createdAt: "desc" },
  });

  if (ansQuestionnaires.length === 0 || smsQuestionnaires.length === 0) {
    console.error("Missing questionnaires. Run questionnaire seed first.");
    return;
  }

  // Use the most recent questionnaire of each type
  const ansQ = ansQuestionnaires[0];
  const smsQ = smsQuestionnaires[0];

  console.log(`Using ANS questionnaire: ${ansQ.titleEn} (${ansQ.id})`);
  console.log(`Using SMS questionnaire: ${smsQ.titleEn} (${smsQ.id})`);

  // 2. Fetch all questions
  const ansQuestions = await db.question.findMany({
    where: { questionnaireId: ansQ.id, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const smsQuestions = await db.question.findMany({
    where: { questionnaireId: smsQ.id, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  console.log(`ANS questions: ${ansQuestions.length}`);
  console.log(`SMS questions: ${smsQuestions.length}`);

  if (ansQuestions.length === 0 || smsQuestions.length === 0) {
    console.error("No questions found in questionnaires.");
    return;
  }

  // 3. Seed each review
  for (let revIdx = 0; revIdx < REVIEWS.length; revIdx++) {
    const rev = REVIEWS[revIdx];
    // Check review exists
    const review = await db.review.findUnique({ where: { id: rev.reviewId } });
    if (!review) {
      console.log(`Skipping ${rev.label} — review not found`);
      continue;
    }

    console.log(`\nSeeding assessments for ${rev.label}...`);

    // Check if assessments already exist for this review
    const existingAns = await db.assessment.findFirst({
      where: { reviewId: rev.reviewId, questionnaire: { type: "ANS_USOAP_CMA" } },
    });
    const existingSms = await db.assessment.findFirst({
      where: { reviewId: rev.reviewId, questionnaire: { type: "SMS_CANSO_SOE" } },
    });

    if (existingAns && existingSms) {
      console.log(`  Assessments already exist — skipping`);
      continue;
    }

    // Collect unique audit areas from the questions
    const auditAreas: USOAPAuditArea[] = [
      ...new Set(
        ansQuestions
          .map((q) => q.auditArea)
          .filter((a): a is USOAPAuditArea => a !== null)
      ),
    ];

    // --- ANS Assessment ---
    if (!existingAns) {
      console.log(`  Creating ANS assessment (${ansQuestions.length} responses)...`);

      // Calculate scores before creating
      let satisfactory = 0;
      let applicable = 0;
      const areaStats: Record<string, { sat: number; app: number }> = {};

      const ansResponses = ansQuestions.map((q, i) => {
        const resp = getANSResponse(q.auditArea, i, revIdx);
        const area = q.auditArea ?? "UNKNOWN";
        if (!areaStats[area]) areaStats[area] = { sat: 0, app: 0 };

        if (resp.responseValue === "SATISFACTORY") {
          satisfactory++;
          applicable++;
          areaStats[area].sat++;
          areaStats[area].app++;
        } else if (resp.responseValue === "NOT_SATISFACTORY") {
          applicable++;
          areaStats[area].app++;
        }
        // NOT_APPLICABLE: excluded from counts

        return {
          questionId: q.id,
          responseValue: resp.responseValue,
          score: resp.score,
          maturityLevel: null as MaturityLevel | null,
          notes: null as string | null,
          respondedById: rev.leadUserId,
          respondedAt: new Date("2026-01-15"),
        };
      });

      const eiScore = applicable > 0
        ? Math.round((satisfactory / applicable) * 100 * 100) / 100
        : 0;

      const categoryScores: Record<string, { score: number; total: number; satisfactory: number }> = {};
      for (const [area, stats] of Object.entries(areaStats)) {
        categoryScores[area] = {
          score: stats.app > 0 ? Math.round((stats.sat / stats.app) * 100 * 100) / 100 : 0,
          total: stats.app,
          satisfactory: stats.sat,
        };
      }

      const ansAssessment = await db.assessment.create({
        data: {
          type: "PEER_REVIEW",
          title: `ANS Peer Review Assessment - ${rev.label}`,
          description: `USOAP CMA peer review assessment for ${rev.label}`,
          questionnaireId: ansQ.id,
          organizationId: rev.orgId,
          reviewId: rev.reviewId,
          referenceNumber: rev.ansRefNum,
          status: "COMPLETED",
          progress: 100,
          eiScore,
          overallScore: eiScore,
          categoryScores: categoryScores,
          selectedAuditAreas: auditAreas,
          startedAt: new Date("2026-01-10"),
          submittedAt: new Date("2026-01-18"),
          completedAt: new Date("2026-01-20"),
          responses: {
            create: ansResponses,
          },
        },
      });

      console.log(`  ANS assessment created: ${ansAssessment.id}`);
      console.log(`    EI Score: ${eiScore}% (${satisfactory}/${applicable} satisfactory)`);
      console.log(`    Areas:`, Object.entries(categoryScores).map(([a, s]) => `${a}=${s.score}%`).join(", "));
    }

    // --- SMS Assessment ---
    if (!existingSms) {
      console.log(`  Creating SMS assessment (${smsQuestions.length} responses)...`);

      const compStats: Record<string, { totalScore: number; count: number }> = {};

      const smsResponses = smsQuestions.map((q, i) => {
        const resp = getSMSResponse(q.smsComponent, i, revIdx);
        const comp = q.smsComponent ?? "UNKNOWN";

        if (!compStats[comp]) compStats[comp] = { totalScore: 0, count: 0 };
        compStats[comp].totalScore += resp.score;
        compStats[comp].count++;

        return {
          questionId: q.id,
          responseValue: null as string | null,
          score: resp.score,
          maturityLevel: resp.maturityLevel,
          notes: null as string | null,
          respondedById: rev.leadUserId,
          respondedAt: new Date("2026-01-16"),
        };
      });

      // Calculate overall maturity
      let totalScore = 0;
      let totalCount = 0;
      const categoryScores: Record<string, { score: number; level: string; count: number }> = {};

      for (const [comp, stats] of Object.entries(compStats)) {
        const avgScore = stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0;
        const level = avgScore >= 83 ? "E" : avgScore >= 65 ? "D" : avgScore >= 45 ? "C" : avgScore >= 25 ? "B" : "A";
        categoryScores[comp] = { score: avgScore, level, count: stats.count };
        totalScore += stats.totalScore;
        totalCount += stats.count;
      }

      const overallScore = totalCount > 0 ? Math.round(totalScore / totalCount) : 0;
      const overallLevel: MaturityLevel =
        overallScore >= 83 ? "LEVEL_E" :
        overallScore >= 65 ? "LEVEL_D" :
        overallScore >= 45 ? "LEVEL_C" :
        overallScore >= 25 ? "LEVEL_B" : "LEVEL_A";

      const smsAssessment = await db.assessment.create({
        data: {
          type: "PEER_REVIEW",
          title: `SMS Peer Review Assessment - ${rev.label}`,
          description: `CANSO SoE peer review assessment for ${rev.label}`,
          questionnaireId: smsQ.id,
          organizationId: rev.orgId,
          reviewId: rev.reviewId,
          referenceNumber: rev.smsRefNum,
          status: "COMPLETED",
          progress: 100,
          maturityLevel: overallLevel,
          overallScore,
          categoryScores: categoryScores,
          startedAt: new Date("2026-01-10"),
          submittedAt: new Date("2026-01-18"),
          completedAt: new Date("2026-01-20"),
          responses: {
            create: smsResponses,
          },
        },
      });

      console.log(`  SMS assessment created: ${smsAssessment.id}`);
      console.log(`    Overall: ${overallScore} (${overallLevel})`);
      console.log(`    Components:`, Object.entries(categoryScores).map(([c, s]) => `${c}=${s.score}(${s.level})`).join(", "));
    }
  }

  // 4. Fix finding types where null
  console.log("\nFixing finding types...");
  const nullTypeFindings = await db.finding.findMany({
    where: {
      findingType: { equals: undefined },
    },
    select: { id: true, severity: true, findingType: true },
  });

  // Also check for any findings that might have a mismatch
  if (nullTypeFindings.length === 0) {
    console.log("  No findings with null type found — all OK");
  } else {
    for (const f of nullTypeFindings) {
      const newType = SEVERITY_TO_TYPE[f.severity] ?? "OBSERVATION";
      await db.finding.update({
        where: { id: f.id },
        data: { findingType: newType as "NON_CONFORMITY" | "OBSERVATION" | "RECOMMENDATION" | "CONCERN" | "GOOD_PRACTICE" },
      });
    }
    console.log(`  Fixed ${nullTypeFindings.length} findings`);
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup(): Promise<void> {
  console.log("Cleaning up seeded assessment data...\n");

  for (const rev of REVIEWS) {
    console.log(`Cleaning ${rev.label}...`);

    // Find assessments linked to the review
    const assessments = await db.assessment.findMany({
      where: { reviewId: rev.reviewId },
      select: { id: true, type: true, referenceNumber: true },
    });

    for (const a of assessments) {
      // Delete responses first (foreign key constraint)
      const deleted = await db.assessmentResponse.deleteMany({
        where: { assessmentId: a.id },
      });
      console.log(`  Deleted ${deleted.count} responses from ${a.referenceNumber ?? a.id}`);

      // Delete assessment events if any
      await db.assessmentEvent.deleteMany({
        where: { assessmentId: a.id },
      });

      // Delete the assessment
      await db.assessment.delete({ where: { id: a.id } });
      console.log(`  Deleted assessment ${a.referenceNumber ?? a.id} (${a.type})`);
    }

    if (assessments.length === 0) {
      console.log("  No assessments found for this review");
    }
  }

  console.log("\nCleanup complete.");
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

async function printSummary(): Promise<void> {
  console.log("\n========================================");
  console.log("  Assessment Seed Summary");
  console.log("========================================\n");

  for (const rev of REVIEWS) {
    const review = await db.review.findUnique({ where: { id: rev.reviewId } });
    if (!review) continue;

    console.log(`${rev.label} (${review.referenceNumber}):`);

    const assessments = await db.assessment.findMany({
      where: { reviewId: rev.reviewId },
      include: { questionnaire: { select: { type: true } }, _count: { select: { responses: true } } },
    });

    for (const a of assessments) {
      const type = a.questionnaire.type === "ANS_USOAP_CMA" ? "ANS" : "SMS";
      console.log(`  ${type}: ${a._count.responses} responses, status=${a.status}`);
      if (type === "ANS") {
        console.log(`    EI Score: ${a.eiScore}%`);
      } else {
        console.log(`    Maturity: ${a.maturityLevel}, Score: ${a.overallScore}`);
      }
    }

    if (assessments.length === 0) {
      console.log("  (no assessments)");
    }

    // Show findings summary
    const findings = await db.finding.findMany({
      where: { reviewId: rev.reviewId },
      select: { findingType: true, severity: true },
    });
    console.log(`  Findings: ${findings.length} total`);
    const byType: Record<string, number> = {};
    for (const f of findings) {
      byType[f.findingType] = (byType[f.findingType] || 0) + 1;
    }
    if (Object.keys(byType).length > 0) {
      console.log(`    By type:`, Object.entries(byType).map(([t, c]) => `${t}=${c}`).join(", "));
    }
  }

  console.log("");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const command = process.argv[2];

  try {
    if (command === "cleanup") {
      await cleanup();
    } else {
      await seedAssessments();
      await printSummary();
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main();
