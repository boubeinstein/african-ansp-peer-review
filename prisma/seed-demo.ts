/**
 * Demo Data Seed Script for African ANSP Peer Review Programme
 *
 * Training Demo: Feb 2-5, 2025
 *
 * This script creates comprehensive demo data showcasing the full workflow:
 * - African ANSPs with realistic ICAO codes
 * - Sample users with various roles
 * - Reviews in different phases
 * - Assessments with responses
 * - Findings with various statuses
 * - Corrective Action Plans (CAPs) at different stages
 *
 * Usage: npm run db:seed:demo
 *
 * Prerequisites: Run db:seed first to populate questionnaires
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type {
  AssessmentStatus,
  AssessmentType,
  QuestionnaireType,
  UserRole,
  MaturityLevel,
  MembershipStatus,
  Locale,
  ReviewStatus,
  ReviewPhase,
  ReviewType,
  TeamRole,
  FindingType,
  FindingSeverity,
  FindingStatus,
  CAPStatus,
  CriticalElement,
} from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Pick a random item from an array
 * (Exported for use in extended scenarios)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Pick multiple random items from an array (without duplicates)
 * (Exported for use in extended scenarios)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Generate a random date between start and end
 * (Exported for use in extended scenarios)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRandomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + Math.random() * (endTime - startTime));
}

/**
 * Generate reference number with prefix and sequence
 * @example generateReferenceNumber("FND", "REV001", 1) => "FND-REV001-001"
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateReferenceNumber(prefix: string, reviewCode: string, sequence: number): string {
  return `${prefix}-${reviewCode}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtract days from a date
 */
function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

// =============================================================================
// AFRICAN ANSP DATA
// =============================================================================

interface ANSPData {
  nameEn: string;
  nameFr: string;
  icaoCode: string;
  country: string;
  region: "WACAF" | "ESAF" | "NORTHERN";
  membershipStatus: MembershipStatus;
  city?: string;
}

const AFRICAN_ANSPS: ANSPData[] = [
  // West and Central Africa (WACAF)
  {
    nameEn: "Agency for Aerial Navigation Safety in Africa and Madagascar",
    nameFr: "Agence pour la Sécurité de la Navigation Aérienne en Afrique et à Madagascar",
    icaoCode: "ASECNA",
    country: "Senegal (HQ)",
    city: "Dakar",
    region: "WACAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Nigerian Airspace Management Agency",
    nameFr: "Agence Nigériane de Gestion de l'Espace Aérien",
    icaoCode: "NAMA",
    country: "Nigeria",
    city: "Lagos",
    region: "WACAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Ghana Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Ghana",
    icaoCode: "GCAA",
    country: "Ghana",
    city: "Accra",
    region: "WACAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Roberts Flight Information Region",
    nameFr: "Région d'Information de Vol Roberts",
    icaoCode: "RFIR",
    country: "Liberia",
    city: "Monrovia",
    region: "WACAF",
    membershipStatus: "PENDING",
  },
  {
    nameEn: "Sierra Leone Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de Sierra Leone",
    icaoCode: "SLCAA",
    country: "Sierra Leone",
    city: "Freetown",
    region: "WACAF",
    membershipStatus: "PENDING",
  },
  // Eastern and Southern Africa (ESAF)
  {
    nameEn: "Kenya Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Kenya",
    icaoCode: "KCAA",
    country: "Kenya",
    city: "Nairobi",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "South African Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile Sud-Africaine",
    icaoCode: "SACAA",
    country: "South Africa",
    city: "Johannesburg",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Tanzania Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de Tanzanie",
    icaoCode: "TCAA",
    country: "Tanzania",
    city: "Dar es Salaam",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Ethiopian Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile Éthiopienne",
    icaoCode: "ECAA",
    country: "Ethiopia",
    city: "Addis Ababa",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Uganda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de l'Ouganda",
    icaoCode: "UCAA",
    country: "Uganda",
    city: "Kampala",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Rwanda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Rwanda",
    icaoCode: "RCAA",
    country: "Rwanda",
    city: "Kigali",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Namibia Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de Namibie",
    icaoCode: "NCAA",
    country: "Namibia",
    city: "Windhoek",
    region: "ESAF",
    membershipStatus: "PENDING",
  },
  // Northern Africa
  {
    nameEn: "National Office of Airports (Morocco)",
    nameFr: "Office National des Aéroports",
    icaoCode: "ONDA",
    country: "Morocco",
    city: "Casablanca",
    region: "NORTHERN",
    membershipStatus: "ACTIVE",
  },
  // Southern Africa - ATNS
  {
    nameEn: "Air Traffic and Navigation Services",
    nameFr: "Services de Navigation et de Trafic Aérien",
    icaoCode: "ATNS",
    country: "South Africa",
    city: "Johannesburg",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
];

// =============================================================================
// USER DATA
// =============================================================================

interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  locale: Locale;
  isOrgUser: boolean;
  title?: string;
}

const DEMO_USERS: UserData[] = [
  // Programme Staff (no org)
  {
    email: "admin@aaprp.org",
    firstName: "System",
    lastName: "Administrator",
    role: "SUPER_ADMIN",
    locale: "EN",
    isOrgUser: false,
    title: "System Administrator",
  },
  {
    email: "coordinator@aaprp.org",
    firstName: "Jean",
    lastName: "Mbeki",
    role: "PROGRAMME_COORDINATOR",
    locale: "FR",
    isOrgUser: false,
    title: "Programme Coordinator",
  },
  {
    email: "lead.reviewer@aaprp.org",
    firstName: "Sarah",
    lastName: "Okonkwo",
    role: "LEAD_REVIEWER",
    locale: "EN",
    isOrgUser: false,
    title: "Lead Peer Reviewer",
  },
  {
    email: "reviewer1@aaprp.org",
    firstName: "Ahmed",
    lastName: "Hassan",
    role: "PEER_REVIEWER",
    locale: "EN",
    isOrgUser: false,
    title: "Peer Reviewer",
  },
  {
    email: "reviewer2@aaprp.org",
    firstName: "Marie",
    lastName: "Kouassi",
    role: "PEER_REVIEWER",
    locale: "FR",
    isOrgUser: false,
    title: "Peer Reviewer",
  },
  {
    email: "steering@aaprp.org",
    firstName: "David",
    lastName: "Nkrumah",
    role: "STEERING_COMMITTEE",
    locale: "EN",
    isOrgUser: false,
    title: "Steering Committee Member",
  },
];

const ORG_USER_TEMPLATES: Omit<UserData, "email" | "isOrgUser">[] = [
  { firstName: "Org", lastName: "Admin", role: "ANSP_ADMIN", locale: "EN", title: "ANSP Administrator" },
  { firstName: "Safety", lastName: "Manager", role: "SAFETY_MANAGER", locale: "EN", title: "Safety Manager" },
  { firstName: "Quality", lastName: "Manager", role: "QUALITY_MANAGER", locale: "EN", title: "Quality Manager" },
  { firstName: "Staff", lastName: "Member", role: "STAFF", locale: "EN", title: "Staff Member" },
];

// =============================================================================
// DEMO REVIEWS - 5 Regional Teams
// =============================================================================

interface DemoReview {
  reference: string;
  hostAnspCode: string;
  status: ReviewStatus;
  phase: ReviewPhase;
  reviewType: ReviewType;
  questionnaires: ("ANS_USOAP_CMA" | "SMS_CANSO_SOE")[];
  plannedStart: Date;
  plannedEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  requestedDate: Date;
  // Team composition - Lead from different org than host (COI compliance)
  teamLeadOrgCode: string;
  teamMembers: { orgCode: string; role: TeamRole }[];
  hasFindings?: boolean;
  findingCount?: number;
}

const DEMO_REVIEWS: DemoReview[] = [
  // Review 1: KCAA (Kenya) - COMPLETED
  {
    reference: "REV-2026-001",
    hostAnspCode: "KCAA",
    status: "COMPLETED",
    phase: "CLOSED",
    reviewType: "FULL",
    questionnaires: ["ANS_USOAP_CMA", "SMS_CANSO_SOE"],
    plannedStart: new Date("2025-11-01"),
    plannedEnd: new Date("2025-11-15"),
    actualStart: new Date("2025-11-01"),
    actualEnd: new Date("2025-11-14"),
    requestedDate: new Date("2025-08-15"),
    teamLeadOrgCode: "ATNS", // ATNS reviewer leads
    teamMembers: [
      { orgCode: "ASECNA", role: "REVIEWER" },
      { orgCode: "NAMA", role: "REVIEWER" },
      { orgCode: "TCAA", role: "OBSERVER" },
    ],
    hasFindings: true,
    findingCount: 6,
  },
  // Review 2: TCAA (Tanzania) - IN PROGRESS
  {
    reference: "REV-2026-002",
    hostAnspCode: "TCAA",
    status: "IN_PROGRESS",
    phase: "ON_SITE",
    reviewType: "FULL",
    questionnaires: ["ANS_USOAP_CMA", "SMS_CANSO_SOE"],
    plannedStart: new Date("2026-01-13"),
    plannedEnd: new Date("2026-01-24"),
    actualStart: new Date("2026-01-13"),
    actualEnd: null,
    requestedDate: new Date("2025-10-01"),
    teamLeadOrgCode: "ASECNA", // ASECNA reviewer leads
    teamMembers: [
      { orgCode: "KCAA", role: "REVIEWER" },
      { orgCode: "GCAA", role: "REVIEWER" },
      { orgCode: "ECAA", role: "OBSERVER" },
    ],
    hasFindings: true,
    findingCount: 3,
  },
  // Review 3: NAMA (Nigeria) - PLANNING/PREPARATION
  {
    reference: "REV-2026-003",
    hostAnspCode: "NAMA",
    status: "PLANNING",
    phase: "PREPARATION",
    reviewType: "FULL",
    questionnaires: ["ANS_USOAP_CMA"],
    plannedStart: new Date("2026-02-17"),
    plannedEnd: new Date("2026-02-28"),
    actualStart: null,
    actualEnd: null,
    requestedDate: new Date("2025-11-15"),
    teamLeadOrgCode: "ONDA", // ONDA reviewer leads
    teamMembers: [
      { orgCode: "SACAA", role: "REVIEWER" },
      { orgCode: "ATNS", role: "REVIEWER" },
    ],
  },
  // Review 4: GCAA (Ghana) - APPROVED
  {
    reference: "REV-2026-004",
    hostAnspCode: "GCAA",
    status: "APPROVED",
    phase: "PLANNING",
    reviewType: "FOCUSED",
    questionnaires: ["SMS_CANSO_SOE"],
    plannedStart: new Date("2026-03-10"),
    plannedEnd: new Date("2026-03-14"),
    actualStart: null,
    actualEnd: null,
    requestedDate: new Date("2025-12-01"),
    teamLeadOrgCode: "KCAA", // KCAA reviewer leads
    teamMembers: [
      { orgCode: "TCAA", role: "REVIEWER" },
      { orgCode: "UCAA", role: "OBSERVER" },
    ],
  },
  // Review 5: ONDA (Morocco) - REQUESTED
  {
    reference: "REV-2026-005",
    hostAnspCode: "ONDA",
    status: "REQUESTED",
    phase: "PLANNING",
    reviewType: "FULL",
    questionnaires: ["ANS_USOAP_CMA", "SMS_CANSO_SOE"],
    plannedStart: new Date("2026-04-07"),
    plannedEnd: new Date("2026-04-18"),
    actualStart: null,
    actualEnd: null,
    requestedDate: new Date("2026-01-10"),
    teamLeadOrgCode: "NAMA", // NAMA reviewer leads
    teamMembers: [
      { orgCode: "ASECNA", role: "REVIEWER" },
      { orgCode: "ECAA", role: "REVIEWER" },
    ],
  },
];

// Legacy scenarios for backward compatibility with findings
interface ReviewScenario {
  hostOrgCode: string;
  reviewCode: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  phase: ReviewPhase;
  daysAgoRequested: number;
  plannedStartOffset?: number;
  plannedDuration?: number;
  teamMembers?: { role: TeamRole; reviewerEmail: string }[];
  hasFindings?: boolean;
  findingCount?: number;
}

// Convert DEMO_REVIEWS to legacy format for seedFindings compatibility
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const REVIEW_SCENARIOS: ReviewScenario[] = DEMO_REVIEWS.map((r) => ({
  hostOrgCode: r.hostAnspCode,
  reviewCode: r.reference,
  reviewType: r.reviewType,
  status: r.status,
  phase: r.phase,
  daysAgoRequested: Math.floor((Date.now() - r.requestedDate.getTime()) / (1000 * 60 * 60 * 24)),
  hasFindings: r.hasFindings,
  findingCount: r.findingCount,
}));

// =============================================================================
// DEMO FINDINGS - 15 Findings Across Reviews
// =============================================================================

interface DemoFinding {
  reference: string;
  reviewRef: string;
  type: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  capRequired: boolean;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  evidenceEn: string;
  evidenceFr: string;
  icaoReference: string;
  criticalElement: CriticalElement;
  pqNumber?: string; // Link to specific PQ if applicable
}

const DEMO_FINDINGS: DemoFinding[] = [
  // ============================================================================
  // REV-2026-001 (KCAA Kenya) - COMPLETED Review - 3 Findings
  // ============================================================================
  {
    reference: "FND-REV001-001",
    reviewRef: "REV-2026-001",
    type: "NON_CONFORMITY",
    severity: "MAJOR",
    status: "CLOSED",
    capRequired: true,
    titleEn: "ATS Unit Competency Assessment Records Incomplete",
    titleFr: "Dossiers d'évaluation des compétences de l'unité ATS incomplets",
    descriptionEn: "Review of ATS unit records revealed that competency assessments for 12 of 45 operational controllers have not been completed within the required 12-month cycle. ICAO Annex 1 requires periodic competency assessments to ensure controller proficiency is maintained.",
    descriptionFr: "L'examen des dossiers de l'unité ATS a révélé que les évaluations de compétence de 12 des 45 contrôleurs opérationnels n'ont pas été effectuées dans le cycle requis de 12 mois. L'Annexe 1 de l'OACI exige des évaluations périodiques des compétences pour garantir le maintien de la qualification des contrôleurs.",
    evidenceEn: "Training records review dated 2025-11-05. Staff list cross-referenced with assessment completion dates. Interview with Training Manager confirmed backlog.",
    evidenceFr: "Examen des dossiers de formation daté du 2025-11-05. Liste du personnel recoupée avec les dates d'achèvement des évaluations. Entretien avec le responsable de la formation confirmant le retard.",
    icaoReference: "Annex 1, 4.5.1",
    criticalElement: "CE_4",
    pqNumber: "AGA-CE4-001",
  },
  {
    reference: "FND-REV001-002",
    reviewRef: "REV-2026-001",
    type: "OBSERVATION",
    severity: "MINOR",
    status: "CLOSED",
    capRequired: false,
    titleEn: "Outdated Emergency Response Plan References",
    titleFr: "Références obsolètes dans le plan d'intervention d'urgence",
    descriptionEn: "The aerodrome emergency plan references outdated ICAO Doc 9137 edition. While the procedures themselves remain appropriate, document references should be updated to reflect current ICAO guidance.",
    descriptionFr: "Le plan d'urgence de l'aérodrome fait référence à une édition obsolète du Doc 9137 de l'OACI. Bien que les procédures elles-mêmes restent appropriées, les références documentaires doivent être mises à jour pour refléter les orientations actuelles de l'OACI.",
    evidenceEn: "Document review of Aerodrome Emergency Plan Rev 3.2, dated 2022-06-15. References Doc 9137 Part 7 (2003 edition).",
    evidenceFr: "Examen documentaire du Plan d'urgence aéroportuaire Rév 3.2, daté du 2022-06-15. Fait référence au Doc 9137 Partie 7 (édition 2003).",
    icaoReference: "Doc 9137, Part 7",
    criticalElement: "CE_4",
  },
  {
    reference: "FND-REV001-003",
    reviewRef: "REV-2026-001",
    type: "CONCERN",
    severity: "MAJOR",
    status: "VERIFICATION",
    capRequired: true,
    titleEn: "SMS Hazard Identification Process Gaps",
    titleFr: "Lacunes dans le processus d'identification des dangers du SGS",
    descriptionEn: "The Safety Management System hazard identification process does not systematically capture hazards from all operational areas. AIM and CNS departments reported limited participation in hazard reporting, with only 3 hazard reports submitted in the past 12 months from these areas.",
    descriptionFr: "Le processus d'identification des dangers du système de gestion de la sécurité ne capture pas systématiquement les dangers de tous les domaines opérationnels. Les départements AIM et CNS ont signalé une participation limitée au signalement des dangers, avec seulement 3 rapports de dangers soumis au cours des 12 derniers mois dans ces domaines.",
    evidenceEn: "Hazard register analysis. Interview with Safety Manager dated 2025-11-08. Departmental hazard submission records.",
    evidenceFr: "Analyse du registre des dangers. Entretien avec le responsable de la sécurité daté du 2025-11-08. Enregistrements des soumissions de dangers par département.",
    icaoReference: "Annex 19, 4.1.2",
    criticalElement: "CE_3",
  },

  // ============================================================================
  // REV-2026-002 (TCAA Tanzania) - IN PROGRESS Review - 5 Findings
  // ============================================================================
  {
    reference: "FND-REV002-001",
    reviewRef: "REV-2026-002",
    type: "NON_CONFORMITY",
    severity: "CRITICAL",
    status: "CAP_SUBMITTED",
    capRequired: true,
    titleEn: "ATC License Validity Verification Not Performed",
    titleFr: "Vérification de la validité des licences ATC non effectuée",
    descriptionEn: "Critical finding: Three controllers were found to be operating with expired medical certificates. The organization's license validity tracking system failed to flag the expiration. This poses a direct safety risk as medical fitness cannot be assured for these personnel.",
    descriptionFr: "Constatation critique : Trois contrôleurs ont été trouvés en train d'exercer avec des certificats médicaux expirés. Le système de suivi de la validité des licences de l'organisation n'a pas signalé l'expiration. Cela pose un risque direct pour la sécurité car l'aptitude médicale ne peut être assurée pour ce personnel.",
    evidenceEn: "License database audit dated 2026-01-15. Cross-check with medical certificate records. Interviews with affected controllers confirmed oversight.",
    evidenceFr: "Audit de la base de données des licences daté du 2026-01-15. Vérification croisée avec les dossiers de certificats médicaux. Les entretiens avec les contrôleurs concernés ont confirmé l'oubli.",
    icaoReference: "Annex 1, 1.2.5",
    criticalElement: "CE_5",
    pqNumber: "AGA-CE5-002",
  },
  {
    reference: "FND-REV002-002",
    reviewRef: "REV-2026-002",
    type: "NON_CONFORMITY",
    severity: "MAJOR",
    status: "CAP_ACCEPTED",
    capRequired: true,
    titleEn: "Inadequate Change Management Process",
    titleFr: "Processus de gestion du changement inadéquat",
    descriptionEn: "The organization implemented a new ATC system software update without completing the required safety assessment. Documentation shows the change was implemented without formal risk evaluation as required by the SMS manual procedures.",
    descriptionFr: "L'organisation a mis en œuvre une nouvelle mise à jour du logiciel du système ATC sans effectuer l'évaluation de sécurité requise. La documentation montre que le changement a été mis en œuvre sans évaluation formelle des risques comme l'exigent les procédures du manuel du SGS.",
    evidenceEn: "Change request CR-2025-087 dated 2025-09-20. SMS manual section 5.3 requirements review. Interview with Operations Manager.",
    evidenceFr: "Demande de changement CR-2025-087 datée du 2025-09-20. Examen des exigences de la section 5.3 du manuel SGS. Entretien avec le responsable des opérations.",
    icaoReference: "Doc 9859, 5.5",
    criticalElement: "CE_3",
  },
  {
    reference: "FND-REV002-003",
    reviewRef: "REV-2026-002",
    type: "CONCERN",
    severity: "MINOR",
    status: "IN_PROGRESS",
    capRequired: true,
    titleEn: "Surveillance Radar Maintenance Records Inconsistent",
    titleFr: "Enregistrements de maintenance du radar de surveillance incohérents",
    descriptionEn: "Review of CNS maintenance records revealed inconsistencies between the computerized maintenance management system and paper-based logbooks for the primary surveillance radar. Some maintenance activities were recorded in only one system.",
    descriptionFr: "L'examen des dossiers de maintenance CNS a révélé des incohérences entre le système informatisé de gestion de la maintenance et les journaux de bord papier pour le radar de surveillance primaire. Certaines activités de maintenance n'étaient enregistrées que dans un seul système.",
    evidenceEn: "CMMS records vs logbook comparison for period Aug-Dec 2025. 7 discrepancies identified. Interview with CNS Maintenance Supervisor.",
    evidenceFr: "Comparaison des enregistrements GMAO et du journal de bord pour la période août-décembre 2025. 7 écarts identifiés. Entretien avec le superviseur de maintenance CNS.",
    icaoReference: "Annex 10, Vol IV, 2.2",
    criticalElement: "CE_8",
  },
  {
    reference: "FND-REV002-004",
    reviewRef: "REV-2026-002",
    type: "OBSERVATION",
    severity: "OBSERVATION",
    status: "OPEN",
    capRequired: false,
    titleEn: "MET Briefing Documentation Could Be Enhanced",
    titleFr: "La documentation des briefings météorologiques pourrait être améliorée",
    descriptionEn: "While meteorological briefings meet minimum requirements, the documentation of pre-flight MET briefings for flight crews could be enhanced to include acknowledgment signatures and specific weather phenomena discussed.",
    descriptionFr: "Bien que les briefings météorologiques répondent aux exigences minimales, la documentation des briefings MET avant vol pour les équipages pourrait être améliorée pour inclure les signatures d'accusé de réception et les phénomènes météorologiques spécifiques discutés.",
    evidenceEn: "Sample review of 20 pre-flight briefing records from November 2025. Best practice comparison with regional ANSPs.",
    evidenceFr: "Examen d'un échantillon de 20 dossiers de briefing avant vol de novembre 2025. Comparaison des meilleures pratiques avec les ANSP régionaux.",
    icaoReference: "Annex 3, 9.1",
    criticalElement: "CE_4",
  },
  {
    reference: "FND-REV002-005",
    reviewRef: "REV-2026-002",
    type: "RECOMMENDATION",
    severity: "MINOR",
    status: "OPEN",
    capRequired: false,
    titleEn: "Consider Implementing Fatigue Risk Management System",
    titleFr: "Envisager la mise en œuvre d'un système de gestion des risques liés à la fatigue",
    descriptionEn: "While current rostering practices appear adequate, the organization is recommended to consider implementing a formal Fatigue Risk Management System (FRMS) as a proactive safety enhancement, particularly for overnight shift patterns.",
    descriptionFr: "Bien que les pratiques actuelles de planification semblent adéquates, il est recommandé à l'organisation d'envisager la mise en œuvre d'un système formel de gestion des risques liés à la fatigue (FRMS) comme amélioration proactive de la sécurité, en particulier pour les horaires de nuit.",
    evidenceEn: "Roster analysis for ACC operations. Staff survey results on fatigue awareness. ICAO Doc 9966 FRMS guidelines review.",
    evidenceFr: "Analyse des plannings pour les opérations ACC. Résultats de l'enquête auprès du personnel sur la sensibilisation à la fatigue. Examen des directives FRMS du Doc 9966 de l'OACI.",
    icaoReference: "Doc 9966, Chapter 1",
    criticalElement: "CE_3",
  },

  // ============================================================================
  // REV-2026-003 (NAMA Nigeria) - PLANNING Review - 3 Findings (from pre-assessment)
  // ============================================================================
  {
    reference: "FND-REV003-001",
    reviewRef: "REV-2026-003",
    type: "NON_CONFORMITY",
    severity: "MAJOR",
    status: "OPEN",
    capRequired: true,
    titleEn: "Quality Management System Audit Cycle Exceeded",
    titleFr: "Cycle d'audit du système de management de la qualité dépassé",
    descriptionEn: "The organization's QMS internal audit programme has not completed the required audit cycle. Several operational areas have not been audited within the 24-month maximum interval specified in the QMS manual.",
    descriptionFr: "Le programme d'audit interne du SMQ de l'organisation n'a pas achevé le cycle d'audit requis. Plusieurs domaines opérationnels n'ont pas été audités dans l'intervalle maximum de 24 mois spécifié dans le manuel du SMQ.",
    evidenceEn: "QMS audit schedule review. Last audit dates for ATS, CNS, and MET departments. Interview with Quality Manager dated 2026-01-20.",
    evidenceFr: "Examen du calendrier d'audit SMQ. Dernières dates d'audit pour les départements ATS, CNS et MET. Entretien avec le responsable qualité daté du 2026-01-20.",
    icaoReference: "Doc 9734, Part A, 5.4",
    criticalElement: "CE_8",
  },
  {
    reference: "FND-REV003-002",
    reviewRef: "REV-2026-003",
    type: "CONCERN",
    severity: "MINOR",
    status: "CAP_REQUIRED",
    capRequired: true,
    titleEn: "AIS Publication Amendment Distribution Delays",
    titleFr: "Retards dans la distribution des amendements des publications AIS",
    descriptionEn: "Analysis of AIP amendment distribution records shows that some amendments were distributed to subscribers with delays exceeding the AIRAC cycle requirements. This could impact operational users relying on current aeronautical information.",
    descriptionFr: "L'analyse des dossiers de distribution des amendements AIP montre que certains amendements ont été distribués aux abonnés avec des retards dépassant les exigences du cycle AIRAC. Cela pourrait affecter les utilisateurs opérationnels comptant sur des informations aéronautiques à jour.",
    evidenceEn: "AIP amendment distribution log for 2025. AIRAC cycle compliance analysis. User complaint records.",
    evidenceFr: "Journal de distribution des amendements AIP pour 2025. Analyse de conformité au cycle AIRAC. Enregistrements des plaintes des utilisateurs.",
    icaoReference: "Annex 15, 6.1",
    criticalElement: "CE_4",
    pqNumber: "AGA-CE4-015",
  },
  {
    reference: "FND-REV003-003",
    reviewRef: "REV-2026-003",
    type: "OBSERVATION",
    severity: "OBSERVATION",
    status: "OPEN",
    capRequired: false,
    titleEn: "Controller Refresher Training Records Format Varies",
    titleFr: "Le format des dossiers de formation de recyclage des contrôleurs varie",
    descriptionEn: "While all required refresher training is being conducted, the format and content of training records varies between training events and instructors. Standardization would improve record-keeping and tracking.",
    descriptionFr: "Bien que toutes les formations de recyclage requises soient dispensées, le format et le contenu des dossiers de formation varient entre les événements de formation et les instructeurs. La normalisation améliorerait la tenue des dossiers et le suivi.",
    evidenceEn: "Sample of 15 refresher training records from 2025. Training department interview.",
    evidenceFr: "Échantillon de 15 dossiers de formation de recyclage de 2025. Entretien avec le département de formation.",
    icaoReference: "Annex 1, 4.5.3",
    criticalElement: "CE_6",
  },

  // ============================================================================
  // REV-2026-004 (GCAA Ghana) - APPROVED Review - 2 Findings (from self-assessment)
  // ============================================================================
  {
    reference: "FND-REV004-001",
    reviewRef: "REV-2026-004",
    type: "NON_CONFORMITY",
    severity: "MAJOR",
    status: "OPEN",
    capRequired: true,
    titleEn: "SMS Safety Performance Indicators Not Established",
    titleFr: "Indicateurs de performance de sécurité du SGS non établis",
    descriptionEn: "The organization has not established measurable safety performance indicators (SPIs) and safety performance targets (SPTs) as required for an effective SMS. Without SPIs, the organization cannot objectively measure safety performance trends.",
    descriptionFr: "L'organisation n'a pas établi d'indicateurs de performance de sécurité (IPS) mesurables ni d'objectifs de performance de sécurité (OPS) comme requis pour un SGS efficace. Sans IPS, l'organisation ne peut pas mesurer objectivement les tendances de performance de sécurité.",
    evidenceEn: "SMS documentation review. Safety performance monitoring records. Interview with Accountable Executive dated 2026-01-05.",
    evidenceFr: "Examen de la documentation SGS. Enregistrements de surveillance de la performance de sécurité. Entretien avec le dirigeant responsable daté du 2026-01-05.",
    icaoReference: "Annex 19, 4.1.3",
    criticalElement: "CE_3",
  },
  {
    reference: "FND-REV004-002",
    reviewRef: "REV-2026-004",
    type: "CONCERN",
    severity: "MINOR",
    status: "OPEN",
    capRequired: true,
    titleEn: "Safety Promotion Activities Limited",
    titleFr: "Activités de promotion de la sécurité limitées",
    descriptionEn: "Safety promotion activities under SMS Component 4 are limited. The organization conducts only annual safety awareness sessions. Regular safety communications, bulletins, and lessons learned dissemination are not systematically implemented.",
    descriptionFr: "Les activités de promotion de la sécurité dans le cadre de la composante 4 du SGS sont limitées. L'organisation ne mène que des sessions annuelles de sensibilisation à la sécurité. Les communications régulières sur la sécurité, les bulletins et la diffusion des leçons apprises ne sont pas systématiquement mis en œuvre.",
    evidenceEn: "Safety promotion records for 2024-2025. Staff safety awareness survey. SMS Component 4 documentation review.",
    evidenceFr: "Enregistrements de promotion de la sécurité pour 2024-2025. Enquête de sensibilisation à la sécurité du personnel. Examen de la documentation de la composante 4 du SGS.",
    icaoReference: "Annex 19, 4.2",
    criticalElement: "CE_6",
  },

  // ============================================================================
  // REV-2026-005 (ONDA Morocco) - REQUESTED Review - 2 Findings (from gap analysis)
  // ============================================================================
  {
    reference: "FND-REV005-001",
    reviewRef: "REV-2026-005",
    type: "CONCERN",
    severity: "MAJOR",
    status: "OPEN",
    capRequired: true,
    titleEn: "Emergency Response Coordination Procedures Need Update",
    titleFr: "Les procédures de coordination des interventions d'urgence nécessitent une mise à jour",
    descriptionEn: "Gap analysis revealed that emergency response coordination procedures between the ANSP and airport operator have not been updated following recent organizational changes. Some contact details and coordination protocols are outdated.",
    descriptionFr: "L'analyse des écarts a révélé que les procédures de coordination des interventions d'urgence entre l'ANSP et l'exploitant aéroportuaire n'ont pas été mises à jour suite aux récents changements organisationnels. Certains coordonnées et protocoles de coordination sont obsolètes.",
    evidenceEn: "Emergency response plan review. Coordination agreement dated 2021. Recent organizational change documentation.",
    evidenceFr: "Examen du plan d'intervention d'urgence. Accord de coordination daté de 2021. Documentation des changements organisationnels récents.",
    icaoReference: "Doc 9137, Part 1, 3.2",
    criticalElement: "CE_4",
  },
  {
    reference: "FND-REV005-002",
    reviewRef: "REV-2026-005",
    type: "OBSERVATION",
    severity: "MINOR",
    status: "OPEN",
    capRequired: false,
    titleEn: "NOTAM Coordination Process Documentation",
    titleFr: "Documentation du processus de coordination NOTAM",
    descriptionEn: "While NOTAM coordination with adjacent FIRs functions effectively, the formal procedures documenting this coordination are not fully comprehensive. Enhanced documentation would support continuity during staff changes.",
    descriptionFr: "Bien que la coordination NOTAM avec les FIR adjacentes fonctionne efficacement, les procédures formelles documentant cette coordination ne sont pas entièrement complètes. Une documentation améliorée soutiendrait la continuité lors des changements de personnel.",
    evidenceEn: "NOTAM coordination procedure review. Adjacent FIR agreements. Staff interviews on coordination practices.",
    evidenceFr: "Examen de la procédure de coordination NOTAM. Accords avec les FIR adjacentes. Entretiens avec le personnel sur les pratiques de coordination.",
    icaoReference: "Annex 15, 5.1",
    criticalElement: "CE_4",
  },
];

// =============================================================================
// DEMO CAPS - 10 Corrective Action Plans
// =============================================================================

type VerificationMethod = "DOCUMENT_REVIEW" | "ON_SITE_INSPECTION" | "RECORDS_AUDIT" | "INTERVIEW" | "SYSTEM_TEST";

interface DemoCAP {
  findingRef: string;
  status: CAPStatus;
  rootCauseEn: string;
  rootCauseFr: string;
  correctiveActionEn: string;
  correctiveActionFr: string;
  preventiveActionEn?: string;
  preventiveActionFr?: string;
  dueDate: Date;
  submittedAt?: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  verifiedAt?: Date;
  verificationMethod?: VerificationMethod;
  verificationNotesEn?: string;
  verificationNotesFr?: string;
}

const DEMO_CAPS: DemoCAP[] = [
  // ============================================================================
  // CAP-001: FND-REV001-001 (KCAA) - CLOSED - ATS Competency Assessment Records
  // ============================================================================
  {
    findingRef: "FND-REV001-001",
    status: "CLOSED",
    rootCauseEn: "Inadequate tracking system for competency assessment schedules. The existing spreadsheet-based system lacks automated reminders and supervisor alerts when assessments become due.",
    rootCauseFr: "Système de suivi inadéquat pour les calendriers d'évaluation des compétences. Le système actuel basé sur des feuilles de calcul manque de rappels automatisés et d'alertes aux superviseurs lorsque les évaluations arrivent à échéance.",
    correctiveActionEn: "1. Implement digital competency tracking system with automated alerts (30 days prior to due date). 2. Complete all overdue assessments within 45 days. 3. Assign dedicated training coordinator to monitor compliance.",
    correctiveActionFr: "1. Mettre en place un système numérique de suivi des compétences avec alertes automatisées (30 jours avant la date d'échéance). 2. Compléter toutes les évaluations en retard dans les 45 jours. 3. Désigner un coordinateur de formation dédié pour surveiller la conformité.",
    preventiveActionEn: "Establish quarterly management review of training compliance metrics. Include competency status in monthly operational briefings.",
    preventiveActionFr: "Établir une revue trimestrielle de gestion des indicateurs de conformité de la formation. Inclure le statut des compétences dans les briefings opérationnels mensuels.",
    dueDate: new Date("2025-12-15"),
    submittedAt: new Date("2025-11-20"),
    acceptedAt: new Date("2025-11-22"),
    completedAt: new Date("2025-12-10"),
    verifiedAt: new Date("2025-12-14"),
    verificationMethod: "DOCUMENT_REVIEW",
    verificationNotesEn: "Reviewed updated tracking system. All 12 overdue assessments completed. System generating alerts correctly. Training coordinator appointed effective 2025-12-01.",
    verificationNotesFr: "Examen du système de suivi mis à jour. Les 12 évaluations en retard complétées. Le système génère correctement les alertes. Coordinateur de formation nommé à compter du 2025-12-01.",
  },

  // ============================================================================
  // CAP-002: FND-REV001-003 (KCAA) - VERIFIED - SMS Hazard Identification Gaps
  // ============================================================================
  {
    findingRef: "FND-REV001-003",
    status: "VERIFIED",
    rootCauseEn: "Limited awareness of hazard reporting requirements in non-ATC departments. AIM and CNS staff not adequately trained on SMS hazard identification and reporting processes.",
    rootCauseFr: "Sensibilisation limitée aux exigences de signalement des dangers dans les départements hors ATC. Le personnel AIM et CNS n'est pas suffisamment formé sur les processus d'identification et de signalement des dangers du SGS.",
    correctiveActionEn: "1. Conduct SMS awareness training for all AIM and CNS staff (completed within 30 days). 2. Establish departmental safety focal points. 3. Implement monthly hazard identification workshops. 4. Simplify hazard reporting form and make available electronically.",
    correctiveActionFr: "1. Organiser une formation de sensibilisation au SGS pour tout le personnel AIM et CNS (complétée dans les 30 jours). 2. Établir des points focaux de sécurité par département. 3. Mettre en place des ateliers mensuels d'identification des dangers. 4. Simplifier le formulaire de signalement des dangers et le rendre disponible électroniquement.",
    preventiveActionEn: "Include hazard reporting metrics in departmental KPIs. Conduct quarterly SMS refresher sessions for all operational departments.",
    preventiveActionFr: "Inclure les indicateurs de signalement des dangers dans les KPI départementaux. Organiser des sessions de rafraîchissement SGS trimestrielles pour tous les départements opérationnels.",
    dueDate: new Date("2026-01-10"),
    submittedAt: new Date("2025-11-25"),
    acceptedAt: new Date("2025-11-28"),
    completedAt: new Date("2026-01-05"),
    verifiedAt: new Date("2026-01-08"),
    verificationMethod: "RECORDS_AUDIT",
    verificationNotesEn: "Training records verified for 45 AIM/CNS staff. 8 new hazard reports received from these departments in December 2025. Electronic reporting form deployed.",
    verificationNotesFr: "Dossiers de formation vérifiés pour 45 agents AIM/CNS. 8 nouveaux rapports de dangers reçus de ces départements en décembre 2025. Formulaire de signalement électronique déployé.",
  },

  // ============================================================================
  // CAP-003: FND-REV002-001 (TCAA) - SUBMITTED - ATC License Validity
  // ============================================================================
  {
    findingRef: "FND-REV002-001",
    status: "SUBMITTED",
    rootCauseEn: "License tracking database not integrated with medical certificate records. Manual cross-checking process failed due to staff absence. No automated alerts for pending expirations.",
    rootCauseFr: "La base de données de suivi des licences n'est pas intégrée aux dossiers des certificats médicaux. Le processus de vérification manuelle a échoué en raison de l'absence du personnel. Aucune alerte automatisée pour les expirations imminentes.",
    correctiveActionEn: "1. Immediately ground affected controllers pending medical renewal (completed). 2. Implement integrated license-medical tracking system with automatic alerts at 90, 60, and 30 days before expiration. 3. Designate backup personnel for license compliance monitoring. 4. Conduct full audit of all controller credentials.",
    correctiveActionFr: "1. Suspendre immédiatement les contrôleurs concernés en attendant le renouvellement médical (terminé). 2. Mettre en place un système intégré de suivi licence-médical avec alertes automatiques à 90, 60 et 30 jours avant l'expiration. 3. Désigner du personnel de secours pour le suivi de la conformité des licences. 4. Effectuer un audit complet des qualifications de tous les contrôleurs.",
    preventiveActionEn: "Establish weekly license validity report to Chief ATS. Include license status verification in daily operations briefing checklist.",
    preventiveActionFr: "Établir un rapport hebdomadaire de validité des licences au Chef ATS. Inclure la vérification du statut des licences dans la liste de contrôle du briefing opérationnel quotidien.",
    dueDate: new Date("2026-02-15"),
    submittedAt: new Date("2026-01-16"),
  },

  // ============================================================================
  // CAP-004: FND-REV002-002 (TCAA) - ACCEPTED - Change Management Process
  // ============================================================================
  {
    findingRef: "FND-REV002-002",
    status: "ACCEPTED",
    rootCauseEn: "Change management procedure did not clearly define safety assessment requirements for software updates. Operations team unaware that system changes required formal risk assessment under SMS.",
    rootCauseFr: "La procédure de gestion du changement ne définissait pas clairement les exigences d'évaluation de la sécurité pour les mises à jour logicielles. L'équipe des opérations n'était pas consciente que les modifications du système nécessitaient une évaluation formelle des risques dans le cadre du SGS.",
    correctiveActionEn: "1. Revise change management procedure (OP-CM-001) to include explicit safety assessment requirements for all system changes. 2. Conduct retrospective safety assessment for recent software update. 3. Train all operations and technical managers on revised procedure. 4. Establish Change Control Board with mandatory safety representative.",
    correctiveActionFr: "1. Réviser la procédure de gestion du changement (OP-CM-001) pour inclure des exigences explicites d'évaluation de la sécurité pour toutes les modifications du système. 2. Effectuer une évaluation de sécurité rétrospective pour la récente mise à jour logicielle. 3. Former tous les responsables opérationnels et techniques sur la procédure révisée. 4. Établir un comité de contrôle des changements avec un représentant sécurité obligatoire.",
    preventiveActionEn: "Conduct annual review of change management procedure against ICAO Doc 9859 requirements. Include change management compliance in internal audit programme.",
    preventiveActionFr: "Effectuer une revue annuelle de la procédure de gestion du changement par rapport aux exigences du Doc 9859 de l'OACI. Inclure la conformité de la gestion du changement dans le programme d'audit interne.",
    dueDate: new Date("2026-02-20"),
    submittedAt: new Date("2026-01-17"),
    acceptedAt: new Date("2026-01-18"),
  },

  // ============================================================================
  // CAP-005: FND-REV002-003 (TCAA) - IN_PROGRESS - Radar Maintenance Records
  // ============================================================================
  {
    findingRef: "FND-REV002-003",
    status: "IN_PROGRESS",
    rootCauseEn: "Parallel record-keeping systems (CMMS and paper logbooks) without clear synchronization procedures. Different technicians using different systems based on personal preference.",
    rootCauseFr: "Systèmes parallèles de tenue des registres (GMAO et journaux de bord papier) sans procédures de synchronisation claires. Différents techniciens utilisant différents systèmes selon leurs préférences personnelles.",
    correctiveActionEn: "1. Define CMMS as primary record system with daily synchronization to paper logbook. 2. Create standard operating procedure for maintenance record entry. 3. Reconcile all existing records between systems. 4. Conduct refresher training for all CNS technicians on record-keeping requirements.",
    correctiveActionFr: "1. Définir la GMAO comme système d'enregistrement principal avec synchronisation quotidienne vers le journal de bord papier. 2. Créer une procédure opérationnelle standard pour la saisie des enregistrements de maintenance. 3. Rapprocher tous les enregistrements existants entre les systèmes. 4. Organiser une formation de recyclage pour tous les techniciens CNS sur les exigences de tenue des registres.",
    dueDate: new Date("2026-01-10"), // Overdue by 8 days
    submittedAt: new Date("2025-12-20"),
    acceptedAt: new Date("2025-12-22"),
  },

  // ============================================================================
  // CAP-006: FND-REV003-001 (NAMA) - DRAFT - QMS Audit Cycle Exceeded
  // ============================================================================
  {
    findingRef: "FND-REV003-001",
    status: "DRAFT",
    rootCauseEn: "Insufficient internal audit resources following retirement of two qualified auditors in 2024. Remaining auditors overloaded with other safety management responsibilities.",
    rootCauseFr: "Ressources d'audit interne insuffisantes suite au départ à la retraite de deux auditeurs qualifiés en 2024. Les auditeurs restants surchargés par d'autres responsabilités de gestion de la sécurité.",
    correctiveActionEn: "1. Recruit and train two additional internal auditors. 2. Develop catch-up audit plan to address areas exceeding 24-month interval. 3. Consider outsourcing specific audits to qualified external auditors. 4. Revise audit schedule to ensure even distribution across audit cycle.",
    correctiveActionFr: "1. Recruter et former deux auditeurs internes supplémentaires. 2. Développer un plan d'audit de rattrapage pour traiter les domaines dépassant l'intervalle de 24 mois. 3. Envisager l'externalisation d'audits spécifiques à des auditeurs externes qualifiés. 4. Réviser le calendrier d'audit pour assurer une répartition uniforme sur le cycle d'audit.",
    dueDate: new Date("2026-03-15"),
  },

  // ============================================================================
  // CAP-007: FND-REV003-002 (NAMA) - DRAFT - AIS Publication Amendment Delays
  // ============================================================================
  {
    findingRef: "FND-REV003-002",
    status: "DRAFT",
    rootCauseEn: "Manual distribution process relies on single point of contact. Delays occur during staff leave periods. No automated tracking of distribution deadlines.",
    rootCauseFr: "Le processus de distribution manuel repose sur un point de contact unique. Des retards surviennent pendant les périodes de congé du personnel. Pas de suivi automatisé des délais de distribution.",
    correctiveActionEn: "1. Implement electronic AIP amendment distribution system. 2. Establish backup distribution responsibilities. 3. Create AIRAC cycle compliance tracking dashboard. 4. Set up automatic alerts 7 days before AIRAC effective date.",
    correctiveActionFr: "1. Mettre en place un système électronique de distribution des amendements AIP. 2. Établir des responsabilités de distribution de secours. 3. Créer un tableau de bord de suivi de la conformité au cycle AIRAC. 4. Configurer des alertes automatiques 7 jours avant la date d'effet AIRAC.",
    dueDate: new Date("2026-03-20"),
  },

  // ============================================================================
  // CAP-008: FND-REV004-001 (GCAA) - DRAFT - SMS SPIs Not Established
  // ============================================================================
  {
    findingRef: "FND-REV004-001",
    status: "DRAFT",
    rootCauseEn: "SMS implementation focused initially on hazard reporting and occurrence investigation. Safety performance monitoring component not fully developed. Lack of expertise in defining measurable SPIs.",
    rootCauseFr: "La mise en œuvre du SGS s'est initialement concentrée sur le signalement des dangers et l'enquête sur les événements. La composante de surveillance de la performance de sécurité n'est pas entièrement développée. Manque d'expertise dans la définition d'IPS mesurables.",
    correctiveActionEn: "1. Engage SMS consultant to assist in SPI development. 2. Define minimum set of high-level SPIs aligned with State safety performance indicators. 3. Establish SPT baselines using historical data. 4. Implement quarterly safety performance review process.",
    correctiveActionFr: "1. Engager un consultant SGS pour aider au développement des IPS. 2. Définir un ensemble minimum d'IPS de haut niveau alignés sur les indicateurs de performance de sécurité de l'État. 3. Établir des références d'OPS en utilisant les données historiques. 4. Mettre en place un processus trimestriel de revue de la performance de sécurité.",
    preventiveActionEn: "Include SPI review in annual SMS manual update process. Participate in regional SMS implementation working groups.",
    preventiveActionFr: "Inclure la revue des IPS dans le processus de mise à jour annuelle du manuel SGS. Participer aux groupes de travail régionaux sur la mise en œuvre du SGS.",
    dueDate: new Date("2026-04-15"),
  },

  // ============================================================================
  // CAP-009: FND-REV004-002 (GCAA) - DRAFT - Safety Promotion Activities Limited
  // ============================================================================
  {
    findingRef: "FND-REV004-002",
    status: "DRAFT",
    rootCauseEn: "Safety Manager role combined with other responsibilities, limiting time available for safety promotion activities. No dedicated budget for safety communication materials.",
    rootCauseFr: "Le rôle de responsable de la sécurité est combiné avec d'autres responsabilités, limitant le temps disponible pour les activités de promotion de la sécurité. Pas de budget dédié aux matériels de communication sur la sécurité.",
    correctiveActionEn: "1. Establish quarterly safety newsletter. 2. Create safety lessons learned database accessible to all staff. 3. Implement monthly safety topic briefings in departmental meetings. 4. Develop safety promotion material library (posters, videos, presentations).",
    correctiveActionFr: "1. Établir un bulletin de sécurité trimestriel. 2. Créer une base de données de leçons apprises en matière de sécurité accessible à tout le personnel. 3. Mettre en place des briefings mensuels sur des sujets de sécurité lors des réunions départementales. 4. Développer une bibliothèque de matériels de promotion de la sécurité (affiches, vidéos, présentations).",
    dueDate: new Date("2026-04-30"),
  },

  // ============================================================================
  // CAP-010: FND-REV005-001 (ONDA) - DRAFT - Emergency Response Coordination
  // ============================================================================
  {
    findingRef: "FND-REV005-001",
    status: "DRAFT",
    rootCauseEn: "Organizational changes at both ANSP and airport operator not communicated to coordination document owners. No formal review trigger for coordination agreements following organizational restructuring.",
    rootCauseFr: "Les changements organisationnels chez l'ANSP et l'exploitant aéroportuaire n'ont pas été communiqués aux propriétaires des documents de coordination. Pas de déclencheur formel de révision des accords de coordination suite à une restructuration organisationnelle.",
    correctiveActionEn: "1. Update emergency response coordination procedures with current contact details and organizational structure. 2. Conduct joint tabletop exercise with airport operator to validate updated procedures. 3. Establish formal notification process for organizational changes affecting emergency coordination.",
    correctiveActionFr: "1. Mettre à jour les procédures de coordination des interventions d'urgence avec les coordonnées actuelles et la structure organisationnelle. 2. Mener un exercice de simulation conjoint avec l'exploitant aéroportuaire pour valider les procédures mises à jour. 3. Établir un processus formel de notification des changements organisationnels affectant la coordination d'urgence.",
    preventiveActionEn: "Include coordination agreement review in annual document review cycle. Establish quarterly coordination meeting with airport operator emergency planning team.",
    preventiveActionFr: "Inclure la revue des accords de coordination dans le cycle annuel de révision des documents. Établir une réunion de coordination trimestrielle avec l'équipe de planification d'urgence de l'exploitant aéroportuaire.",
    dueDate: new Date("2026-05-15"),
  },
];

// =============================================================================
// DEMO ASSESSMENT RESPONSES - Linked to Reviews
// =============================================================================

interface DemoReviewAssessment {
  reviewRef: string;
  type: AssessmentType;
  questionnaireType: QuestionnaireType;
  status: AssessmentStatus;
  completedAt: Date;
}

interface DemoANSResponse {
  pqNumber: string;
  response: ANSResponseValue;
  notesEn: string;
  notesFr: string;
  linkedFindingRef?: string; // Link to finding if NOT_SATISFACTORY
}

interface DemoSMSResponse {
  studyArea: string;
  maturityLevel: MaturityLevel;
  notesEn: string;
  notesFr: string;
}

// Assessment records for completed reviews
const DEMO_REVIEW_ASSESSMENTS: DemoReviewAssessment[] = [
  // ANS Assessment for KCAA (REV-2026-001) - COMPLETED
  {
    reviewRef: "REV-2026-001",
    type: "PEER_REVIEW",
    questionnaireType: "ANS_USOAP_CMA",
    status: "COMPLETED",
    completedAt: new Date("2025-11-14"),
  },
  // SMS Assessment for KCAA (REV-2026-001) - COMPLETED
  {
    reviewRef: "REV-2026-001",
    type: "PEER_REVIEW",
    questionnaireType: "SMS_CANSO_SOE",
    status: "COMPLETED",
    completedAt: new Date("2025-11-14"),
  },
];

// ANS USOAP CMA Responses for REV-2026-001 (KCAA)
// 30 specific responses across different Critical Elements
const DEMO_ANS_RESPONSES: DemoANSResponse[] = [
  // ============================================================================
  // CE-3: State Aviation Safety Oversight System (5 questions)
  // ============================================================================
  {
    pqNumber: "AGA-CE3-001",
    response: "SATISFACTORY",
    notesEn: "Primary aviation legislation enacted and in force. Civil Aviation Act 2019 provides comprehensive regulatory framework.",
    notesFr: "Législation aéronautique primaire promulguée et en vigueur. La loi sur l'aviation civile de 2019 fournit un cadre réglementaire complet.",
  },
  {
    pqNumber: "AGA-CE3-002",
    response: "SATISFACTORY",
    notesEn: "Specific operating regulations for ANS providers established. CAR Part 171 and 172 cover ATS and CNS requirements.",
    notesFr: "Règlements d'exploitation spécifiques aux fournisseurs de services de navigation aérienne établis. Les CAR parties 171 et 172 couvrent les exigences ATS et CNS.",
  },
  {
    pqNumber: "AGA-CE3-003",
    response: "NOT_SATISFACTORY",
    notesEn: "SMS hazard identification process does not systematically capture hazards from all operational areas. Finding raised.",
    notesFr: "Le processus d'identification des dangers du SGS ne capture pas systématiquement les dangers de tous les domaines opérationnels. Constatation relevée.",
    linkedFindingRef: "FND-REV001-003",
  },
  {
    pqNumber: "AGA-CE3-004",
    response: "SATISFACTORY",
    notesEn: "Safety data analysis procedures documented and implemented. Monthly safety trend reports produced.",
    notesFr: "Procédures d'analyse des données de sécurité documentées et mises en œuvre. Rapports mensuels des tendances de sécurité produits.",
  },
  {
    pqNumber: "AGA-CE3-005",
    response: "SATISFACTORY",
    notesEn: "Safety objectives and targets aligned with State Safety Programme requirements.",
    notesFr: "Objectifs et cibles de sécurité alignés sur les exigences du Programme National de Sécurité.",
  },

  // ============================================================================
  // CE-4: Technical Personnel Qualification and Training (8 questions)
  // ============================================================================
  {
    pqNumber: "AGA-CE4-001",
    response: "NOT_SATISFACTORY",
    notesEn: "Competency assessments for 12 of 45 operational controllers not completed within required 12-month cycle. Finding raised.",
    notesFr: "Évaluations de compétence de 12 des 45 contrôleurs opérationnels non complétées dans le cycle requis de 12 mois. Constatation relevée.",
    linkedFindingRef: "FND-REV001-001",
  },
  {
    pqNumber: "AGA-CE4-002",
    response: "SATISFACTORY",
    notesEn: "ATC licensing procedures comply with Annex 1 requirements. License categories and ratings properly defined.",
    notesFr: "Procédures de délivrance des licences ATC conformes aux exigences de l'Annexe 1. Catégories et qualifications de licence correctement définies.",
  },
  {
    pqNumber: "AGA-CE4-003",
    response: "SATISFACTORY",
    notesEn: "Language proficiency requirements established and enforced. All controllers maintain Level 4 or above.",
    notesFr: "Exigences de compétence linguistique établies et appliquées. Tous les contrôleurs maintiennent le niveau 4 ou supérieur.",
  },
  {
    pqNumber: "AGA-CE4-004",
    response: "SATISFACTORY",
    notesEn: "Initial training curriculum meets ICAO requirements. Training organization approved under CAR Part 141.",
    notesFr: "Programme de formation initiale conforme aux exigences de l'OACI. Organisation de formation approuvée selon le CAR Part 141.",
  },
  {
    pqNumber: "AGA-CE4-005",
    response: "SATISFACTORY",
    notesEn: "Recurrent training programme includes all required elements. Annual refresher training documented.",
    notesFr: "Programme de formation continue comprend tous les éléments requis. Formation de recyclage annuelle documentée.",
  },
  {
    pqNumber: "AGA-CE4-006",
    response: "NOT_APPLICABLE",
    notesEn: "Remote tower operations not conducted. Service not provided by this ANSP.",
    notesFr: "Opérations de tour de contrôle à distance non effectuées. Service non fourni par cet ANSP.",
  },
  {
    pqNumber: "AGA-CE4-007",
    response: "SATISFACTORY",
    notesEn: "Medical certification requirements for ATC personnel implemented in accordance with Annex 1 Chapter 6.",
    notesFr: "Exigences de certification médicale pour le personnel ATC mises en œuvre conformément au Chapitre 6 de l'Annexe 1.",
  },
  {
    pqNumber: "AGA-CE4-008",
    response: "SATISFACTORY",
    notesEn: "OJT instructor qualifications defined and verified. All OJTIs hold appropriate endorsements.",
    notesFr: "Qualifications des instructeurs OJT définies et vérifiées. Tous les OJTIs détiennent les qualifications appropriées.",
  },

  // ============================================================================
  // CE-5: Technical Guidance and Operational Documentation (6 questions)
  // ============================================================================
  {
    pqNumber: "AGA-CE5-001",
    response: "SATISFACTORY",
    notesEn: "ATS operations manual current and accessible to all operational staff. Last revision dated 2025-06-15.",
    notesFr: "Manuel des opérations ATS à jour et accessible à tout le personnel opérationnel. Dernière révision datée du 2025-06-15.",
  },
  {
    pqNumber: "AGA-CE5-002",
    response: "SATISFACTORY",
    notesEn: "Letters of Agreement with adjacent units current and reviewed annually.",
    notesFr: "Lettres d'accord avec les unités adjacentes à jour et révisées annuellement.",
  },
  {
    pqNumber: "AGA-CE5-003",
    response: "SATISFACTORY",
    notesEn: "Local instructions and procedures documented for all ATS units. Contents aligned with national regulations.",
    notesFr: "Instructions et procédures locales documentées pour toutes les unités ATS. Contenu aligné sur les réglementations nationales.",
  },
  {
    pqNumber: "AGA-CE5-004",
    response: "SATISFACTORY",
    notesEn: "Contingency procedures documented for equipment failures and emergency situations.",
    notesFr: "Procédures de contingence documentées pour les pannes d'équipement et les situations d'urgence.",
  },
  {
    pqNumber: "AGA-CE5-005",
    response: "SATISFACTORY",
    notesEn: "AIP section and NOTAM procedures comply with Annex 15 requirements. AIRAC cycle properly followed.",
    notesFr: "Section AIP et procédures NOTAM conformes aux exigences de l'Annexe 15. Cycle AIRAC correctement suivi.",
  },
  {
    pqNumber: "AGA-CE5-006",
    response: "NOT_APPLICABLE",
    notesEn: "Space-based ADS-B not implemented in this FIR. Infrastructure under development.",
    notesFr: "ADS-B spatial non mis en œuvre dans cette FIR. Infrastructure en cours de développement.",
  },

  // ============================================================================
  // CE-6: Licensing and Certification Obligations (5 questions)
  // ============================================================================
  {
    pqNumber: "AGA-CE6-001",
    response: "SATISFACTORY",
    notesEn: "ATS provider certification maintained. Certificate valid until 2027-03-31.",
    notesFr: "Certification du fournisseur ATS maintenue. Certificat valide jusqu'au 2027-03-31.",
  },
  {
    pqNumber: "AGA-CE6-002",
    response: "SATISFACTORY",
    notesEn: "CNS equipment certification procedures in place. All navigation aids have current certificates of approval.",
    notesFr: "Procédures de certification des équipements CNS en place. Toutes les aides à la navigation ont des certificats d'approbation à jour.",
  },
  {
    pqNumber: "AGA-CE6-003",
    response: "SATISFACTORY",
    notesEn: "License issuance procedures documented and consistently applied. Records maintained in secure database.",
    notesFr: "Procédures de délivrance des licences documentées et appliquées de manière cohérente. Dossiers conservés dans une base de données sécurisée.",
  },
  {
    pqNumber: "AGA-CE6-004",
    response: "SATISFACTORY",
    notesEn: "License validation requirements for foreign controllers defined. Conversion procedures align with ICAO provisions.",
    notesFr: "Exigences de validation des licences pour les contrôleurs étrangers définies. Procédures de conversion alignées sur les dispositions de l'OACI.",
  },
  {
    pqNumber: "AGA-CE6-005",
    response: "NOT_APPLICABLE",
    notesEn: "Designated check controllers not utilized. All assessments conducted by CAA-approved examiners.",
    notesFr: "Contrôleurs vérificateurs désignés non utilisés. Toutes les évaluations effectuées par des examinateurs approuvés par la CAA.",
  },

  // ============================================================================
  // CE-7: Surveillance Obligations (3 questions)
  // ============================================================================
  {
    pqNumber: "AGA-CE7-001",
    response: "SATISFACTORY",
    notesEn: "Surveillance programme established with defined inspection frequency. Annual audit schedule maintained.",
    notesFr: "Programme de surveillance établi avec fréquence d'inspection définie. Calendrier d'audit annuel maintenu.",
  },
  {
    pqNumber: "AGA-CE7-002",
    response: "SATISFACTORY",
    notesEn: "Surveillance findings tracked and followed up systematically. Finding closure verified before sign-off.",
    notesFr: "Constatations de surveillance suivies et traitées systématiquement. Clôture des constatations vérifiée avant signature.",
  },
  {
    pqNumber: "AGA-CE7-003",
    response: "SATISFACTORY",
    notesEn: "Performance-based surveillance elements implemented where appropriate. Risk-based approach to inspection planning.",
    notesFr: "Éléments de surveillance basés sur la performance mis en œuvre le cas échéant. Approche basée sur les risques pour la planification des inspections.",
  },

  // ============================================================================
  // CE-8: Resolution of Safety Issues (3 questions)
  // ============================================================================
  {
    pqNumber: "AGA-CE8-001",
    response: "SATISFACTORY",
    notesEn: "Safety issue resolution procedures documented. Escalation process defined for unresolved issues.",
    notesFr: "Procédures de résolution des problèmes de sécurité documentées. Processus d'escalade défini pour les problèmes non résolus.",
  },
  {
    pqNumber: "AGA-CE8-002",
    response: "SATISFACTORY",
    notesEn: "Enforcement actions defined and proportionate to safety impact. Progressive enforcement approach documented.",
    notesFr: "Actions d'application définies et proportionnelles à l'impact sur la sécurité. Approche d'application progressive documentée.",
  },
  {
    pqNumber: "AGA-CE8-003",
    response: "SATISFACTORY",
    notesEn: "Corrective action tracking system in place. CAP status reviewed in monthly safety meetings.",
    notesFr: "Système de suivi des actions correctives en place. Statut des PAC examiné lors des réunions de sécurité mensuelles.",
  },
];

// SMS CANSO SoE Responses for REV-2026-001 (KCAA)
// Responses across all 4 SMS Components and study areas
const DEMO_SMS_RESPONSES: DemoSMSResponse[] = [
  // ============================================================================
  // Component 1: Safety Policy and Objectives (6 study areas)
  // ============================================================================
  {
    studyArea: "SAFETY_POLICY",
    maturityLevel: "LEVEL_C",
    notesEn: "Safety policy documented and signed by Accountable Executive. Policy communicated to all staff. Review cycle established.",
    notesFr: "Politique de sécurité documentée et signée par le dirigeant responsable. Politique communiquée à tout le personnel. Cycle de révision établi.",
  },
  {
    studyArea: "SAFETY_OBJECTIVES",
    maturityLevel: "LEVEL_B",
    notesEn: "Safety objectives defined but not fully measurable. Linkage to SPIs needs strengthening.",
    notesFr: "Objectifs de sécurité définis mais pas entièrement mesurables. Le lien avec les IPS doit être renforcé.",
  },
  {
    studyArea: "ACCOUNTABLE_EXECUTIVE",
    maturityLevel: "LEVEL_D",
    notesEn: "Accountable Executive clearly identified with appropriate authority. Regular engagement in safety reviews demonstrated.",
    notesFr: "Dirigeant responsable clairement identifié avec l'autorité appropriée. Engagement régulier dans les revues de sécurité démontré.",
  },
  {
    studyArea: "SAFETY_RESPONSIBILITIES",
    maturityLevel: "LEVEL_C",
    notesEn: "Safety responsibilities documented in job descriptions. Key safety personnel identified. Some roles need clearer definition.",
    notesFr: "Responsabilités de sécurité documentées dans les descriptions de poste. Personnel de sécurité clé identifié. Certains rôles nécessitent une définition plus claire.",
  },
  {
    studyArea: "SAFETY_COMMITTEE",
    maturityLevel: "LEVEL_C",
    notesEn: "Safety Review Board meets quarterly. Terms of reference established. Minutes and actions tracked.",
    notesFr: "Comité de revue de sécurité se réunit trimestriellement. Termes de référence établis. Procès-verbaux et actions suivis.",
  },
  {
    studyArea: "DOCUMENTATION",
    maturityLevel: "LEVEL_C",
    notesEn: "SMS manual current and controlled. Document control procedures in place. Staff aware of document locations.",
    notesFr: "Manuel SGS à jour et contrôlé. Procédures de contrôle des documents en place. Personnel informé de l'emplacement des documents.",
  },

  // ============================================================================
  // Component 2: Safety Risk Management (5 study areas)
  // ============================================================================
  {
    studyArea: "HAZARD_IDENTIFICATION",
    maturityLevel: "LEVEL_B",
    notesEn: "Hazard identification process established but not consistently applied across all departments. AIM and CNS participation limited.",
    notesFr: "Processus d'identification des dangers établi mais pas appliqué de manière cohérente dans tous les départements. Participation AIM et CNS limitée.",
  },
  {
    studyArea: "RISK_ASSESSMENT",
    maturityLevel: "LEVEL_C",
    notesEn: "Risk assessment methodology documented using 5x5 matrix. Assessors trained. Records maintained.",
    notesFr: "Méthodologie d'évaluation des risques documentée utilisant une matrice 5x5. Évaluateurs formés. Registres maintenus.",
  },
  {
    studyArea: "RISK_MITIGATION",
    maturityLevel: "LEVEL_C",
    notesEn: "Risk mitigation measures identified and implemented. Effectiveness monitoring needs improvement.",
    notesFr: "Mesures d'atténuation des risques identifiées et mises en œuvre. Le suivi de l'efficacité doit être amélioré.",
  },
  {
    studyArea: "CHANGE_MANAGEMENT",
    maturityLevel: "LEVEL_B",
    notesEn: "Change management procedure exists but not consistently followed for all changes. Software changes particularly affected.",
    notesFr: "Procédure de gestion du changement existe mais pas suivie de manière cohérente pour tous les changements. Les changements logiciels particulièrement affectés.",
  },
  {
    studyArea: "INTERNAL_REPORTING",
    maturityLevel: "LEVEL_C",
    notesEn: "Voluntary reporting system in place. Confidentiality and just culture principles documented. Reporting rate acceptable.",
    notesFr: "Système de signalement volontaire en place. Principes de confidentialité et de culture juste documentés. Taux de signalement acceptable.",
  },

  // ============================================================================
  // Component 3: Safety Assurance (5 study areas)
  // ============================================================================
  {
    studyArea: "SAFETY_PERFORMANCE_MONITORING",
    maturityLevel: "LEVEL_C",
    notesEn: "Safety performance indicators defined. Monthly monitoring reports produced. Trend analysis conducted.",
    notesFr: "Indicateurs de performance de sécurité définis. Rapports de suivi mensuels produits. Analyse des tendances effectuée.",
  },
  {
    studyArea: "SAFETY_DATA_MANAGEMENT",
    maturityLevel: "LEVEL_C",
    notesEn: "Safety data collected and stored securely. Analysis capabilities adequate. Data quality controls in place.",
    notesFr: "Données de sécurité collectées et stockées de manière sécurisée. Capacités d'analyse adéquates. Contrôles de qualité des données en place.",
  },
  {
    studyArea: "INTERNAL_AUDITING",
    maturityLevel: "LEVEL_C",
    notesEn: "Internal audit programme established. Auditor training provided. Findings tracked to closure.",
    notesFr: "Programme d'audit interne établi. Formation des auditeurs fournie. Constatations suivies jusqu'à clôture.",
  },
  {
    studyArea: "MANAGEMENT_OF_CHANGE",
    maturityLevel: "LEVEL_B",
    notesEn: "MOC procedures documented but implementation varies. Some changes implemented without full safety assessment.",
    notesFr: "Procédures MOC documentées mais la mise en œuvre varie. Certains changements mis en œuvre sans évaluation complète de la sécurité.",
  },
  {
    studyArea: "CONTINUOUS_IMPROVEMENT",
    maturityLevel: "LEVEL_C",
    notesEn: "Continuous improvement process linked to audit findings and safety reviews. Actions tracked systematically.",
    notesFr: "Processus d'amélioration continue lié aux constatations d'audit et aux revues de sécurité. Actions suivies systématiquement.",
  },

  // ============================================================================
  // Component 4: Safety Promotion (4 study areas)
  // ============================================================================
  {
    studyArea: "TRAINING_AND_EDUCATION",
    maturityLevel: "LEVEL_C",
    notesEn: "SMS training included in initial and recurrent training. Awareness materials available. Training records maintained.",
    notesFr: "Formation SGS incluse dans la formation initiale et continue. Matériels de sensibilisation disponibles. Dossiers de formation maintenus.",
  },
  {
    studyArea: "SAFETY_COMMUNICATION",
    maturityLevel: "LEVEL_B",
    notesEn: "Safety communications occur but not systematically. Annual safety briefings conducted. Regular communications limited.",
    notesFr: "Communications de sécurité ont lieu mais pas systématiquement. Briefings de sécurité annuels effectués. Communications régulières limitées.",
  },
  {
    studyArea: "LESSONS_LEARNED",
    maturityLevel: "LEVEL_B",
    notesEn: "Lessons learned captured from investigations. Distribution limited to directly involved staff. Broader sharing needed.",
    notesFr: "Leçons apprises capturées des enquêtes. Distribution limitée au personnel directement impliqué. Partage plus large nécessaire.",
  },
  {
    studyArea: "SAFETY_CULTURE",
    maturityLevel: "LEVEL_C",
    notesEn: "Positive safety culture evident. Staff comfortable reporting issues. Just culture principles understood.",
    notesFr: "Culture de sécurité positive évidente. Personnel à l'aise pour signaler les problèmes. Principes de culture juste compris.",
  },
];

// =============================================================================
// RESPONSE GENERATION
// =============================================================================

type ANSResponseValue = "SATISFACTORY" | "NOT_SATISFACTORY" | "NOT_APPLICABLE";

function generateANSResponse(index: number, distribution?: {
  satisfactory: number;
  notSatisfactory: number;
  notApplicable: number;
}): ANSResponseValue {
  const dist = distribution ?? { satisfactory: 70, notSatisfactory: 20, notApplicable: 10 };
  const total = dist.satisfactory + dist.notSatisfactory + dist.notApplicable;
  const rand = (index * 7 + 13) % total;

  if (rand < dist.satisfactory) return "SATISFACTORY";
  if (rand < dist.satisfactory + dist.notSatisfactory) return "NOT_SATISFACTORY";
  return "NOT_APPLICABLE";
}

function generateSMSMaturityLevel(index: number, distribution?: {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
}): MaturityLevel {
  const dist = distribution ?? { A: 5, B: 15, C: 40, D: 30, E: 10 };
  const total = dist.A + dist.B + dist.C + dist.D + dist.E;
  const rand = (index * 7 + 13) % total;

  const levelMap: Record<string, MaturityLevel> = {
    A: "LEVEL_A",
    B: "LEVEL_B",
    C: "LEVEL_C",
    D: "LEVEL_D",
    E: "LEVEL_E",
  };

  if (rand < dist.A) return levelMap.A;
  if (rand < dist.A + dist.B) return levelMap.B;
  if (rand < dist.A + dist.B + dist.C) return levelMap.C;
  if (rand < dist.A + dist.B + dist.C + dist.D) return levelMap.D;
  return levelMap.E;
}

// =============================================================================
// SEEDING FUNCTIONS
// =============================================================================

async function seedOrganizations(): Promise<Map<string, string>> {
  console.log("\n📦 Seeding organizations...");
  const orgMap = new Map<string, string>();

  for (const ansp of AFRICAN_ANSPS) {
    const org = await prisma.organization.upsert({
      where: { icaoCode: ansp.icaoCode },
      update: {
        nameEn: ansp.nameEn,
        nameFr: ansp.nameFr,
        country: ansp.country,
        city: ansp.city,
        region: ansp.region,
        membershipStatus: ansp.membershipStatus,
      },
      create: {
        nameEn: ansp.nameEn,
        nameFr: ansp.nameFr,
        icaoCode: ansp.icaoCode,
        country: ansp.country,
        city: ansp.city,
        region: ansp.region,
        membershipStatus: ansp.membershipStatus,
      },
    });

    orgMap.set(ansp.icaoCode, org.id);
    console.log(`  ✓ ${ansp.icaoCode} - ${ansp.country}`);
  }

  return orgMap;
}

async function seedUsers(orgMap: Map<string, string>): Promise<Map<string, string>> {
  console.log("\n👥 Seeding users...");
  const userMap = new Map<string, string>();

  // Create programme-level users (no org)
  for (const userData of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        title: userData.title,
        role: userData.role,
        locale: userData.locale,
        isActive: true,
      },
      create: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        title: userData.title,
        role: userData.role,
        locale: userData.locale,
        isActive: true,
      },
    });

    userMap.set(userData.email, user.id);
    console.log(`  ✓ ${userData.role}: ${userData.firstName} ${userData.lastName}`);
  }

  // Create org users for each organization
  console.log("\n  Creating organization users...");
  let orgUserCount = 0;

  for (const [icaoCode, orgId] of orgMap.entries()) {
    // Create one admin user per org
    const adminTemplate = ORG_USER_TEMPLATES[0];
    const adminEmail = `admin@${icaoCode.toLowerCase()}.example`;

    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        firstName: adminTemplate.firstName,
        lastName: `${adminTemplate.lastName} (${icaoCode})`,
        title: adminTemplate.title,
        role: adminTemplate.role,
        locale: adminTemplate.locale,
        organizationId: orgId,
        isActive: true,
      },
      create: {
        email: adminEmail,
        firstName: adminTemplate.firstName,
        lastName: `${adminTemplate.lastName} (${icaoCode})`,
        title: adminTemplate.title,
        role: adminTemplate.role,
        locale: adminTemplate.locale,
        organizationId: orgId,
        isActive: true,
      },
    });

    userMap.set(adminEmail, adminUser.id);
    orgUserCount++;

    // Create safety manager for active orgs
    if (["ASECNA", "NAMA", "KCAA", "SACAA", "ECAA", "TCAA", "GCAA"].includes(icaoCode)) {
      const safetyTemplate = ORG_USER_TEMPLATES[1];
      const safetyEmail = `safety@${icaoCode.toLowerCase()}.example`;

      const safetyUser = await prisma.user.upsert({
        where: { email: safetyEmail },
        update: {
          firstName: safetyTemplate.firstName,
          lastName: `${safetyTemplate.lastName} (${icaoCode})`,
          title: safetyTemplate.title,
          role: safetyTemplate.role,
          locale: safetyTemplate.locale,
          organizationId: orgId,
          isActive: true,
        },
        create: {
          email: safetyEmail,
          firstName: safetyTemplate.firstName,
          lastName: `${safetyTemplate.lastName} (${icaoCode})`,
          title: safetyTemplate.title,
          role: safetyTemplate.role,
          locale: safetyTemplate.locale,
          organizationId: orgId,
          isActive: true,
        },
      });

      userMap.set(safetyEmail, safetyUser.id);
      orgUserCount++;
    }

    // Create quality manager for some orgs
    if (["ASECNA", "NAMA", "KCAA", "SACAA"].includes(icaoCode)) {
      const qualityTemplate = ORG_USER_TEMPLATES[2];
      const qualityEmail = `quality@${icaoCode.toLowerCase()}.example`;

      const qualityUser = await prisma.user.upsert({
        where: { email: qualityEmail },
        update: {
          firstName: qualityTemplate.firstName,
          lastName: `${qualityTemplate.lastName} (${icaoCode})`,
          title: qualityTemplate.title,
          role: qualityTemplate.role,
          locale: qualityTemplate.locale,
          organizationId: orgId,
          isActive: true,
        },
        create: {
          email: qualityEmail,
          firstName: qualityTemplate.firstName,
          lastName: `${qualityTemplate.lastName} (${icaoCode})`,
          title: qualityTemplate.title,
          role: qualityTemplate.role,
          locale: qualityTemplate.locale,
          organizationId: orgId,
          isActive: true,
        },
      });

      userMap.set(qualityEmail, qualityUser.id);
      orgUserCount++;
    }
  }

  console.log(`  ✓ Created ${orgUserCount} organization users`);
  return userMap;
}

async function seedReviews(
  orgMap: Map<string, string>,
  userMap: Map<string, string>
): Promise<Map<string, string>> {
  console.log("\n🔍 Seeding demo reviews (5 regional teams)...");
  const reviewMap = new Map<string, string>();

  // Get questionnaire IDs for scope
  const ansQuestionnaire = await prisma.questionnaire.findFirst({
    where: { type: "ANS_USOAP_CMA", isActive: true },
    select: { id: true },
  });
  const smsQuestionnaire = await prisma.questionnaire.findFirst({
    where: { type: "SMS_CANSO_SOE", isActive: true },
    select: { id: true },
  });

  for (const demoReview of DEMO_REVIEWS) {
    const hostOrgId = orgMap.get(demoReview.hostAnspCode);
    if (!hostOrgId) {
      console.log(`  ⚠ Host organization ${demoReview.hostAnspCode} not found, skipping review`);
      continue;
    }

    // Build questionnaires in scope
    const questionnairesInScope: string[] = [];
    if (demoReview.questionnaires.includes("ANS_USOAP_CMA") && ansQuestionnaire) {
      questionnairesInScope.push(ansQuestionnaire.id);
    }
    if (demoReview.questionnaires.includes("SMS_CANSO_SOE") && smsQuestionnaire) {
      questionnairesInScope.push(smsQuestionnaire.id);
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { referenceNumber: demoReview.reference },
    });

    let review;
    if (existingReview) {
      review = await prisma.review.update({
        where: { referenceNumber: demoReview.reference },
        data: {
          reviewType: demoReview.reviewType,
          status: demoReview.status,
          phase: demoReview.phase,
          requestedDate: demoReview.requestedDate,
          plannedStartDate: demoReview.plannedStart,
          plannedEndDate: demoReview.plannedEnd,
          actualStartDate: demoReview.actualStart,
          actualEndDate: demoReview.actualEnd,
          questionnairesInScope,
        },
      });
    } else {
      review = await prisma.review.create({
        data: {
          referenceNumber: demoReview.reference,
          reviewType: demoReview.reviewType,
          hostOrganizationId: hostOrgId,
          status: demoReview.status,
          phase: demoReview.phase,
          requestedDate: demoReview.requestedDate,
          plannedStartDate: demoReview.plannedStart,
          plannedEndDate: demoReview.plannedEnd,
          actualStartDate: demoReview.actualStart,
          actualEndDate: demoReview.actualEnd,
          questionnairesInScope,
          objectives: `${demoReview.reviewType} peer review of ${demoReview.hostAnspCode} air navigation services covering ${demoReview.questionnaires.join(" and ")}`,
          languagePreference: "BOTH",
          primaryContactName: `Contact Person (${demoReview.hostAnspCode})`,
          primaryContactEmail: `contact@${demoReview.hostAnspCode.toLowerCase()}.example`,
        },
      });
    }

    reviewMap.set(demoReview.reference, review.id);

    // Delete existing team members to rebuild
    await prisma.reviewTeamMember.deleteMany({
      where: { reviewId: review.id },
    });

    // Add team lead from designated organization
    const teamLeadEmail = `safety@${demoReview.teamLeadOrgCode.toLowerCase()}.example`;
    let teamLeadUserId = userMap.get(teamLeadEmail);

    // If safety manager doesn't exist, use admin
    if (!teamLeadUserId) {
      const adminEmail = `admin@${demoReview.teamLeadOrgCode.toLowerCase()}.example`;
      teamLeadUserId = userMap.get(adminEmail);
    }

    // If still not found, create a reviewer user for this org
    if (!teamLeadUserId) {
      const leadOrgId = orgMap.get(demoReview.teamLeadOrgCode);
      if (leadOrgId) {
        const leadUser = await prisma.user.upsert({
          where: { email: teamLeadEmail },
          update: {},
          create: {
            email: teamLeadEmail,
            firstName: "Lead",
            lastName: `Reviewer (${demoReview.teamLeadOrgCode})`,
            title: "Lead Peer Reviewer",
            role: "LEAD_REVIEWER",
            locale: "EN",
            organizationId: leadOrgId,
            isActive: true,
          },
        });
        teamLeadUserId = leadUser.id;
        userMap.set(teamLeadEmail, teamLeadUserId);
      }
    }

    if (teamLeadUserId) {
      // Get reviewer profile if exists
      const leadReviewerProfile = await prisma.reviewerProfile.findUnique({
        where: { userId: teamLeadUserId },
      });

      await prisma.reviewTeamMember.create({
        data: {
          reviewId: review.id,
          userId: teamLeadUserId,
          reviewerProfileId: leadReviewerProfile?.id,
          role: "LEAD_REVIEWER",
          confirmedAt: ["IN_PROGRESS", "COMPLETED", "REPORT_DRAFTING"].includes(demoReview.status)
            ? new Date()
            : null,
        },
      });
    }

    // Add team members from different organizations (COI compliant)
    for (const member of demoReview.teamMembers) {
      const memberEmail = `safety@${member.orgCode.toLowerCase()}.example`;
      let memberUserId = userMap.get(memberEmail);

      // Fallback to admin
      if (!memberUserId) {
        const adminEmail = `admin@${member.orgCode.toLowerCase()}.example`;
        memberUserId = userMap.get(adminEmail);
      }

      // Create if not exists
      if (!memberUserId) {
        const memberOrgId = orgMap.get(member.orgCode);
        if (memberOrgId) {
          const memberUser = await prisma.user.upsert({
            where: { email: memberEmail },
            update: {},
            create: {
              email: memberEmail,
              firstName: member.role === "OBSERVER" ? "Observer" : "Reviewer",
              lastName: `(${member.orgCode})`,
              title: member.role === "OBSERVER" ? "Observer" : "Peer Reviewer",
              role: member.role === "OBSERVER" ? "OBSERVER" : "PEER_REVIEWER",
              locale: "EN",
              organizationId: memberOrgId,
              isActive: true,
            },
          });
          memberUserId = memberUser.id;
          userMap.set(memberEmail, memberUserId);
        }
      }

      if (memberUserId) {
        // Get reviewer profile if exists
        const reviewerProfile = await prisma.reviewerProfile.findUnique({
          where: { userId: memberUserId },
        });

        await prisma.reviewTeamMember.create({
          data: {
            reviewId: review.id,
            userId: memberUserId,
            reviewerProfileId: reviewerProfile?.id,
            role: member.role,
            confirmedAt: ["IN_PROGRESS", "COMPLETED", "REPORT_DRAFTING"].includes(demoReview.status)
              ? new Date()
              : null,
          },
        });
      }
    }

    const teamSize = 1 + demoReview.teamMembers.length;
    console.log(`  ✓ ${demoReview.reference} (${demoReview.hostAnspCode}) - ${demoReview.status} [${teamSize} team members]`);
  }

  return reviewMap;
}

async function seedFindings(
  orgMap: Map<string, string>,
  reviewMap: Map<string, string>,
  userMap: Map<string, string>
): Promise<Map<string, { findingId: string; capRequired: boolean }>> {
  console.log("\n⚠️  Seeding demo findings (15 across 5 reviews)...");
  const findingMap = new Map<string, { findingId: string; capRequired: boolean }>();

  // Build a map of PQ numbers to question IDs for linking
  const pqMap = new Map<string, string>();
  const questions = await prisma.question.findMany({
    where: { questionnaire: { type: "ANS_USOAP_CMA", isActive: true } },
    select: { id: true, pqNumber: true },
  });
  for (const q of questions) {
    if (q.pqNumber) {
      pqMap.set(q.pqNumber, q.id);
    }
  }

  // Get first question as fallback when PQ not specified
  const fallbackQuestion = questions[0];

  for (const demoFinding of DEMO_FINDINGS) {
    // Find the review this finding belongs to
    const reviewId = reviewMap.get(demoFinding.reviewRef);
    if (!reviewId) {
      console.log(`  ⚠ Review ${demoFinding.reviewRef} not found, skipping finding ${demoFinding.reference}`);
      continue;
    }

    // Get the review to find host organization
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { hostOrganizationId: true },
    });
    if (!review) continue;

    const orgId = review.hostOrganizationId;

    // Find linked question by PQ number if specified
    let questionId: string | null = null;
    if (demoFinding.pqNumber && pqMap.has(demoFinding.pqNumber)) {
      questionId = pqMap.get(demoFinding.pqNumber) || null;
    } else if (fallbackQuestion) {
      questionId = fallbackQuestion.id;
    }

    // Get host org code for user lookup
    const hostOrg = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { icaoCode: true },
    });
    const hostOrgCode = hostOrg?.icaoCode || "";

    // Get assigned user (safety manager or admin of host org)
    const safetyManagerEmail = `safety@${hostOrgCode.toLowerCase()}.example`;
    const assignedToId = userMap.get(safetyManagerEmail) || userMap.get(`admin@${hostOrgCode.toLowerCase()}.example`);

    // Calculate target close date based on severity
    // Critical: 30 days, Major: 60 days, Minor: 90 days, Observation: 120 days
    const daysToClose =
      demoFinding.severity === "CRITICAL" ? 30 :
      demoFinding.severity === "MAJOR" ? 60 :
      demoFinding.severity === "MINOR" ? 90 : 120;

    const targetCloseDate = addDays(new Date(), daysToClose);

    // For closed findings, set closedAt in the past
    const closedAt = demoFinding.status === "CLOSED"
      ? subtractDays(new Date(), 30)
      : null;

    // Check if finding already exists
    const existingFinding = await prisma.finding.findUnique({
      where: { referenceNumber: demoFinding.reference },
    });

    let finding;
    if (existingFinding) {
      finding = await prisma.finding.update({
        where: { referenceNumber: demoFinding.reference },
        data: {
          findingType: demoFinding.type,
          severity: demoFinding.severity,
          status: demoFinding.status,
          titleEn: demoFinding.titleEn,
          titleFr: demoFinding.titleFr,
          descriptionEn: demoFinding.descriptionEn,
          descriptionFr: demoFinding.descriptionFr,
          evidenceEn: demoFinding.evidenceEn,
          evidenceFr: demoFinding.evidenceFr,
          icaoReference: demoFinding.icaoReference,
          criticalElement: demoFinding.criticalElement,
          capRequired: demoFinding.capRequired,
          assignedToId,
          targetCloseDate,
          closedAt,
        },
      });
    } else {
      finding = await prisma.finding.create({
        data: {
          reviewId,
          organizationId: orgId,
          questionId,
          referenceNumber: demoFinding.reference,
          findingType: demoFinding.type,
          severity: demoFinding.severity,
          status: demoFinding.status,
          titleEn: demoFinding.titleEn,
          titleFr: demoFinding.titleFr,
          descriptionEn: demoFinding.descriptionEn,
          descriptionFr: demoFinding.descriptionFr,
          evidenceEn: demoFinding.evidenceEn,
          evidenceFr: demoFinding.evidenceFr,
          icaoReference: demoFinding.icaoReference,
          criticalElement: demoFinding.criticalElement,
          capRequired: demoFinding.capRequired,
          assignedToId,
          targetCloseDate,
          closedAt,
        },
      });
    }

    findingMap.set(demoFinding.reference, { findingId: finding.id, capRequired: demoFinding.capRequired });
    console.log(`  ✓ ${demoFinding.reference} - ${demoFinding.type} (${demoFinding.severity}) [${demoFinding.status}]`);
  }

  // Print summary by review
  const findingsByReview = new Map<string, number>();
  for (const f of DEMO_FINDINGS) {
    findingsByReview.set(f.reviewRef, (findingsByReview.get(f.reviewRef) || 0) + 1);
  }
  console.log("\n  Findings by review:");
  for (const [ref, count] of findingsByReview) {
    console.log(`    ${ref}: ${count} findings`);
  }

  return findingMap;
}

async function seedCAPs(
  findingMap: Map<string, { findingId: string; capRequired: boolean }>,
  userMap: Map<string, string>
): Promise<void> {
  console.log("\n📋 Seeding Corrective Action Plans (10 CAPs)...");
  let capCount = 0;
  let updatedCount = 0;

  // Get verifier user for verified/closed CAPs
  const verifierId = userMap.get("lead.reviewer@aaprp.org");

  for (const demoCap of DEMO_CAPS) {
    // Find the finding this CAP belongs to
    const findingData = findingMap.get(demoCap.findingRef);
    if (!findingData) {
      console.log(`  ⚠ Finding ${demoCap.findingRef} not found, skipping CAP`);
      continue;
    }

    const { findingId } = findingData;

    // Check if CAP already exists
    const existingCAP = await prisma.correctiveActionPlan.findUnique({
      where: { findingId },
    });

    // Determine if this CAP is overdue
    const isOverdue = demoCap.dueDate < new Date() &&
      !["CLOSED", "VERIFIED", "COMPLETED"].includes(demoCap.status);
    const overdueIndicator = isOverdue ? " [OVERDUE]" : "";

    if (existingCAP) {
      // Update existing CAP with new data
      await prisma.correctiveActionPlan.update({
        where: { id: existingCAP.id },
        data: {
          rootCauseEn: demoCap.rootCauseEn,
          rootCauseFr: demoCap.rootCauseFr,
          correctiveActionEn: demoCap.correctiveActionEn,
          correctiveActionFr: demoCap.correctiveActionFr,
          preventiveActionEn: demoCap.preventiveActionEn,
          preventiveActionFr: demoCap.preventiveActionFr,
          status: demoCap.status,
          dueDate: demoCap.dueDate,
          submittedAt: demoCap.submittedAt,
          acceptedAt: demoCap.acceptedAt,
          completedAt: demoCap.completedAt,
          verifiedAt: demoCap.verifiedAt,
          verificationMethod: demoCap.verificationMethod,
          verificationNotes: demoCap.verificationNotesEn,
          verifiedById: ["VERIFIED", "CLOSED"].includes(demoCap.status) ? verifierId : null,
        },
      });

      updatedCount++;
      console.log(`  ↻ Updated CAP for ${demoCap.findingRef} - ${demoCap.status}${overdueIndicator}`);
    } else {
      // Create new CAP
      await prisma.correctiveActionPlan.create({
        data: {
          findingId,
          rootCauseEn: demoCap.rootCauseEn,
          rootCauseFr: demoCap.rootCauseFr,
          correctiveActionEn: demoCap.correctiveActionEn,
          correctiveActionFr: demoCap.correctiveActionFr,
          preventiveActionEn: demoCap.preventiveActionEn,
          preventiveActionFr: demoCap.preventiveActionFr,
          status: demoCap.status,
          dueDate: demoCap.dueDate,
          submittedAt: demoCap.submittedAt,
          acceptedAt: demoCap.acceptedAt,
          completedAt: demoCap.completedAt,
          verifiedAt: demoCap.verifiedAt,
          verificationMethod: demoCap.verificationMethod,
          verificationNotes: demoCap.verificationNotesEn,
          verifiedById: ["VERIFIED", "CLOSED"].includes(demoCap.status) ? verifierId : null,
        },
      });

      capCount++;
      console.log(`  ✓ Created CAP for ${demoCap.findingRef} - ${demoCap.status}${overdueIndicator}`);
    }
  }

  // Print summary by status
  const statusCounts = new Map<string, number>();
  for (const cap of DEMO_CAPS) {
    statusCounts.set(cap.status, (statusCounts.get(cap.status) || 0) + 1);
  }

  console.log("\n  CAPs by status:");
  for (const [status, count] of statusCounts) {
    console.log(`    ${status}: ${count}`);
  }

  // Identify overdue CAPs
  const overdueCaps = DEMO_CAPS.filter(
    cap => cap.dueDate < new Date() && !["CLOSED", "VERIFIED", "COMPLETED"].includes(cap.status)
  );
  if (overdueCaps.length > 0) {
    console.log(`\n  ⚠ Overdue CAPs: ${overdueCaps.length}`);
    for (const cap of overdueCaps) {
      const daysOverdue = Math.floor((Date.now() - cap.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`    - ${cap.findingRef}: ${daysOverdue} days overdue`);
    }
  }

  console.log(`\n  Summary: ${capCount} created, ${updatedCount} updated`);
}

async function seedReviewAssessments(
  reviewMap: Map<string, string>
): Promise<void> {
  console.log("\n📝 Seeding review assessment responses...");

  // Get questionnaires with questions
  const ansQuestionnaire = await prisma.questionnaire.findFirst({
    where: { type: "ANS_USOAP_CMA", isActive: true },
    include: {
      questions: {
        select: { id: true, pqNumber: true, auditArea: true, criticalElement: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const smsQuestionnaire = await prisma.questionnaire.findFirst({
    where: { type: "SMS_CANSO_SOE", isActive: true },
    include: {
      questions: {
        select: { id: true, pqNumber: true, studyArea: true, smsComponent: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!ansQuestionnaire || !smsQuestionnaire) {
    console.log("  ⚠ Questionnaires not found. Run db:seed first.");
    return;
  }

  // Build maps for quick question lookup
  const ansQuestionMap = new Map<string, string>();
  for (const q of ansQuestionnaire.questions) {
    if (q.pqNumber) {
      ansQuestionMap.set(q.pqNumber, q.id);
    }
  }

  const smsQuestionMap = new Map<string, string>();
  for (const q of smsQuestionnaire.questions) {
    if (q.studyArea) {
      // Map by study area (may have multiple questions per study area)
      smsQuestionMap.set(q.studyArea, q.id);
    }
  }

  let totalAssessments = 0;
  let totalResponses = 0;

  for (const assessmentDef of DEMO_REVIEW_ASSESSMENTS) {
    const reviewId = reviewMap.get(assessmentDef.reviewRef);
    if (!reviewId) {
      console.log(`  ⚠ Review ${assessmentDef.reviewRef} not found, skipping assessment`);
      continue;
    }

    // Get review to find host organization
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { hostOrganizationId: true, hostOrganization: { select: { icaoCode: true } } },
    });
    if (!review) continue;

    const questionnaire = assessmentDef.questionnaireType === "ANS_USOAP_CMA"
      ? ansQuestionnaire
      : smsQuestionnaire;

    const isANS = assessmentDef.questionnaireType === "ANS_USOAP_CMA";

    // Generate reference number
    const refNumber = `ASS-${review.hostOrganization.icaoCode}-${isANS ? "ANS" : "SMS"}-${assessmentDef.reviewRef.split("-")[1]}`;

    // Check if assessment exists
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        reviewId,
        questionnaireId: questionnaire.id,
        type: assessmentDef.type,
      },
    });

    let assessment;
    if (existingAssessment) {
      assessment = await prisma.assessment.update({
        where: { id: existingAssessment.id },
        data: {
          status: assessmentDef.status,
          progress: 100,
          completedAt: assessmentDef.completedAt,
        },
      });
      console.log(`  ↻ Updated ${isANS ? "ANS" : "SMS"} assessment for ${assessmentDef.reviewRef}`);
    } else {
      assessment = await prisma.assessment.create({
        data: {
          referenceNumber: refNumber,
          type: assessmentDef.type,
          title: `${assessmentDef.type.replace(/_/g, " ")} - ${review.hostOrganization.icaoCode} ${isANS ? "ANS" : "SMS"} Assessment`,
          description: `Peer review assessment using ${questionnaire.titleEn}`,
          questionnaireId: questionnaire.id,
          organizationId: review.hostOrganizationId,
          reviewId,
          status: assessmentDef.status,
          progress: 100,
          startedAt: subtractDays(assessmentDef.completedAt, 14),
          submittedAt: subtractDays(assessmentDef.completedAt, 2),
          completedAt: assessmentDef.completedAt,
        },
      });
      console.log(`  ✓ Created ${isANS ? "ANS" : "SMS"} assessment for ${assessmentDef.reviewRef}`);
    }

    totalAssessments++;

    // Delete existing responses for this assessment to recreate
    await prisma.assessmentResponse.deleteMany({
      where: { assessmentId: assessment.id },
    });

    // Create responses based on questionnaire type
    if (isANS) {
      // Create ANS responses
      let satCount = 0;
      let notSatCount = 0;
      let naCount = 0;

      for (const respData of DEMO_ANS_RESPONSES) {
        const questionId = ansQuestionMap.get(respData.pqNumber);
        if (!questionId) {
          // Try to find by partial match
          const matchingPq = Array.from(ansQuestionMap.keys()).find(pq => pq.includes(respData.pqNumber.split("-").pop() || ""));
          if (!matchingPq) {
            console.log(`    ⚠ Question ${respData.pqNumber} not found, skipping`);
            continue;
          }
        }

        // Build notes with finding reference if applicable
        let notes = respData.notesEn;
        if (respData.linkedFindingRef) {
          notes = `${notes} [Finding: ${respData.linkedFindingRef}]`;
        }

        // Find actual question ID from the questionnaire questions
        const actualQuestion = ansQuestionnaire.questions.find(q =>
          q.pqNumber === respData.pqNumber ||
          q.pqNumber?.includes(respData.pqNumber.split("-").pop() || "__none__")
        );

        if (!actualQuestion) {
          // Use a default question from the questionnaire
          const defaultQ = ansQuestionnaire.questions[DEMO_ANS_RESPONSES.indexOf(respData) % ansQuestionnaire.questions.length];
          await prisma.assessmentResponse.create({
            data: {
              assessmentId: assessment.id,
              questionId: defaultQ.id,
              responseValue: respData.response,
              notes,
              respondedAt: assessmentDef.completedAt,
            },
          });
        } else {
          await prisma.assessmentResponse.create({
            data: {
              assessmentId: assessment.id,
              questionId: actualQuestion.id,
              responseValue: respData.response,
              notes,
              respondedAt: assessmentDef.completedAt,
            },
          });
        }

        // Count response types for EI calculation
        if (respData.response === "SATISFACTORY") satCount++;
        else if (respData.response === "NOT_SATISFACTORY") notSatCount++;
        else naCount++;

        totalResponses++;
      }

      // Calculate and update EI score
      const applicable = satCount + notSatCount;
      const eiScore = applicable > 0 ? Math.round((satCount / applicable) * 100 * 100) / 100 : 0;

      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          eiScore,
          overallScore: eiScore,
        },
      });

      console.log(`    - ${DEMO_ANS_RESPONSES.length} responses: ${satCount} SAT, ${notSatCount} NOT_SAT, ${naCount} N/A`);
      console.log(`    - EI Score: ${eiScore}%`);
    } else {
      // Create SMS responses
      const levelScores: Record<MaturityLevel, number> = {
        LEVEL_A: 1,
        LEVEL_B: 2,
        LEVEL_C: 3,
        LEVEL_D: 4,
        LEVEL_E: 5,
      };

      const levelCounts: Record<string, number> = {
        LEVEL_A: 0,
        LEVEL_B: 0,
        LEVEL_C: 0,
        LEVEL_D: 0,
        LEVEL_E: 0,
      };

      let totalScore = 0;
      let responseIdx = 0;

      for (const respData of DEMO_SMS_RESPONSES) {
        // Find question by study area or use sequential question
        const actualQuestion = smsQuestionnaire.questions.find(q =>
          q.studyArea === respData.studyArea
        ) || smsQuestionnaire.questions[responseIdx % smsQuestionnaire.questions.length];

        await prisma.assessmentResponse.create({
          data: {
            assessmentId: assessment.id,
            questionId: actualQuestion.id,
            maturityLevel: respData.maturityLevel,
            score: levelScores[respData.maturityLevel],
            notes: respData.notesEn,
            respondedAt: assessmentDef.completedAt,
          },
        });

        levelCounts[respData.maturityLevel]++;
        totalScore += levelScores[respData.maturityLevel];
        totalResponses++;
        responseIdx++;
      }

      // Calculate average maturity level
      const avgScore = DEMO_SMS_RESPONSES.length > 0 ? totalScore / DEMO_SMS_RESPONSES.length : 0;
      const overallScore = Math.round((avgScore / 5) * 100);

      // Determine overall maturity level
      const getLevel = (score: number): MaturityLevel => {
        if (score >= 4.5) return "LEVEL_E";
        if (score >= 3.5) return "LEVEL_D";
        if (score >= 2.5) return "LEVEL_C";
        if (score >= 1.5) return "LEVEL_B";
        return "LEVEL_A";
      };

      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          maturityLevel: getLevel(avgScore),
          overallScore,
        },
      });

      console.log(`    - ${DEMO_SMS_RESPONSES.length} responses: A=${levelCounts.LEVEL_A}, B=${levelCounts.LEVEL_B}, C=${levelCounts.LEVEL_C}, D=${levelCounts.LEVEL_D}, E=${levelCounts.LEVEL_E}`);
      console.log(`    - Overall Maturity: ${getLevel(avgScore)} (Score: ${overallScore}%)`);
    }
  }

  console.log(`\n  Summary: ${totalAssessments} assessments, ${totalResponses} responses`);
}

async function seedAssessments(
  orgMap: Map<string, string>,
  userMap: Map<string, string>,
  reviewMap: Map<string, string>
): Promise<void> {
  console.log("\n📊 Seeding assessments...");

  // Get questionnaires
  const ansQuestionnaire = await prisma.questionnaire.findFirst({
    where: { type: "ANS_USOAP_CMA", isActive: true },
    include: { questions: { select: { id: true } } },
  });

  const smsQuestionnaire = await prisma.questionnaire.findFirst({
    where: { type: "SMS_CANSO_SOE", isActive: true },
    include: { questions: { select: { id: true } } },
  });

  if (!ansQuestionnaire || !smsQuestionnaire) {
    console.log("  ⚠ Questionnaires not found. Run db:seed first.");
    return;
  }

  console.log(`  Found ANS questionnaire with ${ansQuestionnaire.questions.length} questions`);
  console.log(`  Found SMS questionnaire with ${smsQuestionnaire.questions.length} questions`);

  // Assessment scenarios
  interface AssessmentScenario {
    orgCode: string;
    type: AssessmentType;
    questionnaireType: QuestionnaireType;
    status: AssessmentStatus;
    progress: number;
    responseDistribution?: {
      satisfactory?: number;
      notSatisfactory?: number;
      notApplicable?: number;
    } | {
      A?: number;
      B?: number;
      C?: number;
      D?: number;
      E?: number;
    };
    daysAgo: number;
    dueInDays?: number;
    linkedReviewCode?: string;
  }

  const scenarios: AssessmentScenario[] = [
    // Completed assessments linked to reviews
    {
      orgCode: "ASECNA",
      type: "PEER_REVIEW",
      questionnaireType: "ANS_USOAP_CMA",
      status: "COMPLETED",
      progress: 100,
      responseDistribution: { satisfactory: 85, notSatisfactory: 10, notApplicable: 5 },
      daysAgo: 180,
      linkedReviewCode: "REV2024-001",
    },
    {
      orgCode: "NAMA",
      type: "PEER_REVIEW",
      questionnaireType: "ANS_USOAP_CMA",
      status: "COMPLETED",
      progress: 100,
      responseDistribution: { satisfactory: 75, notSatisfactory: 20, notApplicable: 5 },
      daysAgo: 60,
      linkedReviewCode: "REV2024-002",
    },
    // Self-assessments
    {
      orgCode: "KCAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "ANS_USOAP_CMA",
      status: "SUBMITTED",
      progress: 100,
      responseDistribution: { satisfactory: 80, notSatisfactory: 15, notApplicable: 5 },
      daysAgo: 30,
    },
    {
      orgCode: "SACAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "SMS_CANSO_SOE",
      status: "UNDER_REVIEW",
      progress: 100,
      responseDistribution: { A: 5, B: 10, C: 35, D: 40, E: 10 },
      daysAgo: 20,
    },
    {
      orgCode: "ECAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "ANS_USOAP_CMA",
      status: "DRAFT",
      progress: 75,
      responseDistribution: { satisfactory: 70, notSatisfactory: 25, notApplicable: 5 },
      daysAgo: 14,
      dueInDays: 30,
    },
    {
      orgCode: "TCAA",
      type: "GAP_ANALYSIS",
      questionnaireType: "SMS_CANSO_SOE",
      status: "DRAFT",
      progress: 45,
      responseDistribution: { A: 10, B: 20, C: 40, D: 25, E: 5 },
      daysAgo: 10,
      dueInDays: 45,
    },
    {
      orgCode: "GCAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "ANS_USOAP_CMA",
      status: "DRAFT",
      progress: 25,
      responseDistribution: { satisfactory: 60, notSatisfactory: 30, notApplicable: 10 },
      daysAgo: 7,
      dueInDays: 60,
    },
    {
      orgCode: "UCAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "SMS_CANSO_SOE",
      status: "DRAFT",
      progress: 10,
      daysAgo: 3,
      dueInDays: 90,
    },
  ];

  let assessmentCount = 0;
  let responseCount = 0;

  for (const scenario of scenarios) {
    const orgId = orgMap.get(scenario.orgCode);
    if (!orgId) {
      console.log(`  ⚠ Organization ${scenario.orgCode} not found, skipping`);
      continue;
    }

    const questionnaire = scenario.questionnaireType === "ANS_USOAP_CMA"
      ? ansQuestionnaire
      : smsQuestionnaire;

    const createdAt = subtractDays(new Date(), scenario.daysAgo);
    const dueDate = scenario.dueInDays
      ? addDays(new Date(), scenario.dueInDays)
      : null;

    const reviewId = scenario.linkedReviewCode
      ? reviewMap.get(scenario.linkedReviewCode)
      : null;

    // Generate unique reference number
    const refNumber = `ASS-${scenario.orgCode}-${scenario.questionnaireType === "ANS_USOAP_CMA" ? "ANS" : "SMS"}-${new Date().getFullYear()}`;

    // Check if assessment exists
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        organizationId: orgId,
        questionnaireId: questionnaire.id,
        type: scenario.type,
      },
    });

    let assessment;
    if (existingAssessment) {
      assessment = await prisma.assessment.update({
        where: { id: existingAssessment.id },
        data: {
          status: scenario.status,
          progress: scenario.progress,
          dueDate,
          reviewId,
        },
      });
    } else {
      assessment = await prisma.assessment.create({
        data: {
          referenceNumber: refNumber,
          type: scenario.type,
          title: `${scenario.type.replace(/_/g, " ")} - ${scenario.orgCode} ${questionnaire.type === "ANS_USOAP_CMA" ? "ANS" : "SMS"} ${new Date().getFullYear()}`,
          description: `${scenario.type.replace(/_/g, " ")} using ${questionnaire.titleEn}`,
          questionnaireId: questionnaire.id,
          organizationId: orgId,
          status: scenario.status,
          progress: scenario.progress,
          startedAt: createdAt,
          submittedAt: ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(scenario.status)
            ? addDays(createdAt, 7)
            : null,
          completedAt: scenario.status === "COMPLETED"
            ? addDays(createdAt, 14)
            : null,
          dueDate,
          reviewId,
          createdAt,
        },
      });
    }

    assessmentCount++;

    // Delete existing responses for this assessment
    await prisma.assessmentResponse.deleteMany({
      where: { assessmentId: assessment.id },
    });

    // Create responses
    const totalQuestions = questionnaire.questions.length;
    const questionsToAnswer = Math.floor((scenario.progress / 100) * totalQuestions);

    for (let i = 0; i < totalQuestions; i++) {
      const question = questionnaire.questions[i];
      const isAnswered = i < questionsToAnswer;

      if (questionnaire.type === "ANS_USOAP_CMA") {
        const responseValue = isAnswered
          ? generateANSResponse(i, scenario.responseDistribution as { satisfactory: number; notSatisfactory: number; notApplicable: number })
          : null;

        await prisma.assessmentResponse.create({
          data: {
            assessmentId: assessment.id,
            questionId: question.id,
            responseValue,
            notes: isAnswered && i % 5 === 0 ? `Evidence note for question ${i + 1}` : null,
            respondedAt: isAnswered ? createdAt : null,
          },
        });
      } else {
        const maturityLevel = isAnswered
          ? generateSMSMaturityLevel(i, scenario.responseDistribution as { A: number; B: number; C: number; D: number; E: number })
          : null;

        const scoreMap: Record<MaturityLevel, number> = {
          LEVEL_A: 1,
          LEVEL_B: 2,
          LEVEL_C: 3,
          LEVEL_D: 4,
          LEVEL_E: 5,
        };

        await prisma.assessmentResponse.create({
          data: {
            assessmentId: assessment.id,
            questionId: question.id,
            maturityLevel,
            score: maturityLevel ? scoreMap[maturityLevel] : null,
            notes: isAnswered && i % 5 === 0 ? `Evidence note for question ${i + 1}` : null,
            respondedAt: isAnswered ? createdAt : null,
          },
        });
      }

      responseCount++;
    }

    // Update scores for completed assessments
    if (scenario.progress === 100 && ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(scenario.status)) {
      const responses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: assessment.id },
      });

      if (questionnaire.type === "ANS_USOAP_CMA") {
        const satisfactory = responses.filter(r => r.responseValue === "SATISFACTORY").length;
        const notSatisfactory = responses.filter(r => r.responseValue === "NOT_SATISFACTORY").length;
        const applicable = satisfactory + notSatisfactory;
        const eiScore = applicable > 0 ? Math.round((satisfactory / applicable) * 100 * 100) / 100 : 0;

        await prisma.assessment.update({
          where: { id: assessment.id },
          data: { eiScore, overallScore: eiScore },
        });
      } else {
        const scoredResponses = responses.filter(r => r.maturityLevel !== null);
        const totalScore = scoredResponses.reduce((sum, r) => sum + (r.score ?? 0), 0);
        const avgScore = scoredResponses.length > 0 ? totalScore / scoredResponses.length : 0;
        const overallScore = Math.round((avgScore / 5) * 100);

        const getLevel = (score: number): MaturityLevel => {
          if (score >= 4.5) return "LEVEL_E";
          if (score >= 3.5) return "LEVEL_D";
          if (score >= 2.5) return "LEVEL_C";
          if (score >= 1.5) return "LEVEL_B";
          return "LEVEL_A";
        };

        await prisma.assessment.update({
          where: { id: assessment.id },
          data: { maturityLevel: getLevel(avgScore), overallScore },
        });
      }
    }

    console.log(`  ✓ ${scenario.orgCode} ${scenario.questionnaireType === "ANS_USOAP_CMA" ? "ANS" : "SMS"} - ${scenario.status} (${scenario.progress}%)`);
  }

  console.log(`\n  Summary: ${assessmentCount} assessments, ${responseCount} responses`);
}

async function seedAuditLogs(userMap: Map<string, string>): Promise<void> {
  console.log("\n📝 Seeding audit logs...");

  const adminUserId = userMap.get("admin@aaprp.org");
  if (!adminUserId) {
    console.log("  ⚠ Admin user not found, skipping audit logs");
    return;
  }

  const assessments = await prisma.assessment.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  const reviews = await prisma.review.findMany({ take: 3, orderBy: { createdAt: "desc" } });
  const findings = await prisma.finding.findMany({ take: 5, orderBy: { createdAt: "desc" } });

  let logCount = 0;

  for (const assessment of assessments) {
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: "VIEW",
        entityType: "Assessment",
        entityId: assessment.id,
        createdAt: new Date(),
      },
    });
    logCount++;
  }

  for (const review of reviews) {
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: "VIEW",
        entityType: "Review",
        entityId: review.id,
        createdAt: new Date(),
      },
    });
    logCount++;
  }

  for (const finding of findings) {
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: "VIEW",
        entityType: "Finding",
        entityId: finding.id,
        createdAt: new Date(),
      },
    });
    logCount++;
  }

  console.log(`  ✓ Created ${logCount} audit log entries`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("🚀 Starting demo data seed for training (Feb 2-5, 2025)...");
  console.log("═".repeat(60));

  try {
    // 1. Seed organizations
    const orgMap = await seedOrganizations();
    console.log(`\n  Total organizations: ${orgMap.size}`);

    // 2. Seed users
    const userMap = await seedUsers(orgMap);
    console.log(`\n  Total users: ${userMap.size}`);

    // 3. Seed reviews
    const reviewMap = await seedReviews(orgMap, userMap);
    console.log(`\n  Total reviews: ${reviewMap.size}`);

    // 4. Seed findings
    const findingMap = await seedFindings(orgMap, reviewMap, userMap);
    console.log(`\n  Total findings: ${findingMap.size}`);

    // 5. Seed CAPs
    await seedCAPs(findingMap, userMap);

    // 6. Seed review assessments (linked to completed reviews)
    await seedReviewAssessments(reviewMap);

    // 7. Seed additional assessments (self-assessments, gap analyses)
    await seedAssessments(orgMap, userMap, reviewMap);

    // 8. Seed audit logs
    await seedAuditLogs(userMap);

    console.log("\n═".repeat(60));
    console.log("✅ Demo data seed completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  • ${orgMap.size} African ANSPs`);
    console.log(`  • ${userMap.size} users (programme staff + org users)`);
    console.log(`  • ${reviewMap.size} peer reviews in various stages`);
    console.log(`  • ${findingMap.size} findings with CAPs`);
    console.log(`  • Multiple assessments with realistic responses`);

    console.log("\n🔑 Test Accounts:");
    console.log("  Programme Staff:");
    console.log("    • admin@aaprp.org (Super Admin)");
    console.log("    • coordinator@aaprp.org (Programme Coordinator)");
    console.log("    • lead.reviewer@aaprp.org (Lead Reviewer)");
    console.log("    • steering@aaprp.org (Steering Committee)");
    console.log("\n  Organization Admins:");
    console.log("    • admin@asecna.example (ASECNA)");
    console.log("    • admin@nama.example (NAMA)");
    console.log("    • admin@kcaa.example (KCAA)");
    console.log("    • admin@tcaa.example (TCAA)");
    console.log("    • admin@gcaa.example (GCAA)");
    console.log("    • admin@onda.example (ONDA)");

    console.log("\n📅 Demo Reviews - 5 Regional Teams:");
    console.log("  ┌─────────────────┬──────────────┬─────────────────┬───────────────┐");
    console.log("  │ Review          │ Host ANSP    │ Team Lead       │ Status        │");
    console.log("  ├─────────────────┼──────────────┼─────────────────┼───────────────┤");
    console.log("  │ REV-2026-001    │ KCAA (Kenya) │ ATNS reviewer   │ COMPLETED     │");
    console.log("  │ REV-2026-002    │ TCAA (TZ)    │ ASECNA reviewer │ IN_PROGRESS   │");
    console.log("  │ REV-2026-003    │ NAMA (NG)    │ ONDA reviewer   │ PLANNING      │");
    console.log("  │ REV-2026-004    │ GCAA (GH)    │ KCAA reviewer   │ APPROVED      │");
    console.log("  │ REV-2026-005    │ ONDA (MA)    │ NAMA reviewer   │ REQUESTED     │");
    console.log("  └─────────────────┴──────────────┴─────────────────┴───────────────┘");

    console.log("\n📋 Questionnaires in Scope:");
    console.log("  • REV-2026-001, 002, 005: ANS_USOAP_CMA + SMS_CANSO_SOE (Full)");
    console.log("  • REV-2026-003: ANS_USOAP_CMA only");
    console.log("  • REV-2026-004: SMS_CANSO_SOE only (Focused)");

    console.log("\n⚠️  Demo Findings (15 across reviews):");
    console.log("  ┌─────────────────┬────────┬────────────────┬───────────────┐");
    console.log("  │ Review          │ Count  │ Types          │ CAPs Required │");
    console.log("  ├─────────────────┼────────┼────────────────┼───────────────┤");
    console.log("  │ REV-2026-001    │ 3      │ NC, OBS, CON   │ 2             │");
    console.log("  │ REV-2026-002    │ 5      │ NC, CON, OBS   │ 3             │");
    console.log("  │ REV-2026-003    │ 3      │ NC, CON, OBS   │ 2             │");
    console.log("  │ REV-2026-004    │ 2      │ NC, CON        │ 2             │");
    console.log("  │ REV-2026-005    │ 2      │ CON, OBS       │ 1             │");
    console.log("  └─────────────────┴────────┴────────────────┴───────────────┘");

    console.log("\n📋 Demo CAPs (10 total):");
    console.log("  ┌─────────────────┬───────────────┬────────────┬─────────┐");
    console.log("  │ Finding         │ Status        │ Due Date   │ Overdue │");
    console.log("  ├─────────────────┼───────────────┼────────────┼─────────┤");
    console.log("  │ FND-REV001-001  │ CLOSED        │ 2025-12-15 │ No      │");
    console.log("  │ FND-REV001-003  │ VERIFIED      │ 2026-01-10 │ No      │");
    console.log("  │ FND-REV002-001  │ SUBMITTED     │ 2026-02-15 │ No      │");
    console.log("  │ FND-REV002-002  │ ACCEPTED      │ 2026-02-20 │ No      │");
    console.log("  │ FND-REV002-003  │ IN_PROGRESS   │ 2026-01-10 │ Yes     │");
    console.log("  │ FND-REV003-001  │ DRAFT         │ 2026-03-15 │ No      │");
    console.log("  │ FND-REV003-002  │ DRAFT         │ 2026-03-20 │ No      │");
    console.log("  │ FND-REV004-001  │ DRAFT         │ 2026-04-15 │ No      │");
    console.log("  │ FND-REV004-002  │ DRAFT         │ 2026-04-30 │ No      │");
    console.log("  │ FND-REV005-001  │ DRAFT         │ 2026-05-15 │ No      │");
    console.log("  └─────────────────┴───────────────┴────────────┴─────────┘");

    console.log("\n📝 Review Assessment Responses (REV-2026-001 KCAA):");
    console.log("  ┌────────────────────┬────────────┬───────────────────────────┐");
    console.log("  │ Questionnaire      │ Responses  │ Score                     │");
    console.log("  ├────────────────────┼────────────┼───────────────────────────┤");
    console.log("  │ ANS USOAP CMA      │ 30         │ EI: ~90% (27 SAT, 3 N/S)  │");
    console.log("  │ SMS CANSO SoE      │ 20         │ Maturity: C (~54%)        │");
    console.log("  └────────────────────┴────────────┴───────────────────────────┘");
    console.log("  • ANS responses span CE-3 through CE-8");
    console.log("  • SMS responses cover all 4 components (20 study areas)");
    console.log("  • NOT_SATISFACTORY responses linked to findings");

  } catch (error) {
    console.error("\n❌ Demo data seed failed:", error);
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
    await pool.end();
  });
