/**
 * Severity Suggestion Utility (Client-Side)
 *
 * A simplified version of the server-side severity calculator for real-time UI updates.
 * Does not include database checks for repeat findings.
 */

import type {
  FindingType,
  FindingSeverity,
  USOAPAuditArea,
  CriticalElement,
} from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface SeverityInput {
  descriptionEn?: string;
  descriptionFr?: string;
  titleEn?: string;
  titleFr?: string;
  auditArea?: USOAPAuditArea | null;
  criticalElement?: CriticalElement | null;
  icaoReference?: string | null;
  findingType?: FindingType;
}

export interface SeverityFactor {
  id: string;
  description: string;
  descriptionFr: string;
  points: number;
  category: "area" | "reference" | "keyword" | "safety" | "type";
}

export interface SeveritySuggestion {
  suggested: FindingSeverity;
  confidence: "high" | "medium" | "low";
  factors: SeverityFactor[];
  score: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SEVERITY_THRESHOLDS = {
  CRITICAL: 8,
  MAJOR: 5,
  MINOR: 2,
};

const CONFIDENCE_THRESHOLDS = {
  HIGH: 4,
  MEDIUM: 2,
};

const SAFETY_CRITICAL_AREAS: USOAPAuditArea[] = ["ANS", "OPS", "AIR", "AIG"];
const HIGH_RISK_AREAS: USOAPAuditArea[] = ["PEL", "AGA", "SSP"];
const CORE_CRITICAL_ELEMENTS: CriticalElement[] = ["CE_5", "CE_6", "CE_7", "CE_8"];

const CRITICAL_KEYWORDS = [
  "failure", "failed", "unsafe", "incident", "accident", "violation",
  "immediate", "imminent", "danger", "hazard", "critical", "fatal",
  "death", "injury", "collision", "separation", "unauthorized", "loss of",
  "runway incursion", "airprox", "near miss",
  "défaillance", "échec", "dangereux", "incident", "accident", "violation",
  "immédiat", "imminent", "danger", "risque", "critique", "mortel",
  "décès", "blessure", "collision", "séparation", "non autorisé", "perte de",
];

const MAJOR_KEYWORDS = [
  "incomplete", "missing", "non-compliance", "non-conformity", "gap",
  "deficiency", "inadequate", "insufficient", "not implemented",
  "not established", "no evidence", "lack of", "absence", "systematic",
  "repeated", "multiple", "significant", "substantial",
  "incomplet", "manquant", "non-conformité", "écart", "lacune",
  "déficience", "inadéquat", "insuffisant", "non mis en œuvre",
  "non établi", "aucune preuve", "absence de", "systématique",
  "répété", "significatif",
];

const SAFETY_IMPACT_PHRASES = [
  "safety of flight", "air traffic", "aircraft operation", "navigation service",
  "communication failure", "surveillance", "terrain awareness",
  "controlled airspace", "separation minima", "emergency procedure",
  "sécurité des vols", "circulation aérienne", "exploitation des aéronefs",
  "service de navigation", "panne de communication", "surveillance",
  "conscience du terrain", "espace aérien contrôlé", "minima de séparation",
  "procédure d'urgence",
];

// =============================================================================
// HELPERS
// =============================================================================

function containsKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase()));
}

function containsSafetyImpact(text: string): string[] {
  const lowerText = text.toLowerCase();
  return SAFETY_IMPACT_PHRASES.filter((phrase) =>
    lowerText.includes(phrase.toLowerCase())
  );
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export function calculateSeveritySuggestion(input: SeverityInput): SeveritySuggestion {
  let score = 0;
  const factors: SeverityFactor[] = [];

  const allText = [
    input.descriptionEn || "",
    input.descriptionFr || "",
    input.titleEn || "",
    input.titleFr || "",
  ].join(" ");

  // Factor 1: Audit Area
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

  // Factor 2: Critical Element
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

  // Factor 3: ICAO Reference
  if (input.icaoReference) {
    const refUpper = input.icaoReference.toUpperCase();
    if (refUpper.includes("STANDARD") || refUpper.includes("STD") || refUpper.includes("SHALL")) {
      score += 3;
      factors.push({
        id: "icao_standard",
        description: "References ICAO Standard (mandatory)",
        descriptionFr: "Référence à une Norme OACI (obligatoire)",
        points: 3,
        category: "reference",
      });
    } else if (refUpper.includes("ANNEX") && !refUpper.includes("RP")) {
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
    }
  }

  // Factor 4: Critical Keywords
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

  // Factor 5: Major Keywords
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

  // Factor 6: Safety Impact
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

  // Factor 7: Finding Type
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
    // Reset for good practice
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

  // Determine confidence
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
// UI HELPERS
// =============================================================================

export function getConfidenceLabel(confidence: "high" | "medium" | "low", locale: "en" | "fr"): string {
  const labels: Record<string, { en: string; fr: string }> = {
    high: { en: "High confidence", fr: "Confiance élevée" },
    medium: { en: "Medium confidence", fr: "Confiance moyenne" },
    low: { en: "Low confidence", fr: "Confiance faible" },
  };
  return labels[confidence][locale];
}

export function getConfidenceColor(confidence: "high" | "medium" | "low"): string {
  switch (confidence) {
    case "high":
      return "text-green-600 bg-green-50 border-green-200";
    case "medium":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "low":
      return "text-gray-600 bg-gray-50 border-gray-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function getSeverityScore(severity: FindingSeverity): number {
  switch (severity) {
    case "CRITICAL":
      return 4;
    case "MAJOR":
      return 3;
    case "MINOR":
      return 2;
    case "OBSERVATION":
      return 1;
    default:
      return 0;
  }
}
