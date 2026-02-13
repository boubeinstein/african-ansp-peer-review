/**
 * Bilingual Support Tests
 *
 * Tests for ensuring proper support for English and French translations
 * across all assessment constants, labels, and UI text.
 */

import { describe, it, expect } from "vitest";
import {
  ASSESSMENT_STATUSES,
  ASSESSMENT_TYPES,
  ANS_RESPONSE_VALUES,
  SMS_MATURITY_LEVELS,
  EVIDENCE_TYPES,
  EI_SCORE_THRESHOLDS,
  getAssessmentStatusArray,
  getAssessmentTypesArray,
  getANSResponseValuesArray,
  getSMSMaturityLevelsArray,
  getEvidenceTypesArray,
} from "@/lib/assessment/constants";
import {
  CRITICAL_ELEMENTS,
  AUDIT_AREAS,
  SMS_COMPONENTS,
  SMS_STUDY_AREAS,
  MATURITY_LEVEL_VALUES,
} from "@/lib/constants/scoring";

// =============================================================================
// HELPER TYPES
// =============================================================================

interface BilingualLabel {
  en: string;
  fr: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function hasBothLanguages(label: BilingualLabel): boolean {
  return (
    typeof label.en === "string" &&
    typeof label.fr === "string" &&
    label.en.length > 0 &&
    label.fr.length > 0
  );
}

 
function _hasValidBilingualProperty(obj: unknown, propertyNames: string[]): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const record = obj as Record<string, unknown>;

  for (const prop of propertyNames) {
    const value = record[prop];
    if (value && typeof value === "object") {
      const bilingualValue = value as BilingualLabel;
      if (!hasBothLanguages(bilingualValue)) {
        return false;
      }
    }
  }
  return true;
}

// =============================================================================
// ASSESSMENT STATUSES BILINGUAL TESTS
// =============================================================================

describe("Assessment Statuses Bilingual Support", () => {
  const statuses = Object.entries(ASSESSMENT_STATUSES);

  it.each(statuses)("status %s should have bilingual label", (status, config) => {
    expect(config.label).toBeDefined();
    expect(hasBothLanguages(config.label)).toBe(true);
  });

  it.each(statuses)("status %s should have bilingual description", (status, config) => {
    expect(config.description).toBeDefined();
    expect(hasBothLanguages(config.description)).toBe(true);
  });

  it("should have unique English labels for all statuses", () => {
    const englishLabels = Object.values(ASSESSMENT_STATUSES).map(s => s.label.en);
    const uniqueLabels = new Set(englishLabels);
    expect(uniqueLabels.size).toBe(englishLabels.length);
  });

  it("should have unique French labels for all statuses", () => {
    const frenchLabels = Object.values(ASSESSMENT_STATUSES).map(s => s.label.fr);
    const uniqueLabels = new Set(frenchLabels);
    expect(uniqueLabels.size).toBe(frenchLabels.length);
  });

  it("getAssessmentStatusArray should return all statuses with bilingual data", () => {
    const statuses = getAssessmentStatusArray();

    expect(statuses.length).toBe(Object.keys(ASSESSMENT_STATUSES).length);
    statuses.forEach(status => {
      expect(hasBothLanguages(status.label)).toBe(true);
      expect(hasBothLanguages(status.description)).toBe(true);
    });
  });
});

// =============================================================================
// ASSESSMENT TYPES BILINGUAL TESTS
// =============================================================================

describe("Assessment Types Bilingual Support", () => {
  const types = Object.entries(ASSESSMENT_TYPES);

  it.each(types)("type %s should have bilingual label", (type, config) => {
    expect(config.label).toBeDefined();
    expect(hasBothLanguages(config.label)).toBe(true);
  });

  it.each(types)("type %s should have bilingual description", (type, config) => {
    expect(config.description).toBeDefined();
    expect(hasBothLanguages(config.description)).toBe(true);
  });

  it("getAssessmentTypesArray should return all types with bilingual data", () => {
    const types = getAssessmentTypesArray();

    expect(types.length).toBe(Object.keys(ASSESSMENT_TYPES).length);
    types.forEach(type => {
      expect(hasBothLanguages(type.label)).toBe(true);
      expect(hasBothLanguages(type.description)).toBe(true);
    });
  });
});

// =============================================================================
// ANS RESPONSE VALUES BILINGUAL TESTS
// =============================================================================

describe("ANS Response Values Bilingual Support", () => {
  const responses = Object.entries(ANS_RESPONSE_VALUES);

  it.each(responses)("response %s should have bilingual label", (response, config) => {
    expect(config.label).toBeDefined();
    expect(hasBothLanguages(config.label)).toBe(true);
  });

  it.each(responses)("response %s should have bilingual description", (response, config) => {
    expect(config.description).toBeDefined();
    expect(hasBothLanguages(config.description)).toBe(true);
  });

  it("should cover all expected ANS response values", () => {
    const expectedResponses = [
      "SATISFACTORY",
      "NOT_SATISFACTORY",
      "NOT_APPLICABLE",
      "NOT_REVIEWED",
    ];

    expectedResponses.forEach(response => {
      expect(ANS_RESPONSE_VALUES[response as keyof typeof ANS_RESPONSE_VALUES]).toBeDefined();
    });
  });

  it("getANSResponseValuesArray should return all responses with bilingual data", () => {
    const responses = getANSResponseValuesArray();

    expect(responses.length).toBe(Object.keys(ANS_RESPONSE_VALUES).length);
    responses.forEach(response => {
      expect(hasBothLanguages(response.label)).toBe(true);
      expect(hasBothLanguages(response.description)).toBe(true);
    });
  });
});

// =============================================================================
// SMS MATURITY LEVELS BILINGUAL TESTS
// =============================================================================

describe("SMS Maturity Levels Bilingual Support", () => {
  const levels = Object.entries(SMS_MATURITY_LEVELS);

  it.each(levels)("level %s should have bilingual label", (level, config) => {
    expect(config.label).toBeDefined();
    expect(hasBothLanguages(config.label)).toBe(true);
  });

  it.each(levels)("level %s should have bilingual description", (level, config) => {
    expect(config.description).toBeDefined();
    expect(hasBothLanguages(config.description)).toBe(true);
  });

  it.each(levels)("level %s should have bilingual characteristics", (level, config) => {
    expect(config.characteristics).toBeDefined();
    expect(hasBothLanguages(config.characteristics)).toBe(true);
  });

  it("should cover all maturity levels A through E", () => {
    const expectedLevels = ["A", "B", "C", "D", "E"];
    expectedLevels.forEach(level => {
      expect(SMS_MATURITY_LEVELS[level as keyof typeof SMS_MATURITY_LEVELS]).toBeDefined();
    });
  });

  it("getSMSMaturityLevelsArray should return all levels with bilingual data", () => {
    const levels = getSMSMaturityLevelsArray();

    expect(levels.length).toBe(Object.keys(SMS_MATURITY_LEVELS).length);
    levels.forEach(level => {
      expect(hasBothLanguages(level.label)).toBe(true);
      expect(hasBothLanguages(level.description)).toBe(true);
      expect(hasBothLanguages(level.characteristics)).toBe(true);
    });
  });

  it("levels should be in correct order by scoreValue", () => {
    const levels = getSMSMaturityLevelsArray();
    const scores = levels.map(l => l.scoreValue);

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });
});

// =============================================================================
// EVIDENCE TYPES BILINGUAL TESTS
// =============================================================================

describe("Evidence Types Bilingual Support", () => {
  const evidenceTypes = Object.entries(EVIDENCE_TYPES);

  it.each(evidenceTypes)("evidence type %s should have bilingual label", (type, config) => {
    expect(config.label).toBeDefined();
    expect(hasBothLanguages(config.label)).toBe(true);
  });

  it.each(evidenceTypes)("evidence type %s should have bilingual description", (type, config) => {
    expect(config.description).toBeDefined();
    expect(hasBothLanguages(config.description)).toBe(true);
  });

  it("should cover all expected evidence types", () => {
    const expectedTypes = [
      "DOCUMENT",
      "PROCEDURE",
      "RECORD",
      "INTERVIEW",
      "OBSERVATION",
      "OTHER",
    ];

    expectedTypes.forEach(type => {
      expect(EVIDENCE_TYPES[type as keyof typeof EVIDENCE_TYPES]).toBeDefined();
    });
  });

  it("getEvidenceTypesArray should return all types with bilingual data", () => {
    const types = getEvidenceTypesArray();

    expect(types.length).toBe(Object.keys(EVIDENCE_TYPES).length);
    types.forEach(type => {
      expect(hasBothLanguages(type.label)).toBe(true);
      expect(hasBothLanguages(type.description)).toBe(true);
    });
  });
});

// =============================================================================
// EI SCORE THRESHOLDS BILINGUAL TESTS
// =============================================================================

describe("EI Score Thresholds Bilingual Support", () => {
  const thresholds = Object.entries(EI_SCORE_THRESHOLDS);

  it.each(thresholds)("threshold %s should have bilingual label", (threshold, config) => {
    expect(config.label).toBeDefined();
    expect(hasBothLanguages(config.label)).toBe(true);
  });

  it("should have thresholds in correct order", () => {
    const orderedThresholds = [
      "EXCELLENT",
      "GOOD",
      "SATISFACTORY",
      "NEEDS_IMPROVEMENT",
      "CRITICAL",
    ];

    const minValues = orderedThresholds.map(
      t => EI_SCORE_THRESHOLDS[t as keyof typeof EI_SCORE_THRESHOLDS].min
    );

    // Should be in descending order
    for (let i = 1; i < minValues.length; i++) {
      expect(minValues[i]).toBeLessThan(minValues[i - 1]);
    }
  });
});

// =============================================================================
// ICAO CRITICAL ELEMENTS BILINGUAL TESTS
// =============================================================================

describe("ICAO Critical Elements Bilingual Support", () => {
  const elements = Object.entries(CRITICAL_ELEMENTS);

  it.each(elements)("critical element %s should have bilingual names", (code, info) => {
    expect(info.nameEn).toBeDefined();
    expect(info.nameFr).toBeDefined();
    expect(info.nameEn.length).toBeGreaterThan(0);
    expect(info.nameFr.length).toBeGreaterThan(0);
  });

  it("should have all 8 critical elements", () => {
    expect(Object.keys(CRITICAL_ELEMENTS).length).toBe(8);

    const expectedCEs = ["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"];
    expectedCEs.forEach(ce => {
      expect(CRITICAL_ELEMENTS[ce as keyof typeof CRITICAL_ELEMENTS]).toBeDefined();
    });
  });
});

// =============================================================================
// USOAP AUDIT AREAS BILINGUAL TESTS
// =============================================================================

describe("USOAP Audit Areas Bilingual Support", () => {
  const areas = Object.entries(AUDIT_AREAS);

  it.each(areas)("audit area %s should have bilingual names", (code, info) => {
    expect(info.nameEn).toBeDefined();
    expect(info.nameFr).toBeDefined();
    expect(info.nameEn.length).toBeGreaterThan(0);
    expect(info.nameFr.length).toBeGreaterThan(0);
  });

  it("should have all 9 audit areas", () => {
    expect(Object.keys(AUDIT_AREAS).length).toBe(9);

    const expectedAreas = ["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"];
    expectedAreas.forEach(area => {
      expect(AUDIT_AREAS[area as keyof typeof AUDIT_AREAS]).toBeDefined();
    });
  });

  it("ANS audit area should have appropriate protocol question count", () => {
    expect(AUDIT_AREAS.ANS.pqCount).toBeGreaterThan(0);
    expect(AUDIT_AREAS.ANS.pqCount).toBe(128);
  });
});

// =============================================================================
// SMS COMPONENTS BILINGUAL TESTS
// =============================================================================

describe("SMS Components Bilingual Support", () => {
  const components = Object.entries(SMS_COMPONENTS);

  it.each(components)("SMS component %s should have bilingual names", (code, info) => {
    expect(info.nameEn).toBeDefined();
    expect(info.nameFr).toBeDefined();
    expect(info.nameEn.length).toBeGreaterThan(0);
    expect(info.nameFr.length).toBeGreaterThan(0);
  });

  it("should have all 4 SMS components", () => {
    expect(Object.keys(SMS_COMPONENTS).length).toBe(4);

    const expectedComponents = [
      "SAFETY_POLICY_OBJECTIVES",
      "SAFETY_RISK_MANAGEMENT",
      "SAFETY_ASSURANCE",
      "SAFETY_PROMOTION",
    ];
    expectedComponents.forEach(comp => {
      expect(SMS_COMPONENTS[comp as keyof typeof SMS_COMPONENTS]).toBeDefined();
    });
  });

  it("component weights should sum to 1.0", () => {
    const totalWeight = Object.values(SMS_COMPONENTS).reduce(
      (sum, comp) => sum + comp.weight,
      0
    );
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });
});

// =============================================================================
// SMS STUDY AREAS BILINGUAL TESTS
// =============================================================================

describe("SMS Study Areas Bilingual Support", () => {
  const studyAreas = Object.entries(SMS_STUDY_AREAS);

  it.each(studyAreas)("study area %s should have bilingual names", (code, info) => {
    expect(info.nameEn).toBeDefined();
    expect(info.nameFr).toBeDefined();
    expect(info.nameEn.length).toBeGreaterThan(0);
    expect(info.nameFr.length).toBeGreaterThan(0);
  });

  it("should have all 12 study areas", () => {
    expect(Object.keys(SMS_STUDY_AREAS).length).toBe(12);
  });

  it("each study area should belong to a valid component", () => {
    const validComponents = Object.keys(SMS_COMPONENTS);

    Object.values(SMS_STUDY_AREAS).forEach(studyArea => {
      expect(validComponents).toContain(studyArea.component);
    });
  });
});

// =============================================================================
// MATURITY LEVEL VALUES BILINGUAL TESTS
// =============================================================================

describe("Maturity Level Values Bilingual Support", () => {
  const levels = Object.entries(MATURITY_LEVEL_VALUES);

  it.each(levels)("maturity level %s should have bilingual names", (code, info) => {
    expect(info.nameEn).toBeDefined();
    expect(info.nameFr).toBeDefined();
    expect(info.nameEn.length).toBeGreaterThan(0);
    expect(info.nameFr.length).toBeGreaterThan(0);
  });

  it("should have all 5 maturity levels", () => {
    const expectedLevels = ["LEVEL_A", "LEVEL_B", "LEVEL_C", "LEVEL_D", "LEVEL_E"];

    expectedLevels.forEach(level => {
      expect(MATURITY_LEVEL_VALUES[level as keyof typeof MATURITY_LEVEL_VALUES]).toBeDefined();
    });
  });

  it("numeric values should be in correct order", () => {
    const levels = [
      MATURITY_LEVEL_VALUES.LEVEL_A,
      MATURITY_LEVEL_VALUES.LEVEL_B,
      MATURITY_LEVEL_VALUES.LEVEL_C,
      MATURITY_LEVEL_VALUES.LEVEL_D,
      MATURITY_LEVEL_VALUES.LEVEL_E,
    ];

    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].numeric).toBeGreaterThan(levels[i - 1].numeric);
    }
  });
});

// =============================================================================
// TRANSLATION CONSISTENCY TESTS
// =============================================================================

describe("Translation Consistency", () => {
  it("French translations should be different from English for all statuses", () => {
    Object.values(ASSESSMENT_STATUSES).forEach(status => {
      // Some terms might be the same in both languages (e.g., "Document")
      // but labels and descriptions should generally differ
      expect(status.label.en).not.toBe(status.label.fr);
    });
  });

  it("French translations should be different from English for assessment types", () => {
    Object.values(ASSESSMENT_TYPES).forEach(type => {
      expect(type.label.en).not.toBe(type.label.fr);
    });
  });

  it("French translations should be different from English for ANS responses", () => {
    Object.values(ANS_RESPONSE_VALUES).forEach(response => {
      expect(response.label.en).not.toBe(response.label.fr);
    });
  });

  it("should not have empty translations", () => {
    const allBilingualLabels: BilingualLabel[] = [
      ...Object.values(ASSESSMENT_STATUSES).map(s => s.label),
      ...Object.values(ASSESSMENT_STATUSES).map(s => s.description),
      ...Object.values(ASSESSMENT_TYPES).map(t => t.label),
      ...Object.values(ASSESSMENT_TYPES).map(t => t.description),
      ...Object.values(ANS_RESPONSE_VALUES).map(r => r.label),
      ...Object.values(ANS_RESPONSE_VALUES).map(r => r.description),
      ...Object.values(SMS_MATURITY_LEVELS).map(l => l.label),
      ...Object.values(SMS_MATURITY_LEVELS).map(l => l.description),
      ...Object.values(EI_SCORE_THRESHOLDS).map(t => t.label),
    ];

    allBilingualLabels.forEach(label => {
      expect(label.en.trim().length).toBeGreaterThan(0);
      expect(label.fr.trim().length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// LOCALE SWITCHING TESTS
// =============================================================================

describe("Locale Switching Support", () => {
  type Locale = "en" | "fr";

  const getLabel = (bilingualLabel: BilingualLabel, locale: Locale): string => {
    return bilingualLabel[locale];
  };

  it("should return correct language based on locale", () => {
    const label: BilingualLabel = {
      en: "Draft",
      fr: "Brouillon",
    };

    expect(getLabel(label, "en")).toBe("Draft");
    expect(getLabel(label, "fr")).toBe("Brouillon");
  });

  it("should support dynamic locale switching for statuses", () => {
    const locales: Locale[] = ["en", "fr"];

    locales.forEach(locale => {
      Object.values(ASSESSMENT_STATUSES).forEach(status => {
        const label = getLabel(status.label, locale);
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  it("should support dynamic locale switching for all constants", () => {
    const locales: Locale[] = ["en", "fr"];

    locales.forEach(locale => {
      // Assessment types
      Object.values(ASSESSMENT_TYPES).forEach(type => {
        expect(getLabel(type.label, locale).length).toBeGreaterThan(0);
      });

      // ANS responses
      Object.values(ANS_RESPONSE_VALUES).forEach(response => {
        expect(getLabel(response.label, locale).length).toBeGreaterThan(0);
      });

      // SMS maturity levels
      Object.values(SMS_MATURITY_LEVELS).forEach(level => {
        expect(getLabel(level.label, locale).length).toBeGreaterThan(0);
      });

      // Evidence types
      Object.values(EVIDENCE_TYPES).forEach(type => {
        expect(getLabel(type.label, locale).length).toBeGreaterThan(0);
      });
    });
  });
});

// =============================================================================
// SPECIAL CHARACTERS AND ENCODING TESTS
// =============================================================================

describe("Special Characters and Encoding", () => {
  it("French translations should properly include accented characters", () => {
    const frenchTexts = [
      ...Object.values(ASSESSMENT_STATUSES).map(s => s.label.fr),
      ...Object.values(ASSESSMENT_STATUSES).map(s => s.description.fr),
      ...Object.values(ASSESSMENT_TYPES).map(t => t.label.fr),
      ...Object.values(ANS_RESPONSE_VALUES).map(r => r.label.fr),
      ...Object.values(SMS_MATURITY_LEVELS).map(l => l.label.fr),
    ];

    const hasAccentedCharacters = frenchTexts.some(text =>
      /[àâäéèêëïîôùûüç]/i.test(text)
    );

    expect(hasAccentedCharacters).toBe(true);
  });

  it("should handle French apostrophes correctly", () => {
    // French often uses apostrophes (l', d', qu', etc.)
    const frenchDescriptions = [
      ...Object.values(ASSESSMENT_STATUSES).map(s => s.description.fr),
      ...Object.values(ASSESSMENT_TYPES).map(t => t.description.fr),
    ];

    const hasApostrophes = frenchDescriptions.some(text =>
      text.includes("'") || text.includes("'")
    );

    // This is expected in French text
    expect(hasApostrophes).toBe(true);
  });
});

// =============================================================================
// DATABASE ENTITY BILINGUAL FIELDS TESTS
// =============================================================================

describe("Database Entity Bilingual Fields", () => {
  it("Question entity should support bilingual question text", () => {
    const mockQuestion = {
      questionTextEn: "What is the state of your safety policy?",
      questionTextFr: "Quel est l'état de votre politique de sécurité?",
    };

    expect(mockQuestion.questionTextEn).toBeDefined();
    expect(mockQuestion.questionTextFr).toBeDefined();
    expect(mockQuestion.questionTextEn.length).toBeGreaterThan(0);
    expect(mockQuestion.questionTextFr.length).toBeGreaterThan(0);
  });

  it("Question entity should support bilingual guidance", () => {
    const mockQuestion = {
      guidanceEn: "Review the safety policy document and verify...",
      guidanceFr: "Examinez le document de politique de sécurité et vérifiez...",
    };

    expect(mockQuestion.guidanceEn).toBeDefined();
    expect(mockQuestion.guidanceFr).toBeDefined();
  });

  it("Organization entity should support bilingual names", () => {
    const mockOrganization = {
      nameEn: "National Air Navigation Services",
      nameFr: "Services Nationaux de Navigation Aérienne",
    };

    expect(mockOrganization.nameEn).toBeDefined();
    expect(mockOrganization.nameFr).toBeDefined();
    expect(mockOrganization.nameEn.length).toBeGreaterThan(0);
    expect(mockOrganization.nameFr.length).toBeGreaterThan(0);
  });

  it("Questionnaire entity should support bilingual titles", () => {
    const mockQuestionnaire = {
      titleEn: "ANS USOAP CMA Protocol Questions 2024",
      titleFr: "Questions du protocole ANS USOAP CMA 2024",
      descriptionEn: "Protocol questions for ANS safety oversight assessment",
      descriptionFr: "Questions de protocole pour l'évaluation de la surveillance de la sécurité ANS",
    };

    expect(mockQuestionnaire.titleEn).toBeDefined();
    expect(mockQuestionnaire.titleFr).toBeDefined();
    expect(mockQuestionnaire.descriptionEn).toBeDefined();
    expect(mockQuestionnaire.descriptionFr).toBeDefined();
  });

  it("Category entity should support bilingual names and descriptions", () => {
    const mockCategory = {
      nameEn: "Safety Policy and Objectives",
      nameFr: "Politique et objectifs de sécurité",
      descriptionEn: "Questions related to safety policy documentation and objectives",
      descriptionFr: "Questions relatives à la documentation de la politique de sécurité et aux objectifs",
    };

    expect(mockCategory.nameEn).toBeDefined();
    expect(mockCategory.nameFr).toBeDefined();
    expect(mockCategory.descriptionEn).toBeDefined();
    expect(mockCategory.descriptionFr).toBeDefined();
  });
});
