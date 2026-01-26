import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("📄 Checking for REAL uploads (not demo)...\n");

  // Find documents that DON'T have demo URLs
  const docs = await prisma.document.findMany({
    where: {
      NOT: { fileUrl: { startsWith: "https://demo.aaprp.aero" } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fileUrl: true,
      category: true,
      createdAt: true,
    },
  });

  console.log(`Found ${docs.length} real uploads:\n`);
  docs.forEach(d => {
    console.log(`- ${d.name}`);
    console.log(`  Category: ${d.category}`);
    console.log(`  URL: ${d.fileUrl}`);
    console.log(`  Created: ${d.createdAt}`);
    console.log("");
  });

  if (docs.length === 0) {
    console.log("No real uploads found - only demo data exists.");
  }
}

check().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
