/**
 * AAPRP Training Demo - Part 2: Findings & CAPs
 * Corrected to match actual Prisma schema
 * 
 * Run: npm run db:seed:training-part2
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Schema enums:
// ReviewPhase: PLANNING, PREPARATION, ON_SITE, REPORTING, FOLLOW_UP, CLOSED
// FindingType: NON_CONFORMITY, OBSERVATION, RECOMMENDATION, GOOD_PRACTICE, CONCERN
// FindingSeverity: CRITICAL, MAJOR, MINOR, OBSERVATION
// FindingStatus: OPEN, CAP_REQUIRED, CAP_SUBMITTED, CAP_ACCEPTED, IN_PROGRESS, VERIFICATION, CLOSED, DEFERRED
// CAPStatus: DRAFT, SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED, VERIFIED, CLOSED

interface FindingTemplate {
  findingType: "NON_CONFORMITY" | "OBSERVATION" | "RECOMMENDATION" | "GOOD_PRACTICE" | "CONCERN";
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION";
  status: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  capRequired: boolean;
  capStatus?: string;
}

const FINDINGS_BY_PHASE: Record<string, FindingTemplate[]> = {
  CLOSED: [
    { findingType: "NON_CONFORMITY", severity: "MAJOR", status: "CLOSED", titleEn: "ATS personnel licensing records incomplete", titleFr: "Dossiers de licence ATS incomplets", descriptionEn: "Personnel files missing current medical certificates and proficiency check records.", descriptionFr: "Dossiers du personnel manquant des certificats médicaux et relevés de compétences.", capRequired: true, capStatus: "CLOSED" },
    { findingType: "CONCERN", severity: "MINOR", status: "CLOSED", titleEn: "Safety reporting system underutilized", titleFr: "Système de signalement de sécurité sous-utilisé", descriptionEn: "Voluntary safety reports are below expected levels for traffic volume.", descriptionFr: "Les rapports de sécurité volontaires sont inférieurs aux niveaux attendus.", capRequired: true, capStatus: "VERIFIED" },
    { findingType: "OBSERVATION", severity: "OBSERVATION", status: "CLOSED", titleEn: "Documentation formatting inconsistencies", titleFr: "Incohérences de formatage de la documentation", descriptionEn: "Minor formatting variations noted across operational manuals.", descriptionFr: "Variations mineures de formatage dans les manuels opérationnels.", capRequired: false },
  ],
  REPORTING: [
    { findingType: "NON_CONFORMITY", severity: "CRITICAL", status: "CAP_SUBMITTED", titleEn: "NOTAM distribution delays exceed limits", titleFr: "Retards de distribution NOTAM dépassent les limites", descriptionEn: "NOTAM distribution exceeds ICAO timeframes in 15% of cases reviewed.", descriptionFr: "La distribution des NOTAM dépasse les délais OACI dans 15% des cas.", capRequired: true, capStatus: "SUBMITTED" },
    { findingType: "NON_CONFORMITY", severity: "MAJOR", status: "CAP_REQUIRED", titleEn: "Contingency procedures not current", titleFr: "Procédures d'urgence non à jour", descriptionEn: "Contingency procedures have not been reviewed since 2023.", descriptionFr: "Les procédures d'urgence n'ont pas été révisées depuis 2023.", capRequired: true, capStatus: "DRAFT" },
    { findingType: "CONCERN", severity: "MINOR", status: "OPEN", titleEn: "Training records management fragmented", titleFr: "Gestion des dossiers de formation fragmentée", descriptionEn: "Training records maintained in multiple systems without synchronization.", descriptionFr: "Dossiers de formation dans plusieurs systèmes sans synchronisation.", capRequired: true },
  ],
  FOLLOW_UP: [
    { findingType: "NON_CONFORMITY", severity: "MAJOR", status: "VERIFICATION", titleEn: "Equipment calibration records incomplete", titleFr: "Dossiers d'étalonnage des équipements incomplets", descriptionEn: "Some navigation equipment lacking recent calibration records.", descriptionFr: "Certains équipements de navigation sans dossiers d'étalonnage récents.", capRequired: true, capStatus: "COMPLETED" },
  ],
  ON_SITE: [
    { findingType: "CONCERN", severity: "MAJOR", status: "OPEN", titleEn: "Cross-border coordination procedures need formalization", titleFr: "Procédures de coordination transfrontalière à formaliser", descriptionEn: "Coordination procedures with adjacent FIRs require formal documentation.", descriptionFr: "Les procédures de coordination avec les FIR adjacentes nécessitent une formalisation.", capRequired: true },
    { findingType: "OBSERVATION", severity: "MINOR", status: "OPEN", titleEn: "ADS-C implementation documentation outdated", titleFr: "Documentation ADS-C obsolète", descriptionEn: "ADS-C implementation progressing but documentation needs updating.", descriptionFr: "Mise en œuvre ADS-C en cours mais documentation à mettre à jour.", capRequired: false },
  ],
  PREPARATION: [
    { findingType: "OBSERVATION", severity: "OBSERVATION", status: "OPEN", titleEn: "Pre-visit documentation awaiting completion", titleFr: "Documentation pré-visite en attente", descriptionEn: "Some requested documents still pending from host organization.", descriptionFr: "Certains documents demandés toujours en attente de l'organisation hôte.", capRequired: false },
  ],
  PLANNING: [
    { findingType: "RECOMMENDATION", severity: "OBSERVATION", status: "OPEN", titleEn: "Review schedule optimization recommended", titleFr: "Optimisation du calendrier de revue recommandée", descriptionEn: "Review schedule could be optimized to align with host availability.", descriptionFr: "Le calendrier de revue pourrait être optimisé selon la disponibilité de l'hôte.", capRequired: false },
  ],
};

function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `FND-${year}-${random}`;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     AAPRP Training Demo - Part 2: Findings & CAPs          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    const coordinator = await prisma.user.findFirst({ where: { email: "coordinator@aaprp.aero" } });
    if (!coordinator) {
      console.log("   ⚠️  Coordinator not found. Run demo users seed first.");
      return;
    }

    // Get reviews with hostOrganization relation
    const reviews = await prisma.review.findMany({
      include: { hostOrganization: true },
    });

    console.log(`   📊 Found ${reviews.length} reviews\n`);

    if (reviews.length === 0) {
      console.log("   ⚠️  No reviews found. Run Part 1 seed first.");
      return;
    }

    // Debug: show available phases
    const phases = [...new Set(reviews.map(r => r.phase))];
    console.log(`   📋 Review phases: ${phases.join(", ")}\n`);

    let findingCount = 0;
    let capCount = 0;

    for (const review of reviews) {
      const orgName = review.hostOrganization?.organizationCode || review.hostOrganization?.nameEn || "Unknown";
      const templates = FINDINGS_BY_PHASE[review.phase] || [];
      
      if (!templates.length) {
        console.log(`   ⏭️  No findings template for ${orgName} (${review.phase})`);
        continue;
      }

      console.log(`   📋 ${orgName} (${review.phase}):`);

      for (const t of templates) {
        // Check if finding already exists
        const exists = await prisma.finding.findFirst({
          where: { reviewId: review.id, titleEn: t.titleEn },
        });
        if (exists) {
          console.log(`      ⏭️  Exists: ${t.titleEn.substring(0, 35)}...`);
          continue;
        }

        // Create finding
        const finding = await prisma.finding.create({
          data: {
            reviewId: review.id,
            organizationId: review.hostOrganizationId,
            referenceNumber: generateReferenceNumber(),
            findingType: t.findingType,
            severity: t.severity,
            status: t.status as "OPEN" | "CAP_REQUIRED" | "CAP_SUBMITTED" | "CAP_ACCEPTED" | "IN_PROGRESS" | "VERIFICATION" | "CLOSED" | "DEFERRED",
            titleEn: t.titleEn,
            titleFr: t.titleFr,
            descriptionEn: t.descriptionEn,
            descriptionFr: t.descriptionFr,
            capRequired: t.capRequired,
            identifiedAt: new Date(),
          },
        });
        findingCount++;
        console.log(`      ✅ Finding: ${t.titleEn.substring(0, 35)}...`);

        // Create CAP if required
        if (t.capRequired && t.capStatus) {
          const assignee = await prisma.user.findFirst({ 
            where: { organizationId: review.hostOrganizationId } 
          });
          
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 90);

          try {
            await prisma.correctiveActionPlan.create({
              data: {
                findingId: finding.id,
                status: t.capStatus as "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED" | "CLOSED",
                rootCauseEn: "Root cause analysis completed. Contributing factors include process gaps, resource constraints, and documentation deficiencies.",
                rootCauseFr: "Analyse des causes profondes terminée. Les facteurs contributifs comprennent des lacunes dans les processus, des contraintes de ressources et des déficiences documentaires.",
                correctiveActionEn: "1. Implement immediate corrective measures\n2. Update relevant procedures and documentation\n3. Provide additional training to affected personnel\n4. Establish monitoring mechanisms",
                correctiveActionFr: "1. Mettre en œuvre des mesures correctives immédiates\n2. Mettre à jour les procédures et la documentation\n3. Fournir une formation supplémentaire au personnel concerné\n4. Établir des mécanismes de suivi",
                preventiveActionEn: "Implement regular monitoring and periodic reviews to prevent recurrence.",
                preventiveActionFr: "Mettre en place un suivi régulier et des revues périodiques pour prévenir la récurrence.",
                dueDate: dueDate,
                assignedToId: assignee?.id,
                submittedAt: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "VERIFIED", "CLOSED"].includes(t.capStatus) ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : null,
                acceptedAt: ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "VERIFIED", "CLOSED"].includes(t.capStatus) ? new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) : null,
                implementedAt: ["COMPLETED", "VERIFIED", "CLOSED"].includes(t.capStatus) ? new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) : null,
                completedAt: ["COMPLETED", "VERIFIED", "CLOSED"].includes(t.capStatus) ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) : null,
                verifiedAt: ["VERIFIED", "CLOSED"].includes(t.capStatus) ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) : null,
                verificationMethod: ["VERIFIED", "CLOSED"].includes(t.capStatus) ? "Document review and on-site verification" : null,
                verificationNotes: ["VERIFIED", "CLOSED"].includes(t.capStatus) ? "Implementation verified effective. All corrective actions completed as planned." : null,
                closedAt: t.capStatus === "CLOSED" ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : null,
              },
            });
            capCount++;
            console.log(`         📝 CAP (${t.capStatus})`);
          } catch (err) {
            console.log(`         ⚠️  CAP error: ${(err as Error).message.substring(0, 50)}`);
          }
        }
      }
    }

    console.log(`\n${"═".repeat(50)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${"═".repeat(50)}`);
    console.log(`   Findings created: ${findingCount}`);
    console.log(`   CAPs created: ${capCount}`);
    console.log(`${"═".repeat(50)}`);
    console.log("\n✅ Part 2 complete!\n");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });