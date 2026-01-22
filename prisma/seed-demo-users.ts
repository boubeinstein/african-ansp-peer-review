/**
 * Seed Script: Demo Users and Reviewer Profiles
 *
 * Creates demo users with reviewer profiles for all 20 organizations:
 * - 2 reviewers per organization (1 Lead Qualified, 1 Certified)
 * - 3 system users (Admin, Coordinator, Steering Committee)
 *
 * Usage:
 *   npx tsx prisma/seed-demo-users.ts          # Seed data
 *   npx tsx prisma/seed-demo-users.ts cleanup  # Clean users
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole,
  ReviewerStatus,
  LanguageProficiency,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_PASSWORD = "Demo2024!";
const SALT_ROUNDS = 10;

// =============================================================================
// DATA
// =============================================================================

interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  orgCode: string;
  reviewerProfile?: {
    status: ReviewerStatus;
    expertiseAreas: string[];
    languages: { language: string; proficiency: LanguageProficiency }[];
    reviewsCompleted: number;
    yearsExperience: number;
    currentPosition: string;
    isAvailable: boolean;
  };
}

// System Users
const SYSTEM_USERS: DemoUser[] = [
  {
    email: "admin@aaprp.aero",
    firstName: "System",
    lastName: "Administrator",
    role: "SUPER_ADMIN",
    orgCode: "ASEC",
  },
  {
    email: "coordinator@aaprp.aero",
    firstName: "Pauline",
    lastName: "Runghen",
    role: "PROGRAMME_COORDINATOR",
    orgCode: "ASEC",
  },
  {
    email: "steering@aaprp.aero",
    firstName: "Emmanuel",
    lastName: "Chukwuma",
    role: "STEERING_COMMITTEE",
    orgCode: "NAMA",
  },
];

// Team 1: ASECNA & Southern Africa Partnership (8 reviewers)
const TEAM_1_USERS: DemoUser[] = [
  // ASECNA (Lead)
  {
    email: "amadou.diallo@asecna.aero",
    firstName: "Amadou",
    lastName: "Diallo",
    role: "REVIEWER",
    orgCode: "ASEC",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "ATM", "CNS"],
      languages: [
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 18,
      yearsExperience: 22,
      currentPosition: "Chief ATS Inspector",
      isAvailable: true,
    },
  },
  {
    email: "fatou.ndiaye@asecna.aero",
    firstName: "Fatou",
    lastName: "Ndiaye",
    role: "REVIEWER",
    orgCode: "ASEC",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "AIM"],
      languages: [
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 7,
      yearsExperience: 12,
      currentPosition: "SMS Specialist",
      isAvailable: true,
    },
  },
  // ATNS (South Africa)
  {
    email: "thabo.molefe@atns.co.za",
    firstName: "Thabo",
    lastName: "Molefe",
    role: "REVIEWER",
    orgCode: "ATNS",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "SAR", "MET"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 20,
      yearsExperience: 25,
      currentPosition: "Director of Operations",
      isAvailable: true,
    },
  },
  {
    email: "nomvula.dlamini@atns.co.za",
    firstName: "Nomvula",
    lastName: "Dlamini",
    role: "REVIEWER",
    orgCode: "ATNS",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["CNS", "AERODROME"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 9,
      yearsExperience: 14,
      currentPosition: "CNS Manager",
      isAvailable: true,
    },
  },
  // CAAB (Botswana)
  {
    email: "kago.mothibi@caab.co.bw",
    firstName: "Kago",
    lastName: "Mothibi",
    role: "REVIEWER",
    orgCode: "CAAB",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "PEL"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 12,
      yearsExperience: 18,
      currentPosition: "ATS Manager",
      isAvailable: true,
    },
  },
  {
    email: "lesego.phiri@caab.co.bw",
    firstName: "Lesego",
    lastName: "Phiri",
    role: "REVIEWER",
    orgCode: "CAAB",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "SAR"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 5,
      yearsExperience: 10,
      currentPosition: "Safety Officer",
      isAvailable: true,
    },
  },
  // ESWACAA (Eswatini)
  {
    email: "sipho.dlamini@eswacaa.org.sz",
    firstName: "Sipho",
    lastName: "Dlamini",
    role: "REVIEWER",
    orgCode: "ESWACAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 8,
      yearsExperience: 15,
      currentPosition: "ATS Supervisor",
      isAvailable: true,
    },
  },
  {
    email: "thandiwe.nkosi@eswacaa.org.sz",
    firstName: "Thandiwe",
    lastName: "Nkosi",
    role: "REVIEWER",
    orgCode: "ESWACAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "MET"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 4,
      yearsExperience: 8,
      currentPosition: "Quality Assurance Officer",
      isAvailable: true,
    },
  },
];

// Team 2: East African Community (10 reviewers)
const TEAM_2_USERS: DemoUser[] = [
  // KCAA (Kenya - Lead)
  {
    email: "james.ochieng@kcaa.or.ke",
    firstName: "James",
    lastName: "Ochieng",
    role: "REVIEWER",
    orgCode: "KCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "OPS", "PEL"],
      languages: [
        { language: "ENGLISH", proficiency: "NATIVE" },
        { language: "SWAHILI", proficiency: "NATIVE" },
      ],
      reviewsCompleted: 22,
      yearsExperience: 28,
      currentPosition: "Director of Air Navigation Services",
      isAvailable: true,
    },
  },
  {
    email: "wanjiku.kamau@kcaa.or.ke",
    firstName: "Wanjiku",
    lastName: "Kamau",
    role: "REVIEWER",
    orgCode: "KCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "AIM"],
      languages: [
        { language: "ENGLISH", proficiency: "NATIVE" },
        { language: "SWAHILI", proficiency: "NATIVE" },
      ],
      reviewsCompleted: 11,
      yearsExperience: 16,
      currentPosition: "Safety Manager",
      isAvailable: true,
    },
  },
  // TCAA (Tanzania)
  {
    email: "baraka.mwakasege@tcaa.go.tz",
    firstName: "Baraka",
    lastName: "Mwakasege",
    role: "REVIEWER",
    orgCode: "TCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "CNS", "ATM"],
      languages: [
        { language: "ENGLISH", proficiency: "ADVANCED" },
        { language: "SWAHILI", proficiency: "NATIVE" },
      ],
      reviewsCompleted: 15,
      yearsExperience: 20,
      currentPosition: "Chief Air Traffic Controller",
      isAvailable: true,
    },
  },
  {
    email: "rehema.mushi@tcaa.go.tz",
    firstName: "Rehema",
    lastName: "Mushi",
    role: "REVIEWER",
    orgCode: "TCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "SAR"],
      languages: [
        { language: "ENGLISH", proficiency: "ADVANCED" },
        { language: "SWAHILI", proficiency: "NATIVE" },
      ],
      reviewsCompleted: 6,
      yearsExperience: 11,
      currentPosition: "Safety Analyst",
      isAvailable: true,
    },
  },
  // UCAA (Uganda)
  {
    email: "moses.okello@ucaa.go.ug",
    firstName: "Moses",
    lastName: "Okello",
    role: "REVIEWER",
    orgCode: "UCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "MET"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 14,
      yearsExperience: 19,
      currentPosition: "ANS Manager",
      isAvailable: true,
    },
  },
  {
    email: "grace.nakato@ucaa.go.ug",
    firstName: "Grace",
    lastName: "Nakato",
    role: "REVIEWER",
    orgCode: "UCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "PEL"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 8,
      yearsExperience: 13,
      currentPosition: "Training Manager",
      isAvailable: true,
    },
  },
  // RCAA (Rwanda)
  {
    email: "jean.mugabo@rcaa.gov.rw",
    firstName: "Jean-Pierre",
    lastName: "Mugabo",
    role: "REVIEWER",
    orgCode: "RCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "CNS"],
      languages: [
        { language: "ENGLISH", proficiency: "ADVANCED" },
        { language: "FRENCH", proficiency: "NATIVE" },
      ],
      reviewsCompleted: 10,
      yearsExperience: 16,
      currentPosition: "ATS Director",
      isAvailable: true,
    },
  },
  {
    email: "claire.uwimana@rcaa.gov.rw",
    firstName: "Claire",
    lastName: "Uwimana",
    role: "REVIEWER",
    orgCode: "RCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "AIM"],
      languages: [
        { language: "ENGLISH", proficiency: "ADVANCED" },
        { language: "FRENCH", proficiency: "NATIVE" },
      ],
      reviewsCompleted: 5,
      yearsExperience: 9,
      currentPosition: "AIM Specialist",
      isAvailable: true,
    },
  },
  // BCAA (Burundi)
  {
    email: "pierre.ndayisaba@bcaa.gov.bi",
    firstName: "Pierre",
    lastName: "Ndayisaba",
    role: "REVIEWER",
    orgCode: "BCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "SAR"],
      languages: [
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 7,
      yearsExperience: 14,
      currentPosition: "ATS Chief",
      isAvailable: true,
    },
  },
  {
    email: "aline.niyonzima@bcaa.gov.bi",
    firstName: "Aline",
    lastName: "Niyonzima",
    role: "REVIEWER",
    orgCode: "BCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "MET"],
      languages: [
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 3,
      yearsExperience: 7,
      currentPosition: "Safety Officer",
      isAvailable: true,
    },
  },
];

// Team 3: West African Anglophone (6 reviewers)
const TEAM_3_USERS: DemoUser[] = [
  // NAMA (Nigeria - Lead)
  {
    email: "chukwuemeka.okonkwo@nama.gov.ng",
    firstName: "Chukwuemeka",
    lastName: "Okonkwo",
    role: "REVIEWER",
    orgCode: "NAMA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "ATM", "CNS"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 25,
      yearsExperience: 30,
      currentPosition: "Director of Operations",
      isAvailable: true,
    },
  },
  {
    email: "ngozi.adeyemi@nama.gov.ng",
    firstName: "Ngozi",
    lastName: "Adeyemi",
    role: "REVIEWER",
    orgCode: "NAMA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "AIM"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 12,
      yearsExperience: 17,
      currentPosition: "SMS Manager",
      isAvailable: true,
    },
  },
  // GCAA (Ghana)
  {
    email: "kwame.asante@gcaa.com.gh",
    firstName: "Kwame",
    lastName: "Asante",
    role: "REVIEWER",
    orgCode: "GCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "SAR"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 16,
      yearsExperience: 21,
      currentPosition: "Chief ATS Officer",
      isAvailable: true,
    },
  },
  {
    email: "abena.mensah@gcaa.com.gh",
    firstName: "Abena",
    lastName: "Mensah",
    role: "REVIEWER",
    orgCode: "GCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "MET"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 8,
      yearsExperience: 12,
      currentPosition: "Quality Manager",
      isAvailable: true,
    },
  },
  // RFIR (Roberts FIR - Liberia)
  {
    email: "sekou.camara@lcaa.gov.lr",
    firstName: "Sekou",
    lastName: "Camara",
    role: "REVIEWER",
    orgCode: "RFIR",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "OPS", "AIM"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 11,
      yearsExperience: 18,
      currentPosition: "ANS Director",
      isAvailable: true,
    },
  },
  {
    email: "mariama.bah@lcaa.gov.lr",
    firstName: "Mariama",
    lastName: "Bah",
    role: "REVIEWER",
    orgCode: "RFIR",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "SAR"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 5,
      yearsExperience: 9,
      currentPosition: "Safety Specialist",
      isAvailable: true,
    },
  },
];

// Team 4: Southern & Eastern Africa (10 reviewers)
const TEAM_4_USERS: DemoUser[] = [
  // ADM (Mozambique - Lead)
  {
    email: "carlos.machava@aeroportos.co.mz",
    firstName: "Carlos",
    lastName: "Machava",
    role: "REVIEWER",
    orgCode: "ADM",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "CNS"],
      languages: [
        { language: "PORTUGUESE", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 14,
      yearsExperience: 20,
      currentPosition: "ANS Director",
      isAvailable: true,
    },
  },
  {
    email: "ana.tembe@aeroportos.co.mz",
    firstName: "Ana",
    lastName: "Tembe",
    role: "REVIEWER",
    orgCode: "ADM",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "AIM"],
      languages: [
        { language: "PORTUGUESE", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 6,
      yearsExperience: 11,
      currentPosition: "Safety Manager",
      isAvailable: true,
    },
  },
  // DCA-MW (Malawi)
  {
    email: "chimwemwe.banda@dca.gov.mw",
    firstName: "Chimwemwe",
    lastName: "Banda",
    role: "REVIEWER",
    orgCode: "DCA-MW",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "MET"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 9,
      yearsExperience: 15,
      currentPosition: "ATS Manager",
      isAvailable: true,
    },
  },
  {
    email: "tionge.phiri@dca.gov.mw",
    firstName: "Tionge",
    lastName: "Phiri",
    role: "REVIEWER",
    orgCode: "DCA-MW",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "SAR"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 4,
      yearsExperience: 8,
      currentPosition: "Safety Officer",
      isAvailable: true,
    },
  },
  // ADEMA (Madagascar)
  {
    email: "jean.rakoto@adema.mg",
    firstName: "Jean-Claude",
    lastName: "Rakotomalala",
    role: "REVIEWER",
    orgCode: "ADEMA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "CNS", "AERODROME"],
      languages: [
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 11,
      yearsExperience: 17,
      currentPosition: "Technical Director",
      isAvailable: true,
    },
  },
  {
    email: "hery.andria@adema.mg",
    firstName: "Hery",
    lastName: "Andriamanana",
    role: "REVIEWER",
    orgCode: "ADEMA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "PEL"],
      languages: [
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 5,
      yearsExperience: 10,
      currentPosition: "Training Coordinator",
      isAvailable: true,
    },
  },
  // CAAZ (Zimbabwe)
  {
    email: "tendai.moyo@caaz.co.zw",
    firstName: "Tendai",
    lastName: "Moyo",
    role: "REVIEWER",
    orgCode: "CAAZ",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "ATM", "SAR"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 13,
      yearsExperience: 19,
      currentPosition: "Chief ATC",
      isAvailable: true,
    },
  },
  {
    email: "chiedza.ncube@caaz.co.zw",
    firstName: "Chiedza",
    lastName: "Ncube",
    role: "REVIEWER",
    orgCode: "CAAZ",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "AIM"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 7,
      yearsExperience: 12,
      currentPosition: "AIM Manager",
      isAvailable: true,
    },
  },
  // ZACL (Zambia)
  {
    email: "mulenga.chanda@zacl.co.zm",
    firstName: "Mulenga",
    lastName: "Chanda",
    role: "REVIEWER",
    orgCode: "ZACL",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "CNS", "MET"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 10,
      yearsExperience: 16,
      currentPosition: "ANS Manager",
      isAvailable: true,
    },
  },
  {
    email: "natasha.mumba@zacl.co.zm",
    firstName: "Natasha",
    lastName: "Mumba",
    role: "REVIEWER",
    orgCode: "ZACL",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "AERODROME"],
      languages: [{ language: "ENGLISH", proficiency: "NATIVE" }],
      reviewsCompleted: 6,
      yearsExperience: 11,
      currentPosition: "Safety Analyst",
      isAvailable: true,
    },
  },
];

// Team 5: Northern Africa (6 reviewers)
const TEAM_5_USERS: DemoUser[] = [
  // ONDA (Morocco - Lead)
  {
    email: "youssef.benali@onda.ma",
    firstName: "Youssef",
    lastName: "Benali",
    role: "REVIEWER",
    orgCode: "ONDA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "ATM", "CNS"],
      languages: [
        { language: "ARABIC", proficiency: "NATIVE" },
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 19,
      yearsExperience: 24,
      currentPosition: "Director of Operations",
      isAvailable: true,
    },
  },
  {
    email: "fatima.alaoui@onda.ma",
    firstName: "Fatima",
    lastName: "Alaoui",
    role: "REVIEWER",
    orgCode: "ONDA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "AIM"],
      languages: [
        { language: "ARABIC", proficiency: "NATIVE" },
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 9,
      yearsExperience: 14,
      currentPosition: "SMS Manager",
      isAvailable: true,
    },
  },
  // OACA (Tunisia)
  {
    email: "mohamed.trabelsi@oaca.nat.tn",
    firstName: "Mohamed",
    lastName: "Trabelsi",
    role: "REVIEWER",
    orgCode: "OACA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "SAR"],
      languages: [
        { language: "ARABIC", proficiency: "NATIVE" },
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 15,
      yearsExperience: 21,
      currentPosition: "Chief of ATS",
      isAvailable: true,
    },
  },
  {
    email: "leila.chaabane@oaca.nat.tn",
    firstName: "Leila",
    lastName: "Chaabane",
    role: "REVIEWER",
    orgCode: "OACA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "MET"],
      languages: [
        { language: "ARABIC", proficiency: "NATIVE" },
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 7,
      yearsExperience: 12,
      currentPosition: "Quality Manager",
      isAvailable: true,
    },
  },
  // ENNA (Algeria)
  {
    email: "karim.boudiaf@enna.dz",
    firstName: "Karim",
    lastName: "Boudiaf",
    role: "REVIEWER",
    orgCode: "ENNA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "CNS", "PEL"],
      languages: [
        { language: "ARABIC", proficiency: "NATIVE" },
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 12,
      yearsExperience: 18,
      currentPosition: "ANS Director",
      isAvailable: true,
    },
  },
  {
    email: "samira.hadj@enna.dz",
    firstName: "Samira",
    lastName: "Hadj",
    role: "REVIEWER",
    orgCode: "ENNA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS", "AIM"],
      languages: [
        { language: "ARABIC", proficiency: "NATIVE" },
        { language: "FRENCH", proficiency: "NATIVE" },
        { language: "ENGLISH", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 6,
      yearsExperience: 11,
      currentPosition: "Safety Specialist",
      isAvailable: true,
    },
  },
];

// Combine all users
const ALL_USERS: DemoUser[] = [
  ...SYSTEM_USERS,
  ...TEAM_1_USERS,
  ...TEAM_2_USERS,
  ...TEAM_3_USERS,
  ...TEAM_4_USERS,
  ...TEAM_5_USERS,
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function getOrgIdMap(): Promise<Map<string, string>> {
  const orgs = await prisma.organization.findMany({
    select: { id: true, code: true },
  });
  return new Map(orgs.map((o) => [o.code, o.id]));
}

async function seedUsers(): Promise<void> {
  console.log("\n👤 Seeding Users and Reviewer Profiles...\n");

  const orgIdMap = await getOrgIdMap();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  let userCount = 0;
  let reviewerCount = 0;

  for (const userData of ALL_USERS) {
    const orgId = orgIdMap.get(userData.orgCode);
    if (!orgId) {
      console.log(`  ⚠️ Org not found for ${userData.email}: ${userData.orgCode}`);
      continue;
    }

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        organizationId: orgId,
        isActive: true,
      },
      create: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        role: userData.role,
        organizationId: orgId,
        isActive: true,
        emailVerified: true,
      },
    });

    userCount++;

    // Create reviewer profile if specified
    if (userData.reviewerProfile) {
      const profile = await prisma.reviewerProfile.upsert({
        where: { userId: user.id },
        update: {
          status: userData.reviewerProfile.status,
          expertiseAreas: userData.reviewerProfile.expertiseAreas,
          reviewsCompleted: userData.reviewerProfile.reviewsCompleted,
          yearsExperience: userData.reviewerProfile.yearsExperience,
          currentPosition: userData.reviewerProfile.currentPosition,
          isAvailable: userData.reviewerProfile.isAvailable,
          homeOrganizationId: orgId,
        },
        create: {
          userId: user.id,
          status: userData.reviewerProfile.status,
          expertiseAreas: userData.reviewerProfile.expertiseAreas,
          reviewsCompleted: userData.reviewerProfile.reviewsCompleted,
          yearsExperience: userData.reviewerProfile.yearsExperience,
          currentPosition: userData.reviewerProfile.currentPosition,
          isAvailable: userData.reviewerProfile.isAvailable,
          homeOrganizationId: orgId,
        },
      });

      // Add languages
      for (const lang of userData.reviewerProfile.languages) {
        await prisma.reviewerLanguage.upsert({
          where: {
            profileId_language: {
              profileId: profile.id,
              language: lang.language,
            },
          },
          update: { proficiency: lang.proficiency },
          create: {
            profileId: profile.id,
            language: lang.language,
            proficiency: lang.proficiency,
          },
        });
      }

      reviewerCount++;
      console.log(
        `  ✅ ${userData.firstName} ${userData.lastName} (${userData.orgCode}) - ${userData.reviewerProfile.status}`
      );
    } else {
      console.log(
        `  ✅ ${userData.firstName} ${userData.lastName} (${userData.orgCode}) - ${userData.role}`
      );
    }
  }

  console.log(`\n  Total: ${userCount} users, ${reviewerCount} reviewer profiles`);
}

async function cleanup(): Promise<void> {
  console.log("\n🧹 Cleaning up users...\n");

  // Delete in dependency order
  await prisma.reviewerLanguage.deleteMany({});
  console.log("  ✅ Reviewer languages deleted");

  await prisma.reviewerProfile.deleteMany({});
  console.log("  ✅ Reviewer profiles deleted");

  await prisma.user.deleteMany({});
  console.log("  ✅ Users deleted");
}

async function printSummary(): Promise<void> {
  console.log("\n" + "═".repeat(60));
  console.log("📊 USER SEED SUMMARY");
  console.log("═".repeat(60));

  const usersByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: { id: true },
  });

  console.log("\nUsers by Role:");
  for (const group of usersByRole) {
    console.log(`  ${group.role}: ${group._count.id}`);
  }

  const reviewersByStatus = await prisma.reviewerProfile.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  console.log("\nReviewers by Status:");
  for (const group of reviewersByStatus) {
    console.log(`  ${group.status}: ${group._count.id}`);
  }

  const totalUsers = await prisma.user.count();
  const totalReviewers = await prisma.reviewerProfile.count();
  console.log(`\nTotal: ${totalUsers} users, ${totalReviewers} reviewers`);
  console.log(`\nDefault password: ${DEFAULT_PASSWORD}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const command = process.argv[2];

  try {
    if (command === "cleanup") {
      await cleanup();
      console.log("\n✅ Cleanup complete");
    } else {
      await seedUsers();
      await printSummary();
      console.log("\n✅ Seeding complete");
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();