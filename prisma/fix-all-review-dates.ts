import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixDates() {
  console.log("🔧 Fixing ALL review dates...\n");

  // Get all reviews
  const reviews = await prisma.review.findMany({
    include: { hostOrganization: true },
  });

  console.log(`Found ${reviews.length} reviews\n`);

  for (const review of reviews) {
    const now = new Date();
    const updates: Record<string, Date> = {};

    // Set actualStartDate if missing and phase is beyond PLANNING/PREPARATION
    if (!review.actualStartDate && ["ON_SITE", "REPORTING", "FOLLOW_UP", "CLOSED"].includes(review.phase)) {
      updates.actualStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    }

    // Set actualEndDate if missing and phase is beyond ON_SITE
    if (!review.actualEndDate && ["REPORTING", "FOLLOW_UP", "CLOSED"].includes(review.phase)) {
      updates.actualEndDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    }

    // For ON_SITE phase - set actualEndDate so it CAN transition to REPORTING
    if (!review.actualEndDate && review.phase === "ON_SITE") {
      updates.actualEndDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // Yesterday
    }

    if (Object.keys(updates).length > 0) {
      await prisma.review.update({
        where: { id: review.id },
        data: updates,
      });
      console.log(`✅ ${review.referenceNumber} (${review.phase}): Updated ${Object.keys(updates).join(", ")}`);
    } else {
      console.log(`⏭️  ${review.referenceNumber} (${review.phase}): Already has dates`);
    }
  }

  console.log("\n✅ All review dates fixed!");
}

fixDates().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
