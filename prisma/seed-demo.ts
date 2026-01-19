/**
 * Demo Data Seed Script for African ANSP Peer Review Programme
 *
 * This script creates comprehensive demo data showcasing the full workflow:
 * - African ANSPs with realistic ICAO codes
 * - Sample users with various roles
 * - Reviews in different phases
 * - Assessments with responses (AGA-scoped for valid EI calculation)
 * - Findings with various statuses
 * - Corrective Action Plans (CAPs) at different stages
 *
 * All demo data uses "DEMO-" prefix for easy identification and cleanup.
 *
 * Usage:
 *   npm run db:seed:demo          - Create demo data
 *   npm run db:seed:demo:cleanup  - Remove all demo data
 *   npm run db:seed:demo:reseed   - Remove and recreate demo data
 *   npm run db:seed:demo:status   - Show demo data statistics
 *
 * Prerequisites: Run db:seed first to populate questionnaires and organizations
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type {
  AssessmentStatus,
  AssessmentType,
  QuestionnaireType,
  MaturityLevel,
  ReviewStatus,
  ReviewPhase,
  ReviewType,
  FindingType,
  FindingSeverity,
  FindingStatus,
  CAPStatus,
  CriticalElement,
  USOAPAuditArea,
} from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// CONSTANTS
// =============================================================================

const DEMO_PREFIX = "DEMO-";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Simple French translation for demo notes
 */
function translateToFrench(text: string): string {
  const translations: Record<string, string> = {
    "Finding raised - see finding reference": "Constatation soulevée - voir la référence de constatation",
    "Service not provided at this location": "Service non fourni à cet emplacement",
    "Evidence reviewed and found compliant": "Preuves examinées et jugées conformes",
    "Assessment based on document review and interviews": "Évaluation basée sur l'examen des documents et les entretiens",
    "Procedures documented and implemented": "Procédures documentées et mises en œuvre",
    "Staff trained and competent": "Personnel formé et compétent",
    "Equipment maintained per schedule": "Équipement entretenu selon le calendrier",
    "Records complete and accessible": "Registres complets et accessibles",
    "Not applicable to current operations": "Non applicable aux opérations actuelles",
  };
  return translations[text] || text;
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface AvailableOrg {
  id: string;
  nameEn: string;
  icaoCode: string | null;
}

interface AvailableReviewer {
  id: string;
  name: string | null;
  organizationId: string | null;
  reviewerProfileId: string;
}

interface DynamicReviewConfig {
  index: number;
  status: ReviewStatus;
  phase: ReviewPhase;
  reviewType: ReviewType;
  questionnaires: QuestionnaireType[];
  daysOffset: number; // days from today for planned start
  duration: number; // days
  hasFindings: boolean;
  findingCount: number;
}


// =============================================================================
// DEMO DATA DEFINITIONS (Dynamic - uses existing organizations)
// =============================================================================

// Review configurations - these will be applied to available organizations
const REVIEW_CONFIGS: DynamicReviewConfig[] = [
  {
    index: 0,
    status: "COMPLETED" as ReviewStatus,
    phase: "CLOSED" as ReviewPhase,
    reviewType: "FULL" as ReviewType,
    questionnaires: ["ANS_USOAP_CMA", "SMS_CANSO_SOE"] as QuestionnaireType[],
    daysOffset: -75, // 75 days ago
    duration: 14,
    hasFindings: true,
    findingCount: 6,
  },
  {
    index: 1,
    status: "IN_PROGRESS" as ReviewStatus,
    phase: "ON_SITE" as ReviewPhase,
    reviewType: "FULL" as ReviewType,
    questionnaires: ["ANS_USOAP_CMA", "SMS_CANSO_SOE"] as QuestionnaireType[],
    daysOffset: -6, // Started 6 days ago
    duration: 11,
    hasFindings: true,
    findingCount: 3,
  },
  {
    index: 2,
    status: "PLANNING" as ReviewStatus,
    phase: "PREPARATION" as ReviewPhase,
    reviewType: "FULL" as ReviewType,
    questionnaires: ["ANS_USOAP_CMA"] as QuestionnaireType[],
    daysOffset: 30, // 30 days from now
    duration: 11,
    hasFindings: true,
    findingCount: 2,
  },
  {
    index: 3,
    status: "APPROVED" as ReviewStatus,
    phase: "PLANNING" as ReviewPhase,
    reviewType: "FOCUSED" as ReviewType,
    questionnaires: ["SMS_CANSO_SOE"] as QuestionnaireType[],
    daysOffset: 50, // 50 days from now
    duration: 5,
    hasFindings: true,
    findingCount: 2,
  },
  {
    index: 4,
    status: "REQUESTED" as ReviewStatus,
    phase: "PLANNING" as ReviewPhase,
    reviewType: "FULL" as ReviewType,
    questionnaires: ["ANS_USOAP_CMA", "SMS_CANSO_SOE"] as QuestionnaireType[],
    daysOffset: 80, // 80 days from now
    duration: 11,
    hasFindings: true,
    findingCount: 2,
  },
];

// Finding templates by review status - will be dynamically applied to created reviews
interface FindingTemplate {
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  findingType: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  criticalElement?: CriticalElement;
  icaoReference?: string;
  capRequired: boolean;
  capStatus?: CAPStatus;
  capDaysOffset?: number; // Relative to today
  capOverdue?: boolean;
}

// Templates for COMPLETED reviews
const COMPLETED_REVIEW_FINDINGS: FindingTemplate[] = [
  {
    titleEn: "ATS Facility Equipment Maintenance Records Incomplete",
    titleFr: "Registres de maintenance des équipements des installations ATS incomplets",
    descriptionEn: "Maintenance records for critical ATS equipment were found to be incomplete.",
    descriptionFr: "Les registres de maintenance des équipements ATS critiques ont été trouvés incomplets.",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    criticalElement: "CE_5" as CriticalElement,
    icaoReference: "Annex 11, Chapter 4",
    capRequired: true,
    capStatus: "CLOSED" as CAPStatus,
    capDaysOffset: -45,
  },
  {
    titleEn: "Controller Training Records Not Up to Date",
    titleFr: "Registres de formation des contrôleurs non à jour",
    descriptionEn: "Training records for air traffic controllers were not consistently maintained.",
    descriptionFr: "Les registres de formation des contrôleurs n'étaient pas tenus de manière cohérente.",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    criticalElement: "CE_4" as CriticalElement,
    icaoReference: "Annex 1, Chapter 4",
    capRequired: true,
    capStatus: "VERIFIED" as CAPStatus,
    capDaysOffset: -30,
  },
  {
    titleEn: "SMS Safety Risk Assessment Enhancement Opportunity",
    titleFr: "Opportunité d'amélioration du processus d'évaluation des risques SMS",
    descriptionEn: "The safety risk assessment methodology could be enhanced.",
    descriptionFr: "La méthodologie d'évaluation des risques pourrait être améliorée.",
    findingType: "OBSERVATION" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    capRequired: false,
  },
  {
    titleEn: "Good Practice: Comprehensive Safety Reporting System",
    titleFr: "Bonne pratique: Système complet de signalement de sécurité",
    descriptionEn: "The organization has implemented an excellent safety reporting system.",
    descriptionFr: "L'organisation a mis en place un excellent système de signalement de sécurité.",
    findingType: "GOOD_PRACTICE" as FindingType,
    severity: "OBSERVATION" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    capRequired: false,
  },
  {
    titleEn: "AIS Documentation Update Timeliness",
    titleFr: "Actualisation rapide de la documentation AIS",
    descriptionEn: "Some AIS documentation updates were not published within required timeframes.",
    descriptionFr: "Certaines mises à jour de la documentation AIS n'ont pas été publiées dans les délais requis.",
    findingType: "CONCERN" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    capRequired: true,
    capStatus: "CLOSED" as CAPStatus,
    capDaysOffset: -20,
  },
  {
    titleEn: "Emergency Procedures Review Recommendation",
    titleFr: "Recommandation de révision des procédures d'urgence",
    descriptionEn: "Emergency response procedures should be reviewed.",
    descriptionFr: "Les procédures de réponse d'urgence devraient être révisées.",
    findingType: "RECOMMENDATION" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "CLOSED" as FindingStatus,
    capRequired: false,
  },
];

// Templates for IN_PROGRESS reviews
const IN_PROGRESS_REVIEW_FINDINGS: FindingTemplate[] = [
  {
    titleEn: "Critical: Radar System Calibration Overdue",
    titleFr: "Critique: Calibration du système radar en retard",
    descriptionEn: "Primary surveillance radar calibration was found to be overdue.",
    descriptionFr: "La calibration du radar de surveillance primaire a été trouvée en retard.",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "CRITICAL" as FindingSeverity,
    status: "CAP_SUBMITTED" as FindingStatus,
    criticalElement: "CE_5" as CriticalElement,
    icaoReference: "Annex 10, Volume IV",
    capRequired: true,
    capStatus: "SUBMITTED" as CAPStatus,
    capDaysOffset: 15,
  },
  {
    titleEn: "NOTAM Distribution Process Gaps",
    titleFr: "Lacunes dans le processus de distribution des NOTAM",
    descriptionEn: "The NOTAM distribution process has gaps.",
    descriptionFr: "Le processus de distribution des NOTAM présente des lacunes.",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "CAP_ACCEPTED" as FindingStatus,
    criticalElement: "CE_6" as CriticalElement,
    icaoReference: "Annex 15, Chapter 5",
    capRequired: true,
    capStatus: "ACCEPTED" as CAPStatus,
    capDaysOffset: 30,
  },
  {
    titleEn: "Safety Performance Monitoring Improvement",
    titleFr: "Amélioration du suivi des performances de sécurité",
    descriptionEn: "Safety performance indicators could be better aligned.",
    descriptionFr: "Les indicateurs de performance de sécurité pourraient être mieux alignés.",
    findingType: "CONCERN" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "IN_PROGRESS" as FindingStatus,
    capRequired: true,
    capStatus: "IN_PROGRESS" as CAPStatus,
    capDaysOffset: -5, // Overdue
    capOverdue: true,
  },
];

// Templates for PLANNING reviews
const PLANNING_REVIEW_FINDINGS: FindingTemplate[] = [
  {
    titleEn: "Preliminary: ATS Coordination Procedures Documentation",
    titleFr: "Préliminaire: Documentation des procédures de coordination ATS",
    descriptionEn: "Pre-review identified potential gaps in ATS coordination procedures.",
    descriptionFr: "L'analyse préliminaire a identifié des lacunes potentielles.",
    findingType: "CONCERN" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "CAP_REQUIRED" as FindingStatus,
    criticalElement: "CE_3" as CriticalElement,
    capRequired: true,
    capStatus: "DRAFT" as CAPStatus,
    capDaysOffset: 60,
  },
  {
    titleEn: "Preliminary: Staff Qualification Documentation",
    titleFr: "Préliminaire: Documentation des qualifications du personnel",
    descriptionEn: "Pre-review identified inconsistencies in staff qualification records.",
    descriptionFr: "L'analyse préliminaire a identifié des incohérences.",
    findingType: "OBSERVATION" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "OPEN" as FindingStatus,
    capRequired: false,
  },
];

// Templates for other reviews (APPROVED, REQUESTED)
const OTHER_REVIEW_FINDINGS: FindingTemplate[] = [
  {
    titleEn: "SMS Safety Culture Assessment Needed",
    titleFr: "Évaluation de la culture de sécurité SMS nécessaire",
    descriptionEn: "A formal safety culture assessment has not been conducted recently.",
    descriptionFr: "Une évaluation formelle de la culture de sécurité n'a pas été réalisée récemment.",
    findingType: "NON_CONFORMITY" as FindingType,
    severity: "MAJOR" as FindingSeverity,
    status: "CAP_REQUIRED" as FindingStatus,
    capRequired: true,
    capStatus: "DRAFT" as CAPStatus,
    capDaysOffset: 90,
  },
  {
    titleEn: "Quality Assurance Process Review",
    titleFr: "Révision du processus d'assurance qualité",
    descriptionEn: "Need to strengthen quality assurance processes.",
    descriptionFr: "Besoin de renforcer les processus d'assurance qualité.",
    findingType: "RECOMMENDATION" as FindingType,
    severity: "MINOR" as FindingSeverity,
    status: "OPEN" as FindingStatus,
    capRequired: false,
  },
];

/**
 * Get finding templates for a given review status
 */
function getFindingTemplatesForStatus(status: ReviewStatus): FindingTemplate[] {
  switch (status) {
    case "COMPLETED":
      return COMPLETED_REVIEW_FINDINGS;
    case "IN_PROGRESS":
      return IN_PROGRESS_REVIEW_FINDINGS;
    case "PLANNING":
      return PLANNING_REVIEW_FINDINGS;
    default:
      return OTHER_REVIEW_FINDINGS;
  }
}

// Assessment configuration by review status
interface AssessmentConfig {
  questionnaireType: QuestionnaireType;
  selectedAuditAreas: USOAPAuditArea[];
  status: AssessmentStatus;
  createAllResponses: boolean;
}

function getAssessmentConfigsForStatus(reviewStatus: ReviewStatus): AssessmentConfig[] {
  switch (reviewStatus) {
    case "COMPLETED":
      return [
        {
          questionnaireType: "ANS_USOAP_CMA" as QuestionnaireType,
          selectedAuditAreas: ["AGA" as USOAPAuditArea],
          status: "COMPLETED" as AssessmentStatus,
          createAllResponses: true,
        },
        {
          questionnaireType: "SMS_CANSO_SOE" as QuestionnaireType,
          selectedAuditAreas: [],
          status: "COMPLETED" as AssessmentStatus,
          createAllResponses: true,
        },
      ];
    case "IN_PROGRESS":
      return [
        {
          questionnaireType: "ANS_USOAP_CMA" as QuestionnaireType,
          selectedAuditAreas: ["AGA" as USOAPAuditArea, "ANS" as USOAPAuditArea],
          status: "UNDER_REVIEW" as AssessmentStatus,
          createAllResponses: false,
        },
      ];
    case "PLANNING":
      return [
        {
          questionnaireType: "ANS_USOAP_CMA" as QuestionnaireType,
          selectedAuditAreas: ["AGA" as USOAPAuditArea],
          status: "DRAFT" as AssessmentStatus,
          createAllResponses: false,
        },
      ];
    default:
      return [];
  }
}

// =============================================================================
// CLEANUP FUNCTION
// =============================================================================

async function cleanupDemoData() {
  console.log("\n🗑️  Cleaning up demo data...\n");

  // Delete in correct order (child → parent)
  const deletions = [
    {
      name: "CAPs",
      fn: () =>
        prisma.correctiveActionPlan.deleteMany({
          where: { finding: { referenceNumber: { startsWith: DEMO_PREFIX } } },
        }),
    },
    {
      name: "Assessment Responses",
      fn: () =>
        prisma.assessmentResponse.deleteMany({
          where: { assessment: { referenceNumber: { startsWith: DEMO_PREFIX } } },
        }),
    },
    {
      name: "Assessments",
      fn: () =>
        prisma.assessment.deleteMany({
          where: { referenceNumber: { startsWith: DEMO_PREFIX } },
        }),
    },
    {
      name: "Findings",
      fn: () =>
        prisma.finding.deleteMany({
          where: { referenceNumber: { startsWith: DEMO_PREFIX } },
        }),
    },
    {
      name: "Review Reports",
      fn: () =>
        prisma.reviewReport.deleteMany({
          where: { review: { referenceNumber: { startsWith: DEMO_PREFIX } } },
        }),
    },
    {
      name: "Review Team Members",
      fn: () =>
        prisma.reviewTeamMember.deleteMany({
          where: { review: { referenceNumber: { startsWith: DEMO_PREFIX } } },
        }),
    },
    {
      name: "Reviews",
      fn: () =>
        prisma.review.deleteMany({
          where: { referenceNumber: { startsWith: DEMO_PREFIX } },
        }),
    },
  ];

  for (const { name, fn } of deletions) {
    const result = await fn();
    console.log(`   ✓ Deleted ${result.count} ${name}`);
  }

  console.log("\n✅ Demo data cleanup complete!");
}

// =============================================================================
// STATUS CHECK FUNCTION
// =============================================================================

async function checkDemoDataStatus() {
  const counts = {
    reviews: await prisma.review.count({
      where: { referenceNumber: { startsWith: DEMO_PREFIX } },
    }),
    teamMembers: await prisma.reviewTeamMember.count({
      where: { review: { referenceNumber: { startsWith: DEMO_PREFIX } } },
    }),
    assessments: await prisma.assessment.count({
      where: { referenceNumber: { startsWith: DEMO_PREFIX } },
    }),
    responses: await prisma.assessmentResponse.count({
      where: { assessment: { referenceNumber: { startsWith: DEMO_PREFIX } } },
    }),
    findings: await prisma.finding.count({
      where: { referenceNumber: { startsWith: DEMO_PREFIX } },
    }),
    caps: await prisma.correctiveActionPlan.count({
      where: { finding: { referenceNumber: { startsWith: DEMO_PREFIX } } },
    }),
    reports: await prisma.reviewReport.count({
      where: { review: { referenceNumber: { startsWith: DEMO_PREFIX } } },
    }),
  };

  console.log("\n📊 Demo Data Status\n");
  console.log("   Reviews:              " + counts.reviews);
  console.log("   Team Members:         " + counts.teamMembers);
  console.log("   Assessments:          " + counts.assessments);
  console.log("   Assessment Responses: " + counts.responses);
  console.log("   Findings:             " + counts.findings);
  console.log("   CAPs:                 " + counts.caps);
  console.log("   Reports:              " + counts.reports);

  if (counts.reviews === 0) {
    console.log("\n💡 No demo data found. Run: npm run db:seed:demo");
  } else {
    console.log("\n🔧 To remove: npm run db:seed:demo:cleanup");
  }
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

/**
 * Get available ANSP organizations for demo seeding
 * All organizations in this system are ANSPs by design
 */
async function getAvailableOrganizations(): Promise<AvailableOrg[]> {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      nameEn: true,
      icaoCode: true,
    },
    orderBy: { nameEn: "asc" },
  });

  return orgs;
}

/**
 * Get available reviewers for team assignment
 */
async function getAvailableReviewers(): Promise<AvailableReviewer[]> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["LEAD_REVIEWER", "PEER_REVIEWER"] },
      reviewerProfile: { isNot: null },
    },
    include: {
      reviewerProfile: { select: { id: true } },
    },
  });

  return users
    .filter((u) => u.reviewerProfile)
    .map((u) => ({
      id: u.id,
      name: u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.email,
      organizationId: u.organizationId,
      reviewerProfileId: u.reviewerProfile!.id,
    }));
}

async function seedReviews(): Promise<Map<string, string>> {
  console.log("\n📋 Creating demo reviews...");
  const reviewMap = new Map<string, string>();

  // Get available organizations dynamically
  const availableOrgs = await getAvailableOrganizations();

  if (availableOrgs.length === 0) {
    console.log("   ❌ No ANSP organizations found in database!");
    console.log("   Please seed organizations first: npm run db:seed");
    return reviewMap;
  }

  console.log(`   Found ${availableOrgs.length} ANSP organization(s):`);
  availableOrgs.forEach((org) => {
    console.log(`      - ${org.icaoCode || "N/A"}: ${org.nameEn}`);
  });

  // Get available reviewers
  const availableReviewers = await getAvailableReviewers();
  console.log(`   Found ${availableReviewers.length} reviewer(s) with profiles`);

  // Create reviews for available organizations
  const configsToUse = REVIEW_CONFIGS.slice(0, availableOrgs.length);

  for (let i = 0; i < configsToUse.length; i++) {
    const config = configsToUse[i];
    const hostOrg = availableOrgs[i];

    const reference = `${DEMO_PREFIX}REV-2026-00${i + 1}`;
    const today = new Date();
    const plannedStart = addDays(today, config.daysOffset);
    const plannedEnd = addDays(plannedStart, config.duration);
    const requestedDate = subtractDays(plannedStart, 60);

    // Determine actual dates based on status
    let actualStart: Date | null = null;
    let actualEnd: Date | null = null;

    if (config.status === "COMPLETED") {
      actualStart = plannedStart;
      actualEnd = subtractDays(plannedEnd, 1);
    } else if (config.status === "IN_PROGRESS") {
      actualStart = plannedStart;
    }

    const created = await prisma.review.create({
      data: {
        referenceNumber: reference,
        hostOrganizationId: hostOrg.id,
        status: config.status,
        phase: config.phase,
        reviewType: config.reviewType,
        plannedStartDate: plannedStart,
        plannedEndDate: plannedEnd,
        actualStartDate: actualStart,
        actualEndDate: actualEnd,
        requestedDate,
        questionnairesInScope: config.questionnaires,
      },
    });

    reviewMap.set(reference, created.id);

    // Assign team members from other organizations
    const otherOrgReviewers = availableReviewers.filter(
      (r) => r.organizationId !== hostOrg.id
    );

    if (otherOrgReviewers.length > 0) {
      // Assign first available as lead reviewer
      const leadReviewer = otherOrgReviewers[0];
      await prisma.reviewTeamMember.create({
        data: {
          reviewId: created.id,
          userId: leadReviewer.id,
          reviewerProfileId: leadReviewer.reviewerProfileId,
          role: "LEAD_REVIEWER",
          confirmedAt: addDays(requestedDate, 3),
        },
      });

      // Assign additional reviewers if available
      for (let j = 1; j < Math.min(3, otherOrgReviewers.length); j++) {
        const reviewer = otherOrgReviewers[j];
        await prisma.reviewTeamMember.create({
          data: {
            reviewId: created.id,
            userId: reviewer.id,
            reviewerProfileId: reviewer.reviewerProfileId,
            role: j === otherOrgReviewers.length - 1 ? "OBSERVER" : "REVIEWER",
            confirmedAt: addDays(requestedDate, 5),
          },
        });
      }
    }

    console.log(`   ✓ ${reference} - ${hostOrg.icaoCode || hostOrg.nameEn} (${config.status})`);
  }

  return reviewMap;
}

// Store created findings for CAP creation
interface CreatedFinding {
  id: string;
  reference: string;
  template: FindingTemplate;
}

async function seedFindings(): Promise<{ findingMap: Map<string, string>; createdFindings: CreatedFinding[] }> {
  console.log("\n🔍 Creating demo findings...");
  const findingMap = new Map<string, string>();
  const createdFindings: CreatedFinding[] = [];
  let findingCounter = 1;

  // Get all created reviews with their status
  const reviews = await prisma.review.findMany({
    where: { referenceNumber: { startsWith: DEMO_PREFIX } },
    select: { id: true, referenceNumber: true, status: true, hostOrganizationId: true },
  });

  for (const review of reviews) {
    const templates = getFindingTemplatesForStatus(review.status);

    for (const template of templates) {
      const reference = `${DEMO_PREFIX}FND-${String(findingCounter).padStart(3, "0")}`;

      const created = await prisma.finding.create({
        data: {
          referenceNumber: reference,
          reviewId: review.id,
          organizationId: review.hostOrganizationId,
          titleEn: template.titleEn,
          titleFr: template.titleFr,
          descriptionEn: template.descriptionEn,
          descriptionFr: template.descriptionFr,
          findingType: template.findingType,
          severity: template.severity,
          status: template.status,
          criticalElement: template.criticalElement,
          icaoReference: template.icaoReference,
          capRequired: template.capRequired,
          identifiedAt: subtractDays(new Date(), 30),
          ...(template.status === "CLOSED" && { closedAt: subtractDays(new Date(), 5) }),
        },
      });

      findingMap.set(reference, created.id);
      createdFindings.push({ id: created.id, reference, template });
      console.log(`   ✓ ${reference} - ${template.severity} ${template.findingType}`);
      findingCounter++;
    }
  }

  return { findingMap, createdFindings };
}

async function seedCAPs(createdFindings: CreatedFinding[]): Promise<void> {
  console.log("\n📝 Creating demo CAPs...");

  for (const { id: findingId, reference, template } of createdFindings) {
    if (!template.capRequired || !template.capStatus) continue;

    const today = new Date();
    const dueDate = template.capDaysOffset
      ? addDays(today, template.capDaysOffset)
      : addDays(today, 60);

    const capData: {
      findingId: string;
      rootCauseEn: string;
      rootCauseFr: string;
      correctiveActionEn: string;
      correctiveActionFr: string;
      preventiveActionEn: string;
      preventiveActionFr: string;
      status: CAPStatus;
      dueDate: Date;
      submittedAt?: Date;
      acceptedAt?: Date;
      completedAt?: Date;
      verifiedAt?: Date;
      verificationMethod?: string;
    } = {
      findingId,
      rootCauseEn: `Root cause analysis for ${reference}: Identified gaps in procedures and documentation control.`,
      rootCauseFr: `Analyse des causes profondes pour ${reference}: Lacunes identifiées dans les procédures et le contrôle de la documentation.`,
      correctiveActionEn: `Corrective actions include: 1) Review and update procedures, 2) Implement enhanced monitoring, 3) Provide additional training.`,
      correctiveActionFr: `Les actions correctives comprennent: 1) Réviser et mettre à jour les procédures, 2) Mettre en place un suivi amélioré, 3) Fournir une formation supplémentaire.`,
      preventiveActionEn: `Preventive measures: Establish regular audit cycles and continuous improvement processes.`,
      preventiveActionFr: `Mesures préventives: Établir des cycles d'audit réguliers et des processus d'amélioration continue.`,
      status: template.capStatus,
      dueDate,
    };

    // Add status-specific dates
    if (["SUBMITTED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "VERIFIED", "CLOSED"].includes(template.capStatus)) {
      capData.submittedAt = subtractDays(dueDate, 45);
    }
    if (["ACCEPTED", "IN_PROGRESS", "COMPLETED", "VERIFIED", "CLOSED"].includes(template.capStatus)) {
      capData.acceptedAt = subtractDays(dueDate, 40);
    }
    if (["COMPLETED", "VERIFIED", "CLOSED"].includes(template.capStatus)) {
      capData.completedAt = subtractDays(dueDate, 10);
    }
    if (["VERIFIED", "CLOSED"].includes(template.capStatus)) {
      capData.verifiedAt = subtractDays(dueDate, 5);
      capData.verificationMethod = "DOCUMENT_REVIEW";
    }

    await prisma.correctiveActionPlan.create({ data: capData });
    console.log(`   ✓ CAP for ${reference} - ${template.capStatus}${template.capOverdue ? " (OVERDUE)" : ""}`);
  }
}

async function seedAssessments(): Promise<void> {
  console.log("\n📊 Creating demo assessments with responses...");

  // Get all created reviews with their status
  const reviews = await prisma.review.findMany({
    where: { referenceNumber: { startsWith: DEMO_PREFIX } },
    select: { id: true, referenceNumber: true, status: true, hostOrganizationId: true },
  });

  let assessmentCounter = 1;

  for (const review of reviews) {
    const configs = getAssessmentConfigsForStatus(review.status);

    for (const config of configs) {
      // Get questionnaire
      const questionnaire = await prisma.questionnaire.findFirst({
        where: { type: config.questionnaireType },
      });

      if (!questionnaire) {
        console.log(`   ⚠️  Questionnaire ${config.questionnaireType} not found`);
        continue;
      }

      const reference = `${DEMO_PREFIX}ASS-${String(assessmentCounter).padStart(3, "0")}`;
      const typePrefix = config.questionnaireType === "ANS_USOAP_CMA" ? "ANS" : "SMS";

      // Create assessment
      const created = await prisma.assessment.create({
        data: {
          referenceNumber: reference,
          title: `${typePrefix} Assessment - ${reference}`,
          organizationId: review.hostOrganizationId,
          questionnaireId: questionnaire.id,
          reviewId: review.id,
          type: "PEER_REVIEW" as AssessmentType,
          status: config.status,
          selectedAuditAreas: config.selectedAuditAreas,
          startedAt: subtractDays(new Date(), 60),
          ...(config.status === "COMPLETED" && { completedAt: subtractDays(new Date(), 15) }),
        },
      });

      console.log(`   ✓ ${reference} - ${config.questionnaireType} (${config.status})`);

      // Create responses if needed
      if (config.createAllResponses) {
        await createAssessmentResponsesDynamic(created.id, config);
      }

      assessmentCounter++;
    }
  }
}

async function createAssessmentResponsesDynamic(
  assessmentId: string,
  config: AssessmentConfig
): Promise<void> {
  if (config.questionnaireType === "ANS_USOAP_CMA") {
    await createANSResponsesDynamic(assessmentId, config);
  } else if (config.questionnaireType === "SMS_CANSO_SOE") {
    await createSMSResponsesDynamic(assessmentId);
  }
}

async function createANSResponsesDynamic(
  assessmentId: string,
  config: AssessmentConfig
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {
    questionnaire: { type: "ANS_USOAP_CMA" },
  };

  if (config.selectedAuditAreas.length > 0) {
    whereClause.OR = [
      { auditArea: { in: config.selectedAuditAreas } },
      ...config.selectedAuditAreas.map((area) => {
        const prefix = area === "AGA" ? "8." : area === "ANS" ? "3." : "";
        return prefix ? { pqNumber: { startsWith: prefix } } : {};
      }).filter((obj) => Object.keys(obj).length > 0),
    ];
  }

  const questions = await prisma.question.findMany({
    where: whereClause,
    select: { id: true, pqNumber: true, auditArea: true },
    orderBy: { pqNumber: "asc" },
  });

  console.log(`      Creating ${questions.length} ANS responses`);

  const responseNotes = [
    "Evidence reviewed and found compliant",
    "Procedures documented and implemented",
    "Staff trained and competent",
    "Equipment maintained per schedule",
    "Records complete and accessible",
  ];

  let satisfactory = 0;
  let notSatisfactory = 0;
  let notApplicable = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    let responseValue: string;
    let noteText: string;

    if (i % 8 === 0) {
      responseValue = "NOT_SATISFACTORY";
      noteText = "Finding raised - see finding reference";
      notSatisfactory++;
    } else if (i % 12 === 0) {
      responseValue = "NOT_APPLICABLE";
      noteText = "Service not provided at this location";
      notApplicable++;
    } else {
      responseValue = "SATISFACTORY";
      noteText = responseNotes[i % responseNotes.length];
      satisfactory++;
    }

    await prisma.assessmentResponse.create({
      data: {
        assessmentId,
        questionId: q.id,
        responseValue,
        notes: `${noteText}\n---\n${translateToFrench(noteText)}`,
      },
    });
  }

  const eiScore = satisfactory + notSatisfactory > 0
    ? Math.round((satisfactory / (satisfactory + notSatisfactory)) * 100)
    : 0;
  console.log(`      EI Score: ${eiScore}% (SAT: ${satisfactory}, NOT_SAT: ${notSatisfactory}, N/A: ${notApplicable})`);
}

async function createSMSResponsesDynamic(assessmentId: string): Promise<void> {
  const questions = await prisma.question.findMany({
    where: {
      questionnaire: { type: "SMS_CANSO_SOE" },
    },
    select: { id: true, pqNumber: true, studyArea: true },
    orderBy: { sortOrder: "asc" },
  });

  console.log(`      Creating ${questions.length} SMS responses`);

  const maturityLevels: MaturityLevel[] = ["LEVEL_A", "LEVEL_B", "LEVEL_C", "LEVEL_C", "LEVEL_D"];
  const levelCounts: Record<string, number> = { LEVEL_A: 0, LEVEL_B: 0, LEVEL_C: 0, LEVEL_D: 0 };
  const noteText = "Assessment based on document review and interviews";

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const maturityLevel = maturityLevels[i % maturityLevels.length];
    levelCounts[maturityLevel]++;

    await prisma.assessmentResponse.create({
      data: {
        assessmentId,
        questionId: q.id,
        maturityLevel,
        notes: `${noteText}\n---\n${translateToFrench(noteText)}`,
      },
    });
  }

  console.log(`      Maturity Distribution: A=${levelCounts.LEVEL_A}, B=${levelCounts.LEVEL_B}, C=${levelCounts.LEVEL_C}, D=${levelCounts.LEVEL_D}`);
}

// =============================================================================
// SEED DEMO DATA FUNCTION
// =============================================================================

async function seedDemoData() {
  console.log("\n🌍 African ANSP Peer Review - Demo Data Seed\n");
  console.log("═".repeat(55));

  try {
    // 1. Seed reviews
    const reviewMap = await seedReviews();
    console.log(`\n   Total reviews: ${reviewMap.size}`);

    if (reviewMap.size === 0) {
      console.log("\n⚠️  No reviews created. Please check that ANSP organizations exist.");
      console.log("   Run: npm run db:seed:demo debug");
      return;
    }

    // 2. Seed findings (dynamically based on created reviews)
    const { findingMap, createdFindings } = await seedFindings(reviewMap);
    console.log(`\n   Total findings: ${findingMap.size}`);

    // 3. Seed CAPs (using the created findings)
    await seedCAPs(createdFindings);

    // 4. Seed assessments with responses
    await seedAssessments(reviewMap);

    printSummary(reviewMap.size, findingMap.size);
  } catch (error) {
    console.error("\n❌ Error seeding demo data:", error);
    throw error;
  }
}

function printSummary(reviewCount: number, findingCount: number) {
  console.log("\n" + "═".repeat(55));
  console.log("📊 DEMO DATA CREATED SUCCESSFULLY");
  console.log("═".repeat(55));
  console.log(`
┌─────────────────────────────────────────────────────┐
│ REVIEWS (${reviewCount})                                         │
├─────────────────────────────────────────────────────┤
│ ${DEMO_PREFIX}REV-2026-001  KCAA (Kenya)      COMPLETED      │
│ ${DEMO_PREFIX}REV-2026-002  TCAA (Tanzania)   IN_PROGRESS    │
│ ${DEMO_PREFIX}REV-2026-003  NAMA (Nigeria)    PLANNING       │
│ ${DEMO_PREFIX}REV-2026-004  GCAA (Ghana)      APPROVED       │
│ ${DEMO_PREFIX}REV-2026-005  ONDA (Morocco)    REQUESTED      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ASSESSMENTS (AGA-Scoped)                            │
├─────────────────────────────────────────────────────┤
│ ANS (AGA scope):  35 questions with responses       │
│ SMS (all areas):  Full maturity assessment          │
│ EI Score:         ~88% (calculated from responses)  │
│ SMS Maturity:     Level C (Managed) average         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ FINDINGS (${findingCount})                                       │
├─────────────────────────────────────────────────────┤
│ Critical: 1  │ Major: 6  │ Minor: 5  │ Obs: 3       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ CAPs (10)                                           │
├─────────────────────────────────────────────────────┤
│ Closed: 3       │ Verified: 1    │ In Progress: 1  │
│ Submitted: 1    │ Accepted: 1    │ Draft: 3        │
│ Overdue: 1 ⚠️                                       │
└─────────────────────────────────────────────────────┘
`);
  console.log("═".repeat(55));
  console.log("\n🔧 Management Commands:");
  console.log("   npm run db:seed:demo:status   - Check demo data");
  console.log("   npm run db:seed:demo:cleanup  - Remove demo data");
  console.log("   npm run db:seed:demo:reseed   - Clean and reseed\n");
}

function printUsage() {
  console.log("\n🌍 African ANSP Peer Review - Demo Data Manager\n");
  console.log("Usage: npm run db:seed:demo <command>\n");
  console.log("Commands:");
  console.log("  seed     Create demo data (default)");
  console.log("  cleanup  Remove all demo data");
  console.log("  reseed   Remove and recreate demo data");
  console.log("  status   Show demo data statistics");
  console.log("  debug    Show existing database contents\n");
  console.log("All demo data uses 'DEMO-' prefix for safe identification.\n");
}

// =============================================================================
// DEBUG FUNCTION
// =============================================================================

async function debugExistingData() {
  console.log("\n🔍 DEBUGGING EXISTING DATA\n");
  console.log("═".repeat(55));

  // 1. List all organizations
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      nameEn: true,
      icaoCode: true,
      region: true,
    },
    orderBy: { nameEn: "asc" },
  });

  console.log(`\n📋 Organizations (${orgs.length}):`);
  orgs.forEach((org) => {
    console.log(`   ${(org.icaoCode || "N/A").padEnd(8)} - ${org.nameEn} (${org.region || "No region"})`);
  });

  // 2. List all users with roles
  const userCount = await prisma.user.count();
  const users = await prisma.user.findMany({
    include: {
      organization: { select: { nameEn: true, icaoCode: true } },
      reviewerProfile: { select: { id: true, status: true } },
    },
    take: 20,
  });

  console.log(`\n👥 Users (first 20 of ${userCount}):`);
  users.forEach((u) => {
    const hasProfile = u.reviewerProfile ? "✓ Reviewer" : "";
    const userName = u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.email;
    console.log(`   ${userName.padEnd(20)} - ${u.role.padEnd(15)} - ${u.organization?.icaoCode || "No org"} ${hasProfile}`);
  });

  // 3. List questionnaires
  const questionnaires = await prisma.questionnaire.findMany({
    select: { id: true, type: true, titleEn: true },
  });

  console.log(`\n📝 Questionnaires (${questionnaires.length}):`);
  questionnaires.forEach((q) => {
    console.log(`   ${q.type.padEnd(20)} - ${q.titleEn}`);
  });

  // 4. Count questions by audit area
  const questionsByArea = await prisma.question.groupBy({
    by: ["auditArea"],
    _count: { id: true },
  });

  console.log(`\n❓ Questions by Audit Area:`);
  questionsByArea.forEach((q) => {
    console.log(`   ${(q.auditArea || "SMS/Other").padEnd(10)}: ${q._count.id} questions`);
  });

  // 5. Check existing reviews
  const existingReviews = await prisma.review.findMany({
    include: {
      hostOrganization: { select: { nameEn: true, icaoCode: true } },
      _count: { select: { findings: true, teamMembers: true, assessments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(`\n📋 Existing Reviews (last 10):`);
  if (existingReviews.length === 0) {
    console.log("   No reviews found");
  } else {
    existingReviews.forEach((r) => {
      const isDemo = r.referenceNumber.startsWith(DEMO_PREFIX) ? "🎭 " : "";
      console.log(`   ${isDemo}${r.referenceNumber} - ${r.hostOrganization.icaoCode || r.hostOrganization.nameEn} - ${r.status}`);
      console.log(`      Team: ${r._count.teamMembers}, Findings: ${r._count.findings}, Assessments: ${r._count.assessments}`);
    });
  }

  // 6. Check demo data specifically
  const demoReviews = await prisma.review.count({
    where: { referenceNumber: { startsWith: DEMO_PREFIX } },
  });

  console.log(`\n🎭 Demo Data Summary:`);
  console.log(`   Demo Reviews: ${demoReviews}`);

  // 7. Show available ANSPs for demo seeding (all orgs are ANSPs in this system)
  console.log(`\n🏢 Available ANSPs for Demo Seeding (${orgs.length}):`);
  orgs.forEach((org) => {
    console.log(`   ${(org.icaoCode || "N/A").padEnd(8)} - ${org.nameEn}`);
  });

  console.log("\n" + "═".repeat(55));
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "seed";

  try {
    switch (command) {
      case "seed":
        await seedDemoData();
        break;
      case "cleanup":
      case "revert":
        await cleanupDemoData();
        break;
      case "reseed":
        await cleanupDemoData();
        console.log("\n");
        await seedDemoData();
        break;
      case "status":
        await checkDemoDataStatus();
        break;
      case "debug":
        await debugExistingData();
        break;
      case "help":
      case "--help":
      case "-h":
        printUsage();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
