/**
 * Unified Seed Script: All Users, Roles & Reviewer Profiles
 *
 * Merges seed-dev-users.ts (org structure, all 11 roles) with
 * seed-demo-users.ts (reviewer profiles, correct org codes).
 *
 * Creates:
 *   Section A — 6 programme-level users (SUPER_ADMIN, SYSTEM_ADMIN,
 *               PROGRAMME_COORDINATOR, STEERING_COMMITTEE ×2, OBSERVER)
 *   Section B — ~22 ANSP organizational users (ANSP_ADMIN ×20,
 *               SAFETY_MANAGER ×8, QUALITY_MANAGER ×2, STAFF ×2)
 *   Section C — 40 reviewers with profiles (LEAD_REVIEWER ×20,
 *               PEER_REVIEWER ×20)
 *
 * Also:
 *   - Creates AFCAC organization (for Observer role)
 *   - Fixes org names: MCAA, ACM, DGAC
 *
 * Usage: npx tsx prisma/seed-all-users.ts
 *
 * Password for all users: Demo2026!
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type {
  UserRole,
  Locale,
  ReviewerStatus,
  AfricanRegion,
  MembershipStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "Demo2026!";

// =============================================================================
// TYPES
// =============================================================================

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  orgCode: string;
  title?: string;
  locale?: Locale;
  reviewerStatus?: ReviewerStatus;
}

interface OrgFix {
  organizationCode: string;
  nameEn: string;
  nameFr: string;
  country: string;
  city: string;
  region: AfricanRegion;
  peerReviewTeam: number | null;
  membershipStatus: MembershipStatus;
}

// =============================================================================
// SECTION A — PROGRAMME-LEVEL USERS (no team assignment)
// =============================================================================

const PROGRAMME_USERS: SeedUser[] = [
  // CANSO Secretariat (fallback to ASECNA if CANSO org doesn't exist)
  {
    email: "admin@aaprp.aero",
    firstName: "System",
    lastName: "Administrator",
    role: "SUPER_ADMIN" as UserRole,
    orgCode: "CANSO", // fallback: ASECNA
    title: "System Administrator",
  },
  {
    email: "sysadmin@aaprp.aero",
    firstName: "Technical",
    lastName: "Administrator",
    role: "SYSTEM_ADMIN" as UserRole,
    orgCode: "CANSO", // fallback: ASECNA
    title: "System Administrator",
  },
  {
    email: "coordinator@aaprp.aero",
    firstName: "Pauline",
    lastName: "Runghen",
    role: "PROGRAMME_COORDINATOR" as UserRole,
    orgCode: "CANSO", // fallback: ASECNA
    title: "Programme Coordinator",
  },

  // Steering Committee (members from their own ANSPs)
  {
    email: "sc.chair@aaprp.org",
    firstName: "Jean-Pierre",
    lastName: "Mbeki",
    role: "STEERING_COMMITTEE" as UserRole,
    orgCode: "ASECNA",
    title: "Steering Committee Chair, ASECNA Director General",
  },
  {
    email: "sc.vicechair@aaprp.org",
    firstName: "Nkosinathi",
    lastName: "Sishi",
    role: "STEERING_COMMITTEE" as UserRole,
    orgCode: "ATNS",
    title: "Steering Committee Vice-Chair, ATNS CEO",
  },

  // Observer (AFCAC — org created separately)
  {
    email: "observer@afcac.aero",
    firstName: "Tefera",
    lastName: "Mekonnen",
    role: "OBSERVER" as UserRole,
    orgCode: "AFCAC",
    title: "Programme Observer, AFCAC Representative",
    locale: "EN" as Locale,
  },
];

// =============================================================================
// SECTION B — ANSP ORGANIZATIONAL USERS (within Teams 1–5)
// Org codes corrected from airport indicators → ANSP acronyms
// =============================================================================

const ANSP_ORG_USERS: SeedUser[] = [
  // --------------------------------------------------------------------------
  // TEAM 1 — ASECNA (full org staff)
  // --------------------------------------------------------------------------
  {
    email: "admin@asecna.aero",
    firstName: "Amadou",
    lastName: "Diallo",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "ASECNA",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@asecna.aero",
    firstName: "Marie",
    lastName: "Ndiaye",
    role: "SAFETY_MANAGER" as UserRole,
    orgCode: "ASECNA",
    title: "Safety Manager",
  },
  {
    email: "quality@asecna.aero",
    firstName: "Ibrahim",
    lastName: "Toure",
    role: "QUALITY_MANAGER" as UserRole,
    orgCode: "ASECNA",
    title: "Quality Manager",
  },
  {
    email: "staff@asecna.aero",
    firstName: "Fatou",
    lastName: "Diop",
    role: "STAFF" as UserRole,
    orgCode: "ASECNA",
    title: "Safety Officer",
  },

  // TEAM 1 — ATNS
  {
    email: "admin@atns.co.za",
    firstName: "Thabo",
    lastName: "Molefe",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "ATNS",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@atns.co.za",
    firstName: "Nomvula",
    lastName: "Ndlovu",
    role: "SAFETY_MANAGER" as UserRole,
    orgCode: "ATNS",
    title: "Safety Manager",
  },

  // TEAM 1 — Botswana CAA
  {
    email: "admin@caab.gov.bw",
    firstName: "Kagiso",
    lastName: "Moeng",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "CAAB",
    title: "ANSP Focal Point",
  },

  // TEAM 1 — Eswatini CAA
  {
    email: "admin@ecaa.org.sz",
    firstName: "Sibusiso",
    lastName: "Dlamini",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "ESWACAA",
    title: "ANSP Focal Point",
  },

  // --------------------------------------------------------------------------
  // TEAM 2 — Uganda CAA
  // --------------------------------------------------------------------------
  {
    email: "admin@caa.go.ug",
    firstName: "Samuel",
    lastName: "Okello",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "UCAA",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@caa.go.ug",
    firstName: "Grace",
    lastName: "Nakimuli",
    role: "SAFETY_MANAGER" as UserRole,
    orgCode: "UCAA",
    title: "Safety Manager",
  },

  // TEAM 2 — Tanzania CAA
  {
    email: "admin@tcaa.go.tz",
    firstName: "Joseph",
    lastName: "Mwakasege",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "TCAA",
    title: "ANSP Focal Point",
  },

  // TEAM 2 — Burundi CAA
  {
    email: "admin@aacb.bi",
    firstName: "Jean-Pierre",
    lastName: "Ndayisaba",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "BCAA",
    title: "ANSP Focal Point",
  },

  // TEAM 2 — Rwanda CAA
  {
    email: "admin@rcaa.gov.rw",
    firstName: "Emmanuel",
    lastName: "Uwimana",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "RCAA",
    title: "ANSP Focal Point",
  },

  // TEAM 2 — Kenya CAA
  {
    email: "admin@kcaa.or.ke",
    firstName: "James",
    lastName: "Mwangi",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "KCAA",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@kcaa.or.ke",
    firstName: "Grace",
    lastName: "Wanjiku",
    role: "SAFETY_MANAGER" as UserRole,
    orgCode: "KCAA",
    title: "Safety Manager",
  },

  // --------------------------------------------------------------------------
  // TEAM 3 — NAMA (Nigeria)
  // --------------------------------------------------------------------------
  {
    email: "admin@nama.gov.ng",
    firstName: "Chukwuemeka",
    lastName: "Okonkwo",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "NAMA",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@nama.gov.ng",
    firstName: "Amina",
    lastName: "Bello",
    role: "SAFETY_MANAGER" as UserRole,
    orgCode: "NAMA",
    title: "Director of Safety",
  },
  {
    email: "staff@nama.gov.ng",
    firstName: "Oluwaseun",
    lastName: "Adeyemi",
    role: "STAFF" as UserRole,
    orgCode: "NAMA",
    title: "Safety Analyst",
  },

  // TEAM 3 — GCAA (Ghana)
  {
    email: "admin@gcaa.gov.gh",
    firstName: "Kwame",
    lastName: "Asante",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "GCAA",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@gcaa.gov.gh",
    firstName: "Akua",
    lastName: "Mensah",
    role: "SAFETY_MANAGER" as UserRole,
    orgCode: "GCAA",
    title: "Safety Manager",
  },

  // TEAM 3 — Roberts FIR (Guinea/Liberia/Sierra Leone)
  {
    email: "buya.mansaray@robertsfir.org",
    firstName: "Buya",
    lastName: "Mansaray",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "RFIR",
    title: "ANSP Focal Point",
  },
  {
    email: "sdabor@robertsfir.org",
    firstName: "Samba",
    lastName: "Dabor",
    role: "SAFETY_MANAGER" as UserRole,
    orgCode: "RFIR",
    title: "Safety Manager",
  },

  // --------------------------------------------------------------------------
  // TEAM 4 — Mozambique Airports (ADM)
  // --------------------------------------------------------------------------
  {
    email: "admin@adm.gov.mz",
    firstName: "António",
    lastName: "Machava",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "ADM",
    title: "ANSP Focal Point",
  },

  // TEAM 4 — Malawi Civil Aviation Authority
  {
    email: "admin@dca.gov.mw",
    firstName: "Chisomo",
    lastName: "Banda",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "MCAA",
    title: "ANSP Focal Point",
  },

  // TEAM 4 — Aviation Civile de Madagascar
  {
    email: "admin@adema.mg",
    firstName: "Andry",
    lastName: "Rakotondrainibe",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "ACM",
    title: "ANSP Focal Point",
  },

  // TEAM 4 — CAAZ (Zimbabwe)
  {
    email: "admin@caaz.co.zw",
    firstName: "Tendai",
    lastName: "Moyo",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "CAAZ",
    title: "ANSP Focal Point",
  },

  // TEAM 4 — ZACL (Zambia)
  {
    email: "admin@zacl.co.zm",
    firstName: "Mwamba",
    lastName: "Chilufya",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "ZACL",
    title: "ANSP Focal Point",
  },

  // --------------------------------------------------------------------------
  // TEAM 5 — DGAC (Morocco)
  // --------------------------------------------------------------------------
  {
    email: "admin@onda.ma",
    firstName: "Hassan",
    lastName: "El Mansouri",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "DGAC",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@onda.ma",
    firstName: "Fatima",
    lastName: "Benali",
    role: "SAFETY_MANAGER" as UserRole,
    orgCode: "DGAC",
    title: "Safety Manager",
  },

  // TEAM 5 — OACA (Tunisia)
  {
    email: "admin@oaca.tn",
    firstName: "Mohamed",
    lastName: "Ben Ahmed",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "OACA",
    title: "ANSP Focal Point",
  },

  // TEAM 5 — ANAC (Algeria)
  {
    email: "admin@enna.dz",
    firstName: "Karim",
    lastName: "Boudiaf",
    role: "ANSP_ADMIN" as UserRole,
    orgCode: "ANAC",
    title: "ANSP Focal Point",
  },
];

// =============================================================================
// SECTION C — REVIEWERS WITH PROFILES (from seed-demo-users.ts)
// Already using correct org codes
// =============================================================================

// Team 1: ASECNA & Southern Africa (8 reviewers)
const TEAM1_REVIEWERS: SeedUser[] = [
  { email: "amadou.diallo@asecna.aero", firstName: "Amadou", lastName: "Diallo", role: "LEAD_REVIEWER" as UserRole, orgCode: "ASECNA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "fatou.ndiaye@asecna.aero", firstName: "Fatou", lastName: "Ndiaye", role: "PEER_REVIEWER" as UserRole, orgCode: "ASECNA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "thabo.molefe@atns.co.za", firstName: "Thabo", lastName: "Molefe", role: "LEAD_REVIEWER" as UserRole, orgCode: "ATNS", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "nomvula.dlamini@atns.co.za", firstName: "Nomvula", lastName: "Dlamini", role: "PEER_REVIEWER" as UserRole, orgCode: "ATNS", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "kago.mothibi@caab.co.bw", firstName: "Kago", lastName: "Mothibi", role: "LEAD_REVIEWER" as UserRole, orgCode: "CAAB", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "lesego.phiri@caab.co.bw", firstName: "Lesego", lastName: "Phiri", role: "PEER_REVIEWER" as UserRole, orgCode: "CAAB", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "sipho.dlamini@eswacaa.org.sz", firstName: "Sipho", lastName: "Dlamini", role: "LEAD_REVIEWER" as UserRole, orgCode: "ESWACAA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "thandiwe.nkosi@eswacaa.org.sz", firstName: "Thandiwe", lastName: "Nkosi", role: "PEER_REVIEWER" as UserRole, orgCode: "ESWACAA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
];

// Team 2: East African Community (10 reviewers)
const TEAM2_REVIEWERS: SeedUser[] = [
  { email: "james.ochieng@kcaa.or.ke", firstName: "James", lastName: "Ochieng", role: "LEAD_REVIEWER" as UserRole, orgCode: "KCAA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "wanjiku.kamau@kcaa.or.ke", firstName: "Wanjiku", lastName: "Kamau", role: "PEER_REVIEWER" as UserRole, orgCode: "KCAA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "baraka.mwakasege@tcaa.go.tz", firstName: "Baraka", lastName: "Mwakasege", role: "LEAD_REVIEWER" as UserRole, orgCode: "TCAA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "rehema.mushi@tcaa.go.tz", firstName: "Rehema", lastName: "Mushi", role: "PEER_REVIEWER" as UserRole, orgCode: "TCAA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "moses.okello@ucaa.go.ug", firstName: "Moses", lastName: "Okello", role: "LEAD_REVIEWER" as UserRole, orgCode: "UCAA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "grace.nakato@ucaa.go.ug", firstName: "Grace", lastName: "Nakato", role: "PEER_REVIEWER" as UserRole, orgCode: "UCAA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "jean.mugabo@rcaa.gov.rw", firstName: "Jean-Pierre", lastName: "Mugabo", role: "LEAD_REVIEWER" as UserRole, orgCode: "RCAA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "claire.uwimana@rcaa.gov.rw", firstName: "Claire", lastName: "Uwimana", role: "PEER_REVIEWER" as UserRole, orgCode: "RCAA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "pierre.ndayisaba@bcaa.gov.bi", firstName: "Pierre", lastName: "Ndayisaba", role: "LEAD_REVIEWER" as UserRole, orgCode: "BCAA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "aline.niyonzima@bcaa.gov.bi", firstName: "Aline", lastName: "Niyonzima", role: "PEER_REVIEWER" as UserRole, orgCode: "BCAA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
];

// Team 3: West African Anglophone (6 reviewers)
const TEAM3_REVIEWERS: SeedUser[] = [
  { email: "chukwuemeka.okonkwo@nama.gov.ng", firstName: "Chukwuemeka", lastName: "Okonkwo", role: "LEAD_REVIEWER" as UserRole, orgCode: "NAMA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "ngozi.adeyemi@nama.gov.ng", firstName: "Ngozi", lastName: "Adeyemi", role: "PEER_REVIEWER" as UserRole, orgCode: "NAMA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "kwame.asante@gcaa.com.gh", firstName: "Kwame", lastName: "Asante", role: "LEAD_REVIEWER" as UserRole, orgCode: "GCAA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "abena.mensah@gcaa.com.gh", firstName: "Abena", lastName: "Mensah", role: "PEER_REVIEWER" as UserRole, orgCode: "GCAA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "jmkolako@robertsfir.org", firstName: "Jonathan", lastName: "Kolako", role: "PEER_REVIEWER" as UserRole, orgCode: "RFIR", title: "AIS Supervisor", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "bsdiallo@robertsfir.org", firstName: "Boubacar S. C.", lastName: "Diallo", role: "PEER_REVIEWER" as UserRole, orgCode: "RFIR", title: "Training Manager", reviewerStatus: "CERTIFIED" as ReviewerStatus },
];

// Team 4: Southern & Eastern Africa (10 reviewers)
const TEAM4_REVIEWERS: SeedUser[] = [
  { email: "carlos.machava@aeroportos.co.mz", firstName: "Carlos", lastName: "Machava", role: "LEAD_REVIEWER" as UserRole, orgCode: "ADM", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "ana.tembe@aeroportos.co.mz", firstName: "Ana", lastName: "Tembe", role: "PEER_REVIEWER" as UserRole, orgCode: "ADM", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "chimwemwe.banda@dca.gov.mw", firstName: "Chimwemwe", lastName: "Banda", role: "LEAD_REVIEWER" as UserRole, orgCode: "MCAA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "tionge.phiri@dca.gov.mw", firstName: "Tionge", lastName: "Phiri", role: "PEER_REVIEWER" as UserRole, orgCode: "MCAA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "jean.rakoto@adema.mg", firstName: "Jean-Claude", lastName: "Rakotomalala", role: "LEAD_REVIEWER" as UserRole, orgCode: "ACM", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "hery.andria@adema.mg", firstName: "Hery", lastName: "Andriamanana", role: "PEER_REVIEWER" as UserRole, orgCode: "ACM", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "tendai.moyo@caaz.co.zw", firstName: "Tendai", lastName: "Moyo", role: "LEAD_REVIEWER" as UserRole, orgCode: "CAAZ", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "chiedza.ncube@caaz.co.zw", firstName: "Chiedza", lastName: "Ncube", role: "PEER_REVIEWER" as UserRole, orgCode: "CAAZ", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "mulenga.chanda@zacl.co.zm", firstName: "Mulenga", lastName: "Chanda", role: "LEAD_REVIEWER" as UserRole, orgCode: "ZACL", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "natasha.mumba@zacl.co.zm", firstName: "Natasha", lastName: "Mumba", role: "PEER_REVIEWER" as UserRole, orgCode: "ZACL", reviewerStatus: "CERTIFIED" as ReviewerStatus },
];

// Team 5: Northern Africa (6 reviewers)
const TEAM5_REVIEWERS: SeedUser[] = [
  { email: "youssef.benali@onda.ma", firstName: "Youssef", lastName: "Benali", role: "LEAD_REVIEWER" as UserRole, orgCode: "DGAC", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "fatima.alaoui@onda.ma", firstName: "Fatima", lastName: "Alaoui", role: "PEER_REVIEWER" as UserRole, orgCode: "DGAC", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "mohamed.trabelsi@oaca.nat.tn", firstName: "Mohamed", lastName: "Trabelsi", role: "LEAD_REVIEWER" as UserRole, orgCode: "OACA", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "leila.chaabane@oaca.nat.tn", firstName: "Leila", lastName: "Chaabane", role: "PEER_REVIEWER" as UserRole, orgCode: "OACA", reviewerStatus: "CERTIFIED" as ReviewerStatus },
  { email: "karim.boudiaf@enna.dz", firstName: "Karim", lastName: "Boudiaf", role: "LEAD_REVIEWER" as UserRole, orgCode: "ANAC", reviewerStatus: "LEAD_QUALIFIED" as ReviewerStatus },
  { email: "samira.hadj@enna.dz", firstName: "Samira", lastName: "Hadj", role: "PEER_REVIEWER" as UserRole, orgCode: "ANAC", reviewerStatus: "CERTIFIED" as ReviewerStatus },
];

// Combined reviewer list
const ALL_REVIEWERS: SeedUser[] = [
  ...TEAM1_REVIEWERS,
  ...TEAM2_REVIEWERS,
  ...TEAM3_REVIEWERS,
  ...TEAM4_REVIEWERS,
  ...TEAM5_REVIEWERS,
];

// =============================================================================
// ORGANIZATIONS TO CREATE/FIX
// =============================================================================

/** AFCAC — new organization for Observer role */
const AFCAC_ORG: OrgFix = {
  organizationCode: "AFCAC",
  nameEn: "African Civil Aviation Commission",
  nameFr: "Commission Africaine de l'Aviation Civile",
  country: "Senegal",
  city: "Dakar",
  region: "WACAF" as AfricanRegion,
  peerReviewTeam: null,
  membershipStatus: "ACTIVE" as MembershipStatus,
};

/** Organization name corrections (wrong names in old seed) */
const ORG_NAME_FIXES: OrgFix[] = [
  {
    organizationCode: "MCAA",
    nameEn: "Malawi Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Malawi",
    country: "Malawi",
    city: "Lilongwe",
    region: "ESAF" as AfricanRegion,
    peerReviewTeam: 4,
    membershipStatus: "ACTIVE" as MembershipStatus,
  },
  {
    organizationCode: "ACM",
    nameEn: "Aviation Civile de Madagascar",
    nameFr: "Aviation Civile de Madagascar",
    country: "Madagascar",
    city: "Antananarivo",
    region: "ESAF" as AfricanRegion,
    peerReviewTeam: 4,
    membershipStatus: "ACTIVE" as MembershipStatus,
  },
  {
    organizationCode: "DGAC",
    nameEn: "Direction Générale de l'Aviation Civile (Morocco)",
    nameFr: "Direction Générale de l'Aviation Civile (Maroc)",
    country: "Morocco",
    city: "Casablanca",
    region: "NORTHERN" as AfricanRegion,
    peerReviewTeam: 5,
    membershipStatus: "ACTIVE" as MembershipStatus,
  },
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function getOrganizationMap(): Promise<Map<string, string>> {
  const orgs = await prisma.organization.findMany({
    select: { id: true, organizationCode: true },
  });

  const map = new Map<string, string>();
  for (const org of orgs) {
    if (org.organizationCode) {
      map.set(org.organizationCode, org.id);
    }
  }

  return map;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Step 1: Create AFCAC organization and fix incorrect org names
 */
async function ensureOrganizations(): Promise<void> {
  console.log("\n🏢 Ensuring organizations...\n");

  // Create AFCAC
  const afcac = await prisma.organization.upsert({
    where: { organizationCode: AFCAC_ORG.organizationCode },
    update: {
      nameEn: AFCAC_ORG.nameEn,
      nameFr: AFCAC_ORG.nameFr,
      country: AFCAC_ORG.country,
      city: AFCAC_ORG.city,
      region: AFCAC_ORG.region,
      peerReviewTeam: AFCAC_ORG.peerReviewTeam,
      membershipStatus: AFCAC_ORG.membershipStatus,
    },
    create: {
      nameEn: AFCAC_ORG.nameEn,
      nameFr: AFCAC_ORG.nameFr,
      organizationCode: AFCAC_ORG.organizationCode,
      country: AFCAC_ORG.country,
      city: AFCAC_ORG.city,
      region: AFCAC_ORG.region,
      peerReviewTeam: AFCAC_ORG.peerReviewTeam,
      membershipStatus: AFCAC_ORG.membershipStatus,
    },
  });
  console.log(`   ✅ AFCAC created/updated: ${afcac.id}`);

  // Fix incorrect org names
  for (const fix of ORG_NAME_FIXES) {
    try {
      const updated = await prisma.organization.upsert({
        where: { organizationCode: fix.organizationCode },
        update: {
          nameEn: fix.nameEn,
          nameFr: fix.nameFr,
        },
        create: {
          nameEn: fix.nameEn,
          nameFr: fix.nameFr,
          organizationCode: fix.organizationCode,
          country: fix.country,
          city: fix.city,
          region: fix.region,
          peerReviewTeam: fix.peerReviewTeam,
          membershipStatus: fix.membershipStatus,
        },
      });
      console.log(`   ✅ ${fix.organizationCode} name fixed: "${fix.nameEn}" (${updated.id})`);
    } catch (err) {
      console.warn(`   ⚠️  Could not fix ${fix.organizationCode}: ${err}`);
    }
  }
}

/**
 * Step 2: Create a single user (with optional reviewer profile)
 */
async function createUser(
  user: SeedUser,
  orgMap: Map<string, string>,
  passwordHash: string,
): Promise<{ created: boolean; hasProfile: boolean }> {
  // Resolve organization — with CANSO fallback to ASECNA for programme-level users
  let organizationId = orgMap.get(user.orgCode) || null;

  if (!organizationId && user.orgCode === "CANSO") {
    organizationId = orgMap.get("ASECNA") || null;
    if (organizationId) {
      console.log(`      ℹ️  CANSO org not found, using ASECNA for ${user.email}`);
    }
  }

  if (!organizationId) {
    console.warn(`   ⚠️  Org not found: ${user.orgCode} — skipping ${user.email}`);
    return { created: false, hasProfile: false };
  }

  // Upsert user
  const dbUser = await prisma.user.upsert({
    where: { email: user.email },
    update: {
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
      title: user.title || null,
    },
    create: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
      locale: (user.locale || "EN") as Locale,
      title: user.title || null,
    },
  });

  let hasProfile = false;

  // Create reviewer profile if applicable
  if (user.reviewerStatus && organizationId) {
    const isLead = user.reviewerStatus === ("LEAD_QUALIFIED" as ReviewerStatus);
    const yearsExp = isLead ? 10 : 5;

    await prisma.reviewerProfile.upsert({
      where: { userId: dbUser.id },
      update: {
        status: user.reviewerStatus,
        organizationId,
        homeOrganizationId: organizationId,
        isLeadQualified: isLead,
      },
      create: {
        userId: dbUser.id,
        organizationId,
        homeOrganizationId: organizationId,
        status: user.reviewerStatus,
        currentPosition: isLead ? "Senior Reviewer" : "Reviewer",
        yearsExperience: yearsExp,
        isAvailable: true,
        isLeadQualified: isLead,
        leadQualifiedAt: isLead ? new Date() : null,
        certifiedAt: new Date(),
      },
    });

    hasProfile = true;
  }

  return { created: true, hasProfile };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════════════╗");
  console.log("║  🌍 AAPRP — Unified User Seed (All 11 Roles)                        ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════╝");

  // Step 1: Ensure orgs exist (AFCAC + name fixes)
  await ensureOrganizations();

  // Step 2: Build org map (after AFCAC creation)
  const orgMap = await getOrganizationMap();
  console.log(`\n   📁 Found ${orgMap.size} organizations in database\n`);

  // Hash password once
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  // Counters
  const counts = {
    programmeUsers: 0,
    anspOrgUsers: 0,
    reviewers: 0,
    profiles: 0,
    skipped: 0,
  };

  // ── Section A: Programme-Level Users ──────────────────────────────────────

  console.log("━━━ Section A: Programme-Level Users ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const user of PROGRAMME_USERS) {
    const { created, hasProfile } = await createUser(user, orgMap, passwordHash);
    if (created) {
      counts.programmeUsers++;
      const tag = user.role.padEnd(24);
      console.log(`   ✅ ${tag} ${user.firstName} ${user.lastName} (${user.orgCode})`);
    } else {
      counts.skipped++;
    }
  }

  // ── Section B: ANSP Organizational Users ──────────────────────────────────

  console.log("\n━━━ Section B: ANSP Organizational Users ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const user of ANSP_ORG_USERS) {
    const { created } = await createUser(user, orgMap, passwordHash);
    if (created) {
      counts.anspOrgUsers++;
      const tag = user.role.padEnd(24);
      console.log(`   ✅ ${tag} ${user.firstName} ${user.lastName} (${user.orgCode})`);
    } else {
      counts.skipped++;
    }
  }

  // ── Section C: Reviewers with Profiles ────────────────────────────────────

  console.log("\n━━━ Section C: Reviewers with Profiles ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const teamLabels = [
    { label: "Team 1 (Southern Africa)", users: TEAM1_REVIEWERS },
    { label: "Team 2 (East Africa)",     users: TEAM2_REVIEWERS },
    { label: "Team 3 (West Africa)",     users: TEAM3_REVIEWERS },
    { label: "Team 4 (Southern/East)",   users: TEAM4_REVIEWERS },
    { label: "Team 5 (Northern Africa)", users: TEAM5_REVIEWERS },
  ];

  for (const team of teamLabels) {
    console.log(`\n   📋 ${team.label}:`);
    for (const user of team.users) {
      const { created, hasProfile } = await createUser(user, orgMap, passwordHash);
      if (created) {
        counts.reviewers++;
        if (hasProfile) counts.profiles++;
        const status = user.reviewerStatus === ("LEAD_QUALIFIED" as ReviewerStatus) ? "LEAD" : "CERT";
        console.log(`      ✅ ${user.firstName} ${user.lastName} (${user.orgCode}) — ${status}`);
      } else {
        counts.skipped++;
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const total = counts.programmeUsers + counts.anspOrgUsers + counts.reviewers;

  console.log("\n╔═══════════════════════════════════════════════════════════════════════╗");
  console.log("║  📊 SEED SUMMARY                                                     ║");
  console.log("╠═══════════════════════════════════════════════════════════════════════╣");
  console.log(`║  Programme-level users:  ${String(counts.programmeUsers).padStart(3)}                                       ║`);
  console.log(`║  ANSP org users:         ${String(counts.anspOrgUsers).padStart(3)}                                       ║`);
  console.log(`║  Reviewers:              ${String(counts.reviewers).padStart(3)}  (${counts.profiles} with profiles)                ║`);
  console.log(`║  Skipped (org missing):  ${String(counts.skipped).padStart(3)}                                       ║`);
  console.log(`║  ─────────────────────────────                                       ║`);
  console.log(`║  TOTAL USERS:            ${String(total).padStart(3)}                                       ║`);
  console.log("╠═══════════════════════════════════════════════════════════════════════╣");
  console.log("║  Roles seeded (11):                                                  ║");
  console.log("║    SUPER_ADMIN · SYSTEM_ADMIN · STEERING_COMMITTEE                   ║");
  console.log("║    PROGRAMME_COORDINATOR · OBSERVER                                  ║");
  console.log("║    ANSP_ADMIN · SAFETY_MANAGER · QUALITY_MANAGER · STAFF             ║");
  console.log("║    LEAD_REVIEWER · PEER_REVIEWER                                     ║");
  console.log("╠═══════════════════════════════════════════════════════════════════════╣");
  console.log(`║  🔑 Password for all users: ${DEFAULT_PASSWORD}                            ║`);
  console.log("╚═══════════════════════════════════════════════════════════════════════╝\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
