/**
 * Seed Script: Demo Users and Reviewer Profiles
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { UserRole, Locale, ReviewerStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


const DEFAULT_PASSWORD = "Demo2024!";

interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  orgCode: string; // ICAO code matching database
  reviewerStatus?: ReviewerStatus;
}

// CORRECT organization codes (verified from database):
// ASECNA, ATNS, CAAB, ESWACAA, KCAA, TCAA, UCAA, RCAA, BCAA,
// NAMA, GCAA, RFIR, ADM, MCAA, ACM, CAAZ, ZACL, DGAC, OACA, ANAC

// System Users (3)
const SYSTEM_USERS: DemoUser[] = [
  {
    email: "admin@aaprp.aero",
    firstName: "System",
    lastName: "Administrator",
    role: "SUPER_ADMIN",
    orgCode: "ASECNA",
  },
  {
    email: "coordinator@aaprp.aero",
    firstName: "Pauline",
    lastName: "Runghen",
    role: "PROGRAMME_COORDINATOR",
    orgCode: "ASECNA",
  },
  {
    email: "steering@aaprp.aero",
    firstName: "Emmanuel",
    lastName: "Chukwuma",
    role: "STEERING_COMMITTEE",
    orgCode: "NAMA",
  },
];

// Team 1: ASECNA & Southern Africa (8 reviewers)
const TEAM1_REVIEWERS: DemoUser[] = [
  { email: "amadou.diallo@asecna.aero", firstName: "Amadou", lastName: "Diallo", role: "LEAD_REVIEWER", orgCode: "ASECNA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "fatou.ndiaye@asecna.aero", firstName: "Fatou", lastName: "Ndiaye", role: "PEER_REVIEWER", orgCode: "ASECNA", reviewerStatus: "CERTIFIED" },
  { email: "thabo.molefe@atns.co.za", firstName: "Thabo", lastName: "Molefe", role: "LEAD_REVIEWER", orgCode: "ATNS", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "nomvula.dlamini@atns.co.za", firstName: "Nomvula", lastName: "Dlamini", role: "PEER_REVIEWER", orgCode: "ATNS", reviewerStatus: "CERTIFIED" },
  { email: "kago.mothibi@caab.co.bw", firstName: "Kago", lastName: "Mothibi", role: "LEAD_REVIEWER", orgCode: "CAAB", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "lesego.phiri@caab.co.bw", firstName: "Lesego", lastName: "Phiri", role: "PEER_REVIEWER", orgCode: "CAAB", reviewerStatus: "CERTIFIED" },
  { email: "sipho.dlamini@eswacaa.org.sz", firstName: "Sipho", lastName: "Dlamini", role: "LEAD_REVIEWER", orgCode: "ESWACAA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "thandiwe.nkosi@eswacaa.org.sz", firstName: "Thandiwe", lastName: "Nkosi", role: "PEER_REVIEWER", orgCode: "ESWACAA", reviewerStatus: "CERTIFIED" },
];

// Team 2: East African Community (10 reviewers)
const TEAM2_REVIEWERS: DemoUser[] = [
  { email: "james.ochieng@kcaa.or.ke", firstName: "James", lastName: "Ochieng", role: "LEAD_REVIEWER", orgCode: "KCAA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "wanjiku.kamau@kcaa.or.ke", firstName: "Wanjiku", lastName: "Kamau", role: "PEER_REVIEWER", orgCode: "KCAA", reviewerStatus: "CERTIFIED" },
  { email: "baraka.mwakasege@tcaa.go.tz", firstName: "Baraka", lastName: "Mwakasege", role: "LEAD_REVIEWER", orgCode: "TCAA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "rehema.mushi@tcaa.go.tz", firstName: "Rehema", lastName: "Mushi", role: "PEER_REVIEWER", orgCode: "TCAA", reviewerStatus: "CERTIFIED" },
  { email: "moses.okello@ucaa.go.ug", firstName: "Moses", lastName: "Okello", role: "LEAD_REVIEWER", orgCode: "UCAA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "grace.nakato@ucaa.go.ug", firstName: "Grace", lastName: "Nakato", role: "PEER_REVIEWER", orgCode: "UCAA", reviewerStatus: "CERTIFIED" },
  { email: "jean.mugabo@rcaa.gov.rw", firstName: "Jean-Pierre", lastName: "Mugabo", role: "LEAD_REVIEWER", orgCode: "RCAA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "claire.uwimana@rcaa.gov.rw", firstName: "Claire", lastName: "Uwimana", role: "PEER_REVIEWER", orgCode: "RCAA", reviewerStatus: "CERTIFIED" },
  { email: "pierre.ndayisaba@bcaa.gov.bi", firstName: "Pierre", lastName: "Ndayisaba", role: "LEAD_REVIEWER", orgCode: "BCAA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "aline.niyonzima@bcaa.gov.bi", firstName: "Aline", lastName: "Niyonzima", role: "PEER_REVIEWER", orgCode: "BCAA", reviewerStatus: "CERTIFIED" },
];

// Team 3: West African Anglophone (6 reviewers)
const TEAM3_REVIEWERS: DemoUser[] = [
  { email: "chukwuemeka.okonkwo@nama.gov.ng", firstName: "Chukwuemeka", lastName: "Okonkwo", role: "LEAD_REVIEWER", orgCode: "NAMA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "ngozi.adeyemi@nama.gov.ng", firstName: "Ngozi", lastName: "Adeyemi", role: "PEER_REVIEWER", orgCode: "NAMA", reviewerStatus: "CERTIFIED" },
  { email: "kwame.asante@gcaa.com.gh", firstName: "Kwame", lastName: "Asante", role: "LEAD_REVIEWER", orgCode: "GCAA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "abena.mensah@gcaa.com.gh", firstName: "Abena", lastName: "Mensah", role: "PEER_REVIEWER", orgCode: "GCAA", reviewerStatus: "CERTIFIED" },
  { email: "sekou.camara@lcaa.gov.lr", firstName: "Sekou", lastName: "Camara", role: "LEAD_REVIEWER", orgCode: "RFIR", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "boubacar.diallo@lcaa.gov.lr", firstName: "Boubacar S. C.", lastName: "Diallo", role: "PEER_REVIEWER", orgCode: "RFIR", reviewerStatus: "CERTIFIED" },
];

// Team 4: Southern & Eastern Africa (10 reviewers)
const TEAM4_REVIEWERS: DemoUser[] = [
  { email: "carlos.machava@aeroportos.co.mz", firstName: "Carlos", lastName: "Machava", role: "LEAD_REVIEWER", orgCode: "ADM", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "ana.tembe@aeroportos.co.mz", firstName: "Ana", lastName: "Tembe", role: "PEER_REVIEWER", orgCode: "ADM", reviewerStatus: "CERTIFIED" },
  { email: "chimwemwe.banda@dca.gov.mw", firstName: "Chimwemwe", lastName: "Banda", role: "LEAD_REVIEWER", orgCode: "MCAA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "tionge.phiri@dca.gov.mw", firstName: "Tionge", lastName: "Phiri", role: "PEER_REVIEWER", orgCode: "MCAA", reviewerStatus: "CERTIFIED" },
  { email: "jean.rakoto@adema.mg", firstName: "Jean-Claude", lastName: "Rakotomalala", role: "LEAD_REVIEWER", orgCode: "ACM", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "hery.andria@adema.mg", firstName: "Hery", lastName: "Andriamanana", role: "PEER_REVIEWER", orgCode: "ACM", reviewerStatus: "CERTIFIED" },
  { email: "tendai.moyo@caaz.co.zw", firstName: "Tendai", lastName: "Moyo", role: "LEAD_REVIEWER", orgCode: "CAAZ", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "chiedza.ncube@caaz.co.zw", firstName: "Chiedza", lastName: "Ncube", role: "PEER_REVIEWER", orgCode: "CAAZ", reviewerStatus: "CERTIFIED" },
  { email: "mulenga.chanda@zacl.co.zm", firstName: "Mulenga", lastName: "Chanda", role: "LEAD_REVIEWER", orgCode: "ZACL", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "natasha.mumba@zacl.co.zm", firstName: "Natasha", lastName: "Mumba", role: "PEER_REVIEWER", orgCode: "ZACL", reviewerStatus: "CERTIFIED" },
];

// Team 5: Northern Africa (6 reviewers)
const TEAM5_REVIEWERS: DemoUser[] = [
  { email: "youssef.benali@onda.ma", firstName: "Youssef", lastName: "Benali", role: "LEAD_REVIEWER", orgCode: "DGAC", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "fatima.alaoui@onda.ma", firstName: "Fatima", lastName: "Alaoui", role: "PEER_REVIEWER", orgCode: "DGAC", reviewerStatus: "CERTIFIED" },
  { email: "mohamed.trabelsi@oaca.nat.tn", firstName: "Mohamed", lastName: "Trabelsi", role: "LEAD_REVIEWER", orgCode: "OACA", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "leila.chaabane@oaca.nat.tn", firstName: "Leila", lastName: "Chaabane", role: "PEER_REVIEWER", orgCode: "OACA", reviewerStatus: "CERTIFIED" },
  { email: "karim.boudiaf@enna.dz", firstName: "Karim", lastName: "Boudiaf", role: "LEAD_REVIEWER", orgCode: "ANAC", reviewerStatus: "LEAD_QUALIFIED" },
  { email: "samira.hadj@enna.dz", firstName: "Samira", lastName: "Hadj", role: "PEER_REVIEWER", orgCode: "ANAC", reviewerStatus: "CERTIFIED" },
];

const ALL_USERS: DemoUser[] = [
  ...SYSTEM_USERS,
  ...TEAM1_REVIEWERS,
  ...TEAM2_REVIEWERS,
  ...TEAM3_REVIEWERS,
  ...TEAM4_REVIEWERS,
  ...TEAM5_REVIEWERS,
];

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

async function createUser(user: DemoUser, orgMap: Map<string, string>, passwordHash: string) {
  const organizationId = orgMap.get(user.orgCode) || null;

  if (!organizationId) {
    console.warn(`  ⚠️ Org not found: ${user.orgCode} (user: ${user.email})`);
    return null;
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
      locale: "EN" as Locale,
    },
  });

  // Create reviewer profile if applicable
  if (user.reviewerStatus && organizationId) {
    const yearsExp = user.reviewerStatus === "LEAD_QUALIFIED" ? 10 : 5;
    const isLead = user.reviewerStatus === "LEAD_QUALIFIED";

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
  }

  const status = user.reviewerStatus === "LEAD_QUALIFIED" ? "LEAD" : user.reviewerStatus === "CERTIFIED" ? "CERT" : "";
  console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.orgCode})${status ? ` - ${status}` : ""}`);

  return dbUser;
}

async function main() {
  console.log("\n👤 Seeding Demo Users and Reviewer Profiles...\n");

  // Get organization mapping
  const orgMap = await getOrganizationMap();
  console.log(`   Found ${orgMap.size} organizations in database\n`);

  // Hash password once
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  let userCount = 0;
  let profileCount = 0;

  // Create all users
  for (const user of ALL_USERS) {
    const result = await createUser(user, orgMap, passwordHash);
    if (result) {
      userCount++;
      if (user.reviewerStatus) profileCount++;
    }
  }

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("📊 USER SEED SUMMARY");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`Total: ${userCount} users, ${profileCount} reviewer profiles`);
  console.log("════════════════════════════════════════════════════════════\n");
  console.log(`📝 Default password for all users: ${DEFAULT_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
