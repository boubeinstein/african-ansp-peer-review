/**
 * Training Modules Seeder
 *
 * Seeds the 6 core training modules for the African ANSP Peer Review Programme.
 * These modules provide structured learning content for peer reviewers.
 *
 * Usage:
 *   npm run db:seed:training
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// TRAINING MODULES DATA
// =============================================================================

const TRAINING_MODULES = [
  {
    moduleNumber: 0,
    code: "M0",
    titleEn: "Introduction",
    titleFr: "Introduction",
    descriptionEn:
      "Welcome to the African ANSP Peer Review Programme. This module provides an overview of the programme objectives, structure, and your role as a peer reviewer.",
    descriptionFr:
      "Bienvenue au Programme de Revue par les Pairs des ANSP Africains. Ce module donne un aperçu des objectifs du programme, de sa structure et de votre rôle en tant que réviseur pair.",
    objectivesEn: [
      "Understand the programme's history and objectives",
      "Identify key stakeholders and their roles",
      "Recognize the benefits of peer review for African aviation safety",
    ],
    objectivesFr: [
      "Comprendre l'historique et les objectifs du programme",
      "Identifier les principales parties prenantes et leurs rôles",
      "Reconnaître les avantages de la revue par les pairs pour la sécurité aérienne africaine",
    ],
    iconName: "BookOpen",
    sortOrder: 0,
  },
  {
    moduleNumber: 1,
    code: "M1",
    titleEn: "Programme Overview",
    titleFr: "Aperçu du Programme",
    descriptionEn:
      "Detailed overview of the African ANSP Peer Review Programme structure, governance, and operational framework aligned with ICAO standards.",
    descriptionFr:
      "Aperçu détaillé de la structure du Programme de Revue par les Pairs des ANSP Africains, de la gouvernance et du cadre opérationnel aligné sur les normes de l'OACI.",
    objectivesEn: [
      "Describe the programme governance structure",
      "Explain the role of the Steering Committee",
      "Understand the 5 regional team structure",
    ],
    objectivesFr: [
      "Décrire la structure de gouvernance du programme",
      "Expliquer le rôle du Comité de Pilotage",
      "Comprendre la structure des 5 équipes régionales",
    ],
    iconName: "Network",
    sortOrder: 1,
  },
  {
    moduleNumber: 2,
    code: "M2",
    titleEn: "Key Principles & Phases",
    titleFr: "Principes Clés et Phases",
    descriptionEn:
      "Learn the fundamental principles of peer review and understand the phases from planning through closure.",
    descriptionFr:
      "Apprenez les principes fondamentaux de la revue par les pairs et comprenez les phases de la planification à la clôture.",
    objectivesEn: [
      "Apply the 'peer review, not audit' principle",
      "Navigate all review phases: Planning, Preparation, On-site, Reporting, Follow-up",
      "Understand confidentiality and conflict of interest requirements",
    ],
    objectivesFr: [
      "Appliquer le principe 'revue par les pairs, pas audit'",
      "Naviguer dans toutes les phases de revue : Planification, Préparation, Sur site, Rapport, Suivi",
      "Comprendre les exigences de confidentialité et de conflit d'intérêts",
    ],
    iconName: "GitBranch",
    sortOrder: 2,
  },
  {
    moduleNumber: 3,
    code: "M3",
    titleEn: "Conducting Reviews",
    titleFr: "Conduite des Revues",
    descriptionEn:
      "Practical guidance on conducting effective peer reviews using the USOAP CMA Protocol Questions.",
    descriptionFr:
      "Guide pratique pour mener des revues par les pairs efficaces en utilisant les Questions de Protocole USOAP CMA.",
    objectivesEn: [
      "Use the ANS questionnaire (USOAP CMA 2024)",
      "Collect and evaluate evidence",
      "Document findings accurately",
      "Apply Critical Element framework",
    ],
    objectivesFr: [
      "Utiliser le questionnaire ANS (USOAP CMA 2024)",
      "Collecter et évaluer les preuves",
      "Documenter les constatations avec précision",
      "Appliquer le cadre des Éléments Critiques",
    ],
    iconName: "ClipboardCheck",
    sortOrder: 3,
  },
  {
    moduleNumber: 4,
    code: "M4",
    titleEn: "SMS Maturity Assessment",
    titleFr: "Évaluation de la Maturité SMS",
    descriptionEn:
      "Understanding and applying the CANSO Standard of Excellence framework for SMS maturity assessment.",
    descriptionFr:
      "Comprendre et appliquer le cadre CANSO Standard of Excellence pour l'évaluation de la maturité SMS.",
    objectivesEn: [
      "Apply the CANSO SoE 2024 framework",
      "Assess SMS maturity across 4 components",
      "Evaluate 13 study areas",
      "Determine maturity levels (A through E)",
    ],
    objectivesFr: [
      "Appliquer le cadre CANSO SoE 2024",
      "Évaluer la maturité SMS sur les 4 composantes",
      "Évaluer les 13 domaines d'étude",
      "Déterminer les niveaux de maturité (A à E)",
    ],
    iconName: "Shield",
    sortOrder: 4,
  },
  {
    moduleNumber: 5,
    code: "M5",
    titleEn: "Practical Exercises",
    titleFr: "Exercices Pratiques",
    descriptionEn:
      "Hands-on exercises to practice peer review skills using realistic scenarios.",
    descriptionFr:
      "Exercices pratiques pour développer les compétences de revue par les pairs à l'aide de scénarios réalistes.",
    objectivesEn: [
      "Complete sample assessment responses",
      "Write effective findings",
      "Review and approve CAPs",
      "Generate review reports",
    ],
    objectivesFr: [
      "Compléter des réponses d'évaluation types",
      "Rédiger des constatations efficaces",
      "Examiner et approuver les PAC",
      "Générer des rapports de revue",
    ],
    iconName: "FlaskConical",
    sortOrder: 5,
  },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

async function seedTrainingModules() {
  console.log("🎓 Seeding training modules...\n");

  let created = 0;
  let updated = 0;

  for (const mod of TRAINING_MODULES) {
    const existing = await prisma.trainingModule.findUnique({
      where: { code: mod.code },
    });

    if (existing) {
      await prisma.trainingModule.update({
        where: { code: mod.code },
        data: mod,
      });
      console.log(`   ✓ Updated module ${mod.code}: ${mod.titleEn}`);
      updated++;
    } else {
      await prisma.trainingModule.create({
        data: mod,
      });
      console.log(`   ✓ Created module ${mod.code}: ${mod.titleEn}`);
      created++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Created: ${created} modules`);
  console.log(`   - Updated: ${updated} modules`);
  console.log(`   - Total: ${TRAINING_MODULES.length} modules\n`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("\n========================================");
  console.log("  Training Modules Seeder");
  console.log("========================================\n");

  try {
    await seedTrainingModules();
    console.log("✅ Training modules seeded successfully!\n");
  } catch (error) {
    console.error("❌ Error seeding training modules:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
