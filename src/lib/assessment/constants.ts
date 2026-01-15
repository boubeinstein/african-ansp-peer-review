/**
 * Self-Assessment Module - Constants
 *
 * Bilingual constants for the assessment system, aligned with:
 * - ICAO USOAP CMA methodology for ANS assessments
 * - CANSO Standard of Excellence (SoE) for SMS assessments
 */

import type {
  AssessmentStatus,
  AssessmentType,
  ANSResponseValue,
  SMSMaturityLevel,
  EvidenceType,
} from "./types";

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface BilingualLabel {
  en: string;
  fr: string;
}

export interface BilingualDescription {
  en: string;
  fr: string;
}

// =============================================================================
// ASSESSMENT STATUS CONFIGURATION
// =============================================================================

export interface AssessmentStatusConfig {
  label: BilingualLabel;
  description: BilingualDescription;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
  allowedTransitions: AssessmentStatus[];
  sortOrder: number;
}

export const ASSESSMENT_STATUSES: Record<AssessmentStatus, AssessmentStatusConfig> = {
  DRAFT: {
    label: {
      en: "Draft",
      fr: "Brouillon",
    },
    description: {
      en: "Assessment is being prepared and can be edited",
      fr: "L'évaluation est en cours de préparation et peut être modifiée",
    },
    color: "gray",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
    icon: "FileEdit",
    allowedTransitions: ["IN_PROGRESS", "ARCHIVED"],
    sortOrder: 1,
  },
  IN_PROGRESS: {
    label: {
      en: "In Progress",
      fr: "En cours",
    },
    description: {
      en: "Assessment is actively being completed",
      fr: "L'évaluation est en cours de réalisation",
    },
    color: "blue",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    icon: "Play",
    allowedTransitions: ["SUBMITTED", "DRAFT"],
    sortOrder: 2,
  },
  SUBMITTED: {
    label: {
      en: "Submitted",
      fr: "Soumis",
    },
    description: {
      en: "Assessment has been submitted for review",
      fr: "L'évaluation a été soumise pour examen",
    },
    color: "amber",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    icon: "Send",
    allowedTransitions: ["UNDER_REVIEW", "IN_PROGRESS"],
    sortOrder: 3,
  },
  UNDER_REVIEW: {
    label: {
      en: "Under Review",
      fr: "En cours d'examen",
    },
    description: {
      en: "Assessment is being reviewed by peers or auditors",
      fr: "L'évaluation est examinée par des pairs ou des auditeurs",
    },
    color: "purple",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-400",
    icon: "Eye",
    allowedTransitions: ["COMPLETED", "SUBMITTED"],
    sortOrder: 4,
  },
  COMPLETED: {
    label: {
      en: "Completed",
      fr: "Terminé",
    },
    description: {
      en: "Assessment has been finalized and approved",
      fr: "L'évaluation a été finalisée et approuvée",
    },
    color: "green",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
    icon: "CheckCircle",
    allowedTransitions: ["ARCHIVED"],
    sortOrder: 5,
  },
  ARCHIVED: {
    label: {
      en: "Archived",
      fr: "Archivé",
    },
    description: {
      en: "Assessment has been archived for historical reference",
      fr: "L'évaluation a été archivée pour référence historique",
    },
    color: "slate",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-600 dark:text-slate-400",
    icon: "Archive",
    allowedTransitions: [],
    sortOrder: 6,
  },
};

// =============================================================================
// ASSESSMENT TYPE CONFIGURATION
// =============================================================================

export interface AssessmentTypeConfig {
  label: BilingualLabel;
  description: BilingualDescription;
  color: string;
  icon: string;
}

export const ASSESSMENT_TYPES: Record<AssessmentType, AssessmentTypeConfig> = {
  SELF_ASSESSMENT: {
    label: {
      en: "Self-Assessment",
      fr: "Auto-évaluation",
    },
    description: {
      en: "Organization evaluates its own safety oversight capabilities",
      fr: "L'organisation évalue ses propres capacités de surveillance de la sécurité",
    },
    color: "blue",
    icon: "ClipboardCheck",
  },
  GAP_ANALYSIS: {
    label: {
      en: "Gap Analysis",
      fr: "Analyse des écarts",
    },
    description: {
      en: "Identify gaps between current state and desired compliance level",
      fr: "Identifier les écarts entre l'état actuel et le niveau de conformité souhaité",
    },
    color: "orange",
    icon: "Search",
  },
  PRE_REVIEW: {
    label: {
      en: "Pre-Review Assessment",
      fr: "Évaluation pré-revue",
    },
    description: {
      en: "Preparation assessment before a scheduled peer review",
      fr: "Évaluation préparatoire avant une revue par les pairs programmée",
    },
    color: "purple",
    icon: "Calendar",
  },
  MOCK_REVIEW: {
    label: {
      en: "Mock Review",
      fr: "Revue simulée",
    },
    description: {
      en: "Practice assessment to simulate peer review experience",
      fr: "Évaluation pratique pour simuler l'expérience de revue par les pairs",
    },
    color: "teal",
    icon: "TestTube",
  },
};

// =============================================================================
// ANS RESPONSE VALUES (USOAP CMA ALIGNED)
// =============================================================================

export interface ANSResponseConfig {
  label: BilingualLabel;
  description: BilingualDescription;
  score: number | null;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
  shortCode: string;
}

export const ANS_RESPONSE_VALUES: Record<ANSResponseValue, ANSResponseConfig> = {
  SATISFACTORY: {
    label: {
      en: "Satisfactory",
      fr: "Satisfaisant",
    },
    description: {
      en: "The State has implemented the critical element. Evidence demonstrates effective implementation of ICAO provisions.",
      fr: "L'État a mis en œuvre l'élément critique. Les preuves démontrent une mise en œuvre effective des dispositions de l'OACI.",
    },
    score: 1,
    color: "green",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-500",
    icon: "CheckCircle",
    shortCode: "S",
  },
  NOT_SATISFACTORY: {
    label: {
      en: "Not Satisfactory",
      fr: "Non satisfaisant",
    },
    description: {
      en: "The State has not implemented or has only partially implemented the critical element. A finding should be raised.",
      fr: "L'État n'a pas mis en œuvre ou n'a que partiellement mis en œuvre l'élément critique. Une constatation doit être soulevée.",
    },
    score: 0,
    color: "red",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-500",
    icon: "XCircle",
    shortCode: "NS",
  },
  NOT_APPLICABLE: {
    label: {
      en: "Not Applicable",
      fr: "Non applicable",
    },
    description: {
      en: "The protocol question is not applicable to the State due to its specific circumstances or aviation activities.",
      fr: "La question de protocole n'est pas applicable à l'État en raison de ses circonstances spécifiques ou de ses activités aéronautiques.",
    },
    score: null, // Excluded from EI calculation
    color: "gray",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-600 dark:text-gray-400",
    borderColor: "border-gray-400",
    icon: "MinusCircle",
    shortCode: "NA",
  },
  NOT_REVIEWED: {
    label: {
      en: "Not Reviewed",
      fr: "Non examiné",
    },
    description: {
      en: "The question has not yet been assessed. Response required before submission.",
      fr: "La question n'a pas encore été évaluée. Une réponse est requise avant la soumission.",
    },
    score: null,
    color: "yellow",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-400",
    borderColor: "border-yellow-500",
    icon: "Clock",
    shortCode: "NR",
  },
};

// =============================================================================
// SMS MATURITY LEVELS (CANSO SOE ALIGNED)
// =============================================================================

export interface SMSMaturityConfig {
  label: BilingualLabel;
  description: BilingualDescription;
  characteristics: BilingualLabel;
  scoreValue: number;
  scoreRange: [number, number]; // Percentage range
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const SMS_MATURITY_LEVELS: Record<NonNullable<SMSMaturityLevel>, SMSMaturityConfig> = {
  A: {
    label: {
      en: "Level A - Initial/Ad-hoc",
      fr: "Niveau A - Initial/Ad hoc",
    },
    description: {
      en: "Processes are typically undocumented and in a state of dynamic change, tending to be driven by individual efforts.",
      fr: "Les processus sont généralement non documentés et en état de changement dynamique, tendant à être guidés par des efforts individuels.",
    },
    characteristics: {
      en: "Reactive, individual-dependent, informal processes",
      fr: "Réactif, dépendant des individus, processus informels",
    },
    scoreValue: 1,
    scoreRange: [0, 20],
    color: "red",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-500",
  },
  B: {
    label: {
      en: "Level B - Defined/Documented",
      fr: "Niveau B - Défini/Documenté",
    },
    description: {
      en: "Processes are documented, standardized and integrated into organization-wide procedures. Basic training is provided.",
      fr: "Les processus sont documentés, standardisés et intégrés dans les procédures à l'échelle de l'organisation. Une formation de base est dispensée.",
    },
    characteristics: {
      en: "Documented, standardized, basic training provided",
      fr: "Documenté, standardisé, formation de base fournie",
    },
    scoreValue: 2,
    scoreRange: [21, 40],
    color: "orange",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-500",
  },
  C: {
    label: {
      en: "Level C - Implemented/Measured",
      fr: "Niveau C - Mis en œuvre/Mesuré",
    },
    description: {
      en: "Processes are implemented organization-wide and performance is measured using key indicators. Regular reviews conducted.",
      fr: "Les processus sont mis en œuvre à l'échelle de l'organisation et la performance est mesurée à l'aide d'indicateurs clés. Des revues régulières sont effectuées.",
    },
    characteristics: {
      en: "Organization-wide implementation, performance measured, regular reviews",
      fr: "Mise en œuvre à l'échelle de l'organisation, performance mesurée, revues régulières",
    },
    scoreValue: 3,
    scoreRange: [41, 60],
    color: "yellow",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-400",
    borderColor: "border-yellow-500",
  },
  D: {
    label: {
      en: "Level D - Managed/Controlled",
      fr: "Niveau D - Géré/Contrôlé",
    },
    description: {
      en: "Processes are managed and controlled using detailed metrics. Process improvement targets are established and monitored.",
      fr: "Les processus sont gérés et contrôlés à l'aide de métriques détaillées. Des objectifs d'amélioration des processus sont établis et suivis.",
    },
    characteristics: {
      en: "Quantitatively managed, improvement targets, proactive approach",
      fr: "Géré quantitativement, objectifs d'amélioration, approche proactive",
    },
    scoreValue: 4,
    scoreRange: [61, 80],
    color: "blue",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-500",
  },
  E: {
    label: {
      en: "Level E - Optimizing/Leading",
      fr: "Niveau E - Optimisation/Leader",
    },
    description: {
      en: "Focus is on continuous process improvement and industry leadership. Best practices are shared and innovation is encouraged.",
      fr: "L'accent est mis sur l'amélioration continue des processus et le leadership industriel. Les meilleures pratiques sont partagées et l'innovation est encouragée.",
    },
    characteristics: {
      en: "Continuous improvement, industry leadership, best practices shared",
      fr: "Amélioration continue, leadership industriel, meilleures pratiques partagées",
    },
    scoreValue: 5,
    scoreRange: [81, 100],
    color: "green",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-500",
  },
};

// =============================================================================
// EVIDENCE TYPE CONFIGURATION
// =============================================================================

export interface EvidenceTypeConfig {
  label: BilingualLabel;
  description: BilingualDescription;
  examples: string[];
  icon: string;
  acceptedFileTypes?: string[];
}

export const EVIDENCE_TYPES: Record<EvidenceType, EvidenceTypeConfig> = {
  DOCUMENT: {
    label: {
      en: "Document",
      fr: "Document",
    },
    description: {
      en: "Official policies, procedures, manuals, and formal documentation",
      fr: "Politiques officielles, procédures, manuels et documentation formelle",
    },
    examples: [
      "Safety Policy",
      "Operations Manual",
      "SMS Manual",
      "Quality Manual",
      "Standard Operating Procedures",
    ],
    icon: "FileText",
    acceptedFileTypes: [".pdf", ".doc", ".docx"],
  },
  PROCEDURE: {
    label: {
      en: "Procedure",
      fr: "Procédure",
    },
    description: {
      en: "Documented procedures, work instructions, and process flows",
      fr: "Procédures documentées, instructions de travail et flux de processus",
    },
    examples: [
      "Risk Assessment Procedure",
      "Incident Reporting Procedure",
      "Change Management Procedure",
      "Hazard Identification Process",
    ],
    icon: "ListChecks",
    acceptedFileTypes: [".pdf", ".doc", ".docx"],
  },
  RECORD: {
    label: {
      en: "Record",
      fr: "Enregistrement",
    },
    description: {
      en: "Evidence of activities performed, including reports and meeting records",
      fr: "Preuves des activités réalisées, y compris les rapports et les comptes rendus de réunions",
    },
    examples: [
      "Training Records",
      "Audit Reports",
      "Safety Meeting Minutes",
      "Risk Register",
      "Incident Reports",
    ],
    icon: "Database",
    acceptedFileTypes: [".pdf", ".xls", ".xlsx", ".doc", ".docx"],
  },
  INTERVIEW: {
    label: {
      en: "Interview",
      fr: "Entretien",
    },
    description: {
      en: "Information obtained through interviews with personnel",
      fr: "Informations obtenues lors d'entretiens avec le personnel",
    },
    examples: [
      "Staff Interviews",
      "Management Discussions",
      "Focus Group Sessions",
      "Expert Consultations",
    ],
    icon: "Users",
    acceptedFileTypes: [".pdf", ".doc", ".docx", ".mp3", ".mp4"],
  },
  OBSERVATION: {
    label: {
      en: "Observation",
      fr: "Observation",
    },
    description: {
      en: "Direct observation of activities, facilities, and processes",
      fr: "Observation directe des activités, des installations et des processus",
    },
    examples: [
      "Facility Tour Notes",
      "Process Observation Reports",
      "Safety Walk Notes",
      "Equipment Inspection",
    ],
    icon: "Eye",
    acceptedFileTypes: [".pdf", ".doc", ".docx", ".jpg", ".png"],
  },
  OTHER: {
    label: {
      en: "Other",
      fr: "Autre",
    },
    description: {
      en: "Other types of evidence not covered by specific categories",
      fr: "Autres types de preuves non couverts par les catégories spécifiques",
    },
    examples: [
      "Photos",
      "Screenshots",
      "External Reports",
      "Third-party Certifications",
      "Industry Benchmarks",
    ],
    icon: "File",
    acceptedFileTypes: [".pdf", ".doc", ".docx", ".jpg", ".png", ".zip"],
  },
};

// =============================================================================
// SCORING CONSTANTS
// =============================================================================

/**
 * SMS Component weights for overall maturity calculation
 * Based on CANSO SoE methodology
 */
export const SMS_COMPONENT_WEIGHTS = {
  SAFETY_POLICY_OBJECTIVES: 0.25,
  SAFETY_RISK_MANAGEMENT: 0.30,
  SAFETY_ASSURANCE: 0.25,
  SAFETY_PROMOTION: 0.20,
} as const;

/**
 * EI Score thresholds for categorization
 */
export const EI_SCORE_THRESHOLDS = {
  EXCELLENT: { min: 90, label: { en: "Excellent", fr: "Excellent" } },
  GOOD: { min: 75, label: { en: "Good", fr: "Bon" } },
  SATISFACTORY: { min: 60, label: { en: "Satisfactory", fr: "Satisfaisant" } },
  NEEDS_IMPROVEMENT: { min: 40, label: { en: "Needs Improvement", fr: "À améliorer" } },
  CRITICAL: { min: 0, label: { en: "Critical", fr: "Critique" } },
} as const;

/**
 * Minimum completion requirements for submission
 */
export const SUBMISSION_REQUIREMENTS = {
  ANS_USOAP_CMA: {
    minAnsweredPercentage: 100, // All questions must be answered
    minEvidencePercentage: 80,  // At least 80% with evidence
    maxNotReviewed: 0,          // No NR allowed
  },
  SMS_CANSO_SOE: {
    minAnsweredPercentage: 100,
    minEvidencePercentage: 75,
    maxNotReviewed: 0,
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get assessment status array sorted by workflow order
 */
export function getAssessmentStatusArray() {
  return Object.entries(ASSESSMENT_STATUSES)
    .map(([code, config]) => ({
      code: code as AssessmentStatus,
      ...config,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get assessment types array
 */
export function getAssessmentTypesArray() {
  return Object.entries(ASSESSMENT_TYPES).map(([code, config]) => ({
    code: code as AssessmentType,
    ...config,
  }));
}

/**
 * Get ANS response values array
 */
export function getANSResponseValuesArray() {
  return Object.entries(ANS_RESPONSE_VALUES).map(([code, config]) => ({
    code: code as ANSResponseValue,
    ...config,
  }));
}

/**
 * Get SMS maturity levels array sorted by score
 */
export function getSMSMaturityLevelsArray() {
  return Object.entries(SMS_MATURITY_LEVELS)
    .map(([code, config]) => ({
      code: code as NonNullable<SMSMaturityLevel>,
      ...config,
    }))
    .sort((a, b) => a.scoreValue - b.scoreValue);
}

/**
 * Get evidence types array
 */
export function getEvidenceTypesArray() {
  return Object.entries(EVIDENCE_TYPES).map(([code, config]) => ({
    code: code as EvidenceType,
    ...config,
  }));
}

/**
 * Check if status transition is allowed
 */
export function isStatusTransitionAllowed(
  currentStatus: AssessmentStatus,
  targetStatus: AssessmentStatus
): boolean {
  return ASSESSMENT_STATUSES[currentStatus].allowedTransitions.includes(targetStatus);
}

/**
 * Get maturity level from numeric score (1-5)
 */
export function getMaturityLevelFromScore(score: number): SMSMaturityLevel {
  if (score >= 4.5) return "E";
  if (score >= 3.5) return "D";
  if (score >= 2.5) return "C";
  if (score >= 1.5) return "B";
  return "A";
}

/**
 * Get EI score category from percentage
 */
export function getEIScoreCategory(eiScore: number): keyof typeof EI_SCORE_THRESHOLDS {
  if (eiScore >= EI_SCORE_THRESHOLDS.EXCELLENT.min) return "EXCELLENT";
  if (eiScore >= EI_SCORE_THRESHOLDS.GOOD.min) return "GOOD";
  if (eiScore >= EI_SCORE_THRESHOLDS.SATISFACTORY.min) return "SATISFACTORY";
  if (eiScore >= EI_SCORE_THRESHOLDS.NEEDS_IMPROVEMENT.min) return "NEEDS_IMPROVEMENT";
  return "CRITICAL";
}

/**
 * Calculate weighted SMS score from component scores
 */
export function calculateWeightedSMSScore(
  componentScores: Partial<Record<keyof typeof SMS_COMPONENT_WEIGHTS, number>>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [component, weight] of Object.entries(SMS_COMPONENT_WEIGHTS)) {
    const score = componentScores[component as keyof typeof SMS_COMPONENT_WEIGHTS];
    if (score !== undefined) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
