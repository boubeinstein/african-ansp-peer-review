import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fix() {
  console.log("🔍 Checking AAPRP-2026-003...\n");

  const review = await prisma.review.findUnique({
    where: { referenceNumber: "AAPRP-2026-003" },
  });

  if (!review) {
    console.log("Review not found!");
    return;
  }

  console.log("Current state:");
  console.log(`  - Phase: ${review.phase}`);
  console.log(`  - Status: ${review.status}`);
  console.log(`  - actualStartDate: ${review.actualStartDate}`);
  console.log(`  - actualEndDate: ${review.actualEndDate}`);
  console.log(`  - plannedStartDate: ${review.plannedStartDate}`);
  console.log(`  - plannedEndDate: ${review.plannedEndDate}`);

  // Fix: Set all required dates
  const now = new Date();
  const updated = await prisma.review.update({
    where: { referenceNumber: "AAPRP-2026-003" },
    data: {
      actualStartDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      actualEndDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("\n✅ Updated:");
  console.log(`  - actualStartDate: ${updated.actualStartDate}`);
  console.log(`  - actualEndDate: ${updated.actualEndDate}`);
}

fix().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
