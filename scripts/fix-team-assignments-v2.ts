import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * CORRECT TEAM COMPOSITIONS
 * Source: 5A5thAFIAviationSafetySymposiumANSPPeerReviewMechanismbyCANSO.pdf
 *
 * Teams are PARTNERSHIP-BASED, not regional.
 * Only listed organizations are members.
 */

interface TeamDefinition {
  teamNumber: number;
  nameEn: string;
  // Match by nameEn CONTAINS or code/icaoCode EQUALS
  members: {
    nameContains?: string;
    codeEquals?: string;
    icaoCodeEquals?: string;
  }[];
}

const CORRECT_TEAMS: TeamDefinition[] = [
  {
    teamNumber: 1,
    nameEn: "ASECNA & Southern Africa Partnership",
    members: [
      { nameContains: "ASECNA" },
      { nameContains: "ATNS" },
      { codeEquals: "ATNS" },
      { nameContains: "South Africa" },
      { nameContains: "Botswana" },
      { nameContains: "Eswatini" },
      { nameContains: "Swaziland" },
    ],
  },
  {
    teamNumber: 2,
    nameEn: "East African Community",
    members: [
      { nameContains: "Kenya" },
      { codeEquals: "KCAA" },
      { nameContains: "Tanzania" },
      { codeEquals: "TCAA" },
      { nameContains: "Uganda" },
      { nameContains: "Rwanda" },
      { nameContains: "Burundi" },
    ],
  },
  {
    teamNumber: 3,
    nameEn: "West African Anglophone",
    members: [
      { nameContains: "Nigerian Airspace" },
      { codeEquals: "NAMA" },
      { nameContains: "Ghana" },
      { codeEquals: "GCAA" },
      { nameContains: "Roberts" },
      { codeEquals: "RFIR" },
    ],
  },
  {
    teamNumber: 4,
    nameEn: "Southern & Eastern Africa",
    members: [
      { nameContains: "Mozambique" },
      { codeEquals: "FQMA" },
      { nameContains: "Malawi" },
      { nameContains: "Madagascar" },
      { nameContains: "ADEMA" },
      { nameContains: "Zimbabwe" },
      { nameContains: "Zambia" },
    ],
  },
  {
    teamNumber: 5,
    nameEn: "Northern Africa",
    members: [
      { nameContains: "Morocco" },
      { codeEquals: "ONDA" },
      { codeEquals: "DGAC" },
      { nameContains: "Tunisia" },
      { codeEquals: "OACA" },
      { nameContains: "Algeria" },
      { codeEquals: "DACM" },
      { codeEquals: "ALANS" },
    ],
  },
];

async function fixTeamAssignments() {
  console.log("🔧 Correcting organization team assignments...\n");
  console.log("Based on CANSO AFI Symposium document - EXACT membership only\n");

  // Step 1: Clear ALL existing team assignments
  console.log("Step 1: Clearing all existing team assignments...");
  await prisma.organization.updateMany({
    data: { regionalTeamId: null },
  });
  console.log("✅ All organizations unassigned from teams\n");

  // Step 2: Get all teams
  const teams = await prisma.regionalTeam.findMany();
  const teamMap = new Map(teams.map((t) => [t.teamNumber, t.id]));

  if (teams.length === 0) {
    console.error("❌ No teams found! Run seed-regional-teams.ts first.");
    return;
  }
  console.log(`Found ${teams.length} teams\n`);

  // Step 3: Assign organizations to correct teams
  const results: { team: number; org: string }[] = [];

  for (const teamDef of CORRECT_TEAMS) {
    const teamId = teamMap.get(teamDef.teamNumber);
    if (!teamId) {
      console.error(`❌ Team ${teamDef.teamNumber} not found in database`);
      continue;
    }

    console.log(`\nTeam ${teamDef.teamNumber}: ${teamDef.nameEn}`);
    console.log("─".repeat(50));

    for (const member of teamDef.members) {
      // Build query conditions
      const whereConditions: object[] = [];

      if (member.nameContains) {
        whereConditions.push({
          nameEn: { contains: member.nameContains, mode: "insensitive" },
        });
      }
      if (member.codeEquals) {
        whereConditions.push({ icaoCode: member.codeEquals });
      }
      if (member.icaoCodeEquals) {
        whereConditions.push({ icaoCode: member.icaoCodeEquals });
      }

      if (whereConditions.length === 0) continue;

      // Find matching organizations
      const orgs = await prisma.organization.findMany({
        where: { OR: whereConditions },
      });

      for (const org of orgs) {
        // Skip if already assigned (prevent duplicates from multiple match conditions)
        if (results.some((r) => r.org === org.nameEn)) continue;

        await prisma.organization.update({
          where: { id: org.id },
          data: { regionalTeamId: teamId },
        });

        results.push({ team: teamDef.teamNumber, org: org.nameEn });
        console.log(`  ✅ ${org.nameEn} (${org.icaoCode || "no code"})`);
      }
    }
  }

  // Step 4: Print summary
  console.log("\n" + "═".repeat(60));
  console.log("TEAM ASSIGNMENT SUMMARY");
  console.log("═".repeat(60));

  for (const teamDef of CORRECT_TEAMS) {
    const count = results.filter((r) => r.team === teamDef.teamNumber).length;
    console.log(`\nTeam ${teamDef.teamNumber}: ${teamDef.nameEn}`);
    console.log(`  Members: ${count}`);
    results
      .filter((r) => r.team === teamDef.teamNumber)
      .forEach((r) => console.log(`    - ${r.org}`));
  }

  // Step 5: Show unassigned organizations
  const unassigned = await prisma.organization.findMany({
    where: { regionalTeamId: null },
    select: { nameEn: true, icaoCode: true },
  });

  console.log("\n" + "═".repeat(60));
  console.log(`UNASSIGNED ORGANIZATIONS (${unassigned.length})`);
  console.log("═".repeat(60));
  console.log("These organizations are not part of the 5 peer support teams:");
  unassigned.forEach((org) => {
    console.log(`  - ${org.nameEn} (${org.icaoCode || "no code"})`);
  });

  console.log("\n✅ Team assignments corrected successfully!");
}

fixTeamAssignments()
  .catch((e) => {
    console.error("❌ Fix failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
