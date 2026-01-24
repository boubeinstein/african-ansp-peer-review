import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Team composition from 5A5thAFIAviationSafetySymposiumANSPPeerReviewMechanismbyCANSO.pdf
// Teams are partnership-based (similar characteristics: airspace, equipment, procedures)
// NOT regional - each member Organization has its own region field
const REGIONAL_TEAMS: {
  teamNumber: number;
  code: string;
  nameEn: string;
  nameFr: string;
  memberCodes: string[];
  leadCode: string;
}[] = [
  {
    teamNumber: 1,
    code: "TEAM-1",
    nameEn: "Team 1 - ASECNA & Southern Africa Partnership",
    nameFr: "Équipe 1 - Partenariat ASECNA & Afrique Australe",
    memberCodes: ["ASEC", "ATNS", "FBSK", "FDMS"],
    leadCode: "ASEC",
  },
  {
    teamNumber: 2,
    code: "TEAM-2",
    nameEn: "Team 2 - East African Community",
    nameFr: "Équipe 2 - Communauté d'Afrique de l'Est",
    memberCodes: ["HUEN", "HTDA", "HBBA", "HRYR", "HKJK"],
    leadCode: "HKJK",
  },
  {
    teamNumber: 3,
    code: "TEAM-3",
    nameEn: "Team 3 - West African Anglophone",
    nameFr: "Équipe 3 - Afrique de l'Ouest Anglophone",
    memberCodes: ["NAMA", "DGAA", "RFIR"],
    leadCode: "NAMA",
  },
  {
    teamNumber: 4,
    code: "TEAM-4",
    nameEn: "Team 4 - Southern & Eastern Africa",
    nameFr: "Équipe 4 - Afrique Australe et Orientale",
    memberCodes: ["FQMA", "FWKI", "FMMI", "FVHA", "FLKK"],
    leadCode: "FQMA",
  },
  {
    teamNumber: 5,
    code: "TEAM-5",
    nameEn: "Team 5 - Northern Africa",
    nameFr: "Équipe 5 - Afrique du Nord",
    memberCodes: ["DGAC", "OACA", "DACM"],
    leadCode: "DGAC",
  },
];

// Northern Africa organizations that may not exist in the database yet
const NORTHERN_AFRICA_ORGS = [
  {
    organizationCode: "DGAC",
    nameEn: "Direction Générale de l'Aviation Civile",
    nameFr: "Direction Générale de l'Aviation Civile",
    country: "Morocco",
    region: "NORTHERN" as const,
    membershipStatus: "ACTIVE" as const,
  },
  {
    organizationCode: "OACA",
    nameEn: "Office de l'Aviation Civile et des Aéroports",
    nameFr: "Office de l'Aviation Civile et des Aéroports",
    country: "Tunisia",
    region: "NORTHERN" as const,
    membershipStatus: "ACTIVE" as const,
  },
  {
    organizationCode: "DACM",
    nameEn: "Direction de l'Aviation Civile et de la Météorologie",
    nameFr: "Direction de l'Aviation Civile et de la Météorologie",
    country: "Algeria",
    region: "NORTHERN" as const,
    membershipStatus: "ACTIVE" as const,
  },
];

async function seedRegionalTeams() {
  console.log("🌍 Seeding Regional Teams...\n");

  // Ensure Northern Africa organizations exist
  console.log("📍 Ensuring Northern Africa organizations exist...\n");
  for (const org of NORTHERN_AFRICA_ORGS) {
    const existing = await prisma.organization.findFirst({
      where: { organizationCode: org.organizationCode },
    });

    if (!existing) {
      await prisma.organization.create({
        data: org,
      });
      console.log(`  ✅ Created: ${org.organizationCode} - ${org.nameEn}`);
    } else {
      console.log(`  ℹ️ Exists: ${org.organizationCode} - ${existing.nameEn}`);
    }
  }
  console.log("");

  // Create regional teams
  for (const team of REGIONAL_TEAMS) {
    console.log(`Creating ${team.nameEn}...`);

    // Find lead organization by ICAO code
    const leadOrg = await prisma.organization.findFirst({
      where: { organizationCode: team.leadCode },
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
        leadOrganizationId: leadOrg.id,
      },
      create: {
        teamNumber: team.teamNumber,
        code: team.code,
        nameEn: team.nameEn,
        nameFr: team.nameFr,
        leadOrganizationId: leadOrg.id,
        isActive: true,
      },
    });

    console.log(`  ✅ Created team: ${regionalTeam.code}`);

    // Link member organizations to this team
    let linkedCount = 0;
    for (const memberCode of team.memberCodes) {
      const memberOrg = await prisma.organization.findFirst({
        where: { organizationCode: memberCode },
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
      leadOrganization: { select: { nameEn: true, organizationCode: true } },
    },
    orderBy: { teamNumber: "asc" },
  });

  console.log("\n📋 Regional Teams Summary:");
  console.log("─".repeat(70));
  console.log("Team 1: ASECNA, ATNS, Botswana, Eswatini");
  console.log("Team 2: Uganda, Tanzania, Burundi, Rwanda, Kenya");
  console.log("Team 3: NAMA (Nigeria), GCAA (Ghana), Roberts FIR");
  console.log("Team 4: Mozambique, Malawi, Madagascar, Zimbabwe, Zambia");
  console.log("Team 5: DGAC (Morocco), OACA (Tunisia), DACM (Algeria)");
  console.log("─".repeat(70));

  console.log("\n📊 Database Results:");
  for (const team of teamCounts) {
    console.log(
      `${team.code}: ${team._count.memberOrganizations} members | Lead: ${team.leadOrganization.nameEn} (${team.leadOrganization.organizationCode})`
    );
  }
  console.log("─".repeat(70));
  console.log("✅ Regional teams seeding complete!\n");
}

seedRegionalTeams()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
