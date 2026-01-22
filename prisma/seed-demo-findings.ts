/**
 * Seed Script: Demo Findings and Corrective Action Plans
 *
 * Creates findings for COMPLETED and IN_PROGRESS reviews:
 * - AAPRP-2026-001 (Kenya - COMPLETED): 6 findings, all with CAPs closed
 * - AAPRP-2026-002 (Mozambique - IN_PROGRESS): 3 findings, CAPs in various states
 *
 * Usage:
 *   npx tsx prisma/seed-demo-findings.ts          # Seed data
 *   npx tsx prisma/seed-demo-findings.ts cleanup  # Clean findings
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

// =============================================================================
// FINDINGS DATA
// =============================================================================

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

interface FindingData {
  referenceNumber: string;
  reviewRef: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  evidenceEn: string;
  evidenceFr: string;
  findingType: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  icaoReference: string;
  capRequired: boolean;
  cap?: CAPData;
}

// Findings for AAPRP-2026-001 (Completed - Kenya)
const COMPLETED_FINDINGS: FindingData[] = [
  {
    referenceNumber: "FND-2026-001-01",
    reviewRef: "AAPRP-2026-001",
    titleEn: "ATS Equipment Maintenance Records Incomplete",
    titleFr: "Registres de maintenance des équipements ATS incomplets",
    descriptionEn:
      "Maintenance records for critical ATS equipment were incomplete with gaps in Q2 2025 documentation. Several radar system maintenance logs were missing entries for scheduled preventive maintenance.",
    descriptionFr:
      "Les registres de maintenance des équipements ATS critiques étaient incomplets avec des lacunes dans la documentation du T2 2025.",
    evidenceEn: "Review of maintenance logs, interviews with technical staff",
    evidenceFr: "Examen des registres de maintenance, entretiens avec le personnel technique",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    icaoReference: "Annex 11, Chapter 4.3",
    capRequired: true,
    cap: {
      status: "CLOSED" as CAPStatus,
      rootCauseEn: "Lack of centralized maintenance tracking system",
      rootCauseFr: "Absence de système centralisé de suivi de la maintenance",
      correctiveActionEn: "Implement digital maintenance tracking system with automated reminders",
      correctiveActionFr: "Mettre en œuvre un système numérique de suivi de la maintenance",
      dueDaysOffset: -45,
      completedDaysOffset: -30,
      verifiedDaysOffset: -15,
    },
  },
  {
    referenceNumber: "FND-2026-001-02",
    reviewRef: "AAPRP-2026-001",
    titleEn: "SMS Safety Risk Assessment Documentation",
    titleFr: "Documentation d'évaluation des risques de sécurité SMS",
    descriptionEn:
      "Safety risk assessments for operational changes did not consistently document mitigation measures and residual risk levels.",
    descriptionFr:
      "Les évaluations des risques de sécurité pour les changements opérationnels ne documentaient pas systématiquement les mesures d'atténuation.",
    evidenceEn: "Review of 15 safety risk assessments from 2025",
    evidenceFr: "Examen de 15 évaluations des risques de sécurité de 2025",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    icaoReference: "Annex 19, Chapter 4.1",
    capRequired: true,
    cap: {
      status: "CLOSED" as CAPStatus,
      rootCauseEn: "Inconsistent use of risk assessment templates",
      rootCauseFr: "Utilisation incohérente des modèles d'évaluation des risques",
      correctiveActionEn: "Revise risk assessment template and provide refresher training",
      correctiveActionFr: "Réviser le modèle d'évaluation des risques et fournir une formation de recyclage",
      dueDaysOffset: -60,
      completedDaysOffset: -45,
      verifiedDaysOffset: -30,
    },
  },
  {
    referenceNumber: "FND-2026-001-03",
    reviewRef: "AAPRP-2026-001",
    titleEn: "NOTAM Coordination Procedures",
    titleFr: "Procédures de coordination des NOTAM",
    descriptionEn:
      "NOTAM coordination procedures between AIS and ATC were not consistently followed, resulting in delayed distribution of critical NOTAMs.",
    descriptionFr:
      "Les procédures de coordination des NOTAM entre AIS et ATC n'étaient pas systématiquement suivies.",
    evidenceEn: "Analysis of NOTAM distribution times, staff interviews",
    evidenceFr: "Analyse des délais de distribution des NOTAM, entretiens avec le personnel",
    findingType: "OBSERVATION" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    icaoReference: "Annex 15, Chapter 5.2",
    capRequired: false,
  },
  {
    referenceNumber: "FND-2026-001-04",
    reviewRef: "AAPRP-2026-001",
    titleEn: "Controller Proficiency Checks Scheduling",
    titleFr: "Planification des contrôles de compétence des contrôleurs",
    descriptionEn:
      "Two controllers had proficiency check dates that exceeded the 12-month requirement by 2-3 weeks due to scheduling conflicts.",
    descriptionFr:
      "Deux contrôleurs avaient des dates de contrôle de compétence dépassant l'exigence de 12 mois de 2-3 semaines.",
    evidenceEn: "Controller training records, HR scheduling system",
    evidenceFr: "Dossiers de formation des contrôleurs, système de planification RH",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    icaoReference: "Annex 1, Chapter 4.5",
    capRequired: true,
    cap: {
      status: "CLOSED" as CAPStatus,
      rootCauseEn: "Manual tracking of proficiency check due dates",
      rootCauseFr: "Suivi manuel des dates d'échéance des contrôles de compétence",
      correctiveActionEn: "Implement automated proficiency check tracking with 90-day advance alerts",
      correctiveActionFr: "Mettre en œuvre un suivi automatisé avec alertes 90 jours à l'avance",
      dueDaysOffset: -50,
      completedDaysOffset: -35,
      verifiedDaysOffset: -20,
    },
  },
  {
    referenceNumber: "FND-2026-001-05",
    reviewRef: "AAPRP-2026-001",
    titleEn: "Safety Promotion Program Excellence",
    titleFr: "Excellence du programme de promotion de la sécurité",
    descriptionEn:
      "The organization has implemented an exemplary safety promotion program with regular safety bulletins, recognition awards, and innovative engagement activities.",
    descriptionFr:
      "L'organisation a mis en œuvre un programme exemplaire de promotion de la sécurité.",
    evidenceEn: "Safety bulletin archives, staff engagement metrics",
    evidenceFr: "Archives des bulletins de sécurité, métriques d'engagement du personnel",
    findingType: "GOOD_PRACTICE" as FindingType,
    severity: "OBSERVATION" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    icaoReference: "Annex 19, Chapter 4.4",
    capRequired: false,
  },
  {
    referenceNumber: "FND-2026-001-06",
    reviewRef: "AAPRP-2026-001",
    titleEn: "Emergency Response Plan Testing",
    titleFr: "Tests du plan d'intervention d'urgence",
    descriptionEn:
      "Consider increasing frequency of full-scale emergency exercises from annual to semi-annual to maintain proficiency.",
    descriptionFr:
      "Envisager d'augmenter la fréquence des exercices d'urgence à grande échelle.",
    evidenceEn: "Emergency exercise records, post-exercise reports",
    evidenceFr: "Registres des exercices d'urgence, rapports post-exercice",
    findingType: "RECOMMENDATION" as FindingType,
    severity: "OBSERVATION" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    icaoReference: "Annex 14, Chapter 9.2",
    capRequired: false,
  },
];

// Findings for AAPRP-2026-002 (In Progress - Mozambique)
const IN_PROGRESS_FINDINGS: FindingData[] = [
  {
    referenceNumber: "FND-2026-002-01",
    reviewRef: "AAPRP-2026-002",
    titleEn: "SMS Hazard Reporting Rate Below Target",
    titleFr: "Taux de signalement des dangers SMS en dessous de l'objectif",
    descriptionEn:
      "Voluntary hazard reports averaged 2 per month against a target of 10, indicating potential under-reporting culture. Staff interviews revealed concerns about confidentiality.",
    descriptionFr:
      "Les signalements volontaires de dangers étaient en moyenne de 2 par mois contre un objectif de 10.",
    evidenceEn: "Hazard reporting database, staff survey results",
    evidenceFr: "Base de données de signalement des dangers, résultats d'enquête",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "CAP_REQUIRED" as FindingStatus,
    icaoReference: "Annex 19, Chapter 4.2",
    capRequired: true,
    cap: {
      status: "DRAFT" as CAPStatus,
      rootCauseEn: "Lack of trust in reporting confidentiality and unclear reporting process",
      rootCauseFr: "Manque de confiance dans la confidentialité et processus peu clair",
      correctiveActionEn: "Launch safety reporting awareness campaign and implement anonymous reporting option",
      correctiveActionFr: "Lancer une campagne de sensibilisation et mettre en œuvre une option de signalement anonyme",
      dueDaysOffset: 60,
    },
  },
  {
    referenceNumber: "FND-2026-002-02",
    reviewRef: "AAPRP-2026-002",
    titleEn: "ATS Contingency Procedures Not Current",
    titleFr: "Procédures d'urgence ATS non à jour",
    descriptionEn:
      "Contingency procedures for primary radar failure have not been updated to reflect recent equipment changes implemented in 2025.",
    descriptionFr:
      "Les procédures d'urgence pour la panne du radar primaire n'ont pas été mises à jour.",
    evidenceEn: "Contingency procedure documents, equipment change records",
    evidenceFr: "Documents de procédures d'urgence, registres de changement d'équipement",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "OPEN" as FindingStatus,
    icaoReference: "PANS-ATM, Chapter 15",
    capRequired: true,
  },
  {
    referenceNumber: "FND-2026-002-03",
    reviewRef: "AAPRP-2026-002",
    titleEn: "MET Service Coordination Excellence",
    titleFr: "Excellence de la coordination des services MET",
    descriptionEn:
      "Excellent coordination between MET and ATC services with real-time weather updates and proactive severe weather briefings.",
    descriptionFr:
      "Excellente coordination entre les services MET et ATC.",
    evidenceEn: "MET-ATC coordination logs, pilot feedback",
    evidenceFr: "Journaux de coordination MET-ATC, retours des pilotes",
    findingType: "GOOD_PRACTICE" as FindingType,
    severity: "OBSERVATION" as FindingSeverity,
    status: "OPEN" as FindingStatus,
    icaoReference: "Annex 3, Chapter 9",
    capRequired: false,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedFindings(): Promise<void> {
  console.log("\n🔍 Seeding Demo Findings and CAPs...\n");

  const today = new Date();
  const allFindings = [...COMPLETED_FINDINGS, ...IN_PROGRESS_FINDINGS];
  let findingCount = 0;
  let capCount = 0;

  for (const findingData of allFindings) {
    // Find the review
    const review = await prisma.review.findFirst({
      where: { referenceNumber: findingData.reviewRef },
      include: { hostOrganization: true },
    });

    if (!review) {
      console.log(`  ⚠️ Review not found: ${findingData.reviewRef}`);
      continue;
    }

    // Create finding using findFirst + create pattern
    let finding = await prisma.finding.findFirst({
      where: { referenceNumber: findingData.referenceNumber },
    });

    if (finding) {
      finding = await prisma.finding.update({
        where: { id: finding.id },
        data: {
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
    } else {
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
    }
    findingCount++;

    const typeIcon =
      findingData.findingType === "GOOD_PRACTICE"
        ? "⭐"
        : findingData.findingType === "NON_CONFORMITY"
        ? "❌"
        : findingData.findingType === "OBSERVATION"
        ? "👁️"
        : "💡";

    console.log(
      `  ${typeIcon} ${findingData.referenceNumber}: ${findingData.titleEn.slice(0, 45)}...`
    );

    // Create CAP if required and data provided
    if (findingData.capRequired && findingData.cap) {
      const existingCap = await prisma.correctiveActionPlan.findFirst({
        where: { findingId: finding.id },
      });

      if (existingCap) {
        await prisma.correctiveActionPlan.update({
          where: { id: existingCap.id },
          data: {
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
      } else {
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
      }
      capCount++;
      console.log(`     └─ CAP: ${findingData.cap.status}`);
    }
  }

  console.log(`\n  Total: ${findingCount} findings, ${capCount} CAPs`);
}

async function cleanup(): Promise<void> {
  console.log("\n🗑️ Cleaning up demo findings...\n");

  // Delete in correct order for foreign keys
  console.log("  Deleting corrective action plans...");
  await prisma.correctiveActionPlan.deleteMany({});

  console.log("  Deleting findings...");
  await prisma.finding.deleteMany({});

  console.log("\n✅ Cleanup complete");
}

async function printSummary(): Promise<void> {
  console.log("\n" + "═".repeat(70));
  console.log("📊 FINDINGS SEED SUMMARY");
  console.log("═".repeat(70));

  const reviews = await prisma.review.findMany({
    where: {
      findings: { some: {} },
    },
    include: {
      hostOrganization: { select: { nameEn: true } },
      findings: {
        include: {
          correctiveActionPlan: true,
        },
        orderBy: { referenceNumber: "asc" },
      },
    },
    orderBy: { referenceNumber: "asc" },
  });

  for (const review of reviews) {
    console.log(`\n${review.referenceNumber} - ${review.hostOrganization.nameEn}`);
    console.log("─".repeat(70));

    const stats = {
      nonConformities: review.findings.filter((f) => f.findingType === "NON_CONFORMITY").length,
      observations: review.findings.filter((f) => f.findingType === "OBSERVATION").length,
      goodPractices: review.findings.filter((f) => f.findingType === "GOOD_PRACTICE").length,
      recommendations: review.findings.filter((f) => f.findingType === "RECOMMENDATION").length,
      capsTotal: review.findings.filter((f) => f.correctiveActionPlan).length,
      capsClosed: review.findings.filter((f) => f.correctiveActionPlan?.status === "CLOSED").length,
    };

    console.log(
      `  Non-Conformities: ${stats.nonConformities} | Observations: ${stats.observations} | Good Practices: ${stats.goodPractices}`
    );
    console.log(`  CAPs: ${stats.capsTotal} total, ${stats.capsClosed} closed`);

    for (const finding of review.findings) {
      const capStatus = finding.correctiveActionPlan
        ? ` [CAP: ${finding.correctiveActionPlan.status}]`
        : "";
      console.log(
        `    ${finding.referenceNumber}: ${finding.findingType} - ${finding.severity}${capStatus}`
      );
    }
  }

  const totalFindings = await prisma.finding.count();
  const totalCAPs = await prisma.correctiveActionPlan.count();

  console.log("\n" + "═".repeat(70));
  console.log(`Total: ${totalFindings} findings, ${totalCAPs} CAPs`);
  console.log("═".repeat(70));
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const command = process.argv[2];

  try {
    if (command === "cleanup") {
      await cleanup();
    } else {
      await seedFindings();
      await printSummary();
    }
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
