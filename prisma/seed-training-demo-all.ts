/**
 * AAPRP Training Demo Data - Master Runner
 * Runs all training demo seed scripts in sequence
 * 
 * Run: npm run db:seed:training-all
 * 
 * This script creates comprehensive demo data for the 
 * AFI Peer Reviewers' Refresher Training (March 23-26, 2026)
 */

import { execSync } from "child_process";

const scripts = [
  { file: "prisma/seed-training-demo.ts", name: "Part 1: Reviews & Team Members" },
  { file: "prisma/seed-training-demo-part2.ts", name: "Part 2: Findings & CAPs" },
  { file: "prisma/seed-training-demo-part3.ts", name: "Part 3: Documents & Checklists" },
  { file: "prisma/seed-training-demo-part4.ts", name: "Part 4: Assessments" },
];

console.log("");
console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║     AAPRP Training Demo Data - Master Seed Runner          ║");
console.log("║                                                            ║");
console.log("║     AFI Peer Reviewers' Refresher Training                 ║");
console.log("║     March 23-26, 2026 - Dar es Salaam, Tanzania            ║");
console.log("╚════════════════════════════════════════════════════════════╝");
console.log("");

for (const script of scripts) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶️  Running ${script.name}...`);
  console.log(`   File: ${script.file}`);
  console.log(`${"─".repeat(60)}\n`);
  
  try {
    execSync(`npx tsx ${script.file}`, { stdio: "inherit" });
  } catch {
    console.error(`\n❌ Failed: ${script.name}`);
    console.error(`   Check the error above and fix before re-running.\n`);
    process.exit(1);
  }
}

console.log("");
console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║                    🎉 ALL COMPLETE! 🎉                     ║");
console.log("╠════════════════════════════════════════════════════════════╣");
console.log("║  Demo Data Created:                                        ║");
console.log("║                                                            ║");
console.log("║  ✅ Part 1: 5 Peer Reviews (various phases)                ║");
console.log("║     • CLOSED - Completed with resolved findings            ║");
console.log("║     • REPORTING - Draft report in progress                 ║");
console.log("║     • ON_SITE - Active fieldwork                           ║");
console.log("║     • PREPARATION - Scheduled, preparing                   ║");
console.log("║     • PLANNING - Approved, team assignment                 ║");
console.log("║                                                            ║");
console.log("║  ✅ Part 2: Findings & Corrective Action Plans             ║");
console.log("║     • Findings at various severities                       ║");
console.log("║     • CAPs at different workflow stages                    ║");
console.log("║                                                            ║");
console.log("║  ✅ Part 3: Documents & Fieldwork Checklists               ║");
console.log("║     • Documents across all categories                      ║");
console.log("║     • Checklist progress by review phase                   ║");
console.log("║                                                            ║");
console.log("║  ✅ Part 4: Self-Assessments (ANS & SMS)                   ║");
console.log("║     • Various completion statuses                          ║");
console.log("║                                                            ║");
console.log("╠════════════════════════════════════════════════════════════╣");
console.log("║  Ready for training on March 23-26, 2026!                  ║");
console.log("║                                                            ║");
console.log("║  Verify with: npx prisma studio                            ║");
console.log("╚════════════════════════════════════════════════════════════╝");
console.log("");