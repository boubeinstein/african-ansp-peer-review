/**
 * Severity Calculator Service
 *
 * Auto-suggests finding severity based on multiple factors:
 * - Audit area (ANS findings tend to be more severe)
 * - ICAO reference type (Standards vs Guidance)
 * - Keywords in description
 * - Repetition (same issue found before)
 * - Safety impact indicators
 * - Critical Element involvement
 * - Finding type
 *
 * Severity levels: CRITICAL > MAJOR > MINOR > OBSERVATION
 */

import { db } from "@/lib/db";
import {
  FindingSeverity,
  FindingType,
  USOAPAuditArea,
  CriticalElement,
  ICAOReferenceType,
} from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface FindingInput {
  /** Description text (English) */
  descriptionEn: string;
  /** Description text (French) - optional */
  descriptionFr?: string;
  /** Title text (English) */
  titleEn?: string;
  /** Title text (French) - optional */
  titleFr?: string;
  /** USOAP Audit Area */
  auditArea?: USOAPAuditArea | null;
  /** Critical Element */
  criticalElement?: CriticalElement | null;
  /** ICAO Reference string (e.g., "Annex 11, Chapter 2") */
  icaoReference?: string | null;
  /** Finding type */
  findingType?: FindingType;
  /** Organization ID for repetition check */
  organizationId?: string;
  /** Review ID */
  reviewId?: string;
  /** Question ID (if linked to a PQ) */
  questionId?: string | null;
}

export interface SeverityFactor {
  /** Factor identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Description in French */
  descriptionFr: string;
  /** Points contributed to score */
  points: number;
  /** Category of factor */
  category: "area" | "reference" | "keyword" | "repetition" | "safety" | "type";
}

export interface SeveritySuggestion {
  /** Suggested severity level */
  suggested: FindingSeverity;
  /** Confidence in the suggestion */
  confidence: "high" | "medium" | "low";
  /** Contributing factors */
  factors: SeverityFactor[];
  /** Total score (internal use) */
  score: number;
  /** Whether this is a repeat finding */
  isRepeat: boolean;
  /** Number of previous similar findings */
  previousOccurrences: number;
}

// =============================================================================
// CONSTANTS - SCORING WEIGHTS
// =============================================================================

/**
 * Thresholds for severity determination
 * Higher scores = more severe
 */
const SEVERITY_THRESHOLDS = {
  CRITICAL: 8, // Score >= 8 → CRITICAL
  MAJOR: 5, // Score >= 5 → MAJOR
  MINOR: 2, // Score >= 2 → MINOR
  // Score < 2 → OBSERVATION
};

/**
 * Confidence thresholds based on number of factors
 */
const CONFIDENCE_THRESHOLDS = {
  HIGH: 4, // 4+ factors contributing
  MEDIUM: 2, // 2-3 factors
  // < 2 → LOW
};

/**
 * Safety-critical audit areas (ANS-related)
 */
const SAFETY_CRITICAL_AREAS: USOAPAuditArea[] = ["ANS", "OPS", "AIR", "AIG"];

/**
 * High-risk audit areas
 */
const HIGH_RISK_AREAS: USOAPAuditArea[] = ["PEL", "AGA", "SSP"];

/**
 * Core Critical Elements (implementation-focused)
 */
const CORE_CRITICAL_ELEMENTS: CriticalElement[] = ["CE_5", "CE_6", "CE_7", "CE_8"];

/**
 * Keywords indicating CRITICAL severity
 */
const CRITICAL_KEYWORDS = [
  // English
  "failure",
  "failed",
  "unsafe",
  "incident",
  "accident",
  "violation",
  "immediate",
  "imminent",
  "danger",
  "hazard",
  "critical",
  "fatal",
  "death",
  "injury",
  "collision",
  "separation",
  "unauthorized",
  "loss of",
  "runway incursion",
  "airprox",
  "near miss",
  // French
  "défaillance",
  "échec",
  "dangereux",
  "incident",
  "accident",
  "violation",
  "immédiat",
  "imminent",
  "danger",
  "risque",
  "critique",
  "mortel",
  "décès",
  "blessure",
  "collision",
  "séparation",
  "non autorisé",
  "perte de",
];

/**
 * Keywords indicating MAJOR severity
 */
const MAJOR_KEYWORDS = [
  // English
  "incomplete",
  "missing",
  "non-compliance",
  "non-conformity",
  "gap",
  "deficiency",
  "inadequate",
  "insufficient",
  "not implemented",
  "not established",
  "no evidence",
  "lack of",
  "absence",
  "systematic",
  "repeated",
  "multiple",
  "significant",
  "substantial",
  // French
  "incomplet",
  "manquant",
  "non-conformité",
  "écart",
  "lacune",
  "déficience",
  "inadéquat",
  "insuffisant",
  "non mis en œuvre",
  "non établi",
  "aucune preuve",
  "absence de",
  "systématique",
  "répété",
  "significatif",
];

/**
 * Keywords indicating MINOR severity
 */
const MINOR_KEYWORDS = [
  // English
  "partial",
  "partially",
  "minor",
  "small",
  "limited",
  "isolated",
  "administrative",
  "documentation",
  "update required",
  "outdated",
  "not current",
  "editorial",
  // French
  "partiel",
  "partiellement",
  "mineur",
  "petit",
  "limité",
  "isolé",
  "administratif",
  "documentation",
  "mise à jour requise",
  "obsolète",
  "non à jour",
];

/**
 * Safety impact indicator phrases
 */
const SAFETY_IMPACT_PHRASES = [
  // English - High impact
  "safety of flight",
  "air traffic",
  "aircraft operation",
  "navigation service",
  "communication failure",
  "surveillance",
  "terrain awareness",
  "controlled airspace",
  "separation minima",
  "emergency procedure",
  // French - High impact
  "sécurité des vols",
  "circulation aérienne",
  "exploitation des aéronefs",
  "service de navigation",
  "panne de communication",
  "surveillance",
  "conscience du terrain",
  "espace aérien contrôlé",
  "minima de séparation",
  "procédure d'urgence",
];

// =============================================================================
// KEYWORD MATCHING
// =============================================================================

/**
 * Check if text contains any keywords from a list (case-insensitive)
 */
function containsKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Check for safety impact phrases
 */
function containsSafetyImpact(text: string): string[] {
  const lowerText = text.toLowerCase();
  return SAFETY_IMPACT_PHRASES.filter((phrase) =>
    lowerText.includes(phrase.toLowerCase())
  );
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate severity suggestion based on finding characteristics
 */
export async function calculateSeveritySuggestion(
  input: FindingInput
): Promise<SeveritySuggestion> {
  let score = 0;
  const factors: SeverityFactor[] = [];

  // Combine all text for keyword analysis
  const allText = [
    input.descriptionEn || "",
    input.descriptionFr || "",
    input.titleEn || "",
    input.titleFr || "",
  ].join(" ");

  // =========================================================================
  // FACTOR 1: Audit Area Analysis
  // =========================================================================

  if (input.auditArea) {
    if (SAFETY_CRITICAL_AREAS.includes(input.auditArea)) {
      score += 3;
      factors.push({
        id: "safety_critical_area",
        description: `Safety-critical audit area: ${input.auditArea}`,
        descriptionFr: `Zone d'audit critique pour la sécurité: ${input.auditArea}`,
        points: 3,
        category: "area",
      });
    } else if (HIGH_RISK_AREAS.includes(input.auditArea)) {
      score += 2;
      factors.push({
        id: "high_risk_area",
        description: `High-risk audit area: ${input.auditArea}`,
        descriptionFr: `Zone d'audit à haut risque: ${input.auditArea}`,
        points: 2,
        category: "area",
      });
    } else {
      score += 1;
      factors.push({
        id: "standard_area",
        description: `Standard audit area: ${input.auditArea}`,
        descriptionFr: `Zone d'audit standard: ${input.auditArea}`,
        points: 1,
        category: "area",
      });
    }
  }

  // =========================================================================
  // FACTOR 2: Critical Element Analysis
  // =========================================================================

  if (input.criticalElement) {
    if (CORE_CRITICAL_ELEMENTS.includes(input.criticalElement)) {
      score += 2;
      factors.push({
        id: "core_critical_element",
        description: `Core implementation Critical Element: ${input.criticalElement}`,
        descriptionFr: `Élément critique de mise en œuvre: ${input.criticalElement}`,
        points: 2,
        category: "area",
      });
    } else {
      score += 1;
      factors.push({
        id: "critical_element",
        description: `Critical Element involved: ${input.criticalElement}`,
        descriptionFr: `Élément critique impliqué: ${input.criticalElement}`,
        points: 1,
        category: "area",
      });
    }
  }

  // =========================================================================
  // FACTOR 3: ICAO Reference Type Analysis
  // =========================================================================

  if (input.icaoReference) {
    const refUpper = input.icaoReference.toUpperCase();

    // Check reference type based on content
    if (refUpper.includes("STANDARD") || refUpper.includes("STD") || refUpper.includes("SHALL")) {
      score += 3;
      factors.push({
        id: "icao_standard",
        description: "References ICAO Standard (mandatory requirement)",
        descriptionFr: "Référence à une Norme OACI (exigence obligatoire)",
        points: 3,
        category: "reference",
      });
    } else if (refUpper.includes("ANNEX") && !refUpper.includes("RP") && !refUpper.includes("RECOMMENDED")) {
      score += 2;
      factors.push({
        id: "icao_annex",
        description: "References ICAO Annex provision",
        descriptionFr: "Référence à une disposition d'Annexe OACI",
        points: 2,
        category: "reference",
      });
    } else if (refUpper.includes("PANS") || refUpper.includes("DOC")) {
      score += 2;
      factors.push({
        id: "icao_pans",
        description: "References ICAO PANS/Doc requirement",
        descriptionFr: "Référence à une exigence PANS/Doc OACI",
        points: 2,
        category: "reference",
      });
    } else if (refUpper.includes("RP") || refUpper.includes("RECOMMENDED")) {
      score += 1;
      factors.push({
        id: "icao_recommended",
        description: "References ICAO Recommended Practice",
        descriptionFr: "Référence à une Pratique recommandée OACI",
        points: 1,
        category: "reference",
      });
    } else if (refUpper.includes("GUIDANCE") || refUpper.includes("GM")) {
      // Guidance material - no extra points, just informational
      factors.push({
        id: "icao_guidance",
        description: "References ICAO Guidance Material",
        descriptionFr: "Référence à un Manuel d'orientation OACI",
        points: 0,
        category: "reference",
      });
    }
  }

  // =========================================================================
  // FACTOR 4: Keyword Analysis - CRITICAL
  // =========================================================================

  const criticalMatches = containsKeywords(allText, CRITICAL_KEYWORDS);
  if (criticalMatches.length > 0) {
    const points = Math.min(criticalMatches.length * 2, 4); // Cap at 4 points
    score += points;
    factors.push({
      id: "critical_keywords",
      description: `Critical keywords detected: ${criticalMatches.slice(0, 3).join(", ")}${criticalMatches.length > 3 ? "..." : ""}`,
      descriptionFr: `Mots-clés critiques détectés: ${criticalMatches.slice(0, 3).join(", ")}${criticalMatches.length > 3 ? "..." : ""}`,
      points,
      category: "keyword",
    });
  }

  // =========================================================================
  // FACTOR 5: Keyword Analysis - MAJOR
  // =========================================================================

  const majorMatches = containsKeywords(allText, MAJOR_KEYWORDS);
  if (majorMatches.length > 0 && criticalMatches.length === 0) {
    const points = Math.min(majorMatches.length, 3); // Cap at 3 points
    score += points;
    factors.push({
      id: "major_keywords",
      description: `Major keywords detected: ${majorMatches.slice(0, 3).join(", ")}${majorMatches.length > 3 ? "..." : ""}`,
      descriptionFr: `Mots-clés majeurs détectés: ${majorMatches.slice(0, 3).join(", ")}${majorMatches.length > 3 ? "..." : ""}`,
      points,
      category: "keyword",
    });
  }

  // =========================================================================
  // FACTOR 6: Keyword Analysis - MINOR (reduces score slightly)
  // =========================================================================

  const minorMatches = containsKeywords(allText, MINOR_KEYWORDS);
  if (minorMatches.length > 0 && criticalMatches.length === 0 && majorMatches.length === 0) {
    // Minor keywords don't add points but indicate lower severity
    factors.push({
      id: "minor_keywords",
      description: `Minor severity indicators: ${minorMatches.slice(0, 3).join(", ")}`,
      descriptionFr: `Indicateurs de sévérité mineure: ${minorMatches.slice(0, 3).join(", ")}`,
      points: 0,
      category: "keyword",
    });
  }

  // =========================================================================
  // FACTOR 7: Safety Impact Phrases
  // =========================================================================

  const safetyMatches = containsSafetyImpact(allText);
  if (safetyMatches.length > 0) {
    const points = Math.min(safetyMatches.length * 2, 4); // Cap at 4 points
    score += points;
    factors.push({
      id: "safety_impact",
      description: `Direct safety impact identified: ${safetyMatches.slice(0, 2).join(", ")}`,
      descriptionFr: `Impact direct sur la sécurité identifié: ${safetyMatches.slice(0, 2).join(", ")}`,
      points,
      category: "safety",
    });
  }

  // =========================================================================
  // FACTOR 8: Finding Type Analysis
  // =========================================================================

  if (input.findingType) {
    switch (input.findingType) {
      case "NON_CONFORMITY":
        score += 2;
        factors.push({
          id: "type_non_conformity",
          description: "Finding type: Non-Conformity",
          descriptionFr: "Type de constatation: Non-conformité",
          points: 2,
          category: "type",
        });
        break;
      case "CONCERN":
        score += 1;
        factors.push({
          id: "type_concern",
          description: "Finding type: Concern",
          descriptionFr: "Type de constatation: Préoccupation",
          points: 1,
          category: "type",
        });
        break;
      case "OBSERVATION":
        // Observations typically indicate lower severity
        factors.push({
          id: "type_observation",
          description: "Finding type: Observation",
          descriptionFr: "Type de constatation: Observation",
          points: 0,
          category: "type",
        });
        break;
      case "RECOMMENDATION":
        factors.push({
          id: "type_recommendation",
          description: "Finding type: Recommendation",
          descriptionFr: "Type de constatation: Recommandation",
          points: 0,
          category: "type",
        });
        break;
      case "GOOD_PRACTICE":
        // Good practices are not findings that need severity
        score = 0; // Reset score
        factors.length = 0; // Clear factors
        factors.push({
          id: "type_good_practice",
          description: "Good Practice - no severity applicable",
          descriptionFr: "Bonne pratique - aucune sévérité applicable",
          points: 0,
          category: "type",
        });
        break;
    }
  }

  // =========================================================================
  // FACTOR 9: Repetition Analysis (check for similar previous findings)
  // =========================================================================

  let isRepeat = false;
  let previousOccurrences = 0;

  if (input.organizationId) {
    try {
      // Check for similar findings in the organization
      const similarFindings = await db.finding.findMany({
        where: {
          organizationId: input.organizationId,
          reviewId: { not: input.reviewId }, // Exclude current review
          status: { not: "CLOSED" }, // Only open/in-progress findings
          OR: [
            // Same question
            input.questionId
              ? { questionId: input.questionId }
              : {},
            // Same audit area and similar description
            input.auditArea
              ? {
                  question: {
                    auditArea: input.auditArea,
                  },
                }
              : {},
          ].filter((cond) => Object.keys(cond).length > 0),
        },
        select: { id: true, severity: true, referenceNumber: true },
      });

      previousOccurrences = similarFindings.length;

      if (previousOccurrences > 0) {
        isRepeat = true;
        const points = Math.min(previousOccurrences * 2, 4); // Cap at 4 points
        score += points;
        factors.push({
          id: "repeat_finding",
          description: `Repeat finding: ${previousOccurrences} similar issue(s) found in organization history`,
          descriptionFr: `Constatation répétée: ${previousOccurrences} problème(s) similaire(s) trouvé(s) dans l'historique de l'organisation`,
          points,
          category: "repetition",
        });
      }
    } catch {
      // If database check fails, continue without repetition factor
      console.warn("Could not check for repeat findings");
    }
  }

  // =========================================================================
  // DETERMINE SEVERITY AND CONFIDENCE
  // =========================================================================

  let suggested: FindingSeverity;
  if (input.findingType === "GOOD_PRACTICE") {
    suggested = "OBSERVATION"; // Good practices don't have severity
  } else if (score >= SEVERITY_THRESHOLDS.CRITICAL) {
    suggested = "CRITICAL";
  } else if (score >= SEVERITY_THRESHOLDS.MAJOR) {
    suggested = "MAJOR";
  } else if (score >= SEVERITY_THRESHOLDS.MINOR) {
    suggested = "MINOR";
  } else {
    suggested = "OBSERVATION";
  }

  // Calculate confidence based on number of contributing factors
  const contributingFactors = factors.filter((f) => f.points > 0).length;
  let confidence: "high" | "medium" | "low";
  if (contributingFactors >= CONFIDENCE_THRESHOLDS.HIGH) {
    confidence = "high";
  } else if (contributingFactors >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    suggested,
    confidence,
    factors,
    score,
    isRepeat,
    previousOccurrences,
  };
}

// =============================================================================
// QUICK CALCULATION (without database check)
// =============================================================================

/**
 * Calculate severity suggestion without database lookup (for real-time UI updates)
 * Does not check for repeat findings
 */
export function calculateSeveritySuggestionSync(
  input: Omit<FindingInput, "organizationId" | "reviewId">
): Omit<SeveritySuggestion, "isRepeat" | "previousOccurrences"> {
  // This is a synchronous version for client-side use
  let score = 0;
  const factors: SeverityFactor[] = [];

  const allText = [
    input.descriptionEn || "",
    input.descriptionFr || "",
    input.titleEn || "",
    input.titleFr || "",
  ].join(" ");

  // Audit Area
  if (input.auditArea) {
    if (SAFETY_CRITICAL_AREAS.includes(input.auditArea)) {
      score += 3;
      factors.push({
        id: "safety_critical_area",
        description: `Safety-critical audit area: ${input.auditArea}`,
        descriptionFr: `Zone d'audit critique pour la sécurité: ${input.auditArea}`,
        points: 3,
        category: "area",
      });
    } else if (HIGH_RISK_AREAS.includes(input.auditArea)) {
      score += 2;
      factors.push({
        id: "high_risk_area",
        description: `High-risk audit area: ${input.auditArea}`,
        descriptionFr: `Zone d'audit à haut risque: ${input.auditArea}`,
        points: 2,
        category: "area",
      });
    }
  }

  // Critical Element
  if (input.criticalElement) {
    if (CORE_CRITICAL_ELEMENTS.includes(input.criticalElement)) {
      score += 2;
      factors.push({
        id: "core_critical_element",
        description: `Core Critical Element: ${input.criticalElement}`,
        descriptionFr: `Élément critique principal: ${input.criticalElement}`,
        points: 2,
        category: "area",
      });
    } else {
      score += 1;
      factors.push({
        id: "critical_element",
        description: `Critical Element: ${input.criticalElement}`,
        descriptionFr: `Élément critique: ${input.criticalElement}`,
        points: 1,
        category: "area",
      });
    }
  }

  // Keywords
  const criticalMatches = containsKeywords(allText, CRITICAL_KEYWORDS);
  if (criticalMatches.length > 0) {
    const points = Math.min(criticalMatches.length * 2, 4);
    score += points;
    factors.push({
      id: "critical_keywords",
      description: `Critical keywords: ${criticalMatches.slice(0, 3).join(", ")}`,
      descriptionFr: `Mots-clés critiques: ${criticalMatches.slice(0, 3).join(", ")}`,
      points,
      category: "keyword",
    });
  }

  const majorMatches = containsKeywords(allText, MAJOR_KEYWORDS);
  if (majorMatches.length > 0 && criticalMatches.length === 0) {
    const points = Math.min(majorMatches.length, 3);
    score += points;
    factors.push({
      id: "major_keywords",
      description: `Major keywords: ${majorMatches.slice(0, 3).join(", ")}`,
      descriptionFr: `Mots-clés majeurs: ${majorMatches.slice(0, 3).join(", ")}`,
      points,
      category: "keyword",
    });
  }

  // Safety impact
  const safetyMatches = containsSafetyImpact(allText);
  if (safetyMatches.length > 0) {
    const points = Math.min(safetyMatches.length * 2, 4);
    score += points;
    factors.push({
      id: "safety_impact",
      description: `Safety impact: ${safetyMatches.slice(0, 2).join(", ")}`,
      descriptionFr: `Impact sécurité: ${safetyMatches.slice(0, 2).join(", ")}`,
      points,
      category: "safety",
    });
  }

  // Finding type
  if (input.findingType === "NON_CONFORMITY") {
    score += 2;
    factors.push({
      id: "type_non_conformity",
      description: "Non-Conformity finding",
      descriptionFr: "Constatation de non-conformité",
      points: 2,
      category: "type",
    });
  } else if (input.findingType === "CONCERN") {
    score += 1;
    factors.push({
      id: "type_concern",
      description: "Concern finding",
      descriptionFr: "Constatation de préoccupation",
      points: 1,
      category: "type",
    });
  } else if (input.findingType === "GOOD_PRACTICE") {
    score = 0;
    factors.length = 0;
  }

  // Determine severity
  let suggested: FindingSeverity;
  if (input.findingType === "GOOD_PRACTICE") {
    suggested = "OBSERVATION";
  } else if (score >= SEVERITY_THRESHOLDS.CRITICAL) {
    suggested = "CRITICAL";
  } else if (score >= SEVERITY_THRESHOLDS.MAJOR) {
    suggested = "MAJOR";
  } else if (score >= SEVERITY_THRESHOLDS.MINOR) {
    suggested = "MINOR";
  } else {
    suggested = "OBSERVATION";
  }

  const contributingFactors = factors.filter((f) => f.points > 0).length;
  let confidence: "high" | "medium" | "low";
  if (contributingFactors >= CONFIDENCE_THRESHOLDS.HIGH) {
    confidence = "high";
  } else if (contributingFactors >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    suggested,
    confidence,
    factors,
    score,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: FindingSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "destructive";
    case "MAJOR":
      return "orange";
    case "MINOR":
      return "yellow";
    case "OBSERVATION":
      return "blue";
    default:
      return "secondary";
  }
}

/**
 * Get confidence color for UI display
 */
export function getConfidenceColor(confidence: "high" | "medium" | "low"): string {
  switch (confidence) {
    case "high":
      return "green";
    case "medium":
      return "yellow";
    case "low":
      return "gray";
    default:
      return "gray";
  }
}

/**
 * Get factor category label
 */
export function getFactorCategoryLabel(
  category: SeverityFactor["category"],
  locale: "en" | "fr" = "en"
): string {
  const labels: Record<SeverityFactor["category"], { en: string; fr: string }> = {
    area: { en: "Audit Area", fr: "Zone d'audit" },
    reference: { en: "ICAO Reference", fr: "Référence OACI" },
    keyword: { en: "Keywords", fr: "Mots-clés" },
    repetition: { en: "History", fr: "Historique" },
    safety: { en: "Safety Impact", fr: "Impact sécurité" },
    type: { en: "Finding Type", fr: "Type de constatation" },
  };
  return labels[category][locale];
}
