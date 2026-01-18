"use client";

/**
 * Report Print View Component
 *
 * A print-optimized view of the report for PDF generation.
 * This component renders when the user exports the report as PDF.
 */

import { forwardRef } from "react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

import type {
  FindingType,
  FindingSeverity,
  FindingStatus,
  CAPStatus,
  MaturityLevel,
  ReviewType,
  ReviewPhase,
  TeamRole,
} from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

type ReportStatus = "DRAFT" | "UNDER_REVIEW" | "FINALIZED";

interface ReportData {
  id: string;
  titleEn: string;
  titleFr: string;
  executiveSummaryEn: string | null;
  executiveSummaryFr: string | null;
  status: ReportStatus;
  draftedAt: Date | null;
  reviewedAt: Date | null;
  finalizedAt: Date | null;
  overallEI: number | null;
  overallMaturity: MaturityLevel | null;
}

interface ReviewData {
  id: string;
  referenceNumber: string;
  reviewType: ReviewType;
  phase: ReviewPhase;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  hostOrganization: {
    id: string;
    nameEn: string;
    nameFr: string;
    icaoCode: string | null;
    country: string;
  };
}

interface TeamMember {
  userId: string;
  role: TeamRole;
  firstName: string;
  lastName: string;
  email: string;
  title: string | null;
}

interface AuditAreaScore {
  score: number;
  total: number;
  satisfactory: number;
}

interface ComponentScore {
  level: MaturityLevel | null;
  avgScore: number;
  count: number;
}

interface AssessmentScores {
  ans: {
    overallEI: number;
    byAuditArea: Record<string, AuditAreaScore>;
  } | null;
  sms: {
    overallMaturity: MaturityLevel | null;
    overallScore: number;
    byComponent: Record<string, ComponentScore>;
  } | null;
}

interface Finding {
  id: string;
  referenceNumber: string;
  titleEn: string;
  titleFr: string;
  findingType: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  criticalElement: string | null;
  icaoReference: string | null;
  capRequired: boolean;
  targetCloseDate: Date | null;
}

interface FindingsData {
  total: number;
  byType: Record<FindingType, number>;
  bySeverity: Record<FindingSeverity, number>;
  byStatus: Record<FindingStatus, number>;
  findings: Finding[];
}

interface CAPItem {
  id: string;
  findingRef: string;
  status: CAPStatus;
  dueDate: Date;
  isOverdue: boolean;
  completedAt: Date | null;
}

interface CAPsData {
  total: number;
  byStatus: Record<CAPStatus, number>;
  overdueCount: number;
  completionRate: number;
  caps: CAPItem[];
}

interface ReportPrintViewProps {
  report: ReportData;
  review: ReviewData;
  team: TeamMember[];
  assessmentScores: AssessmentScores;
  findings: FindingsData;
  caps: CAPsData;
  locale: string;
  translations: {
    title: string;
    executiveSummary: string;
    scores: string;
    findings: string;
    caps: string;
    team: string;
    confidential: string;
    generatedOn: string;
    page: string;
    overallEI: string;
    overallMaturity: string;
    auditArea: string;
    score: string;
    component: string;
    maturityLevel: string;
    reference: string;
    finding: string;
    type: string;
    severity: string;
    status: string;
    dueDate: string;
    completionRate: string;
    total: string;
    overdue: string;
    name: string;
    role: string;
    email: string;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AUDIT_AREA_LABELS: Record<string, { en: string; fr: string }> = {
  ANS: { en: "Air Navigation Services", fr: "Services de Navigation Aérienne" },
  AGA: { en: "Aerodromes", fr: "Aérodromes" },
  AIG: { en: "Aircraft Accident Investigation", fr: "Enquêtes sur les Accidents" },
  AIR: { en: "Airworthiness", fr: "Navigabilité" },
  OPS: { en: "Air Operations", fr: "Opérations Aériennes" },
  PEL: { en: "Personnel Licensing", fr: "Licences du Personnel" },
  LEG: { en: "Legislation", fr: "Législation" },
  ORG: { en: "Organization", fr: "Organisation" },
};

const SMS_COMPONENT_LABELS: Record<string, { en: string; fr: string }> = {
  SAFETY_POLICY_OBJECTIVES: {
    en: "Safety Policy & Objectives",
    fr: "Politique et Objectifs de Sécurité",
  },
  SAFETY_RISK_MANAGEMENT: {
    en: "Safety Risk Management",
    fr: "Gestion des Risques de Sécurité",
  },
  SAFETY_ASSURANCE: {
    en: "Safety Assurance",
    fr: "Assurance de la Sécurité",
  },
  SAFETY_PROMOTION: {
    en: "Safety Promotion",
    fr: "Promotion de la Sécurité",
  },
};

const ROLE_LABELS: Record<TeamRole, { en: string; fr: string }> = {
  LEAD_REVIEWER: { en: "Lead Reviewer", fr: "Réviseur Principal" },
  REVIEWER: { en: "Reviewer", fr: "Réviseur" },
  TECHNICAL_EXPERT: { en: "Technical Expert", fr: "Expert Technique" },
  OBSERVER: { en: "Observer", fr: "Observateur" },
  TRAINEE: { en: "Trainee", fr: "Stagiaire" },
};

const FINDING_TYPE_LABELS: Record<FindingType, { en: string; fr: string }> = {
  NON_CONFORMITY: { en: "Non-Conformity", fr: "Non-Conformité" },
  OBSERVATION: { en: "Observation", fr: "Observation" },
  RECOMMENDATION: { en: "Recommendation", fr: "Recommandation" },
  GOOD_PRACTICE: { en: "Good Practice", fr: "Bonne Pratique" },
  CONCERN: { en: "Concern", fr: "Préoccupation" },
};

const SEVERITY_LABELS: Record<FindingSeverity, { en: string; fr: string }> = {
  CRITICAL: { en: "Critical", fr: "Critique" },
  MAJOR: { en: "Major", fr: "Majeur" },
  MINOR: { en: "Minor", fr: "Mineur" },
  OBSERVATION: { en: "Observation", fr: "Observation" },
};

const STATUS_LABELS: Record<FindingStatus, { en: string; fr: string }> = {
  OPEN: { en: "Open", fr: "Ouvert" },
  CAP_REQUIRED: { en: "CAP Required", fr: "PAC Requis" },
  CAP_SUBMITTED: { en: "CAP Submitted", fr: "PAC Soumis" },
  CAP_ACCEPTED: { en: "CAP Accepted", fr: "PAC Accepté" },
  IN_PROGRESS: { en: "In Progress", fr: "En Cours" },
  VERIFICATION: { en: "Verification", fr: "Vérification" },
  CLOSED: { en: "Closed", fr: "Clôturé" },
  DEFERRED: { en: "Deferred", fr: "Différé" },
};

const CAP_STATUS_LABELS: Record<CAPStatus, { en: string; fr: string }> = {
  DRAFT: { en: "Draft", fr: "Brouillon" },
  SUBMITTED: { en: "Submitted", fr: "Soumis" },
  UNDER_REVIEW: { en: "Under Review", fr: "En Révision" },
  ACCEPTED: { en: "Accepted", fr: "Accepté" },
  REJECTED: { en: "Rejected", fr: "Rejeté" },
  IN_PROGRESS: { en: "In Progress", fr: "En Cours" },
  COMPLETED: { en: "Completed", fr: "Terminé" },
  VERIFIED: { en: "Verified", fr: "Vérifié" },
  CLOSED: { en: "Closed", fr: "Clôturé" },
};

// =============================================================================
// HELPERS
// =============================================================================

function getEIScoreClass(score: number): string {
  if (score >= 80) return "score-badge high";
  if (score >= 60) return "score-badge medium";
  return "score-badge low";
}

function getMaturityClass(level: MaturityLevel | null): string {
  if (!level) return "score-badge";
  const levelMap: Record<MaturityLevel, string> = {
    LEVEL_A: "score-badge maturity-a",
    LEVEL_B: "score-badge maturity-b",
    LEVEL_C: "score-badge maturity-c",
    LEVEL_D: "score-badge maturity-d",
    LEVEL_E: "score-badge maturity-e",
  };
  return levelMap[level];
}

function getSeverityClass(severity: FindingSeverity): string {
  const map: Record<FindingSeverity, string> = {
    CRITICAL: "status-badge severity-critical",
    MAJOR: "status-badge severity-major",
    MINOR: "status-badge severity-minor",
    OBSERVATION: "status-badge severity-observation",
  };
  return map[severity];
}

function getStatusClass(status: FindingStatus): string {
  const map: Record<FindingStatus, string> = {
    OPEN: "status-badge status-open",
    CAP_REQUIRED: "status-badge status-draft",
    CAP_SUBMITTED: "status-badge status-in-progress",
    CAP_ACCEPTED: "status-badge status-in-progress",
    IN_PROGRESS: "status-badge status-in-progress",
    VERIFICATION: "status-badge status-resolved",
    CLOSED: "status-badge status-closed",
    DEFERRED: "status-badge status-draft",
  };
  return map[status];
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ReportPrintView = forwardRef<HTMLDivElement, ReportPrintViewProps>(
  function ReportPrintView(
    {
      report,
      review,
      team,
      assessmentScores,
      findings,
      caps,
      locale,
      translations: t,
    },
    ref
  ) {
    const dateLocale = locale === "fr" ? fr : enUS;
    const now = new Date();

    const formatDate = (date: Date | null) => {
      if (!date) return "—";
      return format(new Date(date), "dd MMM yyyy", { locale: dateLocale });
    };

    const title = locale === "fr" ? report.titleFr : report.titleEn;
    const orgName = locale === "fr"
      ? review.hostOrganization.nameFr
      : review.hostOrganization.nameEn;
    const executiveSummary = locale === "fr"
      ? report.executiveSummaryFr
      : report.executiveSummaryEn;

    return (
      <div ref={ref} className="report-print-container">
        {/* Cover Page */}
        <div className="report-cover">
          <div className="logo">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" stroke="#1e3a5f" strokeWidth="2" />
              <path
                d="M50 15 L65 45 L95 50 L65 55 L50 85 L35 55 L5 50 L35 45 Z"
                fill="#1e3a5f"
              />
              <circle cx="50" cy="50" r="15" fill="#1e3a5f" />
            </svg>
          </div>
          <h1 className="title">{title}</h1>
          <p className="subtitle">African ANSP Peer Review Programme</p>
          <p className="organization">{orgName}</p>
          <p className="details">
            {review.hostOrganization.icaoCode && `${review.hostOrganization.icaoCode} • `}
            {review.hostOrganization.country}
          </p>
          <p className="details">
            {review.referenceNumber}
          </p>
          <p className="date">
            {t.generatedOn.replace("{date}", format(now, "dd MMMM yyyy", { locale: dateLocale }))}
          </p>
          <div className="confidential">{t.confidential}</div>
        </div>

        {/* Executive Summary Section */}
        <div className="report-section page-break">
          <h2 className="report-section-title">{t.executiveSummary}</h2>

          {/* Summary Stats */}
          <div className="summary-grid">
            <div className="summary-item">
              <div className="value">
                <span className={getEIScoreClass(report.overallEI || 0)}>
                  {report.overallEI?.toFixed(1) || "—"}%
                </span>
              </div>
              <div className="label">{t.overallEI}</div>
            </div>
            <div className="summary-item">
              <div className="value">
                <span className={getMaturityClass(report.overallMaturity)}>
                  {report.overallMaturity?.replace("LEVEL_", "") || "—"}
                </span>
              </div>
              <div className="label">{t.overallMaturity}</div>
            </div>
            <div className="summary-item">
              <div className="value">{findings.total}</div>
              <div className="label">{t.findings}</div>
            </div>
            <div className="summary-item">
              <div className="value">{caps.total}</div>
              <div className="label">{t.caps}</div>
            </div>
            <div className="summary-item">
              <div className="value">{caps.completionRate.toFixed(0)}%</div>
              <div className="label">{t.completionRate}</div>
            </div>
            <div className="summary-item">
              <div className="value" style={{ color: caps.overdueCount > 0 ? "#c53030" : "inherit" }}>
                {caps.overdueCount}
              </div>
              <div className="label">{t.overdue}</div>
            </div>
          </div>

          {/* Executive Summary Text */}
          {executiveSummary && (
            <div className="print-card">
              <p style={{ whiteSpace: "pre-wrap" }}>{executiveSummary}</p>
            </div>
          )}
        </div>

        {/* Scores Section */}
        <div className="report-section page-break">
          <h2 className="report-section-title">{t.scores}</h2>

          <div className="two-column">
            {/* ANS Scores */}
            <div className="print-card">
              <h3 style={{ marginBottom: "12pt" }}>ANS USOAP CMA - Effective Implementation</h3>
              {assessmentScores.ans ? (
                <table>
                  <thead>
                    <tr>
                      <th>{t.auditArea}</th>
                      <th style={{ textAlign: "right" }}>{t.score}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(assessmentScores.ans.byAuditArea)
                      .filter(([, data]) => data.total > 0)
                      .sort(([, a], [, b]) => b.score - a.score)
                      .map(([area, data]) => {
                        const label = AUDIT_AREA_LABELS[area];
                        const areaName = locale === "fr" ? label?.fr : label?.en;
                        return (
                          <tr key={area}>
                            <td>{areaName || area}</td>
                            <td style={{ textAlign: "right" }}>
                              <span className={getEIScoreClass(data.score)}>
                                {data.score.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    <tr style={{ fontWeight: 600 }}>
                      <td>{t.total}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className={getEIScoreClass(assessmentScores.ans.overallEI)}>
                          {assessmentScores.ans.overallEI.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">No ANS assessment data available.</p>
              )}
            </div>

            {/* SMS Scores */}
            <div className="print-card">
              <h3 style={{ marginBottom: "12pt" }}>SMS CANSO SoE - Maturity Assessment</h3>
              {assessmentScores.sms ? (
                <table>
                  <thead>
                    <tr>
                      <th>{t.component}</th>
                      <th style={{ textAlign: "right" }}>{t.maturityLevel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(assessmentScores.sms.byComponent)
                      .filter(([, data]) => data.count > 0)
                      .map(([component, data]) => {
                        const label = SMS_COMPONENT_LABELS[component];
                        const componentName = locale === "fr" ? label?.fr : label?.en;
                        return (
                          <tr key={component}>
                            <td>{componentName || component}</td>
                            <td style={{ textAlign: "right" }}>
                              <span className={getMaturityClass(data.level)}>
                                {data.level?.replace("LEVEL_", "") || "—"}
                              </span>
                              <span className="text-muted text-sm" style={{ marginLeft: "8pt" }}>
                                ({data.avgScore.toFixed(1)}/5)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    <tr style={{ fontWeight: 600 }}>
                      <td>{t.total}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className={getMaturityClass(assessmentScores.sms.overallMaturity)}>
                          {assessmentScores.sms.overallMaturity?.replace("LEVEL_", "") || "—"}
                        </span>
                        <span className="text-muted text-sm" style={{ marginLeft: "8pt" }}>
                          ({assessmentScores.sms.overallScore.toFixed(1)}/5)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">No SMS assessment data available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Findings Section */}
        <div className="report-section page-break">
          <h2 className="report-section-title">{t.findings} ({findings.total})</h2>

          {findings.findings.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "15%" }}>{t.reference}</th>
                  <th style={{ width: "35%" }}>{t.finding}</th>
                  <th style={{ width: "15%" }}>{t.type}</th>
                  <th style={{ width: "12%" }}>{t.severity}</th>
                  <th style={{ width: "12%" }}>{t.status}</th>
                  <th style={{ width: "11%" }}>{t.dueDate}</th>
                </tr>
              </thead>
              <tbody>
                {findings.findings.map((finding) => {
                  const findingTitle = locale === "fr" ? finding.titleFr : finding.titleEn;
                  const typeLabel = locale === "fr"
                    ? FINDING_TYPE_LABELS[finding.findingType].fr
                    : FINDING_TYPE_LABELS[finding.findingType].en;
                  const severityLabel = locale === "fr"
                    ? SEVERITY_LABELS[finding.severity].fr
                    : SEVERITY_LABELS[finding.severity].en;
                  const statusLabel = locale === "fr"
                    ? STATUS_LABELS[finding.status].fr
                    : STATUS_LABELS[finding.status].en;

                  return (
                    <tr key={finding.id}>
                      <td className="font-semibold">{finding.referenceNumber}</td>
                      <td>{findingTitle}</td>
                      <td>{typeLabel}</td>
                      <td>
                        <span className={getSeverityClass(finding.severity)}>
                          {severityLabel}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusClass(finding.status)}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>{formatDate(finding.targetCloseDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">No findings recorded.</p>
          )}
        </div>

        {/* CAPs Section */}
        <div className="report-section page-break">
          <h2 className="report-section-title">{t.caps} ({caps.total})</h2>

          {/* CAP Summary Stats */}
          <div className="summary-grid" style={{ marginBottom: "16pt" }}>
            <div className="summary-item">
              <div className="value">{caps.total}</div>
              <div className="label">{t.total}</div>
            </div>
            <div className="summary-item">
              <div className="value">{caps.completionRate.toFixed(0)}%</div>
              <div className="label">{t.completionRate}</div>
            </div>
            <div className="summary-item">
              <div className="value" style={{ color: caps.overdueCount > 0 ? "#c53030" : "inherit" }}>
                {caps.overdueCount}
              </div>
              <div className="label">{t.overdue}</div>
            </div>
          </div>

          {/* CAP Status Breakdown */}
          {caps.total > 0 && (
            <div className="print-card" style={{ marginBottom: "16pt" }}>
              <h4 style={{ marginBottom: "8pt" }}>Status Breakdown</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8pt" }}>
                {Object.entries(caps.byStatus)
                  .filter(([, count]) => count > 0)
                  .map(([status, count]) => {
                    const statusLabel = locale === "fr"
                      ? CAP_STATUS_LABELS[status as CAPStatus].fr
                      : CAP_STATUS_LABELS[status as CAPStatus].en;
                    return (
                      <span key={status} className="status-badge status-draft">
                        {statusLabel}: {count}
                      </span>
                    );
                  })}
              </div>
            </div>
          )}

          {/* CAP Table */}
          {caps.caps.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>{t.finding}</th>
                  <th>{t.status}</th>
                  <th>{t.dueDate}</th>
                </tr>
              </thead>
              <tbody>
                {caps.caps.map((cap) => {
                  const statusLabel = locale === "fr"
                    ? CAP_STATUS_LABELS[cap.status].fr
                    : CAP_STATUS_LABELS[cap.status].en;
                  return (
                    <tr key={cap.id} style={cap.isOverdue ? { backgroundColor: "#fed7d7" } : {}}>
                      <td className="font-semibold">{cap.findingRef}</td>
                      <td>{statusLabel}</td>
                      <td>
                        {formatDate(cap.dueDate)}
                        {cap.isOverdue && (
                          <span style={{ color: "#c53030", marginLeft: "4pt" }}>(Overdue)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">No CAPs required.</p>
          )}
        </div>

        {/* Team Section */}
        <div className="report-section page-break">
          <h2 className="report-section-title">{t.team}</h2>

          {team.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.role}</th>
                  <th>{t.email}</th>
                </tr>
              </thead>
              <tbody>
                {team
                  .sort((a, b) => {
                    // Sort by role priority
                    const roleOrder: Record<TeamRole, number> = {
                      LEAD_REVIEWER: 0,
                      REVIEWER: 1,
                      TECHNICAL_EXPERT: 2,
                      OBSERVER: 3,
                      TRAINEE: 4,
                    };
                    return roleOrder[a.role] - roleOrder[b.role];
                  })
                  .map((member) => {
                    const roleLabel = locale === "fr"
                      ? ROLE_LABELS[member.role].fr
                      : ROLE_LABELS[member.role].en;
                    return (
                      <tr key={member.userId}>
                        <td className="font-semibold">
                          {member.firstName} {member.lastName}
                          {member.title && (
                            <span className="text-muted text-sm" style={{ display: "block" }}>
                              {member.title}
                            </span>
                          )}
                        </td>
                        <td>{roleLabel}</td>
                        <td className="text-sm">{member.email}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">No team members assigned.</p>
          )}
        </div>

        {/* Footer */}
        <div className="print-footer">
          <span>{t.confidential}</span>
          <span>{review.referenceNumber}</span>
          <span className="page-number">{t.page.replace("{current}", "").replace(" of {total}", "")}</span>
        </div>
      </div>
    );
  }
);

export default ReportPrintView;
