/**
 * AAPRP Training Demo Data Seed Script - Part 2
 * Creates sample findings and CAPs for demo reviews
 *
 * Run with: npm run db:seed:training-part2
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  FindingType,
  FindingSeverity,
  FindingStatus,
  CAPStatus,
} from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────
// FINDING DEFINITIONS
// ─────────────────────────────────────────────────────────────────

interface CAPData {
  status: CAPStatus;
  rootCauseEn: string;
  rootCauseFr: string;
  correctiveActionEn: string;
  correctiveActionFr: string;
  dueDaysOffset: number;
  completedDaysOffset?: number;
  verifiedDaysOffset?: number;
}

interface FindingDef {
  referenceNumber: string;
  reviewRef: string;
  findingType: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  evidenceEn: string;
  evidenceFr: string;
  icaoReference?: string;
  capRequired: boolean;
  cap?: CAPData;
}

// Findings for AAPRP-DEMO-001 (Completed - Zimbabwe)
const COMPLETED_FINDINGS: FindingDef[] = [
  {
    referenceNumber: "FND-DEMO-001-01",
    reviewRef: "AAPRP-DEMO-001",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    titleEn: "ATS personnel licensing records incomplete",
    titleFr: "Dossiers de licence du personnel ATS incomplets",
    descriptionEn:
      "Several ATS personnel files were missing current medical certificates and proficiency check records. Gap analysis revealed 8 of 45 files with missing documentation.",
    descriptionFr:
      "Plusieurs dossiers du personnel ATS manquaient de certificats médicaux à jour et de relevés de contrôle de compétence.",
    evidenceEn: "Personnel file review, training records audit",
    evidenceFr: "Examen des dossiers du personnel, audit des dossiers de formation",
    icaoReference: "Annex 1, Chapter 4.5",
    capRequired: true,
    cap: {
      status: "CLOSED" as CAPStatus,
      rootCauseEn: "Lack of centralized personnel records management system",
      rootCauseFr: "Absence de système centralisé de gestion des dossiers du personnel",
      correctiveActionEn:
        "Implement digital personnel records system with automated expiry alerts",
      correctiveActionFr:
        "Mettre en œuvre un système numérique de dossiers du personnel avec alertes automatiques d'expiration",
      dueDaysOffset: -45,
      completedDaysOffset: -30,
      verifiedDaysOffset: -15,
    },
  },
  {
    referenceNumber: "FND-DEMO-001-02",
    reviewRef: "AAPRP-DEMO-001",
    findingType: "CONCERN" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    titleEn: "Safety reporting system underutilized",
    titleFr: "Système de signalement de sécurité sous-utilisé",
    descriptionEn:
      "Voluntary safety reports are below expected levels for the traffic volume handled. Only 12 voluntary reports in the past year compared to benchmark of 35+.",
    descriptionFr:
      "Les signalements de sécurité volontaires sont inférieurs aux niveaux attendus pour le volume de trafic géré.",
    evidenceEn: "Safety reporting statistics, staff interviews",
    evidenceFr: "Statistiques de signalement de sécurité, entretiens avec le personnel",
    icaoReference: "Annex 19, Chapter 4.2",
    capRequired: true,
    cap: {
      status: "VERIFIED" as CAPStatus,
      rootCauseEn: "Insufficient safety culture promotion and reporting incentives",
      rootCauseFr: "Promotion insuffisante de la culture de sécurité et des incitations au signalement",
      correctiveActionEn:
        "Launch safety reporting campaign, implement anonymous reporting option, recognize reporters quarterly",
      correctiveActionFr:
        "Lancer une campagne de signalement de sécurité, mettre en place une option de signalement anonyme",
      dueDaysOffset: -60,
      completedDaysOffset: -40,
      verifiedDaysOffset: -20,
    },
  },
  {
    referenceNumber: "FND-DEMO-001-03",
    reviewRef: "AAPRP-DEMO-001",
    findingType: "OBSERVATION" as FindingType,
    severity: "OBSERVATION" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    titleEn: "Documentation formatting inconsistencies",
    titleFr: "Incohérences de formatage de la documentation",
    descriptionEn:
      "Minor formatting variations noted across operational procedures manuals. Document control numbering inconsistent between departments.",
    descriptionFr:
      "Des variations mineures de formatage ont été notées dans les manuels de procédures opérationnelles.",
    evidenceEn: "Document review, quality management records",
    evidenceFr: "Examen des documents, dossiers de gestion de la qualité",
    icaoReference: "Doc 9859, Chapter 5",
    capRequired: false,
  },
];

// Findings for AAPRP-DEMO-002 (Reporting - Kenya)
const REPORTING_FINDINGS: FindingDef[] = [
  {
    referenceNumber: "FND-DEMO-002-01",
    reviewRef: "AAPRP-DEMO-002",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "CRITICAL" as FindingSeverity,
    status: "CAP_SUBMITTED" as FindingStatus,
    titleEn: "NOTAM distribution delays",
    titleFr: "Retards de distribution des NOTAM",
    descriptionEn:
      "NOTAM distribution exceeds ICAO timeframes in 15% of cases reviewed. Class I NOTAMs averaged 45 minutes distribution time versus 30-minute requirement.",
    descriptionFr:
      "La distribution des NOTAM dépasse les délais OACI dans 15% des cas examinés.",
    evidenceEn: "NOTAM system logs, distribution time analysis",
    evidenceFr: "Journaux du système NOTAM, analyse des délais de distribution",
    icaoReference: "Annex 15, Chapter 5.2",
    capRequired: true,
    cap: {
      status: "SUBMITTED" as CAPStatus,
      rootCauseEn: "Manual NOTAM processing steps causing delays",
      rootCauseFr: "Les étapes manuelles de traitement des NOTAM causent des retards",
      correctiveActionEn:
        "Automate NOTAM validation workflow, add staffing during peak hours",
      correctiveActionFr:
        "Automatiser le flux de validation des NOTAM, ajouter du personnel aux heures de pointe",
      dueDaysOffset: 60,
    },
  },
  {
    referenceNumber: "FND-DEMO-002-02",
    reviewRef: "AAPRP-DEMO-002",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "CAP_REQUIRED" as FindingStatus,
    titleEn: "Contingency procedures not current",
    titleFr: "Procédures d'urgence non à jour",
    descriptionEn:
      "Contingency procedures have not been reviewed since 2023. Emergency contact lists contain outdated phone numbers.",
    descriptionFr:
      "Les procédures d'urgence n'ont pas été revues depuis 2023.",
    evidenceEn: "Contingency plan review, contact list verification",
    evidenceFr: "Examen du plan d'urgence, vérification de la liste de contacts",
    icaoReference: "Annex 11, Chapter 6.3",
    capRequired: true,
    cap: {
      status: "DRAFT" as CAPStatus,
      rootCauseEn: "No scheduled review cycle for contingency procedures",
      rootCauseFr: "Pas de cycle de révision planifié pour les procédures d'urgence",
      correctiveActionEn:
        "Establish annual contingency plan review, update all contact lists quarterly",
      correctiveActionFr:
        "Établir une révision annuelle du plan d'urgence, mettre à jour les listes de contacts trimestriellement",
      dueDaysOffset: 45,
    },
  },
  {
    referenceNumber: "FND-DEMO-002-03",
    reviewRef: "AAPRP-DEMO-002",
    findingType: "CONCERN" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "OPEN" as FindingStatus,
    titleEn: "Training records management",
    titleFr: "Gestion des dossiers de formation",
    descriptionEn:
      "Training records are maintained in multiple systems without clear synchronization. Some records in paper format only.",
    descriptionFr:
      "Les dossiers de formation sont conservés dans plusieurs systèmes sans synchronisation claire.",
    evidenceEn: "Training database review, staff interviews",
    evidenceFr: "Examen de la base de données de formation, entretiens avec le personnel",
    icaoReference: "Annex 1, Chapter 4.5",
    capRequired: true,
    cap: {
      status: "DRAFT" as CAPStatus,
      rootCauseEn: "Legacy systems not fully integrated with new HRIS",
      rootCauseFr: "Systèmes hérités non entièrement intégrés au nouveau SIRH",
      correctiveActionEn:
        "Complete HRIS integration project, digitize remaining paper records",
      correctiveActionFr:
        "Compléter le projet d'intégration SIRH, numériser les dossiers papier restants",
      dueDaysOffset: 90,
    },
  },
  {
    referenceNumber: "FND-DEMO-002-04",
    reviewRef: "AAPRP-DEMO-002",
    findingType: "OBSERVATION" as FindingType,
    severity: "OBSERVATION" as FindingSeverity,
    status: "OPEN" as FindingStatus,
    titleEn: "Workstation ergonomics",
    titleFr: "Ergonomie des postes de travail",
    descriptionEn:
      "Some ATC workstations could benefit from ergonomic improvements. Adjustable monitor arms and keyboard trays recommended.",
    descriptionFr:
      "Certains postes de travail ATC pourraient bénéficier d'améliorations ergonomiques.",
    evidenceEn: "Workplace inspection, controller feedback",
    evidenceFr: "Inspection du lieu de travail, retours des contrôleurs",
    icaoReference: "Doc 9683, Chapter 3",
    capRequired: false,
  },
];

// Findings for AAPRP-DEMO-003 (Fieldwork - Nigeria)
const FIELDWORK_FINDINGS: FindingDef[] = [
  {
    referenceNumber: "FND-DEMO-003-01",
    reviewRef: "AAPRP-DEMO-003",
    findingType: "CONCERN" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "OPEN" as FindingStatus,
    titleEn: "Cross-border coordination procedures",
    titleFr: "Procédures de coordination transfrontalière",
    descriptionEn:
      "Coordination procedures with adjacent FIRs require formalization. Current practices rely on informal arrangements.",
    descriptionFr:
      "Les procédures de coordination avec les FIR adjacents nécessitent une formalisation.",
    evidenceEn: "LoA review, coordination records, staff interviews",
    evidenceFr: "Examen des LoA, dossiers de coordination, entretiens avec le personnel",
    icaoReference: "Annex 11, Chapter 3.3",
    capRequired: true,
  },
  {
    referenceNumber: "FND-DEMO-003-02",
    reviewRef: "AAPRP-DEMO-003",
    findingType: "OBSERVATION" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "OPEN" as FindingStatus,
    titleEn: "ADS-C implementation progress",
    titleFr: "Progrès de mise en œuvre ADS-C",
    descriptionEn:
      "ADS-C implementation is progressing but documentation needs updating to reflect current capabilities.",
    descriptionFr:
      "La mise en œuvre ADS-C progresse mais la documentation doit être mise à jour.",
    evidenceEn: "System documentation, implementation status reports",
    evidenceFr: "Documentation système, rapports d'état de mise en œuvre",
    icaoReference: "Doc 9869, Chapter 4",
    capRequired: false,
  },
  {
    referenceNumber: "FND-DEMO-003-03",
    reviewRef: "AAPRP-DEMO-003",
    findingType: "GOOD_PRACTICE" as FindingType,
    severity: "OBSERVATION" as FindingSeverity,
    status: "OPEN" as FindingStatus,
    titleEn: "Regional coordination initiatives",
    titleFr: "Initiatives de coordination régionale",
    descriptionEn:
      "Excellent regional coordination through quarterly meetings with neighboring ANSPs. Best practice worth sharing across AFI region.",
    descriptionFr:
      "Excellente coordination régionale à travers des réunions trimestrielles avec les ANSP voisins.",
    evidenceEn: "Meeting minutes, coordination agreements",
    evidenceFr: "Procès-verbaux de réunions, accords de coordination",
    icaoReference: "Doc 9750, Chapter 2",
    capRequired: false,
  },
];

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ─────────────────────────────────────────────────────────────────
// SEED FINDINGS
// ─────────────────────────────────────────────────────────────────

async function seedFindings() {
  console.log("\n🔍 Creating demo findings and CAPs...\n");

  const today = new Date();
  const allFindings = [
    ...COMPLETED_FINDINGS,
    ...REPORTING_FINDINGS,
    ...FIELDWORK_FINDINGS,
  ];

  let findingCount = 0;
  let capCount = 0;

  for (const findingData of allFindings) {
    // Find the review
    const review = await prisma.review.findFirst({
      where: { referenceNumber: findingData.reviewRef },
      include: { hostOrganization: true },
    });

    if (!review) {
      console.log(`   ⚠️  Review not found: ${findingData.reviewRef}`);
      continue;
    }

    // Check if finding already exists
    let finding = await prisma.finding.findFirst({
      where: { referenceNumber: findingData.referenceNumber },
    });

    if (finding) {
      console.log(
        `   ⏭️  Finding exists: ${findingData.referenceNumber}`
      );
      continue;
    }

    // Create finding
    finding = await prisma.finding.create({
      data: {
        referenceNumber: findingData.referenceNumber,
        reviewId: review.id,
        organizationId: review.hostOrganizationId,
        titleEn: findingData.titleEn,
        titleFr: findingData.titleFr,
        descriptionEn: findingData.descriptionEn,
        descriptionFr: findingData.descriptionFr,
        evidenceEn: findingData.evidenceEn,
        evidenceFr: findingData.evidenceFr,
        findingType: findingData.findingType,
        severity: findingData.severity,
        status: findingData.status,
        icaoReference: findingData.icaoReference,
        capRequired: findingData.capRequired,
      },
    });
    findingCount++;

    const typeIcon =
      findingData.findingType === "GOOD_PRACTICE"
        ? "⭐"
        : findingData.findingType === "NON_CONFORMITY"
        ? "❌"
        : findingData.findingType === "OBSERVATION"
        ? "👁️"
        : findingData.findingType === "CONCERN"
        ? "⚠️"
        : "💡";

    console.log(
      `   ${typeIcon} ${findingData.referenceNumber}: ${findingData.titleEn.slice(0, 45)}...`
    );

    // Create CAP if required and data provided
    if (findingData.capRequired && findingData.cap) {
      await prisma.correctiveActionPlan.create({
        data: {
          findingId: finding.id,
          status: findingData.cap.status,
          rootCauseEn: findingData.cap.rootCauseEn,
          rootCauseFr: findingData.cap.rootCauseFr,
          correctiveActionEn: findingData.cap.correctiveActionEn,
          correctiveActionFr: findingData.cap.correctiveActionFr,
          dueDate: addDays(today, findingData.cap.dueDaysOffset),
          completedAt: findingData.cap.completedDaysOffset
            ? addDays(today, findingData.cap.completedDaysOffset)
            : null,
          verifiedAt: findingData.cap.verifiedDaysOffset
            ? addDays(today, findingData.cap.verifiedDaysOffset)
            : null,
        },
      });
      capCount++;
      console.log(`      └─ CAP: ${findingData.cap.status}`);
    }
  }

  console.log(`\n   📊 Summary: ${findingCount} findings, ${capCount} CAPs created`);
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║     AAPRP Training Demo Data - Part 2: Findings & CAPs     ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n"
  );

  try {
    await seedFindings();
    console.log(
      "\n✅ Part 2 complete! Run seed-training-demo-part3.ts next.\n"
    );
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
