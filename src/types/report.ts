// ============================================================
// AAPRP Peer Review Report — Structured Content Types
// Aligned with AAPRP ANS Protocol & CANSO SoE 2024
// ============================================================

/** Top-level report content stored in ReviewReport.content */
export interface ReportContent {
  version: string;                    // Schema version, e.g. "1.0"
  generatedAt: string;                // ISO timestamp
  locale: "en" | "fr";                // Primary generation language
  metadata: ReportMetadata;
  coverPage: CoverPageData;
  tableOfContents: boolean;           // Whether to include TOC
  sections: ReportSections;
}

/** Report metadata (auto-populated from Review) */
export interface ReportMetadata {
  reportReference: string;            // e.g. "AAPRP-RPT-2026-002"
  reviewReference: string;            // e.g. "AAPRP-2026-002"
  reviewType: string;                 // "FULL" | "FOCUSED" | "FOLLOW_UP"
  hostOrganization: {
    nameEn: string;
    nameFr: string;
    code: string;                     // ICAO code, e.g. "ADM"
    country: string;
    city: string;
    region: string;
    regionalTeam: string;             // e.g. "Team 4"
  };
  reviewPeriod: {
    plannedStart: string | null;
    plannedEnd: string | null;
    actualStart: string | null;
    actualEnd: string | null;
  };
  generatedBy: {
    id: string;
    name: string;
    role: string;
  };
}

/** Cover page data */
export interface CoverPageData {
  title: string;                      // "Peer Review Report"
  subtitle: string;                   // Organization name
  reportNumber: string;
  classification: "CONFIDENTIAL" | "RESTRICTED" | "INTERNAL";
  date: string;
  logoUrl?: string;
}

/** All report sections */
export interface ReportSections {
  executiveSummary: EditableSection;
  introduction: IntroductionSection;
  methodology: MethodologySection;
  teamComposition: TeamCompositionSection;
  ansAssessment: ANSAssessmentSection;
  smsAssessment: SMSAssessmentSection;
  findingsSummary: FindingsSummarySection;
  findingsDetail: FindingsDetailSection;
  correctiveActions: CorrectiveActionsSection;
  recommendations: EditableSection;
  bestPractices: BestPracticesSection;
  conclusion: EditableSection;
  annexes: AnnexesSection;
}

/** A section with editable EN/FR text (executive summary, recommendations, conclusion) */
export interface EditableSection {
  contentEn: string;                  // Rich text / markdown
  contentFr: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

/** Section 1: Introduction */
export interface IntroductionSection {
  background: EditableSection;        // Background of the review
  objectives: string[];               // Review objectives
  scope: string[];                    // Audit areas in scope
  basisDocuments: string[];           // ICAO Annexes, CANSO SoE, etc.
  activitySchedule: {
    phase: string;
    description: string;
    dateRange: string;
  }[];
}

/** Section 2: Methodology */
export interface MethodologySection {
  approachDescription: EditableSection;
  frameworksUsed: {
    name: string;                     // "ICAO USOAP CMA 2024" or "CANSO SoE 2024"
    version: string;
    description: string;
  }[];
  reviewAreas: {
    code: string;                     // "ATS", "FPD", "AIS", etc.
    name: string;
    pqCount: number;                  // Number of Protocol Questions
    inScope: boolean;
  }[];
  evidenceTypes: string[];            // Types of evidence reviewed
}

/** Section 3: Team Composition */
export interface TeamCompositionSection {
  teamLead: TeamMemberInfo | null;
  members: TeamMemberInfo[];
  observerOrganizations?: string[];
}

export interface TeamMemberInfo {
  name: string;
  role: string;                       // "LEAD_REVIEWER", "REVIEWER", etc.
  organization: string;
  expertise: string[];
  country: string;
}

/** Section 4: ANS Assessment (AAPRP ANS Protocol) */
export interface ANSAssessmentSection {
  available: boolean;                 // Whether ANS data exists
  overallEIScore: number | null;      // 0-100 percentage
  previousEIScore: number | null;     // From prior review (if any)
  eiDelta: number | null;             // Change from previous
  byReviewArea: {
    code: string;                     // "ATS", "FPD", "AIS", etc.
    name: string;
    eiScore: number;
    totalPQs: number;
    satisfactoryPQs: number;
    notImplementedPQs: number;
    notApplicablePQs: number;
  }[];
  byCriticalElement: {
    code: string;                     // "CE-1" through "CE-8"
    name: string;
    eiScore: number;
  }[];
  narrativeEn: string;               // Auto-generated analysis narrative
  narrativeFr: string;
}

/** Section 5: SMS Assessment (CANSO SoE) */
export interface SMSAssessmentSection {
  available: boolean;
  overallMaturityLevel: string | null; // "A" through "E"
  overallScore: number | null;        // 0-100
  previousScore: number | null;
  byComponent: {
    code: string;                     // "SP", "SRM", "SA", "SP"
    name: string;
    maturityLevel: string;            // "A" through "E"
    score: number;
    studyAreas: {
      code: string;
      name: string;
      score: number;
      maturityLevel: string;
    }[];
  }[];
  narrativeEn: string;
  narrativeFr: string;
}

/** Section 6: Findings Summary */
export interface FindingsSummarySection {
  totalFindings: number;
  byType: Record<string, number>;     // NON_CONFORMITY: 2, OBSERVATION: 5, etc.
  bySeverity: Record<string, number>; // CRITICAL: 1, MAJOR: 3, etc.
  byReviewArea: Record<string, number>;
  byStatus: Record<string, number>;
  criticalAndMajorCount: number;
  capRequiredCount: number;
}

/** Section 7: Findings Detail */
export interface FindingsDetailSection {
  findings: FindingDetail[];
}

export interface FindingDetail {
  reference: string;                  // "FND-2026-002-01"
  title: string;
  description: string;
  type: string;                       // "NON_CONFORMITY", "OBSERVATION", etc.
  severity: string;                   // "CRITICAL", "MAJOR", "MINOR"
  reviewArea: string;
  criticalElement?: string;
  icaoReference: string;              // ICAO Annex/Doc reference
  evidence: string;
  status: string;
  capRequired: boolean;
  capReference?: string;              // If CAP exists
  capStatus?: string;
}

/** Section 8: Corrective Action Plans */
export interface CorrectiveActionsSection {
  totalCAPs: number;
  submitted: number;
  accepted: number;
  overdue: number;
  completionRate: number;             // 0-100 percentage
  caps: CAPSummary[];
}

export interface CAPSummary {
  reference: string;
  findingReference: string;
  rootCause: string;
  correctiveAction: string;
  responsibleParty: string;
  dueDate: string;
  status: string;
}

/** Section 9: Best Practices */
export interface BestPracticesSection {
  practices: {
    title: string;
    description: string;
    reviewArea: string;
    applicability: string;            // How other ANSPs could benefit
  }[];
}

/** Section 10: Annexes */
export interface AnnexesSection {
  documentList: {
    name: string;
    category: string;
    reference: string;
  }[];
  teamCVs: boolean;                   // Whether to include team bios
  glossary: boolean;
  pqMatrix: boolean;                  // Full PQ compliance matrix
}

/** Version history entry stored in ReviewReport.versionHistory JSON array */
export interface ReportVersionEntry {
  version: number;
  generatedAt: string;
  generatedBy: { id: string; name: string; role: string };
  status: string;
  overallEI: number | null;
  overallMaturity: string | null;
  contentHash: string;
}
