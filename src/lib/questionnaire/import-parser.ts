import type {
  ANSQuestionImport,
  SMSQuestionImport,
  CategoryImport,
  QuestionnaireImport,
  ValidationError,
  ICAOReferenceImport,
} from "./import-schema";
import {
  validateANSQuestion,
  validateSMSQuestion,
  CategoryImportSchema,
  QuestionnaireImportSchema,
  ICAOReferenceImportSchema,
} from "./import-schema";

// =============================================================================
// CSV PARSING
// =============================================================================

interface CSVParseResult<T> {
  data: T[];
  errors: ValidationError[];
  headers: string[];
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV<T extends Record<string, unknown>>(
  csvString: string,
  options: {
    delimiter?: string;
    skipEmptyLines?: boolean;
  } = {}
): CSVParseResult<T> {
  const { delimiter = ",", skipEmptyLines = true } = options;
  const errors: ValidationError[] = [];

  // Split into lines and filter empty if needed
  let lines = csvString.split(/\r?\n/);
  if (skipEmptyLines) {
    lines = lines.filter((line) => line.trim() !== "");
  }

  if (lines.length < 2) {
    return {
      data: [],
      errors: [{ row: 0, field: "", message: "CSV must have at least a header row and one data row" }],
      headers: [],
    };
  }

  // Parse header row
  const headers = parseCSVLine(lines[0], delimiter);

  // Parse data rows
  const data: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);

    if (values.length !== headers.length) {
      errors.push({
        row: i,
        field: "",
        message: `Row has ${values.length} columns, expected ${headers.length}`,
      });
      continue;
    }

    const row = headers.reduce(
      (obj, header, index) => {
        obj[header] = parseValue(values[index]);
        return obj;
      },
      {} as Record<string, unknown>
    );

    data.push(row as T);
  }

  return { data, errors, headers };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse string value to appropriate type
 */
function parseValue(value: string): unknown {
  const trimmed = value.trim();

  // Empty string
  if (trimmed === "" || trimmed.toLowerCase() === "null") {
    return null;
  }

  // Boolean
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) return num;
  }

  // Array (JSON)
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  // Object (JSON)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

// =============================================================================
// JSON PARSING
// =============================================================================

interface JSONParseResult<T> {
  data: T | null;
  errors: ValidationError[];
}

/**
 * Parse JSON string to object
 */
export function parseJSON<T>(jsonString: string): JSONParseResult<T> {
  try {
    const data = JSON.parse(jsonString) as T;
    return { data, errors: [] };
  } catch (error) {
    return {
      data: null,
      errors: [
        {
          row: 0,
          field: "",
          message: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}

// =============================================================================
// DATA NORMALIZATION
// =============================================================================

/**
 * Normalize field names from various formats to camelCase
 */
export function normalizeFieldNames(data: Record<string, unknown>): Record<string, unknown> {
  const fieldMappings: Record<string, string> = {
    // Common variations
    pq_number: "pqNumber",
    "pq number": "pqNumber",
    PQ_NUMBER: "pqNumber",
    question_text_en: "questionTextEn",
    "question text en": "questionTextEn",
    question_text_fr: "questionTextFr",
    "question text fr": "questionTextFr",
    audit_area: "auditArea",
    "audit area": "auditArea",
    critical_element: "criticalElement",
    "critical element": "criticalElement",
    is_priority_pq: "isPriorityPQ",
    "is priority pq": "isPriorityPQ",
    priority_pq: "isPriorityPQ",
    requires_on_site: "requiresOnSite",
    "requires on site": "requiresOnSite",
    on_site: "requiresOnSite",
    pq_status: "pqStatus",
    "pq status": "pqStatus",
    previous_pq_number: "previousPqNumber",
    "previous pq number": "previousPqNumber",
    guidance_en: "guidanceEn",
    "guidance en": "guidanceEn",
    guidance_fr: "guidanceFr",
    "guidance fr": "guidanceFr",
    response_type: "responseType",
    "response type": "responseType",
    required_evidence: "requiredEvidence",
    "required evidence": "requiredEvidence",
    sort_order: "sortOrder",
    "sort order": "sortOrder",
    max_score: "maxScore",
    "max score": "maxScore",
    icao_references: "icaoReferences",
    "icao references": "icaoReferences",
    sms_component: "smsComponent",
    "sms component": "smsComponent",
    study_area: "studyArea",
    "study area": "studyArea",
    maturity_level: "maturityLevel",
    "maturity level": "maturityLevel",
    transversal_area: "transversalArea",
    "transversal area": "transversalArea",
    name_en: "nameEn",
    "name en": "nameEn",
    name_fr: "nameFr",
    "name fr": "nameFr",
    description_en: "descriptionEn",
    "description en": "descriptionEn",
    description_fr: "descriptionFr",
    "description fr": "descriptionFr",
    title_en: "titleEn",
    "title en": "titleEn",
    title_fr: "titleFr",
    "title fr": "titleFr",
    effective_date: "effectiveDate",
    "effective date": "effectiveDate",
    expiry_date: "expiryDate",
    "expiry date": "expiryDate",
    reference_type: "referenceType",
    "reference type": "referenceType",
  };

  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = fieldMappings[key.toLowerCase()] || toCamelCase(key);
    normalized[normalizedKey] = value;
  }

  return normalized;
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_\s-]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""));
}

/**
 * Normalize audit area code
 */
export function normalizeAuditArea(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).toUpperCase().trim();
  const validAreas = ["LEG", "ORG", "PEL", "OPS", "AIR", "AIG", "ANS", "AGA", "SSP"];
  return validAreas.includes(str) ? str : null;
}

/**
 * Normalize critical element code
 */
export function normalizeCriticalElement(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).toUpperCase().trim();

  // Handle various formats: CE_1, CE-1, CE1, 1
  const match = str.match(/^CE[_-]?(\d)$|^(\d)$/);
  if (match) {
    const num = match[1] || match[2];
    return `CE_${num}`;
  }
  return null;
}

/**
 * Normalize SMS component code
 */
export function normalizeSMSComponent(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).toUpperCase().trim();

  const mappings: Record<string, string> = {
    "1": "SAFETY_POLICY_OBJECTIVES",
    "COMPONENT 1": "SAFETY_POLICY_OBJECTIVES",
    "SAFETY POLICY": "SAFETY_POLICY_OBJECTIVES",
    SAFETY_POLICY_OBJECTIVES: "SAFETY_POLICY_OBJECTIVES",
    "2": "SAFETY_RISK_MANAGEMENT",
    "COMPONENT 2": "SAFETY_RISK_MANAGEMENT",
    "RISK MANAGEMENT": "SAFETY_RISK_MANAGEMENT",
    SAFETY_RISK_MANAGEMENT: "SAFETY_RISK_MANAGEMENT",
    "3": "SAFETY_ASSURANCE",
    "COMPONENT 3": "SAFETY_ASSURANCE",
    "SAFETY ASSURANCE": "SAFETY_ASSURANCE",
    "4": "SAFETY_PROMOTION",
    "COMPONENT 4": "SAFETY_PROMOTION",
    "SAFETY PROMOTION": "SAFETY_PROMOTION",
  };

  return mappings[str] || null;
}

/**
 * Normalize study area code
 */
export function normalizeStudyArea(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).toUpperCase().trim();

  // Handle formats: SA_1_1, SA 1.1, 1.1
  const match = str.match(/^SA[_\s]?(\d)[_.\s](\d)$|^(\d)[.\s](\d)$/);
  if (match) {
    const comp = match[1] || match[3];
    const area = match[2] || match[4];
    return `SA_${comp}_${area}`;
  }
  return null;
}

// =============================================================================
// DUPLICATE DETECTION
// =============================================================================

interface DuplicateResult {
  duplicates: Array<{
    pqNumber: string;
    indices: number[];
  }>;
  hasDuplicates: boolean;
}

/**
 * Detect duplicate PQ numbers in import data
 */
export function detectDuplicates(
  questions: Array<{ pqNumber?: string | null }>
): DuplicateResult {
  const pqMap = new Map<string, number[]>();

  questions.forEach((q, index) => {
    if (q.pqNumber) {
      const existing = pqMap.get(q.pqNumber) || [];
      existing.push(index);
      pqMap.set(q.pqNumber, existing);
    }
  });

  const duplicates = Array.from(pqMap.entries())
    .filter(([, indices]) => indices.length > 1)
    .map(([pqNumber, indices]) => ({ pqNumber, indices }));

  return {
    duplicates,
    hasDuplicates: duplicates.length > 0,
  };
}

// =============================================================================
// REFERENCE VALIDATION
// =============================================================================

/**
 * Parse ICAO references from string or array
 */
export function parseICAOReferences(
  value: unknown
): ICAOReferenceImport[] {
  if (!value) return [];

  // Already an array
  if (Array.isArray(value)) {
    return value
      .map((ref) => {
        if (typeof ref === "object" && ref !== null) {
          const result = ICAOReferenceImportSchema.safeParse(ref);
          return result.success ? result.data : null;
        }
        return null;
      })
      .filter((ref): ref is ICAOReferenceImport => ref !== null);
  }

  // String format: "STD:Annex 11:Chapter 2|RP:Annex 15:Section 3"
  if (typeof value === "string") {
    const refs: ICAOReferenceImport[] = [];
    const parts = value.split("|").map((p) => p.trim());

    for (const part of parts) {
      const [type, document, chapter] = part.split(":").map((s) => s.trim());
      if (type && document) {
        const refType = type.toUpperCase();
        const validTypes = ["CC", "STD", "RP", "PANS", "GM", "Cir", "SUPPS"];
        if (validTypes.includes(refType)) {
          refs.push({
            referenceType: refType as ICAOReferenceImport["referenceType"],
            document,
            chapter: chapter || null,
            description: null,
          });
        }
      }
    }

    return refs;
  }

  return [];
}

// =============================================================================
// FULL IMPORT PARSING
// =============================================================================

interface ParsedImport<T> {
  questionnaire: QuestionnaireImport | null;
  categories: CategoryImport[];
  questions: T[];
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Parse and validate ANS bulk import data
 */
export function parseANSImport(
  data: unknown
): ParsedImport<ANSQuestionImport> {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (typeof data !== "object" || data === null) {
    return {
      questionnaire: null,
      categories: [],
      questions: [],
      errors: [{ row: 0, field: "", message: "Invalid import data format" }],
      warnings: [],
    };
  }

  const importData = data as Record<string, unknown>;

  // Parse questionnaire metadata
  let questionnaire: QuestionnaireImport | null = null;
  if (importData.questionnaire) {
    const normalized = normalizeFieldNames(
      importData.questionnaire as Record<string, unknown>
    );
    const result = QuestionnaireImportSchema.safeParse({
      ...normalized,
      type: "ANS_USOAP_CMA",
    });
    if (result.success) {
      questionnaire = result.data;
    } else {
      errors.push(
        ...result.error.issues.map((e) => ({
          row: 0,
          field: `questionnaire.${e.path.join(".")}`,
          message: e.message,
        }))
      );
    }
  }

  // Parse categories
  const categories: CategoryImport[] = [];
  if (Array.isArray(importData.categories)) {
    importData.categories.forEach((cat, index) => {
      const normalized = normalizeFieldNames(cat as Record<string, unknown>);
      const result = CategoryImportSchema.safeParse(normalized);
      if (result.success) {
        categories.push(result.data);
      } else {
        errors.push(
          ...result.error.issues.map((e) => ({
            row: index,
            field: `categories[${index}].${e.path.join(".")}`,
            message: e.message,
          }))
        );
      }
    });
  }

  // Parse questions
  const questions: ANSQuestionImport[] = [];
  if (Array.isArray(importData.questions)) {
    importData.questions.forEach((q, index) => {
      const normalized = normalizeFieldNames(q as Record<string, unknown>);

      // Normalize specific fields
      if (normalized.auditArea) {
        normalized.auditArea = normalizeAuditArea(normalized.auditArea);
      }
      if (normalized.criticalElement) {
        normalized.criticalElement = normalizeCriticalElement(normalized.criticalElement);
      }
      if (normalized.icaoReferences) {
        normalized.icaoReferences = parseICAOReferences(normalized.icaoReferences);
      }

      const result = validateANSQuestion(normalized, index);
      if (result.isValid && result.data) {
        questions.push(result.data);
      } else {
        errors.push(...result.errors);
      }
    });
  }

  // Check for duplicates
  const duplicateResult = detectDuplicates(questions);
  if (duplicateResult.hasDuplicates) {
    duplicateResult.duplicates.forEach(({ pqNumber, indices }) => {
      warnings.push(
        `Duplicate PQ number "${pqNumber}" found at rows: ${indices.map((i) => i + 1).join(", ")}`
      );
    });
  }

  return {
    questionnaire,
    categories,
    questions,
    errors,
    warnings,
  };
}

/**
 * Parse and validate SMS bulk import data
 */
export function parseSMSImport(
  data: unknown
): ParsedImport<SMSQuestionImport> {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (typeof data !== "object" || data === null) {
    return {
      questionnaire: null,
      categories: [],
      questions: [],
      errors: [{ row: 0, field: "", message: "Invalid import data format" }],
      warnings: [],
    };
  }

  const importData = data as Record<string, unknown>;

  // Parse questionnaire metadata
  let questionnaire: QuestionnaireImport | null = null;
  if (importData.questionnaire) {
    const normalized = normalizeFieldNames(
      importData.questionnaire as Record<string, unknown>
    );
    const result = QuestionnaireImportSchema.safeParse({
      ...normalized,
      type: "SMS_CANSO_SOE",
    });
    if (result.success) {
      questionnaire = result.data;
    } else {
      errors.push(
        ...result.error.issues.map((e) => ({
          row: 0,
          field: `questionnaire.${e.path.join(".")}`,
          message: e.message,
        }))
      );
    }
  }

  // Parse categories
  const categories: CategoryImport[] = [];
  if (Array.isArray(importData.categories)) {
    importData.categories.forEach((cat, index) => {
      const normalized = normalizeFieldNames(cat as Record<string, unknown>);
      const result = CategoryImportSchema.safeParse(normalized);
      if (result.success) {
        categories.push(result.data);
      } else {
        errors.push(
          ...result.error.issues.map((e) => ({
            row: index,
            field: `categories[${index}].${e.path.join(".")}`,
            message: e.message,
          }))
        );
      }
    });
  }

  // Parse questions
  const questions: SMSQuestionImport[] = [];
  if (Array.isArray(importData.questions)) {
    importData.questions.forEach((q, index) => {
      const normalized = normalizeFieldNames(q as Record<string, unknown>);

      // Normalize specific fields
      if (normalized.smsComponent) {
        normalized.smsComponent = normalizeSMSComponent(normalized.smsComponent);
      }
      if (normalized.studyArea) {
        normalized.studyArea = normalizeStudyArea(normalized.studyArea);
      }
      if (normalized.icaoReferences) {
        normalized.icaoReferences = parseICAOReferences(normalized.icaoReferences);
      }

      const result = validateSMSQuestion(normalized, index);
      if (result.isValid && result.data) {
        questions.push(result.data);
      } else {
        errors.push(...result.errors);
      }
    });
  }

  return {
    questionnaire,
    categories,
    questions,
    errors,
    warnings,
  };
}

/**
 * Auto-detect import type from data
 */
export function detectImportType(
  data: unknown
): "ANS_USOAP_CMA" | "SMS_CANSO_SOE" | null {
  if (typeof data !== "object" || data === null) return null;

  const importData = data as Record<string, unknown>;

  // Check questionnaire type first
  if (importData.questionnaire) {
    const q = importData.questionnaire as Record<string, unknown>;
    if (q.type === "ANS_USOAP_CMA") return "ANS_USOAP_CMA";
    if (q.type === "SMS_CANSO_SOE") return "SMS_CANSO_SOE";
  }

  // Check questions for type indicators
  if (Array.isArray(importData.questions) && importData.questions.length > 0) {
    const firstQ = importData.questions[0] as Record<string, unknown>;

    // ANS indicators
    if (firstQ.auditArea || firstQ.audit_area || firstQ.criticalElement || firstQ.critical_element) {
      return "ANS_USOAP_CMA";
    }

    // SMS indicators
    if (firstQ.smsComponent || firstQ.sms_component || firstQ.studyArea || firstQ.study_area) {
      return "SMS_CANSO_SOE";
    }
  }

  return null;
}
