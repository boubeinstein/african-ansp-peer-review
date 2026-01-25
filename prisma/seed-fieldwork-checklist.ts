/**
 * Seed script to initialize fieldwork checklist items for existing reviews
 *
 * Run with: npm run db:seed:checklist
 *
 * This script:
 * 1. Creates standard checklist items for any reviews that don't have them
 * 2. Migrates existing documents to the new status workflow (if needed)
 */

import prisma from "./seed-client";
import { FieldworkPhase, Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────
// CHECKLIST ITEM DEFINITIONS
// ─────────────────────────────────────────────────────────────────

const CHECKLIST_ITEM_DEFINITIONS: Array<{
  phase: FieldworkPhase;
  itemCode: string;
  sortOrder: number;
  labelEn: string;
  labelFr: string;
  validationRules: Record<string, unknown>;
}> = [
  // ═══════════════════════════════════════════════════════════════
  // PRE-VISIT PREPARATION (Items 1-4)
  // ═══════════════════════════════════════════════════════════════
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_DOC_REQUEST_SENT",
    sortOrder: 1,
    labelEn: "Document request sent to host organization",
    labelFr: "Demande de documents envoyée à l'organisation hôte",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "PRE_VISIT_REQUEST",
      minCount: 1,
      requiredStatus: ["UPLOADED", "REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_DOCS_RECEIVED",
    sortOrder: 2,
    labelEn: "Pre-visit documents received and reviewed",
    labelFr: "Documents pré-visite reçus et examinés",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "HOST_SUBMISSION",
      minCount: 1,
      requiredStatus: ["REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_COORDINATION_MEETING",
    sortOrder: 3,
    labelEn: "Pre-visit coordination meeting held with team",
    labelFr: "Réunion de coordination pré-visite tenue avec l'équipe",
    validationRules: {
      type: "MANUAL_OR_DOCUMENT",
      category: "INTERVIEW_NOTES",
      allowManual: true,
    },
  },
  {
    phase: "PRE_VISIT",
    itemCode: "PRE_PLAN_APPROVED",
    sortOrder: 4,
    labelEn: "Review plan approved by team",
    labelFr: "Plan de revue approuvé par l'équipe",
    validationRules: {
      type: "APPROVAL_REQUIRED",
      approverRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // ON-SITE ACTIVITIES (Items 5-10)
  // ═══════════════════════════════════════════════════════════════
  {
    phase: "ON_SITE",
    itemCode: "SITE_OPENING_MEETING",
    sortOrder: 5,
    labelEn: "Opening meeting conducted with host",
    labelFr: "Réunion d'ouverture tenue avec l'hôte",
    validationRules: {
      type: "MANUAL_OR_DOCUMENT",
      allowManual: true,
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_INTERVIEWS",
    sortOrder: 6,
    labelEn: "Staff interviews completed",
    labelFr: "Entretiens avec le personnel terminés",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "INTERVIEW_NOTES",
      minCount: 1,
      requiredStatus: ["UPLOADED", "REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_FACILITIES",
    sortOrder: 7,
    labelEn: "Facilities inspection completed",
    labelFr: "Inspection des installations terminée",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "EVIDENCE",
      minCount: 1,
      requiredStatus: ["UPLOADED", "REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_DOC_REVIEW",
    sortOrder: 8,
    labelEn: "Document review completed",
    labelFr: "Examen des documents terminé",
    validationRules: {
      type: "DOCUMENTS_REVIEWED",
      category: "HOST_SUBMISSION",
      allMustBeReviewed: true,
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_FINDINGS_DISCUSSED",
    sortOrder: 9,
    labelEn: "Preliminary findings discussed with host",
    labelFr: "Constatations préliminaires discutées avec l'hôte",
    validationRules: {
      type: "FINDINGS_EXIST",
      minCount: 1,
      statusRequired: ["OPEN", "CAP_REQUIRED", "CAP_SUBMITTED", "CAP_ACCEPTED"],
    },
  },
  {
    phase: "ON_SITE",
    itemCode: "SITE_CLOSING_MEETING",
    sortOrder: 10,
    labelEn: "Closing meeting conducted",
    labelFr: "Réunion de clôture tenue",
    validationRules: {
      type: "PREREQUISITE_ITEMS",
      requiredItems: [
        "SITE_OPENING_MEETING",
        "SITE_INTERVIEWS",
        "SITE_FACILITIES",
        "SITE_DOC_REVIEW",
        "SITE_FINDINGS_DISCUSSED",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // POST-VISIT ACTIVITIES (Items 11-14)
  // ═══════════════════════════════════════════════════════════════
  {
    phase: "POST_VISIT",
    itemCode: "POST_FINDINGS_ENTERED",
    sortOrder: 11,
    labelEn: "All findings entered in system",
    labelFr: "Toutes les constatations saisies dans le système",
    validationRules: {
      type: "AUTO_CHECK",
      condition: "FINDINGS_COUNT_GT_0",
    },
  },
  {
    phase: "POST_VISIT",
    itemCode: "POST_EVIDENCE_UPLOADED",
    sortOrder: 12,
    labelEn: "Supporting evidence uploaded",
    labelFr: "Preuves à l'appui téléchargées",
    validationRules: {
      type: "FINDINGS_HAVE_EVIDENCE",
      allFindingsMustHaveEvidence: true,
    },
  },
  {
    phase: "POST_VISIT",
    itemCode: "POST_DRAFT_REPORT",
    sortOrder: 13,
    labelEn: "Draft report prepared",
    labelFr: "Projet de rapport préparé",
    validationRules: {
      type: "DOCUMENT_EXISTS",
      category: "DRAFT_REPORT",
      minCount: 1,
      requiredStatus: ["UPLOADED", "REVIEWED", "APPROVED"],
    },
  },
  {
    phase: "POST_VISIT",
    itemCode: "POST_HOST_FEEDBACK",
    sortOrder: 14,
    labelEn: "Host feedback received on draft findings",
    labelFr: "Commentaires de l'hôte reçus sur les constatations",
    validationRules: {
      type: "MANUAL_OR_DOCUMENT",
      category: "CORRESPONDENCE",
      allowManual: true,
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// SEED CHECKLIST ITEMS
// ─────────────────────────────────────────────────────────────────

async function seedFieldworkChecklists() {
  console.log("🚀 Starting fieldwork checklist seed...\n");

  // Get all existing reviews
  const reviews = await prisma.review.findMany({
    select: { id: true, referenceNumber: true },
  });

  console.log(`📋 Found ${reviews.length} review(s) in database\n`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const review of reviews) {
    // Check if this review already has checklist items
    const existingItems = await prisma.fieldworkChecklistItem.count({
      where: { reviewId: review.id },
    });

    if (existingItems > 0) {
      console.log(
        `⏭️  Skipping "${review.referenceNumber}" - already has ${existingItems} checklist items`
      );
      skippedCount++;
      continue;
    }

    // Create checklist items for this review
    console.log(`📝 Creating checklist items for "${review.referenceNumber}"...`);

    await prisma.$transaction(
      CHECKLIST_ITEM_DEFINITIONS.map((def) =>
        prisma.fieldworkChecklistItem.create({
          data: {
            reviewId: review.id,
            phase: def.phase,
            itemCode: def.itemCode,
            sortOrder: def.sortOrder,
            labelEn: def.labelEn,
            labelFr: def.labelFr,
            validationRules:
              (def.validationRules as unknown as Prisma.InputJsonValue) ??
              Prisma.JsonNull,
          },
        })
      )
    );

    createdCount++;
    console.log(`   ✅ Created ${CHECKLIST_ITEM_DEFINITIONS.length} items`);
  }

  console.log("\n" + "═".repeat(50));
  console.log("📊 SEED SUMMARY");
  console.log("═".repeat(50));
  console.log(`   Reviews processed: ${reviews.length}`);
  console.log(`   Reviews with new checklists: ${createdCount}`);
  console.log(`   Reviews skipped (already had items): ${skippedCount}`);
  console.log(
    `   Total checklist items created: ${createdCount * CHECKLIST_ITEM_DEFINITIONS.length}`
  );
  console.log("═".repeat(50));
}

// ─────────────────────────────────────────────────────────────────
// MIGRATE DOCUMENT STATUS
// ─────────────────────────────────────────────────────────────────

async function migrateDocumentStatus() {
  console.log("\n🔄 Checking document status migration...\n");

  // Count documents without a proper status (shouldn't happen with default)
  const documentsCount = await prisma.document.count();

  if (documentsCount === 0) {
    console.log("   ℹ️  No documents in database");
    return;
  }

  // Count by status
  const statusCounts = await prisma.document.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  console.log("   📊 Document status distribution:");
  for (const group of statusCounts) {
    console.log(`      ${group.status}: ${group._count.id}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     AAPRP - Fieldwork Checklist & Document Migration       ║");
  console.log("║                    Seed Script v1.0                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    await seedFieldworkChecklists();
    await migrateDocumentStatus();

    console.log("\n✅ Fieldwork checklist seed completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
