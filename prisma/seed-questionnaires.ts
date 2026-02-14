/**
 * AAPRP Questionnaire Seed Script
 * Creates the two main questionnaires: ANS (USOAP CMA) and SMS (CANSO SoE)
 * 
 * Run: npm run db:seed:questionnaires
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// QuestionnaireType enum: ANS_USOAP_CMA, SMS_CANSO_SOE

async function seedQuestionnaires() {
  console.log("\n📋 Creating questionnaires...\n");

  const questionnaires = [
    {
      code: "ANS-USOAP-2024",
      type: "ANS_USOAP_CMA" as const,
      version: "2024.1",
      titleEn: "ICAO USOAP CMA Protocol Questions - ANS",
      titleFr: "Questions du protocole OACI USOAP CMA - ANS",
      descriptionEn: "Air Navigation Services protocol questions based on ICAO USOAP Continuous Monitoring Approach 2024 Edition",
      descriptionFr: "Questions du protocole des services de navigation aérienne basées sur l'approche de surveillance continue USOAP de l'OACI édition 2024",
      effectiveDate: new Date("2024-01-01"),
    },
    {
      code: "SMS-CANSO-2024",
      type: "SMS_CANSO_SOE" as const,
      version: "2024.1",
      titleEn: "CANSO Standard of Excellence in SMS",
      titleFr: "Norme d'excellence CANSO en SMS",
      descriptionEn: "Safety Management System assessment based on CANSO Standard of Excellence 2024 Edition",
      descriptionFr: "Évaluation du système de gestion de la sécurité basée sur la norme d'excellence CANSO édition 2024",
      effectiveDate: new Date("2024-01-01"),
    },
  ];

  for (const q of questionnaires) {
    const exists = await prisma.questionnaire.findUnique({
      where: { code: q.code },
    });

    if (exists) {
      console.log(`   ⏭️  Questionnaire exists: ${q.code}`);
      continue;
    }

    await prisma.questionnaire.create({
      data: {
        code: q.code,
        type: q.type,
        version: q.version,
        titleEn: q.titleEn,
        titleFr: q.titleFr,
        descriptionEn: q.descriptionEn,
        descriptionFr: q.descriptionFr,
        effectiveDate: q.effectiveDate,
        isActive: true,
      },
    });

    console.log(`   ✅ Created: ${q.code} (${q.type})`);
  }
}

async function seedCategories() {
  console.log("\n📂 Creating questionnaire categories...\n");

  // Get questionnaires
  const ansQ = await prisma.questionnaire.findUnique({ where: { code: "ANS-USOAP-2024" } });
  const smsQ = await prisma.questionnaire.findUnique({ where: { code: "SMS-CANSO-2024" } });

  if (!ansQ || !smsQ) {
    console.log("   ⚠️  Questionnaires not found. Cannot create categories.");
    return;
  }

  // ANS Categories (USOAP Audit Areas)
  const ansCategories = [
    { code: "ANS-CE1", sortOrder: 1, nameEn: "Primary Aviation Legislation", nameFr: "Législation aéronautique primaire", auditArea: "ANS" as const },
    { code: "ANS-CE2", sortOrder: 2, nameEn: "Specific Operating Regulations", nameFr: "Réglementations opérationnelles spécifiques", auditArea: "ANS" as const },
    { code: "ANS-CE3", sortOrder: 3, nameEn: "State Civil Aviation System", nameFr: "Système d'aviation civile de l'État", auditArea: "ANS" as const },
    { code: "ANS-CE4", sortOrder: 4, nameEn: "Technical Personnel Qualification", nameFr: "Qualification du personnel technique", auditArea: "ANS" as const },
    { code: "ANS-CE5", sortOrder: 5, nameEn: "Technical Guidance and Tools", nameFr: "Orientation et outils techniques", auditArea: "ANS" as const },
    { code: "ANS-CE6", sortOrder: 6, nameEn: "Licensing and Certification", nameFr: "Licences et certification", auditArea: "ANS" as const },
    { code: "ANS-CE7", sortOrder: 7, nameEn: "Surveillance Obligations", nameFr: "Obligations de surveillance", auditArea: "ANS" as const },
    { code: "ANS-CE8", sortOrder: 8, nameEn: "Resolution of Safety Issues", nameFr: "Résolution des problèmes de sécurité", auditArea: "ANS" as const },
  ];

  for (const cat of ansCategories) {
    const exists = await prisma.questionnaireCategory.findUnique({
      where: { questionnaireId_code: { questionnaireId: ansQ.id, code: cat.code } },
    });

    if (exists) {
      console.log(`   ⏭️  Category exists: ${cat.code}`);
      continue;
    }

    await prisma.questionnaireCategory.create({
      data: {
        questionnaireId: ansQ.id,
        code: cat.code,
        sortOrder: cat.sortOrder,
        nameEn: cat.nameEn,
        nameFr: cat.nameFr,
        auditArea: cat.auditArea,
      },
    });

    console.log(`   ✅ Created ANS category: ${cat.code}`);
  }

  // SMS Categories (CANSO Study Areas)
  const smsCategories = [
    { code: "SMS-1", sortOrder: 1, nameEn: "Safety Policy and Objectives", nameFr: "Politique et objectifs de sécurité", smsComponent: "SAFETY_POLICY_OBJECTIVES" as const },
    { code: "SMS-2", sortOrder: 2, nameEn: "Safety Risk Management", nameFr: "Gestion des risques de sécurité", smsComponent: "SAFETY_RISK_MANAGEMENT" as const },
    { code: "SMS-3", sortOrder: 3, nameEn: "Safety Assurance", nameFr: "Assurance de la sécurité", smsComponent: "SAFETY_ASSURANCE" as const },
    { code: "SMS-4", sortOrder: 4, nameEn: "Safety Promotion", nameFr: "Promotion de la sécurité", smsComponent: "SAFETY_PROMOTION" as const },
  ];

  for (const cat of smsCategories) {
    const exists = await prisma.questionnaireCategory.findUnique({
      where: { questionnaireId_code: { questionnaireId: smsQ.id, code: cat.code } },
    });

    if (exists) {
      console.log(`   ⏭️  Category exists: ${cat.code}`);
      continue;
    }

    await prisma.questionnaireCategory.create({
      data: {
        questionnaireId: smsQ.id,
        code: cat.code,
        sortOrder: cat.sortOrder,
        nameEn: cat.nameEn,
        nameFr: cat.nameFr,
        reviewArea: "SMS",
        smsComponent: cat.smsComponent,
      },
    });

    console.log(`   ✅ Created SMS category: ${cat.code}`);
  }
}

async function seedSampleQuestions() {
  console.log("\n❓ Creating sample questions...\n");

  const ansQ = await prisma.questionnaire.findUnique({ 
    where: { code: "ANS-USOAP-2024" },
    include: { categories: true },
  });

  const smsQ = await prisma.questionnaire.findUnique({ 
    where: { code: "SMS-CANSO-2024" },
    include: { categories: true },
  });

  if (!ansQ || !smsQ) {
    console.log("   ⚠️  Questionnaires not found.");
    return;
  }

  let questionCount = 0;

  // Sample ANS questions (5 per category)
  for (const category of ansQ.categories) {
    for (let i = 1; i <= 5; i++) {
      const pqNumber = `${category.code}-PQ${i.toString().padStart(2, '0')}`;
      
      const exists = await prisma.question.findUnique({
        where: { questionnaireId_pqNumber: { questionnaireId: ansQ.id, pqNumber } },
      });

      if (exists) continue;

      await prisma.question.create({
        data: {
          questionnaireId: ansQ.id,
          categoryId: category.id,
          pqNumber,
          auditArea: "ANS",
          questionTextEn: `Sample ANS protocol question ${i} for ${category.nameEn}. Does the State have adequate provisions?`,
          questionTextFr: `Exemple de question de protocole ANS ${i} pour ${category.nameFr}. L'État dispose-t-il de dispositions adéquates?`,
          guidanceEn: `Review relevant documentation and verify compliance with ICAO standards.`,
          guidanceFr: `Examiner la documentation pertinente et vérifier la conformité aux normes de l'OACI.`,
          responseType: "SATISFACTORY_NOT",
          weight: 1.0,
          maxScore: 1.0,
          sortOrder: (category.sortOrder * 100) + i,
          isActive: true,
        },
      });
      questionCount++;
    }
  }

  console.log(`   ✅ Created ${questionCount} ANS questions`);

  questionCount = 0;

  // Sample SMS questions (5 per category)
  for (const category of smsQ.categories) {
    for (let i = 1; i <= 5; i++) {
      const pqNumber = `${category.code}-Q${i.toString().padStart(2, '0')}`;
      
      const exists = await prisma.question.findUnique({
        where: { questionnaireId_pqNumber: { questionnaireId: smsQ.id, pqNumber } },
      });

      if (exists) continue;

      await prisma.question.create({
        data: {
          questionnaireId: smsQ.id,
          categoryId: category.id,
          pqNumber,
          reviewArea: "SMS",
          smsComponent: category.smsComponent,
          questionTextEn: `Sample SMS assessment question ${i} for ${category.nameEn}. Is this element effectively implemented?`,
          questionTextFr: `Exemple de question d'évaluation SMS ${i} pour ${category.nameFr}. Cet élément est-il effectivement mis en œuvre?`,
          guidanceEn: `Assess the maturity level based on evidence and interviews.`,
          guidanceFr: `Évaluer le niveau de maturité sur la base des preuves et des entretiens.`,
          responseType: "MATURITY_LEVEL",
          weight: 1.0,
          maxScore: 5.0,
          sortOrder: (category.sortOrder * 100) + i,
          isActive: true,
        },
      });
      questionCount++;
    }
  }

  console.log(`   ✅ Created ${questionCount} SMS questions`);
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     AAPRP Questionnaire Seed                               ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    await seedQuestionnaires();
    await seedCategories();
    await seedSampleQuestions();

    // Summary
    const qCount = await prisma.questionnaire.count();
    const catCount = await prisma.questionnaireCategory.count();
    const questionCount = await prisma.question.count();

    console.log(`\n${"═".repeat(50)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${"═".repeat(50)}`);
    console.log(`   Questionnaires: ${qCount}`);
    console.log(`   Categories: ${catCount}`);
    console.log(`   Questions: ${questionCount}`);
    console.log(`${"═".repeat(50)}`);
    console.log("\n✅ Questionnaire seed complete!\n");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });