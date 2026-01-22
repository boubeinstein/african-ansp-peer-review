/**
 * Seed Script: Demo Users with Reviewer Profiles
 *
 * Creates users with reviewer profiles for each organization:
 * - 2 reviewers per organization (40 total)
 * - System admin and programme coordinator accounts
 * - Proper expertise areas and language proficiencies
 *
 * Usage:
 *   npx tsx prisma/seed-demo-users.ts          # Seed data
 *   npx tsx prisma/seed-demo-users.ts cleanup  # Clean and reseed
 */

import {
  PrismaClient,
  UserRole,
  ReviewerStatus,
  ExpertiseArea,
  Language,
  LanguageProficiency,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// =============================================================================
// TYPES
// =============================================================================

interface LanguageSkill {
  language: Language;
  proficiency: LanguageProficiency;
  isNative?: boolean;
}

interface ReviewerProfileData {
  status: ReviewerStatus;
  expertiseAreas: ExpertiseArea[];
  languages: LanguageSkill[];
  reviewsCompleted: number;
  reviewsAsLead?: number;
  isAvailable: boolean;
  currentPosition: string;
  yearsExperience: number;
}

interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  orgCode: string;
  reviewerProfile?: ReviewerProfileData;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_PASSWORD = "Demo2024!";
const SALT_ROUNDS = 10;

// =============================================================================
// SYSTEM USERS
// =============================================================================

const SYSTEM_USERS: DemoUser[] = [
  {
    email: "admin@aaprp.org",
    firstName: "System",
    lastName: "Administrator",
    role: "SUPER_ADMIN",
    orgCode: "ASEC",
  },
  {
    email: "coordinator@aaprp.org",
    firstName: "Pauline",
    lastName: "Runghen",
    role: "PROGRAMME_COORDINATOR",
    orgCode: "ASEC",
  },
  {
    email: "steering@aaprp.org",
    firstName: "Emmanuel",
    lastName: "Chukwuma",
    role: "STEERING_COMMITTEE",
    orgCode: "NAMA",
  },
];

// =============================================================================
// TEAM 1: ASECNA & Southern Africa Partnership (4 orgs × 2 = 8 reviewers)
// =============================================================================

const TEAM_1_USERS: DemoUser[] = [
  // ASECNA (Senegal HQ)
  {
    email: "amadou.diallo@asecna.org",
    firstName: "Amadou",
    lastName: "Diallo",
    role: "LEAD_REVIEWER",
    orgCode: "ASEC",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "SMS_POLICY", "SMS_RISK"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 12,
      reviewsAsLead: 5,
      isAvailable: true,
      currentPosition: "Chief Air Traffic Services",
      yearsExperience: 18,
    },
  },
  {
    email: "fatou.ndiaye@asecna.org",
    firstName: "Fatou",
    lastName: "Ndiaye",
    role: "PEER_REVIEWER",
    orgCode: "ASEC",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_ASSURANCE", "AIM_AIS"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 5,
      isAvailable: true,
      currentPosition: "Safety Manager",
      yearsExperience: 10,
    },
  },
  // ATNS (South Africa)
  {
    email: "thabo.molefe@atns.co.za",
    firstName: "Thabo",
    lastName: "Molefe",
    role: "LEAD_REVIEWER",
    orgCode: "ATNS",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "SAR", "MET"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 15,
      reviewsAsLead: 7,
      isAvailable: true,
      currentPosition: "Director of Operations",
      yearsExperience: 22,
    },
  },
  {
    email: "lindiwe.dlamini@atns.co.za",
    firstName: "Lindiwe",
    lastName: "Dlamini",
    role: "PEER_REVIEWER",
    orgCode: "ATNS",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["CNS", "ENGINEERING"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 6,
      isAvailable: true,
      currentPosition: "CNS Systems Manager",
      yearsExperience: 12,
    },
  },
  // Botswana
  {
    email: "kgosi.mothibi@caab.co.bw",
    firstName: "Kgosi",
    lastName: "Mothibi",
    role: "LEAD_REVIEWER",
    orgCode: "CAAB",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "QMS"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 9,
      reviewsAsLead: 3,
      isAvailable: true,
      currentPosition: "Chief Operations Officer",
      yearsExperience: 16,
    },
  },
  {
    email: "mpho.tau@caab.co.bw",
    firstName: "Mpho",
    lastName: "Tau",
    role: "PEER_REVIEWER",
    orgCode: "CAAB",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_PROMOTION", "TRAINING"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 4,
      isAvailable: true,
      currentPosition: "Training Coordinator",
      yearsExperience: 8,
    },
  },
  // Eswatini
  {
    email: "sipho.dlamini@eswacaa.org.sz",
    firstName: "Sipho",
    lastName: "Dlamini",
    role: "LEAD_REVIEWER",
    orgCode: "ESWACAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "PANS_OPS", "SMS_RISK"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 7,
      reviewsAsLead: 2,
      isAvailable: true,
      currentPosition: "Director General",
      yearsExperience: 20,
    },
  },
  {
    email: "nomsa.simelane@eswacaa.org.sz",
    firstName: "Nomsa",
    lastName: "Simelane",
    role: "PEER_REVIEWER",
    orgCode: "ESWACAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["AIM_AIS", "MET"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 3,
      isAvailable: true,
      currentPosition: "AIS Supervisor",
      yearsExperience: 9,
    },
  },
];

// =============================================================================
// TEAM 2: East African Community (5 orgs × 2 = 10 reviewers)
// =============================================================================

const TEAM_2_USERS: DemoUser[] = [
  // Kenya
  {
    email: "james.ochieng@kcaa.or.ke",
    firstName: "James",
    lastName: "Ochieng",
    role: "LEAD_REVIEWER",
    orgCode: "KCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "PANS_OPS", "SMS_POLICY"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 18,
      reviewsAsLead: 8,
      isAvailable: true,
      currentPosition: "Director Air Navigation Services",
      yearsExperience: 25,
    },
  },
  {
    email: "grace.wanjiku@kcaa.or.ke",
    firstName: "Grace",
    lastName: "Wanjiku",
    role: "PEER_REVIEWER",
    orgCode: "KCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_ASSURANCE", "QMS"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 7,
      isAvailable: true,
      currentPosition: "Quality Assurance Manager",
      yearsExperience: 12,
    },
  },
  // Tanzania
  {
    email: "john.mwakasege@tcaa.go.tz",
    firstName: "John",
    lastName: "Mwakasege",
    role: "LEAD_REVIEWER",
    orgCode: "TCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "SAR", "AERODROME"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 14,
      reviewsAsLead: 5,
      isAvailable: true,
      currentPosition: "Chief Air Traffic Controller",
      yearsExperience: 20,
    },
  },
  {
    email: "amina.hassan@tcaa.go.tz",
    firstName: "Amina",
    lastName: "Hassan",
    role: "PEER_REVIEWER",
    orgCode: "TCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["MET", "AIM_AIS"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 5,
      isAvailable: true,
      currentPosition: "MET Services Coordinator",
      yearsExperience: 11,
    },
  },
  // Uganda
  {
    email: "david.okello@ucaa.go.ug",
    firstName: "David",
    lastName: "Okello",
    role: "LEAD_REVIEWER",
    orgCode: "UCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "CNS", "SMS_RISK"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 11,
      reviewsAsLead: 4,
      isAvailable: true,
      currentPosition: "Director ANS",
      yearsExperience: 18,
    },
  },
  {
    email: "sarah.nambi@ucaa.go.ug",
    firstName: "Sarah",
    lastName: "Nambi",
    role: "PEER_REVIEWER",
    orgCode: "UCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_PROMOTION", "TRAINING"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 4,
      isAvailable: true,
      currentPosition: "Safety Promotion Officer",
      yearsExperience: 7,
    },
  },
  // Rwanda
  {
    email: "emmanuel.mugabo@rcaa.gov.rw",
    firstName: "Emmanuel",
    lastName: "Mugabo",
    role: "LEAD_REVIEWER",
    orgCode: "RCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "QMS"],
      languages: [
        { language: "EN", proficiency: "ADVANCED" },
        { language: "FR", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 10,
      reviewsAsLead: 3,
      isAvailable: true,
      currentPosition: "Chief Operations",
      yearsExperience: 15,
    },
  },
  {
    email: "claudine.uwimana@rcaa.gov.rw",
    firstName: "Claudine",
    lastName: "Uwimana",
    role: "PEER_REVIEWER",
    orgCode: "RCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_ASSURANCE", "AIM_AIS"],
      languages: [
        { language: "EN", proficiency: "ADVANCED" },
        { language: "FR", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 4,
      isAvailable: true,
      currentPosition: "Safety Analyst",
      yearsExperience: 8,
    },
  },
  // Burundi
  {
    email: "pierre.niyonzima@bcaa.gov.bi",
    firstName: "Pierre",
    lastName: "Niyonzima",
    role: "LEAD_REVIEWER",
    orgCode: "BCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "PANS_OPS", "SAR"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 8,
      reviewsAsLead: 2,
      isAvailable: true,
      currentPosition: "Director Air Navigation",
      yearsExperience: 17,
    },
  },
  {
    email: "marie.ndayisaba@bcaa.gov.bi",
    firstName: "Marie",
    lastName: "Ndayisaba",
    role: "PEER_REVIEWER",
    orgCode: "BCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["MET", "SMS_PROMOTION"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 3,
      isAvailable: true,
      currentPosition: "MET Officer",
      yearsExperience: 9,
    },
  },
];

// =============================================================================
// TEAM 3: West African Anglophone (3 orgs × 2 = 6 reviewers)
// =============================================================================

const TEAM_3_USERS: DemoUser[] = [
  // NAMA Nigeria
  {
    email: "chukwuemeka.okonkwo@nama.gov.ng",
    firstName: "Chukwuemeka",
    lastName: "Okonkwo",
    role: "LEAD_REVIEWER",
    orgCode: "NAMA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "CNS", "SMS_POLICY"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 20,
      reviewsAsLead: 10,
      isAvailable: true,
      currentPosition: "Managing Director",
      yearsExperience: 28,
    },
  },
  {
    email: "ngozi.adeyemi@nama.gov.ng",
    firstName: "Ngozi",
    lastName: "Adeyemi",
    role: "PEER_REVIEWER",
    orgCode: "NAMA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_ASSURANCE", "AIM_AIS"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 8,
      isAvailable: true,
      currentPosition: "Safety Manager",
      yearsExperience: 14,
    },
  },
  // GCAA Ghana
  {
    email: "kwame.asante@gcaa.com.gh",
    firstName: "Kwame",
    lastName: "Asante",
    role: "LEAD_REVIEWER",
    orgCode: "GCAA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "SAR"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 14,
      reviewsAsLead: 6,
      isAvailable: true,
      currentPosition: "Director ANS",
      yearsExperience: 21,
    },
  },
  {
    email: "abena.mensah@gcaa.com.gh",
    firstName: "Abena",
    lastName: "Mensah",
    role: "PEER_REVIEWER",
    orgCode: "GCAA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_RISK", "MET"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 6,
      isAvailable: true,
      currentPosition: "Risk Management Officer",
      yearsExperience: 10,
    },
  },
  // Roberts FIR (Liberia)
  {
    email: "sekou.camara@rfir.gov.lr",
    firstName: "Sekou",
    lastName: "Camara",
    role: "LEAD_REVIEWER",
    orgCode: "RFIR",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "PANS_OPS", "AIM_AIS"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 10,
      reviewsAsLead: 4,
      isAvailable: true,
      currentPosition: "FIR Director",
      yearsExperience: 19,
    },
  },
  {
    email: "mariama.bah@rfir.gov.lr",
    firstName: "Mariama",
    lastName: "Bah",
    role: "PEER_REVIEWER",
    orgCode: "RFIR",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_PROMOTION", "SAR"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 4,
      isAvailable: true,
      currentPosition: "SAR Coordinator",
      yearsExperience: 8,
    },
  },
];

// =============================================================================
// TEAM 4: Southern & Eastern Africa (5 orgs × 2 = 10 reviewers)
// =============================================================================

const TEAM_4_USERS: DemoUser[] = [
  // Mozambique
  {
    email: "carlos.machel@adm.co.mz",
    firstName: "Carlos",
    lastName: "Machel",
    role: "LEAD_REVIEWER",
    orgCode: "ADM",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "SMS_POLICY"],
      languages: [
        { language: "PT", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 11,
      reviewsAsLead: 4,
      isAvailable: true,
      currentPosition: "Director of Operations",
      yearsExperience: 19,
    },
  },
  {
    email: "maria.tembe@adm.co.mz",
    firstName: "Maria",
    lastName: "Tembe",
    role: "PEER_REVIEWER",
    orgCode: "ADM",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_ASSURANCE", "QMS"],
      languages: [
        { language: "PT", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 5,
      isAvailable: true,
      currentPosition: "Quality Manager",
      yearsExperience: 11,
    },
  },
  // Malawi
  {
    email: "john.banda@dca.gov.mw",
    firstName: "John",
    lastName: "Banda",
    role: "LEAD_REVIEWER",
    orgCode: "DCA-MW",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "CNS", "SAR"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 9,
      reviewsAsLead: 3,
      isAvailable: true,
      currentPosition: "Director ANS",
      yearsExperience: 17,
    },
  },
  {
    email: "esther.phiri@dca.gov.mw",
    firstName: "Esther",
    lastName: "Phiri",
    role: "PEER_REVIEWER",
    orgCode: "DCA-MW",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["MET", "AIM_AIS"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 4,
      isAvailable: true,
      currentPosition: "MET Services Manager",
      yearsExperience: 9,
    },
  },
  // Madagascar
  {
    email: "jean.rakoto@adema.mg",
    firstName: "Jean",
    lastName: "Rakoto",
    role: "LEAD_REVIEWER",
    orgCode: "ADEMA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "PANS_OPS", "AERODROME"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 12,
      reviewsAsLead: 5,
      isAvailable: true,
      currentPosition: "Director General",
      yearsExperience: 22,
    },
  },
  {
    email: "lala.razafy@adema.mg",
    firstName: "Lala",
    lastName: "Razafy",
    role: "PEER_REVIEWER",
    orgCode: "ADEMA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_RISK", "TRAINING"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 6,
      isAvailable: true,
      currentPosition: "Training Manager",
      yearsExperience: 12,
    },
  },
  // Zimbabwe
  {
    email: "tendai.moyo@caaz.co.zw",
    firstName: "Tendai",
    lastName: "Moyo",
    role: "LEAD_REVIEWER",
    orgCode: "CAAZ",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "SMS_POLICY", "QMS"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 13,
      reviewsAsLead: 5,
      isAvailable: true,
      currentPosition: "Chief Executive Officer",
      yearsExperience: 24,
    },
  },
  {
    email: "chipo.mutasa@caaz.co.zw",
    firstName: "Chipo",
    lastName: "Mutasa",
    role: "PEER_REVIEWER",
    orgCode: "CAAZ",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_ASSURANCE", "ENGINEERING"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 5,
      isAvailable: true,
      currentPosition: "Engineering Manager",
      yearsExperience: 10,
    },
  },
  // Zambia
  {
    email: "mwamba.chisanga@zacl.co.zm",
    firstName: "Mwamba",
    lastName: "Chisanga",
    role: "LEAD_REVIEWER",
    orgCode: "ZACL",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "RFF"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 10,
      reviewsAsLead: 4,
      isAvailable: true,
      currentPosition: "Managing Director",
      yearsExperience: 20,
    },
  },
  {
    email: "natasha.mwale@zacl.co.zm",
    firstName: "Natasha",
    lastName: "Mwale",
    role: "PEER_REVIEWER",
    orgCode: "ZACL",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_PROMOTION", "SAR"],
      languages: [
        { language: "EN", proficiency: "NATIVE", isNative: true },
      ],
      reviewsCompleted: 4,
      isAvailable: true,
      currentPosition: "Safety Promotion Officer",
      yearsExperience: 7,
    },
  },
];

// =============================================================================
// TEAM 5: Northern Africa (3 orgs × 2 = 6 reviewers)
// =============================================================================

const TEAM_5_USERS: DemoUser[] = [
  // Morocco
  {
    email: "mohammed.benali@onda.ma",
    firstName: "Mohammed",
    lastName: "Benali",
    role: "LEAD_REVIEWER",
    orgCode: "ONDA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "CNS", "SMS_POLICY"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "AR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 16,
      reviewsAsLead: 7,
      isAvailable: true,
      currentPosition: "Director General",
      yearsExperience: 25,
    },
  },
  {
    email: "fatima.elhilali@onda.ma",
    firstName: "Fatima",
    lastName: "El Hilali",
    role: "PEER_REVIEWER",
    orgCode: "ONDA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_ASSURANCE", "QMS"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "AR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 7,
      isAvailable: true,
      currentPosition: "Quality Manager",
      yearsExperience: 13,
    },
  },
  // Tunisia
  {
    email: "karim.benslimane@oaca.nat.tn",
    firstName: "Karim",
    lastName: "Ben Slimane",
    role: "LEAD_REVIEWER",
    orgCode: "OACA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "AERODROME", "PANS_OPS"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "AR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 13,
      reviewsAsLead: 5,
      isAvailable: true,
      currentPosition: "Director Operations",
      yearsExperience: 21,
    },
  },
  {
    email: "leila.belhadj@oaca.nat.tn",
    firstName: "Leila",
    lastName: "Belhadj",
    role: "PEER_REVIEWER",
    orgCode: "OACA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_RISK", "MET"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "AR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 5,
      isAvailable: true,
      currentPosition: "Risk Manager",
      yearsExperience: 10,
    },
  },
  // Algeria
  {
    email: "ahmed.boumediene@enna.dz",
    firstName: "Ahmed",
    lastName: "Boumediene",
    role: "LEAD_REVIEWER",
    orgCode: "ENNA",
    reviewerProfile: {
      status: "LEAD_QUALIFIED",
      expertiseAreas: ["ATS", "SAR", "CNS"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "AR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "ADVANCED" },
      ],
      reviewsCompleted: 14,
      reviewsAsLead: 6,
      isAvailable: true,
      currentPosition: "Director General",
      yearsExperience: 23,
    },
  },
  {
    email: "nadia.hadjadj@enna.dz",
    firstName: "Nadia",
    lastName: "Hadjadj",
    role: "PEER_REVIEWER",
    orgCode: "ENNA",
    reviewerProfile: {
      status: "CERTIFIED",
      expertiseAreas: ["SMS_PROMOTION", "AIM_AIS"],
      languages: [
        { language: "FR", proficiency: "NATIVE", isNative: true },
        { language: "AR", proficiency: "NATIVE", isNative: true },
        { language: "EN", proficiency: "INTERMEDIATE" },
      ],
      reviewsCompleted: 6,
      isAvailable: true,
      currentPosition: "AIS Manager",
      yearsExperience: 11,
    },
  },
];

// =============================================================================
// COMBINE ALL USERS
// =============================================================================

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

async function getOrganizationByCode(code: string): Promise<string | null> {
  // Try to find by icaoCode first, then by matching pattern in nameEn
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { icaoCode: code },
        { nameEn: { contains: code, mode: "insensitive" } },
      ],
    },
  });
  return org?.id ?? null;
}

async function cleanup() {
  console.log("🧹 Cleaning up existing demo users...");

  const emails = ALL_USERS.map((u) => u.email);

  // Get user IDs first
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  if (userIds.length > 0) {
    // Delete reviewer languages
    await prisma.reviewerLanguage.deleteMany({
      where: {
        reviewerProfile: { userId: { in: userIds } },
      },
    });

    // Delete reviewer profiles
    await prisma.reviewerProfile.deleteMany({
      where: { userId: { in: userIds } },
    });

    // Delete users
    const deleted = await prisma.user.deleteMany({
      where: { email: { in: emails } },
    });
    console.log(`   Deleted ${deleted.count} users`);
  } else {
    console.log("   No users to clean up");
  }
}

async function seedUsers() {
  console.log("\n👥 Creating demo users...");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  let created = 0;
  let skipped = 0;

  for (const userData of ALL_USERS) {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`   ⏭️  ${userData.email} already exists`);
      skipped++;
      continue;
    }

    // Get organization ID
    const orgId = await getOrganizationByCode(userData.orgCode);
    if (!orgId) {
      console.log(`   ⚠️  Organization ${userData.orgCode} not found for ${userData.email}`);
      continue;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        role: userData.role,
        organizationId: orgId,
        emailVerified: new Date(),
        isActive: true,
      },
    });

    // Create reviewer profile if specified
    if (userData.reviewerProfile) {
      const profile = userData.reviewerProfile;
      const isLeadQualified = profile.status === "LEAD_QUALIFIED";

      const reviewerProfile = await prisma.reviewerProfile.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          homeOrganizationId: orgId,
          status: profile.status,
          expertiseAreas: profile.expertiseAreas,
          reviewsCompleted: profile.reviewsCompleted,
          reviewsAsLead: profile.reviewsAsLead ?? 0,
          isAvailable: profile.isAvailable,
          isLeadQualified,
          leadQualifiedAt: isLeadQualified ? new Date() : null,
          certifiedAt: new Date(),
          selectedAt: new Date(),
          nominatedAt: new Date(),
          currentPosition: profile.currentPosition,
          yearsExperience: profile.yearsExperience,
        },
      });

      // Create language proficiencies
      for (const lang of profile.languages) {
        await prisma.reviewerLanguage.create({
          data: {
            reviewerProfileId: reviewerProfile.id,
            language: lang.language,
            proficiency: lang.proficiency,
            isNative: lang.isNative ?? false,
            canConductInterviews: lang.proficiency === "NATIVE" || lang.proficiency === "ADVANCED",
            canWriteReports: lang.proficiency === "NATIVE" || lang.proficiency === "ADVANCED",
          },
        });
      }

      console.log(`   ✅ ${userData.email} (${profile.status})`);
    } else {
      console.log(`   ✅ ${userData.email} (${userData.role})`);
    }

    created++;
  }

  console.log(`\n   Created: ${created}, Skipped: ${skipped}`);
}

async function printSummary() {
  console.log("\n📊 Summary:");

  // Count by team
  const teams = await prisma.regionalTeam.findMany({
    include: {
      memberOrganizations: {
        include: {
          users: {
            include: {
              reviewerProfile: true,
            },
          },
        },
      },
    },
    orderBy: { teamNumber: "asc" },
  });

  for (const team of teams) {
    const reviewers = team.memberOrganizations.flatMap((org) =>
      org.users.filter((u) => u.reviewerProfile)
    );
    const leadQualified = reviewers.filter(
      (u) => u.reviewerProfile?.status === "LEAD_QUALIFIED"
    ).length;
    const certified = reviewers.filter(
      (u) => u.reviewerProfile?.status === "CERTIFIED"
    ).length;

    console.log(`\n   ${team.code}: ${team.nameEn}`);
    console.log(`      Reviewers: ${reviewers.length} (Lead: ${leadQualified}, Certified: ${certified})`);
  }

  // System users
  const systemUsers = await prisma.user.count({
    where: {
      role: { in: ["SUPER_ADMIN", "PROGRAMME_COORDINATOR", "STEERING_COMMITTEE"] },
    },
  });
  console.log(`\n   System Users: ${systemUsers}`);

  // Total
  const totalReviewers = await prisma.reviewerProfile.count();
  console.log(`   Total Reviewer Profiles: ${totalReviewers}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes("cleanup");

  console.log("🌱 Seeding Demo Users with Reviewer Profiles");
  console.log("=============================================\n");
  console.log(`   Default password: ${DEFAULT_PASSWORD}\n`);

  try {
    if (shouldCleanup) {
      await cleanup();
    }

    await seedUsers();
    await printSummary();

    console.log("\n✅ Seed completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
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
