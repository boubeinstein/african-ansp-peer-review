import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type {
  QuestionnaireType,
  USOAPAuditArea,
  ANSReviewArea,
  CriticalElement,
  SMSComponent,
  CANSOStudyArea,
  TransversalArea,
  PQAmendmentStatus,
  ResponseType,
  ICAOReferenceType,
} from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Import reviewer seeding functions
import { seedOrganizations, seedReviewers, reviewerPrisma, reviewerPool } from "./seed-reviewers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Type definitions for seed data
interface ICAOReferenceData {
  referenceType: ICAOReferenceType;
  document: string;
  chapter?: string | null;
  description?: string | null;
}

interface ANSQuestionData {
  pqNumber: string;
  questionTextEn: string;
  questionTextFr: string;
  auditArea: USOAPAuditArea;
  criticalElement: CriticalElement;
  isPriorityPQ?: boolean;
  requiresOnSite?: boolean;
  pqStatus?: PQAmendmentStatus;
  previousPqNumber?: string | null;
  sortOrder: number;
  guidanceEn?: string | null;
  guidanceFr?: string | null;
  responseType?: ResponseType;
  weight?: number;
  maxScore?: number;
  icaoReferences?: ICAOReferenceData[];
}

interface SMSQuestionData {
  smsComponent: SMSComponent;
  studyArea: CANSOStudyArea;
  transversalArea?: TransversalArea | null;
  questionTextEn: string;
  questionTextFr: string;
  sortOrder: number;
  maturityLevel?: string | null;
  guidanceEn?: string | null;
  guidanceFr?: string | null;
  responseType?: ResponseType;
  weight?: number;
  maxScore?: number;
  icaoReferences?: ICAOReferenceData[];
}

interface CategoryData {
  code: string;
  sortOrder: number;
  nameEn: string;
  nameFr: string;
  descriptionEn?: string | null;
  descriptionFr?: string | null;
  auditArea?: USOAPAuditArea | null;
  reviewArea?: ANSReviewArea | null;
  criticalElement?: CriticalElement | null;
  smsComponent?: SMSComponent | null;
  studyArea?: CANSOStudyArea | null;
  transversalArea?: TransversalArea | null;
}

interface QuestionnaireData {
  code: string;
  type: QuestionnaireType;
  version: string;
  titleEn: string;
  titleFr: string;
  descriptionEn?: string | null;
  descriptionFr?: string | null;
  effectiveDate: string;
}

interface SMSSeedData {
  questionnaire: QuestionnaireData;
  categories: CategoryData[];
  questions: SMSQuestionData[];
}

async function seedANSQuestionnaire() {
  console.log("Seeding AAPRP ANS questionnaire (review area structure)...");

  // ── PQ-to-review-area classification map ──────────────────────────
  // Maps ICAO USOAP CMA PQ numbers to AAPRP review areas
  const pqAreaMap: Record<string, ANSReviewArea> = {
    // ATS — Air Traffic Management
    "7.001": "ATS", "7.003": "ATS", "7.007": "ATS", "7.009": "ATS", "7.011": "ATS",
    "7.031": "ATS", "7.037": "ATS", "7.039": "ATS", "7.045": "ATS", "7.051": "ATS",
    "7.073": "ATS", "7.057": "ATS", "7.060": "ATS", "7.061": "ATS", "7.062": "ATS",
    "7.063": "ATS", "7.065": "ATS", "7.069": "ATS", "7.081": "ATS", "7.082": "ATS",
    "7.087": "ATS", "7.101": "ATS", "7.109": "ATS", "7.110": "ATS", "7.111": "ATS",
    "7.117": "ATS", "7.119": "ATS", "7.121": "ATS", "7.131": "ATS", "7.133": "ATS",
    "7.135": "ATS", "7.137": "ATS", "7.139": "ATS", "7.151": "ATS", "7.153": "ATS",
    "7.155": "ATS", "7.158": "ATS", "7.159": "ATS", "7.162": "ATS", "7.177": "ATS",
    "7.187": "ATS", "7.191": "ATS", "7.193": "ATS", "7.195": "ATS", "7.199": "ATS",
    "7.901": "ATS", "7.905": "ATS", "7.909": "ATS", "7.913": "ATS", "7.917": "ATS",
    "7.921": "ATS", "7.925": "ATS", "7.929": "ATS", "7.933": "ATS", "7.937": "ATS",
    "7.941": "ATS",
    // FPD — Instrument Flight Procedure Design
    "7.205": "FPD", "7.209": "FPD", "7.211": "FPD", "7.231": "FPD", "7.233": "FPD",
    "7.234": "FPD", "7.243": "FPD", "7.247": "FPD", "7.249": "FPD", "7.253": "FPD",
    "7.267": "FPD", "7.390": "FPD",
    // AIS — Aeronautical Information Services
    "7.005": "AIS", "7.042": "AIS", "7.085": "AIS", "7.201": "AIS", "7.215": "AIS",
    "7.229": "AIS", "7.255": "AIS", "7.269": "AIS", "7.273": "AIS", "7.277": "AIS",
    "7.281": "AIS", "7.287": "AIS", "7.288": "AIS", "7.289": "AIS", "7.291": "AIS",
    "7.309": "AIS",
    // CNS — Communications, Navigation, Surveillance
    "7.303": "CNS", "7.311": "CNS", "7.321": "CNS", "7.361": "CNS", "7.373": "CNS",
    "7.377": "CNS", "7.381": "CNS", "7.385": "CNS", "7.391": "CNS", "7.393": "CNS",
    "7.395": "CNS",
    // MET — Aeronautical Meteorology
    "7.412": "MET", "7.415": "MET", "7.417": "MET", "7.421": "MET", "7.425": "MET",
    "7.429": "MET", "7.435": "MET", "7.437": "MET", "7.451": "MET", "7.459": "MET",
    "7.463": "MET", "7.465": "MET", "7.467": "MET", "7.475": "MET", "7.476": "MET",
    "7.477": "MET", "7.481": "MET",
    // SAR — Search and Rescue
    "7.487": "SAR", "7.491": "SAR", "7.495": "SAR", "7.499": "SAR", "7.505": "SAR",
    "7.507": "SAR", "7.513": "SAR", "7.517": "SAR", "7.519": "SAR", "7.521": "SAR",
    "7.525": "SAR", "7.529": "SAR", "7.537": "SAR", "7.543": "SAR", "7.545": "SAR",
  };

  // ── AAPRP review area categories ──────────────────────────────────
  const categoryDefs: { code: string; nameEn: string; nameFr: string; descriptionEn: string; descriptionFr: string; reviewArea: ANSReviewArea; sortOrder: number }[] = [
    { code: "ATM", nameEn: "Air Traffic Management", nameFr: "Gestion du trafic aérien", descriptionEn: "Air traffic control, flow management, airspace management, and ATS safety oversight", descriptionFr: "Contrôle de la circulation aérienne, gestion des flux, gestion de l'espace aérien et supervision de la sécurité des services ATS", reviewArea: "ATS", sortOrder: 1 },
    { code: "IFPD", nameEn: "Instrument Flight Procedure Design", nameFr: "Conception des procédures de vol aux instruments", descriptionEn: "Design, validation, and maintenance of instrument flight procedures including PANS-OPS compliance", descriptionFr: "Conception, validation et maintenance des procédures de vol aux instruments, y compris la conformité PANS-OPS", reviewArea: "FPD", sortOrder: 2 },
    { code: "AIS", nameEn: "Aeronautical Information Services", nameFr: "Services d'information aéronautique", descriptionEn: "Aeronautical information management, NOTAMs, AIP publications, and quality management systems", descriptionFr: "Gestion de l'information aéronautique, NOTAM, publications AIP et systèmes de gestion de la qualité", reviewArea: "AIS", sortOrder: 3 },
    { code: "CHART", nameEn: "Aeronautical Charts", nameFr: "Cartes aéronautiques", descriptionEn: "Production, validation, and maintenance of aeronautical charts", descriptionFr: "Production, validation et maintenance des cartes aéronautiques", reviewArea: "MAP", sortOrder: 4 },
    { code: "CNS", nameEn: "Communications, Navigation and Surveillance", nameFr: "Communications, navigation et surveillance", descriptionEn: "Technical communications systems, navigation aids, and surveillance infrastructure", descriptionFr: "Systèmes de communications techniques, aides à la navigation et infrastructure de surveillance", reviewArea: "CNS", sortOrder: 5 },
    { code: "MET", nameEn: "Aeronautical Meteorology", nameFr: "Météorologie aéronautique", descriptionEn: "Aviation weather observation, forecasting, briefing, and MET service provider oversight", descriptionFr: "Observation, prévision, briefing météorologiques pour l'aviation et supervision des prestataires de services MET", reviewArea: "MET", sortOrder: 6 },
    { code: "SAR", nameEn: "Search and Rescue", nameFr: "Recherche et sauvetage", descriptionEn: "SAR coordination, planning, operations, and international cooperation", descriptionFr: "Coordination, planification, opérations de recherche et sauvetage et coopération internationale", reviewArea: "SAR", sortOrder: 7 },
  ];

  // Area code → PQ number prefix mapping
  const areaPrefixMap: Record<string, string> = {
    ATS: "ATM", FPD: "IFPD", AIS: "AIS", MAP: "CHART", CNS: "CNS", MET: "MET", SAR: "SAR",
  };

  // ── Create or update questionnaire ────────────────────────────────
  const questionnaire = await prisma.questionnaire.upsert({
    where: { code: "AAPRP-ANS-2024" },
    update: {
      version: "2024.2",
      titleEn: "AAPRP ANS Protocol Questionnaire",
      titleFr: "Questionnaire du protocole ANS de l'AAPRP",
      descriptionEn: "African ANSP Peer Review Programme Protocol Questions organized by ANS review areas (ATM, IFPD, AIS, CHART, CNS, MET, SAR). Derived from ICAO USOAP CMA 2024 Edition.",
      descriptionFr: "Questions du protocole du Programme africain d'examen par les pairs des ANSP organisées par domaines d'examen ANS (ATM, IFPD, AIS, CHART, CNS, MET, SAR). Dérivées de l'édition 2024 de l'USOAP CMA de l'OACI.",
      effectiveDate: new Date("2024-01-01"),
      isActive: true,
    },
    create: {
      code: "AAPRP-ANS-2024",
      type: "ANS_USOAP_CMA" as QuestionnaireType,
      version: "2024.2",
      titleEn: "AAPRP ANS Protocol Questionnaire",
      titleFr: "Questionnaire du protocole ANS de l'AAPRP",
      descriptionEn: "African ANSP Peer Review Programme Protocol Questions organized by ANS review areas (ATM, IFPD, AIS, CHART, CNS, MET, SAR). Derived from ICAO USOAP CMA 2024 Edition.",
      descriptionFr: "Questions du protocole du Programme africain d'examen par les pairs des ANSP organisées par domaines d'examen ANS (ATM, IFPD, AIS, CHART, CNS, MET, SAR). Dérivées de l'édition 2024 de l'USOAP CMA de l'OACI.",
      effectiveDate: new Date("2024-01-01"),
      isActive: true,
    },
  });

  console.log(`  Created/updated questionnaire: ${questionnaire.code}`);

  // ── Create categories ─────────────────────────────────────────────
  const categoryMap = new Map<string, string>();

  for (const cat of categoryDefs) {
    const category = await prisma.questionnaireCategory.upsert({
      where: {
        questionnaireId_code: { questionnaireId: questionnaire.id, code: cat.code },
      },
      update: {
        sortOrder: cat.sortOrder,
        nameEn: cat.nameEn,
        nameFr: cat.nameFr,
        descriptionEn: cat.descriptionEn,
        descriptionFr: cat.descriptionFr,
        auditArea: "ANS" as USOAPAuditArea,
        reviewArea: cat.reviewArea,
      },
      create: {
        questionnaireId: questionnaire.id,
        code: cat.code,
        sortOrder: cat.sortOrder,
        nameEn: cat.nameEn,
        nameFr: cat.nameFr,
        descriptionEn: cat.descriptionEn,
        descriptionFr: cat.descriptionFr,
        auditArea: "ANS" as USOAPAuditArea,
        reviewArea: cat.reviewArea,
      },
    });

    categoryMap.set(cat.reviewArea, category.id);
    console.log(`  Created/updated category: ${cat.code} → ${cat.reviewArea}`);
  }

  // ── Load source PQs ───────────────────────────────────────────────
  const mainPQPath = path.join(__dirname, "..", "scripts", "parsed-ans-questions-v2.json");
  const missingPQPath = path.join(__dirname, "..", "scripts", "missing-ans-questions.json");

  const sourcePQs: ANSQuestionData[] = [];
  if (fs.existsSync(mainPQPath)) {
    sourcePQs.push(...JSON.parse(fs.readFileSync(mainPQPath, "utf-8")));
  }
  if (fs.existsSync(missingPQPath)) {
    sourcePQs.push(...JSON.parse(fs.readFileSync(missingPQPath, "utf-8")));
  }
  sourcePQs.sort((a, b) => parseFloat(a.pqNumber) - parseFloat(b.pqNumber));

  // ── Group PQs by review area and assign new numbers ───────────────
  const pqsByArea = new Map<ANSReviewArea, ANSQuestionData[]>();
  for (const pq of sourcePQs) {
    const area = pqAreaMap[pq.pqNumber];
    if (!area) continue;
    if (!pqsByArea.has(area)) pqsByArea.set(area, []);
    pqsByArea.get(area)!.push(pq);
  }

  // ── Create questions ──────────────────────────────────────────────
  let questionCount = 0;

  for (const [reviewArea, pqs] of pqsByArea.entries()) {
    const categoryId = categoryMap.get(reviewArea);
    if (!categoryId) continue;

    const prefix = areaPrefixMap[reviewArea] || reviewArea;
    let sortOrder = 0;

    for (const pq of pqs) {
      sortOrder++;
      const newPqNumber = `${prefix}${String(sortOrder).padStart(3, "0")}`;

      await prisma.question.upsert({
        where: {
          questionnaireId_pqNumber: { questionnaireId: questionnaire.id, pqNumber: newPqNumber },
        },
        update: {
          categoryId,
          questionTextEn: pq.questionTextEn,
          questionTextFr: pq.questionTextFr,
          auditArea: "ANS" as USOAPAuditArea,
          reviewArea: reviewArea,
          criticalElement: pq.criticalElement as CriticalElement,
          isPriorityPQ: pq.isPriorityPQ ?? false,
          requiresOnSite: pq.requiresOnSite ?? false,
          guidanceEn: pq.guidanceEn || null,
          guidanceFr: pq.guidanceFr || null,
          responseType: "SATISFACTORY_NOT" as ResponseType,
          weight: 1.0,
          maxScore: 1.0,
          sortOrder,
          isActive: true,
        },
        create: {
          questionnaireId: questionnaire.id,
          categoryId,
          pqNumber: newPqNumber,
          questionTextEn: pq.questionTextEn,
          questionTextFr: pq.questionTextFr,
          auditArea: "ANS" as USOAPAuditArea,
          reviewArea: reviewArea,
          criticalElement: pq.criticalElement as CriticalElement,
          isPriorityPQ: pq.isPriorityPQ ?? false,
          requiresOnSite: pq.requiresOnSite ?? false,
          guidanceEn: pq.guidanceEn || null,
          guidanceFr: pq.guidanceFr || null,
          responseType: "SATISFACTORY_NOT" as ResponseType,
          weight: 1.0,
          maxScore: 1.0,
          sortOrder,
          isActive: true,
        },
      });

      questionCount++;
    }
  }

  // ── Create CHART placeholder PQs ──────────────────────────────────
  const chartCategoryId = categoryMap.get("MAP");
  if (chartCategoryId) {
    const chartPQs = [
      { pqNumber: "CHART001", textEn: "Does the State ensure that aeronautical charts are produced in accordance with ICAO Annex 4 requirements?", textFr: "L'État veille-t-il à ce que les cartes aéronautiques soient produites conformément aux exigences de l'Annexe 4 de l'OACI ?" },
      { pqNumber: "CHART002", textEn: "Does the State ensure that aeronautical charts are kept current through a systematic amendment process aligned with AIRAC cycles?", textFr: "L'État veille-t-il à ce que les cartes aéronautiques soient maintenues à jour par un processus systématique d'amendement aligné sur les cycles AIRAC ?" },
      { pqNumber: "CHART003", textEn: "Does the State ensure that quality assurance measures are in place for the validation of aeronautical chart data?", textFr: "L'État veille-t-il à ce que des mesures d'assurance qualité soient en place pour la validation des données des cartes aéronautiques ?" },
      { pqNumber: "CHART004", textEn: "Does the State ensure that electronic aeronautical charts and digital data sets meet the requirements for electronic display and navigation applications?", textFr: "L'État veille-t-il à ce que les cartes aéronautiques électroniques et les jeux de données numériques répondent aux exigences des applications d'affichage et de navigation électroniques ?" },
      { pqNumber: "CHART005", textEn: "Does the State ensure that cartographic personnel are adequately trained and competent in aeronautical chart production standards?", textFr: "L'État veille-t-il à ce que le personnel cartographique soit adéquatement formé et compétent en matière de normes de production de cartes aéronautiques ?" },
    ];

    for (let i = 0; i < chartPQs.length; i++) {
      const cpq = chartPQs[i];
      await prisma.question.upsert({
        where: {
          questionnaireId_pqNumber: { questionnaireId: questionnaire.id, pqNumber: cpq.pqNumber },
        },
        update: {
          categoryId: chartCategoryId,
          questionTextEn: cpq.textEn,
          questionTextFr: cpq.textFr,
          auditArea: "ANS" as USOAPAuditArea,
          reviewArea: "MAP" as ANSReviewArea,
          responseType: "SATISFACTORY_NOT" as ResponseType,
          weight: 1.0,
          maxScore: 1.0,
          sortOrder: i + 1,
          isActive: true,
        },
        create: {
          questionnaireId: questionnaire.id,
          categoryId: chartCategoryId,
          pqNumber: cpq.pqNumber,
          questionTextEn: cpq.textEn,
          questionTextFr: cpq.textFr,
          auditArea: "ANS" as USOAPAuditArea,
          reviewArea: "MAP" as ANSReviewArea,
          responseType: "SATISFACTORY_NOT" as ResponseType,
          weight: 1.0,
          maxScore: 1.0,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      questionCount++;
    }
  }

  console.log(`  Created/updated ${questionCount} questions across 7 review area categories`);
  return { questionnaire, categoryCount: categoryMap.size, questionCount };
}

async function seedSMSQuestionnaire() {
  console.log("Seeding SMS CANSO SoE 2024 questionnaire...");

  const seedDataPath = path.join(__dirname, "seed-data", "sms-canso-2024.json");
  const seedData: SMSSeedData = JSON.parse(fs.readFileSync(seedDataPath, "utf-8"));

  // Create or update questionnaire
  const questionnaire = await prisma.questionnaire.upsert({
    where: { code: seedData.questionnaire.code },
    update: {
      version: seedData.questionnaire.version,
      titleEn: seedData.questionnaire.titleEn,
      titleFr: seedData.questionnaire.titleFr,
      descriptionEn: seedData.questionnaire.descriptionEn,
      descriptionFr: seedData.questionnaire.descriptionFr,
      effectiveDate: new Date(seedData.questionnaire.effectiveDate),
      isActive: true,
    },
    create: {
      code: seedData.questionnaire.code,
      type: seedData.questionnaire.type,
      version: seedData.questionnaire.version,
      titleEn: seedData.questionnaire.titleEn,
      titleFr: seedData.questionnaire.titleFr,
      descriptionEn: seedData.questionnaire.descriptionEn,
      descriptionFr: seedData.questionnaire.descriptionFr,
      effectiveDate: new Date(seedData.questionnaire.effectiveDate),
      isActive: true,
    },
  });

  console.log(`  Created/updated questionnaire: ${questionnaire.code}`);

  // Create or update categories
  const categoryMap = new Map<string, string>();

  for (const categoryData of seedData.categories) {
    const category = await prisma.questionnaireCategory.upsert({
      where: {
        questionnaireId_code: {
          questionnaireId: questionnaire.id,
          code: categoryData.code,
        },
      },
      update: {
        sortOrder: categoryData.sortOrder,
        nameEn: categoryData.nameEn,
        nameFr: categoryData.nameFr,
        descriptionEn: categoryData.descriptionEn,
        descriptionFr: categoryData.descriptionFr,
        reviewArea: "SMS",
        smsComponent: categoryData.smsComponent,
        studyArea: categoryData.studyArea,
        transversalArea: categoryData.transversalArea,
      },
      create: {
        questionnaireId: questionnaire.id,
        code: categoryData.code,
        sortOrder: categoryData.sortOrder,
        nameEn: categoryData.nameEn,
        nameFr: categoryData.nameFr,
        descriptionEn: categoryData.descriptionEn,
        descriptionFr: categoryData.descriptionFr,
        reviewArea: "SMS",
        smsComponent: categoryData.smsComponent,
        studyArea: categoryData.studyArea,
        transversalArea: categoryData.transversalArea,
      },
    });

    categoryMap.set(categoryData.code, category.id);

    // Also map by study area for question assignment
    if (categoryData.studyArea) {
      categoryMap.set(categoryData.studyArea, category.id);
    }

    console.log(`  Created/updated category: ${category.code}`);
  }

  // Create or update questions
  let questionCount = 0;
  for (const questionData of seedData.questions) {
    // Find the appropriate category based on study area
    let categoryId = categoryMap.get(questionData.studyArea);

    if (!categoryId) {
      // Fall back to component-level category
      const componentCode = `SMS-C${questionData.smsComponent === "SAFETY_POLICY_OBJECTIVES" ? "1" :
        questionData.smsComponent === "SAFETY_RISK_MANAGEMENT" ? "2" :
        questionData.smsComponent === "SAFETY_ASSURANCE" ? "3" : "4"}`;
      categoryId = categoryMap.get(componentCode);
    }

    if (!categoryId) {
      console.warn(`  Warning: Category not found for study area ${questionData.studyArea}, skipping question`);
      continue;
    }

    // Generate a unique identifier for SMS questions (they don't have PQ numbers)
    const smsQuestionId = `SMS-${questionData.studyArea}-${questionData.sortOrder}`;

    // Upsert the question
    const question = await prisma.question.upsert({
      where: {
        questionnaireId_pqNumber: {
          questionnaireId: questionnaire.id,
          pqNumber: smsQuestionId,
        },
      },
      update: {
        categoryId,
        questionTextEn: questionData.questionTextEn,
        questionTextFr: questionData.questionTextFr,
        reviewArea: "SMS",
        smsComponent: questionData.smsComponent,
        studyArea: questionData.studyArea,
        guidanceEn: questionData.guidanceEn,
        guidanceFr: questionData.guidanceFr,
        responseType: questionData.responseType ?? "MATURITY_LEVEL",
        weight: questionData.weight ?? 1.0,
        maxScore: questionData.maxScore ?? 5.0,
        sortOrder: questionData.sortOrder,
        isActive: true,
      },
      create: {
        questionnaireId: questionnaire.id,
        categoryId,
        pqNumber: smsQuestionId,
        questionTextEn: questionData.questionTextEn,
        questionTextFr: questionData.questionTextFr,
        reviewArea: "SMS",
        smsComponent: questionData.smsComponent,
        studyArea: questionData.studyArea,
        guidanceEn: questionData.guidanceEn,
        guidanceFr: questionData.guidanceFr,
        responseType: questionData.responseType ?? "MATURITY_LEVEL",
        weight: questionData.weight ?? 1.0,
        maxScore: questionData.maxScore ?? 5.0,
        sortOrder: questionData.sortOrder,
        isActive: true,
      },
    });

    // Delete existing ICAO references and recreate
    await prisma.iCAOReference.deleteMany({
      where: { questionId: question.id },
    });

    // Create ICAO references
    if (questionData.icaoReferences && questionData.icaoReferences.length > 0) {
      for (const refData of questionData.icaoReferences) {
        await prisma.iCAOReference.create({
          data: {
            questionId: question.id,
            referenceType: refData.referenceType,
            document: refData.document,
            chapter: refData.chapter,
            description: refData.description,
          },
        });
      }
    }

    questionCount++;
  }

  console.log(`  Created/updated ${questionCount} questions with ICAO references`);
  return { questionnaire, categoryCount: categoryMap.size, questionCount };
}

async function seedSystemSettings() {
  console.log("Seeding system settings...");

  const settings = await prisma.systemSettings.upsert({
    where: { id: "system-settings" },
    update: {}, // Don't overwrite existing settings
    create: {
      id: "system-settings",
      trainingModuleEnabled: true,
      allowNewRegistrations: true,
      maintenanceMode: false,
      maxUploadSizeMB: 50,
      maxConcurrentSessions: 0, // 0 = unlimited by default
    },
  });

  console.log(`  System settings initialized (maxConcurrentSessions: ${settings.maxConcurrentSessions})`);
  return settings;
}

async function main() {
  console.log("Starting database seed...\n");

  try {
    // Seed system settings (must exist for session enforcement)
    await seedSystemSettings();

    // Seed ANS USOAP CMA questionnaire
    const ansResult = await seedANSQuestionnaire();
    console.log(`\nANS Questionnaire Summary:`);
    console.log(`  - Code: ${ansResult.questionnaire.code}`);
    console.log(`  - Categories: ${ansResult.categoryCount}`);
    console.log(`  - Questions: ${ansResult.questionCount}`);

    // Seed SMS CANSO SoE questionnaire
    const smsResult = await seedSMSQuestionnaire();
    console.log(`\nSMS Questionnaire Summary:`);
    console.log(`  - Code: ${smsResult.questionnaire.code}`);
    console.log(`  - Categories: ${smsResult.categoryCount}`);
    console.log(`  - Questions: ${smsResult.questionCount}`);

    // Seed reviewers
    console.log("\n--- Seeding Reviewers ---\n");
    const organizationIds = await seedOrganizations();
    await seedReviewers(organizationIds);

    // Print reviewer summary
    const stats = await reviewerPrisma.reviewerProfile.groupBy({
      by: ["selectionStatus"],
      _count: { id: true },
    });

    console.log("\nReviewer Summary:");
    console.log(`  - Organizations: ${organizationIds.length}`);
    for (const stat of stats) {
      console.log(`  - ${stat.selectionStatus}: ${stat._count.id}`);
    }

    const leadCount = await reviewerPrisma.reviewerProfile.count({
      where: { isLeadQualified: true },
    });
    console.log(`  - Lead Qualified: ${leadCount}`);

    console.log("\n✓ Database seed completed successfully!");
  } catch (error) {
    console.error("\n✗ Database seed failed:", error);
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
    await reviewerPrisma.$disconnect();
    await reviewerPool.end();
  });
