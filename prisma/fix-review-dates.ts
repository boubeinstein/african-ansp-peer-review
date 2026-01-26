import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixDates() {
  console.log("🔧 Fixing review dates...\n");

  // Update reviews that are missing actual dates
  const updated = await prisma.review.updateMany({
    where: {
      phase: { in: ["ON_SITE", "REPORTING", "FOLLOW_UP", "CLOSED"] },
      actualStartDate: null,
    },
    data: {
      actualStartDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    },
  });
  console.log(`Updated actualStartDate for ${updated.count} reviews`);

  const updated2 = await prisma.review.updateMany({
    where: {
      phase: { in: ["REPORTING", "FOLLOW_UP", "CLOSED"] },
      actualEndDate: null,
    },
    data: {
      actualEndDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  });
  console.log(`Updated actualEndDate for ${updated2.count} reviews`);

  console.log("\n✅ Review dates fixed!");
}

fixDates().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
