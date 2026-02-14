// ============================================================
// Report Data Aggregation Service
//
// Gathers all review data from the database and assembles it
// into the structured ReportContent format for storage,
// viewing, and PDF export.
// ============================================================

import type { PrismaClient } from "@prisma/client";
import type {
  ReportContent,
  ReportMetadata,
  CoverPageData,
  EditableSection,
  IntroductionSection,
  MethodologySection,
  TeamCompositionSection,
  TeamMemberInfo,
  ANSAssessmentSection,
  SMSAssessmentSection,
  FindingsSummarySection,
  FindingDetail,
  CorrectiveActionsSection,
  CAPSummary,
  BestPracticesSection,
  AnnexesSection,
} from "@/types/report";

// ============================================================
// Constants & Mappings
// ============================================================

const REVIEW_AREA_NAMES: Record<string, { en: string; fr: string }> = {
  ATS: { en: "Air Traffic Services", fr: "Services de la circulation aérienne" },
  FPD: { en: "Flight Procedures Design", fr: "Conception des procédures de vol" },
  AIS: { en: "Aeronautical Information Service", fr: "Service d'information aéronautique" },
  MAP: { en: "Aeronautical Charts", fr: "Cartes aéronautiques" },
  MET: { en: "Meteorological Service", fr: "Service météorologique" },
  CNS: { en: "Communications, Navigation, Surveillance", fr: "Communications, Navigation, Surveillance" },
  SAR: { en: "Search and Rescue", fr: "Recherche et sauvetage" },
};

const CRITICAL_ELEMENT_NAMES: Record<string, { en: string; fr: string }> = {
  CE_1: { en: "Primary Aviation Legislation", fr: "Législation aéronautique primaire" },
  CE_2: { en: "Specific Operating Regulations", fr: "Réglementations opérationnelles spécifiques" },
  CE_3: { en: "State Aviation System & Oversight Functions", fr: "Système d'aviation civile et fonctions de surveillance" },
  CE_4: { en: "Technical Personnel Qualification & Training", fr: "Qualification et formation du personnel technique" },
  CE_5: { en: "Technical Guidance, Tools & Safety-Critical Information", fr: "Orientations techniques, outils et informations critiques" },
  CE_6: { en: "Licensing, Certification & Authorization Obligations", fr: "Obligations de délivrance de licences et de certification" },
  CE_7: { en: "Surveillance Obligations", fr: "Obligations de surveillance" },
  CE_8: { en: "Resolution of Safety Issues", fr: "Résolution des problèmes de sécurité" },
};

const SMS_COMPONENT_NAMES: Record<string, { en: string; fr: string; code: string }> = {
  SAFETY_POLICY_OBJECTIVES: { en: "Safety Policy & Objectives", fr: "Politique et objectifs de sécurité", code: "SPO" },
  SAFETY_RISK_MANAGEMENT: { en: "Safety Risk Management", fr: "Gestion des risques de sécurité", code: "SRM" },
  SAFETY_ASSURANCE: { en: "Safety Assurance", fr: "Assurance de la sécurité", code: "SA" },
  SAFETY_PROMOTION: { en: "Safety Promotion", fr: "Promotion de la sécurité", code: "SP" },
};

const STUDY_AREA_NAMES: Record<string, { en: string; fr: string }> = {
  SA_1_1: { en: "Management Commitment", fr: "Engagement de la direction" },
  SA_1_2: { en: "Safety Accountabilities", fr: "Responsabilités en matière de sécurité" },
  SA_1_3: { en: "Appointment of Key Safety Personnel", fr: "Désignation du personnel clé de sécurité" },
  SA_1_4: { en: "Emergency Response Planning", fr: "Planification des interventions d'urgence" },
  SA_1_5: { en: "SMS Documentation", fr: "Documentation du SGS" },
  SA_2_1: { en: "Hazard Identification", fr: "Identification des dangers" },
  SA_2_2: { en: "Safety Risk Assessment & Mitigation", fr: "Évaluation et atténuation des risques" },
  SA_3_1: { en: "Safety Performance Monitoring & Measurement", fr: "Surveillance et mesure des performances de sécurité" },
  SA_3_2: { en: "Management of Change", fr: "Gestion du changement" },
  SA_3_3: { en: "Continuous Improvement", fr: "Amélioration continue" },
  SA_4_1: { en: "Training and Education", fr: "Formation et éducation" },
  SA_4_2: { en: "Safety Communication", fr: "Communication de sécurité" },
};

/** Map maturity level enum to 0-100 percentage (midpoint of each range) */
const MATURITY_LEVEL_SCORES: Record<string, number> = {
  LEVEL_A: 10,
  LEVEL_B: 30,
  LEVEL_C: 50,
  LEVEL_D: 70,
  LEVEL_E: 90,
};

/** Map maturity level enum to letter label */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MATURITY_LEVEL_LABELS: Record<string, string> = {
  LEVEL_A: "A",
  LEVEL_B: "B",
  LEVEL_C: "C",
  LEVEL_D: "D",
  LEVEL_E: "E",
};

// ============================================================
// Main Aggregation Function
// ============================================================

/**
 * Aggregate all review data into a structured ReportContent object.
 *
 * @param db        - Prisma client instance
 * @param reviewId  - The review to generate the report for
 * @param generatedBy - The user generating the report
 * @param locale    - Primary language for the report
 */
export async function aggregateReportData(
  db: PrismaClient,
  reviewId: string,
  generatedBy: { id: string; name: string; role: string },
  locale: "en" | "fr" = "en"
): Promise<ReportContent> {
  // 1. Fetch review with all core relations
  const review = await db.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: {
      hostOrganization: {
        include: { regionalTeam: true },
      },
      teamMembers: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          reviewerProfile: {
            include: {
              homeOrganization: {
                select: { nameEn: true, country: true },
              },
            },
          },
        },
        orderBy: { role: "asc" },
      },
      findings: {
        include: {
          correctiveActionPlan: {
            include: {
              assignedTo: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          question: {
            select: { reviewArea: true },
          },
          bestPractice: true,
        },
        orderBy: { createdAt: "asc" },
      },
      documents: {
        where: { isDeleted: false },
        select: {
          name: true,
          category: true,
          originalName: true,
        },
      },
    },
  });

  // 2. Fetch ANS (USOAP CMA) assessment with responses and questions
  const ansAssessment = await db.assessment.findFirst({
    where: {
      reviewId,
      questionnaire: { type: "ANS_USOAP_CMA" },
    },
    include: {
      responses: {
        include: {
          question: {
            select: {
              reviewArea: true,
              criticalElement: true,
              pqNumber: true,
            },
          },
        },
      },
      questionnaire: {
        select: {
          _count: { select: { questions: { where: { isActive: true } } } },
        },
      },
    },
  });

  // 3. Fetch SMS (CANSO SoE) assessment with responses and questions
  const smsAssessment = await db.assessment.findFirst({
    where: {
      reviewId,
      questionnaire: { type: "SMS_CANSO_SOE" },
    },
    include: {
      responses: {
        include: {
          question: {
            select: {
              smsComponent: true,
              studyArea: true,
            },
          },
        },
      },
    },
  });

  // 4. Build all sections
  const metadata = buildMetadata(review, generatedBy);
  const coverPage = buildCoverPage(metadata, locale);
  const teamComposition = buildTeamComposition(review.teamMembers);
  const ansSection = buildANSAssessment(ansAssessment, locale);
  const smsSection = buildSMSAssessment(smsAssessment, locale);
  const findingsSummary = buildFindingsSummary(review.findings);
  const findingsDetail = buildFindingsDetail(review.findings, locale);
  const correctiveActions = buildCorrectiveActions(review.findings, locale);
  const bestPractices = buildBestPractices(review.findings, locale);
  const annexes = buildAnnexes(review.documents);
  const introduction = buildIntroduction(review, locale);
  const methodology = buildMethodology(review, ansAssessment, locale);

  // 5. Assemble complete ReportContent
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    locale,
    metadata,
    coverPage,
    tableOfContents: true,
    sections: {
      executiveSummary: emptyEditableSection(),
      introduction,
      methodology,
      teamComposition,
      ansAssessment: ansSection,
      smsAssessment: smsSection,
      findingsSummary,
      findingsDetail: { findings: findingsDetail },
      correctiveActions,
      recommendations: emptyEditableSection(),
      bestPractices,
      conclusion: emptyEditableSection(),
      annexes,
    },
  };
}

// ============================================================
// Section Builders
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

function buildMetadata(review: any, generatedBy: { id: string; name: string; role: string }): ReportMetadata {
  const org = review.hostOrganization;
  const team = org.regionalTeam;

  return {
    reportReference: `AAPRP-RPT-${review.referenceNumber}`,
    reviewReference: review.referenceNumber,
    reviewType: review.reviewType,
    hostOrganization: {
      nameEn: org.nameEn,
      nameFr: org.nameFr,
      code: org.organizationCode || "",
      country: org.country,
      city: org.city || "",
      region: org.region,
      regionalTeam: team ? `Team ${team.teamNumber}` : (org.peerReviewTeam ? `Team ${org.peerReviewTeam}` : ""),
    },
    reviewPeriod: {
      plannedStart: review.plannedStartDate?.toISOString() ?? null,
      plannedEnd: review.plannedEndDate?.toISOString() ?? null,
      actualStart: review.actualStartDate?.toISOString() ?? null,
      actualEnd: review.actualEndDate?.toISOString() ?? null,
    },
    generatedBy,
  };
}

function buildCoverPage(metadata: ReportMetadata, locale: "en" | "fr"): CoverPageData {
  const title = locale === "en" ? "Peer Review Report" : "Rapport de revue par les pairs";
  const orgName = locale === "en" ? metadata.hostOrganization.nameEn : metadata.hostOrganization.nameFr;

  return {
    title,
    subtitle: orgName,
    reportNumber: metadata.reportReference,
    classification: "CONFIDENTIAL",
    date: new Date().toISOString().split("T")[0],
  };
}

function buildTeamComposition(teamMembers: any[]): TeamCompositionSection {
  const mapMember = (m: any): TeamMemberInfo => ({
    name: `${m.user.firstName} ${m.user.lastName}`,
    role: m.role,
    organization: m.reviewerProfile?.homeOrganization?.nameEn || "",
    expertise: m.reviewerProfile?.expertiseAreas || [],
    country: m.reviewerProfile?.homeOrganization?.country || "",
  });

  const lead = teamMembers.find((m: any) => m.role === "LEAD_REVIEWER");
  const observers = teamMembers.filter((m: any) => m.role === "OBSERVER");
  const members = teamMembers.filter((m: any) => m.role !== "LEAD_REVIEWER" && m.role !== "OBSERVER");

  return {
    teamLead: lead ? mapMember(lead) : null,
    members: members.map(mapMember),
    observerOrganizations: observers
      .map((m: any) => m.reviewerProfile?.homeOrganization?.nameEn)
      .filter(Boolean),
  };
}

function buildANSAssessment(assessment: any, locale: "en" | "fr"): ANSAssessmentSection {
  if (!assessment) {
    return {
      available: false,
      overallEIScore: null,
      previousEIScore: null,
      eiDelta: null,
      byReviewArea: [],
      byCriticalElement: [],
      narrativeEn: "",
      narrativeFr: "",
    };
  }

  // Group responses by review area
  const byArea: Record<string, { satisfactory: number; notSatisfactory: number; notApplicable: number }> = {};
  // Group responses by critical element
  const byCE: Record<string, { satisfactory: number; notSatisfactory: number; notApplicable: number }> = {};

  for (const response of assessment.responses) {
    const area = response.question?.reviewArea || "UNKNOWN";
    const ce = response.question?.criticalElement;

    if (!byArea[area]) {
      byArea[area] = { satisfactory: 0, notSatisfactory: 0, notApplicable: 0 };
    }

    if (response.responseValue === "SATISFACTORY") {
      byArea[area].satisfactory++;
    } else if (response.responseValue === "NOT_SATISFACTORY") {
      byArea[area].notSatisfactory++;
    } else if (response.responseValue === "NOT_APPLICABLE") {
      byArea[area].notApplicable++;
    }

    if (ce) {
      if (!byCE[ce]) {
        byCE[ce] = { satisfactory: 0, notSatisfactory: 0, notApplicable: 0 };
      }
      if (response.responseValue === "SATISFACTORY") {
        byCE[ce].satisfactory++;
      } else if (response.responseValue === "NOT_SATISFACTORY") {
        byCE[ce].notSatisfactory++;
      } else if (response.responseValue === "NOT_APPLICABLE") {
        byCE[ce].notApplicable++;
      }
    }
  }

  // Calculate EI per review area: (satisfactory / applicable) * 100
  const areaResults = Object.entries(byArea)
    .filter(([code]) => code !== "UNKNOWN")
    .map(([code, counts]) => {
      const applicable = counts.satisfactory + counts.notSatisfactory;
      const eiScore = applicable > 0
        ? Math.round((counts.satisfactory / applicable) * 10000) / 100
        : 0;
      const areaName = REVIEW_AREA_NAMES[code];
      return {
        code,
        name: areaName ? (locale === "en" ? areaName.en : areaName.fr) : code,
        eiScore,
        totalPQs: applicable + counts.notApplicable,
        satisfactoryPQs: counts.satisfactory,
        notImplementedPQs: counts.notSatisfactory,
        notApplicablePQs: counts.notApplicable,
      };
    });

  // Calculate EI per Critical Element
  const ceResults = Object.entries(byCE).map(([code, counts]) => {
    const applicable = counts.satisfactory + counts.notSatisfactory;
    const eiScore = applicable > 0
      ? Math.round((counts.satisfactory / applicable) * 10000) / 100
      : 0;
    const ceName = CRITICAL_ELEMENT_NAMES[code];
    return {
      code: code.replace("_", "-"), // CE_1 → CE-1
      name: ceName ? (locale === "en" ? ceName.en : ceName.fr) : code,
      eiScore,
    };
  });

  // Calculate overall EI
  let totalSatisfactory = 0;
  let totalApplicable = 0;
  for (const counts of Object.values(byArea)) {
    totalSatisfactory += counts.satisfactory;
    totalApplicable += counts.satisfactory + counts.notSatisfactory;
  }
  const overallEI = totalApplicable > 0
    ? Math.round((totalSatisfactory / totalApplicable) * 10000) / 100
    : 0;

  // Use stored previous EI if available on the assessment
  const previousEI = assessment.eiScore != null && assessment.eiScore !== overallEI
    ? assessment.eiScore
    : null;

  return {
    available: true,
    overallEIScore: overallEI,
    previousEIScore: previousEI,
    eiDelta: previousEI != null ? Math.round((overallEI - previousEI) * 100) / 100 : null,
    byReviewArea: areaResults,
    byCriticalElement: ceResults,
    narrativeEn: generateANSNarrative(overallEI, areaResults, "en"),
    narrativeFr: generateANSNarrative(overallEI, areaResults, "fr"),
  };
}

function buildSMSAssessment(assessment: any, locale: "en" | "fr"): SMSAssessmentSection {
  if (!assessment) {
    return {
      available: false,
      overallMaturityLevel: null,
      overallScore: null,
      previousScore: null,
      byComponent: [],
      narrativeEn: "",
      narrativeFr: "",
    };
  }

  // Group responses by component, then by study area
  const byComponent: Record<string, Record<string, { totalScore: number; count: number }>> = {};
  let grandTotalScore = 0;
  let grandTotalCount = 0;

  for (const response of assessment.responses) {
    const component = response.question?.smsComponent || "UNKNOWN";
    const studyArea = response.question?.studyArea || "UNKNOWN";

    if (!byComponent[component]) {
      byComponent[component] = {};
    }
    if (!byComponent[component][studyArea]) {
      byComponent[component][studyArea] = { totalScore: 0, count: 0 };
    }

    if (response.maturityLevel) {
      const score = MATURITY_LEVEL_SCORES[response.maturityLevel] ?? 0;
      byComponent[component][studyArea].totalScore += score;
      byComponent[component][studyArea].count++;
      grandTotalScore += score;
      grandTotalCount++;
    }
  }

  // Build component results
  const componentResults = Object.entries(byComponent)
    .filter(([code]) => code !== "UNKNOWN")
    .map(([code, studyAreas]) => {
      const compInfo = SMS_COMPONENT_NAMES[code];
      let compTotal = 0;
      let compCount = 0;

      const saResults = Object.entries(studyAreas)
        .filter(([saCode]) => saCode !== "UNKNOWN")
        .map(([saCode, data]) => {
          compTotal += data.totalScore;
          compCount += data.count;
          const avgScore = data.count > 0 ? Math.round(data.totalScore / data.count) : 0;
          const saName = STUDY_AREA_NAMES[saCode];
          return {
            code: saCode.replace(/_/g, "."), // SA_1_1 → SA.1.1
            name: saName ? (locale === "en" ? saName.en : saName.fr) : saCode,
            score: avgScore,
            maturityLevel: scoreToMaturityLabel(avgScore),
          };
        });

      const compAvg = compCount > 0 ? Math.round(compTotal / compCount) : 0;

      return {
        code: compInfo?.code || code,
        name: compInfo ? (locale === "en" ? compInfo.en : compInfo.fr) : code,
        maturityLevel: scoreToMaturityLabel(compAvg),
        score: compAvg,
        studyAreas: saResults,
      };
    });

  const overallScore = grandTotalCount > 0 ? Math.round(grandTotalScore / grandTotalCount) : 0;
  const overallLevel = scoreToMaturityLabel(overallScore);
  const previousScore = assessment.overallScore != null ? assessment.overallScore : null;

  return {
    available: true,
    overallMaturityLevel: overallLevel,
    overallScore,
    previousScore,
    byComponent: componentResults,
    narrativeEn: generateSMSNarrative(overallScore, overallLevel, componentResults, "en"),
    narrativeFr: generateSMSNarrative(overallScore, overallLevel, componentResults, "fr"),
  };
}

function buildFindingsSummary(findings: any[]): FindingsSummarySection {
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byReviewArea: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let criticalAndMajorCount = 0;
  let capRequiredCount = 0;

  for (const f of findings) {
    byType[f.findingType] = (byType[f.findingType] || 0) + 1;
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byStatus[f.status] = (byStatus[f.status] || 0) + 1;

    const area = f.reviewArea || "GENERAL";
    byReviewArea[area] = (byReviewArea[area] || 0) + 1;

    if (f.severity === "CRITICAL" || f.severity === "MAJOR") {
      criticalAndMajorCount++;
    }
    if (f.capRequired) {
      capRequiredCount++;
    }
  }

  return {
    totalFindings: findings.length,
    byType,
    bySeverity,
    byReviewArea,
    byStatus,
    criticalAndMajorCount,
    capRequiredCount,
  };
}

function buildFindingsDetail(findings: any[], locale: "en" | "fr"): FindingDetail[] {
  return findings.map((f: any) => {
    const cap = f.correctiveActionPlan;
    const reviewAreaCode = f.reviewArea || "";
    const areaName = REVIEW_AREA_NAMES[reviewAreaCode];
    const ceName = f.criticalElement ? CRITICAL_ELEMENT_NAMES[f.criticalElement] : null;

    return {
      reference: f.referenceNumber,
      title: locale === "en" ? f.titleEn : f.titleFr,
      description: locale === "en" ? f.descriptionEn : f.descriptionFr,
      type: f.findingType,
      severity: f.severity,
      reviewArea: areaName ? (locale === "en" ? areaName.en : areaName.fr) : reviewAreaCode,
      criticalElement: ceName
        ? (locale === "en" ? ceName.en : ceName.fr)
        : (f.criticalElement?.replace("_", "-") || ""),
      icaoReference: f.icaoReference || "",
      evidence: locale === "en" ? (f.evidenceEn || "") : (f.evidenceFr || ""),
      status: f.status,
      capRequired: f.capRequired,
      capReference: cap ? `CAP-${cap.id.slice(-6).toUpperCase()}` : undefined,
      capStatus: cap?.status,
    };
  });
}

function buildCorrectiveActions(findings: any[], locale: "en" | "fr"): CorrectiveActionsSection {
  const now = new Date();
  const terminalStatuses = ["COMPLETED", "VERIFIED", "CLOSED"];

  const caps: CAPSummary[] = [];
  let submitted = 0;
  let accepted = 0;
  let overdue = 0;
  let completed = 0;

  for (const f of findings) {
    const cap = f.correctiveActionPlan;
    if (!cap) continue;

    const isOverdue = cap.dueDate && new Date(cap.dueDate) < now && !terminalStatuses.includes(cap.status);
    if (isOverdue) overdue++;
    if (terminalStatuses.includes(cap.status)) completed++;
    if (cap.status === "SUBMITTED" || cap.status === "UNDER_REVIEW") submitted++;
    if (cap.status === "ACCEPTED") accepted++;

    const assigneeName = cap.assignedTo
      ? `${cap.assignedTo.firstName} ${cap.assignedTo.lastName}`
      : "";

    caps.push({
      reference: `CAP-${cap.id.slice(-6).toUpperCase()}`,
      findingReference: f.referenceNumber,
      rootCause: locale === "en" ? cap.rootCauseEn : cap.rootCauseFr,
      correctiveAction: locale === "en" ? cap.correctiveActionEn : cap.correctiveActionFr,
      responsibleParty: assigneeName,
      dueDate: cap.dueDate?.toISOString().split("T")[0] || "",
      status: isOverdue ? "OVERDUE" : cap.status,
    });
  }

  const total = caps.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    totalCAPs: total,
    submitted,
    accepted,
    overdue,
    completionRate,
    caps,
  };
}

function buildBestPractices(findings: any[], locale: "en" | "fr"): BestPracticesSection {
  const practices = findings
    .filter((f: any) => f.findingType === "GOOD_PRACTICE")
    .map((f: any) => {
      const bp = f.bestPractice;
      const reviewAreaCode = f.reviewArea || "";
      const areaName = REVIEW_AREA_NAMES[reviewAreaCode];

      return {
        title: bp
          ? (locale === "en" ? bp.titleEn : bp.titleFr)
          : (locale === "en" ? f.titleEn : f.titleFr),
        description: bp
          ? (locale === "en" ? bp.descriptionEn : bp.descriptionFr)
          : (locale === "en" ? f.descriptionEn : f.descriptionFr),
        reviewArea: areaName ? (locale === "en" ? areaName.en : areaName.fr) : reviewAreaCode,
        applicability: bp
          ? (locale === "en" ? bp.benefitsEn : bp.benefitsFr)
          : (locale === "en"
            ? "Applicable to similar ANSP environments"
            : "Applicable aux environnements ANSP similaires"),
      };
    });

  return { practices };
}

function buildAnnexes(documents: any[]): AnnexesSection {
  return {
    documentList: documents.map((d: any) => ({
      name: d.originalName || d.name,
      category: d.category,
      reference: d.name,
    })),
    teamCVs: true,
    glossary: true,
    pqMatrix: true,
  };
}

function buildIntroduction(review: any, locale: "en" | "fr"): IntroductionSection {
  const backgroundEn = `This report presents the findings of the AAPRP peer review conducted for ${review.hostOrganization.nameEn} (${review.hostOrganization.organizationCode || ""}) in ${review.hostOrganization.country}. The review was carried out under the African ANSP Peer Review Programme in accordance with ICAO standards and CANSO guidelines.`;
  const backgroundFr = `Ce rapport présente les résultats de la revue par les pairs de l'AAPRP menée pour ${review.hostOrganization.nameFr} (${review.hostOrganization.organizationCode || ""}) au/en ${review.hostOrganization.country}. La revue a été réalisée dans le cadre du Programme Africain de Revue par les Pairs des ANSP, conformément aux normes de l'OACI et aux directives de CANSO.`;

  const objectives = review.objectives
    ? review.objectives.split("\n").filter(Boolean)
    : [
        locale === "en"
          ? "Assess the level of effective implementation of ICAO standards"
          : "Évaluer le niveau de mise en œuvre effective des normes de l'OACI",
        locale === "en"
          ? "Evaluate the maturity of the Safety Management System"
          : "Évaluer la maturité du Système de Gestion de la Sécurité",
        locale === "en"
          ? "Identify best practices and areas for improvement"
          : "Identifier les bonnes pratiques et les domaines d'amélioration",
      ];

  const scope = review.areasInScope.length > 0
    ? review.areasInScope.map((code: string) => {
        const name = REVIEW_AREA_NAMES[code];
        return name ? `${code} - ${locale === "en" ? name.en : name.fr}` : code;
      })
    : [locale === "en" ? "Full scope review" : "Revue de portée complète"];

  // Build activity schedule from review dates
  const schedule: { phase: string; description: string; dateRange: string }[] = [];
  if (review.plannedStartDate || review.actualStartDate) {
    schedule.push({
      phase: locale === "en" ? "Preparation" : "Préparation",
      description: locale === "en" ? "Document review and planning" : "Revue documentaire et planification",
      dateRange: formatDateRange(review.plannedStartDate, review.plannedStartDate, locale),
    });
    schedule.push({
      phase: locale === "en" ? "On-site Review" : "Revue sur site",
      description: locale === "en" ? "Field visits, interviews, and evidence review" : "Visites de terrain, entretiens et revue des preuves",
      dateRange: formatDateRange(
        review.actualStartDate || review.plannedStartDate,
        review.actualEndDate || review.plannedEndDate,
        locale
      ),
    });
    schedule.push({
      phase: locale === "en" ? "Reporting" : "Rédaction du rapport",
      description: locale === "en" ? "Analysis, findings, and report drafting" : "Analyse, constatations et rédaction du rapport",
      dateRange: formatDateRange(review.actualEndDate || review.plannedEndDate, null, locale),
    });
  }

  return {
    background: { contentEn: backgroundEn, contentFr: backgroundFr },
    objectives,
    scope,
    basisDocuments: [
      "ICAO USOAP CMA Protocol Questions (2024 Edition)",
      "CANSO Standard of Excellence in SMS (2024)",
      "ICAO Doc 9859 - Safety Management Manual",
      "ICAO Annex 19 - Safety Management",
      locale === "en"
        ? "AFI Peer Review Manual"
        : "Manuel de Revue par les Pairs AFI",
    ],
    activitySchedule: schedule,
  };
}

function buildMethodology(review: any, ansAssessment: any, locale: "en" | "fr"): MethodologySection {
  const descEn = "The review was conducted using a structured methodology based on ICAO USOAP CMA Protocol Questions and the CANSO Standard of Excellence framework. The approach included document review, on-site interviews, facility inspections, and evidence analysis.";
  const descFr = "La revue a été menée selon une méthodologie structurée basée sur les questions de protocole USOAP CMA de l'OACI et le cadre du Standard d'Excellence de CANSO. L'approche comprenait la revue documentaire, les entretiens sur site, les inspections des installations et l'analyse des preuves.";

  const frameworksUsed: { name: string; version: string; description: string }[] = [];

  if (review.questionnairesInScope.includes("ANS_USOAP_CMA") || ansAssessment) {
    frameworksUsed.push({
      name: "ICAO USOAP CMA",
      version: "2024",
      description: locale === "en"
        ? "Universal Safety Oversight Audit Programme - Continuous Monitoring Approach Protocol Questions"
        : "Programme universel d'audit de la surveillance de la sécurité - Questions de protocole de l'approche de surveillance continue",
    });
  }

  if (review.questionnairesInScope.includes("SMS_CANSO_SOE")) {
    frameworksUsed.push({
      name: "CANSO SoE",
      version: "2024",
      description: locale === "en"
        ? "CANSO Standard of Excellence in Safety Management Systems"
        : "Standard d'Excellence CANSO en Systèmes de Gestion de la Sécurité",
    });
  }

  // Build review area list with PQ counts
  const allAreas = Object.keys(REVIEW_AREA_NAMES);
  const scopeAreas = review.areasInScope.length > 0 ? review.areasInScope : allAreas;

  const reviewAreas = allAreas.map((code: string) => {
    const name = REVIEW_AREA_NAMES[code];
    // Count PQs from assessment responses if available
    const pqCount = ansAssessment
      ? ansAssessment.responses.filter((r: any) => r.question?.reviewArea === code).length
      : 0;

    return {
      code,
      name: name ? (locale === "en" ? name.en : name.fr) : code,
      pqCount,
      inScope: scopeAreas.includes(code),
    };
  });

  return {
    approachDescription: { contentEn: descEn, contentFr: descFr },
    frameworksUsed,
    reviewAreas,
    evidenceTypes: [
      locale === "en" ? "Policies and procedures" : "Politiques et procédures",
      locale === "en" ? "Operational records" : "Registres opérationnels",
      locale === "en" ? "Staff interviews" : "Entretiens avec le personnel",
      locale === "en" ? "Facility observations" : "Observations des installations",
      locale === "en" ? "Training records" : "Dossiers de formation",
      locale === "en" ? "Safety reports and data" : "Rapports et données de sécurité",
    ],
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
// Narrative Generation
// ============================================================

function generateANSNarrative(
  overallEI: number,
  areas: { code: string; name: string; eiScore: number }[],
  locale: "en" | "fr"
): string {
  const strong = areas.filter((a) => a.eiScore >= 80);
  const weak = areas.filter((a) => a.eiScore < 60);

  if (locale === "en") {
    let text = `The overall Effective Implementation (EI) score is ${overallEI.toFixed(1)}%. `;
    if (strong.length > 0) {
      text += `Strong performance was noted in ${strong.map((a) => a.name).join(", ")}. `;
    }
    if (weak.length > 0) {
      text += `Areas requiring attention include ${weak.map((a) => a.name).join(", ")}, which scored below the 60% threshold. `;
    }
    if (areas.length > 0 && weak.length === 0) {
      text += "All audit areas meet or exceed the minimum implementation threshold. ";
    }
    return text.trim();
  }

  let text = `Le score global de mise en œuvre effective (EI) est de ${overallEI.toFixed(1)}%. `;
  if (strong.length > 0) {
    text += `De bonnes performances ont été observées dans les domaines suivants : ${strong.map((a) => a.name).join(", ")}. `;
  }
  if (weak.length > 0) {
    text += `Les domaines nécessitant une attention particulière comprennent ${weak.map((a) => a.name).join(", ")}, qui ont obtenu un score inférieur au seuil de 60%. `;
  }
  if (areas.length > 0 && weak.length === 0) {
    text += "Tous les domaines d'audit atteignent ou dépassent le seuil minimum de mise en œuvre. ";
  }
  return text.trim();
}

function generateSMSNarrative(
  overallScore: number,
  overallLevel: string,
  components: { code: string; name: string; maturityLevel: string; score: number }[],
  locale: "en" | "fr"
): string {
  const advanced = components.filter((c) => c.score >= 70);
  const developing = components.filter((c) => c.score < 40);

  if (locale === "en") {
    let text = `The overall SMS maturity is Level ${overallLevel} with a score of ${overallScore}%. `;
    if (advanced.length > 0) {
      text += `Advanced maturity was observed in ${advanced.map((c) => c.name).join(", ")}. `;
    }
    if (developing.length > 0) {
      text += `${developing.map((c) => c.name).join(", ")} ${developing.length === 1 ? "is" : "are"} at an early stage of development and ${developing.length === 1 ? "requires" : "require"} focused improvement. `;
    }
    return text.trim();
  }

  let text = `La maturité globale du SGS est au Niveau ${overallLevel} avec un score de ${overallScore}%. `;
  if (advanced.length > 0) {
    text += `Une maturité avancée a été observée pour ${advanced.map((c) => c.name).join(", ")}. `;
  }
  if (developing.length > 0) {
    text += `${developing.map((c) => c.name).join(", ")} ${developing.length === 1 ? "est" : "sont"} à un stade précoce de développement et ${developing.length === 1 ? "nécessite" : "nécessitent"} une amélioration ciblée. `;
  }
  return text.trim();
}

// ============================================================
// Utilities
// ============================================================

function emptyEditableSection(): EditableSection {
  return { contentEn: "", contentFr: "" };
}

/** Convert a 0-100 percentage score to a maturity level letter (A-E) */
function scoreToMaturityLabel(score: number): string {
  if (score >= 81) return "E";
  if (score >= 61) return "D";
  if (score >= 41) return "C";
  if (score >= 21) return "B";
  return "A";
}

/** Format a date range for display */
function formatDateRange(start: Date | null, end: Date | null, locale: "en" | "fr"): string {
  const fmt = (d: Date) => d.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return fmt(start);
  if (end) return fmt(end);
  return locale === "en" ? "To be determined" : "À déterminer";
}
