/**
 * Seed Participation Status
 *
 * Sets the participationStatus for all organizations:
 * - 20 ACTIVE programme participants (per CANSO document)
 * - Remaining organizations set to REGISTERED
 *
 * Run with: npm run db:seed:participation
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ParticipationStatus } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// The 20 ACTIVE programme participants (from CANSO 5th AFI Aviation Safety Symposium)
// Using ICAO codes for precise matching
const activeParticipants = [
  // Team 1 (4 members)
  { icaoCode: "ASEC", team: 1, name: "ASECNA" },
  { icaoCode: "FAJA", team: 1, name: "ATNS (South Africa)" },
  { icaoCode: "FBSK", team: 1, name: "Botswana CAA" },
  { icaoCode: "FDSK", team: 1, name: "Eswatini CAA" },

  // Team 2 (5 members)
  { icaoCode: "HBBA", team: 2, name: "Burundi CAA" },
  { icaoCode: "HKJK", team: 2, name: "Kenya CAA" },
  { icaoCode: "HRYR", team: 2, name: "Rwanda CAA" },
  { icaoCode: "HTDA", team: 2, name: "Tanzania CAA" },
  { icaoCode: "HUEN", team: 2, name: "Uganda CAA" },

  // Team 3 (3 members)
  { icaoCode: "NAMA", team: 3, name: "NAMA (Nigeria)" },
  { icaoCode: "DGAA", team: 3, name: "GCAA (Ghana)" },
  { icaoCode: "GLRB", team: 3, name: "Roberts FIR" },

  // Team 4 (5 members)
  { icaoCode: "FMMI", team: 4, name: "Madagascar" },
  { icaoCode: "FWLI", team: 4, name: "Malawi" },
  { icaoCode: "FQMA", team: 4, name: "Mozambique" },
  { icaoCode: "FLLS", team: 4, name: "Zambia" },
  { icaoCode: "FVHA", team: 4, name: "Zimbabwe" },

  // Team 5 (3 members)
  { icaoCode: "DAAG", team: 5, name: "Algeria (ENNA)" },
  { icaoCode: "GMMN", team: 5, name: "Morocco (ONDA)" },
  { icaoCode: "DTTA", team: 5, name: "Tunisia (OACA)" },
];

async function seedParticipationStatus() {
  console.log("🔄 Setting participation status for all organizations...\n");

  // First, set all organizations to REGISTERED
  const resetResult = await prisma.organization.updateMany({
    data: {
      participationStatus: ParticipationStatus.REGISTERED,
      peerReviewTeam: null,
      joinedProgrammeAt: null,
    },
  });
  console.log(`✅ ${resetResult.count} organizations set to REGISTERED\n`);

  // Then, set the 20 active participants
  console.log("🎯 Setting 20 ACTIVE participants:\n");
  let successCount = 0;
  const notFound: string[] = [];
  const programmeStartDate = new Date("2025-01-01");

  for (const participant of activeParticipants) {
    const updated = await prisma.organization.updateMany({
      where: {
        icaoCode: participant.icaoCode,
      },
      data: {
        participationStatus: ParticipationStatus.ACTIVE,
        peerReviewTeam: participant.team,
        joinedProgrammeAt: programmeStartDate,
      },
    });

    if (updated.count > 0) {
      console.log(`   ✓ Team ${participant.team}: ${participant.name}`);
      successCount++;
    } else {
      console.warn(`   ⚠ NOT FOUND: ${participant.name} (${participant.icaoCode})`);
      notFound.push(participant.name);
    }
  }

  // Summary counts
  const active = await prisma.organization.count({
    where: { participationStatus: ParticipationStatus.ACTIVE },
  });
  const registered = await prisma.organization.count({
    where: { participationStatus: ParticipationStatus.REGISTERED },
  });

  console.log("\n" + "─".repeat(40));
  console.log(`ACTIVE participants:     ${active} (${successCount} set this run)`);
  console.log(`REGISTERED (potential):  ${registered}`);
  console.log(`Total organizations:     ${active + registered}`);
  console.log("─".repeat(40));

  if (notFound.length > 0) {
    console.log("\n⚠️  Missing organizations (need to add to database):");
    notFound.forEach((name) => console.log(`   - ${name}`));
  }

  // List by team
  console.log("\n📋 Participants by team:");
  for (let team = 1; team <= 5; team++) {
    const members = await prisma.organization.findMany({
      where: { peerReviewTeam: team },
      select: { nameEn: true, icaoCode: true },
      orderBy: { nameEn: "asc" },
    });
    console.log(`\n   Team ${team} (${members.length}):`);
    members.forEach((m) => console.log(`      - ${m.nameEn} (${m.icaoCode})`));
  }

  console.log("\n✅ Done!\n");
}

seedParticipationStatus()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
