import { describe, it, expect } from "vitest";
import {
  USOAP_AUDIT_AREAS,
  CRITICAL_ELEMENTS,
  SMS_COMPONENTS,
  CANSO_STUDY_AREAS,
  MATURITY_LEVELS,
  TRANSVERSAL_AREAS,
  ICAO_REFERENCE_TYPES,
  TOTAL_USOAP_PQ_COUNT,
  QUESTIONNAIRE_METADATA,
  getAuditAreasArray,
  getCriticalElementsArray,
  getSMSComponentsArray,
  getStudyAreasArray,
  getStudyAreasByComponent,
  getMaturityLevelsArray,
  getTransversalAreasArray,
  getICAOReferenceTypesArray,
  getMaturityLevelFromScore,
  calculateWeightedSMSScore,
  calculateEIScore,
} from "@/lib/questionnaire/constants";

describe("USOAP Audit Areas", () => {
  it("should have exactly 9 audit areas", () => {
    expect(Object.keys(USOAP_AUDIT_AREAS)).toHaveLength(9);
  });

  it("should include all required audit area codes", () => {
    const expectedCodes = ["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"];
    const actualCodes = Object.keys(USOAP_AUDIT_AREAS);
    expect(actualCodes).toEqual(expect.arrayContaining(expectedCodes));
  });

  it("should have bilingual labels (EN/FR) for all audit areas", () => {
    Object.values(USOAP_AUDIT_AREAS).forEach((area) => {
      expect(area.name).toHaveProperty("en");
      expect(area.name).toHaveProperty("fr");
      expect(area.description).toHaveProperty("en");
      expect(area.description).toHaveProperty("fr");
      expect(area.name.en.length).toBeGreaterThan(0);
      expect(area.name.fr.length).toBeGreaterThan(0);
      expect(area.description.en.length).toBeGreaterThan(0);
      expect(area.description.fr.length).toBeGreaterThan(0);
    });
  });

  it("should have valid pqCount for all areas", () => {
    Object.values(USOAP_AUDIT_AREAS).forEach((area) => {
      expect(area.pqCount).toBeGreaterThan(0);
      expect(Number.isInteger(area.pqCount)).toBe(true);
    });
  });

  it("should sum to 851 total PQs", () => {
    expect(TOTAL_USOAP_PQ_COUNT).toBe(851);
  });

  it("should have unique sortOrder values", () => {
    const sortOrders = Object.values(USOAP_AUDIT_AREAS).map((a) => a.sortOrder);
    const uniqueSortOrders = new Set(sortOrders);
    expect(uniqueSortOrders.size).toBe(sortOrders.length);
  });
});

describe("Critical Elements", () => {
  it("should have exactly 8 critical elements", () => {
    expect(Object.keys(CRITICAL_ELEMENTS)).toHaveLength(8);
  });

  it("should include CE-1 through CE-8", () => {
    const expectedCodes = ["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"];
    const actualCodes = Object.keys(CRITICAL_ELEMENTS);
    expect(actualCodes).toEqual(expect.arrayContaining(expectedCodes));
  });

  it("should have bilingual labels for all critical elements", () => {
    Object.values(CRITICAL_ELEMENTS).forEach((ce) => {
      expect(ce.name).toHaveProperty("en");
      expect(ce.name).toHaveProperty("fr");
      expect(ce.description).toHaveProperty("en");
      expect(ce.description).toHaveProperty("fr");
    });
  });

  it("should have correct number mappings", () => {
    expect(CRITICAL_ELEMENTS.CE_1.number).toBe(1);
    expect(CRITICAL_ELEMENTS.CE_8.number).toBe(8);
  });
});

describe("SMS Components", () => {
  it("should have exactly 4 SMS components", () => {
    expect(Object.keys(SMS_COMPONENTS)).toHaveLength(4);
  });

  it("should include all required component codes", () => {
    const expectedCodes = [
      "SAFETY_POLICY_OBJECTIVES",
      "SAFETY_RISK_MANAGEMENT",
      "SAFETY_ASSURANCE",
      "SAFETY_PROMOTION",
    ];
    const actualCodes = Object.keys(SMS_COMPONENTS);
    expect(actualCodes).toEqual(expect.arrayContaining(expectedCodes));
  });

  it("should have bilingual labels for all components", () => {
    Object.values(SMS_COMPONENTS).forEach((component) => {
      expect(component.name).toHaveProperty("en");
      expect(component.name).toHaveProperty("fr");
      expect(component.description).toHaveProperty("en");
      expect(component.description).toHaveProperty("fr");
    });
  });

  it("should have weights that sum to 1.0", () => {
    const totalWeight = Object.values(SMS_COMPONENTS).reduce(
      (sum, c) => sum + c.weight,
      0
    );
    expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
  });

  it("should have valid component numbers", () => {
    expect(SMS_COMPONENTS.SAFETY_POLICY_OBJECTIVES.number).toBe(1);
    expect(SMS_COMPONENTS.SAFETY_RISK_MANAGEMENT.number).toBe(2);
    expect(SMS_COMPONENTS.SAFETY_ASSURANCE.number).toBe(3);
    expect(SMS_COMPONENTS.SAFETY_PROMOTION.number).toBe(4);
  });
});

describe("CANSO Study Areas", () => {
  it("should have exactly 12 study areas", () => {
    expect(Object.keys(CANSO_STUDY_AREAS)).toHaveLength(12);
  });

  it("should have bilingual labels for all study areas", () => {
    Object.values(CANSO_STUDY_AREAS).forEach((sa) => {
      expect(sa.name).toHaveProperty("en");
      expect(sa.name).toHaveProperty("fr");
      expect(sa.description).toHaveProperty("en");
      expect(sa.description).toHaveProperty("fr");
    });
  });

  it("should have correct component mappings", () => {
    // Component 1: 5 study areas
    const component1Areas = Object.values(CANSO_STUDY_AREAS).filter(
      (sa) => sa.componentNumber === 1
    );
    expect(component1Areas).toHaveLength(5);

    // Component 2: 2 study areas
    const component2Areas = Object.values(CANSO_STUDY_AREAS).filter(
      (sa) => sa.componentNumber === 2
    );
    expect(component2Areas).toHaveLength(2);

    // Component 3: 3 study areas
    const component3Areas = Object.values(CANSO_STUDY_AREAS).filter(
      (sa) => sa.componentNumber === 3
    );
    expect(component3Areas).toHaveLength(3);

    // Component 4: 2 study areas
    const component4Areas = Object.values(CANSO_STUDY_AREAS).filter(
      (sa) => sa.componentNumber === 4
    );
    expect(component4Areas).toHaveLength(2);
  });
});

describe("Maturity Levels", () => {
  it("should have exactly 5 maturity levels", () => {
    expect(Object.keys(MATURITY_LEVELS)).toHaveLength(5);
  });

  it("should include levels A through E", () => {
    const expectedCodes = ["LEVEL_A", "LEVEL_B", "LEVEL_C", "LEVEL_D", "LEVEL_E"];
    const actualCodes = Object.keys(MATURITY_LEVELS);
    expect(actualCodes).toEqual(expect.arrayContaining(expectedCodes));
  });

  it("should have bilingual labels for all levels", () => {
    Object.values(MATURITY_LEVELS).forEach((level) => {
      expect(level.name).toHaveProperty("en");
      expect(level.name).toHaveProperty("fr");
      expect(level.description).toHaveProperty("en");
      expect(level.description).toHaveProperty("fr");
    });
  });

  it("should have scores from 1 to 5", () => {
    expect(MATURITY_LEVELS.LEVEL_A.score).toBe(1);
    expect(MATURITY_LEVELS.LEVEL_B.score).toBe(2);
    expect(MATURITY_LEVELS.LEVEL_C.score).toBe(3);
    expect(MATURITY_LEVELS.LEVEL_D.score).toBe(4);
    expect(MATURITY_LEVELS.LEVEL_E.score).toBe(5);
  });

  it("should have correct level letters", () => {
    expect(MATURITY_LEVELS.LEVEL_A.level).toBe("A");
    expect(MATURITY_LEVELS.LEVEL_E.level).toBe("E");
  });
});

describe("Transversal Areas", () => {
  it("should have exactly 3 transversal areas", () => {
    expect(Object.keys(TRANSVERSAL_AREAS)).toHaveLength(3);
  });

  it("should include SPM, HP, CI", () => {
    expect(TRANSVERSAL_AREAS).toHaveProperty("SPM");
    expect(TRANSVERSAL_AREAS).toHaveProperty("HP");
    expect(TRANSVERSAL_AREAS).toHaveProperty("CI");
  });

  it("should have bilingual labels", () => {
    Object.values(TRANSVERSAL_AREAS).forEach((area) => {
      expect(area.name).toHaveProperty("en");
      expect(area.name).toHaveProperty("fr");
    });
  });
});

describe("ICAO Reference Types", () => {
  it("should have exactly 7 reference types", () => {
    expect(Object.keys(ICAO_REFERENCE_TYPES)).toHaveLength(7);
  });

  it("should include all required types", () => {
    const expectedTypes = ["CC", "STD", "RP", "PANS", "GM", "Cir", "SUPPS"];
    const actualTypes = Object.keys(ICAO_REFERENCE_TYPES);
    expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
  });

  it("should have bilingual labels", () => {
    Object.values(ICAO_REFERENCE_TYPES).forEach((type) => {
      expect(type.name).toHaveProperty("en");
      expect(type.name).toHaveProperty("fr");
    });
  });
});

describe("Questionnaire Metadata", () => {
  it("should have ANS_USOAP_CMA metadata", () => {
    expect(QUESTIONNAIRE_METADATA).toHaveProperty("ANS_USOAP_CMA");
    expect(QUESTIONNAIRE_METADATA.ANS_USOAP_CMA.totalQuestions).toBe(851);
    expect(QUESTIONNAIRE_METADATA.ANS_USOAP_CMA.auditAreas).toBe(9);
    expect(QUESTIONNAIRE_METADATA.ANS_USOAP_CMA.criticalElements).toBe(8);
  });

  it("should have SMS_CANSO_SOE metadata", () => {
    expect(QUESTIONNAIRE_METADATA).toHaveProperty("SMS_CANSO_SOE");
    expect(QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.components).toBe(4);
    expect(QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.studyAreas).toBe(12);
    expect(QUESTIONNAIRE_METADATA.SMS_CANSO_SOE.maturityLevels).toBe(5);
  });
});

describe("Helper Functions", () => {
  describe("getAuditAreasArray", () => {
    it("should return sorted array of audit areas", () => {
      const areas = getAuditAreasArray();
      expect(areas).toHaveLength(9);
      expect(areas[0].code).toBe("LEG");
      expect(areas[8].code).toBe("SSP");
    });
  });

  describe("getCriticalElementsArray", () => {
    it("should return sorted array of critical elements", () => {
      const elements = getCriticalElementsArray();
      expect(elements).toHaveLength(8);
      expect(elements[0].number).toBe(1);
      expect(elements[7].number).toBe(8);
    });
  });

  describe("getSMSComponentsArray", () => {
    it("should return sorted array of SMS components", () => {
      const components = getSMSComponentsArray();
      expect(components).toHaveLength(4);
      expect(components[0].number).toBe(1);
      expect(components[3].number).toBe(4);
    });
  });

  describe("getStudyAreasArray", () => {
    it("should return sorted array of study areas", () => {
      const areas = getStudyAreasArray();
      expect(areas).toHaveLength(12);
      expect(areas[0].sortOrder).toBe(1);
    });
  });

  describe("getStudyAreasByComponent", () => {
    it("should return study areas for component 1", () => {
      const areas = getStudyAreasByComponent(1);
      expect(areas).toHaveLength(5);
      areas.forEach((area) => {
        expect(area.componentNumber).toBe(1);
      });
    });

    it("should return study areas for component 2", () => {
      const areas = getStudyAreasByComponent(2);
      expect(areas).toHaveLength(2);
    });
  });

  describe("getMaturityLevelsArray", () => {
    it("should return sorted array of maturity levels", () => {
      const levels = getMaturityLevelsArray();
      expect(levels).toHaveLength(5);
      expect(levels[0].level).toBe("A");
      expect(levels[4].level).toBe("E");
    });
  });

  describe("getTransversalAreasArray", () => {
    it("should return sorted array of transversal areas", () => {
      const areas = getTransversalAreasArray();
      expect(areas).toHaveLength(3);
    });
  });

  describe("getICAOReferenceTypesArray", () => {
    it("should return sorted array of ICAO reference types", () => {
      const types = getICAOReferenceTypesArray();
      expect(types).toHaveLength(7);
    });
  });

  describe("getMaturityLevelFromScore", () => {
    it("should return LEVEL_A for scores below 1.5", () => {
      expect(getMaturityLevelFromScore(1.0)).toBe("LEVEL_A");
      expect(getMaturityLevelFromScore(1.4)).toBe("LEVEL_A");
    });

    it("should return LEVEL_B for scores 1.5-2.49", () => {
      expect(getMaturityLevelFromScore(1.5)).toBe("LEVEL_B");
      expect(getMaturityLevelFromScore(2.4)).toBe("LEVEL_B");
    });

    it("should return LEVEL_C for scores 2.5-3.49", () => {
      expect(getMaturityLevelFromScore(2.5)).toBe("LEVEL_C");
      expect(getMaturityLevelFromScore(3.4)).toBe("LEVEL_C");
    });

    it("should return LEVEL_D for scores 3.5-4.49", () => {
      expect(getMaturityLevelFromScore(3.5)).toBe("LEVEL_D");
      expect(getMaturityLevelFromScore(4.4)).toBe("LEVEL_D");
    });

    it("should return LEVEL_E for scores 4.5 and above", () => {
      expect(getMaturityLevelFromScore(4.5)).toBe("LEVEL_E");
      expect(getMaturityLevelFromScore(5.0)).toBe("LEVEL_E");
    });
  });

  describe("calculateWeightedSMSScore", () => {
    it("should calculate weighted score correctly", () => {
      const componentScores = {
        SAFETY_POLICY_OBJECTIVES: 4.0,
        SAFETY_RISK_MANAGEMENT: 3.0,
        SAFETY_ASSURANCE: 3.5,
        SAFETY_PROMOTION: 4.5,
      };
      const weighted = calculateWeightedSMSScore(componentScores);
      // 4.0*0.25 + 3.0*0.30 + 3.5*0.25 + 4.5*0.20 = 1.0 + 0.9 + 0.875 + 0.9 = 3.675
      expect(weighted).toBeCloseTo(3.675, 2);
    });

    it("should return 5.0 for all Level E scores", () => {
      const componentScores = {
        SAFETY_POLICY_OBJECTIVES: 5.0,
        SAFETY_RISK_MANAGEMENT: 5.0,
        SAFETY_ASSURANCE: 5.0,
        SAFETY_PROMOTION: 5.0,
      };
      const weighted = calculateWeightedSMSScore(componentScores);
      expect(weighted).toBe(5.0);
    });
  });

  describe("calculateEIScore", () => {
    it("should calculate EI score correctly", () => {
      expect(calculateEIScore(80, 100)).toBe(80);
      expect(calculateEIScore(50, 100)).toBe(50);
      expect(calculateEIScore(0, 100)).toBe(0);
    });

    it("should return 0 when no applicable questions", () => {
      expect(calculateEIScore(0, 0)).toBe(0);
    });

    it("should return 100 for perfect score", () => {
      expect(calculateEIScore(100, 100)).toBe(100);
    });
  });
});
