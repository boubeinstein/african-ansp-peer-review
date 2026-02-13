/**
 * Seed script for Lessons Learned Knowledge Base
 *
 * Creates 12 realistic sample lessons across different categories,
 * regions, and maturity levels based on common peer review experiences.
 *
 * Usage: npm run db:seed:lessons
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LESSONS = [
  {
    titleEn: "Allow extra time for MET facility access at smaller ANSPs",
    titleFr: "Prévoir du temps supplémentaire pour l'accès aux installations MET des petits ANSP",
    contentEn:
      "Smaller ANSPs in East Africa often have restricted MET facility access due to shared infrastructure with military aviation. Schedule at least one extra half-day for security clearance and escort arrangements. Pre-coordination with the host ANSP's security focal point 2 weeks before the visit is essential.",
    contentFr:
      "Les petits ANSP d'Afrique de l'Est ont souvent un accès restreint aux installations MET en raison d'infrastructures partagées avec l'aviation militaire. Prévoyez au moins une demi-journée supplémentaire pour les autorisations de sécurité et les arrangements d'escorte. Une coordination préalable avec le point focal sécurité de l'ANSP hôte 2 semaines avant la visite est essentielle.",
    category: "LOGISTICS_PLANNING" as const,
    impactLevel: "HIGH" as const,
    applicability: "REGIONAL" as const,
    hostRegion: "ESAF" as const,
    hostMaturityLevel: "B" as const,
    actionableAdvice: "Contact host ANSP security focal point at least 14 days before arrival. Request a preliminary facility access schedule.",
    estimatedTimeImpact: "+0.5 days",
    tags: [
      { tag: "MET", tagFr: "MET" },
      { tag: "facility-access", tagFr: "accès-installations" },
      { tag: "security-clearance", tagFr: "autorisation-sécurité" },
    ],
  },
  {
    titleEn: "ATS documentation review takes longer at maturity level B ANSPs",
    titleFr: "La revue de documentation ATS prend plus de temps pour les ANSP au niveau de maturité B",
    contentEn:
      "ANSPs at SMS maturity level B typically have documentation scattered across multiple systems and formats. ATS operations manuals may not be centralized. Budget 2 additional days for document collection and review compared to maturity level C+ organizations. Consider requesting key documents in advance.",
    contentFr:
      "Les ANSP au niveau de maturité SMS B ont généralement une documentation dispersée sur plusieurs systèmes et formats. Les manuels d'exploitation ATS peuvent ne pas être centralisés. Prévoyez 2 jours supplémentaires pour la collecte et la revue des documents par rapport aux organisations de niveau C+. Envisagez de demander les documents clés à l'avance.",
    category: "DOCUMENTATION_REVIEW" as const,
    impactLevel: "MODERATE" as const,
    applicability: "GENERAL" as const,
    hostMaturityLevel: "B" as const,
    actionableAdvice: "Request all SMS documentation at least 2 weeks before the review. Send a structured document checklist organized by USOAP audit areas.",
    estimatedTimeImpact: "+2 days",
    tags: [
      { tag: "ATS", tagFr: "ATS" },
      { tag: "documentation", tagFr: "documentation" },
      { tag: "maturity-B", tagFr: "maturité-B" },
    ],
  },
  {
    titleEn: "Establishing rapport during the opening meeting improves interview quality",
    titleFr: "Établir un rapport lors de la réunion d'ouverture améliore la qualité des entretiens",
    contentEn:
      "Taking time during the opening meeting to explain the peer review's collaborative (non-punitive) nature significantly reduces defensiveness in subsequent interviews. Share concrete examples of how peer reviews have helped other ANSPs improve. Consider a brief ice-breaker activity involving all participants.",
    contentFr:
      "Prendre le temps lors de la réunion d'ouverture d'expliquer la nature collaborative (non punitive) de l'évaluation par les pairs réduit significativement la défensivité lors des entretiens suivants. Partagez des exemples concrets de la façon dont les évaluations par les pairs ont aidé d'autres ANSP à s'améliorer. Envisagez une brève activité brise-glace impliquant tous les participants.",
    category: "INTERVIEW_TECHNIQUE" as const,
    impactLevel: "HIGH" as const,
    applicability: "GENERAL" as const,
    actionableAdvice: "Prepare 2-3 success stories from previous peer reviews to share during the opening. Emphasize the non-audit, improvement-focused nature of the process.",
    tags: [
      { tag: "opening-meeting", tagFr: "réunion-ouverture" },
      { tag: "interviews", tagFr: "entretiens" },
      { tag: "rapport-building", tagFr: "établissement-rapport" },
    ],
  },
  {
    titleEn: "Request SMS documentation in advance — most East African ANSPs need 2+ weeks",
    titleFr: "Demander la documentation SMS à l'avance — la plupart des ANSP d'Afrique de l'Est ont besoin de 2+ semaines",
    contentEn:
      "In our experience reviewing East African ANSPs, most organizations need a minimum of 2 weeks to compile and organize their SMS documentation for review. This is especially true for maturity level A-B organizations where documentation may not be regularly maintained or centrally stored.",
    contentFr:
      "D'après notre expérience d'évaluation des ANSP d'Afrique de l'Est, la plupart des organisations ont besoin d'au moins 2 semaines pour compiler et organiser leur documentation SMS pour la revue. Cela est particulièrement vrai pour les organisations de niveau de maturité A-B où la documentation peut ne pas être régulièrement maintenue ou stockée de manière centralisée.",
    category: "DOCUMENTATION_REVIEW" as const,
    impactLevel: "MODERATE" as const,
    applicability: "REGIONAL" as const,
    hostRegion: "ESAF" as const,
    hostMaturityLevel: "B" as const,
    actionableAdvice: "Send the document request list at least 3 weeks before the planned visit. Follow up 1 week before to confirm readiness.",
    estimatedTimeImpact: "+1 week preparation",
    tags: [
      { tag: "SMS", tagFr: "SMS" },
      { tag: "advance-preparation", tagFr: "préparation-avancée" },
      { tag: "East-Africa", tagFr: "Afrique-Est" },
    ],
  },
  {
    titleEn: "Use bilingual questionnaire approach for ASECNA member states",
    titleFr: "Utiliser une approche bilingue du questionnaire pour les États membres de l'ASECNA",
    contentEn:
      "When reviewing ASECNA member state operations, always prepare both French and English versions of interview guides and assessment forms. While many technical staff read English documentation, they express nuances more precisely in French. Having bilingual materials reduces misunderstandings and improves response quality.",
    contentFr:
      "Lors de l'évaluation des opérations des États membres de l'ASECNA, préparez toujours des versions française et anglaise des guides d'entretien et des formulaires d'évaluation. Bien que de nombreux personnels techniques lisent la documentation en anglais, ils expriment les nuances plus précisément en français. Disposer de matériels bilingues réduit les malentendus et améliore la qualité des réponses.",
    category: "CULTURAL_COMMUNICATION" as const,
    impactLevel: "HIGH" as const,
    applicability: "REGIONAL" as const,
    hostRegion: "WACAF" as const,
    actionableAdvice: "Prepare all interview guides in both EN and FR before departure. Allow interviewees to choose their preferred language.",
    tags: [
      { tag: "bilingual", tagFr: "bilingue" },
      { tag: "ASECNA", tagFr: "ASECNA" },
      { tag: "WACAF", tagFr: "WACAF" },
    ],
  },
  {
    titleEn: "Safety data analysis tools vary significantly — adapt your approach",
    titleFr: "Les outils d'analyse des données de sécurité varient considérablement — adaptez votre approche",
    contentEn:
      "We found that safety data analysis maturity ranges from spreadsheet-based tracking to full SDCPS implementations. When reviewing the safety assurance component (SoE SA3), first establish what tools the ANSP actually uses before diving into process evaluation. Some ANSPs at maturity C use very effective manual processes.",
    contentFr:
      "Nous avons constaté que la maturité de l'analyse des données de sécurité va du suivi par tableur aux implémentations complètes de SDCPS. Lors de l'évaluation du composant d'assurance de la sécurité (SoE SA3), établissez d'abord quels outils l'ANSP utilise réellement avant de plonger dans l'évaluation des processus. Certains ANSP au niveau de maturité C utilisent des processus manuels très efficaces.",
    category: "TECHNICAL_FINDING" as const,
    impactLevel: "MODERATE" as const,
    applicability: "GENERAL" as const,
    reviewPhase: "ON_SITE" as const,
    actionableAdvice: "During the preparation phase, request a brief overview of the ANSP's safety data systems and tools to calibrate your on-site assessment approach.",
    tags: [
      { tag: "safety-data", tagFr: "données-sécurité" },
      { tag: "SoE-SA3", tagFr: "SoE-SA3" },
      { tag: "tools", tagFr: "outils" },
    ],
  },
  {
    titleEn: "Standardize the scoring calibration session before on-site visits",
    titleFr: "Standardiser la session de calibration de la notation avant les visites sur site",
    contentEn:
      "Team scoring consistency improves dramatically when a 1-hour calibration session is held before the on-site visit. Review 2-3 example scenarios from previous reviews and have each team member independently score them, then discuss differences. This ensures consistent interpretation of maturity levels across all team members.",
    contentFr:
      "La cohérence de la notation de l'équipe s'améliore considérablement lorsqu'une session de calibration d'1 heure est organisée avant la visite sur site. Examinez 2-3 scénarios d'exemple provenant d'évaluations précédentes et demandez à chaque membre de l'équipe de les noter indépendamment, puis discutez des différences. Cela garantit une interprétation cohérente des niveaux de maturité entre tous les membres de l'équipe.",
    category: "PROCESS_IMPROVEMENT" as const,
    impactLevel: "HIGH" as const,
    applicability: "GENERAL" as const,
    reviewPhase: "PREPARATION" as const,
    actionableAdvice: "Schedule a 1-hour scoring calibration session 2-3 days before the on-site visit. Use real anonymized scenarios from past reviews.",
    estimatedTimeImpact: "+1 hour preparation, saves 2+ hours of revision",
    tags: [
      { tag: "scoring", tagFr: "notation" },
      { tag: "calibration", tagFr: "calibration" },
      { tag: "team-preparation", tagFr: "préparation-équipe" },
    ],
  },
  {
    titleEn: "Host engagement improves when ANSP leadership attends key sessions",
    titleFr: "L'engagement de l'hôte s'améliore lorsque la direction de l'ANSP assiste aux sessions clés",
    contentEn:
      "Reviews where the host ANSP's Director General or Deputy DG attended the opening and closing meetings resulted in significantly higher post-review engagement and faster CAP implementation. Request senior leadership participation during the planning phase — frame it as essential for organizational learning.",
    contentFr:
      "Les évaluations où le Directeur Général ou le Directeur Général Adjoint de l'ANSP hôte a assisté aux réunions d'ouverture et de clôture ont entraîné un engagement post-évaluation significativement plus élevé et une mise en œuvre plus rapide des PAC. Demandez la participation de la direction supérieure pendant la phase de planification — présentez-la comme essentielle pour l'apprentissage organisationnel.",
    category: "HOST_ENGAGEMENT" as const,
    impactLevel: "HIGH" as const,
    applicability: "GENERAL" as const,
    actionableAdvice: "During the planning phase, formally request DG/Deputy DG attendance at opening and closing meetings. Explain the correlation with successful CAP implementation.",
    tags: [
      { tag: "leadership", tagFr: "direction" },
      { tag: "opening-closing", tagFr: "ouverture-clôture" },
      { tag: "CAP-implementation", tagFr: "mise-en-œuvre-PAC" },
    ],
  },
  {
    titleEn: "Use the CANSO SoE self-assessment as a conversation starter, not a checklist",
    titleFr: "Utiliser l'auto-évaluation SoE CANSO comme point de départ de conversation, pas comme liste de contrôle",
    contentEn:
      "The most effective on-site reviews treat the CANSO SoE self-assessment responses as conversation starters rather than as a checklist to verify. Ask open-ended questions like 'Tell me how this process works in practice' rather than 'Do you do X?'. This uncovers actual implementation gaps versus documented procedures.",
    contentFr:
      "Les évaluations sur site les plus efficaces traitent les réponses d'auto-évaluation SoE CANSO comme des points de départ de conversation plutôt que comme une liste de contrôle à vérifier. Posez des questions ouvertes comme « Dites-moi comment ce processus fonctionne en pratique » plutôt que « Faites-vous X ? ». Cela révèle les écarts réels de mise en œuvre par rapport aux procédures documentées.",
    category: "TOOL_METHODOLOGY" as const,
    impactLevel: "MODERATE" as const,
    applicability: "GENERAL" as const,
    reviewPhase: "ON_SITE" as const,
    actionableAdvice: "Brief all team members on open-ended questioning techniques before on-site visits. Prepare probing follow-up questions for each SoE study area.",
    tags: [
      { tag: "SoE", tagFr: "SoE" },
      { tag: "methodology", tagFr: "méthodologie" },
      { tag: "questioning", tagFr: "questionnement" },
    ],
  },
  {
    titleEn: "Northern African ANSPs often have strong documentation but need process verification",
    titleFr: "Les ANSP d'Afrique du Nord ont souvent une documentation solide mais nécessitent une vérification des processus",
    contentEn:
      "Our experience with Northern African ANSPs (particularly ONDA and neighbouring organizations) shows strong regulatory documentation aligned with ICAO standards. However, on-site verification often reveals gaps between documented procedures and actual implementation. Allocate more time for on-site process observation rather than document review.",
    contentFr:
      "Notre expérience avec les ANSP d'Afrique du Nord (particulièrement l'ONDA et les organisations voisines) montre une documentation réglementaire solide alignée avec les normes de l'OACI. Cependant, la vérification sur site révèle souvent des écarts entre les procédures documentées et la mise en œuvre réelle. Allouez plus de temps à l'observation des processus sur site plutôt qu'à la revue documentaire.",
    category: "TECHNICAL_FINDING" as const,
    impactLevel: "MODERATE" as const,
    applicability: "REGIONAL" as const,
    hostRegion: "NORTHERN" as const,
    hostMaturityLevel: "C" as const,
    reviewPhase: "ON_SITE" as const,
    actionableAdvice: "For Northern African reviews, shift time allocation: reduce document review by 1 day and add 1 day of on-site process observation.",
    estimatedTimeImpact: "Rebalance: -1 day docs, +1 day observation",
    tags: [
      { tag: "Northern-Africa", tagFr: "Afrique-Nord" },
      { tag: "process-verification", tagFr: "vérification-processus" },
      { tag: "ONDA", tagFr: "ONDA" },
    ],
  },
  {
    titleEn: "Include local ATC supervisors in interview scheduling to minimize operational impact",
    titleFr: "Inclure les superviseurs ATC locaux dans la planification des entretiens pour minimiser l'impact opérationnel",
    contentEn:
      "Coordinate interview schedules directly with ATC watch supervisors to avoid pulling controllers during peak traffic periods. In our Tanzania review, building the interview schedule around shift patterns resulted in more relaxed, detailed interviews. Controllers were more forthcoming when they weren't worried about their operational position being short-staffed.",
    contentFr:
      "Coordonnez les horaires d'entretien directement avec les superviseurs de quart ATC pour éviter de retirer les contrôleurs pendant les périodes de trafic de pointe. Lors de notre évaluation en Tanzanie, construire le programme d'entretiens autour des schémas de quart a donné des entretiens plus détendus et détaillés. Les contrôleurs étaient plus ouverts lorsqu'ils ne s'inquiétaient pas de la sous-effectif de leur position opérationnelle.",
    category: "INTERVIEW_TECHNIQUE" as const,
    impactLevel: "MODERATE" as const,
    applicability: "GENERAL" as const,
    reviewPhase: "ON_SITE" as const,
    actionableAdvice: "Request the ATC shift roster in advance. Schedule interviews during off-peak periods or handover windows.",
    estimatedTimeImpact: "No extra time needed — just better scheduling",
    tags: [
      { tag: "ATC", tagFr: "ATC" },
      { tag: "interviews", tagFr: "entretiens" },
      { tag: "shift-planning", tagFr: "planification-quarts" },
    ],
  },
  {
    titleEn: "Daily team debriefs are essential — do not skip them under time pressure",
    titleFr: "Les débriefings quotidiens d'équipe sont essentiels — ne les supprimez pas sous la pression du temps",
    contentEn:
      "In reviews where daily 30-minute team debriefs were consistently held, the final report quality was markedly better and required fewer revision cycles. The debrief serves three purposes: aligning findings, distributing workload for the next day, and catching potential misinterpretations early. Teams that skipped debriefs under time pressure consistently produced more contradictions in their reports.",
    contentFr:
      "Dans les évaluations où des débriefings quotidiens de 30 minutes ont été systématiquement organisés, la qualité du rapport final était nettement meilleure et nécessitait moins de cycles de révision. Le débriefing sert trois objectifs : aligner les constats, répartir la charge de travail pour le lendemain, et détecter précocement les interprétations erronées. Les équipes qui ont supprimé les débriefings sous la pression du temps ont systématiquement produit plus de contradictions dans leurs rapports.",
    category: "PROCESS_IMPROVEMENT" as const,
    impactLevel: "HIGH" as const,
    applicability: "GENERAL" as const,
    reviewPhase: "ON_SITE" as const,
    actionableAdvice: "Block 30 minutes at the end of each on-site day for team debrief. Make it a non-negotiable part of the schedule.",
    estimatedTimeImpact: "30 min/day on-site, saves 1-2 days of report revision",
    tags: [
      { tag: "debrief", tagFr: "débriefing" },
      { tag: "team-coordination", tagFr: "coordination-équipe" },
      { tag: "report-quality", tagFr: "qualité-rapport" },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding lessons learned knowledge base...\n");

  // Find the first retrospective and a user to attach lessons to
  const retrospective = await prisma.reviewRetrospective.findFirst({
    where: { status: "SUBMITTED" },
    select: { id: true, submittedById: true, reviewId: true },
  });

  if (!retrospective) {
    // Fallback: find any retrospective
    const anyRetro = await prisma.reviewRetrospective.findFirst({
      select: { id: true, submittedById: true, reviewId: true },
    });
    if (!anyRetro) {
      console.log("⚠️  No retrospectives found. Please seed demo data first.");
      console.log("   Run: npm run db:seed:demo");
      process.exit(1);
    }
    Object.assign(retrospective!, anyRetro);
  }

  // Find a programme coordinator or admin as fallback author
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["PROGRAMME_COORDINATOR", "SUPER_ADMIN"] } },
    select: { id: true },
  });

  const authorId = admin?.id ?? retrospective!.submittedById;

  let created = 0;
  let skipped = 0;

  for (const lesson of LESSONS) {
    // Check if already seeded (by title)
    const existing = await prisma.lessonLearned.findFirst({
      where: { titleEn: lesson.titleEn },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.lessonLearned.create({
      data: {
        retrospectiveId: retrospective!.id,
        authorId,
        titleEn: lesson.titleEn,
        titleFr: lesson.titleFr,
        contentEn: lesson.contentEn,
        contentFr: lesson.contentFr,
        category: lesson.category,
        impactLevel: lesson.impactLevel,
        applicability: lesson.applicability,
        hostRegion: lesson.hostRegion ?? null,
        hostMaturityLevel: lesson.hostMaturityLevel ?? null,
        reviewPhase: lesson.reviewPhase ?? null,
        actionableAdvice: lesson.actionableAdvice ?? null,
        estimatedTimeImpact: lesson.estimatedTimeImpact ?? null,
        status: "PUBLISHED",
        publishedAt: new Date(),
        viewCount: Math.floor(Math.random() * 50) + 5,
        helpfulCount: Math.floor(Math.random() * 15) + 1,
        tags: {
          create: lesson.tags.map((tag) => ({
            tag: tag.tag,
            tagFr: tag.tagFr,
          })),
        },
      },
    });

    created++;
    console.log(`  ✅ ${lesson.titleEn.slice(0, 70)}...`);
  }

  console.log(`\n🎉 Seeding complete: ${created} created, ${skipped} skipped (already exist)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
