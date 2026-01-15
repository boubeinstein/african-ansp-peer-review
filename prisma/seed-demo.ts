/**
 * Demo Data Generator
 *
 * Generates realistic sample data for demonstrations, including:
 * - African ANSPs with realistic ICAO codes
 * - Sample users with various roles
 * - Assessments in different stages
 * - Responses with realistic distributions
 *
 * Usage: npx ts-node prisma/seed-demo.ts
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
} from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// AFRICAN ANSP DATA
// =============================================================================

interface ANSPData {
  nameEn: string;
  nameFr: string;
  icaoCode: string;
  country: string;
  region: "WACAF" | "ESAF";
  membershipStatus: MembershipStatus;
}

const AFRICAN_ANSPS: ANSPData[] = [
  // West and Central Africa (WACAF)
  {
    nameEn: "Agency for Aerial Navigation Safety in Africa and Madagascar",
    nameFr: "Agence pour la Sécurité de la Navigation Aérienne en Afrique et à Madagascar",
    icaoCode: "ASECNA",
    country: "Senegal (HQ)",
    region: "WACAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Nigerian Airspace Management Agency",
    nameFr: "Agence Nigériane de Gestion de l'Espace Aérien",
    icaoCode: "NAMA",
    country: "Nigeria",
    region: "WACAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Ghana Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Ghana",
    icaoCode: "GCAA",
    country: "Ghana",
    region: "WACAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Roberts Flight Information Region",
    nameFr: "Région d'Information de Vol Roberts",
    icaoCode: "RFIR",
    country: "Liberia",
    region: "WACAF",
    membershipStatus: "PENDING",
  },
  {
    nameEn: "Sierra Leone Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de Sierra Leone",
    icaoCode: "SLCAA",
    country: "Sierra Leone",
    region: "WACAF",
    membershipStatus: "PENDING",
  },
  // Eastern and Southern Africa (ESAF)
  {
    nameEn: "Kenya Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Kenya",
    icaoCode: "KCAA",
    country: "Kenya",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "South African Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile Sud-Africaine",
    icaoCode: "SACAA",
    country: "South Africa",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Tanzania Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de Tanzanie",
    icaoCode: "TCAA",
    country: "Tanzania",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Ethiopian Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile Éthiopienne",
    icaoCode: "ECAA",
    country: "Ethiopia",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Uganda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de l'Ouganda",
    icaoCode: "UCAA",
    country: "Uganda",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Rwanda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Rwanda",
    icaoCode: "RCAA",
    country: "Rwanda",
    region: "ESAF",
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Namibia Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de Namibie",
    icaoCode: "NCAA",
    country: "Namibia",
    region: "ESAF",
    membershipStatus: "PENDING",
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
  isOrgUser: boolean; // Whether this user belongs to an org
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
  },
  {
    email: "coordinator@aaprp.org",
    firstName: "Jean",
    lastName: "Mbeki",
    role: "PROGRAMME_COORDINATOR",
    locale: "FR",
    isOrgUser: false,
  },
  {
    email: "lead.reviewer@aaprp.org",
    firstName: "Sarah",
    lastName: "Okonkwo",
    role: "LEAD_REVIEWER",
    locale: "EN",
    isOrgUser: false,
  },
  {
    email: "reviewer1@aaprp.org",
    firstName: "Ahmed",
    lastName: "Hassan",
    role: "PEER_REVIEWER",
    locale: "EN",
    isOrgUser: false,
  },
  {
    email: "reviewer2@aaprp.org",
    firstName: "Marie",
    lastName: "Kouassi",
    role: "PEER_REVIEWER",
    locale: "FR",
    isOrgUser: false,
  },
  {
    email: "steering@aaprp.org",
    firstName: "David",
    lastName: "Nkrumah",
    role: "STEERING_COMMITTEE",
    locale: "EN",
    isOrgUser: false,
  },
  // Org users (template - will be created per organization)
];

const ORG_USER_TEMPLATES: Omit<UserData, "email" | "isOrgUser">[] = [
  { firstName: "Org", lastName: "Admin", role: "ANSP_ADMIN", locale: "EN" },
  { firstName: "Safety", lastName: "Manager", role: "SAFETY_MANAGER", locale: "EN" },
  { firstName: "Quality", lastName: "Manager", role: "QUALITY_MANAGER", locale: "EN" },
  { firstName: "Staff", lastName: "Member", role: "STAFF", locale: "EN" },
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
  const rand = (index * 7 + 13) % total; // Deterministic pseudo-random

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
        region: ansp.region,
        membershipStatus: ansp.membershipStatus,
      },
      create: {
        nameEn: ansp.nameEn,
        nameFr: ansp.nameFr,
        icaoCode: ansp.icaoCode,
        country: ansp.country,
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
        role: userData.role,
        locale: userData.locale,
        isActive: true,
      },
      create: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
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
        role: adminTemplate.role,
        locale: adminTemplate.locale,
        organizationId: orgId,
        isActive: true,
      },
      create: {
        email: adminEmail,
        firstName: adminTemplate.firstName,
        lastName: `${adminTemplate.lastName} (${icaoCode})`,
        role: adminTemplate.role,
        locale: adminTemplate.locale,
        organizationId: orgId,
        isActive: true,
      },
    });

    userMap.set(adminEmail, adminUser.id);
    orgUserCount++;

    // Create safety manager for some orgs
    if (["ASECNA", "NAMA", "KCAA", "SACAA", "ECAA"].includes(icaoCode)) {
      const safetyTemplate = ORG_USER_TEMPLATES[1];
      const safetyEmail = `safety@${icaoCode.toLowerCase()}.example`;

      const safetyUser = await prisma.user.upsert({
        where: { email: safetyEmail },
        update: {
          firstName: safetyTemplate.firstName,
          lastName: `${safetyTemplate.lastName} (${icaoCode})`,
          role: safetyTemplate.role,
          locale: safetyTemplate.locale,
          organizationId: orgId,
          isActive: true,
        },
        create: {
          email: safetyEmail,
          firstName: safetyTemplate.firstName,
          lastName: `${safetyTemplate.lastName} (${icaoCode})`,
          role: safetyTemplate.role,
          locale: safetyTemplate.locale,
          organizationId: orgId,
          isActive: true,
        },
      });

      userMap.set(safetyEmail, safetyUser.id);
      orgUserCount++;
    }
  }

  console.log(`  ✓ Created ${orgUserCount} organization users`);
  return userMap;
}

async function seedAssessments(
  orgMap: Map<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userMap: Map<string, string>
): Promise<void> {
  console.log("\n📋 Seeding assessments...");

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
    console.log("  ⚠ Questionnaires not found. Run seed.ts first.");
    return;
  }

  console.log(`  Found ANS questionnaire with ${ansQuestionnaire.questions.length} questions`);
  console.log(`  Found SMS questionnaire with ${smsQuestionnaire.questions.length} questions`);

  // Define assessment scenarios
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
  }

  const scenarios: AssessmentScenario[] = [
    // Completed assessments
    {
      orgCode: "ASECNA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "ANS_USOAP_CMA",
      status: "COMPLETED",
      progress: 100,
      responseDistribution: { satisfactory: 85, notSatisfactory: 10, notApplicable: 5 },
      daysAgo: 30,
    },
    {
      orgCode: "ASECNA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "SMS_CANSO_SOE",
      status: "COMPLETED",
      progress: 100,
      responseDistribution: { A: 2, B: 8, C: 30, D: 45, E: 15 },
      daysAgo: 25,
    },
    {
      orgCode: "NAMA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "ANS_USOAP_CMA",
      status: "COMPLETED",
      progress: 100,
      responseDistribution: { satisfactory: 75, notSatisfactory: 20, notApplicable: 5 },
      daysAgo: 45,
    },
    // Under review
    {
      orgCode: "KCAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "ANS_USOAP_CMA",
      status: "UNDER_REVIEW",
      progress: 100,
      responseDistribution: { satisfactory: 80, notSatisfactory: 15, notApplicable: 5 },
      daysAgo: 10,
    },
    {
      orgCode: "SACAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "SMS_CANSO_SOE",
      status: "UNDER_REVIEW",
      progress: 100,
      responseDistribution: { A: 5, B: 10, C: 35, D: 40, E: 10 },
      daysAgo: 7,
    },
    // Submitted
    {
      orgCode: "ECAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "ANS_USOAP_CMA",
      status: "SUBMITTED",
      progress: 100,
      responseDistribution: { satisfactory: 70, notSatisfactory: 25, notApplicable: 5 },
      daysAgo: 3,
    },
    {
      orgCode: "TCAA",
      type: "GAP_ANALYSIS",
      questionnaireType: "SMS_CANSO_SOE",
      status: "SUBMITTED",
      progress: 100,
      responseDistribution: { A: 10, B: 20, C: 40, D: 25, E: 5 },
      daysAgo: 5,
    },
    // In progress
    {
      orgCode: "GCAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "ANS_USOAP_CMA",
      status: "DRAFT",
      progress: 65,
      responseDistribution: { satisfactory: 60, notSatisfactory: 30, notApplicable: 10 },
      daysAgo: 14,
      dueInDays: 21,
    },
    {
      orgCode: "UCAA",
      type: "SELF_ASSESSMENT",
      questionnaireType: "SMS_CANSO_SOE",
      status: "DRAFT",
      progress: 40,
      responseDistribution: { A: 8, B: 15, C: 40, D: 30, E: 7 },
      daysAgo: 20,
      dueInDays: 14,
    },
    {
      orgCode: "RCAA",
      type: "PEER_REVIEW",
      questionnaireType: "ANS_USOAP_CMA",
      status: "DRAFT",
      progress: 25,
      responseDistribution: { satisfactory: 50, notSatisfactory: 40, notApplicable: 10 },
      daysAgo: 7,
      dueInDays: 45,
    },
    // Just started
    {
      orgCode: "NAMA",
      type: "GAP_ANALYSIS",
      questionnaireType: "SMS_CANSO_SOE",
      status: "DRAFT",
      progress: 10,
      daysAgo: 2,
      dueInDays: 60,
    },
    {
      orgCode: "KCAA",
      type: "FOLLOW_UP",
      questionnaireType: "SMS_CANSO_SOE",
      status: "DRAFT",
      progress: 5,
      daysAgo: 1,
      dueInDays: 30,
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

    // Calculate dates
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - scenario.daysAgo);

    const dueDate = scenario.dueInDays
      ? new Date(Date.now() + scenario.dueInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        type: scenario.type,
        title: `${scenario.type.replace(/_/g, " ")} - ${scenario.orgCode} ${questionnaire.type === "ANS_USOAP_CMA" ? "ANS" : "SMS"} ${new Date().getFullYear()}`,
        description: `${scenario.type.replace(/_/g, " ")} using ${questionnaire.titleEn}`,
        questionnaireId: questionnaire.id,
        organizationId: orgId,
        status: scenario.status,
        progress: scenario.progress,
        startedAt: createdAt,
        submittedAt: ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(scenario.status)
          ? new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
          : null,
        completedAt: scenario.status === "COMPLETED"
          ? new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000)
          : null,
        dueDate,
        createdAt,
      },
    });

    assessmentCount++;

    // Create responses based on progress
    const totalQuestions = questionnaire.questions.length;
    const questionsToAnswer = Math.floor((scenario.progress / 100) * totalQuestions);

    for (let i = 0; i < questionsToAnswer; i++) {
      const question = questionnaire.questions[i];

      if (questionnaire.type === "ANS_USOAP_CMA") {
        const responseValue = generateANSResponse(
          i,
          scenario.responseDistribution as { satisfactory: number; notSatisfactory: number; notApplicable: number }
        );

        await prisma.assessmentResponse.create({
          data: {
            assessmentId: assessment.id,
            questionId: question.id,
            responseValue,
            notes: i % 5 === 0 ? `Sample evidence note for question ${i + 1}` : null,
            respondedAt: createdAt,
          },
        });
      } else {
        const maturityLevel = generateSMSMaturityLevel(
          i,
          scenario.responseDistribution as { A: number; B: number; C: number; D: number; E: number }
        );

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
            score: scoreMap[maturityLevel],
            notes: i % 5 === 0 ? `Sample evidence note for question ${i + 1}` : null,
            respondedAt: createdAt,
          },
        });
      }

      responseCount++;
    }

    // Create remaining empty responses
    for (let i = questionsToAnswer; i < totalQuestions; i++) {
      const question = questionnaire.questions[i];

      await prisma.assessmentResponse.create({
        data: {
          assessmentId: assessment.id,
          questionId: question.id,
        },
      });

      responseCount++;
    }

    // Calculate and update scores for completed/submitted assessments
    if (scenario.progress === 100 && ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(scenario.status)) {
      // Recalculate scores
      const responses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: assessment.id },
        include: { question: true },
      });

      if (questionnaire.type === "ANS_USOAP_CMA") {
        const satisfactory = responses.filter(r => r.responseValue === "SATISFACTORY").length;
        const notSatisfactory = responses.filter(r => r.responseValue === "NOT_SATISFACTORY").length;
        const applicable = satisfactory + notSatisfactory;
        const eiScore = applicable > 0 ? Math.round((satisfactory / applicable) * 100 * 100) / 100 : 0;

        await prisma.assessment.update({
          where: { id: assessment.id },
          data: {
            eiScore,
            overallScore: eiScore,
          },
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
          data: {
            maturityLevel: getLevel(avgScore),
            overallScore,
          },
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

  // Get some assessments
  const assessments = await prisma.assessment.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });

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
  }

  console.log(`  ✓ Created ${assessments.length} audit log entries`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("🚀 Starting demo data generation...");
  console.log("═".repeat(50));

  try {
    // 1. Seed organizations
    const orgMap = await seedOrganizations();
    console.log(`\n  Total organizations: ${orgMap.size}`);

    // 2. Seed users
    const userMap = await seedUsers(orgMap);
    console.log(`\n  Total users: ${userMap.size}`);

    // 3. Seed assessments
    await seedAssessments(orgMap, userMap);

    // 4. Seed audit logs
    await seedAuditLogs(userMap);

    console.log("\n═".repeat(50));
    console.log("✅ Demo data generation completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  • ${orgMap.size} organizations (African ANSPs)`);
    console.log(`  • ${userMap.size} users across all roles`);
    console.log(`  • Multiple assessments in various stages`);
    console.log(`  • Realistic response distributions`);

    console.log("\n🔑 Test Accounts:");
    console.log("  • admin@aaprp.org (Super Admin)");
    console.log("  • coordinator@aaprp.org (Programme Coordinator)");
    console.log("  • lead.reviewer@aaprp.org (Lead Reviewer)");
    console.log("  • admin@asecna.example (ASECNA Admin)");
    console.log("  • admin@nama.example (NAMA Admin)");
    console.log("  • admin@kcaa.example (KCAA Admin)");

  } catch (error) {
    console.error("\n❌ Demo data generation failed:", error);
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
