/**
 * Assessment Reference Number Generator
 *
 * Generates unique reference numbers for assessments in the format:
 * {ORG_CODE}-{TYPE}-{YEAR}-{SEQUENCE}
 *
 * Examples:
 * - NAMA-ANS-2026-001 (Nigerian Airspace Management Agency, ANS assessment, 2026, first)
 * - ASECNA-SMS-2026-003 (ASECNA, SMS assessment, 2026, third)
 */

import { prisma } from "@/lib/db";

export type AssessmentTypeCode = "ANS" | "SMS";

interface ReferenceNumberParams {
  organizationCode: string;
  assessmentType: AssessmentTypeCode;
  year?: number;
}

/**
 * Normalize organization code for reference number
 * - Uppercase
 * - Remove special characters
 * - Max 10 characters
 */
function normalizeOrgCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 10);
}

/**
 * Generate a unique assessment reference number
 *
 * Format: {ORG_CODE}-{TYPE}-{YEAR}-{SEQUENCE}
 *
 * @param params - Organization code, assessment type, and optional year
 * @returns Unique reference number string
 */
export async function generateAssessmentReferenceNumber({
  organizationCode,
  assessmentType,
  year = new Date().getFullYear(),
}: ReferenceNumberParams): Promise<string> {
  // Normalize org code (uppercase, alphanumeric only, max 10 chars)
  const orgCode = normalizeOrgCode(organizationCode);
  const typeCode = assessmentType;

  // Build prefix for searching
  const prefix = `${orgCode}-${typeCode}-${year}-`;

  // Find the highest sequence number for this org/type/year combination
  const lastAssessment = await prisma.assessment.findFirst({
    where: {
      referenceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      referenceNumber: "desc",
    },
    select: {
      referenceNumber: true,
    },
  });

  let sequence = 1;

  if (lastAssessment?.referenceNumber) {
    // Extract sequence from "NAMA-ANS-2026-001" -> "001" -> 1
    const parts = lastAssessment.referenceNumber.split("-");
    const lastSequence = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  // Pad sequence to 3 digits: 1 -> "001"
  const sequenceStr = sequence.toString().padStart(3, "0");

  return `${prefix}${sequenceStr}`;
}

/**
 * Generate a display title for an assessment
 *
 * Format: "{Type} Assessment - {Reference Number}"
 *
 * @param assessmentType - ANS or SMS
 * @param referenceNumber - The unique reference number
 * @param locale - Language locale (en or fr)
 * @returns Formatted display title
 */
export function generateAssessmentTitle(
  assessmentType: AssessmentTypeCode,
  referenceNumber: string,
  locale: "en" | "fr" = "en"
): string {
  const typeLabel =
    assessmentType === "ANS"
      ? locale === "fr"
        ? "Evaluation ANS"
        : "ANS Assessment"
      : locale === "fr"
        ? "Evaluation SMS"
        : "SMS Assessment";

  return `${typeLabel} - ${referenceNumber}`;
}

/**
 * Parse a reference number to extract its components
 *
 * @param referenceNumber - Reference number string
 * @returns Parsed components or null if invalid
 */
export function parseReferenceNumber(referenceNumber: string): {
  orgCode: string;
  type: AssessmentTypeCode;
  year: number;
  sequence: number;
} | null {
  const parts = referenceNumber.split("-");

  if (parts.length !== 4) {
    return null;
  }

  const [orgCode, type, yearStr, seqStr] = parts;
  const year = parseInt(yearStr, 10);
  const sequence = parseInt(seqStr, 10);

  if (
    !orgCode ||
    (type !== "ANS" && type !== "SMS") ||
    isNaN(year) ||
    isNaN(sequence)
  ) {
    return null;
  }

  return {
    orgCode,
    type: type as AssessmentTypeCode,
    year,
    sequence,
  };
}

/**
 * Get assessment type code from questionnaire type
 *
 * @param questionnaireType - The questionnaire type from Prisma
 * @returns Assessment type code (ANS or SMS)
 */
export function getAssessmentTypeCode(
  questionnaireType: "ANS_USOAP_CMA" | "SMS_CANSO_SOE"
): AssessmentTypeCode {
  return questionnaireType === "SMS_CANSO_SOE" ? "SMS" : "ANS";
}
