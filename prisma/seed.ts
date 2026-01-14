import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type {
  QuestionnaireType,
  USOAPAuditArea,
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

interface ANSSeedData {
  questionnaire: QuestionnaireData;
  categories: CategoryData[];
  questions: ANSQuestionData[];
}

interface SMSSeedData {
  questionnaire: QuestionnaireData;
  categories: CategoryData[];
  questions: SMSQuestionData[];
}

async function seedANSQuestionnaire() {
  console.log("Seeding ANS USOAP CMA 2024 questionnaire...");

  const seedDataPath = path.join(__dirname, "seed-data", "ans-usoap-2024.json");
  const seedData: ANSSeedData = JSON.parse(fs.readFileSync(seedDataPath, "utf-8"));

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
        auditArea: categoryData.auditArea,
        criticalElement: categoryData.criticalElement,
      },
      create: {
        questionnaireId: questionnaire.id,
        code: categoryData.code,
        sortOrder: categoryData.sortOrder,
        nameEn: categoryData.nameEn,
        nameFr: categoryData.nameFr,
        descriptionEn: categoryData.descriptionEn,
        descriptionFr: categoryData.descriptionFr,
        auditArea: categoryData.auditArea,
        criticalElement: categoryData.criticalElement,
      },
    });

    categoryMap.set(categoryData.code, category.id);
    console.log(`  Created/updated category: ${category.code}`);
  }

  // Create or update questions
  let questionCount = 0;
  for (const questionData of seedData.questions) {
    // Find the appropriate category based on audit area and critical element
    const categoryCode = `AGA-${questionData.criticalElement.replace("_", "")}`;
    const categoryId = categoryMap.get(categoryCode);

    if (!categoryId) {
      console.warn(`  Warning: Category not found for ${categoryCode}, skipping question ${questionData.pqNumber}`);
      continue;
    }

    // Upsert the question
    const question = await prisma.question.upsert({
      where: {
        questionnaireId_pqNumber: {
          questionnaireId: questionnaire.id,
          pqNumber: questionData.pqNumber,
        },
      },
      update: {
        categoryId,
        questionTextEn: questionData.questionTextEn,
        questionTextFr: questionData.questionTextFr,
        auditArea: questionData.auditArea,
        criticalElement: questionData.criticalElement,
        isPriorityPQ: questionData.isPriorityPQ ?? false,
        requiresOnSite: questionData.requiresOnSite ?? false,
        pqStatus: questionData.pqStatus ?? "NO_CHANGE",
        previousPqNumber: questionData.previousPqNumber,
        guidanceEn: questionData.guidanceEn,
        guidanceFr: questionData.guidanceFr,
        responseType: questionData.responseType ?? "SATISFACTORY_NOT",
        weight: questionData.weight ?? 1.0,
        maxScore: questionData.maxScore ?? 1.0,
        sortOrder: questionData.sortOrder,
        isActive: true,
      },
      create: {
        questionnaireId: questionnaire.id,
        categoryId,
        pqNumber: questionData.pqNumber,
        questionTextEn: questionData.questionTextEn,
        questionTextFr: questionData.questionTextFr,
        auditArea: questionData.auditArea,
        criticalElement: questionData.criticalElement,
        isPriorityPQ: questionData.isPriorityPQ ?? false,
        requiresOnSite: questionData.requiresOnSite ?? false,
        pqStatus: questionData.pqStatus ?? "NO_CHANGE",
        previousPqNumber: questionData.previousPqNumber,
        guidanceEn: questionData.guidanceEn,
        guidanceFr: questionData.guidanceFr,
        responseType: questionData.responseType ?? "SATISFACTORY_NOT",
        weight: questionData.weight ?? 1.0,
        maxScore: questionData.maxScore ?? 1.0,
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

async function main() {
  console.log("Starting database seed...\n");

  try {
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
  });
