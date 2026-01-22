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
  icaoCode: string;
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
    code: "ASEC",
    icaoCode: "ASEC",
    nameEn: "ASECNA - Agency for Aerial Navigation Safety in Africa",
    nameFr: "ASECNA - Agence pour la Sécurité de la Navigation Aérienne en Afrique",
    country: "Senegal (HQ)",
    region: "WACAF",
    teamNumber: 1,
    isTeamLead: true,
  },
  {
    code: "ATNS",
    icaoCode: "ATNS",
    nameEn: "Air Traffic and Navigation Services (South Africa)",
    nameFr: "Services de la circulation aérienne et de la navigation (Afrique du Sud)",
    country: "South Africa",
    region: "ESAF",
    teamNumber: 1,
    isTeamLead: false,
  },
  {
    code: "CAAB",
    icaoCode: "FBSK",
    nameEn: "Civil Aviation Authority of Botswana",
    nameFr: "Autorité de l'Aviation Civile du Botswana",
    country: "Botswana",
    region: "ESAF",
    teamNumber: 1,
    isTeamLead: false,
  },
  {
    code: "ESWACAA",
    icaoCode: "FDMS",
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
    icaoCode: "HKJK",
    nameEn: "Kenya Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Kenya",
    country: "Kenya",
    region: "ESAF",
    teamNumber: 2,
    isTeamLead: true,
  },
  {
    code: "TCAA",
    icaoCode: "HTDA",
    nameEn: "Tanzania Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de Tanzanie",
    country: "Tanzania",
    region: "ESAF",
    teamNumber: 2,
    isTeamLead: false,
  },
  {
    code: "UCAA",
    icaoCode: "HUEN",
    nameEn: "Uganda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile de l'Ouganda",
    country: "Uganda",
    region: "ESAF",
    teamNumber: 2,
    isTeamLead: false,
  },
  {
    code: "RCAA",
    icaoCode: "HRYR",
    nameEn: "Rwanda Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Rwanda",
    country: "Rwanda",
    region: "ESAF",
    teamNumber: 2,
    isTeamLead: false,
  },
  {
    code: "BCAA",
    icaoCode: "HBBA",
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
    icaoCode: "DNAA",
    nameEn: "Nigerian Airspace Management Agency",
    nameFr: "Agence de Gestion de l'Espace Aérien du Nigeria",
    country: "Nigeria",
    region: "WACAF",
    teamNumber: 3,
    isTeamLead: true,
  },
  {
    code: "GCAA",
    icaoCode: "DGAA",
    nameEn: "Ghana Civil Aviation Authority",
    nameFr: "Autorité de l'Aviation Civile du Ghana",
    country: "Ghana",
    region: "WACAF",
    teamNumber: 3,
    isTeamLead: false,
  },
  {
    code: "RFIR",
    icaoCode: "GLRB",
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
    icaoCode: "FQMA",
    nameEn: "Aeroportos de Moçambique",
    nameFr: "Aéroports du Mozambique",
    country: "Mozambique",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: true,
  },
  {
    code: "DCA-MW",
    icaoCode: "FWKI",
    nameEn: "Department of Civil Aviation Malawi",
    nameFr: "Département de l'Aviation Civile du Malawi",
    country: "Malawi",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: false,
  },
  {
    code: "ADEMA",
    icaoCode: "FMMI",
    nameEn: "ADEMA - Aéroports de Madagascar",
    nameFr: "ADEMA - Aéroports de Madagascar",
    country: "Madagascar",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: false,
  },
  {
    code: "CAAZ",
    icaoCode: "FVHA",
    nameEn: "Civil Aviation Authority of Zimbabwe",
    nameFr: "Autorité de l'Aviation Civile du Zimbabwe",
    country: "Zimbabwe",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: false,
  },
  {
    code: "ZACL",
    icaoCode: "FLKK",
    nameEn: "Zambia Airports Corporation Limited",
    nameFr: "Société des Aéroports de Zambie",
    country: "Zambia",
    region: "ESAF",
    teamNumber: 4,
    isTeamLead: false,
  },

  // Team 5: Northern Africa (3)
  {
    code: "ONDA",
    icaoCode: "GMMN",
    nameEn: "ONDA - Office National Des Aéroports (Morocco)",
    nameFr: "ONDA - Office National Des Aéroports (Maroc)",
    country: "Morocco",
    region: "NORTHERN",
    teamNumber: 5,
    isTeamLead: true,
  },
  {
    code: "OACA",
    icaoCode: "DTTA",
    nameEn: "OACA - Office de l'Aviation Civile et des Aéroports (Tunisia)",
    nameFr: "OACA - Office de l'Aviation Civile et des Aéroports (Tunisie)",
    country: "Tunisia",
    region: "NORTHERN",
    teamNumber: 5,
    isTeamLead: false,
  },
  {
    code: "ENNA",
    icaoCode: "DAAG",
    nameEn: "ENNA - Etablissement National de la Navigation Aérienne (Algeria)",
    nameFr: "ENNA - Etablissement National de la Navigation Aérienne (Algérie)",
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
    leadCode: "ASEC",
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
    leadCode: "ONDA",
  },
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedOrganizations(): Promise<Map<string, string>> {
  console.log("\n🏢 Seeding Organizations...\n");
  const orgIdMap = new Map<string, string>();

  for (const org of ORGANIZATIONS) {
    // Find existing org by code or icaoCode
    const existing = await prisma.organization.findFirst({
      where: {
        OR: [
          { icaoCode: org.icaoCode },
        ],
      },
    });

    let created;
    if (existing) {
      // Update existing
      created = await prisma.organization.update({
        where: { id: existing.id },
        data: {
          icaoCode: org.icaoCode,
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
          icaoCode: org.icaoCode,
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
        select: { id: true, icaoCode: true, nameEn: true }
      },
      memberOrganizations: {
        select: { id: true, icaoCode: true }
      },
    },
    orderBy: { teamNumber: "asc" },
  });

  console.log("\n┌──────┬──────────────────────────────────────┬──────┬───────────────────────────┐");
  console.log("│ Team │                 Name                 │ Lead │          Members          │");
  console.log("├──────┼──────────────────────────────────────┼──────┼───────────────────────────┤");

  for (const team of teams) {
    const leadCode = team.leadOrganization?.icaoCode || "N/A";
    const members = team.memberOrganizations
      .filter((m) => m.icaoCode !== team.leadOrganization?.icaoCode)
      .map((m) => m.icaoCode)
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