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

import { PrismaClient, AfricanRegion, MembershipStatus } from "@prisma/client";

const prisma = new PrismaClient();

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

async function cleanup() {
  console.log("🧹 Cleaning up existing data...");

  // Delete in correct order due to foreign key constraints
  // First, remove team references from organizations
  await prisma.organization.updateMany({
    where: { regionalTeamId: { not: null } },
    data: { regionalTeamId: null },
  });

  // Delete teams
  const deletedTeams = await prisma.regionalTeam.deleteMany({
    where: {
      code: { in: TEAMS.map((t) => t.code) },
    },
  });
  console.log(`   Deleted ${deletedTeams.count} teams`);

  // Delete organizations
  const deletedOrgs = await prisma.organization.deleteMany({
    where: {
      icaoCode: { in: ORGANIZATIONS.map((o) => o.icaoCode) },
    },
  });
  console.log(`   Deleted ${deletedOrgs.count} organizations`);
}

async function seedOrganizations(): Promise<Map<string, string>> {
  console.log("\n📍 Creating organizations...");
  const orgIdMap = new Map<string, string>();

  for (const org of ORGANIZATIONS) {
    const existing = await prisma.organization.findFirst({
      where: { icaoCode: org.icaoCode },
    });

    if (existing) {
      console.log(`   ⏭️  ${org.code} already exists, skipping`);
      orgIdMap.set(org.code, existing.id);
      continue;
    }

    const created = await prisma.organization.create({
      data: {
        nameEn: org.nameEn,
        nameFr: org.nameFr,
        icaoCode: org.icaoCode,
        country: org.country,
        region: org.region,
        peerReviewTeam: org.teamNumber,
        membershipStatus: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
        joinedProgrammeAt: new Date(),
        participationStatus: "ACTIVE",
      },
    });

    orgIdMap.set(org.code, created.id);
    console.log(`   ✅ Created ${org.code} - ${org.nameEn}`);
  }

  return orgIdMap;
}

async function seedTeams(orgIdMap: Map<string, string>): Promise<void> {
  console.log("\n🏢 Creating peer support teams...");

  for (const team of TEAMS) {
    const leadOrgId = orgIdMap.get(team.leadCode);

    if (!leadOrgId) {
      console.error(`   ❌ Lead organization ${team.leadCode} not found for team ${team.code}`);
      continue;
    }

    const existing = await prisma.regionalTeam.findFirst({
      where: { code: team.code },
    });

    if (existing) {
      console.log(`   ⏭️  ${team.code} already exists, updating...`);
      await prisma.regionalTeam.update({
        where: { id: existing.id },
        data: {
          nameEn: team.nameEn,
          nameFr: team.nameFr,
          leadOrganizationId: leadOrgId,
        },
      });
      continue;
    }

    const created = await prisma.regionalTeam.create({
      data: {
        teamNumber: team.teamNumber,
        code: team.code,
        nameEn: team.nameEn,
        nameFr: team.nameFr,
        leadOrganizationId: leadOrgId,
        isActive: true,
      },
    });

    console.log(`   ✅ Created ${team.code} - ${team.nameEn}`);

    // Assign team members
    const teamOrgs = ORGANIZATIONS.filter((o) => o.teamNumber === team.teamNumber);
    for (const org of teamOrgs) {
      const orgId = orgIdMap.get(org.code);
      if (orgId) {
        await prisma.organization.update({
          where: { id: orgId },
          data: { regionalTeamId: created.id },
        });
      }
    }
    console.log(`      → Assigned ${teamOrgs.length} organizations to team`);
  }
}

async function printSummary() {
  console.log("\n📊 Summary:");

  const teams = await prisma.regionalTeam.findMany({
    include: {
      leadOrganization: { select: { icaoCode: true, nameEn: true } },
      memberOrganizations: { select: { icaoCode: true, nameEn: true } },
    },
    orderBy: { teamNumber: "asc" },
  });

  for (const team of teams) {
    console.log(`\n   ${team.code} - ${team.nameEn}`);
    console.log(`   Lead: ${team.leadOrganization.icaoCode} (${team.leadOrganization.nameEn})`);
    console.log(`   Members: ${team.memberOrganizations.length}`);
    for (const member of team.memberOrganizations) {
      const isLead = member.icaoCode === team.leadOrganization.icaoCode;
      console.log(`      - ${member.icaoCode}: ${member.nameEn}${isLead ? " ★" : ""}`);
    }
  }

  const totalOrgs = await prisma.organization.count({
    where: { regionalTeamId: { not: null } },
  });
  console.log(`\n   Total organizations in teams: ${totalOrgs}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes("cleanup");

  console.log("🌱 Seeding Teams and Organizations");
  console.log("===================================\n");

  try {
    if (shouldCleanup) {
      await cleanup();
    }

    const orgIdMap = await seedOrganizations();
    await seedTeams(orgIdMap);
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
