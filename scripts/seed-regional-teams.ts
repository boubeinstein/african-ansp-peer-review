import { PrismaClient, AfricanRegion } from "@prisma/client";

const prisma = new PrismaClient();

// Team composition from 5A5thAFIAviationSafetySymposiumANSPPeerReviewMechanismbyCANSO.pdf
const REGIONAL_TEAMS: {
  teamNumber: number;
  code: string;
  nameEn: string;
  nameFr: string;
  region: AfricanRegion;
  memberCodes: string[];
  leadCode: string;
}[] = [
  {
    teamNumber: 1,
    code: "TEAM-1",
    nameEn: "Team 1 - ASECNA & Southern Africa Partnership",
    nameFr: "Équipe 1 - Partenariat ASECNA & Afrique Australe",
    region: "WACAF", // ASECNA-led, primarily West/Central Africa
    // ASECNA, ATNS (South Africa), Botswana CAA, Swaziland/Eswatini CAA
    memberCodes: ["ASEC", "ATNS", "FBSK", "FDMS"],
    leadCode: "ASEC", // ASECNA as largest member
  },
  {
    teamNumber: 2,
    code: "TEAM-2",
    nameEn: "Team 2 - East African Community",
    nameFr: "Équipe 2 - Communauté d'Afrique de l'Est",
    region: "ESAF", // East and Southern Africa
    // Uganda CAA, Tanzania CAA, Burundi CAA, Rwanda CAA, Kenya CAA
    memberCodes: ["HUEN", "HTDA", "HBBA", "HRYR", "HKJK"],
    leadCode: "HKJK", // Kenya CAA (KCAA)
  },
  {
    teamNumber: 3,
    code: "TEAM-3",
    nameEn: "Team 3 - West African Anglophone",
    nameFr: "Équipe 3 - Afrique de l'Ouest Anglophone",
    region: "WACAF", // West and Central Africa
    // NAMA (Nigeria), GCAA (Ghana), Roberts FIR (Guinea, Liberia, Sierra Leone)
    memberCodes: ["NAMA", "DGAA", "GLRB"],
    leadCode: "NAMA", // NAMA (Nigeria) as largest
  },
  {
    teamNumber: 4,
    code: "TEAM-4",
    nameEn: "Team 4 - Southern & Eastern Africa",
    nameFr: "Équipe 4 - Afrique Australe et Orientale",
    region: "ESAF", // East and Southern Africa
    // Mozambique Airports, Malawi, Madagascar, Zimbabwe CAA, Zambia Airports
    memberCodes: ["FQMA", "FWKI", "FMMI", "FVHA", "FLKK"],
    leadCode: "FQMA", // Mozambique
  },
  {
    teamNumber: 5,
    code: "TEAM-5",
    nameEn: "Team 5 - Northern Africa",
    nameFr: "Équipe 5 - Afrique du Nord",
    region: "NORTHERN", // Northern Africa
    // Morocco CAA (ONDA), Tunisia, Algeria
    memberCodes: ["GMMN", "DTTA", "DAAG"],
    leadCode: "GMMN", // Morocco (ONDA)
  },
];

async function seedRegionalTeams() {
  console.log("🌍 Seeding Regional Teams...\n");

  for (const team of REGIONAL_TEAMS) {
    console.log(`Creating ${team.nameEn}...`);

    // Find lead organization by ICAO code
    const leadOrg = await prisma.organization.findFirst({
      where: { icaoCode: team.leadCode },
    });

    if (!leadOrg) {
      console.warn(`  ⚠️ Lead organization not found: ${team.leadCode}`);
      continue;
    }

    // Create or update the regional team
    const regionalTeam = await prisma.regionalTeam.upsert({
      where: { teamNumber: team.teamNumber },
      update: {
        code: team.code,
        nameEn: team.nameEn,
        nameFr: team.nameFr,
        region: team.region,
        leadOrganizationId: leadOrg.id,
      },
      create: {
        teamNumber: team.teamNumber,
        code: team.code,
        nameEn: team.nameEn,
        nameFr: team.nameFr,
        region: team.region,
        leadOrganizationId: leadOrg.id,
        isActive: true,
      },
    });

    console.log(`  ✅ Created team: ${regionalTeam.code}`);

    // Link member organizations to this team
    let linkedCount = 0;
    for (const memberCode of team.memberCodes) {
      const memberOrg = await prisma.organization.findFirst({
        where: { icaoCode: memberCode },
      });

      if (memberOrg) {
        await prisma.organization.update({
          where: { id: memberOrg.id },
          data: { regionalTeamId: regionalTeam.id },
        });
        linkedCount++;
        console.log(`     → Linked: ${memberOrg.nameEn} (${memberCode})`);
      } else {
        console.warn(`     ⚠️ Member not found: ${memberCode}`);
      }
    }

    console.log(`  📊 Linked ${linkedCount}/${team.memberCodes.length} members\n`);
  }

  // Summary
  const teamCounts = await prisma.regionalTeam.findMany({
    include: {
      _count: { select: { memberOrganizations: true } },
      leadOrganization: { select: { nameEn: true, icaoCode: true } },
    },
    orderBy: { teamNumber: "asc" },
  });

  console.log("\n📋 Regional Teams Summary:");
  console.log("─".repeat(60));
  for (const team of teamCounts) {
    console.log(
      `${team.code}: ${team._count.memberOrganizations} members | Lead: ${team.leadOrganization.nameEn} (${team.leadOrganization.icaoCode})`
    );
  }
  console.log("─".repeat(60));
  console.log("✅ Regional teams seeding complete!\n");
}

seedRegionalTeams()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
