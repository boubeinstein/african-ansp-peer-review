import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("=== DATABASE COUNTS ===");
  console.log("Reviews:", await prisma.review.count());
  console.log("Findings:", await prisma.finding.count());
  console.log("CAPs:", await prisma.correctiveActionPlan.count());
  console.log("Documents:", await prisma.document.count());
  console.log("Assessments:", await prisma.assessment.count());
  console.log("Questionnaires:", await prisma.questionnaire.count());
  
  console.log("\n=== RECENT REVIEWS ===");
  const reviews = await prisma.review.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { hostOrganization: true },
  });
  reviews.forEach(r => 
    console.log(`- ${r.referenceNumber} | ${r.hostOrganization?.nameEn?.substring(0, 30)} | ${r.phase}`)
  );
}

check().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
