import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const RESOURCE_UPDATES = [
  {
    titleEn: "Simulated ANSP Documentation Package",
    urlEn: "/training-resources/AAPRP_Simulated_ANSP_Documentation_Package.docx",
    fileUrlEn:
      "/training-resources/AAPRP_Simulated_ANSP_Documentation_Package.docx",
  },
  {
    titleEn: "Interview Scenario Cards and Role-Play Instructions",
    urlEn: "/training-resources/AAPRP_Interview_Scenario_Cards_and_Role_Play_Instructions.docx",
    fileUrlEn:
      "/training-resources/AAPRP_Interview_Scenario_Cards_and_Role_Play_Instructions.docx",
  },
  {
    titleEn: "Findings Documentation Form",
    urlEn: "/training-resources/AAPRP_Findings_Documentation_Form.docx",
    fileUrlEn:
      "/training-resources/AAPRP_Findings_Documentation_Form.docx",
  },
  {
    titleEn: "SMS Maturity Assessment Scoring Sheet",
    urlEn: "/training-resources/AAPRP_SMS_Maturity_Assessment_Scoring_Sheet.docx",
    fileUrlEn:
      "/training-resources/AAPRP_SMS_Maturity_Assessment_Scoring_Sheet.docx",
  },
];

async function main() {
  console.log("Updating M5 training resource URLs...\n");

  for (const resource of RESOURCE_UPDATES) {
    const result = await prisma.trainingResource.updateMany({
      where: { titleEn: resource.titleEn },
      data: {
        urlEn: resource.urlEn,
        fileUrlEn: resource.fileUrlEn,
      },
    });
    console.log(
      `  Updated "${resource.titleEn}": ${result.count} record(s)`
    );
  }

  const nullResources = await prisma.trainingResource.findMany({
    where: { urlEn: null, fileUrlEn: null },
    select: { id: true, titleEn: true },
  });

  if (nullResources.length > 0) {
    console.log(
      `\n  ${nullResources.length} other resource(s) still have null URLs:`
    );
    for (const r of nullResources) {
      console.log(`     - ${r.titleEn}`);
    }
  }

  console.log("\nMigration complete!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
