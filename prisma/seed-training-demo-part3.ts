/**
 * AAPRP Training Demo Data Seed Script - Part 3
 * Creates sample documents and fieldwork checklist progress
 *
 * Run with: npm run db:seed:training-part3
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  DocumentCategory,
  DocumentStatus,
} from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────
// DOCUMENT DEFINITIONS
// ─────────────────────────────────────────────────────────────────

interface DocumentDef {
  category: DocumentCategory;
  status: DocumentStatus;
  name: string;
  fileType: string;
}

// Map review reference to phase for document assignment
const REVIEW_PHASES: Record<string, string> = {
  "AAPRP-DEMO-001": "COMPLETED",
  "AAPRP-DEMO-002": "REPORTING",
  "AAPRP-DEMO-003": "FIELDWORK",
  "AAPRP-DEMO-004": "PLANNING",
  "AAPRP-DEMO-005": "REQUESTED",
};

const DOCUMENTS_BY_PHASE: Record<string, DocumentDef[]> = {
  // Completed review - all document types
  COMPLETED: [
    {
      category: "PRE_VISIT_REQUEST" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "Document_Request_Letter.pdf",
      fileType: "application/pdf",
    },
    {
      category: "HOST_SUBMISSION" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "ATS_Manual_v3.2.pdf",
      fileType: "application/pdf",
    },
    {
      category: "HOST_SUBMISSION" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "Safety_Management_Manual.pdf",
      fileType: "application/pdf",
    },
    {
      category: "HOST_SUBMISSION" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "Training_Records_2025.xlsx",
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    {
      category: "INTERVIEW_NOTES" as DocumentCategory,
      status: "REVIEWED" as DocumentStatus,
      name: "Interview_ATS_Manager.pdf",
      fileType: "application/pdf",
    },
    {
      category: "INTERVIEW_NOTES" as DocumentCategory,
      status: "REVIEWED" as DocumentStatus,
      name: "Interview_Safety_Officer.pdf",
      fileType: "application/pdf",
    },
    {
      category: "EVIDENCE" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "Facility_Photos.zip",
      fileType: "application/zip",
    },
    {
      category: "EVIDENCE" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "Equipment_Inspection_Report.pdf",
      fileType: "application/pdf",
    },
    {
      category: "DRAFT_REPORT" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "Draft_Review_Report_v1.pdf",
      fileType: "application/pdf",
    },
    {
      category: "CORRESPONDENCE" as DocumentCategory,
      status: "REVIEWED" as DocumentStatus,
      name: "Host_Feedback_Draft.pdf",
      fileType: "application/pdf",
    },
    {
      category: "FINAL_REPORT" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "Final_Review_Report.pdf",
      fileType: "application/pdf",
    },
    {
      category: "CAP_EVIDENCE" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "CAP_Implementation_Evidence.pdf",
      fileType: "application/pdf",
    },
  ],

  // Reporting phase - most documents complete
  REPORTING: [
    {
      category: "PRE_VISIT_REQUEST" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "Document_Request.pdf",
      fileType: "application/pdf",
    },
    {
      category: "HOST_SUBMISSION" as DocumentCategory,
      status: "REVIEWED" as DocumentStatus,
      name: "Operations_Manual.pdf",
      fileType: "application/pdf",
    },
    {
      category: "HOST_SUBMISSION" as DocumentCategory,
      status: "REVIEWED" as DocumentStatus,
      name: "Quality_Manual.pdf",
      fileType: "application/pdf",
    },
    {
      category: "INTERVIEW_NOTES" as DocumentCategory,
      status: "REVIEWED" as DocumentStatus,
      name: "Staff_Interviews.pdf",
      fileType: "application/pdf",
    },
    {
      category: "EVIDENCE" as DocumentCategory,
      status: "REVIEWED" as DocumentStatus,
      name: "Site_Inspection_Photos.zip",
      fileType: "application/zip",
    },
    {
      category: "DRAFT_REPORT" as DocumentCategory,
      status: "UNDER_REVIEW" as DocumentStatus,
      name: "Draft_Report_v0.9.pdf",
      fileType: "application/pdf",
    },
    {
      category: "CORRESPONDENCE" as DocumentCategory,
      status: "UPLOADED" as DocumentStatus,
      name: "Email_Correspondence.pdf",
      fileType: "application/pdf",
    },
  ],

  // Fieldwork phase - partial documents
  FIELDWORK: [
    {
      category: "PRE_VISIT_REQUEST" as DocumentCategory,
      status: "APPROVED" as DocumentStatus,
      name: "Pre_Visit_Request.pdf",
      fileType: "application/pdf",
    },
    {
      category: "HOST_SUBMISSION" as DocumentCategory,
      status: "REVIEWED" as DocumentStatus,
      name: "Submitted_Documents.zip",
      fileType: "application/zip",
    },
    {
      category: "HOST_SUBMISSION" as DocumentCategory,
      status: "UPLOADED" as DocumentStatus,
      name: "Additional_Info.pdf",
      fileType: "application/pdf",
    },
    {
      category: "INTERVIEW_NOTES" as DocumentCategory,
      status: "UPLOADED" as DocumentStatus,
      name: "Day1_Interviews.pdf",
      fileType: "application/pdf",
    },
    {
      category: "EVIDENCE" as DocumentCategory,
      status: "UPLOADED" as DocumentStatus,
      name: "Initial_Evidence.zip",
      fileType: "application/zip",
    },
  ],

  // Planning phase - minimal documents
  PLANNING: [
    {
      category: "PRE_VISIT_REQUEST" as DocumentCategory,
      status: "UPLOADED" as DocumentStatus,
      name: "Document_Request_Draft.pdf",
      fileType: "application/pdf",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────
// CHECKLIST PROGRESS BY PHASE
// ─────────────────────────────────────────────────────────────────

const CHECKLIST_PROGRESS: Record<string, string[]> = {
  // Completed review - all items done
  COMPLETED: [
    "PRE_DOC_REQUEST_SENT",
    "PRE_DOCS_RECEIVED",
    "PRE_COORDINATION_MEETING",
    "PRE_PLAN_APPROVED",
    "SITE_OPENING_MEETING",
    "SITE_INTERVIEWS",
    "SITE_FACILITIES",
    "SITE_DOC_REVIEW",
    "SITE_FINDINGS_DISCUSSED",
    "SITE_CLOSING_MEETING",
    "POST_FINDINGS_ENTERED",
    "POST_EVIDENCE_UPLOADED",
    "POST_DRAFT_REPORT",
    "POST_HOST_FEEDBACK",
  ],

  // Reporting phase - on-site complete, post-visit in progress
  REPORTING: [
    "PRE_DOC_REQUEST_SENT",
    "PRE_DOCS_RECEIVED",
    "PRE_COORDINATION_MEETING",
    "PRE_PLAN_APPROVED",
    "SITE_OPENING_MEETING",
    "SITE_INTERVIEWS",
    "SITE_FACILITIES",
    "SITE_DOC_REVIEW",
    "SITE_FINDINGS_DISCUSSED",
    "SITE_CLOSING_MEETING",
    "POST_FINDINGS_ENTERED",
    "POST_EVIDENCE_UPLOADED",
  ],

  // Fieldwork phase - pre-visit done, on-site in progress
  FIELDWORK: [
    "PRE_DOC_REQUEST_SENT",
    "PRE_DOCS_RECEIVED",
    "PRE_COORDINATION_MEETING",
    "PRE_PLAN_APPROVED",
    "SITE_OPENING_MEETING",
    "SITE_INTERVIEWS",
  ],

  // Planning phase - early pre-visit items only
  PLANNING: ["PRE_DOC_REQUEST_SENT"],
};

// ─────────────────────────────────────────────────────────────────
// SEED DOCUMENTS
// ─────────────────────────────────────────────────────────────────

async function seedDocuments() {
  console.log("\n📄 Creating demo documents...\n");

  // Get reviews by reference number
  const reviews = await prisma.review.findMany({
    where: {
      referenceNumber: { in: Object.keys(REVIEW_PHASES) },
    },
    include: { hostOrganization: true },
  });

  for (const review of reviews) {
    const phase = REVIEW_PHASES[review.referenceNumber];
    const docs = DOCUMENTS_BY_PHASE[phase] || [];

    if (docs.length === 0) {
      console.log(
        `   ⏭️  No documents for ${review.referenceNumber} (${phase})`
      );
      continue;
    }

    console.log(
      `   📋 Adding documents for ${review.referenceNumber} (${phase})...`
    );

    // Get a user to be the uploader
    const uploader = await prisma.user.findFirst({
      where: { role: "PROGRAMME_COORDINATOR" },
    });

    if (!uploader) {
      console.log("   ⚠️  No uploader found");
      continue;
    }

    // Get a reviewer for reviewed/approved documents
    const reviewer = await prisma.user.findFirst({
      where: { role: "LEAD_REVIEWER" },
    });

    for (const docDef of docs) {
      // Check if document already exists
      const existing = await prisma.document.findFirst({
        where: {
          reviewId: review.id,
          name: docDef.name,
        },
      });

      if (existing) {
        console.log(`      ⏭️  ${docDef.name} exists`);
        continue;
      }

      const docData: Parameters<typeof prisma.document.create>[0]["data"] = {
        reviewId: review.id,
        category: docDef.category,
        status: docDef.status,
        name: docDef.name,
        originalName: docDef.name,
        fileUrl: `https://demo.aaprp.aero/files/${review.referenceNumber}/${docDef.name}`,
        fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
        fileType: docDef.fileType,
        uploadedById: uploader.id,
      };

      // Add review/approval info based on status
      if (["REVIEWED", "APPROVED"].includes(docDef.status) && reviewer) {
        docData.reviewedAt = new Date();
        docData.reviewedById = reviewer.id;
        docData.reviewNotes = "Document reviewed and verified.";
      }

      if (docDef.status === "APPROVED" && reviewer) {
        docData.approvedAt = new Date();
        docData.approvedById = reviewer.id;
      }

      await prisma.document.create({ data: docData });
      console.log(`      ✅ ${docDef.name} (${docDef.status})`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// SEED CHECKLIST PROGRESS
// ─────────────────────────────────────────────────────────────────

async function seedChecklistProgress() {
  console.log("\n☑️  Updating checklist progress...\n");

  // Get reviews with their checklist items
  const reviews = await prisma.review.findMany({
    where: {
      referenceNumber: { in: Object.keys(REVIEW_PHASES) },
    },
    include: {
      hostOrganization: true,
      checklistItems: true,
    },
  });

  for (const review of reviews) {
    const phase = REVIEW_PHASES[review.referenceNumber];
    const completedCodes = CHECKLIST_PROGRESS[phase] || [];

    if (review.checklistItems.length === 0) {
      console.log(
        `   ⏭️  No checklist items for ${review.referenceNumber}`
      );
      continue;
    }

    console.log(
      `   📋 Updating checklist for ${review.referenceNumber} (${completedCodes.length}/14 items)...`
    );

    // Get a user to be the completer
    const completer = await prisma.user.findFirst({
      where: { role: "LEAD_REVIEWER" },
    });

    let updatedCount = 0;

    for (const item of review.checklistItems) {
      const shouldBeCompleted = completedCodes.includes(item.itemCode);

      if (shouldBeCompleted && !item.isCompleted) {
        await prisma.fieldworkChecklistItem.update({
          where: { id: item.id },
          data: {
            isCompleted: true,
            completedAt: new Date(),
            completedById: completer?.id,
          },
        });
        updatedCount++;
      }
    }

    console.log(`      ✅ Updated ${updatedCount} items to completed`);
  }
}

// ─────────────────────────────────────────────────────────────────
// INITIALIZE CHECKLISTS FOR REVIEWS WITHOUT THEM
// ─────────────────────────────────────────────────────────────────

const CHECKLIST_ITEM_DEFINITIONS = [
  // PRE_VISIT items
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_DOC_REQUEST_SENT",
    sortOrder: 1,
    labelEn: "Document request sent to host organization",
    labelFr: "Demande de documents envoyée à l'organisation hôte",
  },
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_DOCS_RECEIVED",
    sortOrder: 2,
    labelEn: "Pre-visit documents received and reviewed",
    labelFr: "Documents pré-visite reçus et examinés",
  },
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_COORDINATION_MEETING",
    sortOrder: 3,
    labelEn: "Pre-visit coordination meeting held with team",
    labelFr: "Réunion de coordination pré-visite tenue avec l'équipe",
  },
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_PLAN_APPROVED",
    sortOrder: 4,
    labelEn: "Review plan approved by team",
    labelFr: "Plan de revue approuvé par l'équipe",
  },
  // ON_SITE items
  {
    phase: "ON_SITE",
    itemCode: "SITE_OPENING_MEETING",
    sortOrder: 5,
    labelEn: "Opening meeting conducted with host",
    labelFr: "Réunion d'ouverture tenue avec l'hôte",
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_INTERVIEWS",
    sortOrder: 6,
    labelEn: "Staff interviews completed",
    labelFr: "Entretiens avec le personnel terminés",
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_FACILITIES",
    sortOrder: 7,
    labelEn: "Facilities inspection completed",
    labelFr: "Inspection des installations terminée",
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_DOC_REVIEW",
    sortOrder: 8,
    labelEn: "Document review completed",
    labelFr: "Examen des documents terminé",
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_FINDINGS_DISCUSSED",
    sortOrder: 9,
    labelEn: "Preliminary findings discussed with host",
    labelFr: "Constatations préliminaires discutées avec l'hôte",
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_CLOSING_MEETING",
    sortOrder: 10,
    labelEn: "Closing meeting conducted",
    labelFr: "Réunion de clôture tenue",
  },
  // POST_VISIT items
  {
    phase: "POST_VISIT",
    itemCode: "POST_FINDINGS_ENTERED",
    sortOrder: 11,
    labelEn: "All findings entered in system",
    labelFr: "Toutes les constatations saisies dans le système",
  },
  {
    phase: "POST_VISIT",
    itemCode: "POST_EVIDENCE_UPLOADED",
    sortOrder: 12,
    labelEn: "Supporting evidence uploaded",
    labelFr: "Preuves à l'appui téléchargées",
  },
  {
    phase: "POST_VISIT",
    itemCode: "POST_DRAFT_REPORT",
    sortOrder: 13,
    labelEn: "Draft report prepared",
    labelFr: "Projet de rapport préparé",
  },
  {
    phase: "POST_VISIT",
    itemCode: "POST_HOST_FEEDBACK",
    sortOrder: 14,
    labelEn: "Host feedback received on draft findings",
    labelFr: "Commentaires de l'hôte reçus sur les constatations",
  },
];

async function initializeChecklists() {
  console.log("\n📝 Initializing checklists for reviews...\n");

  const reviews = await prisma.review.findMany({
    where: {
      referenceNumber: { in: Object.keys(REVIEW_PHASES) },
    },
    include: { checklistItems: true },
  });

  for (const review of reviews) {
    if (review.checklistItems.length > 0) {
      console.log(
        `   ⏭️  ${review.referenceNumber} already has ${review.checklistItems.length} checklist items`
      );
      continue;
    }

    console.log(`   📋 Creating checklist items for ${review.referenceNumber}...`);

    await prisma.fieldworkChecklistItem.createMany({
      data: CHECKLIST_ITEM_DEFINITIONS.map((def) => ({
        reviewId: review.id,
        phase: def.phase as "PRE_VISIT" | "ON_SITE" | "POST_VISIT",
        itemCode: def.itemCode,
        sortOrder: def.sortOrder,
        labelEn: def.labelEn,
        labelFr: def.labelFr,
      })),
      skipDuplicates: true,
    });

    console.log(`      ✅ Created 14 checklist items`);
  }
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║   AAPRP Training Demo Data - Part 3: Documents & Checklist ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n"
  );

  try {
    await initializeChecklists();
    await seedDocuments();
    await seedChecklistProgress();
    console.log("\n✅ Part 3 complete! All training demo data seeded.\n");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
