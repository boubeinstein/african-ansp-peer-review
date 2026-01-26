import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("📄 Checking documents...\n");

  const docs = await prisma.document.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fileUrl: true,
      category: true,
      createdAt: true,
    },
  });

  console.log("Recent documents:\n");
  docs.forEach(d => {
    console.log(`- ${d.name}`);
    console.log(`  Category: ${d.category}`);
    console.log(`  URL: ${d.fileUrl}`);
    console.log(`  Created: ${d.createdAt}`);
    console.log("");
  });
}

check().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
