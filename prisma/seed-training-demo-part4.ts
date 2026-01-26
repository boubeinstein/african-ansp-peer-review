/**
 * AAPRP Training Demo - Part 4: Assessments
 * Corrected to match actual Prisma schema
 * 
 * Run: npm run db:seed:training-part4
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AssessmentStatus } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// AssessmentStatus enum: DRAFT, SUBMITTED, UNDER_REVIEW, COMPLETED, ARCHIVED
// QuestionnaireType enum: ANS_USOAP_CMA, SMS_CANSO_SOE

interface AssessmentConfig {
  orgIndex: number;
  qType: "ANS" | "SMS";
  status: AssessmentStatus;
  progress: number;
}

function generateReferenceNumber(type: string): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${type}-${year}-${random}`;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     AAPRP Training Demo - Part 4: Assessments              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Get organizations dynamically
    const orgs = await prisma.organization.findMany({
      orderBy: { nameEn: "asc" },
      take: 8,
    });

    if (orgs.length < 4) {
      console.log(`   ⚠️  Only ${orgs.length} organizations found. Need at least 4.`);
      return;
    }

    console.log(`   📊 Found ${orgs.length} organizations\n`);

    // Get questionnaires
    const questionnaires = await prisma.questionnaire.findMany();
    // QuestionnaireType enum values: ANS_USOAP_CMA, SMS_CANSO_SOE
    const ansQ = questionnaires.find(q => q.type === "ANS_USOAP_CMA");
    const smsQ = questionnaires.find(q => q.type === "SMS_CANSO_SOE");

    if (!ansQ && !smsQ) {
      console.log("   ⚠️  No questionnaires found. Run questionnaire seed first.");
      return;
    }

    console.log(`   📋 Questionnaires: ANS=${ansQ ? "✓" : "✗"}, SMS=${smsQ ? "✓" : "✗"}\n`);

    const defaultQ = ansQ || smsQ;
    if (!defaultQ) return;

    // Assessment configurations using dynamic orgs
    // AssessmentStatus: DRAFT, SUBMITTED, UNDER_REVIEW, COMPLETED, ARCHIVED
    const configs: AssessmentConfig[] = [
      { orgIndex: 0, qType: "ANS", status: "COMPLETED", progress: 100 },
      { orgIndex: 0, qType: "SMS", status: "COMPLETED", progress: 100 },
      { orgIndex: 1, qType: "ANS", status: "SUBMITTED", progress: 100 },
      { orgIndex: 2, qType: "ANS", status: "UNDER_REVIEW", progress: 100 },
      { orgIndex: 2, qType: "SMS", status: "SUBMITTED", progress: 100 },
      { orgIndex: 3, qType: "ANS", status: "DRAFT", progress: 75 },
      { orgIndex: 4, qType: "SMS", status: "DRAFT", progress: 40 },
      { orgIndex: 5, qType: "ANS", status: "DRAFT", progress: 20 },
    ];

    let created = 0;

    for (const cfg of configs) {
      const org = orgs[cfg.orgIndex];
      if (!org) continue;

      const q = cfg.qType === "ANS" ? (ansQ || defaultQ) : (smsQ || defaultQ);
      const qTypeLabel = cfg.qType === "ANS" ? "ANS" : "SMS";

      // Find a user from this organization
      const creator = await prisma.user.findFirst({ 
        where: { organizationId: org.id },
      });
      
      if (!creator) {
        console.log(`   ⚠️  No user for ${org.organizationCode || org.nameEn}`);
        continue;
      }

      const title = `${org.nameEn} ${qTypeLabel} Self-Assessment 2026`;

      // Check if exists
      const exists = await prisma.assessment.findFirst({
        where: { 
          organizationId: org.id, 
          questionnaireId: q.id,
          title: title,
        },
      });

      if (exists) {
        console.log(`   ⏭️  Exists: ${org.organizationCode || org.nameEn} ${qTypeLabel}`);
        continue;
      }

      const now = new Date();
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 3);

      await prisma.assessment.create({
        data: {
          title,
          description: `${qTypeLabel} self-assessment for ${org.nameEn}`,
          referenceNumber: generateReferenceNumber(cfg.qType),
          type: "SELF_ASSESSMENT",
          organizationId: org.id,
          questionnaireId: q.id,
          status: cfg.status,
          progress: cfg.progress,
          dueDate,
          startedAt: cfg.progress > 0 ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : null,
          submittedAt: ["SUBMITTED", "UNDER_REVIEW", "REVIEWED", "COMPLETED"].includes(cfg.status) 
            ? new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) : null,
          completedAt: cfg.status === "COMPLETED" ? new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) : null,
          overallScore: cfg.status === "COMPLETED" ? 0.75 + Math.random() * 0.2 : null,
          eiScore: cfg.status === "COMPLETED" ? 70 + Math.random() * 25 : null,
        },
      });

      console.log(`   ✅ ${org.organizationCode || org.nameEn} ${qTypeLabel} (${cfg.status}, ${cfg.progress}%)`);
      created++;
    }

    console.log(`\n${"═".repeat(50)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${"═".repeat(50)}`);
    console.log(`   Assessments created: ${created}`);
    console.log(`${"═".repeat(50)}`);
    console.log("\n✅ Part 4 complete!\n");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });