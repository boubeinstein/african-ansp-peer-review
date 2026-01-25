/**
 * AAPRP Training Demo Data - Master Runner
 * Runs all training demo seed scripts in sequence
 *
 * Run with: npm run db:seed:training-all
 */

import { execSync } from "child_process";

const scripts = [
  "prisma/seed-training-demo.ts",
  "prisma/seed-training-demo-part2.ts",
  "prisma/seed-training-demo-part3.ts",
  "prisma/seed-training-demo-part4.ts",
];

console.log(
  "╔════════════════════════════════════════════════════════════╗"
);
console.log(
  "║     AAPRP Training Demo Data - Master Seed Runner          ║"
);
console.log(
  "║     AFI Peer Reviewers' Refresher Training                 ║"
);
console.log(
  "║     March 23-26, 2026 - Dar es Salaam, Tanzania            ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════╝\n"
);

for (const script of scripts) {
  console.log(`\n▶️  Running ${script}...\n`);
  try {
    execSync(`npx tsx ${script}`, { stdio: "inherit" });
  } catch (error) {
    console.error(`❌ Failed to run ${script}`);
    process.exit(1);
  }
}

console.log("\n");
console.log(
  "╔════════════════════════════════════════════════════════════╗"
);
console.log(
  "║                    🎉 ALL COMPLETE! 🎉                     ║"
);
console.log(
  "╠════════════════════════════════════════════════════════════╣"
);
console.log(
  "║  Demo Data Created:                                        ║"
);
console.log(
  "║  • 5 Peer Reviews (various phases)                         ║"
);
console.log(
  "║  • 10 Self-Assessments (ANS & SMS)                         ║"
);
console.log(
  "║  • 10 Findings with CAPs                                   ║"
);
console.log(
  "║  • 30+ Documents across categories                         ║"
);
console.log(
  "║  • Fieldwork checklist progress                            ║"
);
console.log(
  "║                                                            ║"
);
console.log(
  "║  Ready for training on March 23-26, 2026!                  ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════╝\n"
);
