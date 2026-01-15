/**
 * Scoring Constants
 *
 * Constants for ICAO USOAP CMA and CANSO SoE 2024 scoring methodologies.
 */

import type {
  MaturityLevel,
  USOAPAuditArea,
  CriticalElement,
  SMSComponent,
  CANSOStudyArea,
} from "@prisma/client";

// =============================================================================
// ICAO CRITICAL ELEMENTS
// =============================================================================

export interface CriticalElementInfo {
  code: CriticalElement;
  name: string;
  nameEn: string;
  nameFr: string;
  description?: string;
}

export const CRITICAL_ELEMENTS: Record<CriticalElement, CriticalElementInfo> = {
  CE_1: {
    code: "CE_1",
    name: "Primary Aviation Legislation",
    nameEn: "Primary Aviation Legislation",
    nameFr: "Législation aéronautique de base",
    description:
      "The provision of a comprehensive and effective aviation law consistent with the environment and complexity of the State's aviation activity",
  },
  CE_2: {
    code: "CE_2",
    name: "Specific Operating Regulations",
    nameEn: "Specific Operating Regulations",
    nameFr: "Règlements d'exploitation spécifiques",
    description:
      "The provision of adequate regulations to address national requirements emanating from the primary aviation legislation",
  },
  CE_3: {
    code: "CE_3",
    name: "State Civil Aviation System",
    nameEn: "State Civil Aviation System and Safety Oversight Functions",
    nameFr: "Système d'aviation civile de l'État",
    description:
      "The establishment of a state aviation system with appropriate organizational structure and qualified technical personnel",
  },
  CE_4: {
    code: "CE_4",
    name: "Technical Personnel Qualification",
    nameEn: "Technical Personnel Qualification and Training",
    nameFr: "Qualification du personnel technique",
    description:
      "The availability of adequate and qualified technical personnel for the performance of state safety oversight functions",
  },
  CE_5: {
    code: "CE_5",
    name: "Technical Guidance, Tools, Provision of Safety-Critical Information",
    nameEn:
      "Technical Guidance, Tools and Provision of Safety-Critical Information",
    nameFr: "Orientations techniques et informations critiques",
    description:
      "The provision of technical guidance, tools, and safety-critical information to the aviation industry",
  },
  CE_6: {
    code: "CE_6",
    name: "Licensing, Certification, Authorization",
    nameEn: "Licensing, Certification, Authorization and Approval Obligations",
    nameFr: "Licences, certification et autorisation",
    description:
      "The implementation of processes to ensure personnel and organizations meet established requirements",
  },
  CE_7: {
    code: "CE_7",
    name: "Surveillance Obligations",
    nameEn: "Surveillance Obligations",
    nameFr: "Obligations de surveillance",
    description:
      "The implementation of processes such as inspections, audits, and monitoring activities",
  },
  CE_8: {
    code: "CE_8",
    name: "Resolution of Safety Issues",
    nameEn: "Resolution of Safety Issues",
    nameFr: "Résolution des problèmes de sécurité",
    description:
      "The implementation of processes to resolve identified safety issues including enforcement measures",
  },
} as const;

// =============================================================================
// USOAP AUDIT AREAS
// =============================================================================

export interface AuditAreaInfo {
  code: USOAPAuditArea;
  name: string;
  nameEn: string;
  nameFr: string;
  description?: string;
  pqCount?: number;
}

export const AUDIT_AREAS: Record<USOAPAuditArea, AuditAreaInfo> = {
  LEG: {
    code: "LEG",
    name: "Primary Aviation Legislation",
    nameEn: "Primary Aviation Legislation",
    nameFr: "Législation aéronautique de base",
    description:
      "Legislation that provides the foundation for safety oversight",
    pqCount: 23,
  },
  ORG: {
    code: "ORG",
    name: "Civil Aviation Organization",
    nameEn: "Civil Aviation Organization",
    nameFr: "Organisation de l'aviation civile",
    description:
      "Establishment of a civil aviation authority with adequate staffing and resources",
    pqCount: 13,
  },
  PEL: {
    code: "PEL",
    name: "Personnel Licensing and Training",
    nameEn: "Personnel Licensing and Training",
    nameFr: "Licences du personnel et formation",
    description: "Licensing and certification of aviation personnel",
    pqCount: 100,
  },
  OPS: {
    code: "OPS",
    name: "Aircraft Operations",
    nameEn: "Aircraft Operations",
    nameFr: "Exploitation des aéronefs",
    description: "Operational requirements for aircraft operators",
    pqCount: 136,
  },
  AIR: {
    code: "AIR",
    name: "Airworthiness of Aircraft",
    nameEn: "Airworthiness of Aircraft",
    nameFr: "Navigabilité des aéronefs",
    description: "Certification and continuing airworthiness of aircraft",
    pqCount: 198,
  },
  AIG: {
    code: "AIG",
    name: "Aircraft Accident and Incident Investigation",
    nameEn: "Aircraft Accident and Incident Investigation",
    nameFr: "Enquêtes sur les accidents et incidents d'aéronefs",
    description: "Investigation of aircraft accidents and incidents",
    pqCount: 84,
  },
  ANS: {
    code: "ANS",
    name: "Air Navigation Services",
    nameEn: "Air Navigation Services",
    nameFr: "Services de navigation aérienne",
    description:
      "Provision of air traffic services, communications, navigation, and surveillance",
    pqCount: 128,
  },
  AGA: {
    code: "AGA",
    name: "Aerodromes and Ground Aids",
    nameEn: "Aerodromes and Ground Aids",
    nameFr: "Aérodromes et aides au sol",
    description:
      "Certification and oversight of aerodromes including physical characteristics",
    pqCount: 153,
  },
  SSP: {
    code: "SSP",
    name: "State Safety Programme",
    nameEn: "State Safety Programme",
    nameFr: "Programme national de sécurité",
    description:
      "Implementation of a State Safety Programme including safety policy and risk management",
    pqCount: 16,
  },
} as const;

// =============================================================================
// SMS COMPONENTS (CANSO SoE 2024)
// =============================================================================

export interface SMSComponentInfo {
  code: SMSComponent;
  name: string;
  nameEn: string;
  nameFr: string;
  weight: number;
  studyAreas: CANSOStudyArea[];
  description?: string;
}

export const SMS_COMPONENTS: Record<SMSComponent, SMSComponentInfo> = {
  SAFETY_POLICY_OBJECTIVES: {
    code: "SAFETY_POLICY_OBJECTIVES",
    name: "Safety Policy and Objectives",
    nameEn: "Safety Policy and Objectives",
    nameFr: "Politique et objectifs de sécurité",
    weight: 0.25,
    studyAreas: ["SA_1_1", "SA_1_2", "SA_1_3", "SA_1_4", "SA_1_5"],
    description:
      "Management commitment, safety responsibilities, appointment of key safety personnel",
  },
  SAFETY_RISK_MANAGEMENT: {
    code: "SAFETY_RISK_MANAGEMENT",
    name: "Safety Risk Management",
    nameEn: "Safety Risk Management",
    nameFr: "Gestion des risques de sécurité",
    weight: 0.3,
    studyAreas: ["SA_2_1", "SA_2_2"],
    description:
      "Hazard identification, safety risk assessment and mitigation processes",
  },
  SAFETY_ASSURANCE: {
    code: "SAFETY_ASSURANCE",
    name: "Safety Assurance",
    nameEn: "Safety Assurance",
    nameFr: "Assurance de la sécurité",
    weight: 0.25,
    studyAreas: ["SA_3_1", "SA_3_2", "SA_3_3"],
    description:
      "Safety performance monitoring, change management, and continuous improvement",
  },
  SAFETY_PROMOTION: {
    code: "SAFETY_PROMOTION",
    name: "Safety Promotion",
    nameEn: "Safety Promotion",
    nameFr: "Promotion de la sécurité",
    weight: 0.2,
    studyAreas: ["SA_4_1", "SA_4_2"],
    description: "Training and education, and safety communication",
  },
} as const;

// =============================================================================
// SMS STUDY AREAS (CANSO SoE 2024)
// =============================================================================

export interface StudyAreaInfo {
  code: CANSOStudyArea;
  name: string;
  nameEn: string;
  nameFr: string;
  component: SMSComponent;
  description?: string;
}

export const SMS_STUDY_AREAS: Record<CANSOStudyArea, StudyAreaInfo> = {
  SA_1_1: {
    code: "SA_1_1",
    name: "Management Commitment",
    nameEn: "Management Commitment",
    nameFr: "Engagement de la direction",
    component: "SAFETY_POLICY_OBJECTIVES",
    description:
      "Management commitment and responsibility for safety, including the safety policy statement",
  },
  SA_1_2: {
    code: "SA_1_2",
    name: "Safety Accountabilities",
    nameEn: "Safety Accountabilities",
    nameFr: "Responsabilités en matière de sécurité",
    component: "SAFETY_POLICY_OBJECTIVES",
    description:
      "Identification of the accountable executive and safety responsibilities of managers",
  },
  SA_1_3: {
    code: "SA_1_3",
    name: "Appointment of Key Safety Personnel",
    nameEn: "Appointment of Key Safety Personnel",
    nameFr: "Nomination du personnel clé de sécurité",
    component: "SAFETY_POLICY_OBJECTIVES",
    description: "Appointment of key safety personnel including the safety manager",
  },
  SA_1_4: {
    code: "SA_1_4",
    name: "Coordination of Emergency Response Planning",
    nameEn: "Coordination of Emergency Response Planning",
    nameFr: "Coordination de la planification des interventions d'urgence",
    component: "SAFETY_POLICY_OBJECTIVES",
    description:
      "Coordination of emergency response planning with appropriate organizations",
  },
  SA_1_5: {
    code: "SA_1_5",
    name: "SMS Documentation",
    nameEn: "SMS Documentation",
    nameFr: "Documentation du SGS",
    component: "SAFETY_POLICY_OBJECTIVES",
    description: "SMS implementation plan, documentation, and records management",
  },
  SA_2_1: {
    code: "SA_2_1",
    name: "Hazard Identification",
    nameEn: "Hazard Identification",
    nameFr: "Identification des dangers",
    component: "SAFETY_RISK_MANAGEMENT",
    description:
      "Processes for identifying hazards through reactive, proactive, and predictive methods",
  },
  SA_2_2: {
    code: "SA_2_2",
    name: "Risk Assessment and Mitigation",
    nameEn: "Risk Assessment and Mitigation",
    nameFr: "Évaluation et atténuation des risques",
    component: "SAFETY_RISK_MANAGEMENT",
    description:
      "Safety risk assessment and development of risk controls and mitigation strategies",
  },
  SA_3_1: {
    code: "SA_3_1",
    name: "Safety Performance Monitoring and Measurement",
    nameEn: "Safety Performance Monitoring and Measurement",
    nameFr: "Surveillance et mesure des performances de sécurité",
    component: "SAFETY_ASSURANCE",
    description:
      "Monitoring and measurement of safety performance including SPIs and SPTs",
  },
  SA_3_2: {
    code: "SA_3_2",
    name: "Management of Change",
    nameEn: "Management of Change",
    nameFr: "Gestion du changement",
    component: "SAFETY_ASSURANCE",
    description:
      "Processes to manage safety risks associated with organizational or operational changes",
  },
  SA_3_3: {
    code: "SA_3_3",
    name: "Continuous Improvement of the SMS",
    nameEn: "Continuous Improvement of the SMS",
    nameFr: "Amélioration continue du SGS",
    component: "SAFETY_ASSURANCE",
    description: "Internal evaluations, audits, and continuous improvement of the SMS",
  },
  SA_4_1: {
    code: "SA_4_1",
    name: "Training and Education",
    nameEn: "Training and Education",
    nameFr: "Formation et éducation",
    component: "SAFETY_PROMOTION",
    description: "Safety training programs for personnel at all levels",
  },
  SA_4_2: {
    code: "SA_4_2",
    name: "Safety Communication",
    nameEn: "Safety Communication",
    nameFr: "Communication sur la sécurité",
    component: "SAFETY_PROMOTION",
    description:
      "Communication of safety-critical information and promotion of safety culture",
  },
} as const;

// =============================================================================
// MATURITY LEVEL VALUES
// =============================================================================

export interface MaturityLevelValue {
  code: MaturityLevel;
  name: string;
  nameEn: string;
  nameFr: string;
  numeric: number;
  percentage: number;
  midpoint: number;
  minScore: number;
  maxScore: number;
  color: string;
}

export const MATURITY_LEVEL_VALUES: Record<MaturityLevel, MaturityLevelValue> = {
  LEVEL_A: {
    code: "LEVEL_A",
    name: "Initial/Ad-hoc",
    nameEn: "Initial/Ad-hoc",
    nameFr: "Initial/Ad-hoc",
    numeric: 1,
    percentage: 10,
    midpoint: 10,
    minScore: 0,
    maxScore: 20,
    color: "#DC2626", // red-600
  },
  LEVEL_B: {
    code: "LEVEL_B",
    name: "Defined/Documented",
    nameEn: "Defined/Documented",
    nameFr: "Défini/Documenté",
    numeric: 2,
    percentage: 30,
    midpoint: 30,
    minScore: 21,
    maxScore: 40,
    color: "#F97316", // orange-500
  },
  LEVEL_C: {
    code: "LEVEL_C",
    name: "Implemented/Measured",
    nameEn: "Implemented/Measured",
    nameFr: "Mis en œuvre/Mesuré",
    numeric: 3,
    percentage: 50,
    midpoint: 50,
    minScore: 41,
    maxScore: 60,
    color: "#EAB308", // yellow-500
  },
  LEVEL_D: {
    code: "LEVEL_D",
    name: "Managed/Controlled",
    nameEn: "Managed/Controlled",
    nameFr: "Géré/Contrôlé",
    numeric: 4,
    percentage: 70,
    midpoint: 70,
    minScore: 61,
    maxScore: 80,
    color: "#22C55E", // green-500
  },
  LEVEL_E: {
    code: "LEVEL_E",
    name: "Optimizing/Leading",
    nameEn: "Optimizing/Leading",
    nameFr: "Optimisé/Leader",
    numeric: 5,
    percentage: 90,
    midpoint: 90,
    minScore: 81,
    maxScore: 100,
    color: "#3B82F6", // blue-500
  },
} as const;

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert percentage score to maturity level
 */
export function percentageToMaturityLevel(percentage: number): MaturityLevel {
  if (percentage <= 20) return "LEVEL_A";
  if (percentage <= 40) return "LEVEL_B";
  if (percentage <= 60) return "LEVEL_C";
  if (percentage <= 80) return "LEVEL_D";
  return "LEVEL_E";
}

/**
 * Convert maturity level to percentage (midpoint)
 */
export function maturityLevelToPercentage(level: MaturityLevel): number {
  return MATURITY_LEVEL_VALUES[level].midpoint;
}

/**
 * Convert maturity level to numeric value (1-5)
 */
export function maturityLevelToNumeric(level: MaturityLevel): number {
  return MATURITY_LEVEL_VALUES[level].numeric;
}

/**
 * Convert numeric value to maturity level
 */
export function numericToMaturityLevel(numeric: number): MaturityLevel {
  if (numeric <= 1.5) return "LEVEL_A";
  if (numeric <= 2.5) return "LEVEL_B";
  if (numeric <= 3.5) return "LEVEL_C";
  if (numeric <= 4.5) return "LEVEL_D";
  return "LEVEL_E";
}

/**
 * Get study areas for a component
 */
export function getStudyAreasForComponent(
  component: SMSComponent
): CANSOStudyArea[] {
  return SMS_COMPONENTS[component].studyAreas;
}

/**
 * Get component for a study area
 */
export function getComponentForStudyArea(studyArea: CANSOStudyArea): SMSComponent {
  return SMS_STUDY_AREAS[studyArea].component;
}

// =============================================================================
// SCORING THRESHOLDS
// =============================================================================

/**
 * Minimum completion percentage required for scoring
 */
export const MIN_COMPLETION_FOR_SCORING = 80;

/**
 * Priority PQ weight multiplier (optional weighted calculation)
 */
export const PRIORITY_PQ_WEIGHT = 1.5;

/**
 * Default weight for non-priority PQs
 */
export const DEFAULT_PQ_WEIGHT = 1.0;

// =============================================================================
// ANS RESPONSE VALUES
// =============================================================================

export type ANSResponseValue =
  | "SATISFACTORY"
  | "NOT_SATISFACTORY"
  | "NOT_APPLICABLE"
  | "NOT_REVIEWED";

export const ANS_RESPONSE_VALUES: ANSResponseValue[] = [
  "SATISFACTORY",
  "NOT_SATISFACTORY",
  "NOT_APPLICABLE",
  "NOT_REVIEWED",
];

/**
 * Check if response counts toward EI calculation
 */
export function isCountableResponse(response: string | null): boolean {
  return (
    response !== null &&
    response !== "NOT_APPLICABLE" &&
    response !== "NOT_REVIEWED"
  );
}

/**
 * Check if response is satisfactory
 */
export function isSatisfactoryResponse(response: string | null): boolean {
  return response === "SATISFACTORY";
}
