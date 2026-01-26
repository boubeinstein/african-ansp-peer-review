/**
 * AAPRP Training Demo - Part 1: Reviews & Team Members
 * Corrected to match actual Prisma schema
 * 
 * Run: npm run db:seed:training
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ReviewPhase, ReviewStatus, FieldworkPhase } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Schema enums:
// ReviewPhase: PLANNING, PREPARATION, ON_SITE, REPORTING, FOLLOW_UP, CLOSED
// ReviewStatus: REQUESTED, APPROVED, PLANNING, SCHEDULED, IN_PROGRESS, REPORT_DRAFTING, REPORT_REVIEW, COMPLETED, CANCELLED
// TeamRole: LEAD_REVIEWER, REVIEWER, TECHNICAL_EXPERT, OBSERVER, TRAINEE
// InvitationStatus: PENDING, INVITED, CONFIRMED, DECLINED, WITHDRAWN

interface ReviewConfig {
  phase: ReviewPhase;
  status: ReviewStatus;
  description: string;
  daysAgo: number; // How many days ago the review started
}

const REVIEW_CONFIGS: ReviewConfig[] = [
  { phase: "CLOSED", status: "COMPLETED", description: "Completed peer review with findings and CAPs resolved", daysAgo: 60 },
  { phase: "REPORTING", status: "REPORT_DRAFTING", description: "Review in reporting phase - draft report being prepared", daysAgo: 30 },
  { phase: "ON_SITE", status: "IN_PROGRESS", description: "Active fieldwork - on-site activities in progress", daysAgo: 7 },
  { phase: "PREPARATION", status: "SCHEDULED", description: "Review scheduled - preparation phase", daysAgo: 0 },
  { phase: "PLANNING", status: "APPROVED", description: "Review approved - planning team assignment", daysAgo: -14 },
];

// 14 fieldwork checklist items
const CHECKLIST_ITEMS = [
  // PRE_VISIT phase
  { phase: "PRE_VISIT" as FieldworkPhase, itemCode: "PRE_DOC_REQUEST_SENT", sortOrder: 1, labelEn: "Document request sent to host", labelFr: "Demande de documents envoyée à l'hôte" },
  { phase: "PRE_VISIT" as FieldworkPhase, itemCode: "PRE_DOCS_RECEIVED", sortOrder: 2, labelEn: "Pre-visit documents received and reviewed", labelFr: "Documents pré-visite reçus et examinés" },
  { phase: "PRE_VISIT" as FieldworkPhase, itemCode: "PRE_COORDINATION_MEETING", sortOrder: 3, labelEn: "Coordination meeting held with team", labelFr: "Réunion de coordination tenue avec l'équipe" },
  { phase: "PRE_VISIT" as FieldworkPhase, itemCode: "PRE_PLAN_APPROVED", sortOrder: 4, labelEn: "Review plan approved by team", labelFr: "Plan de revue approuvé par l'équipe" },
  // ON_SITE phase
  { phase: "ON_SITE" as FieldworkPhase, itemCode: "SITE_OPENING_MEETING", sortOrder: 5, labelEn: "Opening meeting conducted with host", labelFr: "Réunion d'ouverture tenue avec l'hôte" },
  { phase: "ON_SITE" as FieldworkPhase, itemCode: "SITE_INTERVIEWS", sortOrder: 6, labelEn: "Staff interviews completed", labelFr: "Entretiens du personnel terminés" },
  { phase: "ON_SITE" as FieldworkPhase, itemCode: "SITE_FACILITIES", sortOrder: 7, labelEn: "Facilities inspection completed", labelFr: "Inspection des installations terminée" },
  { phase: "ON_SITE" as FieldworkPhase, itemCode: "SITE_DOC_REVIEW", sortOrder: 8, labelEn: "Document review completed", labelFr: "Examen des documents terminé" },
  { phase: "ON_SITE" as FieldworkPhase, itemCode: "SITE_FINDINGS_DISCUSSED", sortOrder: 9, labelEn: "Preliminary findings discussed with host", labelFr: "Constatations préliminaires discutées avec l'hôte" },
  { phase: "ON_SITE" as FieldworkPhase, itemCode: "SITE_CLOSING_MEETING", sortOrder: 10, labelEn: "Closing meeting conducted", labelFr: "Réunion de clôture tenue" },
  // POST_VISIT phase
  { phase: "POST_VISIT" as FieldworkPhase, itemCode: "POST_FINDINGS_ENTERED", sortOrder: 11, labelEn: "All findings entered in system", labelFr: "Toutes les constatations saisies dans le système" },
  { phase: "POST_VISIT" as FieldworkPhase, itemCode: "POST_EVIDENCE_UPLOADED", sortOrder: 12, labelEn: "Supporting evidence uploaded", labelFr: "Preuves à l'appui téléchargées" },
  { phase: "POST_VISIT" as FieldworkPhase, itemCode: "POST_DRAFT_REPORT", sortOrder: 13, labelEn: "Draft report prepared", labelFr: "Rapport préliminaire préparé" },
  { phase: "POST_VISIT" as FieldworkPhase, itemCode: "POST_HOST_FEEDBACK", sortOrder: 14, labelEn: "Host feedback received on draft", labelFr: "Commentaires de l'hôte reçus sur le projet" },
];

function generateReferenceNumber(index: number): string {
  const year = new Date().getFullYear();
  return `REV-${year}-${(index + 1).toString().padStart(3, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function seedReviews() {
  console.log("\n📋 Creating demo peer reviews...\n");

  // Get organizations (need at least 5)
  const orgs = await prisma.organization.findMany({
    orderBy: { nameEn: "asc" },
    take: 10,
  });

  if (orgs.length < 5) {
    console.log(`   ⚠️  Only ${orgs.length} organizations found. Need at least 5.`);
    return [];
  }

  console.log(`   📊 Found ${orgs.length} organizations\n`);

  const createdReviews: Array<{ id: string; orgName: string; phase: string }> = [];
  const now = new Date();

  for (let i = 0; i < REVIEW_CONFIGS.length; i++) {
    const cfg = REVIEW_CONFIGS[i];
    const org = orgs[i];
    const refNum = generateReferenceNumber(i);

    // Check if review already exists for this org
    const exists = await prisma.review.findFirst({
      where: { hostOrganizationId: org.id },
    });

    if (exists) {
      console.log(`   ⏭️  Review exists for ${org.organizationCode || org.nameEn}`);
      createdReviews.push({ id: exists.id, orgName: org.organizationCode || org.nameEn, phase: exists.phase });
      continue;
    }

    // Also check by reference number
    const refExists = await prisma.review.findUnique({
      where: { referenceNumber: refNum },
    });

    if (refExists) {
      console.log(`   ⏭️  Review ${refNum} already exists`);
      createdReviews.push({ id: refExists.id, orgName: org.organizationCode || org.nameEn, phase: refExists.phase });
      continue;
    }

    const requestedDate = addDays(now, -cfg.daysAgo - 30);
    const plannedStart = addDays(now, -cfg.daysAgo);
    const plannedEnd = addDays(plannedStart, 10);

    const review = await prisma.review.create({
      data: {
        referenceNumber: refNum,
        reviewType: "FULL",
        hostOrganizationId: org.id,
        status: cfg.status,
        phase: cfg.phase,
        requestedDate,
        requestedStartDate: plannedStart,
        requestedEndDate: plannedEnd,
        plannedStartDate: ["SCHEDULED", "IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW", "COMPLETED"].includes(cfg.status) ? plannedStart : null,
        plannedEndDate: ["SCHEDULED", "IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW", "COMPLETED"].includes(cfg.status) ? plannedEnd : null,
        actualStartDate: ["IN_PROGRESS", "REPORT_DRAFTING", "REPORT_REVIEW", "COMPLETED"].includes(cfg.status) ? plannedStart : null,
        actualEndDate: cfg.status === "COMPLETED" ? plannedEnd : null,
        objectives: `Comprehensive ${cfg.phase.toLowerCase()} peer review of ${org.nameEn} ANS operations`,
        locationType: "ON_SITE",
        languagePreference: "BOTH",
        primaryContactName: "ANSP Focal Point",
        primaryContactEmail: `focal.point@${org.organizationCode?.toLowerCase() || 'ansp'}.aero`,
      },
    });

    console.log(`   ✅ Created: ${refNum} - ${org.organizationCode || org.nameEn} (${cfg.phase})`);
    createdReviews.push({ id: review.id, orgName: org.organizationCode || org.nameEn, phase: cfg.phase });
  }

  return createdReviews;
}

async function seedTeamMembers(reviews: Array<{ id: string; orgName: string; phase: string }>) {
  console.log("\n👥 Assigning review team members...\n");

  let assigned = 0;

  for (const review of reviews) {
    // Skip reviews in early phases
    if (review.phase === "PLANNING") {
      console.log(`   ⏭️  ${review.orgName}: No team for PLANNING phase`);
      continue;
    }

    // Get the review's host organization
    const reviewData = await prisma.review.findUnique({
      where: { id: review.id },
      select: { hostOrganizationId: true },
    });

    if (!reviewData) continue;

    // Find reviewers from OTHER organizations
    const potentialReviewers = await prisma.user.findMany({
      where: {
        organizationId: { not: reviewData.hostOrganizationId },
        role: { in: ["LEAD_REVIEWER", "PEER_REVIEWER"] },
        isActive: true,
      },
      take: 5,
    });

    if (potentialReviewers.length === 0) {
      console.log(`   ⚠️  ${review.orgName}: No reviewers available`);
      continue;
    }

    let teamCount = 0;
    for (let i = 0; i < Math.min(potentialReviewers.length, 3); i++) {
      const reviewer = potentialReviewers[i];

      // Check if already assigned
      const exists = await prisma.reviewTeamMember.findUnique({
        where: {
          reviewId_userId: {
            reviewId: review.id,
            userId: reviewer.id,
          },
        },
      });

      if (exists) continue;

      // Get reviewer profile if exists
      const reviewerProfile = await prisma.reviewerProfile.findUnique({
        where: { userId: reviewer.id },
      });

      await prisma.reviewTeamMember.create({
        data: {
          reviewId: review.id,
          userId: reviewer.id,
          reviewerProfileId: reviewerProfile?.id,
          role: i === 0 ? "LEAD_REVIEWER" : "REVIEWER",
          invitationStatus: "CONFIRMED",
          invitedAt: new Date(),
          respondedAt: new Date(),
          confirmedAt: new Date(),
        },
      });

      teamCount++;
      assigned++;
    }

    console.log(`   ✅ ${review.orgName}: Assigned ${teamCount} team members`);
  }

  return assigned;
}

async function seedFieldworkChecklists(reviews: Array<{ id: string; orgName: string; phase: string }>) {
  console.log("\n☑️  Creating fieldwork checklists...\n");

  let created = 0;

  for (const review of reviews) {
    // Check if checklist items already exist
    const existingItems = await prisma.fieldworkChecklistItem.count({
      where: { reviewId: review.id },
    });

    if (existingItems > 0) {
      console.log(`   ⏭️  ${review.orgName}: Checklist already exists (${existingItems} items)`);
      continue;
    }

    // Create all 14 checklist items
    await prisma.fieldworkChecklistItem.createMany({
      data: CHECKLIST_ITEMS.map(item => ({
        reviewId: review.id,
        phase: item.phase,
        itemCode: item.itemCode,
        sortOrder: item.sortOrder,
        labelEn: item.labelEn,
        labelFr: item.labelFr,
        isCompleted: false,
      })),
    });

    created += 14;
    console.log(`   ✅ ${review.orgName}: Created 14 checklist items`);
  }

  return created;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     AAPRP Training Demo - Part 1: Reviews & Team           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    const reviews = await seedReviews();
    const teamCount = await seedTeamMembers(reviews);
    const checklistCount = await seedFieldworkChecklists(reviews);

    console.log(`\n${"═".repeat(50)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${"═".repeat(50)}`);
    console.log(`   Reviews created/found: ${reviews.length}`);
    console.log(`   Team members assigned: ${teamCount}`);
    console.log(`   Checklist items created: ${checklistCount}`);
    console.log(`${"═".repeat(50)}`);
    console.log("\n✅ Part 1 complete! Run seed-training-demo-part2.ts next.\n");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });