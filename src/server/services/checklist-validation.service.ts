/**
 * Checklist Validation Service
 *
 * Validates fieldwork checklist items against various rule types including:
 * - Document existence and status
 * - Findings validation
 * - Prerequisite items
 * - Phase checks
 * - Approval requirements
 */

import { prisma } from "@/lib/db";
import type { DocumentCategory, DocumentStatus } from "@prisma/client";

// Validation rule types
type ValidationRuleType =
  | "DOCUMENT_EXISTS"
  | "DOCUMENTS_REVIEWED"
  | "FINDINGS_EXIST"
  | "FINDINGS_HAVE_EVIDENCE"
  | "PREREQUISITE_ITEMS"
  | "PHASE_CHECK"
  | "APPROVAL_REQUIRED"
  | "MANUAL_OR_DOCUMENT"
  | "DOCUMENT_OR_COMMENTS"
  | "AUTO_CHECK";

interface DocumentExistsRule {
  type: "DOCUMENT_EXISTS";
  category: DocumentCategory;
  minCount: number;
  requiredStatus?: DocumentStatus[];
}

interface DocumentsReviewedRule {
  type: "DOCUMENTS_REVIEWED";
  category: DocumentCategory;
  allMustBeReviewed: boolean;
}

interface FindingsExistRule {
  type: "FINDINGS_EXIST";
  minCount: number;
  statusRequired?: string[];
}

interface FindingsHaveEvidenceRule {
  type: "FINDINGS_HAVE_EVIDENCE";
  allFindingsMustHaveEvidence: boolean;
}

interface PrerequisiteItemsRule {
  type: "PREREQUISITE_ITEMS";
  requiredItems: string[];
}

interface PhaseCheckRule {
  type: "PHASE_CHECK";
  requiredPhase: string;
  allowManual: boolean;
}

interface ApprovalRequiredRule {
  type: "APPROVAL_REQUIRED";
  approverRoles: string[];
}

interface ManualOrDocumentRule {
  type: "MANUAL_OR_DOCUMENT";
  category?: DocumentCategory;
  allowManual: boolean;
}

interface DocumentOrCommentsRule {
  type: "DOCUMENT_OR_COMMENTS";
  category: DocumentCategory;
  orFindingComments: boolean;
}

interface AutoCheckRule {
  type: "AUTO_CHECK";
  condition: "FINDINGS_COUNT_GT_0" | "ALL_CAPS_SUBMITTED" | "REPORT_GENERATED";
}

type ValidationRule =
  | DocumentExistsRule
  | DocumentsReviewedRule
  | FindingsExistRule
  | FindingsHaveEvidenceRule
  | PrerequisiteItemsRule
  | PhaseCheckRule
  | ApprovalRequiredRule
  | ManualOrDocumentRule
  | DocumentOrCommentsRule
  | AutoCheckRule;

export interface ValidationResult {
  isValid: boolean;
  canComplete: boolean;
  reason?: string;
  reasonFr?: string;
  details?: {
    required: number;
    current: number;
    missing?: string[];
  };
}

export class ChecklistValidationService {
  /**
   * Validate a single checklist item against its rules
   */
  async validateItem(
    reviewId: string,
    itemCode: string,
    rules: ValidationRule | null
  ): Promise<ValidationResult> {
    // No rules = manual item, always completable
    if (!rules) {
      return { isValid: true, canComplete: true };
    }

    switch (rules.type) {
      case "DOCUMENT_EXISTS":
        return this.validateDocumentExists(reviewId, rules);

      case "DOCUMENTS_REVIEWED":
        return this.validateDocumentsReviewed(reviewId, rules);

      case "FINDINGS_EXIST":
        return this.validateFindingsExist(reviewId, rules);

      case "FINDINGS_HAVE_EVIDENCE":
        return this.validateFindingsHaveEvidence(reviewId, rules);

      case "PREREQUISITE_ITEMS":
        return this.validatePrerequisiteItems(reviewId, rules);

      case "PHASE_CHECK":
        return this.validatePhaseCheck(reviewId, rules);

      case "APPROVAL_REQUIRED":
        return this.validateApprovalRequired(reviewId, itemCode, rules);

      case "MANUAL_OR_DOCUMENT":
        return this.validateManualOrDocument(reviewId, rules);

      case "DOCUMENT_OR_COMMENTS":
        return this.validateDocumentOrComments(reviewId, rules);

      case "AUTO_CHECK":
        return this.validateAutoCheck(reviewId, rules);

      default:
        return { isValid: true, canComplete: true };
    }
  }

  /**
   * Validate all checklist items for a review
   */
  async validateAllItems(
    reviewId: string
  ): Promise<Map<string, ValidationResult>> {
    const items = await prisma.fieldworkChecklistItem.findMany({
      where: { reviewId },
      orderBy: { sortOrder: "asc" },
    });

    const results = new Map<string, ValidationResult>();

    for (const item of items) {
      const rules = item.validationRules as ValidationRule | null;
      const result = await this.validateItem(reviewId, item.itemCode, rules);
      results.set(item.itemCode, result);
    }

    return results;
  }

  /**
   * Check if fieldwork can be marked as complete
   */
  async canCompleteFieldwork(reviewId: string): Promise<{
    canComplete: boolean;
    incompleteItems: Array<{
      itemCode: string;
      labelEn: string;
      reason: string;
    }>;
  }> {
    const items = await prisma.fieldworkChecklistItem.findMany({
      where: { reviewId },
      orderBy: { sortOrder: "asc" },
    });

    const incompleteItems: Array<{
      itemCode: string;
      labelEn: string;
      reason: string;
    }> = [];

    for (const item of items) {
      if (item.isCompleted || item.isOverridden) continue;

      const rules = item.validationRules as ValidationRule | null;
      const validation = await this.validateItem(
        reviewId,
        item.itemCode,
        rules
      );

      if (!validation.canComplete) {
        incompleteItems.push({
          itemCode: item.itemCode,
          labelEn: item.labelEn,
          reason: validation.reason || "Item not completed",
        });
      }
    }

    return {
      canComplete: incompleteItems.length === 0,
      incompleteItems,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE VALIDATION METHODS
  // ─────────────────────────────────────────────────────────────────

  private async validateDocumentExists(
    reviewId: string,
    rules: DocumentExistsRule
  ): Promise<ValidationResult> {
    const whereClause: Record<string, unknown> = {
      reviewId,
      category: rules.category,
      isDeleted: false,
    };

    if (rules.requiredStatus && rules.requiredStatus.length > 0) {
      whereClause.status = { in: rules.requiredStatus };
    }

    const count = await prisma.document.count({ where: whereClause });

    const isValid = count >= rules.minCount;

    return {
      isValid,
      canComplete: isValid,
      reason: isValid
        ? undefined
        : `Requires at least ${rules.minCount} ${rules.category} document(s)`,
      reasonFr: isValid
        ? undefined
        : `Necessite au moins ${rules.minCount} document(s) de type ${rules.category}`,
      details: {
        required: rules.minCount,
        current: count,
      },
    };
  }

  private async validateDocumentsReviewed(
    reviewId: string,
    rules: DocumentsReviewedRule
  ): Promise<ValidationResult> {
    const documents = await prisma.document.findMany({
      where: { reviewId, category: rules.category, isDeleted: false },
      select: { id: true, status: true, name: true },
    });

    if (documents.length === 0) {
      return {
        isValid: false,
        canComplete: false,
        reason: `No ${rules.category} documents found to review`,
        reasonFr: `Aucun document de type ${rules.category} trouve a examiner`,
      };
    }

    const reviewedStatuses: DocumentStatus[] = ["REVIEWED", "APPROVED"];
    const unreviewedDocs = documents.filter(
      (d) => !reviewedStatuses.includes(d.status)
    );

    const isValid = unreviewedDocs.length === 0;

    return {
      isValid,
      canComplete: isValid,
      reason: isValid
        ? undefined
        : `${unreviewedDocs.length} document(s) still need review`,
      reasonFr: isValid
        ? undefined
        : `${unreviewedDocs.length} document(s) doivent encore etre examines`,
      details: {
        required: documents.length,
        current: documents.length - unreviewedDocs.length,
        missing: unreviewedDocs.map((d) => d.name),
      },
    };
  }

  private async validateFindingsExist(
    reviewId: string,
    rules: FindingsExistRule
  ): Promise<ValidationResult> {
    const whereClause: Record<string, unknown> = { reviewId };

    if (rules.statusRequired && rules.statusRequired.length > 0) {
      whereClause.status = { in: rules.statusRequired };
    }

    const count = await prisma.finding.count({ where: whereClause });

    const isValid = count >= rules.minCount;

    return {
      isValid,
      canComplete: isValid,
      reason: isValid
        ? undefined
        : `Requires at least ${rules.minCount} finding(s) to be recorded`,
      reasonFr: isValid
        ? undefined
        : `Necessite au moins ${rules.minCount} constatation(s) enregistree(s)`,
      details: {
        required: rules.minCount,
        current: count,
      },
    };
  }

  private async validateFindingsHaveEvidence(
    reviewId: string,
    rules: FindingsHaveEvidenceRule
  ): Promise<ValidationResult> {
    const findings = await prisma.finding.findMany({
      where: { reviewId },
      include: {
        documents: { select: { id: true } },
      },
    });

    if (findings.length === 0) {
      return {
        isValid: true,
        canComplete: true,
        reason: "No findings to validate",
      };
    }

    // If not all findings must have evidence, just check that at least one does
    if (!rules.allFindingsMustHaveEvidence) {
      const hasAnyEvidence = findings.some((f) => f.documents.length > 0);
      return {
        isValid: hasAnyEvidence,
        canComplete: hasAnyEvidence,
        reason: hasAnyEvidence ? undefined : "At least one finding needs evidence",
        reasonFr: hasAnyEvidence ? undefined : "Au moins une constatation necessite une preuve",
      };
    }

    const findingsWithoutEvidence = findings.filter(
      (f) => f.documents.length === 0
    );

    const isValid = findingsWithoutEvidence.length === 0;

    return {
      isValid,
      canComplete: isValid,
      reason: isValid
        ? undefined
        : `${findingsWithoutEvidence.length} finding(s) missing evidence`,
      reasonFr: isValid
        ? undefined
        : `${findingsWithoutEvidence.length} constatation(s) sans preuve`,
      details: {
        required: findings.length,
        current: findings.length - findingsWithoutEvidence.length,
      },
    };
  }

  private async validatePrerequisiteItems(
    reviewId: string,
    rules: PrerequisiteItemsRule
  ): Promise<ValidationResult> {
    const items = await prisma.fieldworkChecklistItem.findMany({
      where: {
        reviewId,
        itemCode: { in: rules.requiredItems },
      },
      select: {
        itemCode: true,
        isCompleted: true,
        isOverridden: true,
        labelEn: true,
      },
    });

    const incompleteItems = items.filter(
      (item) => !item.isCompleted && !item.isOverridden
    );

    const isValid = incompleteItems.length === 0;

    return {
      isValid,
      canComplete: isValid,
      reason: isValid
        ? undefined
        : `Complete prerequisite items first: ${incompleteItems.map((i) => i.labelEn).join(", ")}`,
      reasonFr: isValid
        ? undefined
        : `Completez d'abord les elements prealables`,
      details: {
        required: rules.requiredItems.length,
        current: rules.requiredItems.length - incompleteItems.length,
        missing: incompleteItems.map((i) => i.itemCode),
      },
    };
  }

  private async validatePhaseCheck(
    reviewId: string,
    rules: PhaseCheckRule
  ): Promise<ValidationResult> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { phase: true },
    });

    if (!review) {
      return { isValid: false, canComplete: false, reason: "Review not found" };
    }

    // If manual is allowed, always can complete
    if (rules.allowManual) {
      return { isValid: true, canComplete: true };
    }

    const isValid = review.phase === rules.requiredPhase;

    return {
      isValid,
      canComplete: isValid || rules.allowManual,
      reason: isValid
        ? undefined
        : `Review must be in ${rules.requiredPhase} phase`,
      reasonFr: isValid
        ? undefined
        : `La revue doit etre en phase ${rules.requiredPhase}`,
    };
  }

  private async validateApprovalRequired(
    _reviewId: string,
    _itemCode: string,
    rules: ApprovalRequiredRule
  ): Promise<ValidationResult> {
    // Item is completable, but only by users with approver roles
    // The actual role check happens in the mutation
    return {
      isValid: true,
      canComplete: true,
      reason: `Requires approval from: ${rules.approverRoles.join(" or ")}`,
      reasonFr: `Necessite l'approbation de: ${rules.approverRoles.join(" ou ")}`,
    };
  }

  private async validateManualOrDocument(
    reviewId: string,
    rules: ManualOrDocumentRule
  ): Promise<ValidationResult> {
    // If manual is allowed, always valid
    if (rules.allowManual) {
      return { isValid: true, canComplete: true };
    }

    // Otherwise, check for document
    if (rules.category) {
      const count = await prisma.document.count({
        where: { reviewId, category: rules.category, isDeleted: false },
      });

      return {
        isValid: count > 0,
        canComplete: count > 0,
        reason:
          count > 0
            ? undefined
            : `Upload ${rules.category} document or confirm manually`,
        reasonFr:
          count > 0
            ? undefined
            : `Telechargez un document ou confirmez manuellement`,
      };
    }

    return { isValid: true, canComplete: true };
  }

  private async validateDocumentOrComments(
    reviewId: string,
    rules: DocumentOrCommentsRule
  ): Promise<ValidationResult> {
    // Check for document
    const docCount = await prisma.document.count({
      where: { reviewId, category: rules.category, isDeleted: false },
    });

    if (docCount > 0) {
      return { isValid: true, canComplete: true };
    }

    // Check for finding comments from host (if applicable)
    if (rules.orFindingComments) {
      // Check if any findings exist (implying discussion happened)
      const findingsCount = await prisma.finding.count({
        where: { reviewId },
      });

      if (findingsCount > 0) {
        return { isValid: true, canComplete: true };
      }
    }

    return {
      isValid: false,
      canComplete: false,
      reason: `Upload ${rules.category} document or receive host feedback`,
      reasonFr: `Telechargez un document de correspondance ou recevez les commentaires de l'hote`,
    };
  }

  private async validateAutoCheck(
    reviewId: string,
    rules: AutoCheckRule
  ): Promise<ValidationResult> {
    switch (rules.condition) {
      case "FINDINGS_COUNT_GT_0": {
        const count = await prisma.finding.count({ where: { reviewId } });
        return {
          isValid: count > 0,
          canComplete: count > 0,
          reason: count > 0 ? undefined : "Enter at least one finding",
          reasonFr: count > 0 ? undefined : "Saisissez au moins une constatation",
        };
      }

      case "ALL_CAPS_SUBMITTED": {
        const findings = await prisma.finding.findMany({
          where: { reviewId, capRequired: true },
          include: { correctiveActionPlan: { select: { status: true } } },
        });

        const pendingCaps = findings.filter(
          (f) =>
            !f.correctiveActionPlan || f.correctiveActionPlan.status === "DRAFT"
        );

        return {
          isValid: pendingCaps.length === 0,
          canComplete: pendingCaps.length === 0,
          reason:
            pendingCaps.length === 0
              ? undefined
              : `${pendingCaps.length} CAP(s) pending submission`,
          reasonFr:
            pendingCaps.length === 0
              ? undefined
              : `${pendingCaps.length} PAC en attente de soumission`,
        };
      }

      case "REPORT_GENERATED": {
        const report = await prisma.reviewReport.findFirst({
          where: { reviewId },
        });

        return {
          isValid: !!report,
          canComplete: !!report,
          reason: report ? undefined : "Generate review report first",
          reasonFr: report ? undefined : "Generez d'abord le rapport de revue",
        };
      }

      default:
        return { isValid: true, canComplete: true };
    }
  }
}

// Export singleton instance
export const checklistValidationService = new ChecklistValidationService();

// Export types for use in other modules
export type { ValidationRule, ValidationRuleType };
