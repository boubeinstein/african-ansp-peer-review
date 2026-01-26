/**
 * Seed Script: ANSP_ADMIN Focal Point Users
 *
 * Creates organization administrator users (ANSP_ADMIN role) for each
 * participating organization. These users can:
 * - Request peer reviews for their organization
 * - View and manage organization's self-assessments
 * - View findings and CAPs related to their organization
 * - Manage organization profile and users
 *
 * NOTE: These are separate from reviewers (LEAD_REVIEWER, PEER_REVIEWER)
 * who conduct reviews of OTHER organizations.
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { UserRole, Locale } from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "Demo2024!";

interface ANSPAdmin {
  email: string;
  firstName: string;
  lastName: string;
  orgCode: string;
}

// Emails that were incorrectly seeded and need to be cleaned up
const WRONG_EMAILS_TO_DELETE = [
  "admin@dca.gov.mw",   // Should be admin@mcaa.gov.mw
  "admin@adema.mg",     // Should be admin@acm.mg
  "admin@onda.ma",      // Should be admin@dgac.ma
  "admin@enna.dz",      // Should be admin@anac.dz
];

// ANSP_ADMIN focal points - one per organization
// Using organization codes from seed-teams-and-orgs.ts
const ANSP_ADMIN_USERS: ANSPAdmin[] = [
  // Team 1: ASECNA & Southern Africa
  { email: "admin@asecna.aero", firstName: "ASECNA", lastName: "Focal Point", orgCode: "ASECNA" },
  { email: "admin@atns.co.za", firstName: "ATNS", lastName: "Focal Point", orgCode: "ATNS" },
  { email: "admin@caab.co.bw", firstName: "CAAB", lastName: "Focal Point", orgCode: "CAAB" },
  { email: "admin@eswacaa.org.sz", firstName: "ESWACAA", lastName: "Focal Point", orgCode: "ESWACAA" },

  // Team 2: East African Community
  { email: "admin@kcaa.or.ke", firstName: "KCAA", lastName: "Focal Point", orgCode: "KCAA" },
  { email: "admin@tcaa.go.tz", firstName: "TCAA", lastName: "Focal Point", orgCode: "TCAA" },
  { email: "admin@ucaa.go.ug", firstName: "UCAA", lastName: "Focal Point", orgCode: "UCAA" },
  { email: "admin@rcaa.gov.rw", firstName: "RCAA", lastName: "Focal Point", orgCode: "RCAA" },
  { email: "admin@bcaa.gov.bi", firstName: "BCAA", lastName: "Focal Point", orgCode: "BCAA" },

  // Team 3: West African Anglophone
  { email: "admin@nama.gov.ng", firstName: "NAMA", lastName: "Focal Point", orgCode: "NAMA" },
  { email: "admin@gcaa.com.gh", firstName: "GCAA", lastName: "Focal Point", orgCode: "GCAA" },
  { email: "admin@robertsfir.org", firstName: "Roberts FIR", lastName: "Focal Point", orgCode: "RFIR" },

  // Team 4: Southern & Eastern Africa (CORRECTED)
  { email: "admin@aeroportos.co.mz", firstName: "ADM", lastName: "Focal Point", orgCode: "ADM" },         // Mozambique
  { email: "admin@mcaa.gov.mw", firstName: "MCAA", lastName: "Focal Point", orgCode: "MCAA" },            // Malawi
  { email: "admin@acm.mg", firstName: "ACM", lastName: "Focal Point", orgCode: "ACM" },                   // Madagascar
  { email: "admin@caaz.co.zw", firstName: "CAAZ", lastName: "Focal Point", orgCode: "CAAZ" },
  { email: "admin@zacl.co.zm", firstName: "ZACL", lastName: "Focal Point", orgCode: "ZACL" },

  // Team 5: Northern Africa (CORRECTED)
  { email: "admin@dgac.ma", firstName: "DGAC", lastName: "Focal Point", orgCode: "DGAC" },                // Morocco
  { email: "admin@oaca.nat.tn", firstName: "OACA", lastName: "Focal Point", orgCode: "OACA" },
  { email: "admin@anac.dz", firstName: "ANAC", lastName: "Focal Point", orgCode: "ANAC" },                // Algeria
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

async function createANSPAdmin(
  admin: ANSPAdmin,
  orgMap: Map<string, string>,
  passwordHash: string
) {
  const organizationId = orgMap.get(admin.orgCode);

  if (!organizationId) {
    console.warn(`  ⚠️ Organization not found: ${admin.orgCode} (user: ${admin.email})`);
    return null;
  }

  const dbUser = await prisma.user.upsert({
    where: { email: admin.email },
    update: {
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: "ANSP_ADMIN" as UserRole,
      organizationId,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
    },
    create: {
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: "ANSP_ADMIN" as UserRole,
      organizationId,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
      locale: "EN" as Locale,
    },
  });

  console.log(`  ✅ ${admin.firstName} ${admin.lastName} (${admin.orgCode}) - ${admin.email}`);
  return dbUser;
}

async function cleanupWrongUsers() {
  console.log("🗑️ Cleaning up incorrectly seeded users...\n");

  for (const email of WRONG_EMAILS_TO_DELETE) {
    const result = await prisma.user.deleteMany({ where: { email } });
    if (result.count > 0) {
      console.log(`  🗑️ Deleted: ${email}`);
    }
  }
  console.log("");
}

async function main() {
  console.log("\n🏢 Seeding ANSP_ADMIN Focal Point Users...\n");

  // First, clean up any incorrectly seeded users
  await cleanupWrongUsers();

  // Get organization mapping
  const orgMap = await getOrganizationMap();
  console.log(`   Found ${orgMap.size} organizations in database\n`);

  // Hash password once
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  let userCount = 0;

  // Create all ANSP_ADMIN users
  console.log("Creating ANSP_ADMIN users:\n");
  for (const admin of ANSP_ADMIN_USERS) {
    const result = await createANSPAdmin(admin, orgMap, passwordHash);
    if (result) {
      userCount++;
    }
  }

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("📊 ANSP_ADMIN SEED SUMMARY");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`Total ANSP_ADMIN users created/updated: ${userCount}`);
  console.log("════════════════════════════════════════════════════════════\n");
  console.log(`📝 Default password for all users: ${DEFAULT_PASSWORD}`);
  console.log("\n🔑 ANSP_ADMIN Permissions:");
  console.log("   - Request peer reviews for their organization");
  console.log("   - View and manage organization's self-assessments");
  console.log("   - View findings and CAPs for their organization");
  console.log("   - Cannot participate in review teams\n");
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
