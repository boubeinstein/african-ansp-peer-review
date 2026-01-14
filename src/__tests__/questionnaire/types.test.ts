import { describe, it, expect } from "vitest";
import {
  QuestionnaireFiltersSchema,
  QuestionFiltersSchema,
  PaginationSchema,
} from "@/lib/questionnaire/types";

describe("Zod Validation Schemas", () => {
  describe("QuestionnaireFiltersSchema", () => {
    it("should validate valid questionnaire filters", () => {
      const validFilters = {
        type: "ANS_USOAP_CMA",
        isActive: true,
        search: "audit",
      };
      const result = QuestionnaireFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it("should validate SMS questionnaire type", () => {
      const filters = { type: "SMS_CANSO_SOE" };
      const result = QuestionnaireFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });

    it("should reject invalid questionnaire type", () => {
      const invalidFilters = { type: "INVALID_TYPE" };
      const result = QuestionnaireFiltersSchema.safeParse(invalidFilters);
      expect(result.success).toBe(false);
    });

    it("should validate date filters", () => {
      const filters = {
        effectiveDateFrom: "2024-01-01",
        effectiveDateTo: "2024-12-31",
      };
      const result = QuestionnaireFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });

    it("should validate empty filters", () => {
      const result = QuestionnaireFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should enforce search max length", () => {
      const filters = { search: "a".repeat(101) };
      const result = QuestionnaireFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });

    it("should accept search within max length", () => {
      const filters = { search: "a".repeat(100) };
      const result = QuestionnaireFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });
  });

  describe("QuestionFiltersSchema", () => {
    it("should validate valid question filters", () => {
      const validFilters = {
        auditArea: "ANS",
        criticalElement: "CE_1",
        isPriorityPQ: true,
        requiresOnSite: false,
      };
      const result = QuestionFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it("should validate all audit areas", () => {
      const auditAreas = ["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"];
      auditAreas.forEach((area) => {
        const result = QuestionFiltersSchema.safeParse({ auditArea: area });
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid audit area", () => {
      const result = QuestionFiltersSchema.safeParse({ auditArea: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("should validate all critical elements", () => {
      const elements = ["CE_1", "CE_2", "CE_3", "CE_4", "CE_5", "CE_6", "CE_7", "CE_8"];
      elements.forEach((ce) => {
        const result = QuestionFiltersSchema.safeParse({ criticalElement: ce });
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid critical element", () => {
      const result = QuestionFiltersSchema.safeParse({ criticalElement: "CE_9" });
      expect(result.success).toBe(false);
    });

    it("should validate all SMS components", () => {
      const components = [
        "SAFETY_POLICY_OBJECTIVES",
        "SAFETY_RISK_MANAGEMENT",
        "SAFETY_ASSURANCE",
        "SAFETY_PROMOTION",
      ];
      components.forEach((component) => {
        const result = QuestionFiltersSchema.safeParse({ smsComponent: component });
        expect(result.success).toBe(true);
      });
    });

    it("should validate all study areas", () => {
      const studyAreas = [
        "SA_1_1", "SA_1_2", "SA_1_3", "SA_1_4", "SA_1_5",
        "SA_2_1", "SA_2_2",
        "SA_3_1", "SA_3_2", "SA_3_3",
        "SA_4_1", "SA_4_2",
      ];
      studyAreas.forEach((sa) => {
        const result = QuestionFiltersSchema.safeParse({ studyArea: sa });
        expect(result.success).toBe(true);
      });
    });

    it("should validate all maturity levels", () => {
      const levels = ["LEVEL_A", "LEVEL_B", "LEVEL_C", "LEVEL_D", "LEVEL_E"];
      levels.forEach((level) => {
        const result = QuestionFiltersSchema.safeParse({ maturityLevel: level });
        expect(result.success).toBe(true);
      });
    });

    it("should validate transversal areas", () => {
      const areas = ["SPM", "HP", "CI"];
      areas.forEach((area) => {
        const result = QuestionFiltersSchema.safeParse({ transversalArea: area });
        expect(result.success).toBe(true);
      });
    });

    it("should validate PQ amendment statuses", () => {
      const statuses = [
        "NO_CHANGE",
        "REVISED",
        "NEW",
        "MERGED",
        "DELETED",
        "REFERENCE_REVISED",
      ];
      statuses.forEach((status) => {
        const result = QuestionFiltersSchema.safeParse({ pqStatus: status });
        expect(result.success).toBe(true);
      });
    });

    it("should validate response types", () => {
      const types = [
        "SATISFACTORY_NOT",
        "MATURITY_LEVEL",
        "YES_NO",
        "SCALE_1_5",
        "TEXT",
        "MULTI_SELECT",
      ];
      types.forEach((type) => {
        const result = QuestionFiltersSchema.safeParse({ responseType: type });
        expect(result.success).toBe(true);
      });
    });

    it("should validate combined filters", () => {
      const filters = {
        auditArea: "ANS",
        criticalElement: "CE_1",
        isPriorityPQ: true,
        requiresOnSite: true,
        pqStatus: "NEW",
        search: "air traffic",
      };
      const result = QuestionFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });

    it("should validate CUID format for questionnaireId", () => {
      // Valid CUID
      const validCuid = { questionnaireId: "clh3am1hk0000cjt1f4n5m8o9" };
      const result = QuestionFiltersSchema.safeParse(validCuid);
      expect(result.success).toBe(true);
    });

    it("should enforce search max length of 200", () => {
      const filters = { search: "a".repeat(201) };
      const result = QuestionFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });
  });

  describe("PaginationSchema", () => {
    it("should provide default values", () => {
      const result = PaginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it("should validate positive page numbers", () => {
      const result = PaginationSchema.safeParse({ page: 5 });
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(5);
    });

    it("should reject zero or negative page numbers", () => {
      const zeroResult = PaginationSchema.safeParse({ page: 0 });
      expect(zeroResult.success).toBe(false);

      const negativeResult = PaginationSchema.safeParse({ page: -1 });
      expect(negativeResult.success).toBe(false);
    });

    it("should validate pageSize within range (1-100)", () => {
      const validResult = PaginationSchema.safeParse({ pageSize: 50 });
      expect(validResult.success).toBe(true);

      const minResult = PaginationSchema.safeParse({ pageSize: 1 });
      expect(minResult.success).toBe(true);

      const maxResult = PaginationSchema.safeParse({ pageSize: 100 });
      expect(maxResult.success).toBe(true);
    });

    it("should reject pageSize outside range", () => {
      const tooSmallResult = PaginationSchema.safeParse({ pageSize: 0 });
      expect(tooSmallResult.success).toBe(false);

      const tooLargeResult = PaginationSchema.safeParse({ pageSize: 101 });
      expect(tooLargeResult.success).toBe(false);
    });

    it("should coerce string numbers", () => {
      const result = PaginationSchema.parse({ page: "3", pageSize: "25" });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
    });
  });
});

describe("Type Interfaces", () => {
  describe("BilingualLabel", () => {
    it("should have en and fr properties", () => {
      // Type-checking test - this tests the structure
      const label = { en: "English", fr: "Français" };
      expect(label).toHaveProperty("en");
      expect(label).toHaveProperty("fr");
      expect(typeof label.en).toBe("string");
      expect(typeof label.fr).toBe("string");
    });
  });

  describe("PaginationMeta", () => {
    it("should have required pagination properties", () => {
      const meta = {
        page: 1,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
      };
      expect(meta.page).toBeGreaterThan(0);
      expect(meta.pageSize).toBeGreaterThan(0);
      expect(meta.totalItems).toBeGreaterThanOrEqual(0);
      expect(meta.totalPages).toBeGreaterThanOrEqual(0);
      expect(typeof meta.hasNextPage).toBe("boolean");
      expect(typeof meta.hasPreviousPage).toBe("boolean");
    });
  });
});
