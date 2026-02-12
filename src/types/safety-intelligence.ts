// =============================================================================
// CROSS-ANSP SAFETY INTELLIGENCE DASHBOARD — TYPE DEFINITIONS
// =============================================================================

import type { USOAPAuditArea, FindingSeverity, FindingStatus, CAPStatus, MaturityLevel } from "@prisma/client";

/** KPI summary for the programme overview */
export interface ProgrammeKPIs {
  totalOrganizations: number;
  totalReviews: number;
  activeReviews: number;
  completedReviews: number;
  averageEIScore: number | null;       // USOAP CMA Effective Implementation %
  averageSMSMaturity: number | null;   // CANSO SoE average (1-5 scale)
  totalFindings: number;
  openFindings: number;
  criticalFindings: number;
  totalCAPs: number;
  overdueCAPs: number;
  averageCAPClosureRate: number | null; // percentage
  totalReviewers: number;
  eiTrendVsPrevQuarter: number | null;  // +/- change
  smsTrendVsPrevQuarter: number | null;
}

/** Per-ANSP aggregated performance data */
export interface ANSPPerformanceRecord {
  organizationId: string;
  organizationCode: string | null;
  nameEn: string;
  nameFr: string;
  country: string;
  region: string;
  teamId: string | null;
  teamNumber: number | null;

  // USOAP CMA scores
  latestEIScore: number | null;
  eiScoreByArea: Record<string, number>;  // audit_area -> EI%
  eiTrend: number | null;                 // change from previous assessment

  // CANSO SoE scores
  latestSMSMaturity: number | null;       // 1-5 numeric
  latestMaturityLevel: MaturityLevel | null;
  smsScoreByComponent: Record<string, number>; // component -> maturity

  // Findings & CAPs
  totalFindings: number;
  openFindings: number;
  criticalFindings: number;
  majorFindings: number;
  capClosureRate: number | null;

  // Review history
  reviewsCompleted: number;
  lastReviewDate: Date | null;
}

/** Regional team aggregation */
export interface RegionalTeamSummary {
  teamId: string;
  teamNumber: number;
  teamCode: string;
  nameEn: string;
  nameFr: string;
  leadOrganizationId: string;
  leadOrganizationName: string;

  // Aggregate metrics
  memberCount: number;
  averageEIScore: number | null;
  averageSMSMaturity: number | null;
  totalFindings: number;
  criticalFindings: number;
  averageCAPClosureRate: number | null;

  // Per-audit-area averages
  eiByAuditArea: Record<string, number>;

  // Per-SMS-component averages
  smsByComponent: Record<string, number>;

  // Range data
  eiRange: { min: number; max: number; avg: number };
  smsRange: { min: number; max: number; avg: number };
}

/** Finding pattern data for analysis */
export interface FindingPatternData {
  auditArea: string;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  observationCount: number;
  totalCount: number;
}

/** Systemic issue identified across multiple ANSPs */
export interface SystemicIssue {
  id: string;
  auditArea: string | null;
  criticalElement: string | null;
  titleEn: string;
  titleFr: string;
  severity: FindingSeverity;
  affectedOrganizations: number;
  trend: "improving" | "stable" | "worsening";
  firstIdentified: Date;
}

/** Quarterly trend data point */
export interface TrendDataPoint {
  period: string;            // "Q1 2025", "Q2 2025", etc.
  periodStart: Date;
  averageEIScore: number | null;
  averageSMSMaturity: number | null;
  totalFindings: number;
  capClosureRate: number | null;
  reviewsCompleted: number;
}

/** CAP analytics by team */
export interface CAPAnalytics {
  totalCAPs: number;
  closedCAPs: number;
  overdueCAPs: number;
  averageClosureTimeDays: number | null;
  closureRateByTeam: Array<{
    teamId: string;
    teamNumber: number;
    teamName: string;
    closureRate: number;
    totalCAPs: number;
  }>;
  closureRateDistribution: Array<{
    range: string;    // "90-100%", "75-89%", etc.
    count: number;
  }>;
}

/** Dashboard filter state */
export interface SafetyIntelligenceFilters {
  teamId: string | null;       // null = all teams
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  anonymized: boolean;         // hide ANSP names for presentations
}
