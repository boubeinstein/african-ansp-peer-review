/**
 * Display labels for Reviewer enums
 * Bilingual support (EN/FR) per programme requirements
 *
 * @module lib/reviewer/labels
 */

import type {
  ExpertiseArea,
  Language,
  ProficiencyLevel,
  LanguageProficiency,
  ReviewerType,
  ReviewerSelectionStatus,
  CertificationType,
  TrainingType,
  TrainingStatus,
  AvailabilityType,
  COIType,
  ContactMethod,
} from "@/types/prisma-enums";

type BilingualLabel = { en: string; fr: string };

// ============================================
// EXPERTISE AREAS
// Per ICAO Annex 11 and ANS domains
// ============================================

export const EXPERTISE_AREA_LABELS: Record<ExpertiseArea, BilingualLabel> = {
  ATS: {
    en: "Air Traffic Services",
    fr: "Services de la circulation aérienne",
  },
  AIM_AIS: {
    en: "Aeronautical Information Management",
    fr: "Gestion de l'information aéronautique",
  },
  FPD: {
    en: "Flight Procedures Design",
    fr: "Conception des procédures de vol",
  },
  MAP: {
    en: "Aeronautical Charts",
    fr: "Cartes aéronautiques",
  },
  MET: {
    en: "Meteorology",
    fr: "Météorologie",
  },
  CNS: {
    en: "Communications, Navigation, Surveillance",
    fr: "Communications, Navigation, Surveillance",
  },
  SAR: {
    en: "Search and Rescue",
    fr: "Recherche et sauvetage",
  },
  PANS_OPS: {
    en: "Procedures for Air Navigation Services",
    fr: "Procédures pour les services de navigation aérienne",
  },
  SMS_POLICY: {
    en: "SMS Policy & Objectives",
    fr: "Politique et objectifs SMS",
  },
  SMS_RISK: {
    en: "SMS Risk Management",
    fr: "Gestion des risques SMS",
  },
  SMS_ASSURANCE: {
    en: "SMS Safety Assurance",
    fr: "Assurance sécurité SMS",
  },
  SMS_PROMOTION: {
    en: "SMS Safety Promotion",
    fr: "Promotion de la sécurité SMS",
  },
  AERODROME: {
    en: "Aerodrome Operations",
    fr: "Opérations d'aérodrome",
  },
  RFF: {
    en: "Rescue and Fire Fighting",
    fr: "Sauvetage et lutte contre l'incendie",
  },
  ENGINEERING: {
    en: "Engineering & Maintenance",
    fr: "Ingénierie et maintenance",
  },
  QMS: {
    en: "Quality Management Systems",
    fr: "Systèmes de gestion de la qualité",
  },
  TRAINING: {
    en: "Training & Competency",
    fr: "Formation et compétence",
  },
  HUMAN_FACTORS: {
    en: "Human Factors",
    fr: "Facteurs humains",
  },
};

export const EXPERTISE_AREA_ABBREV: Record<ExpertiseArea, string> = {
  ATS: "ATS",
  AIM_AIS: "AIM",
  FPD: "FPD",
  MAP: "MAP",
  MET: "MET",
  CNS: "CNS",
  SAR: "SAR",
  PANS_OPS: "PANS-OPS",
  SMS_POLICY: "SMS-P",
  SMS_RISK: "SMS-R",
  SMS_ASSURANCE: "SMS-A",
  SMS_PROMOTION: "SMS-PR",
  AERODROME: "ADR",
  RFF: "RFF",
  ENGINEERING: "ENG",
  QMS: "QMS",
  TRAINING: "TRG",
  HUMAN_FACTORS: "HF",
};

// ============================================
// LANGUAGES
// ICAO working languages + African regional
// ============================================

export const LANGUAGE_LABELS: Record<
  Language,
  BilingualLabel & { native: string }
> = {
  EN: { en: "English", fr: "Anglais", native: "English" },
  FR: { en: "French", fr: "Français", native: "Français" },
  PT: { en: "Portuguese", fr: "Portugais", native: "Português" },
  AR: { en: "Arabic", fr: "Arabe", native: "العربية" },
  ES: { en: "Spanish", fr: "Espagnol", native: "Español" },
};

// ============================================
// PROFICIENCY LEVELS
// For expertise areas
// ============================================

export const PROFICIENCY_LEVEL_LABELS: Record<ProficiencyLevel, BilingualLabel> = {
  BASIC: { en: "Basic", fr: "Base" },
  COMPETENT: { en: "Competent", fr: "Compétent" },
  PROFICIENT: { en: "Proficient", fr: "Maîtrise" },
  EXPERT: { en: "Expert", fr: "Expert" },
};

export const PROFICIENCY_LEVEL_SCORE: Record<ProficiencyLevel, number> = {
  BASIC: 1,
  COMPETENT: 2,
  PROFICIENT: 3,
  EXPERT: 4,
};

// ============================================
// LANGUAGE PROFICIENCY
// Per ICAO Doc 9835 Language Proficiency Requirements
// ============================================

export const LANGUAGE_PROFICIENCY_LABELS: Record<
  LanguageProficiency,
  BilingualLabel
> = {
  BASIC: { en: "Basic (A1-A2)", fr: "Base (A1-A2)" },
  INTERMEDIATE: { en: "Intermediate (B1-B2)", fr: "Intermédiaire (B1-B2)" },
  ADVANCED: { en: "Advanced (C1-C2)", fr: "Avancé (C1-C2)" },
  NATIVE: { en: "Native Speaker", fr: "Langue maternelle" },
};

/** Minimum proficiency to conduct reviews in a language */
export const MIN_REVIEW_PROFICIENCY: LanguageProficiency = "INTERMEDIATE";

// ============================================
// REVIEWER TYPE
// ============================================

export const REVIEWER_TYPE_LABELS: Record<ReviewerType, BilingualLabel> = {
  PEER_REVIEWER: { en: "Peer Reviewer", fr: "Évaluateur pair" },
  LEAD_REVIEWER: { en: "Lead Reviewer", fr: "Évaluateur principal" },
  SENIOR_REVIEWER: { en: "Senior Reviewer", fr: "Évaluateur senior" },
  OBSERVER: { en: "Observer", fr: "Observateur" },
};

export const REVIEWER_TYPE_COLOR: Record<ReviewerType, string> = {
  PEER_REVIEWER: "bg-blue-100 text-blue-800",
  LEAD_REVIEWER: "bg-purple-100 text-purple-800",
  SENIOR_REVIEWER: "bg-indigo-100 text-indigo-800",
  OBSERVER: "bg-gray-100 text-gray-800",
};

// ============================================
// SELECTION STATUS
// ============================================

export const SELECTION_STATUS_LABELS: Record<
  ReviewerSelectionStatus,
  BilingualLabel
> = {
  NOMINATED: { en: "Nominated", fr: "Nominé" },
  UNDER_REVIEW: { en: "Under Review", fr: "En cours d'évaluation" },
  SELECTED: { en: "Selected", fr: "Sélectionné" },
  INACTIVE: { en: "Inactive", fr: "Inactif" },
  WITHDRAWN: { en: "Withdrawn", fr: "Retiré" },
  REJECTED: { en: "Rejected", fr: "Rejeté" },
};

export const SELECTION_STATUS_COLOR: Record<ReviewerSelectionStatus, string> = {
  NOMINATED: "bg-blue-100 text-blue-800",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  SELECTED: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  WITHDRAWN: "bg-orange-100 text-orange-800",
  REJECTED: "bg-red-100 text-red-800",
};

// ============================================
// CERTIFICATION TYPE
// ============================================

export const CERTIFICATION_TYPE_LABELS: Record<
  CertificationType,
  BilingualLabel
> = {
  PEER_REVIEWER: { en: "Peer Reviewer Certification", fr: "Certification d'évaluateur pair" },
  LEAD_REVIEWER: { en: "Lead Reviewer Certification", fr: "Certification d'évaluateur principal" },
  SMS_ASSESSOR: { en: "SMS Assessor", fr: "Évaluateur SMS" },
  ICAO_AUDITOR: { en: "ICAO Auditor", fr: "Auditeur OACI" },
  CANSO_TRAINER: { en: "CANSO Trainer", fr: "Formateur CANSO" },
  ATC_LICENSE: { en: "ATC License", fr: "Licence ATC" },
  OTHER: { en: "Other", fr: "Autre" },
};

// ============================================
// TRAINING TYPE
// ============================================

export const TRAINING_TYPE_LABELS: Record<TrainingType, BilingualLabel> = {
  INITIAL_REVIEWER: {
    en: "Initial Reviewer Training",
    fr: "Formation initiale d'évaluateur",
  },
  REFRESHER: { en: "Refresher Training", fr: "Formation de recyclage" },
  LEAD_REVIEWER: {
    en: "Lead Reviewer Training",
    fr: "Formation d'évaluateur principal",
  },
  SMS_ASSESSMENT: {
    en: "SMS Assessment (CANSO SoE)",
    fr: "Évaluation SMS (CANSO SoE)",
  },
  USOAP_CMA: { en: "USOAP CMA Methodology", fr: "Méthodologie USOAP CMA" },
  CANSO_SOE: {
    en: "CANSO Standard of Excellence",
    fr: "CANSO Standard d'Excellence",
  },
  SPECIALIZED: { en: "Specialized Training", fr: "Formation spécialisée" },
};

// ============================================
// TRAINING STATUS
// ============================================

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, BilingualLabel> = {
  SCHEDULED: { en: "Scheduled", fr: "Planifié" },
  IN_PROGRESS: { en: "In Progress", fr: "En cours" },
  COMPLETED: { en: "Completed", fr: "Terminé" },
  INCOMPLETE: { en: "Incomplete", fr: "Incomplet" },
  CANCELLED: { en: "Cancelled", fr: "Annulé" },
};

export const TRAINING_STATUS_COLOR: Record<TrainingStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  INCOMPLETE: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

// ============================================
// AVAILABILITY TYPE
// ============================================

export const AVAILABILITY_TYPE_LABELS: Record<AvailabilityType, BilingualLabel> = {
  AVAILABLE: { en: "Available", fr: "Disponible" },
  TENTATIVE: { en: "Tentative", fr: "Provisoire" },
  UNAVAILABLE: { en: "Unavailable", fr: "Indisponible" },
  ON_ASSIGNMENT: { en: "On Assignment", fr: "En mission" },
};

export const AVAILABILITY_TYPE_COLOR: Record<AvailabilityType, string> = {
  AVAILABLE: "bg-green-500",
  TENTATIVE: "bg-yellow-500",
  UNAVAILABLE: "bg-red-500",
  ON_ASSIGNMENT: "bg-blue-500",
};

// ============================================
// COI TYPE
// Per COI Management System requirements
// ============================================

export const COI_TYPE_LABELS: Record<COIType, BilingualLabel> = {
  // Legacy values
  EMPLOYMENT: { en: "Employment", fr: "Emploi" },
  FINANCIAL: { en: "Financial", fr: "Financier" },
  CONTRACTUAL: { en: "Contractual", fr: "Contractuel" },
  PERSONAL: { en: "Personal", fr: "Personnel" },
  PREVIOUS_REVIEW: { en: "Previous Review", fr: "Revue précédente" },
  // Current values
  HOME_ORGANIZATION: { en: "Home Organization", fr: "Organisation d'appartenance" },
  FAMILY_RELATIONSHIP: { en: "Family Relationship", fr: "Lien familial" },
  FORMER_EMPLOYEE: { en: "Former Employee", fr: "Ancien employé" },
  BUSINESS_INTEREST: { en: "Business Interest", fr: "Intérêt commercial" },
  RECENT_REVIEW: { en: "Recent Review", fr: "Revue récente" },
  OTHER: { en: "Other", fr: "Autre" },
};

export const COI_TYPE_COLOR: Record<COIType, string> = {
  // Legacy values
  EMPLOYMENT: "bg-red-100 text-red-800",
  FINANCIAL: "bg-orange-100 text-orange-800",
  CONTRACTUAL: "bg-yellow-100 text-yellow-800",
  PERSONAL: "bg-red-100 text-red-800",
  PREVIOUS_REVIEW: "bg-purple-100 text-purple-800",
  // Current values
  HOME_ORGANIZATION: "bg-red-100 text-red-800",
  FAMILY_RELATIONSHIP: "bg-red-100 text-red-800",
  FORMER_EMPLOYEE: "bg-yellow-100 text-yellow-800",
  BUSINESS_INTEREST: "bg-orange-100 text-orange-800",
  RECENT_REVIEW: "bg-purple-100 text-purple-800",
  OTHER: "bg-gray-100 text-gray-800",
};

// ============================================
// CONTACT METHOD
// ============================================

export const CONTACT_METHOD_LABELS: Record<ContactMethod, BilingualLabel> = {
  EMAIL: { en: "Email", fr: "Courriel" },
  PHONE: { en: "Phone", fr: "Téléphone" },
  WHATSAPP: { en: "WhatsApp", fr: "WhatsApp" },
  TEAMS: { en: "Microsoft Teams", fr: "Microsoft Teams" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get label in specified locale
 */
export function getLabel<T extends string>(
  labels: Record<T, BilingualLabel>,
  key: T,
  locale: "en" | "fr" = "en"
): string {
  return labels[key]?.[locale] ?? key;
}

/**
 * Get all labels as options for select components
 */
export function getSelectOptions<T extends string>(
  labels: Record<T, BilingualLabel>,
  locale: "en" | "fr" = "en"
): { value: T; label: string }[] {
  return Object.entries(labels).map(([value, label]) => ({
    value: value as T,
    label: (label as BilingualLabel)[locale],
  }));
}

/**
 * Get expertise areas grouped by category
 */
export function getExpertiseAreasByCategory(locale: "en" | "fr" = "en"): {
  category: string;
  areas: { value: ExpertiseArea; label: string; abbrev: string }[];
}[] {
  return [
    {
      category: locale === "en" ? "Air Navigation Services" : "Services de navigation aérienne",
      areas: (["ATS", "AIM_AIS", "FPD", "MAP", "MET", "CNS", "SAR", "PANS_OPS"] as ExpertiseArea[]).map((area) => ({
        value: area,
        label: EXPERTISE_AREA_LABELS[area][locale],
        abbrev: EXPERTISE_AREA_ABBREV[area],
      })),
    },
    {
      category: locale === "en" ? "Safety Management" : "Gestion de la sécurité",
      areas: (["SMS_POLICY", "SMS_RISK", "SMS_ASSURANCE", "SMS_PROMOTION"] as ExpertiseArea[]).map((area) => ({
        value: area,
        label: EXPERTISE_AREA_LABELS[area][locale],
        abbrev: EXPERTISE_AREA_ABBREV[area],
      })),
    },
    {
      category: locale === "en" ? "Support Functions" : "Fonctions de support",
      areas: (["AERODROME", "RFF", "ENGINEERING", "QMS", "TRAINING", "HUMAN_FACTORS"] as ExpertiseArea[]).map((area) => ({
        value: area,
        label: EXPERTISE_AREA_LABELS[area][locale],
        abbrev: EXPERTISE_AREA_ABBREV[area],
      })),
    },
  ];
}

/**
 * Check if language proficiency is sufficient for conducting reviews
 */
export function canConductReviewInLanguage(
  proficiency: LanguageProficiency
): boolean {
  const sufficientLevels: LanguageProficiency[] = [
    "INTERMEDIATE",
    "ADVANCED",
    "NATIVE",
  ];
  return sufficientLevels.includes(proficiency);
}

/**
 * Get expertise areas relevant for ANS (USOAP CMA) assessments
 */
export const ANS_EXPERTISE_AREAS: ExpertiseArea[] = [
  "ATS",
  "AIM_AIS",
  "FPD",
  "MAP",
  "MET",
  "CNS",
  "SAR",
  "PANS_OPS",
];

/**
 * Get expertise areas relevant for SMS (CANSO SoE) assessments
 */
export const SMS_EXPERTISE_AREAS: ExpertiseArea[] = [
  "SMS_POLICY",
  "SMS_RISK",
  "SMS_ASSURANCE",
  "SMS_PROMOTION",
];
