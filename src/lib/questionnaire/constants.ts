import type {
  USOAPAuditArea,
  CriticalElement,
  SMSComponent,
  CANSOStudyArea,
  MaturityLevel,
  TransversalArea,
  ICAOReferenceType,
} from "@prisma/client";
import type {
  AuditAreaMeta,
  CriticalElementMeta,
  SMSComponentMeta,
  StudyAreaMeta,
  MaturityLevelMeta,
  TransversalAreaMeta,
  ICAOReferenceTypeMeta,
} from "./types";

// =============================================================================
// USOAP CMA 2024 - AUDIT AREAS (9 areas, 851 Protocol Questions)
// =============================================================================

export const USOAP_AUDIT_AREAS: Record<USOAPAuditArea, AuditAreaMeta> = {
  LEG: {
    code: "LEG",
    name: {
      en: "Primary Aviation Legislation",
      fr: "Legislation Aeronautique Primaire",
    },
    description: {
      en: "Laws enacted by the State legislature that establish a framework for national civil aviation",
      fr: "Lois promulguees par le legislateur de l'Etat etablissant un cadre pour l'aviation civile nationale",
    },
    pqCount: 23,
    sortOrder: 1,
  },
  ORG: {
    code: "ORG",
    name: {
      en: "Civil Aviation Organization",
      fr: "Organisation de l'Aviation Civile",
    },
    description: {
      en: "Civil aviation authority structure, resources, and organizational framework",
      fr: "Structure de l'autorite de l'aviation civile, ressources et cadre organisationnel",
    },
    pqCount: 13,
    sortOrder: 2,
  },
  PEL: {
    code: "PEL",
    name: {
      en: "Personnel Licensing and Training",
      fr: "Licences du Personnel et Formation",
    },
    description: {
      en: "Licensing and certification of aviation personnel including pilots, cabin crew, and ground personnel",
      fr: "Delivrance de licences et certification du personnel aeronautique incluant pilotes, equipage de cabine et personnel au sol",
    },
    pqCount: 100,
    sortOrder: 3,
  },
  OPS: {
    code: "OPS",
    name: {
      en: "Aircraft Operations",
      fr: "Operations Aeriennes",
    },
    description: {
      en: "Certification and oversight of commercial and general aviation operations",
      fr: "Certification et surveillance des operations d'aviation commerciale et generale",
    },
    pqCount: 136,
    sortOrder: 4,
  },
  AIR: {
    code: "AIR",
    name: {
      en: "Airworthiness of Aircraft",
      fr: "Navigabilite des Aeronefs",
    },
    description: {
      en: "Certification and continued airworthiness of aircraft, engines, and equipment",
      fr: "Certification et maintien de la navigabilite des aeronefs, moteurs et equipements",
    },
    pqCount: 198,
    sortOrder: 5,
  },
  AIG: {
    code: "AIG",
    name: {
      en: "Aircraft Accident and Incident Investigation",
      fr: "Enquetes sur les Accidents et Incidents d'Aviation",
    },
    description: {
      en: "Independent investigation of aircraft accidents and serious incidents",
      fr: "Enquetes independantes sur les accidents et incidents graves d'aeronefs",
    },
    pqCount: 84,
    sortOrder: 6,
  },
  ANS: {
    code: "ANS",
    name: {
      en: "Air Navigation Services",
      fr: "Services de Navigation Aerienne",
    },
    description: {
      en: "Provision and oversight of air traffic services, communications, navigation, and surveillance",
      fr: "Fourniture et surveillance des services de la circulation aerienne, communications, navigation et surveillance",
    },
    pqCount: 128,
    sortOrder: 7,
  },
  AGA: {
    code: "AGA",
    name: {
      en: "Aerodromes and Ground Aids",
      fr: "Aerodromes et Aides au Sol",
    },
    description: {
      en: "Certification and oversight of aerodromes, heliports, and ground aids",
      fr: "Certification et surveillance des aerodromes, heliports et aides au sol",
    },
    pqCount: 153,
    sortOrder: 8,
  },
  SSP: {
    code: "SSP",
    name: {
      en: "State Safety Programme",
      fr: "Programme National de Securite",
    },
    description: {
      en: "Implementation of the State Safety Programme framework and safety performance management",
      fr: "Mise en oeuvre du cadre du Programme National de Securite et gestion des performances de securite",
    },
    pqCount: 16,
    sortOrder: 9,
  },
} as const;

// Total PQ count: 851 (verified against USOAP CMA 2024)
export const TOTAL_USOAP_PQ_COUNT = Object.values(USOAP_AUDIT_AREAS).reduce(
  (sum, area) => sum + area.pqCount,
  0
);

// =============================================================================
// CRITICAL ELEMENTS (CE-1 to CE-8)
// =============================================================================

export const CRITICAL_ELEMENTS: Record<CriticalElement, CriticalElementMeta> = {
  CE_1: {
    code: "CE_1",
    number: 1,
    name: {
      en: "Primary Aviation Legislation",
      fr: "Legislation Aeronautique Primaire",
    },
    description: {
      en: "The State has promulgated a comprehensive and effective aviation law that provides for safe, secure and sustainable development of civil aviation",
      fr: "L'Etat a promulgue une legislation aeronautique complete et efficace qui prevoit un developpement sur, securise et durable de l'aviation civile",
    },
    sortOrder: 1,
  },
  CE_2: {
    code: "CE_2",
    number: 2,
    name: {
      en: "Specific Operating Regulations",
      fr: "Reglements d'Exploitation Specifiques",
    },
    description: {
      en: "The State has adopted detailed regulations implementing ICAO Standards and Recommended Practices",
      fr: "L'Etat a adopte des reglements detailles mettant en oeuvre les normes et pratiques recommandees de l'OACI",
    },
    sortOrder: 2,
  },
  CE_3: {
    code: "CE_3",
    number: 3,
    name: {
      en: "State System and Functions",
      fr: "Systeme et Fonctions de l'Etat",
    },
    description: {
      en: "The State has established a civil aviation authority with adequate authority, resources, and procedures",
      fr: "L'Etat a etabli une autorite de l'aviation civile dotee de pouvoirs, ressources et procedures adequats",
    },
    sortOrder: 3,
  },
  CE_4: {
    code: "CE_4",
    number: 4,
    name: {
      en: "Qualified Technical Personnel",
      fr: "Personnel Technique Qualifie",
    },
    description: {
      en: "The State has established minimum requirements for the knowledge and experience of technical personnel",
      fr: "L'Etat a etabli des exigences minimales pour les connaissances et l'experience du personnel technique",
    },
    sortOrder: 4,
  },
  CE_5: {
    code: "CE_5",
    number: 5,
    name: {
      en: "Technical Guidance, Tools and Safety-Critical Information",
      fr: "Orientations Techniques, Outils et Information Critique pour la Securite",
    },
    description: {
      en: "The State has established the means to provide safety-critical information and technical guidance",
      fr: "L'Etat a etabli les moyens de fournir des informations critiques pour la securite et des orientations techniques",
    },
    sortOrder: 5,
  },
  CE_6: {
    code: "CE_6",
    number: 6,
    name: {
      en: "Licensing, Certification, Authorization and Approval",
      fr: "Licences, Certification, Autorisation et Approbation",
    },
    description: {
      en: "The State has implemented processes for issuance of licences, certificates, and approvals",
      fr: "L'Etat a mis en oeuvre des processus pour la delivrance de licences, certificats et approbations",
    },
    sortOrder: 6,
  },
  CE_7: {
    code: "CE_7",
    number: 7,
    name: {
      en: "Surveillance Obligations",
      fr: "Obligations de Surveillance",
    },
    description: {
      en: "The State has established and implemented a surveillance programme including inspections and audits",
      fr: "L'Etat a etabli et mis en oeuvre un programme de surveillance incluant inspections et audits",
    },
    sortOrder: 7,
  },
  CE_8: {
    code: "CE_8",
    number: 8,
    name: {
      en: "Resolution of Safety Issues",
      fr: "Resolution des Problemes de Securite",
    },
    description: {
      en: "The State has established procedures for resolution of identified safety deficiencies",
      fr: "L'Etat a etabli des procedures pour la resolution des deficiences de securite identifiees",
    },
    sortOrder: 8,
  },
} as const;

// =============================================================================
// SMS COMPONENTS (CANSO SoE 2024 - 4 Components with Weights)
// =============================================================================

export const SMS_COMPONENTS: Record<SMSComponent, SMSComponentMeta> = {
  SAFETY_POLICY_OBJECTIVES: {
    code: "SAFETY_POLICY_OBJECTIVES",
    number: 1,
    name: {
      en: "Safety Policy and Objectives",
      fr: "Politique et Objectifs de Securite",
    },
    description: {
      en: "Management commitment, safety accountabilities and responsibilities, appointment of key safety personnel, coordination of emergency response planning, and SMS documentation",
      fr: "Engagement de la direction, responsabilites en matiere de securite, designation du personnel cle de securite, coordination de la planification des interventions d'urgence et documentation SMS",
    },
    weight: 0.25,
    sortOrder: 1,
  },
  SAFETY_RISK_MANAGEMENT: {
    code: "SAFETY_RISK_MANAGEMENT",
    number: 2,
    name: {
      en: "Safety Risk Management",
      fr: "Gestion des Risques de Securite",
    },
    description: {
      en: "Hazard identification, safety risk assessment and mitigation processes",
      fr: "Identification des dangers, evaluation et attenuation des risques de securite",
    },
    weight: 0.3,
    sortOrder: 2,
  },
  SAFETY_ASSURANCE: {
    code: "SAFETY_ASSURANCE",
    number: 3,
    name: {
      en: "Safety Assurance",
      fr: "Assurance de la Securite",
    },
    description: {
      en: "Safety performance monitoring and measurement, management of change, and continuous improvement of the SMS",
      fr: "Surveillance et mesure des performances de securite, gestion du changement et amelioration continue du SMS",
    },
    weight: 0.25,
    sortOrder: 3,
  },
  SAFETY_PROMOTION: {
    code: "SAFETY_PROMOTION",
    number: 4,
    name: {
      en: "Safety Promotion",
      fr: "Promotion de la Securite",
    },
    description: {
      en: "Training and education, and safety communication to foster a positive safety culture",
      fr: "Formation et education, et communication sur la securite pour favoriser une culture positive de securite",
    },
    weight: 0.2,
    sortOrder: 4,
  },
} as const;

// Validate weights sum to 1.0
const SMS_WEIGHTS_SUM = Object.values(SMS_COMPONENTS).reduce(
  (sum, c) => sum + c.weight,
  0
);
if (Math.abs(SMS_WEIGHTS_SUM - 1.0) > 0.001) {
  throw new Error(
    `SMS component weights must sum to 1.0, got ${SMS_WEIGHTS_SUM}`
  );
}

// =============================================================================
// CANSO STUDY AREAS (12 Study Areas across 4 Components)
// =============================================================================

export const CANSO_STUDY_AREAS: Record<CANSOStudyArea, StudyAreaMeta> = {
  // Component 1: Safety Policy and Objectives
  SA_1_1: {
    code: "SA_1_1",
    componentNumber: 1,
    areaNumber: 1,
    name: {
      en: "Management Commitment and Responsibility",
      fr: "Engagement et Responsabilite de la Direction",
    },
    description: {
      en: "Senior management commitment to safety and allocation of resources",
      fr: "Engagement de la haute direction envers la securite et allocation des ressources",
    },
    sortOrder: 1,
  },
  SA_1_2: {
    code: "SA_1_2",
    componentNumber: 1,
    areaNumber: 2,
    name: {
      en: "Safety Accountabilities",
      fr: "Responsabilites en Matiere de Securite",
    },
    description: {
      en: "Definition and documentation of safety accountabilities throughout the organization",
      fr: "Definition et documentation des responsabilites de securite dans toute l'organisation",
    },
    sortOrder: 2,
  },
  SA_1_3: {
    code: "SA_1_3",
    componentNumber: 1,
    areaNumber: 3,
    name: {
      en: "Appointment of Key Safety Personnel",
      fr: "Designation du Personnel Cle de Securite",
    },
    description: {
      en: "Appointment of a safety manager and safety review board",
      fr: "Designation d'un responsable securite et d'un comite d'examen de la securite",
    },
    sortOrder: 3,
  },
  SA_1_4: {
    code: "SA_1_4",
    componentNumber: 1,
    areaNumber: 4,
    name: {
      en: "Coordination of Emergency Response Planning",
      fr: "Coordination de la Planification des Interventions d'Urgence",
    },
    description: {
      en: "Emergency response planning and coordination with relevant organizations",
      fr: "Planification des interventions d'urgence et coordination avec les organisations concernees",
    },
    sortOrder: 4,
  },
  SA_1_5: {
    code: "SA_1_5",
    componentNumber: 1,
    areaNumber: 5,
    name: {
      en: "SMS Documentation",
      fr: "Documentation SMS",
    },
    description: {
      en: "Development and maintenance of SMS documentation",
      fr: "Developpement et maintenance de la documentation SMS",
    },
    sortOrder: 5,
  },

  // Component 2: Safety Risk Management
  SA_2_1: {
    code: "SA_2_1",
    componentNumber: 2,
    areaNumber: 1,
    name: {
      en: "Hazard Identification",
      fr: "Identification des Dangers",
    },
    description: {
      en: "Processes to identify hazards associated with aviation activities",
      fr: "Processus pour identifier les dangers associes aux activites aeronautiques",
    },
    sortOrder: 6,
  },
  SA_2_2: {
    code: "SA_2_2",
    componentNumber: 2,
    areaNumber: 2,
    name: {
      en: "Safety Risk Assessment and Mitigation",
      fr: "Evaluation et Attenuation des Risques de Securite",
    },
    description: {
      en: "Assessment of safety risks and development of mitigation strategies",
      fr: "Evaluation des risques de securite et developpement de strategies d'attenuation",
    },
    sortOrder: 7,
  },

  // Component 3: Safety Assurance
  SA_3_1: {
    code: "SA_3_1",
    componentNumber: 3,
    areaNumber: 1,
    name: {
      en: "Safety Performance Monitoring and Measurement",
      fr: "Surveillance et Mesure des Performances de Securite",
    },
    description: {
      en: "Monitoring and measurement of safety performance indicators",
      fr: "Surveillance et mesure des indicateurs de performance de securite",
    },
    sortOrder: 8,
  },
  SA_3_2: {
    code: "SA_3_2",
    componentNumber: 3,
    areaNumber: 2,
    name: {
      en: "Management of Change",
      fr: "Gestion du Changement",
    },
    description: {
      en: "Processes to manage safety risks during organizational changes",
      fr: "Processus pour gerer les risques de securite lors des changements organisationnels",
    },
    sortOrder: 9,
  },
  SA_3_3: {
    code: "SA_3_3",
    componentNumber: 3,
    areaNumber: 3,
    name: {
      en: "Continuous Improvement of the SMS",
      fr: "Amelioration Continue du SMS",
    },
    description: {
      en: "Internal evaluation and continuous improvement of SMS effectiveness",
      fr: "Evaluation interne et amelioration continue de l'efficacite du SMS",
    },
    sortOrder: 10,
  },

  // Component 4: Safety Promotion
  SA_4_1: {
    code: "SA_4_1",
    componentNumber: 4,
    areaNumber: 1,
    name: {
      en: "Training and Education",
      fr: "Formation et Education",
    },
    description: {
      en: "Safety training programmes for all personnel",
      fr: "Programmes de formation a la securite pour tout le personnel",
    },
    sortOrder: 11,
  },
  SA_4_2: {
    code: "SA_4_2",
    componentNumber: 4,
    areaNumber: 2,
    name: {
      en: "Safety Communication",
      fr: "Communication sur la Securite",
    },
    description: {
      en: "Communication of safety-critical information throughout the organization",
      fr: "Communication des informations critiques de securite dans toute l'organisation",
    },
    sortOrder: 12,
  },
} as const;

// =============================================================================
// MATURITY LEVELS (5 Levels: A through E)
// =============================================================================

export const MATURITY_LEVELS: Record<MaturityLevel, MaturityLevelMeta> = {
  LEVEL_A: {
    code: "LEVEL_A",
    level: "A",
    name: {
      en: "Informal",
      fr: "Informel",
    },
    description: {
      en: "Processes are not agreed at organizational level. Informal or ad-hoc approaches which tend to be driven individually rather than by the organization",
      fr: "Les processus ne sont pas convenus au niveau organisationnel. Approches informelles ou ponctuelles qui tendent a etre menees individuellement plutot que par l'organisation",
    },
    score: 1,
    sortOrder: 1,
  },
  LEVEL_B: {
    code: "LEVEL_B",
    level: "B",
    name: {
      en: "Defined",
      fr: "Defini",
    },
    description: {
      en: "Processes are defined but not yet fully implemented or not yet consistently applied across the organization",
      fr: "Les processus sont definis mais pas encore pleinement mis en oeuvre ou pas encore appliques de maniere coherente dans toute l'organisation",
    },
    score: 2,
    sortOrder: 2,
  },
  LEVEL_C: {
    code: "LEVEL_C",
    level: "C",
    name: {
      en: "Managed",
      fr: "Gere",
    },
    description: {
      en: "Processes are documented and consistently applied, with evidence of compliance and active management oversight",
      fr: "Les processus sont documentes et appliques de maniere coherente, avec des preuves de conformite et une surveillance active de la direction",
    },
    score: 3,
    sortOrder: 3,
  },
  LEVEL_D: {
    code: "LEVEL_D",
    level: "D",
    name: {
      en: "Resilient",
      fr: "Resilient",
    },
    description: {
      en: "Evidence of positive, efficient results. Processes are measured, with feedback loops driving continuous improvement",
      fr: "Preuves de resultats positifs et efficaces. Les processus sont mesures, avec des boucles de retroaction favorisant l'amelioration continue",
    },
    score: 4,
    sortOrder: 4,
  },
  LEVEL_E: {
    code: "LEVEL_E",
    level: "E",
    name: {
      en: "Excellence",
      fr: "Excellence",
    },
    description: {
      en: "Sets international best practice. Organization is a recognized leader in safety management and performance",
      fr: "Etablit les meilleures pratiques internationales. L'organisation est un leader reconnu en gestion et performance de la securite",
    },
    score: 5,
    sortOrder: 5,
  },
} as const;

// =============================================================================
// TRANSVERSAL AREAS (3 Cross-Cutting Areas)
// =============================================================================

export const TRANSVERSAL_AREAS: Record<TransversalArea, TransversalAreaMeta> = {
  SPM: {
    code: "SPM",
    name: {
      en: "Safety Performance Management",
      fr: "Gestion des Performances de Securite",
    },
    description: {
      en: "Data-driven approach to monitoring and improving safety performance through indicators and targets",
      fr: "Approche basee sur les donnees pour surveiller et ameliorer les performances de securite via des indicateurs et des cibles",
    },
    sortOrder: 1,
  },
  HP: {
    code: "HP",
    name: {
      en: "Human Performance",
      fr: "Performance Humaine",
    },
    description: {
      en: "Understanding and optimizing human factors in aviation operations and safety management",
      fr: "Comprendre et optimiser les facteurs humains dans les operations aeronautiques et la gestion de la securite",
    },
    sortOrder: 2,
  },
  CI: {
    code: "CI",
    name: {
      en: "Continuous Improvement",
      fr: "Amelioration Continue",
    },
    description: {
      en: "Systematic approach to identifying and implementing improvements in safety processes and outcomes",
      fr: "Approche systematique pour identifier et mettre en oeuvre des ameliorations dans les processus et resultats de securite",
    },
    sortOrder: 3,
  },
} as const;

// =============================================================================
// ICAO REFERENCE TYPES
// =============================================================================

export const ICAO_REFERENCE_TYPES: Record<
  ICAOReferenceType,
  ICAOReferenceTypeMeta
> = {
  CC: {
    code: "CC",
    name: {
      en: "Chicago Convention",
      fr: "Convention de Chicago",
    },
    description: {
      en: "Convention on International Civil Aviation (Chicago, 1944)",
      fr: "Convention relative a l'aviation civile internationale (Chicago, 1944)",
    },
    sortOrder: 1,
  },
  STD: {
    code: "STD",
    name: {
      en: "Standard",
      fr: "Norme",
    },
    description: {
      en: "ICAO Standards from Annexes to the Chicago Convention",
      fr: "Normes de l'OACI issues des Annexes a la Convention de Chicago",
    },
    sortOrder: 2,
  },
  RP: {
    code: "RP",
    name: {
      en: "Recommended Practice",
      fr: "Pratique Recommandee",
    },
    description: {
      en: "ICAO Recommended Practices from Annexes to the Chicago Convention",
      fr: "Pratiques recommandees de l'OACI issues des Annexes a la Convention de Chicago",
    },
    sortOrder: 3,
  },
  PANS: {
    code: "PANS",
    name: {
      en: "PANS",
      fr: "PANS",
    },
    description: {
      en: "Procedures for Air Navigation Services",
      fr: "Procedures pour les services de navigation aerienne",
    },
    sortOrder: 4,
  },
  GM: {
    code: "GM",
    name: {
      en: "Guidance Material",
      fr: "Elements Indicatifs",
    },
    description: {
      en: "ICAO Guidance Material and Manuals",
      fr: "Elements indicatifs et manuels de l'OACI",
    },
    sortOrder: 5,
  },
  Cir: {
    code: "Cir",
    name: {
      en: "Circular",
      fr: "Circulaire",
    },
    description: {
      en: "ICAO Circulars providing supplementary information",
      fr: "Circulaires de l'OACI fournissant des informations supplementaires",
    },
    sortOrder: 6,
  },
  SUPPS: {
    code: "SUPPS",
    name: {
      en: "Regional Supplements",
      fr: "Supplements Regionaux",
    },
    description: {
      en: "Regional supplementary procedures (Doc 7030)",
      fr: "Procedures supplementaires regionales (Doc 7030)",
    },
    sortOrder: 7,
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get audit areas as sorted array
 */
export function getAuditAreasArray(): AuditAreaMeta[] {
  return Object.values(USOAP_AUDIT_AREAS).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get critical elements as sorted array
 */
export function getCriticalElementsArray(): CriticalElementMeta[] {
  return Object.values(CRITICAL_ELEMENTS).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get SMS components as sorted array
 */
export function getSMSComponentsArray(): SMSComponentMeta[] {
  return Object.values(SMS_COMPONENTS).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get study areas as sorted array
 */
export function getStudyAreasArray(): StudyAreaMeta[] {
  return Object.values(CANSO_STUDY_AREAS).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get study areas for a specific SMS component
 */
export function getStudyAreasByComponent(
  componentNumber: number
): StudyAreaMeta[] {
  return Object.values(CANSO_STUDY_AREAS)
    .filter((sa) => sa.componentNumber === componentNumber)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get maturity levels as sorted array
 */
export function getMaturityLevelsArray(): MaturityLevelMeta[] {
  return Object.values(MATURITY_LEVELS).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get transversal areas as sorted array
 */
export function getTransversalAreasArray(): TransversalAreaMeta[] {
  return Object.values(TRANSVERSAL_AREAS).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get ICAO reference types as sorted array
 */
export function getICAOReferenceTypesArray(): ICAOReferenceTypeMeta[] {
  return Object.values(ICAO_REFERENCE_TYPES).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Calculate maturity level from average score
 */
export function getMaturityLevelFromScore(score: number): MaturityLevel {
  if (score >= 4.5) return "LEVEL_E";
  if (score >= 3.5) return "LEVEL_D";
  if (score >= 2.5) return "LEVEL_C";
  if (score >= 1.5) return "LEVEL_B";
  return "LEVEL_A";
}

/**
 * Calculate weighted SMS score
 */
export function calculateWeightedSMSScore(
  componentScores: Record<SMSComponent, number>
): number {
  return Object.entries(componentScores).reduce((total, [component, score]) => {
    const weight = SMS_COMPONENTS[component as SMSComponent].weight;
    return total + score * weight;
  }, 0);
}

/**
 * Calculate EI (Effective Implementation) score for USOAP
 * Formula: (Satisfactory PQs / Total Applicable PQs) * 100
 */
export function calculateEIScore(
  satisfactory: number,
  totalApplicable: number
): number {
  if (totalApplicable === 0) return 0;
  return (satisfactory / totalApplicable) * 100;
}

// =============================================================================
// QUESTIONNAIRE METADATA
// =============================================================================

export const QUESTIONNAIRE_METADATA = {
  ANS_USOAP_CMA: {
    code: "ANS_USOAP_CMA",
    titleEn: "ANS Questionnaire (USOAP CMA 2024)",
    titleFr: "Questionnaire ANS (USOAP CMA 2024)",
    descriptionEn:
      "ICAO Universal Safety Oversight Audit Programme - Continuous Monitoring Approach. 851 Protocol Questions across 9 audit areas aligned with 8 Critical Elements.",
    descriptionFr:
      "Programme universel d'audit de surveillance de la securite de l'OACI - Approche de surveillance continue. 851 Questions de Protocole dans 9 domaines d'audit alignes sur 8 Elements Critiques.",
    version: "2024.1",
    totalQuestions: 851,
    auditAreas: 9,
    criticalElements: 8,
    responseType: "SATISFACTORY_NOT" as const,
    scoringMethod: "EI" as const,
  },
  SMS_CANSO_SOE: {
    code: "SMS_CANSO_SOE",
    titleEn: "SMS Questionnaire (CANSO SoE 2024)",
    titleFr: "Questionnaire SMS (CANSO SoE 2024)",
    descriptionEn:
      "CANSO Standard of Excellence in Safety Management System. Maturity-based assessment across 4 SMS components and 12 study areas.",
    descriptionFr:
      "Norme d'excellence CANSO en Systeme de Gestion de la Securite. Evaluation basee sur la maturite a travers 4 composantes SMS et 12 domaines d'etude.",
    version: "2024.1",
    totalQuestions: 48, // Approximate
    components: 4,
    studyAreas: 12,
    maturityLevels: 5,
    responseType: "MATURITY_LEVEL" as const,
    scoringMethod: "MATURITY" as const,
  },
} as const;
