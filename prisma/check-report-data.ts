import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const REVIEW_ID = process.argv[2] || "";

async function check() {
  if (!REVIEW_ID) {
    console.log("Listing all reviews:");
    const all = await db.review.findMany({
      select: { id: true, referenceNumber: true, status: true },
      orderBy: { createdAt: "desc" },
    });
    for (const r of all) {
      console.log(" ", r.id, r.referenceNumber, r.status);
    }
    console.log("\nUsage: npx tsx prisma/check-report-data.ts <REVIEW_ID>");
    await db.$disconnect();
    await pool.end();
    return;
  }

  console.log("\n=== Checking report data for review:", REVIEW_ID, "===\n");

  const review = await db.review.findUnique({
    where: { id: REVIEW_ID },
    include: { hostOrganization: true },
  });

  if (!review) {
    console.log("ERROR: Review not found with ID:", REVIEW_ID);
    console.log("\nListing all reviews:");
    const all = await db.review.findMany({
      select: { id: true, referenceNumber: true, status: true },
    });
    for (const r of all) {
      console.log(" ", r.id, r.referenceNumber, r.status);
    }
    await db.$disconnect();
    await pool.end();
    return;
  }

  console.log("Review:", review.referenceNumber, "Status:", review.status);
  console.log("Host:", review.hostOrganization?.nameEn);

  const team = await db.reviewTeamMember.findMany({
    where: { reviewId: REVIEW_ID },
    include: { user: { select: { firstName: true, lastName: true, role: true } } },
  });
  console.log("\nTeam Members:", team.length);
  for (const m of team) {
    console.log("  -", m.user.firstName, m.user.lastName, "(" + m.role + ")");
  }
  if (team.length === 0) console.log("  WARNING: No team members - Team tab will be empty");

  const findings = await db.finding.findMany({
    where: { reviewId: REVIEW_ID },
    include: { correctiveActionPlan: true },
  });
  console.log("\nFindings:", findings.length);
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const f of findings) {
    byType[f.findingType] = (byType[f.findingType] || 0) + 1;
    bySeverity[f.severity || "UNSET"] = (bySeverity[f.severity || "UNSET"] || 0) + 1;
  }
  console.log("  By type:", JSON.stringify(byType));
  console.log("  By severity:", JSON.stringify(bySeverity));
  const withCAP = findings.filter((f) => f.correctiveActionPlan);
  console.log("  With CAPs:", withCAP.length);

  const assessments = await db.assessment.findMany({
    where: { reviewId: REVIEW_ID },
    include: {
      questionnaire: { select: { type: true, titleEn: true } },
      _count: { select: { responses: true } },
    },
  });
  console.log("\nLinked Assessments:", assessments.length);
  for (const a of assessments) {
    console.log("  -", a.questionnaire?.titleEn, "(" + a.questionnaire?.type + ")");
    console.log("    Responses:", a._count.responses, "Status:", a.status);
  }
  if (assessments.length === 0) {
    console.log("  WARNING: No assessments linked - Scores tab will be EMPTY");
    console.log("\n  Checking if org has unlinked assessments...");
    const orgAssessments = await db.assessment.findMany({
      where: { organizationId: review.hostOrganizationId },
      include: {
        questionnaire: { select: { type: true, titleEn: true } },
        _count: { select: { responses: true } },
      },
    });
    if (orgAssessments.length > 0) {
      console.log("  Found", orgAssessments.length, "unlinked assessments for this org:");
      for (const a of orgAssessments) {
        console.log("    -", a.id, a.questionnaire?.titleEn, "Responses:", a._count.responses);
      }
    } else {
      console.log("  No assessments exist for this org at all.");
    }
  }

  const hasANS = assessments.some((a) => a.questionnaire?.type === "ANS_USOAP_CMA");
  const hasSMS = assessments.some((a) => a.questionnaire?.type === "SMS_CANSO_SOE");

  const docs = await db.document.findMany({
    where: { reviewId: REVIEW_ID },
  });
  console.log("\nDocuments:", docs.length);

  const report = await db.reviewReport.findFirst({
    where: { reviewId: REVIEW_ID },
    orderBy: { version: "desc" },
  });
  if (report) {
    console.log("\nExisting Report Record:");
    console.log("  Version:", report.version, "Status:", report.status);
    console.log("  Content is null:", report.content === null);
    if (report.content && typeof report.content === "object") {
      console.log("  Content keys:", Object.keys(report.content as object));
    }
  } else {
    console.log("\nNo existing report record.");
  }

  console.log("\n=== REPORT READINESS ===");
  console.log("  Cover & Metadata:", "OK");
  console.log("  Team Composition:", team.length > 0 ? "OK (" + team.length + ")" : "EMPTY");
  console.log("  Findings Summary:", findings.length > 0 ? "OK (" + findings.length + ")" : "EMPTY");
  console.log("  CAPs:", withCAP.length > 0 ? "OK (" + withCAP.length + ")" : "EMPTY");
  console.log("  ANS EI Scores:", hasANS ? "OK" : "NO ANS ASSESSMENT");
  console.log("  SMS Maturity:", hasSMS ? "OK" : "NO SMS ASSESSMENT");
  console.log("  Documents:", docs.length > 0 ? "OK (" + docs.length + ")" : "EMPTY");
  console.log("  Report Record:", report ? (report.content ? "HAS CONTENT" : "EXISTS BUT CONTENT NULL") : "NONE");
  console.log("");

  await db.$disconnect();
  await pool.end();
}

check().catch(console.error);
