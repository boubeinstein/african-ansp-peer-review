/**
 * AAPRP ANS Questionnaire Re-Seed Script
 *
 * Replaces the CE-based ANS questionnaire structure (ANS-CE1...CE8) with the
 * AAPRP review area structure (ATM, IFPD, AIS, CHART, CNS, MET, SAR).
 *
 * Source: PQs from parsed ICAO USOAP CMA ANS audit area data, reorganized
 * by AAPRP review area per the Programme Manual Section 1.6.
 *
 * Run: npm run db:reseed:ans
 *   or: npx tsx scripts/seed-ans-questionnaire.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { ANSReviewArea } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// PQ-TO-REVIEW-AREA CLASSIFICATION
// =============================================================================

/**
 * Static mapping of ICAO PQ numbers to AAPRP review areas.
 * Classified by content analysis of question text, guidance, and ICAO references.
 *
 * Source PQ format: "7.xxx" (ICAO USOAP CMA ANS audit area)
 * Target: AAPRP ANSReviewArea enum values
 */
const PQ_REVIEW_AREA_MAP: Record<string, ANSReviewArea> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // ATS — Air Traffic Management (ATM)
  // Cross-cutting ANS oversight + ATS-specific + ATS SMS
  // ═══════════════════════════════════════════════════════════════════════════
  // Cross-cutting ANS oversight (assigned to ATS as primary area)
  "7.001": "ATS", // Aviation legislation, Annex 2 (Rules of the Air)
  "7.003": "ATS", // Primary aviation legislation for ANS provision
  "7.007": "ATS", // ANS provision, distress, interception
  "7.009": "ATS", // ANS regulations transposing ICAO Annexes
  "7.011": "ATS", // Amending ANS regulations
  "7.031": "ATS", // Organizational structure for ANS oversight
  "7.037": "ATS", // Procedures for ANS inspectors
  "7.039": "ATS", // ICAO documents for ANS inspectorate
  "7.045": "ATS", // ANS inspector credentials
  "7.051": "ATS", // Separation of regulatory/service provision
  "7.073": "ATS", // ANS inspectorate training records
  // ATS-specific oversight
  "7.057": "ATS", // ATS inspectors qualifications
  "7.060": "ATS", // ATS qualification requirements met
  "7.061": "ATS", // ATS inspectorate human resources
  "7.062": "ATS", // ATS authority designated
  "7.063": "ATS", // ATC license and ratings
  "7.065": "ATS", // ATS training programme
  "7.069": "ATS", // ATS inspectors training implemented
  "7.081": "ATS", // ATC capacity assessment
  "7.082": "ATS", // Air traffic flow management (ATFM)
  "7.087": "ATS", // ATS personnel competency
  // ATS operations
  "7.101": "ATS", // ATS recording and retention
  "7.109": "ATS", // Performance-based navigation (PBN)
  "7.110": "ATS", // ATS routes and significant points
  "7.111": "ATS", // Separation minima (PANS-ATM)
  "7.117": "ATS", // Radar separation minima
  "7.119": "ATS", // Standard phraseology and readback
  "7.121": "ATS", // Movement control on manoeuvring area
  "7.131": "ATS", // ATS coordination arrangements
  "7.133": "ATS", // Types of ATS and areas of responsibility
  "7.135": "ATS", // ATS operational procedures
  "7.137": "ATS", // Flight plan processing
  "7.139": "ATS", // MET information to ATS units
  "7.151": "ATS", // Service to aircraft in emergencies
  "7.153": "ATS", // ATS contingency plans
  "7.155": "ATS", // Assistance to aircraft in distress
  "7.158": "ATS", // Air-ground radio communication
  "7.159": "ATS", // ATC contingency procedures
  "7.162": "ATS", // Data link services
  "7.177": "ATS", // Safety assessment for ATS changes
  "7.187": "ATS", // Safety-related reports review
  "7.191": "ATS", // ATS fatigue management regulations
  "7.193": "ATS", // ATS surveillance programme
  "7.195": "ATS", // ATS fatigue management compliance
  "7.199": "ATS", // ATS deficiency elimination
  // ATS SMS (7.900 series)
  "7.901": "ATS", // ATS providers SMS regulations
  "7.905": "ATS", // ATS SMS personnel surveillance
  "7.909": "ATS", // ATS SMS guidance material
  "7.913": "ATS", // ATS provider SMS acceptance
  "7.917": "ATS", // ATS SMS continuous surveillance
  "7.921": "ATS", // ATS individual SMS acceptance
  "7.925": "ATS", // ATS hazard identification and risk assessment
  "7.929": "ATS", // ATS safety performance indicators
  "7.933": "ATS", // ATS safety performance monitoring
  "7.937": "ATS", // ATS SMS personnel qualification
  "7.941": "ATS", // ATS safety promotion

  // ═══════════════════════════════════════════════════════════════════════════
  // FPD — Instrument Flight Procedure Design (IFPD)
  // ═══════════════════════════════════════════════════════════════════════════
  "7.205": "FPD", // Flight procedures inspectors qualifications
  "7.209": "FPD", // Flight procedures inspectorate resources
  "7.211": "FPD", // Flight procedures inspector training
  "7.231": "FPD", // Flight procedures design service providers
  "7.233": "FPD", // FPD deficiency elimination
  "7.234": "FPD", // IFP periodic review and validation
  "7.243": "FPD", // Flight procedure designers competency
  "7.247": "FPD", // QMS for IFP design stages
  "7.249": "FPD", // IFPDS OCA/H publication
  "7.253": "FPD", // Flight procedures approval
  "7.267": "FPD", // IFPDS documentation retention
  "7.390": "FPD", // IFP designed per ICAO provisions

  // ═══════════════════════════════════════════════════════════════════════════
  // AIS — Aeronautical Information Services
  // ═══════════════════════════════════════════════════════════════════════════
  "7.005": "AIS", // AIS legislation/regulations
  "7.042": "AIS", // AIS personnel qualification and training
  "7.085": "AIS", // AIS quality management system
  "7.201": "AIS", // Integrated aeronautical information package
  "7.215": "AIS", // NOTAM origination and issuance
  "7.229": "AIS", // Electronic terrain data
  "7.255": "AIS", // AIRAC cycle usage
  "7.269": "AIS", // AIS inspectorate human resources
  "7.273": "AIS", // AIS inspectors qualifications
  "7.277": "AIS", // AIS inspector training programme
  "7.281": "AIS", // AIS training implemented
  "7.287": "AIS", // AIS surveillance programme
  "7.288": "AIS", // AIS authority established
  "7.289": "AIS", // AIS deficiency elimination
  "7.291": "AIS", // AIS data originator arrangements
  "7.309": "AIS", // AIS and cartographic personnel (shared with MAP)

  // ═══════════════════════════════════════════════════════════════════════════
  // MAP — Aeronautical Charts
  // Note: Most chart-related PQs in the ICAO source are grouped with AIS.
  // The AAPRP CHART category covers Annex 4 specific requirements.
  // Placeholder PQs will be created for this category.
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // CNS — Communications, Navigation, Surveillance
  // ═══════════════════════════════════════════════════════════════════════════
  "7.303": "CNS", // Communication services provision
  "7.311": "CNS", // Navigation services provision
  "7.321": "CNS", // Surveillance services provision
  "7.361": "CNS", // CNS equipment maintenance
  "7.373": "CNS", // CNS inspectorate resources
  "7.377": "CNS", // CNS inspectors qualifications
  "7.381": "CNS", // CNS inspector training programme
  "7.385": "CNS", // CNS training implemented
  "7.391": "CNS", // CNS entity designation
  "7.393": "CNS", // Flight inspection requirements
  "7.395": "CNS", // Flight inspection periodical

  // ═══════════════════════════════════════════════════════════════════════════
  // MET — Aeronautical Meteorology
  // ═══════════════════════════════════════════════════════════════════════════
  "7.412": "MET", // MET service provider designation
  "7.415": "MET", // ATS-MET authority agreement
  "7.417": "MET", // MET inspectorate resources
  "7.421": "MET", // MET inspectors qualifications
  "7.425": "MET", // MET inspector training programme
  "7.429": "MET", // MET services provision requirements
  "7.435": "MET", // MET surveillance programme
  "7.437": "MET", // MET deficiency elimination
  "7.451": "MET", // Aerodrome meteorological observations
  "7.459": "MET", // MET quality management
  "7.463": "MET", // Special air-reports and volcanic ash
  "7.465": "MET", // Wind shear warnings
  "7.467": "MET", // Aerodrome forecasts (TAF)
  "7.475": "MET", // Special observation criteria
  "7.476": "MET", // MET service requirements
  "7.477": "MET", // SIGMET information
  "7.481": "MET", // MET personnel WMO requirements

  // ═══════════════════════════════════════════════════════════════════════════
  // SAR — Search and Rescue
  // ═══════════════════════════════════════════════════════════════════════════
  "7.487": "SAR", // SAR inspectorate resources
  "7.491": "SAR", // SAR inspector qualifications
  "7.495": "SAR", // SAR inspector training programme
  "7.499": "SAR", // SAR training implemented
  "7.505": "SAR", // SAR surveillance programme
  "7.507": "SAR", // SAR deficiency elimination
  "7.513": "SAR", // RCC/RSC establishment
  "7.517": "SAR", // SAR coordination with neighbours
  "7.519": "SAR", // SAR services provision requirements
  "7.521": "SAR", // Entry of foreign SAR units
  "7.525": "SAR", // COSPAS-SARSAT point of contact
  "7.529": "SAR", // RCC/RSC personnel requirements
  "7.537": "SAR", // RCC/RSC communication equipment
  "7.543": "SAR", // RCC detailed operational plans
  "7.545": "SAR", // SAR personnel training and exercises
};

// =============================================================================
// CATEGORY DEFINITIONS
// =============================================================================

interface CategoryDef {
  code: string;
  nameEn: string;
  nameFr: string;
  descriptionEn: string;
  descriptionFr: string;
  reviewArea: ANSReviewArea;
  sortOrder: number;
}

const CATEGORIES: CategoryDef[] = [
  {
    code: "ATM",
    nameEn: "Air Traffic Management",
    nameFr: "Gestion du trafic aérien",
    descriptionEn: "Air traffic control, flow management, airspace management, and ATS safety oversight",
    descriptionFr: "Contrôle de la circulation aérienne, gestion des flux, gestion de l'espace aérien et supervision de la sécurité des services ATS",
    reviewArea: "ATS",
    sortOrder: 1,
  },
  {
    code: "IFPD",
    nameEn: "Instrument Flight Procedure Design",
    nameFr: "Conception des procédures de vol aux instruments",
    descriptionEn: "Design, validation, and maintenance of instrument flight procedures including PANS-OPS compliance",
    descriptionFr: "Conception, validation et maintenance des procédures de vol aux instruments, y compris la conformité PANS-OPS",
    reviewArea: "FPD",
    sortOrder: 2,
  },
  {
    code: "AIS",
    nameEn: "Aeronautical Information Services",
    nameFr: "Services d'information aéronautique",
    descriptionEn: "Aeronautical information management, NOTAMs, AIP publications, and quality management systems",
    descriptionFr: "Gestion de l'information aéronautique, NOTAM, publications AIP et systèmes de gestion de la qualité",
    reviewArea: "AIS",
    sortOrder: 3,
  },
  {
    code: "CHART",
    nameEn: "Aeronautical Charts",
    nameFr: "Cartes aéronautiques",
    descriptionEn: "Production, validation, and maintenance of aeronautical charts",
    descriptionFr: "Production, validation et maintenance des cartes aéronautiques",
    reviewArea: "MAP",
    sortOrder: 4,
  },
  {
    code: "CNS",
    nameEn: "Communications, Navigation and Surveillance",
    nameFr: "Communications, navigation et surveillance",
    descriptionEn: "Technical communications systems, navigation aids, and surveillance infrastructure",
    descriptionFr: "Systèmes de communications techniques, aides à la navigation et infrastructure de surveillance",
    reviewArea: "CNS",
    sortOrder: 5,
  },
  {
    code: "MET",
    nameEn: "Aeronautical Meteorology",
    nameFr: "Météorologie aéronautique",
    descriptionEn: "Aviation weather observation, forecasting, briefing, and MET service provider oversight",
    descriptionFr: "Observation, prévision, briefing météorologiques pour l'aviation et supervision des prestataires de services MET",
    reviewArea: "MET",
    sortOrder: 6,
  },
  {
    code: "SAR",
    nameEn: "Search and Rescue",
    nameFr: "Recherche et sauvetage",
    descriptionEn: "SAR coordination, planning, operations, and international cooperation",
    descriptionFr: "Coordination, planification, opérations de recherche et sauvetage et coopération internationale",
    reviewArea: "SAR",
    sortOrder: 7,
  },
];

// Placeholder PQs for CHART (MAP) category — no dedicated CHART PQs in ICAO source
const CHART_PLACEHOLDER_PQS = [
  {
    pqNumber: "CHART001",
    questionTextEn: "Does the State ensure that aeronautical charts are produced in accordance with ICAO Annex 4 requirements?",
    questionTextFr: "L'État veille-t-il à ce que les cartes aéronautiques soient produites conformément aux exigences de l'Annexe 4 de l'OACI ?",
    guidanceEn: "Review the aeronautical chart production process. Verify compliance with ICAO Annex 4 specifications for chart types, formats, symbols, and data representation. Check that charts are produced using approved data sources.",
    guidanceFr: "Examiner le processus de production des cartes aéronautiques. Vérifier la conformité aux spécifications de l'Annexe 4 de l'OACI pour les types de cartes, les formats, les symboles et la représentation des données. Vérifier que les cartes sont produites à partir de sources de données approuvées.",
    sortOrder: 1,
  },
  {
    pqNumber: "CHART002",
    questionTextEn: "Does the State ensure that aeronautical charts are kept current through a systematic amendment process aligned with AIRAC cycles?",
    questionTextFr: "L'État veille-t-il à ce que les cartes aéronautiques soient maintenues à jour par un processus systématique d'amendement aligné sur les cycles AIRAC ?",
    guidanceEn: "Verify that aeronautical charts are updated in accordance with AIRAC cycle requirements. Check the process for incorporating amendments from AIS data, NOTAM, and other sources into chart products.",
    guidanceFr: "Vérifier que les cartes aéronautiques sont mises à jour conformément aux exigences du cycle AIRAC. Vérifier le processus d'incorporation des amendements provenant des données AIS, des NOTAM et d'autres sources dans les produits cartographiques.",
    sortOrder: 2,
  },
  {
    pqNumber: "CHART003",
    questionTextEn: "Does the State ensure that quality assurance measures are in place for the validation of aeronautical chart data?",
    questionTextFr: "L'État veille-t-il à ce que des mesures d'assurance qualité soient en place pour la validation des données des cartes aéronautiques ?",
    guidanceEn: "Review the quality assurance procedures for aeronautical chart production. Verify that validation checks are performed on chart data, including terrain and obstacle data, aerodrome information, and airspace boundaries.",
    guidanceFr: "Examiner les procédures d'assurance qualité pour la production des cartes aéronautiques. Vérifier que des contrôles de validation sont effectués sur les données cartographiques, y compris les données de terrain et d'obstacles, les informations d'aérodrome et les limites d'espace aérien.",
    sortOrder: 3,
  },
  {
    pqNumber: "CHART004",
    questionTextEn: "Does the State ensure that electronic aeronautical charts and digital data sets meet the requirements for electronic display and navigation applications?",
    questionTextFr: "L'État veille-t-il à ce que les cartes aéronautiques électroniques et les jeux de données numériques répondent aux exigences des applications d'affichage et de navigation électroniques ?",
    guidanceEn: "Verify that electronic aeronautical charts and digital data sets conform to applicable standards. Check that digital terrain and obstacle data are provided in formats compatible with aviation applications.",
    guidanceFr: "Vérifier que les cartes aéronautiques électroniques et les jeux de données numériques sont conformes aux normes applicables. Vérifier que les données numériques de terrain et d'obstacles sont fournies dans des formats compatibles avec les applications aéronautiques.",
    sortOrder: 4,
  },
  {
    pqNumber: "CHART005",
    questionTextEn: "Does the State ensure that cartographic personnel are adequately trained and competent in aeronautical chart production standards?",
    questionTextFr: "L'État veille-t-il à ce que le personnel cartographique soit adéquatement formé et compétent en matière de normes de production de cartes aéronautiques ?",
    guidanceEn: "Review the training and competency requirements for cartographic personnel. Verify that initial and recurrent training programmes are in place and that personnel maintain current knowledge of ICAO Annex 4 requirements.",
    guidanceFr: "Examiner les exigences de formation et de compétence du personnel cartographique. Vérifier que des programmes de formation initiale et périodique sont en place et que le personnel maintient une connaissance à jour des exigences de l'Annexe 4 de l'OACI.",
    sortOrder: 5,
  },
];

// =============================================================================
// HELPER: Load and merge PQ source data
// =============================================================================

interface SourcePQ {
  pqNumber: string;
  questionTextEn: string;
  questionTextFr: string;
  guidanceEn: string;
  guidanceFr: string;
  icaoReferences: string;
  isPriorityPQ: boolean;
  criticalElement: string;
  requiresOnSite: boolean;
  auditArea: string;
}

function loadSourcePQs(): SourcePQ[] {
  const scriptsDir = path.dirname(__filename);

  const mainPath = path.join(scriptsDir, "parsed-ans-questions-v2.json");
  const missingPath = path.join(scriptsDir, "missing-ans-questions.json");

  const mainPQs: SourcePQ[] = JSON.parse(fs.readFileSync(mainPath, "utf-8"));
  const missingPQs: SourcePQ[] = JSON.parse(fs.readFileSync(missingPath, "utf-8"));

  // Merge and sort by PQ number
  const allPQs = [...mainPQs, ...missingPQs];
  allPQs.sort((a, b) => parseFloat(a.pqNumber) - parseFloat(b.pqNumber));

  return allPQs;
}

// =============================================================================
// MAIN SEED FUNCTIONS
// =============================================================================

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  AAPRP ANS Questionnaire Re-Seed");
  console.log("  Restructuring from CE-based to Review Area categories");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // ─── Step 1: Find the ANS questionnaire ─────────────────────────────
    console.log("Step 1: Finding ANS questionnaire...\n");

    const ansQuestionnaires = await prisma.questionnaire.findMany({
      where: { type: "ANS_USOAP_CMA" },
      orderBy: { createdAt: "asc" },
    });

    if (ansQuestionnaires.length === 0) {
      console.error("  No ANS_USOAP_CMA questionnaire found. Run npm run db:seed first.");
      process.exit(1);
    }

    // Use the first one (primary)
    const questionnaire = ansQuestionnaires[0];
    console.log(`  Found questionnaire: ${questionnaire.code} (id: ${questionnaire.id})`);

    if (ansQuestionnaires.length > 1) {
      console.log(`  Note: ${ansQuestionnaires.length} ANS questionnaires found. Using "${questionnaire.code}".`);
    }

    // ─── Step 2: Check for existing assessment responses ────────────────
    console.log("\nStep 2: Checking existing data...\n");

    const responseCount = await prisma.assessmentResponse.count({
      where: { question: { questionnaireId: questionnaire.id } },
    });

    console.log(`  Found ${responseCount} existing ANS responses`);

    const findingCount = await prisma.finding.count({
      where: { question: { questionnaireId: questionnaire.id } },
    });

    console.log(`  Found ${findingCount} findings linked to ANS questions`);

    // ─── Step 3: Delete existing data in correct order ──────────────────
    console.log("\nStep 3: Deleting existing ANS questionnaire data...\n");

    // Get all question IDs first
    const existingQuestions = await prisma.question.findMany({
      where: { questionnaireId: questionnaire.id },
      select: { id: true },
    });
    const questionIds = existingQuestions.map((q) => q.id);

    if (questionIds.length > 0) {
      // Delete assessment responses first
      if (responseCount > 0) {
        const deletedResponses = await prisma.assessmentResponse.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        console.log(`  Deleted ${deletedResponses.count} assessment responses`);
      }

      // Unlink findings from questions (don't delete findings, just null the questionId)
      if (findingCount > 0) {
        const updatedFindings = await prisma.finding.updateMany({
          where: { questionId: { in: questionIds } },
          data: { questionId: null },
        });
        console.log(`  Unlinked ${updatedFindings.count} findings from questions`);
      }

      // Delete ICAO references
      const deletedRefs = await prisma.iCAOReference.deleteMany({
        where: { questionId: { in: questionIds } },
      });
      console.log(`  Deleted ${deletedRefs.count} ICAO references`);

      // Delete questions
      const deletedQuestions = await prisma.question.deleteMany({
        where: { questionnaireId: questionnaire.id },
      });
      console.log(`  Deleted ${deletedQuestions.count} questions`);
    }

    // Delete categories
    const deletedCategories = await prisma.questionnaireCategory.deleteMany({
      where: { questionnaireId: questionnaire.id },
    });
    console.log(`  Deleted ${deletedCategories.count} categories`);

    // Also handle any duplicate ANS questionnaires
    for (let i = 1; i < ansQuestionnaires.length; i++) {
      const dupeQ = ansQuestionnaires[i];
      const dupeQuestionIds = (
        await prisma.question.findMany({
          where: { questionnaireId: dupeQ.id },
          select: { id: true },
        })
      ).map((q) => q.id);

      if (dupeQuestionIds.length > 0) {
        await prisma.assessmentResponse.deleteMany({
          where: { questionId: { in: dupeQuestionIds } },
        });
        await prisma.finding.updateMany({
          where: { questionId: { in: dupeQuestionIds } },
          data: { questionId: null },
        });
        await prisma.iCAOReference.deleteMany({
          where: { questionId: { in: dupeQuestionIds } },
        });
        await prisma.question.deleteMany({
          where: { questionnaireId: dupeQ.id },
        });
      }
      await prisma.questionnaireCategory.deleteMany({
        where: { questionnaireId: dupeQ.id },
      });
      // Delete assessments linked to duplicate questionnaire
      await prisma.assessment.deleteMany({
        where: { questionnaireId: dupeQ.id },
      });
      await prisma.questionnaire.delete({ where: { id: dupeQ.id } });
      console.log(`  Deleted duplicate questionnaire: ${dupeQ.code}`);
    }

    // ─── Step 4: Update questionnaire metadata ──────────────────────────
    console.log("\nStep 4: Updating questionnaire metadata...\n");

    await prisma.questionnaire.update({
      where: { id: questionnaire.id },
      data: {
        code: "AAPRP-ANS-2024",
        version: "2024.2",
        titleEn: "AAPRP ANS Protocol Questionnaire",
        titleFr: "Questionnaire du protocole ANS de l'AAPRP",
        descriptionEn: "African ANSP Peer Review Programme Protocol Questions organized by ANS review areas (ATM, IFPD, AIS, CHART, CNS, MET, SAR). Derived from ICAO USOAP CMA 2024 Edition.",
        descriptionFr: "Questions du protocole du Programme africain d'examen par les pairs des ANSP organisées par domaines d'examen ANS (ATM, IFPD, AIS, CHART, CNS, MET, SAR). Dérivées de l'édition 2024 de l'USOAP CMA de l'OACI.",
        effectiveDate: new Date("2024-01-01"),
        isActive: true,
      },
    });
    console.log(`  Updated questionnaire code to AAPRP-ANS-2024`);

    // ─── Step 5: Create 7 categories ────────────────────────────────────
    console.log("\nStep 5: Creating 7 AAPRP review area categories...\n");

    const categoryMap = new Map<string, string>(); // reviewArea → categoryId

    for (const cat of CATEGORIES) {
      const created = await prisma.questionnaireCategory.create({
        data: {
          questionnaireId: questionnaire.id,
          code: cat.code,
          sortOrder: cat.sortOrder,
          nameEn: cat.nameEn,
          nameFr: cat.nameFr,
          descriptionEn: cat.descriptionEn,
          descriptionFr: cat.descriptionFr,
          auditArea: "ANS",
          reviewArea: cat.reviewArea,
        },
      });

      categoryMap.set(cat.reviewArea, created.id);
      console.log(`  Created category: ${cat.code} (${cat.reviewArea}) → ${created.id}`);
    }

    // ─── Step 6: Load and classify PQs ──────────────────────────────────
    console.log("\nStep 6: Creating PQs organized by review area...\n");

    const sourcePQs = loadSourcePQs();
    console.log(`  Loaded ${sourcePQs.length} source PQs from JSON files`);

    // Group PQs by review area and assign new PQ numbers
    const pqsByArea = new Map<ANSReviewArea, SourcePQ[]>();
    const unmapped: string[] = [];

    for (const pq of sourcePQs) {
      const reviewArea = PQ_REVIEW_AREA_MAP[pq.pqNumber];
      if (reviewArea) {
        if (!pqsByArea.has(reviewArea)) {
          pqsByArea.set(reviewArea, []);
        }
        pqsByArea.get(reviewArea)!.push(pq);
      } else {
        unmapped.push(pq.pqNumber);
      }
    }

    if (unmapped.length > 0) {
      console.log(`  Warning: ${unmapped.length} PQs not mapped: ${unmapped.join(", ")}`);
    }

    // Area code prefix mapping
    const areaPrefixMap: Record<string, string> = {
      ATS: "ATM",
      FPD: "IFPD",
      AIS: "AIS",
      MAP: "CHART",
      CNS: "CNS",
      MET: "MET",
      SAR: "SAR",
    };

    let totalCreated = 0;

    for (const [reviewArea, pqs] of pqsByArea.entries()) {
      const categoryId = categoryMap.get(reviewArea);
      if (!categoryId) continue;

      const prefix = areaPrefixMap[reviewArea] || reviewArea;
      let sortOrder = 0;

      for (const pq of pqs) {
        sortOrder++;
        const newPqNumber = `${prefix}${String(sortOrder).padStart(3, "0")}`;

        await prisma.question.create({
          data: {
            questionnaireId: questionnaire.id,
            categoryId,
            pqNumber: newPqNumber,
            questionTextEn: pq.questionTextEn,
            questionTextFr: pq.questionTextFr,
            guidanceEn: pq.guidanceEn || null,
            guidanceFr: pq.guidanceFr || null,
            auditArea: "ANS",
            reviewArea: reviewArea,
            criticalElement: pq.criticalElement as "CE_1" | "CE_2" | "CE_3" | "CE_4" | "CE_5" | "CE_6" | "CE_7" | "CE_8",
            isPriorityPQ: pq.isPriorityPQ || false,
            requiresOnSite: pq.requiresOnSite || false,
            responseType: "SATISFACTORY_NOT",
            weight: 1.0,
            maxScore: 1.0,
            sortOrder,
            isActive: true,
            requiredEvidence: pq.icaoReferences ? [pq.icaoReferences] : [],
          },
        });

        totalCreated++;
      }

      console.log(`  ${prefix}: ${pqs.length} PQs (${prefix}001 – ${prefix}${String(sortOrder).padStart(3, "0")})`);
    }

    // ─── Step 7: Create CHART placeholder PQs ───────────────────────────
    console.log("\n  Creating CHART placeholder PQs...");

    const chartCategoryId = categoryMap.get("MAP");
    if (chartCategoryId) {
      for (const chartPQ of CHART_PLACEHOLDER_PQS) {
        await prisma.question.create({
          data: {
            questionnaireId: questionnaire.id,
            categoryId: chartCategoryId,
            pqNumber: chartPQ.pqNumber,
            questionTextEn: chartPQ.questionTextEn,
            questionTextFr: chartPQ.questionTextFr,
            guidanceEn: chartPQ.guidanceEn,
            guidanceFr: chartPQ.guidanceFr,
            auditArea: "ANS",
            reviewArea: "MAP",
            responseType: "SATISFACTORY_NOT",
            weight: 1.0,
            maxScore: 1.0,
            sortOrder: chartPQ.sortOrder,
            isActive: true,
          },
        });
        totalCreated++;
      }
      console.log(`  CHART: ${CHART_PLACEHOLDER_PQS.length} placeholder PQs (CHART001 – CHART${String(CHART_PLACEHOLDER_PQS.length).padStart(3, "0")})`);
    }

    // ─── Step 8: Update assessments ─────────────────────────────────────
    console.log("\nStep 7: Updating assessment selectedReviewAreas...\n");

    const assessments = await prisma.assessment.findMany({
      where: { questionnaireId: questionnaire.id },
    });

    const allANSAreas: ANSReviewArea[] = ["ATS", "FPD", "AIS", "MAP", "MET", "CNS", "SAR"];

    for (const assessment of assessments) {
      if (assessment.selectedReviewAreas.length === 0) {
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: { selectedReviewAreas: allANSAreas },
        });
      }
    }

    if (assessments.length > 0) {
      console.log(`  Updated ${assessments.length} assessments with review areas`);
    } else {
      console.log("  No assessments to update");
    }

    // ─── Summary ────────────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  Re-Seed Summary");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  Questionnaire: ${questionnaire.code} → AAPRP-ANS-2024`);
    console.log(`  Categories: ${CATEGORIES.length}`);
    console.log(`  Total PQs created: ${totalCreated}`);
    console.log(`  PQ breakdown:`);

    for (const [area, pqs] of pqsByArea.entries()) {
      const prefix = areaPrefixMap[area] || area;
      console.log(`    ${prefix}: ${pqs.length} PQs`);
    }
    console.log(`    CHART: ${CHART_PLACEHOLDER_PQS.length} placeholder PQs`);

    console.log("\n  Review areas: ATM→ATS, IFPD→FPD, AIS→AIS, CHART→MAP, CNS→CNS, MET→MET, SAR→SAR");
    console.log("\n✅ ANS questionnaire re-seed complete!\n");

  } catch (error) {
    console.error("\n❌ Re-seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
