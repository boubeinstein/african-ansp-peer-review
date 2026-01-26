/**
 * AAPRP Training Demo - Part 3: Documents & Checklists
 * Corrected to match actual Prisma schema
 * 
 * Run: npm run db:seed:training-part3
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, DocumentCategory, DocumentStatus } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// DocumentCategory enum: POLICY, PROCEDURE, RECORD, CERTIFICATE, REPORT, TRAINING, EVIDENCE, OTHER,
//                        PRE_VISIT_REQUEST, HOST_SUBMISSION, INTERVIEW_NOTES, DRAFT_REPORT, FINAL_REPORT, CAP_EVIDENCE, CORRESPONDENCE
// DocumentStatus enum: UPLOADED, UNDER_REVIEW, REVIEWED, PENDING_APPROVAL, APPROVED, REJECTED

interface DocTemplate {
  category: DocumentCategory;
  status: DocumentStatus;
  name: string;
  fileType: string;
}

const DOCS_BY_PHASE: Record<string, DocTemplate[]> = {
  CLOSED: [
    { category: "PRE_VISIT_REQUEST", status: "APPROVED", name: "Document_Request_Letter.pdf", fileType: "application/pdf" },
    { category: "HOST_SUBMISSION", status: "APPROVED", name: "ATS_Operations_Manual_v3.2.pdf", fileType: "application/pdf" },
    { category: "HOST_SUBMISSION", status: "APPROVED", name: "Safety_Management_Manual.pdf", fileType: "application/pdf" },
    { category: "HOST_SUBMISSION", status: "APPROVED", name: "Training_Records_2025.xlsx", fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    { category: "INTERVIEW_NOTES", status: "REVIEWED", name: "Interview_ATS_Manager.pdf", fileType: "application/pdf" },
    { category: "INTERVIEW_NOTES", status: "REVIEWED", name: "Interview_Safety_Officer.pdf", fileType: "application/pdf" },
    { category: "EVIDENCE", status: "APPROVED", name: "Facility_Inspection_Photos.zip", fileType: "application/zip" },
    { category: "DRAFT_REPORT", status: "APPROVED", name: "Draft_Review_Report_v1.pdf", fileType: "application/pdf" },
    { category: "CORRESPONDENCE", status: "REVIEWED", name: "Host_Feedback_on_Draft.pdf", fileType: "application/pdf" },
    { category: "FINAL_REPORT", status: "APPROVED", name: "Final_Review_Report.pdf", fileType: "application/pdf" },
  ],
  REPORTING: [
    { category: "PRE_VISIT_REQUEST", status: "APPROVED", name: "Document_Request.pdf", fileType: "application/pdf" },
    { category: "HOST_SUBMISSION", status: "REVIEWED", name: "Operations_Manual.pdf", fileType: "application/pdf" },
    { category: "HOST_SUBMISSION", status: "REVIEWED", name: "Quality_Assurance_Manual.pdf", fileType: "application/pdf" },
    { category: "INTERVIEW_NOTES", status: "REVIEWED", name: "Staff_Interviews_Summary.pdf", fileType: "application/pdf" },
    { category: "EVIDENCE", status: "REVIEWED", name: "Site_Inspection_Photos.zip", fileType: "application/zip" },
    { category: "DRAFT_REPORT", status: "UNDER_REVIEW", name: "Draft_Report_v0.9.pdf", fileType: "application/pdf" },
    { category: "CORRESPONDENCE", status: "UPLOADED", name: "Email_Correspondence.pdf", fileType: "application/pdf" },
  ],
  FOLLOW_UP: [
    { category: "PRE_VISIT_REQUEST", status: "APPROVED", name: "Initial_Request.pdf", fileType: "application/pdf" },
    { category: "HOST_SUBMISSION", status: "APPROVED", name: "Submitted_Documentation.pdf", fileType: "application/pdf" },
    { category: "DRAFT_REPORT", status: "APPROVED", name: "Review_Report.pdf", fileType: "application/pdf" },
    { category: "CAP_EVIDENCE", status: "UNDER_REVIEW", name: "CAP_Implementation_Evidence.pdf", fileType: "application/pdf" },
  ],
  ON_SITE: [
    { category: "PRE_VISIT_REQUEST", status: "APPROVED", name: "Pre_Visit_Request.pdf", fileType: "application/pdf" },
    { category: "HOST_SUBMISSION", status: "REVIEWED", name: "Submitted_Documents.zip", fileType: "application/zip" },
    { category: "HOST_SUBMISSION", status: "UPLOADED", name: "Additional_Information.pdf", fileType: "application/pdf" },
    { category: "INTERVIEW_NOTES", status: "UPLOADED", name: "Day1_Interview_Notes.pdf", fileType: "application/pdf" },
    { category: "EVIDENCE", status: "UPLOADED", name: "Initial_Evidence_Collection.zip", fileType: "application/zip" },
  ],
  PREPARATION: [
    { category: "PRE_VISIT_REQUEST", status: "REVIEWED", name: "Document_Request_Sent.pdf", fileType: "application/pdf" },
    { category: "HOST_SUBMISSION", status: "UPLOADED", name: "Initial_Submission.pdf", fileType: "application/pdf" },
  ],
  PLANNING: [
    { category: "PRE_VISIT_REQUEST", status: "UPLOADED", name: "Draft_Document_Request.pdf", fileType: "application/pdf" },
  ],
};

// Checklist items to mark as completed by review phase
const CHECKLIST_BY_PHASE: Record<string, string[]> = {
  CLOSED: [
    "PRE_DOC_REQUEST_SENT", "PRE_DOCS_RECEIVED", "PRE_COORDINATION_MEETING", "PRE_PLAN_APPROVED",
    "SITE_OPENING_MEETING", "SITE_INTERVIEWS", "SITE_FACILITIES", "SITE_DOC_REVIEW",
    "SITE_FINDINGS_DISCUSSED", "SITE_CLOSING_MEETING",
    "POST_FINDINGS_ENTERED", "POST_EVIDENCE_UPLOADED", "POST_DRAFT_REPORT", "POST_HOST_FEEDBACK",
  ],
  REPORTING: [
    "PRE_DOC_REQUEST_SENT", "PRE_DOCS_RECEIVED", "PRE_COORDINATION_MEETING", "PRE_PLAN_APPROVED",
    "SITE_OPENING_MEETING", "SITE_INTERVIEWS", "SITE_FACILITIES", "SITE_DOC_REVIEW",
    "SITE_FINDINGS_DISCUSSED", "SITE_CLOSING_MEETING",
    "POST_FINDINGS_ENTERED", "POST_EVIDENCE_UPLOADED",
  ],
  FOLLOW_UP: [
    "PRE_DOC_REQUEST_SENT", "PRE_DOCS_RECEIVED", "PRE_COORDINATION_MEETING", "PRE_PLAN_APPROVED",
    "SITE_OPENING_MEETING", "SITE_INTERVIEWS", "SITE_FACILITIES", "SITE_DOC_REVIEW",
    "SITE_FINDINGS_DISCUSSED", "SITE_CLOSING_MEETING",
    "POST_FINDINGS_ENTERED", "POST_EVIDENCE_UPLOADED", "POST_DRAFT_REPORT", "POST_HOST_FEEDBACK",
  ],
  ON_SITE: [
    "PRE_DOC_REQUEST_SENT", "PRE_DOCS_RECEIVED", "PRE_COORDINATION_MEETING", "PRE_PLAN_APPROVED",
    "SITE_OPENING_MEETING", "SITE_INTERVIEWS",
  ],
  PREPARATION: [
    "PRE_DOC_REQUEST_SENT", "PRE_DOCS_RECEIVED",
  ],
  PLANNING: [
    "PRE_DOC_REQUEST_SENT",
  ],
};

async function seedDocuments() {
  console.log("\n📄 Creating demo documents...\n");

  const reviews = await prisma.review.findMany({
    include: { hostOrganization: true },
  });

  let docCount = 0;

  for (const review of reviews) {
    const docs = DOCS_BY_PHASE[review.phase] || [];
    const orgName = review.hostOrganization?.organizationCode || review.hostOrganization?.nameEn || "Unknown";

    if (!docs.length) {
      console.log(`   ⏭️  No docs for ${orgName} (${review.phase})`);
      continue;
    }

    // Get uploader
    const uploader = await prisma.user.findFirst({
      where: { email: "coordinator@aaprp.aero" },
    });

    if (!uploader) {
      console.log(`   ⚠️  No uploader found`);
      continue;
    }

    console.log(`   📋 Adding docs for ${orgName} (${review.phase})...`);

    for (const doc of docs) {
      // Check if exists
      const exists = await prisma.document.findFirst({
        where: { reviewId: review.id, name: doc.name },
      });
      if (exists) {
        console.log(`      ⏭️  Exists: ${doc.name}`);
        continue;
      }

      await prisma.document.create({
        data: {
          name: doc.name,
          originalName: doc.name,
          description: `Demo document for ${review.phase} phase`,
          fileUrl: `https://demo.aaprp.aero/files/${review.referenceNumber}/${doc.name}`,
          fileType: doc.fileType,
          fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
          category: doc.category,
          reviewId: review.id,
          organizationId: review.hostOrganizationId,
          uploadedById: uploader.id,
          status: doc.status,
          reviewedAt: ["REVIEWED", "APPROVED", "PENDING_APPROVAL"].includes(doc.status) ? new Date() : null,
          reviewedById: ["REVIEWED", "APPROVED", "PENDING_APPROVAL"].includes(doc.status) ? uploader.id : null,
          reviewNotes: ["REVIEWED", "APPROVED"].includes(doc.status) ? "Document reviewed and verified." : null,
          approvedAt: doc.status === "APPROVED" ? new Date() : null,
          approvedById: doc.status === "APPROVED" ? uploader.id : null,
        },
      });
      docCount++;
      console.log(`      ✅ ${doc.name} (${doc.status})`);
    }
  }

  return docCount;
}

async function seedChecklistProgress() {
  console.log("\n☑️  Updating checklist progress...\n");

  const reviews = await prisma.review.findMany({
    include: { 
      hostOrganization: true, 
      checklistItems: true,
    },
  });

  let itemsUpdated = 0;

  for (const review of reviews) {
    const itemsToComplete = CHECKLIST_BY_PHASE[review.phase] || [];
    const orgName = review.hostOrganization?.organizationCode || review.hostOrganization?.nameEn || "Unknown";

    if (!review.checklistItems.length) {
      console.log(`   ⏭️  No checklist items for ${orgName}`);
      continue;
    }

    // Get completer (lead reviewer from team or coordinator)
    const teamLead = await prisma.reviewTeamMember.findFirst({
      where: { reviewId: review.id, role: "LEAD_REVIEWER" },
      include: { user: true },
    });
    const completer = teamLead?.user || await prisma.user.findFirst({ where: { email: "coordinator@aaprp.aero" } });

    let count = 0;
    for (const item of review.checklistItems) {
      if (itemsToComplete.includes(item.itemCode) && !item.isCompleted) {
        await prisma.fieldworkChecklistItem.update({
          where: { id: item.id },
          data: { 
            isCompleted: true, 
            completedAt: new Date(), 
            completedById: completer?.id,
          },
        });
        count++;
        itemsUpdated++;
      }
    }

    if (count > 0) {
      console.log(`   ✅ ${orgName}: ${count}/${review.checklistItems.length} items completed`);
    } else {
      console.log(`   ⏭️  ${orgName}: already up to date`);
    }
  }

  return itemsUpdated;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   AAPRP Training Demo - Part 3: Documents & Checklists     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    const docCount = await seedDocuments();
    const checklistCount = await seedChecklistProgress();

    console.log(`\n${"═".repeat(50)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${"═".repeat(50)}`);
    console.log(`   Documents created: ${docCount}`);
    console.log(`   Checklist items updated: ${checklistCount}`);
    console.log(`${"═".repeat(50)}`);
    console.log("\n✅ Part 3 complete!\n");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });