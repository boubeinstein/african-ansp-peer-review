/**
 * Seed Script: Teams and Organizations
 *
 * Creates the 5 Peer Support Teams and 20 member organizations
 * with proper team-organization relationships.
 *
 * Usage:
 *   npx tsx prisma/seed-teams-and-orgs.ts          # Seed data
 *   npx tsx prisma/seed-teams-and-orgs.ts cleanup  # Clean and reseed
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AfricanRegion, MembershipStatus } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// DATA
// =============================================================================

interface OrgData {
  code: string;
  organizationCode: string;
  nameEn: string;
  nameFr: string;
  country: string;
  region: AfricanRegion;
  teamNumber: number;
  isTeamLead: boolean;
}

interface TeamData {
  teamNumber: number;
  code: string;
  nameEn: string;
  nameFr: string;
  leadCode: string;
}

const ORGANIZATIONS: OrgData[] = [
  // Team 1: ASECNA & Southern Africa Partnership (4)
  {
    code: "ASECNA",
    organizationCode: "ASECNA",
    nameEn: "Agency for Aerial Navigation Safety in Africa and Madagascar",
    nameFr: "Agence pour la Sécurité de la Navigation Aérienne en Afrique et à Madagascar",
    country: "Senegal (HQ)",
    region: "WACAF",
    teamNumber: 1,
    isTeamLead: true,
  },
  {
    code: "ATNS",
    organizationCode: "ATNS",
    nameEn: "Air Traffic and Navigation Services",
    nameFr: "Services de la Circulation Aérienne et de la Navigation",
    country: "South Africa",
    region: "ESAF",
    teamNumber: 1,
    isTeamLead: false,
  },
  {
    code: "CAAB",
    organizationCode: "CAAB",
    nameEn: "Civil Aviation Authority of Botswana",
    nameFr: "Autorité de l'Aviation Civile du Botswana",
    country: "Botswana",
    region: "ESAF",
    teamNumber: 1,
    isTeamLead: false,
  },
  {
    code: "ESWACAA",
    organizationCode: "ESWACAA",
    nameEn: "Eswatini Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile d'Eswatini",
    country: "Eswatini",
    region: "ESAF",
    teamNumber: 1,
    isTeamLead: false,
  },

  // Team 2: East African Community (5)
  {
    code: "KCAA",
    organizationCode: "KCAA",
    nameEn: "Kenya Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Kenya",
    country: "Kenya",
    region: "ESAF",
    teamNumber: 2,
    isTeamLead: true,
  },
  {
    code: "TCAA",
    organizationCode: "TCAA",
    nameEn: "Tanzania Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de Tanzanie",
    country: "Tanzania",
    region: "ESAF",
    teamNumber: 2,
    isTeamLead: false,
  },
  {
    code: "UCAA",
    organizationCode: "UCAA",
    nameEn: "Uganda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de l'Ouganda",
    country: "Uganda",
    region: "ESAF",
    teamNumber: 2,
    isTeamLead: false,
  },
  {
    code: "RCAA",
    organizationCode: "RCAA",
    nameEn: "Rwanda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Rwanda",
    country: "Rwanda",
    region: "ESAF",
    teamNumber: 2,
    isTeamLead: false,
  },
  {
    code: "BCAA",
    organizationCode: "BCAA",
    nameEn: "Burundi Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Burundi",
    country: "Burundi",
    region: "ESAF",
    teamNumber: 2,
    isTeamLead: false,
  },

  // Team 3: West African Anglophone (3)
  {
    code: "NAMA",
    organizationCode: "NAMA",
    nameEn: "Nigerian Airspace Management Agency",
    nameFr: "Agence de Gestion de l'Espace Aérien du Nigéria",
    country: "Nigeria",
    region: "WACAF",
    teamNumber: 3,
    isTeamLead: true,
  },
  {
    code: "GCAA",
    organizationCode: "GCAA",
    nameEn: "Ghana Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Ghana",
    country: "Ghana",
    region: "WACAF",
    teamNumber: 3,
    isTeamLead: false,
  },
  {
    code: "RFIR",
    organizationCode: "RFIR",
    nameEn: "Roberts Flight Information Region",
    nameFr: "Région d'Information de Vol Roberts",
    country: "Liberia",
    region: "WACAF",
    teamNumber: 3,
    isTeamLead: false,
  },

  // Team 4: Southern & Eastern Africa (5)
  {
    code: "ADM",
    organizationCode: "ADM",
    nameEn: "Aeroportos de Moçambique",
    nameFr: "Aéroports du Mozambique",
    country: "Mozambique",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: true,
  },
  {
    code: "MCAA",
    organizationCode: "MCAA",
    nameEn: "Malawi Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Malawi",
    country: "Malawi",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: false,
  },
  {
    code: "ACM",
    organizationCode: "ACM",
    nameEn: "Aviation Civile de Madagascar",
    nameFr: "Aviation Civile de Madagascar",
    country: "Madagascar",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: false,
  },
  {
    code: "CAAZ",
    organizationCode: "CAAZ",
    nameEn: "Civil Aviation Authority of Zimbabwe",
    nameFr: "Autorité de l'Aviation Civile du Zimbabwe",
    country: "Zimbabwe",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: false,
  },
  {
    code: "ZACL",
    organizationCode: "ZACL",
    nameEn: "Zambia Airports Corporation Limited",
    nameFr: "Société des Aéroports de Zambie",
    country: "Zambia",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: false,
  },

  // Team 5: Northern Africa (3)
  {
    code: "DGAC",
    organizationCode: "DGAC",
    nameEn: "Directorate General of Civil Aviation",
    nameFr: "Direction Générale de l'Aviation Civile",
    country: "Morocco",
    region: "NORTHERN",
    teamNumber: 5,
    isTeamLead: true,
  },
  {
    code: "OACA",
    organizationCode: "OACA",
    nameEn: "Office of Civil Aviation and Airports",
    nameFr: "Office de l'aviation civile et des aéroports",
    country: "Tunisia",
    region: "NORTHERN",
    teamNumber: 5,
    isTeamLead: false,
  },
  {
    code: "ANAC",
    organizationCode: "ANAC",
    nameEn: "National Civil Aviation Agency",
    nameFr: "Agence Nationale de l'Aviation Civile",
    country: "Algeria",
    region: "NORTHERN",
    teamNumber: 5,
    isTeamLead: false,
  },
];

const TEAMS: TeamData[] = [
  {
    teamNumber: 1,
    code: "TEAM-1",
    nameEn: "Team 1 - ASECNA & Southern Africa Partnership",
    nameFr: "Équipe 1 - Partenariat ASECNA & Afrique Australe",
    leadCode: "ASECNA",
  },
  {
    teamNumber: 2,
    code: "TEAM-2",
    nameEn: "Team 2 - East African Community",
    nameFr: "Équipe 2 - Communauté d'Afrique de l'Est",
    leadCode: "KCAA",
  },
  {
    teamNumber: 3,
    code: "TEAM-3",
    nameEn: "Team 3 - West African Anglophone",
    nameFr: "Équipe 3 - Afrique de l'Ouest Anglophone",
    leadCode: "NAMA",
  },
  {
    teamNumber: 4,
    code: "TEAM-4",
    nameEn: "Team 4 - Southern & Eastern Africa",
    nameFr: "Équipe 4 - Afrique Australe et Orientale",
    leadCode: "ADM",
  },
  {
    teamNumber: 5,
    code: "TEAM-5",
    nameEn: "Team 5 - Northern Africa",
    nameFr: "Équipe 5 - Afrique du Nord",
    leadCode: "DGAC",
  },
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedOrganizations(): Promise<Map<string, string>> {
  console.log("\n🏢 Seeding Organizations...\n");
  const orgIdMap = new Map<string, string>();

  for (const org of ORGANIZATIONS) {
    // Find existing org by code or organizationCode
    const existing = await prisma.organization.findFirst({
      where: {
        OR: [
          { organizationCode: org.organizationCode },
        ],
      },
    });

    let created;
    if (existing) {
      // Update existing
      created = await prisma.organization.update({
        where: { id: existing.id },
        data: {
          organizationCode: org.organizationCode,
          nameEn: org.nameEn,
          nameFr: org.nameFr,
          country: org.country,
          region: org.region,
          membershipStatus: "ACTIVE" as MembershipStatus,
        },
      });
    } else {
      // Create new
      created = await prisma.organization.create({
        data: {
          organizationCode: org.organizationCode,
          nameEn: org.nameEn,
          nameFr: org.nameFr,
          country: org.country,
          region: org.region,
          membershipStatus: "ACTIVE" as MembershipStatus,
        },
      });
    }

    orgIdMap.set(org.code, created.id);
    console.log(`  ✅ ${org.code}: ${org.nameEn}`);
  }

  console.log(`\n  Total: ${orgIdMap.size} organizations created`);
  return orgIdMap;
}

async function seedTeams(orgIdMap: Map<string, string>): Promise<void> {
  console.log("\n👥 Seeding Peer Support Teams...\n");

  for (const team of TEAMS) {
    const leadOrgId = orgIdMap.get(team.leadCode);
    if (!leadOrgId) {
      console.log(`  ❌ Team ${team.teamNumber}: Lead org ${team.leadCode} not found`);
      continue;
    }

    // Create team
    const created = await prisma.regionalTeam.upsert({
      where: { code: team.code },
      update: {
        teamNumber: team.teamNumber,
        nameEn: team.nameEn,
        nameFr: team.nameFr,
        leadOrganizationId: leadOrgId,
        isActive: true,
      },
      create: {
        code: team.code,
        teamNumber: team.teamNumber,
        nameEn: team.nameEn,
        nameFr: team.nameFr,
        leadOrganizationId: leadOrgId,
        isActive: true,
      },
    });

    // Link member organizations to team
    const memberOrgs = ORGANIZATIONS.filter((o) => o.teamNumber === team.teamNumber);
    for (const memberOrg of memberOrgs) {
      const memberId = orgIdMap.get(memberOrg.code);
      if (memberId) {
        await prisma.organization.update({
          where: { id: memberId },
          data: { regionalTeamId: created.id },
        });
      }
    }

    const memberCodes = memberOrgs.map((o) => o.code).join(", ");
    console.log(`  ✅ ${team.code}: ${team.nameEn}`);
    console.log(`     Lead: ${team.leadCode} | Members: ${memberCodes}`);
  }
}

async function cleanup(): Promise<void> {
  console.log("\n🧹 Cleaning up teams and organizations...\n");

  // Unlink organizations from teams
  await prisma.organization.updateMany({
    data: { regionalTeamId: null },
  });
  console.log("  ✅ Organizations unlinked from teams");

  // Delete teams
  const teamsDeleted = await prisma.regionalTeam.deleteMany({});
  console.log(`  ✅ Teams deleted: ${teamsDeleted.count}`);

  // Delete organizations
  const orgsDeleted = await prisma.organization.deleteMany({});
  console.log(`  ✅ Organizations deleted: ${orgsDeleted.count}`);
}

async function printSummary(): Promise<void> {
  console.log("\n" + "═".repeat(60));
  console.log("📊 SEED SUMMARY");
  console.log("═".repeat(60));

  const teams = await prisma.regionalTeam.findMany({
    include: {
      leadOrganization: {
        select: { id: true, organizationCode: true, nameEn: true }
      },
      memberOrganizations: {
        select: { id: true, organizationCode: true }
      },
    },
    orderBy: { teamNumber: "asc" },
  });

  console.log("\n┌──────┬──────────────────────────────────────┬──────┬───────────────────────────┐");
  console.log("│ Team │                 Name                 │ Lead │          Members          │");
  console.log("├──────┼──────────────────────────────────────┼──────┼───────────────────────────┤");

  for (const team of teams) {
    const leadCode = team.leadOrganization?.organizationCode || "N/A";
    const members = team.memberOrganizations
      .filter((m) => m.organizationCode !== team.leadOrganization?.organizationCode)
      .map((m) => m.organizationCode)
      .join(", ");
    const name = team.nameEn.replace("Team " + team.teamNumber + " - ", "");
    console.log(
      `│ ${team.teamNumber.toString().padEnd(4)} │ ${name.padEnd(36)} │ ${leadCode.padEnd(4)} │ ${members.padEnd(25)} │`
    );
  }

  console.log("└──────┴──────────────────────────────────────┴──────┴───────────────────────────┘");

  const orgCount = await prisma.organization.count();
  const teamCount = await prisma.regionalTeam.count();
  console.log(`\nTotal: ${teamCount} teams, ${orgCount} organizations`);
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
      // Default: seed
      const orgIdMap = await seedOrganizations();
      await seedTeams(orgIdMap);
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