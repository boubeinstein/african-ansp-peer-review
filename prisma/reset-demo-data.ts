/**
 * Full Reset Script - Clears all data except questionnaires
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function safeDelete(name: string, deleteFunc: () => Promise<{ count: number }>) {
  try {
    const result = await deleteFunc();
    console.log(`  ✅ ${name} deleted: ${result.count}`);
  } catch (e: any) {
    if (e.code === 'P2021') {
      console.log(`  ⚠️ ${name}: table doesn't exist, skipping`);
    } else {
      console.log(`  ⚠️ ${name}: ${e.message?.slice(0, 50)}`);
    }
  }
}

async function fullReset() {
  console.log("🧹 Full database reset (preserving questionnaires)...\n");

  try {
    // Delete in dependency order - most dependent first
    await safeDelete("CAPs", () => prisma.correctiveActionPlan.deleteMany({}));
    await safeDelete("Findings", () => prisma.finding.deleteMany({}));
    await safeDelete("Assessment responses", () => prisma.assessmentResponse.deleteMany({}));
    await safeDelete("Assessments", () => prisma.assessment.deleteMany({}));
    await safeDelete("Review team members", () => prisma.reviewTeamMember.deleteMany({}));
    await safeDelete("Review reports", () => (prisma as any).reviewReport.deleteMany({}));
    await safeDelete("Reviews", () => prisma.review.deleteMany({}));
    
    // Documents before users
    await safeDelete("Documents", () => (prisma as any).document.deleteMany({}));
    await safeDelete("Response documents", () => (prisma as any).responseDocument.deleteMany({}));
    
    // Audit logs reference users
    await safeDelete("Audit logs", () => (prisma as any).auditLog.deleteMany({}));
    
    // Join requests reference users and orgs
    await safeDelete("Join requests", () => (prisma as any).joinRequest.deleteMany({}));
    
    // COI overrides
    await safeDelete("COI overrides", () => (prisma as any).coiOverride.deleteMany({}));
    
    // Notifications
    await safeDelete("Notifications", () => (prisma as any).notification.deleteMany({}));
    
    // Password resets
    await safeDelete("Password resets", () => (prisma as any).passwordReset.deleteMany({}));
    
    // Reviewer data
    await safeDelete("Reviewer languages", () => prisma.reviewerLanguage.deleteMany({}));
    await safeDelete("Reviewer certifications", () => (prisma as any).reviewerCertification.deleteMany({}));
    await safeDelete("Reviewer profiles", () => prisma.reviewerProfile.deleteMany({}));
    
    // Users
    await safeDelete("Users", () => prisma.user.deleteMany({}));
    
    // Unlink orgs from teams
    await prisma.organization.updateMany({ data: { regionalTeamId: null } });
    console.log("  ✅ Organizations unlinked from teams");
    
    // Teams
    await safeDelete("Peer support teams", () => (prisma as any).peerSupportTeam.deleteMany({}));
    await safeDelete("Regional teams", () => (prisma as any).regionalTeam.deleteMany({}));
    
    // Organizations last
    await safeDelete("Organizations", () => prisma.organization.deleteMany({}));

    console.log("\n✅ Full reset complete (questionnaires preserved)");
    
    // Verify what remains
    console.log("\n📊 Remaining data:");
    const questionnaires = await prisma.questionnaire.count();
    const questions = await prisma.question.count();
    console.log(`  Questionnaires: ${questionnaires}`);
    console.log(`  Questions: ${questions}`);
    
  } catch (error) {
    console.error("❌ Error during reset:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

fullReset();
