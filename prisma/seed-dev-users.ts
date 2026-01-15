/**
 * Development Users Seed Script
 *
 * Creates test organizations and users for development.
 * DO NOT run in production!
 *
 * Usage: npx tsx prisma/seed-dev-users.ts
 *
 * =============================================================================
 * AFRICAN ANSP PEER REVIEW PROGRAMME - TEAM STRUCTURE
 * =============================================================================
 *
 * The programme organizes 22 African ANSPs into 5 peer review teams:
 *
 * Team 1 (Southern Africa - ESAF):
 *   - ASECNA (Steering Committee Chair)
 *   - ATNS (Steering Committee Vice-Chair)
 *   - Botswana CAA
 *   - Eswatini CAA
 *
 * Team 2 (East Africa - ESAF):
 *   - Uganda CAA
 *   - Tanzania CAA
 *   - Burundi CAA
 *   - Rwanda CAA
 *   - Kenya CAA
 *
 * Team 3 (West Africa - WACAF):
 *   - NAMA (Nigeria)
 *   - GCAA (Ghana)
 *   - Roberts FIR (Guinea/Liberia/Sierra Leone)
 *
 * Team 4 (Southern/Eastern Africa - ESAF):
 *   - Mozambique Airports (ADM)
 *   - Malawi DCA
 *   - ADEMA (Madagascar)
 *   - CAAZ (Zimbabwe)
 *   - ZACL (Zambia)
 *
 * Team 5 (North Africa - NORTHERN):
 *   - ONDA (Morocco)
 *   - OACA (Tunisia)
 *   - ENNA (Algeria)
 *
 * Programme Bodies:
 *   - CANSO Africa Secretariat (Johannesburg)
 *
 * =============================================================================
 * PRODUCTION ONBOARDING FLOW (TODO: Implement)
 * =============================================================================
 *
 * The African ANSP Peer Review Programme follows a controlled access model:
 *
 * 1. ORGANIZATION REGISTRATION
 *    - CANSO Africa Secretariat (Super Admin) creates Organizations
 *    - Organizations represent member ANSPs participating in the programme
 *    - Each ANSP is identified by their ICAO designator
 *    - Organization details include: name, country, ICAO code, contact info
 *
 * 2. USER INVITATION FLOW
 *    Step 1: Super Admin creates Organization
 *    Step 2: Super Admin or Programme Coordinator invites initial Org Admin
 *            - System generates secure invitation token
 *            - Email sent with registration link: /register?token=xxx
 *    Step 3: Org Admin clicks link, completes registration
 *            - Email is pre-verified (came from invitation)
 *            - Sets password, profile info
 *            - Automatically assigned to organization with ANSP_ADMIN role
 *    Step 4: Org Admin invites their team members
 *            - Can invite: SAFETY_MANAGER, QUALITY_MANAGER, STAFF
 *            - Same invitation flow
 *    Step 5: Programme Coordinator assigns external reviewers
 *            - Reviewers are users from OTHER organizations
 *            - Assigned PEER_REVIEWER role for specific reviews
 *
 * 3. ROLE HIERARCHY & PERMISSIONS
 *
 *    SUPER_ADMIN (CANSO Secretariat)
 *    ├── Full system access
 *    ├── Create/manage organizations
 *    ├── Assign Programme Coordinators
 *    └── Override any action
 *
 *    SYSTEM_ADMIN (Technical)
 *    ├── System configuration
 *    ├── User management
 *    └── Audit logs access
 *
 *    PROGRAMME_COORDINATOR (CANSO Staff)
 *    ├── Create/manage peer reviews
 *    ├── Assign reviewers to reviews
 *    ├── View all assessments
 *    └── Generate programme reports
 *
 *    ANSP_ADMIN (Organization Focal Point)
 *    ├── Manage own organization's users
 *    ├── Invite team members
 *    ├── View all org assessments
 *    └── Submit assessments for review
 *
 *    SAFETY_MANAGER (Organization)
 *    ├── Create/lead assessments
 *    ├── Assign questions to staff
 *    ├── Review team responses
 *    └── Finalize for submission
 *
 *    QUALITY_MANAGER (Organization)
 *    ├── Review assessment quality
 *    ├── Approve before submission
 *    └── Track corrective actions
 *
 *    STAFF (Organization)
 *    ├── Answer assigned questions
 *    ├── Upload evidence
 *    └── Add notes/comments
 *
 *    PEER_REVIEWER (Cross-Organization)
 *    ├── Review submitted assessments
 *    ├── Provide findings/recommendations
 *    └── Access limited to assigned reviews
 *
 *    OBSERVER (Read-Only)
 *    ├── View dashboards
 *    └── No edit permissions
 *
 * =============================================================================
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole, AfricanRegion, MembershipStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// DEVELOPMENT TEST DATA
// =============================================================================

const DEV_PASSWORD = "DevPassword123!"; // ONLY for development!

/**
 * All African ANSPs in the Peer Review Programme
 * Organized by peer review team (1-5)
 */
const ORGANIZATIONS: Array<{
  nameEn: string;
  nameFr: string;
  icaoCode: string;
  country: string;
  city: string;
  region: AfricanRegion;
  peerReviewTeam: number | null;
  membershipStatus: MembershipStatus;
}> = [
  // ==========================================================================
  // PROGRAMME SECRETARIAT (No team assignment)
  // ==========================================================================
  {
    nameEn: "CANSO Africa Secretariat",
    nameFr: "Secrétariat CANSO Afrique",
    icaoCode: "CANSO",
    country: "South Africa",
    city: "Johannesburg",
    region: "ESAF",
    peerReviewTeam: null,
    membershipStatus: "ACTIVE",
  },

  // ==========================================================================
  // TEAM 1 - Southern Africa (ESAF)
  // ==========================================================================
  {
    nameEn: "ASECNA - Agency for Aerial Navigation Safety in Africa and Madagascar",
    nameFr: "ASECNA - Agence pour la Sécurité de la Navigation Aérienne en Afrique et à Madagascar",
    icaoCode: "ASEC",
    country: "Senegal",
    city: "Dakar",
    region: "WACAF", // HQ in WACAF but serves multiple regions
    peerReviewTeam: 1,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "ATNS - Air Traffic and Navigation Services",
    nameFr: "ATNS - Services de Circulation Aérienne et de Navigation",
    icaoCode: "FAJA",
    country: "South Africa",
    city: "Johannesburg",
    region: "ESAF",
    peerReviewTeam: 1,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Civil Aviation Authority of Botswana",
    nameFr: "Autorité de l'Aviation Civile du Botswana",
    icaoCode: "FBSK",
    country: "Botswana",
    city: "Gaborone",
    region: "ESAF",
    peerReviewTeam: 1,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Eswatini Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile d'Eswatini",
    icaoCode: "FDSK",
    country: "Eswatini",
    city: "Mbabane",
    region: "ESAF",
    peerReviewTeam: 1,
    membershipStatus: "ACTIVE",
  },

  // ==========================================================================
  // TEAM 2 - East Africa (ESAF)
  // ==========================================================================
  {
    nameEn: "Uganda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de l'Ouganda",
    icaoCode: "HUEN",
    country: "Uganda",
    city: "Kampala",
    region: "ESAF",
    peerReviewTeam: 2,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Tanzania Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de la Tanzanie",
    icaoCode: "HTDA",
    country: "Tanzania",
    city: "Dar es Salaam",
    region: "ESAF",
    peerReviewTeam: 2,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Burundi Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Burundi",
    icaoCode: "HBBA",
    country: "Burundi",
    city: "Bujumbura",
    region: "ESAF",
    peerReviewTeam: 2,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Rwanda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Rwanda",
    icaoCode: "HRYR",
    country: "Rwanda",
    city: "Kigali",
    region: "ESAF",
    peerReviewTeam: 2,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Kenya Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Kenya",
    icaoCode: "HKJK",
    country: "Kenya",
    city: "Nairobi",
    region: "ESAF",
    peerReviewTeam: 2,
    membershipStatus: "ACTIVE",
  },

  // ==========================================================================
  // TEAM 3 - West Africa (WACAF)
  // ==========================================================================
  {
    nameEn: "Nigerian Airspace Management Agency",
    nameFr: "Agence Nigériane de Gestion de l'Espace Aérien",
    icaoCode: "NAMA",
    country: "Nigeria",
    city: "Lagos",
    region: "WACAF",
    peerReviewTeam: 3,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Ghana Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Ghana",
    icaoCode: "DGAA",
    country: "Ghana",
    city: "Accra",
    region: "WACAF",
    peerReviewTeam: 3,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Roberts FIR",
    nameFr: "FIR Roberts",
    icaoCode: "GLRB",
    country: "Liberia",
    city: "Robertsfield",
    region: "WACAF",
    peerReviewTeam: 3,
    membershipStatus: "ACTIVE",
  },

  // ==========================================================================
  // TEAM 4 - Southern/Eastern Africa (ESAF)
  // ==========================================================================
  {
    nameEn: "Aeroportos de Moçambique",
    nameFr: "Aéroports du Mozambique",
    icaoCode: "FQMA",
    country: "Mozambique",
    city: "Maputo",
    region: "ESAF",
    peerReviewTeam: 4,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Department of Civil Aviation - Malawi",
    nameFr: "Département de l'Aviation Civile - Malawi",
    icaoCode: "FWLI",
    country: "Malawi",
    city: "Lilongwe",
    region: "ESAF",
    peerReviewTeam: 4,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "ADEMA - Aéroports de Madagascar",
    nameFr: "ADEMA - Aéroports de Madagascar",
    icaoCode: "FMMI",
    country: "Madagascar",
    city: "Antananarivo",
    region: "ESAF",
    peerReviewTeam: 4,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Civil Aviation Authority of Zimbabwe",
    nameFr: "Autorité de l'Aviation Civile du Zimbabwe",
    icaoCode: "FVHA",
    country: "Zimbabwe",
    city: "Harare",
    region: "ESAF",
    peerReviewTeam: 4,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "Zambia Airports Corporation Limited",
    nameFr: "Société des Aéroports de Zambie",
    icaoCode: "FLLS",
    country: "Zambia",
    city: "Lusaka",
    region: "ESAF",
    peerReviewTeam: 4,
    membershipStatus: "ACTIVE",
  },

  // ==========================================================================
  // TEAM 5 - North Africa (NORTHERN)
  // ==========================================================================
  {
    nameEn: "ONDA - Office National des Aéroports",
    nameFr: "ONDA - Office National des Aéroports",
    icaoCode: "GMMN",
    country: "Morocco",
    city: "Casablanca",
    region: "NORTHERN",
    peerReviewTeam: 5,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "OACA - Office de l'Aviation Civile et des Aéroports",
    nameFr: "OACA - Office de l'Aviation Civile et des Aéroports",
    icaoCode: "DTTA",
    country: "Tunisia",
    city: "Tunis",
    region: "NORTHERN",
    peerReviewTeam: 5,
    membershipStatus: "ACTIVE",
  },
  {
    nameEn: "ENNA - Établissement National de la Navigation Aérienne",
    nameFr: "ENNA - Établissement National de la Navigation Aérienne",
    icaoCode: "DAAG",
    country: "Algeria",
    city: "Algiers",
    region: "NORTHERN",
    peerReviewTeam: 5,
    membershipStatus: "ACTIVE",
  },
];

/**
 * Test users with various roles across organizations
 */
const USERS: Array<{
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  orgCode: string;
  title: string;
}> = [
  // ==========================================================================
  // CANSO SECRETARIAT - Programme Administration
  // ==========================================================================
  {
    email: "superadmin@aaprp.org",
    firstName: "System",
    lastName: "Administrator",
    role: UserRole.SUPER_ADMIN,
    orgCode: "CANSO",
    title: "System Administrator",
  },
  {
    email: "coordinator@aaprp.org",
    firstName: "Pauline",
    lastName: "Runghen",
    role: UserRole.PROGRAMME_COORDINATOR,
    orgCode: "CANSO",
    title: "Programme Coordinator",
  },
  {
    email: "coordinator2@aaprp.org",
    firstName: "Michael",
    lastName: "Ouma",
    role: UserRole.PROGRAMME_COORDINATOR,
    orgCode: "CANSO",
    title: "Regional Coordinator - East Africa",
  },

  // ==========================================================================
  // TEAM 1 - ASECNA (Steering Committee Chair)
  // ==========================================================================
  {
    email: "admin@asecna.aero",
    firstName: "Amadou",
    lastName: "Diallo",
    role: UserRole.ANSP_ADMIN,
    orgCode: "ASEC",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@asecna.aero",
    firstName: "Marie",
    lastName: "Ndiaye",
    role: UserRole.SAFETY_MANAGER,
    orgCode: "ASEC",
    title: "Safety Manager",
  },
  {
    email: "quality@asecna.aero",
    firstName: "Ibrahim",
    lastName: "Toure",
    role: UserRole.QUALITY_MANAGER,
    orgCode: "ASEC",
    title: "Quality Manager",
  },
  {
    email: "staff@asecna.aero",
    firstName: "Fatou",
    lastName: "Diop",
    role: UserRole.STAFF,
    orgCode: "ASEC",
    title: "Safety Officer",
  },

  // ==========================================================================
  // TEAM 1 - ATNS (Steering Committee Vice-Chair)
  // ==========================================================================
  {
    email: "admin@atns.co.za",
    firstName: "Thabo",
    lastName: "Molefe",
    role: UserRole.ANSP_ADMIN,
    orgCode: "FAJA",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@atns.co.za",
    firstName: "Nomvula",
    lastName: "Ndlovu",
    role: UserRole.SAFETY_MANAGER,
    orgCode: "FAJA",
    title: "Safety Manager",
  },

  // ==========================================================================
  // TEAM 1 - Botswana CAA
  // ==========================================================================
  {
    email: "admin@caab.gov.bw",
    firstName: "Kagiso",
    lastName: "Moeng",
    role: UserRole.ANSP_ADMIN,
    orgCode: "FBSK",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 1 - Eswatini CAA
  // ==========================================================================
  {
    email: "admin@ecaa.org.sz",
    firstName: "Sibusiso",
    lastName: "Dlamini",
    role: UserRole.ANSP_ADMIN,
    orgCode: "FDSK",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 2 - Uganda CAA
  // ==========================================================================
  {
    email: "admin@caa.go.ug",
    firstName: "Samuel",
    lastName: "Okello",
    role: UserRole.ANSP_ADMIN,
    orgCode: "HUEN",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@caa.go.ug",
    firstName: "Grace",
    lastName: "Nakimuli",
    role: UserRole.SAFETY_MANAGER,
    orgCode: "HUEN",
    title: "Safety Manager",
  },

  // ==========================================================================
  // TEAM 2 - Tanzania CAA
  // ==========================================================================
  {
    email: "admin@tcaa.go.tz",
    firstName: "Joseph",
    lastName: "Mwakasege",
    role: UserRole.ANSP_ADMIN,
    orgCode: "HTDA",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 2 - Burundi CAA
  // ==========================================================================
  {
    email: "admin@aacb.bi",
    firstName: "Jean-Pierre",
    lastName: "Ndayisaba",
    role: UserRole.ANSP_ADMIN,
    orgCode: "HBBA",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 2 - Rwanda CAA
  // ==========================================================================
  {
    email: "admin@rcaa.gov.rw",
    firstName: "Emmanuel",
    lastName: "Uwimana",
    role: UserRole.ANSP_ADMIN,
    orgCode: "HRYR",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 2 - Kenya CAA
  // ==========================================================================
  {
    email: "admin@kcaa.or.ke",
    firstName: "James",
    lastName: "Mwangi",
    role: UserRole.ANSP_ADMIN,
    orgCode: "HKJK",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@kcaa.or.ke",
    firstName: "Grace",
    lastName: "Wanjiku",
    role: UserRole.SAFETY_MANAGER,
    orgCode: "HKJK",
    title: "Safety Manager",
  },

  // ==========================================================================
  // TEAM 3 - NAMA (Nigeria)
  // ==========================================================================
  {
    email: "admin@nama.gov.ng",
    firstName: "Chukwuemeka",
    lastName: "Okonkwo",
    role: UserRole.ANSP_ADMIN,
    orgCode: "NAMA",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@nama.gov.ng",
    firstName: "Amina",
    lastName: "Bello",
    role: UserRole.SAFETY_MANAGER,
    orgCode: "NAMA",
    title: "Director of Safety",
  },
  {
    email: "staff@nama.gov.ng",
    firstName: "Oluwaseun",
    lastName: "Adeyemi",
    role: UserRole.STAFF,
    orgCode: "NAMA",
    title: "Safety Analyst",
  },

  // ==========================================================================
  // TEAM 3 - GCAA (Ghana)
  // ==========================================================================
  {
    email: "admin@gcaa.gov.gh",
    firstName: "Kwame",
    lastName: "Asante",
    role: UserRole.ANSP_ADMIN,
    orgCode: "DGAA",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@gcaa.gov.gh",
    firstName: "Akua",
    lastName: "Mensah",
    role: UserRole.SAFETY_MANAGER,
    orgCode: "DGAA",
    title: "Safety Manager",
  },

  // ==========================================================================
  // TEAM 3 - Roberts FIR (Guinea/Liberia/Sierra Leone)
  // ==========================================================================
  {
    email: "bsdiallo@robertsfir.org",
    firstName: "Boubacar",
    lastName: "Diallo",
    role: UserRole.ANSP_ADMIN,
    orgCode: "GLRB",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@robertsfir.aero",
    firstName: "Mohamed",
    lastName: "Kamara",
    role: UserRole.SAFETY_MANAGER,
    orgCode: "GLRB",
    title: "Safety Manager",
  },
  {
    email: "quality@robertsfir.aero",
    firstName: "Aminata",
    lastName: "Koroma",
    role: UserRole.QUALITY_MANAGER,
    orgCode: "GLRB",
    title: "Quality Manager",
  },

  // ==========================================================================
  // TEAM 4 - Mozambique Airports (ADM)
  // ==========================================================================
  {
    email: "admin@adm.gov.mz",
    firstName: "António",
    lastName: "Machava",
    role: UserRole.ANSP_ADMIN,
    orgCode: "FQMA",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 4 - Malawi DCA
  // ==========================================================================
  {
    email: "admin@dca.gov.mw",
    firstName: "Chisomo",
    lastName: "Banda",
    role: UserRole.ANSP_ADMIN,
    orgCode: "FWLI",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 4 - ADEMA (Madagascar)
  // ==========================================================================
  {
    email: "admin@adema.mg",
    firstName: "Andry",
    lastName: "Rakotondrainibe",
    role: UserRole.ANSP_ADMIN,
    orgCode: "FMMI",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 4 - CAAZ (Zimbabwe)
  // ==========================================================================
  {
    email: "admin@caaz.co.zw",
    firstName: "Tendai",
    lastName: "Moyo",
    role: UserRole.ANSP_ADMIN,
    orgCode: "FVHA",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 4 - ZACL (Zambia)
  // ==========================================================================
  {
    email: "admin@zacl.co.zm",
    firstName: "Mwamba",
    lastName: "Chilufya",
    role: UserRole.ANSP_ADMIN,
    orgCode: "FLLS",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 5 - ONDA (Morocco)
  // ==========================================================================
  {
    email: "admin@onda.ma",
    firstName: "Hassan",
    lastName: "El Mansouri",
    role: UserRole.ANSP_ADMIN,
    orgCode: "GMMN",
    title: "ANSP Focal Point",
  },
  {
    email: "safety@onda.ma",
    firstName: "Fatima",
    lastName: "Benali",
    role: UserRole.SAFETY_MANAGER,
    orgCode: "GMMN",
    title: "Safety Manager",
  },

  // ==========================================================================
  // TEAM 5 - OACA (Tunisia)
  // ==========================================================================
  {
    email: "admin@oaca.tn",
    firstName: "Mohamed",
    lastName: "Ben Ahmed",
    role: UserRole.ANSP_ADMIN,
    orgCode: "DTTA",
    title: "ANSP Focal Point",
  },

  // ==========================================================================
  // TEAM 5 - ENNA (Algeria)
  // ==========================================================================
  {
    email: "admin@enna.dz",
    firstName: "Karim",
    lastName: "Boudiaf",
    role: UserRole.ANSP_ADMIN,
    orgCode: "DAAG",
    title: "ANSP Focal Point",
  },
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedOrganizations() {
  console.log("\n🏢 Seeding organizations (22 ANSPs + CANSO Secretariat)...\n");

  const results: { id: string; icaoCode: string | null }[] = [];

  // Group by team for display
  const teams = new Map<number | null, typeof ORGANIZATIONS>();
  for (const org of ORGANIZATIONS) {
    const team = org.peerReviewTeam;
    if (!teams.has(team)) {
      teams.set(team, []);
    }
    teams.get(team)!.push(org);
  }

  // Seed by team
  const teamOrder = [null, 1, 2, 3, 4, 5];
  for (const team of teamOrder) {
    const orgs = teams.get(team) || [];
    if (orgs.length === 0) continue;

    if (team === null) {
      console.log("   📋 Programme Secretariat:");
    } else {
      console.log(`\n   📋 Team ${team}:`);
    }

    for (const org of orgs) {
      const created = await prisma.organization.upsert({
        where: { icaoCode: org.icaoCode },
        update: {
          nameEn: org.nameEn,
          nameFr: org.nameFr,
          country: org.country,
          city: org.city,
          region: org.region,
          peerReviewTeam: org.peerReviewTeam,
          membershipStatus: org.membershipStatus,
        },
        create: {
          nameEn: org.nameEn,
          nameFr: org.nameFr,
          icaoCode: org.icaoCode,
          country: org.country,
          city: org.city,
          region: org.region,
          peerReviewTeam: org.peerReviewTeam,
          membershipStatus: org.membershipStatus,
        },
      });

      results.push({ id: created.id, icaoCode: created.icaoCode });
      console.log(`      ✓ ${org.icaoCode.padEnd(6)} - ${org.nameEn.substring(0, 50)}${org.nameEn.length > 50 ? "..." : ""}`);
    }
  }

  return results;
}

async function seedUsers(
  organizations: { id: string; icaoCode: string | null }[]
) {
  console.log("\n👥 Seeding users...\n");

  const hashedPassword = await hash(DEV_PASSWORD, 12);
  const orgMap = new Map(organizations.map((o) => [o.icaoCode, o.id]));

  const roleOrder: UserRole[] = [
    UserRole.SUPER_ADMIN,
    UserRole.PROGRAMME_COORDINATOR,
    UserRole.ANSP_ADMIN,
    UserRole.SAFETY_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.STAFF,
  ];

  // Sort users by role for nicer output
  const sortedUsers = [...USERS].sort(
    (a, b) => roleOrder.indexOf(a.role as UserRole) - roleOrder.indexOf(b.role as UserRole)
  );

  let currentRole = "";

  for (const user of sortedUsers) {
    const organizationId = orgMap.get(user.orgCode);

    if (!organizationId) {
      console.warn(`   ⚠ Org not found: ${user.orgCode} for ${user.email}`);
      continue;
    }

    // Print role header
    if (user.role !== currentRole) {
      currentRole = user.role;
      console.log(`\n   ${currentRole}:`);
    }

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId,
        isActive: true,
      },
      create: {
        email: user.email,
        passwordHash: hashedPassword,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId,
        emailVerified: new Date(), // Skip verification in dev
        isActive: true,
      },
    });

    console.log(`      ${user.email.padEnd(35)} - ${user.firstName} ${user.lastName}`);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("═".repeat(75));
  console.log("  🌍 AFRICAN ANSP PEER REVIEW PROGRAMME - Development Seed");
  console.log("═".repeat(75));
  console.log("\n  ⚠️  WARNING: This creates test data for DEVELOPMENT only!\n");

  try {
    const organizations = await seedOrganizations();
    await seedUsers(organizations);

    console.log("\n" + "═".repeat(75));
    console.log("  ✅ Seed completed successfully!");
    console.log("═".repeat(75));

    console.log("\n  📊 Summary:");
    console.log("     ──────────────────────────────────────────────────────────────");
    console.log(`     Organizations created: ${ORGANIZATIONS.length}`);
    console.log(`     Users created: ${USERS.length}`);
    console.log("     ──────────────────────────────────────────────────────────────");

    console.log("\n  📝 TEST CREDENTIALS:\n");
    console.log(`     Password (all users): ${DEV_PASSWORD}`);
    console.log("\n     Quick access accounts:");
    console.log("     ──────────────────────────────────────────────────────────────");
    console.log("     superadmin@aaprp.org         - Full system access (CANSO)");
    console.log("     coordinator@aaprp.org        - Programme management (CANSO)");
    console.log("     admin@asecna.aero            - ASECNA org admin (Team 1 Chair)");
    console.log("     admin@atns.co.za             - ATNS org admin (Team 1 Vice-Chair)");
    console.log("     bsdiallo@robertsfir.org     - Roberts FIR admin (Team 3)");
    console.log("     admin@nama.gov.ng            - NAMA org admin (Team 3)");
    console.log("     admin@onda.ma                - ONDA org admin (Team 5)");
    console.log("     ──────────────────────────────────────────────────────────────");

    console.log("\n  🌍 Team Overview:");
    console.log("     ──────────────────────────────────────────────────────────────");
    console.log("     Team 1 (ESAF):     ASECNA, ATNS, Botswana, Eswatini");
    console.log("     Team 2 (ESAF):     Uganda, Tanzania, Burundi, Rwanda, Kenya");
    console.log("     Team 3 (WACAF):    NAMA, GCAA, Roberts FIR");
    console.log("     Team 4 (ESAF):     Mozambique, Malawi, Madagascar, Zimbabwe, Zambia");
    console.log("     Team 5 (NORTHERN): ONDA, OACA, ENNA");
    console.log("     ──────────────────────────────────────────────────────────────\n");

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
    await pool.end();
  });
