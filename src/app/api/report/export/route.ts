/**
 * DOCX Export API Route
 *
 * GET /api/report/export?reviewId=xxx&format=docx&locale=en
 *
 * Generates a professional .docx document from the ReviewReport.content JSON.
 * Follows AAPRP Programme Manual structure with ICAO/CANSO formatting.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  TableOfContents,
  ShadingType,
  VerticalAlign,
} from "docx";
import type { ReportContent, FindingDetail, CAPSummary } from "@/types/report";

// =============================================================================
// CONSTANTS
// =============================================================================

const ICAO_BLUE = "0072BC";
const HEADER_BG = "D5E8F0";
const RED = "DC2626";
const ORANGE = "EA580C";
const AMBER = "D97706";
const GREEN = "16A34A";
const GREY = "6B7280";
const _WHITE = "FFFFFF";

type DocChild = Paragraph | Table | TableOfContents;

const OVERSIGHT_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
  "STEERING_COMMITTEE",
];

const BORDER_STYLE = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: "BFBFBF",
} as const;

const CELL_BORDERS = {
  top: BORDER_STYLE,
  bottom: BORDER_STYLE,
  left: BORDER_STYLE,
  right: BORDER_STYLE,
};

// =============================================================================
// LABELS (EN/FR)
// =============================================================================

interface Labels {
  programme: string;
  peerReviewReport: string;
  reportReference: string;
  classification: string;
  date: string;
  tableOfContents: string;
  executiveSummary: string;
  introduction: string;
  background: string;
  objectives: string;
  scope: string;
  basisDocuments: string;
  activitySchedule: string;
  phase: string;
  description: string;
  dateRange: string;
  methodology: string;
  reviewApproach: string;
  frameworksUsed: string;
  framework: string;
  version: string;
  reviewAreasInScope: string;
  reviewArea: string;
  code: string;
  pqs: string;
  inScope: string;
  reviewTeam: string;
  teamComposition: string;
  name: string;
  role: string;
  organization: string;
  expertise: string;
  country: string;
  ansAssessment: string;
  overallEIScore: string;
  eiByReviewArea: string;
  satisfactory: string;
  applicable: string;
  eiScore: string;
  status: string;
  eiByCriticalElement: string;
  analysisNarrative: string;
  smsAssessment: string;
  overallMaturityLevel: string;
  maturityByComponent: string;
  component: string;
  maturityLevel: string;
  score: string;
  findings: string;
  findingsSummary: string;
  type: string;
  count: string;
  severity: string;
  detailedFindings: string;
  reference: string;
  finding: string;
  evidence: string;
  icaoRef: string;
  criticalElement: string;
  capRequired: string;
  capStatus: string;
  yes: string;
  no: string;
  correctiveActionPlans: string;
  capSummary: string;
  capDetail: string;
  rootCause: string;
  correctiveAction: string;
  responsibleParty: string;
  dueDate: string;
  totalCAPs: string;
  submitted: string;
  accepted: string;
  overdue: string;
  completionRate: string;
  recommendations: string;
  bestPractices: string;
  title: string;
  applicability: string;
  conclusion: string;
  annexes: string;
  documentList: string;
  category: string;
  glossary: string;
  glossaryTitle: string;
  confidential: string;
  pageOf: string;
}

const LABELS_EN: Labels = {
  programme: "African ANSP Peer Review Programme",
  peerReviewReport: "Peer Review Report",
  reportReference: "Report Reference",
  classification: "Classification",
  date: "Date",
  tableOfContents: "Table of Contents",
  executiveSummary: "Executive Summary",
  introduction: "Introduction",
  background: "Background",
  objectives: "Objectives",
  scope: "Scope",
  basisDocuments: "Basis Documents",
  activitySchedule: "Activity Schedule",
  phase: "Phase",
  description: "Description",
  dateRange: "Date Range",
  methodology: "Methodology",
  reviewApproach: "Review Approach",
  frameworksUsed: "Frameworks Used",
  framework: "Framework",
  version: "Version",
  reviewAreasInScope: "Review Areas in Scope",
  reviewArea: "Review Area",
  code: "Code",
  pqs: "PQs",
  inScope: "In Scope",
  reviewTeam: "Review Team",
  teamComposition: "Team Composition",
  name: "Name",
  role: "Role",
  organization: "Organization",
  expertise: "Expertise",
  country: "Country",
  ansAssessment: "ANS Assessment Results (ICAO USOAP CMA)",
  overallEIScore: "Overall Effective Implementation Score",
  eiByReviewArea: "EI Score by Review Area",
  satisfactory: "Satisfactory",
  applicable: "Applicable",
  eiScore: "EI Score",
  status: "Status",
  eiByCriticalElement: "EI Score by Critical Element",
  analysisNarrative: "Analysis",
  smsAssessment: "SMS Assessment Results (CANSO SoE)",
  overallMaturityLevel: "Overall Maturity Level",
  maturityByComponent: "Maturity by SMS Component",
  component: "Component",
  maturityLevel: "Level",
  score: "Score",
  findings: "Findings",
  findingsSummary: "Findings Summary",
  type: "Type",
  count: "Count",
  severity: "Severity",
  detailedFindings: "Detailed Findings",
  reference: "Reference",
  finding: "Finding",
  evidence: "Evidence",
  icaoRef: "ICAO Reference",
  criticalElement: "Critical Element",
  capRequired: "CAP Required",
  capStatus: "CAP Status",
  yes: "Yes",
  no: "No",
  correctiveActionPlans: "Corrective Action Plans",
  capSummary: "CAP Summary",
  capDetail: "CAP Detail",
  rootCause: "Root Cause",
  correctiveAction: "Corrective Action",
  responsibleParty: "Responsible Party",
  dueDate: "Due Date",
  totalCAPs: "Total CAPs",
  submitted: "Submitted",
  accepted: "Accepted",
  overdue: "Overdue",
  completionRate: "Completion Rate",
  recommendations: "Recommendations",
  bestPractices: "Best Practices Identified",
  title: "Title",
  applicability: "Applicability",
  conclusion: "Conclusion",
  annexes: "Annexes",
  documentList: "Document List",
  category: "Category",
  glossary: "Glossary of Terms",
  glossaryTitle: "Glossary of Terms",
  confidential: "CONFIDENTIAL",
  pageOf: "Page",
};

const LABELS_FR: Labels = {
  programme: "Programme Africain d'Examen par les Pairs des ANSP",
  peerReviewReport: "Rapport d'Examen par les Pairs",
  reportReference: "Référence du Rapport",
  classification: "Classification",
  date: "Date",
  tableOfContents: "Table des Matières",
  executiveSummary: "Résumé Exécutif",
  introduction: "Introduction",
  background: "Contexte",
  objectives: "Objectifs",
  scope: "Portée",
  basisDocuments: "Documents de Référence",
  activitySchedule: "Calendrier des Activités",
  phase: "Phase",
  description: "Description",
  dateRange: "Dates",
  methodology: "Méthodologie",
  reviewApproach: "Approche de Revue",
  frameworksUsed: "Cadres Utilisés",
  framework: "Cadre",
  version: "Version",
  reviewAreasInScope: "Domaines d'Examen Couverts",
  reviewArea: "Domaine d'Examen",
  code: "Code",
  pqs: "PQs",
  inScope: "Inclus",
  reviewTeam: "Équipe d'Évaluation",
  teamComposition: "Composition de l'Équipe",
  name: "Nom",
  role: "Rôle",
  organization: "Organisation",
  expertise: "Expertise",
  country: "Pays",
  ansAssessment: "Résultats de l'Évaluation ANS (OACI USOAP CMA)",
  overallEIScore: "Score Global de Mise en Œuvre Effective",
  eiByReviewArea: "Score EI par Domaine d'Examen",
  satisfactory: "Satisfaisant",
  applicable: "Applicable",
  eiScore: "Score EI",
  status: "Statut",
  eiByCriticalElement: "Score EI par Élément Critique",
  analysisNarrative: "Analyse",
  smsAssessment: "Résultats de l'Évaluation SMS (CANSO SoE)",
  overallMaturityLevel: "Niveau de Maturité Global",
  maturityByComponent: "Maturité par Composante SMS",
  component: "Composante",
  maturityLevel: "Niveau",
  score: "Score",
  findings: "Constats",
  findingsSummary: "Résumé des Constats",
  type: "Type",
  count: "Nombre",
  severity: "Gravité",
  detailedFindings: "Constats Détaillés",
  reference: "Référence",
  finding: "Constat",
  evidence: "Preuves",
  icaoRef: "Référence OACI",
  criticalElement: "Élément Critique",
  capRequired: "PAC Requis",
  capStatus: "Statut PAC",
  yes: "Oui",
  no: "Non",
  correctiveActionPlans: "Plans d'Actions Correctives",
  capSummary: "Résumé des PAC",
  capDetail: "Détail des PAC",
  rootCause: "Cause Racine",
  correctiveAction: "Action Corrective",
  responsibleParty: "Responsable",
  dueDate: "Date d'Échéance",
  totalCAPs: "Total PAC",
  submitted: "Soumis",
  accepted: "Acceptés",
  overdue: "En Retard",
  completionRate: "Taux d'Achèvement",
  recommendations: "Recommandations",
  bestPractices: "Bonnes Pratiques Identifiées",
  title: "Titre",
  applicability: "Applicabilité",
  conclusion: "Conclusion",
  annexes: "Annexes",
  documentList: "Liste des Documents",
  category: "Catégorie",
  glossary: "Glossaire",
  glossaryTitle: "Glossaire des Termes",
  confidential: "CONFIDENTIEL",
  pageOf: "Page",
};

// =============================================================================
// GLOSSARY
// =============================================================================

const GLOSSARY_EN: [string, string][] = [
  ["ANSP", "Air Navigation Service Provider"],
  ["CAA", "Civil Aviation Authority"],
  ["CAP", "Corrective Action Plan"],
  ["CE", "Critical Element"],
  ["EI", "Effective Implementation"],
  ["ICAO", "International Civil Aviation Organization"],
  ["PQ", "Protocol Question"],
  ["SMS", "Safety Management System"],
  ["SoE", "Standard of Excellence"],
  ["USOAP CMA", "Universal Safety Oversight Audit Programme – Continuous Monitoring Approach"],
];

const GLOSSARY_FR: [string, string][] = [
  ["ANSP", "Fournisseur de Services de Navigation Aérienne"],
  ["CAA", "Autorité de l'Aviation Civile"],
  ["PAC", "Plan d'Action Corrective"],
  ["CE", "Élément Critique"],
  ["EI", "Mise en Œuvre Effective"],
  ["OACI", "Organisation de l'Aviation Civile Internationale"],
  ["PQ", "Question de Protocole"],
  ["SMS", "Système de Gestion de la Sécurité"],
  ["SoE", "Standard d'Excellence"],
  ["USOAP CMA", "Programme Universel d'Audit de Supervision – Approche de Surveillance Continue"],
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getEIColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 60) return AMBER;
  return RED;
}

function headerCell(text: string, width?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18, color: "1F2937", font: "Calibri" })],
        spacing: { before: 40, after: 40 },
      }),
    ],
    shading: { fill: HEADER_BG, type: ShadingType.CLEAR, color: "auto" },
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDERS,
    ...(width ? { width: { size: width, type: WidthType.DXA } } : {}),
  });
}

function cell(text: string, opts?: { color?: string; bold?: boolean; width?: number; mono?: boolean }): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: 18,
            color: opts?.color || "374151",
            bold: opts?.bold,
            font: opts?.mono ? "Courier New" : "Calibri",
          }),
        ],
        spacing: { before: 30, after: 30 },
      }),
    ],
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDERS,
    ...(opts?.width ? { width: { size: opts.width, type: WidthType.DXA } } : {}),
  });
}

function heading1(text: string, numbering?: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: numbering ? `${numbering}  ${text}` : text,
        bold: true,
        size: 28,
        color: ICAO_BLUE,
        font: "Calibri",
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
  });
}

function heading2(text: string, numbering?: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: numbering ? `${numbering}  ${text}` : text,
        bold: true,
        size: 24,
        color: "1E40AF",
        font: "Calibri",
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: "Calibri" })],
    spacing: { before: 60, after: 60 },
  });
}

function bulletPoint(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: "Calibri" })],
    bullet: { level: 0 },
    spacing: { before: 30, after: 30 },
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [] });
}

function splitText(text: string): Paragraph[] {
  if (!text) return [bodyText("—")];
  return text.split("\n").filter((l) => l.trim()).map((line) => bodyText(line));
}

function localeText(section: { contentEn: string; contentFr: string }, locale: string): string {
  return locale === "fr" ? section.contentFr || section.contentEn : section.contentEn || section.contentFr;
}

// =============================================================================
// DOCUMENT BUILDER
// =============================================================================

function buildDocx(report: ReportContent, locale: string): Document {
  const L = locale === "fr" ? LABELS_FR : LABELS_EN;
  const glossary = locale === "fr" ? GLOSSARY_FR : GLOSSARY_EN;
  const meta = report.metadata;
  const orgName = locale === "fr" ? meta.hostOrganization.nameFr : meta.hostOrganization.nameEn;
  const sections = report.sections;

  // ───────────────────────────────────────────────────────────────────
  // COVER PAGE
  // ───────────────────────────────────────────────────────────────────
  const coverPage: DocChild[] = [
    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    new Paragraph({
      children: [new TextRun({ text: L.programme, bold: true, size: 24, color: GREY, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
    }),
    emptyLine(),
    new Paragraph({
      children: [new TextRun({ text: "━".repeat(40), color: ICAO_BLUE, size: 20 })],
      alignment: AlignmentType.CENTER,
    }),
    emptyLine(),
    new Paragraph({
      children: [new TextRun({ text: L.peerReviewReport, bold: true, size: 44, color: ICAO_BLUE, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
    }),
    emptyLine(),
    new Paragraph({
      children: [new TextRun({ text: orgName, bold: true, size: 32, color: "1F2937", font: "Calibri" })],
      alignment: AlignmentType.CENTER,
    }),
    emptyLine(),
    emptyLine(),
    new Paragraph({
      children: [new TextRun({ text: `${L.reportReference}: ${report.coverPage.reportNumber}`, size: 22, color: GREY, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `${L.date}: ${report.coverPage.date}`, size: 22, color: GREY, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `${L.classification}: ${report.coverPage.classification}`, size: 22, color: RED, bold: true, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
    }),
    emptyLine(),
    new Paragraph({
      children: [new TextRun({ text: "━".repeat(40), color: ICAO_BLUE, size: 20 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ───────────────────────────────────────────────────────────────────
  // TABLE OF CONTENTS
  // ───────────────────────────────────────────────────────────────────
  const tocSection: DocChild[] = [
    heading1(L.tableOfContents),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ───────────────────────────────────────────────────────────────────
  // SECTION 1: EXECUTIVE SUMMARY
  // ───────────────────────────────────────────────────────────────────
  const sec1: DocChild[] = [
    heading1(L.executiveSummary, "1."),
    ...splitText(localeText(sections.executiveSummary, locale)),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ───────────────────────────────────────────────────────────────────
  // SECTION 2: INTRODUCTION
  // ───────────────────────────────────────────────────────────────────
  const intro = sections.introduction;
  const sec2: DocChild[] = [
    heading1(L.introduction, "2."),
    heading2(L.background, "2.1"),
    ...splitText(localeText(intro.background, locale)),
    heading2(L.objectives, "2.2"),
    ...intro.objectives.map((o) => bulletPoint(o)),
    heading2(L.scope, "2.3"),
    ...intro.scope.map((s) => bulletPoint(s)),
    heading2(L.basisDocuments, "2.4"),
    ...intro.basisDocuments.map((d) => bulletPoint(d)),
  ];

  if (intro.activitySchedule.length > 0) {
    sec2.push(
      heading2(L.activitySchedule, "2.5"),
      new Table({
        rows: [
          new TableRow({
            children: [headerCell(L.phase), headerCell(L.description), headerCell(L.dateRange)],
            tableHeader: true,
          }),
          ...intro.activitySchedule.map(
            (a) =>
              new TableRow({
                children: [cell(a.phase, { bold: true }), cell(a.description), cell(a.dateRange)],
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }
  sec2.push(new Paragraph({ children: [new PageBreak()] }));

  // ───────────────────────────────────────────────────────────────────
  // SECTION 3: METHODOLOGY
  // ───────────────────────────────────────────────────────────────────
  const meth = sections.methodology;
  const sec3: DocChild[] = [
    heading1(L.methodology, "3."),
    heading2(L.reviewApproach, "3.1"),
    ...splitText(localeText(meth.approachDescription, locale)),
    heading2(L.frameworksUsed, "3.2"),
  ];

  if (meth.frameworksUsed.length > 0) {
    sec3.push(
      new Table({
        rows: [
          new TableRow({
            children: [headerCell(L.framework), headerCell(L.version), headerCell(L.description)],
            tableHeader: true,
          }),
          ...meth.frameworksUsed.map(
            (fw) =>
              new TableRow({
                children: [cell(fw.name, { bold: true }), cell(fw.version), cell(fw.description)],
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }

  const inScopeAreas = meth.reviewAreas.filter((a) => a.inScope);
  if (inScopeAreas.length > 0) {
    sec3.push(
      heading2(L.reviewAreasInScope, "3.3"),
      new Table({
        rows: [
          new TableRow({
            children: [headerCell(L.code, 1400), headerCell(L.reviewArea), headerCell(L.pqs, 1400)],
            tableHeader: true,
          }),
          ...inScopeAreas.map(
            (a) =>
              new TableRow({
                children: [cell(a.code, { mono: true }), cell(a.name), cell(String(a.pqCount))],
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }
  sec3.push(new Paragraph({ children: [new PageBreak()] }));

  // ───────────────────────────────────────────────────────────────────
  // SECTION 4: REVIEW TEAM
  // ───────────────────────────────────────────────────────────────────
  const team = sections.teamComposition;
  const allMembers = [
    ...(team.teamLead ? [team.teamLead] : []),
    ...team.members,
  ];
  const sec4: DocChild[] = [
    heading1(L.reviewTeam, "4."),
    heading2(L.teamComposition, "4.1"),
  ];

  if (allMembers.length > 0) {
    sec4.push(
      new Table({
        rows: [
          new TableRow({
            children: [
              headerCell(L.name),
              headerCell(L.role),
              headerCell(L.organization),
              headerCell(L.expertise),
              headerCell(L.country),
            ],
            tableHeader: true,
          }),
          ...allMembers.map(
            (m) =>
              new TableRow({
                children: [
                  cell(m.name, { bold: true }),
                  cell(m.role.replace(/_/g, " ")),
                  cell(m.organization),
                  cell(m.expertise.join(", ")),
                  cell(m.country),
                ],
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }
  sec4.push(new Paragraph({ children: [new PageBreak()] }));

  // ───────────────────────────────────────────────────────────────────
  // SECTION 5: ANS ASSESSMENT
  // ───────────────────────────────────────────────────────────────────
  const ans = sections.ansAssessment;
  const sec5: DocChild[] = [heading1(L.ansAssessment, "5.")];

  if (ans.available) {
    sec5.push(
      heading2(L.overallEIScore, "5.1"),
      bodyText(
        ans.overallEIScore !== null ? `${ans.overallEIScore.toFixed(1)}%` : "—"
      )
    );

    if (ans.byReviewArea.length > 0) {
      sec5.push(
        heading2(L.eiByReviewArea, "5.2"),
        new Table({
          rows: [
            new TableRow({
              children: [
                headerCell(L.code, 1200),
                headerCell(L.reviewArea),
                headerCell(L.applicable, 1400),
                headerCell(L.satisfactory, 1400),
                headerCell(L.eiScore, 1400),
                headerCell(L.status, 1200),
              ],
              tableHeader: true,
            }),
            ...ans.byReviewArea.map((a) => {
              const applicable = a.totalPQs - a.notApplicablePQs;
              const color = getEIColor(a.eiScore);
              const statusText = a.eiScore >= 80 ? "✓" : a.eiScore >= 60 ? "⚠" : "✗";
              return new TableRow({
                children: [
                  cell(a.code, { mono: true }),
                  cell(a.name),
                  cell(String(applicable)),
                  cell(String(a.satisfactoryPQs)),
                  cell(`${a.eiScore.toFixed(1)}%`, { color, bold: true }),
                  cell(statusText, { color }),
                ],
              });
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    if (ans.byCriticalElement.length > 0) {
      sec5.push(
        heading2(L.eiByCriticalElement, "5.3"),
        new Table({
          rows: [
            new TableRow({
              children: [headerCell(L.code, 1400), headerCell(L.name), headerCell(L.eiScore, 1600)],
              tableHeader: true,
            }),
            ...ans.byCriticalElement.map((ce) => {
              const color = getEIColor(ce.eiScore);
              return new TableRow({
                children: [
                  cell(ce.code, { mono: true }),
                  cell(ce.name),
                  cell(`${ce.eiScore.toFixed(1)}%`, { color, bold: true }),
                ],
              });
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    const narrative = locale === "fr" ? ans.narrativeFr : ans.narrativeEn;
    if (narrative) {
      sec5.push(heading2(L.analysisNarrative, "5.4"), ...splitText(narrative));
    }
  } else {
    sec5.push(bodyText("—"));
  }
  sec5.push(new Paragraph({ children: [new PageBreak()] }));

  // ───────────────────────────────────────────────────────────────────
  // SECTION 6: SMS ASSESSMENT
  // ───────────────────────────────────────────────────────────────────
  const sms = sections.smsAssessment;
  const sec6: DocChild[] = [heading1(L.smsAssessment, "6.")];

  if (sms.available) {
    sec6.push(
      heading2(L.overallMaturityLevel, "6.1"),
      bodyText(
        sms.overallMaturityLevel
          ? `${L.maturityLevel} ${sms.overallMaturityLevel} — ${sms.overallScore !== null ? `${sms.overallScore.toFixed(0)}%` : ""}`
          : "—"
      )
    );

    if (sms.byComponent.length > 0) {
      sec6.push(
        heading2(L.maturityByComponent, "6.2"),
        new Table({
          rows: [
            new TableRow({
              children: [
                headerCell(L.code, 1200),
                headerCell(L.component),
                headerCell(L.maturityLevel, 1400),
                headerCell(L.score, 1400),
              ],
              tableHeader: true,
            }),
            ...sms.byComponent.map(
              (c) =>
                new TableRow({
                  children: [
                    cell(c.code, { mono: true }),
                    cell(c.name),
                    cell(c.maturityLevel, { bold: true }),
                    cell(`${c.score.toFixed(0)}%`),
                  ],
                })
            ),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    const narrative = locale === "fr" ? sms.narrativeFr : sms.narrativeEn;
    if (narrative) {
      sec6.push(heading2(L.analysisNarrative, "6.3"), ...splitText(narrative));
    }
  } else {
    sec6.push(bodyText("—"));
  }
  sec6.push(new Paragraph({ children: [new PageBreak()] }));

  // ───────────────────────────────────────────────────────────────────
  // SECTION 7: FINDINGS
  // ───────────────────────────────────────────────────────────────────
  const fSum = sections.findingsSummary;
  const fDet = sections.findingsDetail;
  const sec7: DocChild[] = [
    heading1(L.findings, "7."),
    heading2(L.findingsSummary, "7.1"),
  ];

  // By Type summary
  const typeEntries = Object.entries(fSum.byType);
  if (typeEntries.length > 0) {
    sec7.push(
      bodyText(`${L.type}:`),
      new Table({
        rows: [
          new TableRow({ children: [headerCell(L.type), headerCell(L.count, 1400)], tableHeader: true }),
          ...typeEntries.map(
            ([t, c]) =>
              new TableRow({ children: [cell(t.replace(/_/g, " ")), cell(String(c))] })
          ),
        ],
        width: { size: 60, type: WidthType.PERCENTAGE },
      }),
      emptyLine()
    );
  }

  // By Severity summary
  const sevEntries = Object.entries(fSum.bySeverity);
  if (sevEntries.length > 0) {
    sec7.push(
      bodyText(`${L.severity}:`),
      new Table({
        rows: [
          new TableRow({ children: [headerCell(L.severity), headerCell(L.count, 1400)], tableHeader: true }),
          ...sevEntries.map(([s, c]) => {
            const color = s === "CRITICAL" ? RED : s === "MAJOR" ? ORANGE : GREY;
            return new TableRow({ children: [cell(s, { color, bold: true }), cell(String(c))] });
          }),
        ],
        width: { size: 60, type: WidthType.PERCENTAGE },
      }),
      emptyLine()
    );
  }

  // Detailed findings
  if (fDet.findings.length > 0) {
    sec7.push(heading2(L.detailedFindings, "7.2"));
    fDet.findings.forEach((f: FindingDetail, idx: number) => {
      const sevColor = f.severity === "CRITICAL" ? RED : f.severity === "MAJOR" ? ORANGE : GREY;
      sec7.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${f.reference}  —  ${f.title}`,
              bold: true,
              size: 22,
              color: "1F2937",
              font: "Calibri",
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: idx === 0 ? 120 : 200, after: 80 },
        }),
        new Table({
          rows: [
            new TableRow({ children: [headerCell(L.type), cell(f.type.replace(/_/g, " "))] }),
            new TableRow({ children: [headerCell(L.severity), cell(f.severity, { color: sevColor, bold: true })] }),
            new TableRow({ children: [headerCell(L.reviewArea), cell(f.reviewArea)] }),
            new TableRow({ children: [headerCell(L.criticalElement), cell(f.criticalElement || "—")] }),
            new TableRow({ children: [headerCell(L.status), cell(f.status.replace(/_/g, " "))] }),
            new TableRow({ children: [headerCell(L.icaoRef), cell(f.icaoReference || "—")] }),
            new TableRow({ children: [headerCell(L.capRequired), cell(f.capRequired ? L.yes : L.no)] }),
            ...(f.capReference
              ? [new TableRow({ children: [headerCell(L.capStatus), cell(`${f.capReference} — ${f.capStatus?.replace(/_/g, " ") || "—"}`)] })]
              : []),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      if (f.description) {
        sec7.push(
          bodyText(`${L.description}:`),
          ...splitText(f.description)
        );
      }
      if (f.evidence) {
        sec7.push(
          bodyText(`${L.evidence}:`),
          ...splitText(f.evidence)
        );
      }
    });
  }
  sec7.push(new Paragraph({ children: [new PageBreak()] }));

  // ───────────────────────────────────────────────────────────────────
  // SECTION 8: CORRECTIVE ACTION PLANS
  // ───────────────────────────────────────────────────────────────────
  const caps = sections.correctiveActions;
  const sec8: DocChild[] = [
    heading1(L.correctiveActionPlans, "8."),
    heading2(L.capSummary, "8.1"),
    new Table({
      rows: [
        new TableRow({ children: [headerCell(L.totalCAPs), cell(String(caps.totalCAPs))] }),
        new TableRow({ children: [headerCell(L.submitted), cell(String(caps.submitted))] }),
        new TableRow({ children: [headerCell(L.accepted), cell(String(caps.accepted))] }),
        new TableRow({ children: [headerCell(L.overdue), cell(String(caps.overdue), { color: caps.overdue > 0 ? RED : GREY })] }),
        new TableRow({ children: [headerCell(L.completionRate), cell(`${caps.completionRate}%`)] }),
      ],
      width: { size: 60, type: WidthType.PERCENTAGE },
    }),
  ];

  if (caps.caps.length > 0) {
    sec8.push(
      heading2(L.capDetail, "8.2"),
      new Table({
        rows: [
          new TableRow({
            children: [
              headerCell(L.reference, 1400),
              headerCell(L.finding, 1400),
              headerCell(L.rootCause),
              headerCell(L.correctiveAction),
              headerCell(L.dueDate, 1400),
              headerCell(L.status, 1400),
            ],
            tableHeader: true,
          }),
          ...caps.caps.map(
            (c: CAPSummary) =>
              new TableRow({
                children: [
                  cell(c.reference, { mono: true }),
                  cell(c.findingReference, { mono: true }),
                  cell(c.rootCause || "—"),
                  cell(c.correctiveAction),
                  cell(c.dueDate || "—"),
                  cell(c.status.replace(/_/g, " ")),
                ],
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }
  sec8.push(new Paragraph({ children: [new PageBreak()] }));

  // ───────────────────────────────────────────────────────────────────
  // SECTION 9: RECOMMENDATIONS
  // ───────────────────────────────────────────────────────────────────
  const sec9: DocChild[] = [
    heading1(L.recommendations, "9."),
    ...splitText(localeText(sections.recommendations, locale)),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ───────────────────────────────────────────────────────────────────
  // SECTION 10: BEST PRACTICES
  // ───────────────────────────────────────────────────────────────────
  const bp = sections.bestPractices;
  const sec10: DocChild[] = [heading1(L.bestPractices, "10.")];

  if (bp.practices.length > 0) {
    sec10.push(
      new Table({
        rows: [
          new TableRow({
            children: [headerCell(L.title), headerCell(L.reviewArea, 1400), headerCell(L.description), headerCell(L.applicability)],
            tableHeader: true,
          }),
          ...bp.practices.map(
            (p) =>
              new TableRow({
                children: [cell(p.title, { bold: true }), cell(p.reviewArea), cell(p.description), cell(p.applicability)],
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  } else {
    sec10.push(bodyText("—"));
  }
  sec10.push(new Paragraph({ children: [new PageBreak()] }));

  // ───────────────────────────────────────────────────────────────────
  // SECTION 11: CONCLUSION
  // ───────────────────────────────────────────────────────────────────
  const sec11: DocChild[] = [
    heading1(L.conclusion, "11."),
    ...splitText(localeText(sections.conclusion, locale)),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ───────────────────────────────────────────────────────────────────
  // ANNEXES
  // ───────────────────────────────────────────────────────────────────
  const annex = sections.annexes;
  const secAnnex: DocChild[] = [heading1(L.annexes, "")];

  // A. Document List
  if (annex.documentList.length > 0) {
    secAnnex.push(
      heading2(`A. ${L.documentList}`),
      new Table({
        rows: [
          new TableRow({
            children: [headerCell(L.name), headerCell(L.category), headerCell(L.reference)],
            tableHeader: true,
          }),
          ...annex.documentList.map(
            (d) =>
              new TableRow({
                children: [cell(d.name), cell(d.category), cell(d.reference, { mono: true })],
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }

  // B. Glossary
  if (annex.glossary) {
    secAnnex.push(
      heading2(`B. ${L.glossaryTitle}`),
      new Table({
        rows: [
          new TableRow({
            children: [headerCell("Abbreviation", 2000), headerCell(L.description)],
            tableHeader: true,
          }),
          ...glossary.map(
            ([abbr, desc]) =>
              new TableRow({
                children: [cell(abbr, { bold: true, mono: true }), cell(desc)],
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // ASSEMBLE DOCUMENT
  // ───────────────────────────────────────────────────────────────────
  const footerRef = report.coverPage.reportNumber || meta.reportReference;

  return new Document({
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20, color: "374151" },
        },
        heading1: {
          run: { font: "Calibri", size: 28, bold: true, color: ICAO_BLUE },
          paragraph: { spacing: { before: 360, after: 160 } },
        },
        heading2: {
          run: { font: "Calibri", size: 24, bold: true, color: "1E40AF" },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        heading3: {
          run: { font: "Calibri", size: 22, bold: true, color: "1F2937" },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            size: { width: 11906, height: 16838 }, // A4
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: footerRef, size: 16, color: GREY, font: "Calibri", italics: true }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `AAPRP ${L.peerReviewReport} — ${L.confidential}     `,
                    size: 14,
                    color: GREY,
                    font: "Calibri",
                  }),
                  new TextRun({
                    text: `${L.pageOf} `,
                    size: 14,
                    color: GREY,
                    font: "Calibri",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 14,
                    color: GREY,
                    font: "Calibri",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          ...coverPage,
          ...tocSection,
          ...sec1,
          ...sec2,
          ...sec3,
          ...sec4,
          ...sec5,
          ...sec6,
          ...sec7,
          ...sec8,
          ...sec9,
          ...sec10,
          ...sec11,
          ...secAnnex,
        ],
      },
    ],
  });
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("reviewId");
    const locale = searchParams.get("locale") === "fr" ? "fr" : "en";

    if (!reviewId) {
      return NextResponse.json({ error: "Missing reviewId parameter" }, { status: 400 });
    }

    // 3. Authorization — user must be team member or oversight role
    const userId = session.user.id;
    const userRole = session.user.role;

    const isOversight = OVERSIGHT_ROLES.includes(userRole);
    if (!isOversight) {
      const membership = await prisma.reviewTeamMember.findFirst({
        where: { reviewId, userId },
      });
      if (!membership) {
        // Also check host organization membership
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { organizationId: true },
        });
        const review = await prisma.review.findUnique({
          where: { id: reviewId },
          select: { hostOrganizationId: true },
        });
        if (!user?.organizationId || user.organizationId !== review?.hostOrganizationId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    // 4. Fetch report
    const report = await prisma.reviewReport.findUnique({
      where: { reviewId },
    });

    if (!report || !report.content) {
      return NextResponse.json({ error: "Report not found or has no content" }, { status: 404 });
    }

    const content = report.content as unknown as ReportContent;
    const reportRef = content.coverPage?.reportNumber || content.metadata?.reportReference || "AAPRP-Report";

    // 5. Generate DOCX
    const doc = buildDocx(content, locale);
    const buffer = await Packer.toBuffer(doc);

    // 6. Return as download
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${reportRef}-${locale}.docx"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error) {
    console.error("[Report Export] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
