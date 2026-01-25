import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ChecklistValidationService } from "../checklist-validation.service";
import { prisma } from "@/lib/db";
import type { DocumentStatus, DocumentCategory } from "@prisma/client";

// Mock the database
vi.mock("@/lib/db", () => ({
  prisma: {
    document: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    finding: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    fieldworkChecklistItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    review: {
      findUnique: vi.fn(),
    },
    reviewReport: {
      findFirst: vi.fn(),
    },
  },
}));

describe("ChecklistValidationService", () => {
  let service: ChecklistValidationService;
  const mockReviewId = "review-123";

  beforeEach(() => {
    service = new ChecklistValidationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // NULL RULES (Manual Items)
  // ─────────────────────────────────────────────────────────────────

  describe("validateItem with null rules", () => {
    it("should return valid for items with no validation rules", async () => {
      const result = await service.validateItem(mockReviewId, "MANUAL_ITEM", null);

      expect(result).toEqual({
        isValid: true,
        canComplete: true,
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DOCUMENT_EXISTS Validation
  // ─────────────────────────────────────────────────────────────────

  describe("DOCUMENT_EXISTS validation", () => {
    const documentExistsRule = {
      type: "DOCUMENT_EXISTS" as const,
      category: "PRE_VISIT_REQUEST" as DocumentCategory,
      minCount: 1,
      requiredStatus: ["UPLOADED", "REVIEWED", "APPROVED"] as DocumentStatus[],
    };

    it("should return valid when required documents exist", async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(2);

      const result = await service.validateItem(
        mockReviewId,
        "PRE_DOC_REQUEST_SENT",
        documentExistsRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
      expect(prisma.document.count).toHaveBeenCalledWith({
        where: {
          reviewId: mockReviewId,
          category: "PRE_VISIT_REQUEST",
          isDeleted: false,
          status: { in: ["UPLOADED", "REVIEWED", "APPROVED"] },
        },
      });
    });

    it("should return invalid when no documents exist", async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(0);

      const result = await service.validateItem(
        mockReviewId,
        "PRE_DOC_REQUEST_SENT",
        documentExistsRule
      );

      expect(result.isValid).toBe(false);
      expect(result.canComplete).toBe(false);
      expect(result.reason).toContain("Requires at least 1");
      expect(result.details).toEqual({
        required: 1,
        current: 0,
      });
    });

    it("should return invalid when document count is below minimum", async () => {
      const ruleWithHigherMin = {
        ...documentExistsRule,
        minCount: 3,
      };
      vi.mocked(prisma.document.count).mockResolvedValue(2);

      const result = await service.validateItem(
        mockReviewId,
        "PRE_DOC_REQUEST_SENT",
        ruleWithHigherMin
      );

      expect(result.isValid).toBe(false);
      expect(result.details).toEqual({
        required: 3,
        current: 2,
      });
    });

    it("should work without requiredStatus filter", async () => {
      const ruleWithoutStatus = {
        type: "DOCUMENT_EXISTS" as const,
        category: "EVIDENCE" as DocumentCategory,
        minCount: 1,
      };
      vi.mocked(prisma.document.count).mockResolvedValue(1);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_FACILITIES",
        ruleWithoutStatus
      );

      expect(result.isValid).toBe(true);
      expect(prisma.document.count).toHaveBeenCalledWith({
        where: {
          reviewId: mockReviewId,
          category: "EVIDENCE",
          isDeleted: false,
        },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DOCUMENTS_REVIEWED Validation
  // ─────────────────────────────────────────────────────────────────

  describe("DOCUMENTS_REVIEWED validation", () => {
    const documentsReviewedRule = {
      type: "DOCUMENTS_REVIEWED" as const,
      category: "HOST_SUBMISSION" as DocumentCategory,
      allMustBeReviewed: true,
    };

    it("should return valid when all documents are reviewed", async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        { id: "doc-1", status: "REVIEWED", name: "doc1.pdf" },
        { id: "doc-2", status: "APPROVED", name: "doc2.pdf" },
      ] as never);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_DOC_REVIEW",
        documentsReviewedRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
    });

    it("should return invalid when some documents are not reviewed", async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        { id: "doc-1", status: "REVIEWED", name: "doc1.pdf" },
        { id: "doc-2", status: "UPLOADED", name: "doc2.pdf" },
        { id: "doc-3", status: "UNDER_REVIEW", name: "doc3.pdf" },
      ] as never);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_DOC_REVIEW",
        documentsReviewedRule
      );

      expect(result.isValid).toBe(false);
      expect(result.canComplete).toBe(false);
      expect(result.reason).toContain("2 document(s) still need review");
      expect(result.details?.missing).toEqual(["doc2.pdf", "doc3.pdf"]);
    });

    it("should return invalid when no documents exist to review", async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_DOC_REVIEW",
        documentsReviewedRule
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("No HOST_SUBMISSION documents found");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // FINDINGS_EXIST Validation
  // ─────────────────────────────────────────────────────────────────

  describe("FINDINGS_EXIST validation", () => {
    const findingsExistRule = {
      type: "FINDINGS_EXIST" as const,
      minCount: 1,
      statusRequired: ["OPEN", "CAP_REQUIRED"],
    };

    it("should return valid when findings exist with required status", async () => {
      vi.mocked(prisma.finding.count).mockResolvedValue(3);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_FINDINGS_DISCUSSED",
        findingsExistRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
      expect(prisma.finding.count).toHaveBeenCalledWith({
        where: {
          reviewId: mockReviewId,
          status: { in: ["OPEN", "CAP_REQUIRED"] },
        },
      });
    });

    it("should return invalid when no findings exist", async () => {
      vi.mocked(prisma.finding.count).mockResolvedValue(0);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_FINDINGS_DISCUSSED",
        findingsExistRule
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("Requires at least 1 finding(s)");
    });

    it("should work without statusRequired filter", async () => {
      const ruleWithoutStatus = {
        type: "FINDINGS_EXIST" as const,
        minCount: 1,
      };
      vi.mocked(prisma.finding.count).mockResolvedValue(5);

      const result = await service.validateItem(
        mockReviewId,
        "POST_FINDINGS_ENTERED",
        ruleWithoutStatus
      );

      expect(result.isValid).toBe(true);
      expect(prisma.finding.count).toHaveBeenCalledWith({
        where: { reviewId: mockReviewId },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // FINDINGS_HAVE_EVIDENCE Validation
  // ─────────────────────────────────────────────────────────────────

  describe("FINDINGS_HAVE_EVIDENCE validation", () => {
    const findingsHaveEvidenceRule = {
      type: "FINDINGS_HAVE_EVIDENCE" as const,
      allFindingsMustHaveEvidence: true,
    };

    it("should return valid when all findings have evidence", async () => {
      vi.mocked(prisma.finding.findMany).mockResolvedValue([
        { id: "finding-1", documents: [{ id: "doc-1" }] },
        { id: "finding-2", documents: [{ id: "doc-2" }, { id: "doc-3" }] },
      ] as never);

      const result = await service.validateItem(
        mockReviewId,
        "POST_EVIDENCE_UPLOADED",
        findingsHaveEvidenceRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
    });

    it("should return invalid when some findings lack evidence", async () => {
      vi.mocked(prisma.finding.findMany).mockResolvedValue([
        { id: "finding-1", documents: [{ id: "doc-1" }] },
        { id: "finding-2", documents: [] },
        { id: "finding-3", documents: [] },
      ] as never);

      const result = await service.validateItem(
        mockReviewId,
        "POST_EVIDENCE_UPLOADED",
        findingsHaveEvidenceRule
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("2 finding(s) missing evidence");
      expect(result.details).toEqual({
        required: 3,
        current: 1,
      });
    });

    it("should return valid when no findings exist (nothing to validate)", async () => {
      vi.mocked(prisma.finding.findMany).mockResolvedValue([]);

      const result = await service.validateItem(
        mockReviewId,
        "POST_EVIDENCE_UPLOADED",
        findingsHaveEvidenceRule
      );

      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("No findings to validate");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PREREQUISITE_ITEMS Validation
  // ─────────────────────────────────────────────────────────────────

  describe("PREREQUISITE_ITEMS validation", () => {
    const prerequisiteItemsRule = {
      type: "PREREQUISITE_ITEMS" as const,
      requiredItems: [
        "SITE_OPENING_MEETING",
        "SITE_INTERVIEWS",
        "SITE_FACILITIES",
      ],
    };

    it("should return valid when all prerequisite items are completed", async () => {
      vi.mocked(prisma.fieldworkChecklistItem.findMany).mockResolvedValue([
        { itemCode: "SITE_OPENING_MEETING", isCompleted: true, isOverridden: false, labelEn: "Opening meeting" },
        { itemCode: "SITE_INTERVIEWS", isCompleted: true, isOverridden: false, labelEn: "Interviews" },
        { itemCode: "SITE_FACILITIES", isCompleted: false, isOverridden: true, labelEn: "Facilities" },
      ] as never);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_CLOSING_MEETING",
        prerequisiteItemsRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
    });

    it("should return invalid when some prerequisites are incomplete", async () => {
      vi.mocked(prisma.fieldworkChecklistItem.findMany).mockResolvedValue([
        { itemCode: "SITE_OPENING_MEETING", isCompleted: true, isOverridden: false, labelEn: "Opening meeting" },
        { itemCode: "SITE_INTERVIEWS", isCompleted: false, isOverridden: false, labelEn: "Staff interviews completed" },
        { itemCode: "SITE_FACILITIES", isCompleted: false, isOverridden: false, labelEn: "Facilities inspection completed" },
      ] as never);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_CLOSING_MEETING",
        prerequisiteItemsRule
      );

      expect(result.isValid).toBe(false);
      expect(result.canComplete).toBe(false);
      expect(result.reason).toContain("Complete prerequisite items first");
      expect(result.reason).toContain("Staff interviews completed");
      expect(result.details?.missing).toEqual(["SITE_INTERVIEWS", "SITE_FACILITIES"]);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PHASE_CHECK Validation
  // ─────────────────────────────────────────────────────────────────

  describe("PHASE_CHECK validation", () => {
    it("should return valid when review is in required phase", async () => {
      const phaseCheckRule = {
        type: "PHASE_CHECK" as const,
        requiredPhase: "ON_SITE",
        allowManual: false,
      };
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        phase: "ON_SITE",
      } as never);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_OPENING_MEETING",
        phaseCheckRule
      );

      expect(result.isValid).toBe(true);
    });

    it("should return invalid when review is not in required phase", async () => {
      const phaseCheckRule = {
        type: "PHASE_CHECK" as const,
        requiredPhase: "ON_SITE",
        allowManual: false,
      };
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        phase: "PLANNING",
      } as never);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_OPENING_MEETING",
        phaseCheckRule
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("Review must be in ON_SITE phase");
    });

    it("should allow completion when allowManual is true regardless of phase", async () => {
      const phaseCheckRuleWithManual = {
        type: "PHASE_CHECK" as const,
        requiredPhase: "ON_SITE",
        allowManual: true,
      };
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        phase: "PLANNING",
      } as never);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_OPENING_MEETING",
        phaseCheckRuleWithManual
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
    });

    it("should return invalid when review not found", async () => {
      const phaseCheckRule = {
        type: "PHASE_CHECK" as const,
        requiredPhase: "ON_SITE",
        allowManual: false,
      };
      vi.mocked(prisma.review.findUnique).mockResolvedValue(null);

      const result = await service.validateItem(
        mockReviewId,
        "SITE_OPENING_MEETING",
        phaseCheckRule
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("Review not found");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // APPROVAL_REQUIRED Validation
  // ─────────────────────────────────────────────────────────────────

  describe("APPROVAL_REQUIRED validation", () => {
    const approvalRequiredRule = {
      type: "APPROVAL_REQUIRED" as const,
      approverRoles: ["LEAD_REVIEWER", "PROGRAMME_COORDINATOR"],
    };

    it("should return completable with information about required roles", async () => {
      const result = await service.validateItem(
        mockReviewId,
        "PRE_PLAN_APPROVED",
        approvalRequiredRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
      expect(result.reason).toContain("Requires approval from");
      expect(result.reason).toContain("LEAD_REVIEWER");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // MANUAL_OR_DOCUMENT Validation
  // ─────────────────────────────────────────────────────────────────

  describe("MANUAL_OR_DOCUMENT validation", () => {
    it("should return valid when allowManual is true", async () => {
      const manualOrDocRule = {
        type: "MANUAL_OR_DOCUMENT" as const,
        allowManual: true,
      };

      const result = await service.validateItem(
        mockReviewId,
        "PRE_COORDINATION_MEETING",
        manualOrDocRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
    });

    it("should check for document when allowManual is false", async () => {
      const manualOrDocRule = {
        type: "MANUAL_OR_DOCUMENT" as const,
        category: "INTERVIEW_NOTES" as DocumentCategory,
        allowManual: false,
      };
      vi.mocked(prisma.document.count).mockResolvedValue(0);

      const result = await service.validateItem(
        mockReviewId,
        "PRE_COORDINATION_MEETING",
        manualOrDocRule
      );

      expect(result.isValid).toBe(false);
      expect(result.canComplete).toBe(false);
    });

    it("should return valid when document exists and allowManual is false", async () => {
      const manualOrDocRule = {
        type: "MANUAL_OR_DOCUMENT" as const,
        category: "INTERVIEW_NOTES" as DocumentCategory,
        allowManual: false,
      };
      vi.mocked(prisma.document.count).mockResolvedValue(1);

      const result = await service.validateItem(
        mockReviewId,
        "PRE_COORDINATION_MEETING",
        manualOrDocRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DOCUMENT_OR_COMMENTS Validation
  // ─────────────────────────────────────────────────────────────────

  describe("DOCUMENT_OR_COMMENTS validation", () => {
    const docOrCommentsRule = {
      type: "DOCUMENT_OR_COMMENTS" as const,
      category: "CORRESPONDENCE" as DocumentCategory,
      orFindingComments: true,
    };

    it("should return valid when correspondence document exists", async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(1);

      const result = await service.validateItem(
        mockReviewId,
        "POST_HOST_FEEDBACK",
        docOrCommentsRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
    });

    it("should return valid when findings exist (implying discussion)", async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(0);
      vi.mocked(prisma.finding.count).mockResolvedValue(3);

      const result = await service.validateItem(
        mockReviewId,
        "POST_HOST_FEEDBACK",
        docOrCommentsRule
      );

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
    });

    it("should return invalid when no document and no findings", async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(0);
      vi.mocked(prisma.finding.count).mockResolvedValue(0);

      const result = await service.validateItem(
        mockReviewId,
        "POST_HOST_FEEDBACK",
        docOrCommentsRule
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("Upload CORRESPONDENCE document");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // AUTO_CHECK Validation
  // ─────────────────────────────────────────────────────────────────

  describe("AUTO_CHECK validation", () => {
    describe("FINDINGS_COUNT_GT_0 condition", () => {
      const autoCheckFindingsRule = {
        type: "AUTO_CHECK" as const,
        condition: "FINDINGS_COUNT_GT_0" as const,
      };

      it("should return valid when findings exist", async () => {
        vi.mocked(prisma.finding.count).mockResolvedValue(5);

        const result = await service.validateItem(
          mockReviewId,
          "POST_FINDINGS_ENTERED",
          autoCheckFindingsRule
        );

        expect(result.isValid).toBe(true);
        expect(result.canComplete).toBe(true);
      });

      it("should return invalid when no findings exist", async () => {
        vi.mocked(prisma.finding.count).mockResolvedValue(0);

        const result = await service.validateItem(
          mockReviewId,
          "POST_FINDINGS_ENTERED",
          autoCheckFindingsRule
        );

        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("Enter at least one finding");
      });
    });

    describe("ALL_CAPS_SUBMITTED condition", () => {
      const autoCheckCapsRule = {
        type: "AUTO_CHECK" as const,
        condition: "ALL_CAPS_SUBMITTED" as const,
      };

      it("should return valid when all CAPs are submitted", async () => {
        // Note: Service query filters by capRequired: true, so only return those findings
        vi.mocked(prisma.finding.findMany).mockResolvedValue([
          { id: "f1", capRequired: true, correctiveActionPlan: { status: "SUBMITTED" } },
          { id: "f2", capRequired: true, correctiveActionPlan: { status: "ACCEPTED" } },
        ] as never);

        const result = await service.validateItem(
          mockReviewId,
          "ALL_CAPS_CHECK",
          autoCheckCapsRule
        );

        expect(result.isValid).toBe(true);
      });

      it("should return invalid when some CAPs are pending", async () => {
        vi.mocked(prisma.finding.findMany).mockResolvedValue([
          { id: "f1", capRequired: true, correctiveActionPlan: { status: "SUBMITTED" } },
          { id: "f2", capRequired: true, correctiveActionPlan: { status: "DRAFT" } },
          { id: "f3", capRequired: true, correctiveActionPlan: null },
        ] as never);

        const result = await service.validateItem(
          mockReviewId,
          "ALL_CAPS_CHECK",
          autoCheckCapsRule
        );

        expect(result.isValid).toBe(false);
        expect(result.reason).toContain("2 CAP(s) pending submission");
      });
    });

    describe("REPORT_GENERATED condition", () => {
      const autoCheckReportRule = {
        type: "AUTO_CHECK" as const,
        condition: "REPORT_GENERATED" as const,
      };

      it("should return valid when report exists", async () => {
        vi.mocked(prisma.reviewReport.findFirst).mockResolvedValue({
          id: "report-1",
        } as never);

        const result = await service.validateItem(
          mockReviewId,
          "REPORT_CHECK",
          autoCheckReportRule
        );

        expect(result.isValid).toBe(true);
      });

      it("should return invalid when no report exists", async () => {
        vi.mocked(prisma.reviewReport.findFirst).mockResolvedValue(null);

        const result = await service.validateItem(
          mockReviewId,
          "REPORT_CHECK",
          autoCheckReportRule
        );

        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("Generate review report first");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // validateAllItems
  // ─────────────────────────────────────────────────────────────────

  describe("validateAllItems", () => {
    it("should validate all items and return a map of results", async () => {
      vi.mocked(prisma.fieldworkChecklistItem.findMany).mockResolvedValue([
        {
          itemCode: "PRE_DOC_REQUEST_SENT",
          validationRules: {
            type: "DOCUMENT_EXISTS",
            category: "PRE_VISIT_REQUEST",
            minCount: 1,
          },
        },
        {
          itemCode: "PRE_COORDINATION_MEETING",
          validationRules: {
            type: "MANUAL_OR_DOCUMENT",
            allowManual: true,
          },
        },
      ] as never);

      vi.mocked(prisma.document.count).mockResolvedValue(1);

      const results = await service.validateAllItems(mockReviewId);

      expect(results.size).toBe(2);
      expect(results.get("PRE_DOC_REQUEST_SENT")?.isValid).toBe(true);
      expect(results.get("PRE_COORDINATION_MEETING")?.isValid).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // canCompleteFieldwork
  // ─────────────────────────────────────────────────────────────────

  describe("canCompleteFieldwork", () => {
    it("should return true when all items are completed", async () => {
      vi.mocked(prisma.fieldworkChecklistItem.findMany).mockResolvedValue([
        { itemCode: "ITEM_1", isCompleted: true, isOverridden: false, validationRules: null, labelEn: "Item 1" },
        { itemCode: "ITEM_2", isCompleted: false, isOverridden: true, validationRules: null, labelEn: "Item 2" },
        { itemCode: "ITEM_3", isCompleted: true, isOverridden: false, validationRules: null, labelEn: "Item 3" },
      ] as never);

      const result = await service.canCompleteFieldwork(mockReviewId);

      expect(result.canComplete).toBe(true);
      expect(result.incompleteItems).toHaveLength(0);
    });

    it("should return false with incomplete items when validation fails", async () => {
      vi.mocked(prisma.fieldworkChecklistItem.findMany).mockResolvedValue([
        {
          itemCode: "ITEM_1",
          isCompleted: true,
          isOverridden: false,
          validationRules: null,
          labelEn: "Completed Item",
        },
        {
          itemCode: "ITEM_2",
          isCompleted: false,
          isOverridden: false,
          validationRules: {
            type: "DOCUMENT_EXISTS",
            category: "PRE_VISIT_REQUEST",
            minCount: 1,
          },
          labelEn: "Document request sent",
        },
      ] as never);

      vi.mocked(prisma.document.count).mockResolvedValue(0);

      const result = await service.canCompleteFieldwork(mockReviewId);

      expect(result.canComplete).toBe(false);
      expect(result.incompleteItems).toHaveLength(1);
      expect(result.incompleteItems[0]).toEqual({
        itemCode: "ITEM_2",
        labelEn: "Document request sent",
        reason: expect.stringContaining("Requires at least 1"),
      });
    });

    it("should skip completed and overridden items in validation", async () => {
      vi.mocked(prisma.fieldworkChecklistItem.findMany).mockResolvedValue([
        {
          itemCode: "ITEM_1",
          isCompleted: true,
          isOverridden: false,
          validationRules: { type: "DOCUMENT_EXISTS", category: "PRE_VISIT_REQUEST", minCount: 10 },
          labelEn: "Item 1",
        },
        {
          itemCode: "ITEM_2",
          isCompleted: false,
          isOverridden: true,
          validationRules: { type: "FINDINGS_EXIST", minCount: 100 },
          labelEn: "Item 2",
        },
      ] as never);

      const result = await service.canCompleteFieldwork(mockReviewId);

      expect(prisma.document.count).not.toHaveBeenCalled();
      expect(prisma.finding.count).not.toHaveBeenCalled();
      expect(result.canComplete).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // French Translations
  // ─────────────────────────────────────────────────────────────────

  describe("French translations", () => {
    it("should provide French reason for DOCUMENT_EXISTS failure", async () => {
      const rule = {
        type: "DOCUMENT_EXISTS" as const,
        category: "PRE_VISIT_REQUEST" as DocumentCategory,
        minCount: 1,
      };
      vi.mocked(prisma.document.count).mockResolvedValue(0);

      const result = await service.validateItem(mockReviewId, "TEST", rule);

      expect(result.reasonFr).toContain("Necessite au moins 1 document");
    });

    it("should provide French reason for FINDINGS_EXIST failure", async () => {
      const rule = {
        type: "FINDINGS_EXIST" as const,
        minCount: 1,
      };
      vi.mocked(prisma.finding.count).mockResolvedValue(0);

      const result = await service.validateItem(mockReviewId, "TEST", rule);

      expect(result.reasonFr).toContain("Necessite au moins 1 constatation");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("should handle unknown validation rule type gracefully", async () => {
      const unknownRule = {
        type: "UNKNOWN_TYPE",
      } as unknown as Parameters<typeof service.validateItem>[2];

      const result = await service.validateItem(mockReviewId, "TEST", unknownRule);

      expect(result.isValid).toBe(true);
      expect(result.canComplete).toBe(true);
    });

    it("should handle database errors gracefully", async () => {
      const rule = {
        type: "DOCUMENT_EXISTS" as const,
        category: "PRE_VISIT_REQUEST" as DocumentCategory,
        minCount: 1,
      };
      vi.mocked(prisma.document.count).mockRejectedValue(new Error("Database connection failed"));

      await expect(
        service.validateItem(mockReviewId, "TEST", rule)
      ).rejects.toThrow("Database connection failed");
    });
  });
});
