/**
 * =============================================================================
 * COMPREHENSIVE TRAINING MODULES SEED SCRIPT
 * =============================================================================
 *
 * Seeds 6 training modules (M0–M5) with 34 topics and 23 resources for the
 * African ANSP Peer Review Programme, aligned with:
 *
 *   • ICAO TRAINAIR PLUS competency-based methodology (Doc 9941)
 *   • Draft Agenda – AFI ANSP Peer Reviewers' Refresher Training Workshop
 *     (Dar es Salaam, Tanzania, 25–28 November 2025)
 *   • ICAO USOAP CMA 2024 Protocol Questions (Doc 9735, 5th Edition)
 *   • CANSO Standard of Excellence in SMS (2024 Edition)
 *   • ICAO Annex 19 – Safety Management (2nd Edition, Amendment 1)
 *
 * Module Structure (per Draft Agenda):
 *   M0 – Introduction (Agenda Item 0/1)
 *   M1 – Overview of the AFI ANSP Peer Review Programme (Agenda Item 2)
 *   M2 – Key Principles and Operational Phases (Agenda Item 3)
 *   M3 – Conducting and Following Up on Peer Reviews (Agenda Item 4)
 *   M4 – Assessing SMS Maturity (Agenda Item 5)
 *   M5 – Practical Exercises (Agenda Item 6)
 *
 * Usage:
 *   npx tsx prisma/seed-comprehensive-training.ts
 *
 * Or add to package.json:
 *   "db:seed:training": "npx tsx prisma/seed-comprehensive-training.ts"
 *
 * =============================================================================
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ResourceType, CANSOStudyArea } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface TopicData {
  titleEn: string;
  titleFr: string;
  contentEn: string;
  contentFr: string;
  relatedPQs: string[];
  relatedStudyAreas: CANSOStudyArea[];
  sortOrder: number;
}

interface ResourceData {
  titleEn: string;
  titleFr: string;
  resourceType: ResourceType;
  url: string | null;
  fileUrl: string | null;
  sortOrder: number;
}

interface ModuleData {
  moduleNumber: number;
  code: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  objectivesEn: string[];
  objectivesFr: string[];
  iconName: string;
  sortOrder: number;
  topics: TopicData[];
  resources: ResourceData[];
}

// =============================================================================
// MODULE 0 — INTRODUCTION
// =============================================================================

const MODULE_0: ModuleData = {
  moduleNumber: 0,
  code: "M0",
  titleEn: "Introduction",
  titleFr: "Introduction",
  descriptionEn:
    "Welcome and opening session establishing workshop objectives, participant expectations, and the context of aviation safety improvement in the AFI region. Aligned with ICAO TRAINAIR PLUS competency-based pre-assessment methodology.",
  descriptionFr:
    "Session d'accueil et d'ouverture établissant les objectifs de l'atelier, les attentes des participants et le contexte de l'amélioration de la sécurité aéronautique dans la région AFI. Alignée sur la méthodologie d'évaluation préalable basée sur les compétences TRAINAIR PLUS de l'OACI.",
  objectivesEn: [
    "Identify the workshop learning objectives and explain how they support AFI Plan Implementation Project 3 (ANSP Peer Reviews)",
    "Describe the current state of aviation safety performance in the AFI region using key RASG-AFI metrics and Abuja Safety Targets",
    "Recognize personal knowledge gaps related to peer review processes and SMS assessment to maximize learning during the workshop",
  ],
  objectivesFr: [
    "Identifier les objectifs d'apprentissage de l'atelier et expliquer comment ils soutiennent le Projet 3 de Mise en Œuvre du Plan AFI (Évaluations par les Pairs des ANSP)",
    "Décrire l'état actuel de la performance de sécurité aéronautique dans la région AFI en utilisant les indicateurs clés RASG-AFI et les Cibles de Sécurité d'Abuja",
    "Reconnaître les lacunes personnelles de connaissances liées aux processus d'évaluation par les pairs et à l'évaluation du SGS pour maximiser l'apprentissage durant l'atelier",
  ],
  iconName: "BookOpen",
  sortOrder: 0,
  topics: [
    {
      titleEn: "Welcome and Workshop Administration",
      titleFr: "Accueil et Administration de l'Atelier",
      contentEn:
        "Registration, logistics briefing, introduction of facilitators and participants, overview of training schedule, and establishment of workshop ground rules including language interpretation arrangements (English/French).",
      contentFr:
        "Inscription, briefing logistique, présentation des facilitateurs et participants, aperçu du calendrier de formation, et établissement des règles de fonctionnement de l'atelier y compris les arrangements d'interprétation linguistique (anglais/français).",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 0,
    },
    {
      titleEn: "Workshop Objectives and Expected Outcomes",
      titleFr: "Objectifs de l'Atelier et Résultats Attendus",
      contentEn:
        'Detailed presentation of the training programme objectives aligned with AFI Plan safety targets, expected competencies upon completion, and how participants will apply peer review skills in their respective ANSPs following the "No ANSP Left Behind" principle.',
      contentFr:
        "Présentation détaillée des objectifs du programme de formation alignés sur les cibles de sécurité du Plan AFI, compétences attendues à l'issue de la formation, et application des compétences d'évaluation par les pairs dans leurs ANSP respectifs selon le principe « Aucun ANSP Laissé de Côté ».",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 1,
    },
    {
      titleEn: "Context of Aviation Safety in the AFI Region",
      titleFr: "Contexte de la Sécurité Aérienne dans la Région AFI",
      contentEn:
        "Overview of current AFI safety performance metrics, progress toward the 16 Abuja Safety and ANS Targets, RASG-AFI accident rate trends, and the role of peer reviews in achieving the 60% Effective Implementation (EI) threshold across all African States as monitored by AFCAC.",
      contentFr:
        "Aperçu des indicateurs actuels de performance de sécurité AFI, progrès vers les 16 Cibles de Sécurité et SNA d'Abuja, tendances du taux d'accidents RASG-AFI, et rôle des évaluations par les pairs pour atteindre le seuil de 60 % de Mise en Œuvre Effective (EI) dans tous les États africains, tel que suivi par la CAFAC.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 2,
    },
    {
      titleEn: "Pre-Assessment of Participant Knowledge",
      titleFr: "Évaluation Préliminaire des Connaissances des Participants",
      contentEn:
        "Administration of a baseline knowledge assessment covering SMS fundamentals, peer review concepts, and ICAO/CANSO frameworks to establish starting competencies and tailor subsequent module delivery to participant needs, per ICAO Doc 9941 progress test methodology.",
      contentFr:
        "Administration d'une évaluation de base des connaissances couvrant les fondamentaux du SGS, les concepts d'évaluation par les pairs et les cadres OACI/CANSO pour établir les compétences initiales et adapter la prestation des modules suivants aux besoins des participants, selon la méthodologie de tests de progrès du Doc 9941 de l'OACI.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 3,
    },
  ],
  resources: [
    {
      titleEn: "AFI ANSP Peer Review Workshop Participant Handbook",
      titleFr:
        "Manuel du Participant à l'Atelier d'Évaluation par les Pairs des ANSP AFI",
      resourceType: "DOCUMENT" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 0,
    },
    {
      titleEn: "Abuja Safety and ANS Targets Progress Dashboard",
      titleFr:
        "Tableau de Bord de Progrès des Cibles de Sécurité et SNA d'Abuja",
      resourceType: "PRESENTATION" as ResourceType,
      url: "https://www.icao.int/safety/afiplan",
      fileUrl: null,
      sortOrder: 1,
    },
    {
      titleEn: "Pre-Training Knowledge Assessment Questionnaire",
      titleFr:
        "Questionnaire d'Évaluation des Connaissances Préalables à la Formation",
      resourceType: "CHECKLIST" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 2,
    },
  ],
};

// =============================================================================
// MODULE 1 — OVERVIEW OF THE AFI ANSP PEER REVIEW PROGRAMME
// =============================================================================

const MODULE_1: ModuleData = {
  moduleNumber: 1,
  code: "M1",
  titleEn: "Overview of the AFI ANSP Peer Review Programme",
  titleFr:
    "Vue d'ensemble du Programme d'Évaluation par les Pairs des ANSP AFI",
  descriptionEn:
    "Background, objectives, terms of reference, governance structure, and Programme Manual overview. Covers the historical development from the 2015 Montreal coordination meeting through the current 35-State coalition and integration with AFI Plan safety targets.",
  descriptionFr:
    "Contexte, objectifs, termes de référence, structure de gouvernance et aperçu du Manuel du Programme. Couvre le développement historique depuis la réunion de coordination de Montréal de 2015 jusqu'à la coalition actuelle de 35 États et l'intégration avec les cibles de sécurité du Plan AFI.",
  objectivesEn: [
    "Describe the historical development of the AFI ANSP Peer Review Programme from 2015 to present, identifying key milestones and decision points",
    "Explain the programme's vision, mission, objectives and scope as defined in the Terms of Reference",
    "Identify the roles and responsibilities of each stakeholder in the governance structure including the Steering Group, ICAO, AFCAC, CANSO and participating ANSPs",
    "Locate and navigate key sections of the Programme Manual relevant to peer review planning and execution",
    "Explain how the peer review programme contributes to AFI Plan safety targets and regional aviation safety improvement",
  ],
  objectivesFr: [
    "Décrire le développement historique du Programme d'Évaluation par les Pairs des ANSP AFI de 2015 à aujourd'hui, en identifiant les jalons clés et points de décision",
    "Expliquer la vision, la mission, les objectifs et le champ d'application du programme tels que définis dans les Termes de Référence",
    "Identifier les rôles et responsabilités de chaque partie prenante dans la structure de gouvernance incluant le Groupe Directeur, l'OACI, la CAFAC, CANSO et les ANSP participants",
    "Localiser et naviguer dans les sections clés du Manuel du Programme pertinentes pour la planification et l'exécution des évaluations par les pairs",
    "Expliquer comment le programme d'évaluation par les pairs contribue aux cibles de sécurité du Plan AFI et à l'amélioration de la sécurité aéronautique régionale",
  ],
  iconName: "Globe",
  sortOrder: 1,
  topics: [
    {
      titleEn: "Historical Development and Programme Genesis",
      titleFr: "Développement Historique et Genèse du Programme",
      contentEn:
        "Chronological overview from the February 2015 Montreal coordination meeting initiated by the ICAO Council President, through the May 2017 Freetown draft manual adoption, the April 2018 Grand Bassam workshop, the 2019 ASECNA-Ghana cross-reviews, COVID-19 suspension, and the March 2022 Lomé relaunch establishing the current coalition of participating States.",
      contentFr:
        "Aperçu chronologique depuis la réunion de coordination de Montréal de février 2015 initiée par le Président du Conseil de l'OACI, jusqu'à l'adoption du projet de manuel à Freetown en mai 2017, l'atelier de Grand Bassam en avril 2018, les évaluations croisées ASECNA-Ghana de 2019, la suspension COVID-19, et le relancement de Lomé en mars 2022 établissant la coalition actuelle d'États participants.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 0,
    },
    {
      titleEn: "Programme Objectives and Terms of Reference",
      titleFr: "Objectifs du Programme et Termes de Référence",
      contentEn:
        "Detailed examination of the programme's vision to establish a minimum safety level for ANS in the AFI region, its mission to conduct cross audits, issue recommendations, monitor corrective actions, and promote mutual assistance. Coverage of scope including ATS, CNS, MET, SAR, PANS-OPS, AIM, and SMS domains.",
      contentFr:
        "Examen détaillé de la vision du programme pour établir un niveau minimum de sécurité des SNA dans la région AFI, sa mission de conduire des audits croisés, émettre des recommandations, surveiller les actions correctives, et promouvoir l'assistance mutuelle. Couverture du champ d'application incluant les domaines ATS, CNS, MET, SAR, PANS-OPS, AIM et SGS.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 1,
    },
    {
      titleEn: "Governance Structure and Key Stakeholders",
      titleFr: "Structure de Gouvernance et Parties Prenantes Clés",
      contentEn:
        "Organization of the ANSP Steering Group with ASECNA as Chair, ATNS South Africa as Vice-Chair, and CANSO as Secretariat. Roles and responsibilities of member ANSPs, ICAO Regional Offices (ESAF/WACAF), and AFCAC as Observer. Introduction to the Task Force composition and current programme leadership.",
      contentFr:
        "Organisation du Groupe Directeur des ANSP avec ASECNA comme Président, ATNS Afrique du Sud comme Vice-Président, et CANSO comme Secrétariat. Rôles et responsabilités des ANSP membres, des Bureaux Régionaux de l'OACI (ESAF/WACAF), et de la CAFAC comme Observateur. Introduction à la composition de la Task Force et au leadership actuel du programme.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 2,
    },
    {
      titleEn:
        "Relationship with IOSA, APEX and International Benchmarking Standards",
      titleFr:
        "Relation avec IOSA, APEX et les Normes Internationales d'Étalonnage",
      contentEn:
        "Comparison of the AFI ANSP peer review model with IATA's Operational Safety Audit (IOSA) for airlines and ACI's Airport Excellence (APEX) programme. How the Integrated Safety and Quality Assurance Programme (ASQA) pools resources while maintaining compliance with international standards.",
      contentFr:
        "Comparaison du modèle d'évaluation par les pairs des ANSP AFI avec l'Audit de Sécurité Opérationnelle (IOSA) de l'IATA pour les compagnies aériennes et le programme Airport Excellence (APEX) de l'ACI. Comment le Programme Intégré d'Assurance de la Sécurité et de la Qualité (ASQA) mutualise les ressources tout en maintenant la conformité aux normes internationales.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 3,
    },
    {
      titleEn: "Programme Manual Structure and Key Documentation",
      titleFr: "Structure du Manuel du Programme et Documentation Clé",
      contentEn:
        "Systematic review of the merged ICAO/CANSO programme manual structure including: Framework MOU, standardized SMS/QMS frame of reference, ANS Review Protocol Questionnaires, mandatory evaluation checklists, reviewer qualification standards, and the expert database. Discussion of 2023 Task Force harmonization with CANSO SoE framework.",
      contentFr:
        "Revue systématique de la structure du manuel de programme fusionné OACI/CANSO incluant : Protocole d'Accord Cadre, cadre de référence standardisé SGS/SGQ, Questionnaires de Protocole de Revue SNA, listes de vérification d'évaluations obligatoires, normes de qualification des évaluateurs, et base de données d'experts. Discussion de l'harmonisation 2023 de la Task Force avec le cadre SoE de CANSO.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 4,
    },
    {
      titleEn: "Integration with AFI Plan and Regional Safety Initiatives",
      titleFr:
        "Intégration avec le Plan AFI et les Initiatives Régionales de Sécurité",
      contentEn:
        "Positioning of the peer review programme within AFI Plan's seven implementation projects. Alignment with ICAO Assembly Resolution A36-1, the Single African Air Transport Market (SAATM), and AFCAC's monitoring of the 16 Abuja Safety and ANS Targets. Expected contribution to regional harmonization through 2030.",
      contentFr:
        "Positionnement du programme d'évaluation par les pairs parmi les sept projets de mise en œuvre du Plan AFI. Alignement avec la Résolution A36-1 de l'Assemblée de l'OACI, le Marché Unique Africain du Transport Aérien (MUTAA), et le suivi par la CAFAC des 16 Cibles de Sécurité et SNA d'Abuja. Contribution attendue à l'harmonisation régionale jusqu'en 2030.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 5,
    },
  ],
  resources: [
    {
      titleEn: "AFI ANSP Peer Review Programme Manual",
      titleFr:
        "Manuel du Programme d'Évaluation par les Pairs des ANSP AFI",
      resourceType: "DOCUMENT" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 0,
    },
    {
      titleEn: "AFI Plan Programme Document (2025–2030)",
      titleFr: "Document du Programme du Plan AFI (2025–2030)",
      resourceType: "EXTERNAL_LINK" as ResourceType,
      url: "https://www.icao.int/safety/afiplan",
      fileUrl: null,
      sortOrder: 1,
    },
    {
      titleEn: "Terms of Reference and Governance Structure Presentation",
      titleFr:
        "Présentation des Termes de Référence et de la Structure de Gouvernance",
      resourceType: "PRESENTATION" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 2,
    },
    {
      titleEn: "ANSP Steering Group Membership Directory",
      titleFr: "Répertoire des Membres du Groupe Directeur des ANSP",
      resourceType: "TEMPLATE" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 3,
    },
  ],
};

// =============================================================================
// MODULE 2 — KEY PRINCIPLES AND OPERATIONAL PHASES
// =============================================================================

const MODULE_2: ModuleData = {
  moduleNumber: 2,
  code: "M2",
  titleEn: "Key Principles and Operational Phases of the AFI ANSP Peer Review",
  titleFr:
    "Principes Clés et Phases Opérationnelles de l'Évaluation par les Pairs des ANSP AFI",
  descriptionEn:
    "Core concepts, the three phases of the review process (preparation, on-site review, reporting), Protocol Question methodology aligned with ICAO USOAP CMA 2024, and mapping to the eight ICAO Critical Elements of a safety oversight system.",
  descriptionFr:
    "Concepts fondamentaux, les trois phases du processus de revue (préparation, revue sur site, rapports), méthodologie des Questions de Protocole alignée sur l'USOAP CMA 2024 de l'OACI, et correspondance avec les huit Éléments Critiques d'un système de supervision de la sécurité de l'OACI.",
  objectivesEn: [
    "Apply the fundamental principles of peer review including independence, non-punitive approach, and evidence-based assessment in review scenarios",
    "Execute preparation phase activities including team selection, documentation review, and pre-visit coordination according to Programme Manual requirements",
    "Conduct on-site review activities using appropriate interview, observation, and evidence collection techniques",
    "Classify findings according to the established categorization system (Non-Conformity, Observation, Recommendation, Good Practice) with appropriate justification",
    "Relate Protocol Questions to the corresponding ICAO Critical Elements and evaluate how ANSP compliance supports State oversight effectiveness",
  ],
  objectivesFr: [
    "Appliquer les principes fondamentaux de l'évaluation par les pairs incluant l'indépendance, l'approche non punitive et l'évaluation basée sur les preuves dans les scénarios d'évaluation",
    "Exécuter les activités de la phase de préparation incluant la sélection de l'équipe, la revue documentaire et la coordination pré-visite selon les exigences du Manuel du Programme",
    "Conduire les activités d'évaluation sur site en utilisant les techniques appropriées d'entretien, d'observation et de collecte des preuves",
    "Classifier les constatations selon le système de catégorisation établi (Non-Conformité, Observation, Recommandation, Bonne Pratique) avec justification appropriée",
    "Relier les Questions de Protocole aux Éléments Critiques de l'OACI correspondants et évaluer comment la conformité des ANSP soutient l'efficacité de la supervision de l'État",
  ],
  iconName: "GitBranch",
  sortOrder: 2,
  topics: [
    {
      titleEn: "Fundamental Principles of Peer Review",
      titleFr: "Principes Fondamentaux de l'Évaluation par les Pairs",
      contentEn:
        'Core principles underlying effective peer reviews: independence and objectivity, non-punitive approach, continuous improvement orientation, mutual benefit, confidentiality, and evidence-based assessment. Distinction between peer review and regulatory audit functions. Application of the "reviewer cannot audit own organization" rule.',
      contentFr:
        "Principes fondamentaux sous-tendant des évaluations par les pairs efficaces : indépendance et objectivité, approche non punitive, orientation vers l'amélioration continue, bénéfice mutuel, confidentialité et évaluation basée sur les preuves. Distinction entre évaluation par les pairs et fonctions d'audit réglementaire. Application de la règle « l'évaluateur ne peut auditer sa propre organisation ».",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 0,
    },
    {
      titleEn: "Phase 1 — Preparation Activities",
      titleFr: "Phase 1 — Activités de Préparation",
      contentEn:
        "Comprehensive review of preparation phase activities: formal peer review request submission, ANSP self-assessment completion, review team selection from the expert database, team composition requirements (university degree or equivalent, minimum 5 years ANSP experience, expertise in ATM/MET/AIM/CNS/SAR/SMS), pre-review coordination, documentation submission, and logistics planning.",
      contentFr:
        "Revue complète des activités de la phase de préparation : soumission de la demande formelle d'évaluation par les pairs, complétion de l'auto-évaluation ANSP, sélection de l'équipe d'évaluation dans la base de données d'experts, exigences de composition de l'équipe (diplôme universitaire ou équivalent, minimum 5 ans d'expérience ANSP, expertise en ATM/MET/AIM/CNS/SAR/SGS), coordination pré-évaluation, soumission de la documentation et planification logistique.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 1,
    },
    {
      titleEn: "Phase 2 — On-Site Review Conduct",
      titleFr: "Phase 2 — Conduite de l'Évaluation sur Site",
      contentEn:
        "Detailed methodology for on-site review activities: opening meeting protocols, document review techniques, interview procedures, facility inspections, observation of operational activities, evidence collection and documentation, daily team briefings, and preliminary findings communication. Application of Protocol Questions across ATS, CNS, MET, SAR, AIM, and SMS domains.",
      contentFr:
        "Méthodologie détaillée pour les activités d'évaluation sur site : protocoles de réunion d'ouverture, techniques de revue documentaire, procédures d'entretien, inspections des installations, observation des activités opérationnelles, collecte et documentation des preuves, briefings quotidiens de l'équipe et communication des constatations préliminaires. Application des Questions de Protocole dans les domaines ATS, CNS, MET, SAR, AIM et SGS.",
      relatedPQs: ["ANS-1.001", "ANS-2.001", "ANS-3.001"],
      relatedStudyAreas: [],
      sortOrder: 2,
    },
    {
      titleEn: "Phase 3 — Reporting and Follow-Up",
      titleFr: "Phase 3 — Rapports et Suivi",
      contentEn:
        "Structured approach to reporting: findings categorization (Non-Conformity, Observation, Recommendation, Good Practice), report drafting standards, closing meeting protocols, report submission to reviewed ANSP, corrective/preventive action plan development requirements, return of action plans to Coordination Team, and implementation status monitoring cycle.",
      contentFr:
        "Approche structurée des rapports : catégorisation des constatations (Non-Conformité, Observation, Recommandation, Bonne Pratique), normes de rédaction des rapports, protocoles de réunion de clôture, soumission du rapport à l'ANSP évalué, exigences d'élaboration du plan d'actions correctives/préventives, retour des plans d'action à l'Équipe de Coordination et cycle de suivi de l'état de mise en œuvre.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 3,
    },
    {
      titleEn: "Protocol Questions and ANS Audit Areas",
      titleFr: "Questions de Protocole et Domaines d'Audit SNA",
      contentEn:
        "Introduction to Protocol Question methodology adapted from the ICAO USOAP CMA 2024 edition (851 PQs across 8 audit areas). Focus on ANS-relevant PQs covering seven ANS fields: ATM, PANS-OPS, AIS/AIM, Aeronautical Charts, CNS, MET, and SAR. Structure of PQs including guidance for evidence review, ICAO references (STD, RP, PANS, GM), and Priority PQ identification.",
      contentFr:
        "Introduction à la méthodologie des Questions de Protocole adaptée de l'édition 2024 USOAP CMA de l'OACI (851 QP sur 8 domaines d'audit). Accent sur les QP pertinentes pour les SNA couvrant sept domaines SNA : ATM, PANS-OPS, AIS/AIM, Cartes Aéronautiques, CNS, MET et SAR. Structure des QP incluant les orientations pour la revue des preuves, références OACI (STD, RP, PANS, GM) et identification des QP Prioritaires.",
      relatedPQs: [
        "ANS-1.001",
        "ANS-2.001",
        "ANS-3.001",
        "ANS-4.001",
        "ANS-5.001",
        "ANS-6.001",
        "ANS-7.001",
        "ANS-8.001",
      ],
      relatedStudyAreas: [],
      sortOrder: 4,
    },
    {
      titleEn: "Alignment with ICAO Critical Elements (CE-1 to CE-8)",
      titleFr: "Alignement avec les Éléments Critiques de l'OACI (EC-1 à EC-8)",
      contentEn:
        "Mapping of peer review activities to the 8 ICAO Critical Elements: CE-1 Primary Aviation Legislation, CE-2 Specific Operating Regulations, CE-3 State System and Safety Oversight Functions, CE-4 Technical Personnel Qualifications, CE-5 Technical Guidance and Tools, CE-6 Licensing/Certification Obligations, CE-7 Surveillance Obligations, and CE-8 Resolution of Safety Concerns. Understanding how peer reviews support State Effective Implementation (EI) scores.",
      contentFr:
        "Correspondance des activités d'évaluation par les pairs avec les 8 Éléments Critiques de l'OACI : EC-1 Législation Aéronautique Primaire, EC-2 Réglementations Opérationnelles Spécifiques, EC-3 Système de l'État et Fonctions de Supervision de la Sécurité, EC-4 Qualifications du Personnel Technique, EC-5 Orientations Techniques et Outils, EC-6 Obligations de Licence/Certification, EC-7 Obligations de Surveillance et EC-8 Résolution des Préoccupations de Sécurité. Compréhension de la façon dont les évaluations par les pairs soutiennent les scores de Mise en Œuvre Effective (EI) des États.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 5,
    },
  ],
  resources: [
    {
      titleEn:
        "ICAO Doc 9735 — Safety Oversight Audit Programme CMA Manual (5th Edition)",
      titleFr:
        "OACI Doc 9735 — Manuel du Programme d'Évaluation de la Supervision de la Sécurité CMA (5e Édition)",
      resourceType: "EXTERNAL_LINK" as ResourceType,
      url: "https://store.icao.int/en/universal-safety-oversight-audit-programme-continuous-monitoring-manual-doc-9735",
      fileUrl: null,
      sortOrder: 0,
    },
    {
      titleEn: "Peer Review Operational Phases Checklist",
      titleFr:
        "Liste de Vérification des Phases Opérationnelles de l'Évaluation par les Pairs",
      resourceType: "CHECKLIST" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 1,
    },
    {
      titleEn: "ICAO Eight Critical Elements Reference Card",
      titleFr:
        "Fiche de Référence des Huit Éléments Critiques de l'OACI",
      resourceType: "DOCUMENT" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 2,
    },
    {
      titleEn: "ANS Protocol Questions Sample Set (USOAP CMA 2024)",
      titleFr:
        "Ensemble d'Échantillons de Questions de Protocole SNA (USOAP CMA 2024)",
      resourceType: "TEMPLATE" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 3,
    },
  ],
};

// =============================================================================
// MODULE 3 — CONDUCTING AND FOLLOWING UP ON PEER REVIEWS
// =============================================================================

const MODULE_3: ModuleData = {
  moduleNumber: 3,
  code: "M3",
  titleEn: "Conducting and Following Up on Peer Reviews",
  titleFr: "Conduite et Suivi des Évaluations par les Pairs",
  descriptionEn:
    "Review methodology, Protocol Question application, evidence-based assessment techniques, interview skills, findings documentation, corrective action plan development, and case studies from AFI peer review activities.",
  descriptionFr:
    "Méthodologie de revue, application des Questions de Protocole, techniques d'évaluation basées sur les preuves, compétences d'entretien, documentation des constatations, élaboration de plans d'actions correctives et études de cas des activités d'évaluation par les pairs AFI.",
  objectivesEn: [
    "Verify that peer review team members meet competency requirements and are appropriately assigned to audit domains based on their expertise",
    "Apply evidence-based assessment methodology using Protocol Questions to determine Satisfactory/Not Satisfactory status with documented justification",
    "Demonstrate effective interview techniques that respect just culture principles while obtaining accurate information about ANSP operations",
    "Draft finding statements that are clear, objective, evidence-based, and correctly classified according to the four-tier categorization system",
    "Evaluate Corrective Action Plans for completeness, feasibility, and alignment with ICAO Doc 9735 guidance",
  ],
  objectivesFr: [
    "Vérifier que les membres de l'équipe d'évaluation répondent aux exigences de compétence et sont assignés de manière appropriée aux domaines d'audit selon leur expertise",
    "Appliquer la méthodologie d'évaluation basée sur les preuves utilisant les Questions de Protocole pour déterminer le statut Satisfaisant/Non Satisfaisant avec justification documentée",
    "Démontrer des techniques d'entretien efficaces qui respectent les principes de culture juste tout en obtenant des informations précises sur les opérations ANSP",
    "Rédiger des énoncés de constatations clairs, objectifs, basés sur les preuves et correctement classifiés selon le système de catégorisation à quatre niveaux",
    "Évaluer les Plans d'Actions Correctives pour leur exhaustivité, faisabilité et alignement avec les orientations du Doc 9735 de l'OACI",
  ],
  iconName: "ClipboardCheck",
  sortOrder: 3,
  topics: [
    {
      titleEn: "Review Team Roles and Competency Requirements",
      titleFr: "Rôles de l'Équipe d'Évaluation et Exigences de Compétence",
      contentEn:
        "Detailed examination of Peer Review Team Member qualifications: university degree (preferably aviation-related), minimum 5 years ANSP experience as engineer, ATCO, ATSEP, inspector or auditor, and expertise in at least one audit domain (ATM, MET, AIM, CNS, SAR, SMS). Team leader responsibilities, subject matter expert assignments, and coordination team interface.",
      contentFr:
        "Examen détaillé des qualifications des Membres de l'Équipe d'Évaluation par les Pairs : diplôme universitaire (de préférence lié à l'aviation), minimum 5 ans d'expérience ANSP en tant qu'ingénieur, ATCO, ATSEP, inspecteur ou auditeur, et expertise dans au moins un domaine d'audit (ATM, MET, AIM, CNS, SAR, SGS). Responsabilités du chef d'équipe, affectations d'experts en la matière et interface avec l'équipe de coordination.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 0,
    },
    {
      titleEn: "Review Methodology and Evidence-Based Assessment",
      titleFr:
        "Méthodologie d'Évaluation et Évaluation Basée sur les Preuves",
      contentEn:
        "Application of USOAP CMA-aligned review methodology: systematic Protocol Question assessment, evidence collection standards (documents, records, interviews, observations), verification of implementation versus documentation, sampling techniques, and triangulation of evidence sources. Understanding Satisfactory/Not Satisfactory determination criteria.",
      contentFr:
        "Application de la méthodologie d'évaluation alignée sur USOAP CMA : évaluation systématique des Questions de Protocole, normes de collecte des preuves (documents, registres, entretiens, observations), vérification de la mise en œuvre versus documentation, techniques d'échantillonnage et triangulation des sources de preuves. Compréhension des critères de détermination Satisfaisant/Non Satisfaisant.",
      relatedPQs: ["ANS-1.001", "ANS-2.001", "ANS-8.001"],
      relatedStudyAreas: [],
      sortOrder: 1,
    },
    {
      titleEn: "Interview Techniques and Human Factors Considerations",
      titleFr:
        "Techniques d'Entretien et Considérations des Facteurs Humains",
      contentEn:
        "Effective interview strategies for peer reviews: preparation and question design, establishing rapport in a non-threatening environment, active listening techniques, probing for clarification, handling difficult conversations, cultural sensitivity in the AFI context, and documentation of interview findings. Recognition of just culture principles.",
      contentFr:
        "Stratégies d'entretien efficaces pour les évaluations par les pairs : préparation et conception des questions, établissement du rapport dans un environnement non menaçant, techniques d'écoute active, approfondissement pour clarification, gestion des conversations difficiles, sensibilité culturelle dans le contexte AFI et documentation des constatations d'entretien. Reconnaissance des principes de culture juste.",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_4_1" as CANSOStudyArea,
        "SA_4_2" as CANSOStudyArea,
      ],
      sortOrder: 2,
    },
    {
      titleEn: "Documenting and Classifying Findings",
      titleFr: "Documentation et Classification des Constatations",
      contentEn:
        "Comprehensive training on findings documentation: writing clear, objective, and evidence-based finding statements. Proper classification using the four-tier system — Non-Conformity requiring immediate action, Observation indicating potential for improvement, Recommendation for enhancement opportunities, and Good Practice for recognition of excellence. Linking findings to specific Protocol Questions and ICAO SARPs.",
      contentFr:
        "Formation complète sur la documentation des constatations : rédaction d'énoncés de constatations clairs, objectifs et basés sur les preuves. Classification appropriée utilisant le système à quatre niveaux — Non-Conformité nécessitant une action immédiate, Observation indiquant un potentiel d'amélioration, Recommandation pour des opportunités d'amélioration, et Bonne Pratique pour la reconnaissance de l'excellence. Liaison des constatations aux Questions de Protocole spécifiques et SARP de l'OACI.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 3,
    },
    {
      titleEn: "Corrective Action Plan Development and Monitoring",
      titleFr: "Élaboration et Suivi du Plan d'Actions Correctives",
      contentEn:
        "Framework for CAP development following ICAO Doc 9735 Appendix E guidance: root cause analysis requirements, SMART action formulation (Specific, Measurable, Achievable, Relevant, Time-bound), implementation timeline establishment, responsible party assignment, progress monitoring mechanisms, and Coordination Team review protocols.",
      contentFr:
        "Cadre pour l'élaboration du PAC suivant les orientations de l'Annexe E du Doc 9735 de l'OACI : exigences d'analyse des causes profondes, formulation d'actions SMART (Spécifique, Mesurable, Atteignable, Pertinent, Limité dans le Temps), établissement du calendrier de mise en œuvre, assignation des parties responsables, mécanismes de suivi des progrès et protocoles de revue de l'Équipe de Coordination.",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_3_3" as CANSOStudyArea,
      ],
      sortOrder: 4,
    },
    {
      titleEn: "Case Studies: Representative Findings and Resolutions",
      titleFr: "Études de Cas : Constatations Représentatives et Résolutions",
      contentEn:
        "Analysis of anonymized case studies from AFI peer reviews and ICAO USOAP activities demonstrating: typical SMS implementation gaps, ATS procedural deficiencies, CNS maintenance oversight issues, MET service delivery challenges, and successful corrective action implementations. Discussion of lessons learned from early cross-review exercises.",
      contentFr:
        "Analyse d'études de cas anonymisées provenant des évaluations par les pairs AFI et des activités USOAP de l'OACI démontrant : lacunes typiques de mise en œuvre du SGS, déficiences procédurales ATS, problèmes de supervision de la maintenance CNS, défis de prestation de services MET et mises en œuvre réussies d'actions correctives. Discussion des leçons apprises des premiers exercices d'évaluations croisées.",
      relatedPQs: ["ANS-3.001", "ANS-5.001", "ANS-7.001"],
      relatedStudyAreas: [
        "SA_2_1" as CANSOStudyArea,
        "SA_2_2" as CANSOStudyArea,
        "SA_3_1" as CANSOStudyArea,
      ],
      sortOrder: 5,
    },
  ],
  resources: [
    {
      titleEn: "Peer Reviewer Competency Standards Matrix",
      titleFr: "Matrice des Normes de Compétence des Évaluateurs Pairs",
      resourceType: "DOCUMENT" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 0,
    },
    {
      titleEn: "Evidence Collection and Documentation Template",
      titleFr: "Modèle de Collecte et Documentation des Preuves",
      resourceType: "TEMPLATE" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 1,
    },
    {
      titleEn: "Findings Classification Guide with Examples",
      titleFr: "Guide de Classification des Constatations avec Exemples",
      resourceType: "DOCUMENT" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 2,
    },
    {
      titleEn: "Corrective Action Plan Template (ICAO Format)",
      titleFr: "Modèle de Plan d'Actions Correctives (Format OACI)",
      resourceType: "TEMPLATE" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 3,
    },
  ],
};

// =============================================================================
// MODULE 4 — ASSESSING SMS MATURITY
// =============================================================================

const MODULE_4: ModuleData = {
  moduleNumber: 4,
  code: "M4",
  titleEn: "Assessing Safety Management System Maturity",
  titleFr: "Évaluation de la Maturité du Système de Gestion de la Sécurité",
  descriptionEn:
    "CANSO Standard of Excellence (SoE) SMS Maturity Assessment Framework covering the five maturity levels (A through E), the four SMS components and twelve elements per ICAO Annex 19, safety culture assessment, and the SEANS-Safety programme recognized by the ICAO Assembly.",
  descriptionFr:
    "Cadre d'Évaluation de la Maturité SGS du Standard d'Excellence (SoE) de CANSO couvrant les cinq niveaux de maturité (A à E), les quatre composantes du SGS et douze éléments selon l'Annexe 19 de l'OACI, l'évaluation de la culture de sécurité, et le programme SEANS-Safety reconnu par l'Assemblée de l'OACI.",
  objectivesEn: [
    "Describe the ICAO Annex 19 SMS framework including its four components and twelve elements as they apply to ANSPs",
    "Differentiate between the five CANSO SoE maturity levels (A through E) and identify the observable indicators for each level",
    "Apply maturity level descriptors to assess an ANSP's SMS implementation status, distinguishing between ICAO compliance (Level C) and enhanced performance levels",
    "Evaluate safety culture indicators including just culture implementation, reporting climate, and management commitment as foundational elements of SMS effectiveness",
    "Explain the relationship between ANSP SMS implementation, State Safety Programme requirements, and regional safety performance improvement under the AFI Plan framework",
  ],
  objectivesFr: [
    "Décrire le cadre SGS de l'Annexe 19 de l'OACI incluant ses quatre composantes et douze éléments tels qu'ils s'appliquent aux ANSP",
    "Différencier les cinq niveaux de maturité SoE de CANSO (A à E) et identifier les indicateurs observables pour chaque niveau",
    "Appliquer les descripteurs de niveau de maturité pour évaluer le statut de mise en œuvre du SGS d'un ANSP, en distinguant la conformité OACI (Niveau C) et les niveaux de performance améliorés",
    "Évaluer les indicateurs de culture de sécurité incluant la mise en œuvre de la culture juste, le climat de signalement et l'engagement de la direction comme éléments fondamentaux de l'efficacité du SGS",
    "Expliquer la relation entre la mise en œuvre du SGS des ANSP, les exigences du Programme de Sécurité de l'État et l'amélioration de la performance de sécurité régionale dans le cadre du Plan AFI",
  ],
  iconName: "Shield",
  sortOrder: 4,
  topics: [
    {
      titleEn: "ICAO Annex 19 SMS Framework for ANSPs",
      titleFr: "Cadre SGS de l'Annexe 19 de l'OACI pour les ANSP",
      contentEn:
        "Comprehensive overview of ICAO Annex 19 (Safety Management) Second Edition requirements applicable to Air Navigation Service Providers. Detailed examination of the four components and twelve elements: Safety Policy and Objectives (1.1–1.5), Safety Risk Management (2.1–2.2), Safety Assurance (3.1–3.3), and Safety Promotion (4.1–4.2). Integration with State Safety Programme (SSP) requirements.",
      contentFr:
        "Aperçu complet des exigences de la Deuxième Édition de l'Annexe 19 de l'OACI (Gestion de la Sécurité) applicables aux Fournisseurs de Services de Navigation Aérienne. Examen détaillé des quatre composantes et douze éléments : Politique et Objectifs de Sécurité (1.1–1.5), Gestion des Risques de Sécurité (2.1–2.2), Assurance de la Sécurité (3.1–3.3) et Promotion de la Sécurité (4.1–4.2). Intégration avec les exigences du Programme de Sécurité de l'État (PSE).",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_1_1" as CANSOStudyArea,
        "SA_1_2" as CANSOStudyArea,
        "SA_1_3" as CANSOStudyArea,
        "SA_1_4" as CANSOStudyArea,
        "SA_1_5" as CANSOStudyArea,
      ],
      sortOrder: 0,
    },
    {
      titleEn: "CANSO Standard of Excellence Framework",
      titleFr: "Cadre du Standard d'Excellence de CANSO",
      contentEn:
        "Overview of the CANSO Standard of Excellence in Safety Management Systems (2024 Edition) developed in collaboration with EUROCONTROL. Understanding how the SoE extends beyond Annex 19 minimum requirements to include Safety Culture as a system enabler, six components addressing sixteen elements, and the 13-study-area questionnaire structure used in the annual measurement programme.",
      contentFr:
        "Aperçu du Standard d'Excellence de CANSO en Systèmes de Gestion de la Sécurité (Édition 2024) développé en collaboration avec EUROCONTROL. Compréhension de la façon dont le SoE va au-delà des exigences minimales de l'Annexe 19 pour inclure la Culture de Sécurité comme facilitateur du système, six composantes traitant seize éléments, et la structure du questionnaire à 13 domaines d'étude utilisée dans le programme de mesure annuel.",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_1_1" as CANSOStudyArea,
        "SA_2_1" as CANSOStudyArea,
        "SA_3_1" as CANSOStudyArea,
        "SA_4_1" as CANSOStudyArea,
      ],
      sortOrder: 1,
    },
    {
      titleEn: "SMS Maturity Levels A through E",
      titleFr: "Niveaux de Maturité SGS de A à E",
      contentEn:
        "Detailed examination of the five CANSO SoE maturity levels: Level A (Informal Arrangements) — ad hoc processes dependent on individuals; Level B (Defined) — processes documented but not fully implemented; Level C (Managed) — compliance with ICAO Annex 19, processes producing consistent results; Level D (Assured) — quantitatively managed with measured positive results; Level E (Optimised) — international best practice with continuous improvement demonstrated. Achievement of Level C represents the ICAO compliance baseline.",
      contentFr:
        "Examen détaillé des cinq niveaux de maturité SoE de CANSO : Niveau A (Arrangements Informels) — processus ad hoc dépendant des individus ; Niveau B (Défini) — processus documentés mais pas entièrement mis en œuvre ; Niveau C (Géré) — conformité avec l'Annexe 19 de l'OACI, processus produisant des résultats cohérents ; Niveau D (Assuré) — géré quantitativement avec des résultats positifs mesurés ; Niveau E (Optimisé) — meilleures pratiques internationales avec amélioration continue démontrée. L'atteinte du Niveau C représente le niveau de base de conformité OACI.",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_1_1" as CANSOStudyArea,
        "SA_2_1" as CANSOStudyArea,
        "SA_2_2" as CANSOStudyArea,
        "SA_3_1" as CANSOStudyArea,
      ],
      sortOrder: 2,
    },
    {
      titleEn: "Applying Maturity Level Descriptors in Assessment",
      titleFr:
        "Application des Descripteurs de Niveau de Maturité dans l'Évaluation",
      contentEn:
        "Practical application of maturity level descriptors across SMS components: evaluating safety policy implementation maturity, assessing risk management process development, measuring safety assurance effectiveness, and gauging safety promotion activities. Understanding italicized elements that reflect mandatory Annex 19 requirements versus enhanced SoE elements. Calibrating assessor judgments across organizational contexts.",
      contentFr:
        "Application pratique des descripteurs de niveau de maturité à travers les composantes du SGS : évaluation de la maturité de mise en œuvre de la politique de sécurité, évaluation du développement du processus de gestion des risques, mesure de l'efficacité de l'assurance de la sécurité et évaluation des activités de promotion de la sécurité. Compréhension des éléments en italique reflétant les exigences obligatoires de l'Annexe 19 versus les éléments SoE améliorés. Calibrage des jugements des évaluateurs selon les contextes organisationnels.",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_1_1" as CANSOStudyArea,
        "SA_1_2" as CANSOStudyArea,
        "SA_2_1" as CANSOStudyArea,
        "SA_2_2" as CANSOStudyArea,
        "SA_3_1" as CANSOStudyArea,
        "SA_3_2" as CANSOStudyArea,
        "SA_3_3" as CANSOStudyArea,
        "SA_4_1" as CANSOStudyArea,
        "SA_4_2" as CANSOStudyArea,
      ],
      sortOrder: 3,
    },
    {
      titleEn: "Safety Culture Assessment Within SMS Evaluation",
      titleFr:
        "Évaluation de la Culture de Sécurité dans l'Évaluation du SGS",
      contentEn:
        "Assessment of Safety Culture as the SoE system enabler: evaluating management leadership and visible commitment, just culture climate for reporting and investigation (Element 1.1 alignment), regular safety culture measurement programmes, and improvement action tracking. Introduction to the CANSO Safety Culture Dashboard and EUROCONTROL Safety Maturity Survey Framework.",
      contentFr:
        "Évaluation de la Culture de Sécurité comme facilitateur du système SoE : évaluation du leadership de la direction et de l'engagement visible, climat de culture juste pour le signalement et l'investigation (alignement avec l'Élément 1.1), programmes réguliers de mesure de la culture de sécurité et suivi des actions d'amélioration. Introduction au Tableau de Bord de la Culture de Sécurité de CANSO et au Cadre d'Enquête sur la Maturité de la Sécurité d'EUROCONTROL.",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_1_1" as CANSOStudyArea,
        "SA_4_1" as CANSOStudyArea,
        "SA_4_2" as CANSOStudyArea,
      ],
      sortOrder: 4,
    },
    {
      titleEn: "SEANS-Safety Programme and Best Practice Recognition",
      titleFr:
        "Programme SEANS-Safety et Reconnaissance des Meilleures Pratiques",
      contentEn:
        "Introduction to CANSO's Standard of Excellence in Air Navigation Services — Safety (SEANS-Safety) programme recognized by the ICAO 39th Assembly. Understanding how SEANS-Safety provides objective third-party assessment beyond self-assessment. Best practice recognition process for ANSPs achieving Level D across study areas, including submission requirements and the SKYbrary best-practices repository.",
      contentFr:
        "Introduction au programme Standard d'Excellence dans les Services de Navigation Aérienne — Sécurité (SEANS-Safety) de CANSO reconnu par la 39e Assemblée de l'OACI. Compréhension de la façon dont SEANS-Safety fournit une évaluation objective par un tiers au-delà de l'auto-évaluation. Processus de reconnaissance des meilleures pratiques pour les ANSP atteignant le Niveau D dans tous les domaines d'étude, incluant les exigences de soumission et le référentiel SKYbrary des meilleures pratiques.",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_3_3" as CANSOStudyArea,
      ],
      sortOrder: 5,
    },
  ],
  resources: [
    {
      titleEn: "ICAO Doc 9859 — Safety Management Manual (4th Edition)",
      titleFr:
        "OACI Doc 9859 — Manuel de Gestion de la Sécurité (4e Édition)",
      resourceType: "EXTERNAL_LINK" as ResourceType,
      url: "https://store.icao.int/en/safety-management-manual-smm-doc-9859",
      fileUrl: null,
      sortOrder: 0,
    },
    {
      titleEn:
        "CANSO Standard of Excellence in SMS (2024 Edition)",
      titleFr:
        "Standard d'Excellence de CANSO en SGS (Édition 2024)",
      resourceType: "EXTERNAL_LINK" as ResourceType,
      url: "https://canso.org/publication/canso-standard-of-excellence-in-safety-management-systems-2024-edition/",
      fileUrl: null,
      sortOrder: 1,
    },
    {
      titleEn: "SMS Maturity Assessment Worksheet",
      titleFr: "Feuille de Travail d'Évaluation de la Maturité du SGS",
      resourceType: "TEMPLATE" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 2,
    },
    {
      titleEn: "ICAO Annex 19 SMS Framework Quick Reference Guide",
      titleFr:
        "Guide de Référence Rapide du Cadre SGS de l'Annexe 19 de l'OACI",
      resourceType: "DOCUMENT" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 3,
    },
  ],
};

// =============================================================================
// MODULE 5 — PRACTICAL EXERCISES
// =============================================================================

const MODULE_5: ModuleData = {
  moduleNumber: 5,
  code: "M5",
  titleEn: "Practical Exercises",
  titleFr: "Exercices Pratiques",
  descriptionEn:
    "Hands-on activities to reinforce understanding of the peer review process and tools. Participants form simulated review teams to conduct document analysis, interviews, findings drafting, SMS maturity assessment, and closing meeting presentations using the AAPRP platform.",
  descriptionFr:
    "Activités pratiques pour renforcer la compréhension du processus de revue par les pairs et des outils. Les participants forment des équipes de revue simulées pour conduire l'analyse documentaire, les entretiens, la rédaction de constatations, l'évaluation de la maturité du SGS et les présentations de réunion de clôture en utilisant la plateforme AAPRP.",
  objectivesEn: [
    "Conduct systematic document review of ANSP SMS documentation, identifying compliance evidence and areas requiring investigation using Protocol Questions",
    "Perform interviews using effective questioning techniques while maintaining professional demeanor and respecting just culture principles",
    "Draft peer review findings that are clear, accurate, evidence-based, and correctly classified with appropriate recommendations",
    "Apply CANSO SoE maturity level descriptors to assess SMS implementation across all framework components with documented justification",
    "Deliver professional closing meeting presentations that communicate findings, recommendations, and next steps to reviewed ANSP leadership",
  ],
  objectivesFr: [
    "Conduire une revue documentaire systématique de la documentation SGS des ANSP, identifiant les preuves de conformité et les domaines nécessitant une investigation avec les Questions de Protocole",
    "Réaliser des entretiens utilisant des techniques de questionnement efficaces tout en maintenant un comportement professionnel et en respectant les principes de culture juste",
    "Rédiger des constatations d'évaluation par les pairs claires, précises, basées sur les preuves et correctement classifiées avec des recommandations appropriées",
    "Appliquer les descripteurs de niveau de maturité SoE de CANSO pour évaluer la mise en œuvre du SGS à travers toutes les composantes du cadre avec justification documentée",
    "Présenter des réunions de clôture professionnelles communiquant les constatations, recommandations et prochaines étapes à la direction de l'ANSP évalué",
  ],
  iconName: "FlaskConical",
  sortOrder: 5,
  topics: [
    {
      titleEn: "Exercise Briefing and Team Formation",
      titleFr: "Briefing des Exercices et Formation des Équipes",
      contentEn:
        "Introduction to practical exercise objectives aligned with ICAO TRAINAIR PLUS competency-based assessment methodology. Formation of peer review teams ensuring diversity of expertise (ATM, CNS, MET, SMS domains) and ANSP representation. Assignment of team leader and subject matter expert roles. Distribution of exercise materials and establishment of exercise ground rules.",
      contentFr:
        "Introduction aux objectifs des exercices pratiques alignés sur la méthodologie d'évaluation basée sur les compétences TRAINAIR PLUS de l'OACI. Formation des équipes d'évaluation par les pairs assurant la diversité de l'expertise (domaines ATM, CNS, MET, SGS) et la représentation des ANSP. Assignation des rôles de chef d'équipe et d'expert en la matière. Distribution des matériels d'exercice et établissement des règles de base.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 0,
    },
    {
      titleEn: "Exercise 1: Document Review and Pre-Visit Assessment",
      titleFr: "Exercice 1 : Revue Documentaire et Évaluation Pré-Visite",
      contentEn:
        "Teams analyze a simulated ANSP documentation package including: SMS Manual excerpts, organizational charts, safety policy statements, hazard logs, risk assessments, safety performance indicators, and training records. Teams identify initial compliance indicators, potential areas of concern, and develop interview questions for the simulated on-site review.",
      contentFr:
        "Les équipes analysent un dossier de documentation ANSP simulé incluant : extraits du Manuel SGS, organigrammes, déclarations de politique de sécurité, registres de dangers, évaluations des risques, indicateurs de performance de sécurité et dossiers de formation. Les équipes identifient les indicateurs initiaux de conformité, les domaines potentiels de préoccupation et développent des questions d'entretien pour l'évaluation simulée sur site.",
      relatedPQs: ["ANS-1.001", "ANS-2.001", "ANS-3.001"],
      relatedStudyAreas: [
        "SA_1_1" as CANSOStudyArea,
        "SA_1_5" as CANSOStudyArea,
        "SA_2_1" as CANSOStudyArea,
      ],
      sortOrder: 1,
    },
    {
      titleEn: "Exercise 2: Simulated Interview Role-Play",
      titleFr: "Exercice 2 : Jeu de Rôle d'Entretien Simulé",
      contentEn:
        "Interactive role-play exercise where teams conduct interviews with facilitators acting as ANSP personnel (Safety Manager, ATCO supervisor, ATSEP technician, operations manager). Practice of effective questioning techniques, active listening, evidence verification, and documentation of responses. Debriefing on interview effectiveness and just culture application.",
      contentFr:
        "Exercice interactif de jeu de rôle où les équipes conduisent des entretiens avec des facilitateurs jouant le rôle du personnel ANSP (Responsable Sécurité, superviseur ATCO, technicien ATSEP, responsable des opérations). Pratique des techniques de questionnement efficaces, d'écoute active, de vérification des preuves et de documentation des réponses. Débriefing sur l'efficacité des entretiens et l'application de la culture juste.",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_4_1" as CANSOStudyArea,
        "SA_4_2" as CANSOStudyArea,
      ],
      sortOrder: 2,
    },
    {
      titleEn: "Exercise 3: Findings Drafting and Classification",
      titleFr: "Exercice 3 : Rédaction et Classification des Constatations",
      contentEn:
        "Based on evidence collected from Exercises 1 and 2, teams draft formal findings using the four-tier classification system. Practice writing clear, objective, evidence-based finding statements linked to specific Protocol Questions and ICAO SARPs. Peer review of findings between teams with constructive feedback. Facilitator-led calibration session ensuring consistent classification.",
      contentFr:
        "Sur la base des preuves collectées lors des Exercices 1 et 2, les équipes rédigent des constatations formelles utilisant le système de classification à quatre niveaux. Pratique de la rédaction d'énoncés de constatations clairs, objectifs, basés sur les preuves et liés aux Questions de Protocole spécifiques et SARP de l'OACI. Revue par les pairs des constatations entre équipes avec retour constructif. Session de calibrage dirigée par le facilitateur.",
      relatedPQs: ["ANS-1.001", "ANS-5.001", "ANS-8.001"],
      relatedStudyAreas: [
        "SA_2_2" as CANSOStudyArea,
        "SA_3_1" as CANSOStudyArea,
      ],
      sortOrder: 3,
    },
    {
      titleEn: "Exercise 4: SMS Maturity Assessment",
      titleFr: "Exercice 4 : Évaluation de la Maturité du SGS",
      contentEn:
        "Teams apply CANSO SoE maturity level descriptors to assess the simulated ANSP's SMS across all four components. Determination of maturity levels (A–E) for each element with documented justification. Identification of gaps preventing achievement of Level C (ICAO compliance) and Level D (assured performance). Development of prioritized recommendations for SMS enhancement.",
      contentFr:
        "Les équipes appliquent les descripteurs de niveau de maturité SoE de CANSO pour évaluer le SGS de l'ANSP simulé à travers les quatre composantes. Détermination des niveaux de maturité (A–E) pour chaque élément avec justification documentée. Identification des lacunes empêchant l'atteinte du Niveau C (conformité OACI) et du Niveau D (performance assurée). Élaboration de recommandations priorisées pour l'amélioration du SGS.",
      relatedPQs: [],
      relatedStudyAreas: [
        "SA_1_1" as CANSOStudyArea,
        "SA_1_2" as CANSOStudyArea,
        "SA_2_1" as CANSOStudyArea,
        "SA_2_2" as CANSOStudyArea,
        "SA_3_1" as CANSOStudyArea,
        "SA_3_2" as CANSOStudyArea,
        "SA_3_3" as CANSOStudyArea,
        "SA_4_1" as CANSOStudyArea,
        "SA_4_2" as CANSOStudyArea,
      ],
      sortOrder: 4,
    },
    {
      titleEn: "Exercise 5: Closing Meeting Presentation and Debrief",
      titleFr:
        "Exercice 5 : Présentation de la Réunion de Clôture et Débriefing",
      contentEn:
        "Each team presents a simulated closing meeting briefing to reviewed ANSP leadership (role-played by other teams and facilitators). Practice of professional communication of findings, recommendations, and SMS maturity assessment results. Handling of challenging questions and objections. Comprehensive workshop debrief with participant feedback, key lessons learned, and next steps for peer review programme participation.",
      contentFr:
        "Chaque équipe présente un briefing simulé de réunion de clôture à la direction de l'ANSP évalué (joué par les autres équipes et facilitateurs). Pratique de la communication professionnelle des constatations, recommandations et résultats d'évaluation de maturité du SGS. Gestion des questions difficiles et des objections. Débriefing complet de l'atelier avec retours des participants, leçons clés apprises et prochaines étapes pour la participation au programme d'évaluation par les pairs.",
      relatedPQs: [],
      relatedStudyAreas: [],
      sortOrder: 5,
    },
  ],
  resources: [
    {
      titleEn: "Simulated ANSP Documentation Package",
      titleFr: "Dossier de Documentation ANSP Simulé",
      resourceType: "DOCUMENT" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 0,
    },
    {
      titleEn: "Interview Scenario Cards and Role-Play Instructions",
      titleFr:
        "Cartes de Scénarios d'Entretien et Instructions de Jeu de Rôle",
      resourceType: "TEMPLATE" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 1,
    },
    {
      titleEn: "Findings Documentation Form",
      titleFr: "Formulaire de Documentation des Constatations",
      resourceType: "TEMPLATE" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 2,
    },
    {
      titleEn: "SMS Maturity Assessment Scoring Sheet",
      titleFr:
        "Feuille de Notation de l'Évaluation de Maturité du SGS",
      resourceType: "CHECKLIST" as ResourceType,
      url: null,
      fileUrl: null,
      sortOrder: 3,
    },
  ],
};

// =============================================================================
// ALL MODULES
// =============================================================================

const ALL_MODULES: ModuleData[] = [
  MODULE_0,
  MODULE_1,
  MODULE_2,
  MODULE_3,
  MODULE_4,
  MODULE_5,
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║   AAPRP Comprehensive Training Modules Seed                      ║"
  );
  console.log(
    "║   6 Modules • 34 Topics • 23 Resources • EN/FR                   ║"
  );
  console.log(
    "║   Aligned with Draft Agenda – AFI Peer Reviewers' Training        ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════════╝"
  );
  console.log("");

  try {
    // -------------------------------------------------------------------------
    // Step 1: Clean existing training data (idempotent re-run)
    // -------------------------------------------------------------------------
    console.log("🧹 Cleaning existing training data...");

    const existingModules = await prisma.trainingModule.findMany({
      select: { id: true, code: true },
    });

    if (existingModules.length > 0) {
      // Delete resources first (FK constraint)
      const deletedResources = await prisma.trainingResource.deleteMany({
        where: {
          moduleId: { in: existingModules.map((m) => m.id) },
        },
      });
      console.log(`   Removed ${deletedResources.count} old resources`);

      // Delete topics (FK constraint)
      const deletedTopics = await prisma.trainingTopic.deleteMany({
        where: {
          moduleId: { in: existingModules.map((m) => m.id) },
        },
      });
      console.log(`   Removed ${deletedTopics.count} old topics`);

      // Delete modules
      const deletedModules = await prisma.trainingModule.deleteMany({
        where: {
          id: { in: existingModules.map((m) => m.id) },
        },
      });
      console.log(`   Removed ${deletedModules.count} old modules`);
    } else {
      console.log("   No existing data — fresh seed");
    }

    // -------------------------------------------------------------------------
    // Step 2: Create modules with topics and resources
    // -------------------------------------------------------------------------
    console.log("\n🎓 Seeding comprehensive training modules...\n");

    let totalTopics = 0;
    let totalResources = 0;

    for (const moduleData of ALL_MODULES) {
      const { topics, resources, ...moduleFields } = moduleData;

      // Create the module
      const createdModule = await prisma.trainingModule.create({
        data: moduleFields,
      });

      // Create topics
      for (const topic of topics) {
        await prisma.trainingTopic.create({
          data: {
            ...topic,
            moduleId: createdModule.id,
          },
        });
      }
      totalTopics += topics.length;

      // Create resources
      for (const resource of resources) {
        await prisma.trainingResource.create({
          data: {
            ...resource,
            moduleId: createdModule.id,
          },
        });
      }
      totalResources += resources.length;

      const topicCount = topics.length.toString().padStart(2, " ");
      const resCount = resources.length.toString().padStart(2, " ");
      console.log(
        `   ✅ ${moduleData.code}: ${moduleData.titleEn}`
      );
      console.log(
        `      ${topicCount} topics • ${resCount} resources`
      );
    }

    // -------------------------------------------------------------------------
    // Step 3: Summary
    // -------------------------------------------------------------------------
    console.log("");
    console.log(
      "╔════════════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║                      ✅ SEED COMPLETE                             ║"
    );
    console.log(
      "╠════════════════════════════════════════════════════════════════════╣"
    );
    console.log(
      `║  Modules:   ${ALL_MODULES.length}  (M0–M5)                                          ║`
    );
    console.log(
      `║  Topics:    ${totalTopics.toString().padStart(2, " ")} (across all modules)                              ║`
    );
    console.log(
      `║  Resources: ${totalResources.toString().padStart(2, " ")} (documents, presentations, checklists, etc.)    ║`
    );
    console.log(
      "║                                                                    ║"
    );
    console.log(
      "║  Module Breakdown:                                                 ║"
    );
    console.log(
      "║    M0  Introduction ......................... 90 min   4 topics    ║"
    );
    console.log(
      "║    M1  Programme Overview .................. 150 min   6 topics    ║"
    );
    console.log(
      "║    M2  Key Principles & Operational Phases . 180 min   6 topics    ║"
    );
    console.log(
      "║    M3  Conducting & Following Up Reviews ... 210 min   6 topics    ║"
    );
    console.log(
      "║    M4  SMS Maturity Assessment ............. 240 min   6 topics    ║"
    );
    console.log(
      "║    M5  Practical Exercises ................. 300 min   6 topics    ║"
    );
    console.log(
      "║                                           ─────────  ──────────    ║"
    );
    console.log(
      "║                                 Total:    19.5 hours  34 topics    ║"
    );
    console.log(
      "║                                                                    ║"
    );
    console.log(
      "║  Verify: npx prisma studio → training_modules table               ║"
    );
    console.log(
      "║  Test:   Navigate to /en/training or /fr/training                  ║"
    );
    console.log(
      "╚════════════════════════════════════════════════════════════════════╝"
    );
    console.log("");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
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
