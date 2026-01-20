/**
 * Seed Programme Participants
 *
 * Updates the peerReviewTeam field for the 20 official programme participants
 * per the CANSO 5th AFI Aviation Safety Symposium document.
 *
 * Run with: npm run db:seed:participants
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 20 Programme Participants organized by team
// Using ICAO codes or specific names to avoid duplicates
const programmeParticipants = [
  // Team 1 (4 members)
  { icaoCode: "ASEC", team: 1 }, // ASECNA
  { icaoCode: "FAJA", team: 1 }, // ATNS - South Africa
  { icaoCode: "FBSK", team: 1 }, // Civil Aviation Authority of Botswana
  { icaoCode: "FDSK", team: 1 }, // Eswatini Civil Aviation Authority

  // Team 2 (5 members)
  { icaoCode: "HBBA", team: 2 }, // Burundi Civil Aviation Authority
  { icaoCode: "HKJK", team: 2 }, // Kenya Civil Aviation Authority
  { icaoCode: "HRYR", team: 2 }, // Rwanda Civil Aviation Authority
  { icaoCode: "HTDA", team: 2 }, // Tanzania Civil Aviation Authority
  { icaoCode: "HUEN", team: 2 }, // Uganda Civil Aviation Authority

  // Team 3 (3 members)
  { icaoCode: "NAMA", team: 3 }, // Nigerian Airspace Management Agency
  { icaoCode: "DGAA", team: 3 }, // Ghana Civil Aviation Authority
  { icaoCode: "GLRB", team: 3 }, // Roberts FIR

  // Team 4 (5 members)
  { icaoCode: "FMMI", team: 4 }, // ADEMA - Madagascar
  { icaoCode: "FWLI", team: 4 }, // Department of Civil Aviation - Malawi
  { icaoCode: "FQMA", team: 4 }, // Aeroportos de Moçambique
  { icaoCode: "FLLS", team: 4 }, // Zambia Airports Corporation Limited
  { icaoCode: "FVHA", team: 4 }, // Civil Aviation Authority of Zimbabwe

  // Team 5 (3 members)
  { icaoCode: "DAAG", team: 5 }, // ENNA - Algeria
  { icaoCode: "GMMN", team: 5 }, // ONDA - Morocco
  { icaoCode: "DTTA", team: 5 }, // OACA - Tunisia
];

async function seedProgrammeParticipants() {
  console.log("🔄 Resetting all programme participants...\n");

  // Reset all organizations to REGISTERED status
  await prisma.organization.updateMany({
    data: {
      peerReviewTeam: null,
      participationStatus: "REGISTERED",
      joinedProgrammeAt: null,
    },
  });

  console.log("✅ All organizations reset to REGISTERED\n");
  console.log("🎯 Setting correct 20 programme participants to ACTIVE:\n");

  let successCount = 0;
  const notFound: string[] = [];

  const joinedDate = new Date("2024-01-15"); // Programme launch date

  for (const participant of programmeParticipants) {
    const updated = await prisma.organization.updateMany({
      where: {
        icaoCode: participant.icaoCode,
      },
      data: {
        peerReviewTeam: participant.team,
        participationStatus: "ACTIVE",
        joinedProgrammeAt: joinedDate,
      },
    });

    if (updated.count > 0) {
      console.log(`   ✓ Team ${participant.team}: ${participant.icaoCode}`);
      successCount += updated.count;
    } else {
      console.warn(`   ⚠ NOT FOUND: ${participant.icaoCode}`);
      notFound.push(participant.icaoCode);
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Total participants set: ${successCount}/20`);

  if (notFound.length > 0) {
    console.log(`\n⚠️  Missing organizations (need to be added to database):`);
    notFound.forEach((name) => console.log(`   - ${name}`));
  }

  // List all participants by team
  const participants = await prisma.organization.findMany({
    where: { peerReviewTeam: { not: null } },
    orderBy: [{ peerReviewTeam: "asc" }, { nameEn: "asc" }],
    select: { nameEn: true, icaoCode: true, peerReviewTeam: true, country: true },
  });

  console.log("\n📋 Participants by team:");
  for (let team = 1; team <= 5; team++) {
    const teamMembers = participants.filter((p) => p.peerReviewTeam === team);
    console.log(`\n   Team ${team} (${teamMembers.length}):`);
    teamMembers.forEach((m) =>
      console.log(`      - ${m.nameEn} (${m.icaoCode || m.country})`)
    );
  }

  console.log("\n✅ Done!\n");
}

seedProgrammeParticipants()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
