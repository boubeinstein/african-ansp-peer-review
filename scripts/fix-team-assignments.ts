import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Team mappings based on organization names/patterns
// Teams are partnership-based (similar characteristics), not strictly regional
const TEAM_MAPPINGS: { pattern: string; teamNumber: number; matchType: "name" | "code" | "country" }[] = [
  // Team 1: ASECNA & Southern Africa Partnership
  // ASECNA member states + ATNS + Botswana + Eswatini
  { pattern: "ASECNA", matchType: "name", teamNumber: 1 },
  { pattern: "ASEC", matchType: "code", teamNumber: 1 },
  { pattern: "ATNS", matchType: "name", teamNumber: 1 },
  { pattern: "ATNS", matchType: "code", teamNumber: 1 },
  { pattern: "South Africa", matchType: "name", teamNumber: 1 },
  { pattern: "Botswana", matchType: "name", teamNumber: 1 },
  { pattern: "FBSK", matchType: "code", teamNumber: 1 },
  { pattern: "Eswatini", matchType: "name", teamNumber: 1 },
  { pattern: "Swaziland", matchType: "name", teamNumber: 1 },
  { pattern: "FDMS", matchType: "code", teamNumber: 1 },
  { pattern: "FDSK", matchType: "code", teamNumber: 1 },
  // ASECNA member countries (francophone West/Central Africa)
  { pattern: "Senegal", matchType: "country", teamNumber: 1 },
  { pattern: "Mali", matchType: "country", teamNumber: 1 },
  { pattern: "Niger", matchType: "country", teamNumber: 1 },
  { pattern: "Burkina Faso", matchType: "country", teamNumber: 1 },
  { pattern: "Benin", matchType: "country", teamNumber: 1 },
  { pattern: "Togo", matchType: "country", teamNumber: 1 },
  { pattern: "Cameroon", matchType: "country", teamNumber: 1 },
  { pattern: "Central African Republic", matchType: "country", teamNumber: 1 },
  { pattern: "Chad", matchType: "country", teamNumber: 1 },
  { pattern: "Congo", matchType: "country", teamNumber: 1 },
  { pattern: "Gabon", matchType: "country", teamNumber: 1 },
  { pattern: "Equatorial Guinea", matchType: "country", teamNumber: 1 },
  { pattern: "Comoros", matchType: "country", teamNumber: 1 },
  { pattern: "Mauritania", matchType: "country", teamNumber: 1 },
  { pattern: "Côte d'Ivoire", matchType: "country", teamNumber: 1 },
  { pattern: "Ivory Coast", matchType: "country", teamNumber: 1 },
  { pattern: "Guinea-Bissau", matchType: "country", teamNumber: 1 },

  // Team 2: East African Community
  { pattern: "Uganda", matchType: "country", teamNumber: 2 },
  { pattern: "HUEN", matchType: "code", teamNumber: 2 },
  { pattern: "Tanzania", matchType: "country", teamNumber: 2 },
  { pattern: "HTDA", matchType: "code", teamNumber: 2 },
  { pattern: "Burundi", matchType: "country", teamNumber: 2 },
  { pattern: "HBBA", matchType: "code", teamNumber: 2 },
  { pattern: "Rwanda", matchType: "country", teamNumber: 2 },
  { pattern: "HRYR", matchType: "code", teamNumber: 2 },
  { pattern: "Kenya", matchType: "country", teamNumber: 2 },
  { pattern: "HKJK", matchType: "code", teamNumber: 2 },
  { pattern: "South Sudan", matchType: "country", teamNumber: 2 },
  { pattern: "Ethiopia", matchType: "country", teamNumber: 2 },
  { pattern: "Eritrea", matchType: "country", teamNumber: 2 },
  { pattern: "Djibouti", matchType: "country", teamNumber: 2 },
  { pattern: "Somalia", matchType: "country", teamNumber: 2 },

  // Team 3: West African Anglophone
  { pattern: "Nigeria", matchType: "country", teamNumber: 3 },
  { pattern: "NAMA", matchType: "name", teamNumber: 3 },
  { pattern: "NAMA", matchType: "code", teamNumber: 3 },
  { pattern: "Ghana", matchType: "country", teamNumber: 3 },
  { pattern: "DGAA", matchType: "code", teamNumber: 3 },
  { pattern: "GCAA", matchType: "name", teamNumber: 3 },
  { pattern: "Roberts FIR", matchType: "name", teamNumber: 3 },
  { pattern: "RFIR", matchType: "code", teamNumber: 3 },
  { pattern: "GLRB", matchType: "code", teamNumber: 3 },
  { pattern: "Liberia", matchType: "country", teamNumber: 3 },
  { pattern: "Sierra Leone", matchType: "country", teamNumber: 3 },
  { pattern: "Gambia", matchType: "country", teamNumber: 3 },
  { pattern: "Guinea", matchType: "country", teamNumber: 3 }, // Republic of Guinea (not Equatorial Guinea)

  // Team 4: Southern & Eastern Africa
  { pattern: "Mozambique", matchType: "country", teamNumber: 4 },
  { pattern: "FQMA", matchType: "code", teamNumber: 4 },
  { pattern: "Malawi", matchType: "country", teamNumber: 4 },
  { pattern: "FWKI", matchType: "code", teamNumber: 4 },
  { pattern: "FWLI", matchType: "code", teamNumber: 4 },
  { pattern: "Madagascar", matchType: "country", teamNumber: 4 },
  { pattern: "FMMI", matchType: "code", teamNumber: 4 },
  { pattern: "ADEMA", matchType: "name", teamNumber: 4 },
  { pattern: "Zimbabwe", matchType: "country", teamNumber: 4 },
  { pattern: "FVHA", matchType: "code", teamNumber: 4 },
  { pattern: "Zambia", matchType: "country", teamNumber: 4 },
  { pattern: "FLKK", matchType: "code", teamNumber: 4 },
  { pattern: "FLLS", matchType: "code", teamNumber: 4 },
  { pattern: "Angola", matchType: "country", teamNumber: 4 },
  { pattern: "Namibia", matchType: "country", teamNumber: 4 },
  { pattern: "Lesotho", matchType: "country", teamNumber: 4 },
  { pattern: "Mauritius", matchType: "country", teamNumber: 4 },
  { pattern: "Seychelles", matchType: "country", teamNumber: 4 },

  // Team 5: Northern Africa
  { pattern: "Morocco", matchType: "country", teamNumber: 5 },
  { pattern: "DGAC", matchType: "code", teamNumber: 5 },
  { pattern: "ONDA", matchType: "name", teamNumber: 5 },
  { pattern: "GMMN", matchType: "code", teamNumber: 5 },
  { pattern: "Tunisia", matchType: "country", teamNumber: 5 },
  { pattern: "OACA", matchType: "name", teamNumber: 5 },
  { pattern: "OACA", matchType: "code", teamNumber: 5 },
  { pattern: "DTTA", matchType: "code", teamNumber: 5 },
  { pattern: "Algeria", matchType: "country", teamNumber: 5 },
  { pattern: "DACM", matchType: "code", teamNumber: 5 },
  { pattern: "DAAG", matchType: "code", teamNumber: 5 },
  { pattern: "ENNA", matchType: "name", teamNumber: 5 },
  { pattern: "Libya", matchType: "country", teamNumber: 5 },
  { pattern: "Egypt", matchType: "country", teamNumber: 5 },
  { pattern: "Sudan", matchType: "country", teamNumber: 5 },
];

async function fixTeamAssignments() {
  console.log("🔧 Fixing organization team assignments...\n");

  // Get all teams
  const teams = await prisma.regionalTeam.findMany();
  const teamMap = new Map(teams.map((t) => [t.teamNumber, t.id]));

  console.log(`Found ${teams.length} teams\n`);

  if (teams.length === 0) {
    console.log("❌ No teams found. Run seed-regional-teams.ts first.");
    return;
  }

  // Get all organizations
  const orgs = await prisma.organization.findMany();
  console.log(`Processing ${orgs.length} organizations...\n`);

  let updated = 0;
  let skipped = 0;
  const unmatched: string[] = [];

  for (const org of orgs) {
    // Skip CANSO secretariat
    if (org.nameEn.includes("CANSO") || org.nameEn.includes("Secretariat")) {
      console.log(`⏭️ Skipped: ${org.nameEn} (Secretariat)`);
      skipped++;
      continue;
    }

    // Find matching team based on mappings
    let matchedTeam: number | null = null;
    let matchReason = "";

    for (const mapping of TEAM_MAPPINGS) {
      let matches = false;

      switch (mapping.matchType) {
        case "name":
          matches = org.nameEn.includes(mapping.pattern) || org.nameFr.includes(mapping.pattern);
          break;
        case "code":
          matches = org.organizationCode === mapping.pattern || org.organizationCode?.startsWith(mapping.pattern) || false;
          break;
        case "country":
          // Special case: "Guinea" should not match "Equatorial Guinea" or "Guinea-Bissau"
          if (mapping.pattern === "Guinea") {
            matches = org.country === "Guinea" || org.nameEn.includes("Guinea Air Navigation");
          } else if (mapping.pattern === "Congo") {
            // Match both Congo and DR Congo for ASECNA
            matches = org.country?.includes("Congo") || false;
          } else {
            matches = org.country === mapping.pattern;
          }
          break;
      }

      if (matches) {
        matchedTeam = mapping.teamNumber;
        matchReason = `${mapping.matchType}: ${mapping.pattern}`;
        break;
      }
    }

    if (matchedTeam) {
      const teamId = teamMap.get(matchedTeam);
      if (teamId && org.regionalTeamId !== teamId) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { regionalTeamId: teamId },
        });
        console.log(`✅ ${org.nameEn} → Team ${matchedTeam} (${matchReason})`);
        updated++;
      } else if (org.regionalTeamId === teamId) {
        console.log(`ℹ️ ${org.nameEn} already in Team ${matchedTeam}`);
      }
    } else {
      unmatched.push(`${org.organizationCode || "N/A"} - ${org.nameEn} (${org.country})`);
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️ Skipped: ${skipped}`);
  console.log(`  ⚠️ Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log(`\n⚠️ Unmatched organizations:`);
    unmatched.forEach((o) => console.log(`  - ${o}`));
  }

  // Summary
  console.log("\n📋 Final Team Counts:");
  const teamCounts = await prisma.regionalTeam.findMany({
    include: {
      _count: { select: { memberOrganizations: true } },
    },
    orderBy: { teamNumber: "asc" },
  });

  for (const team of teamCounts) {
    console.log(`  ${team.code}: ${team._count.memberOrganizations} organizations`);
  }
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
