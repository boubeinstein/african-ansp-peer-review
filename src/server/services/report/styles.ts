/**
 * PDF Report Styles
 *
 * Centralized styles for the AAPRP peer review report PDF generation.
 */

import { StyleSheet, Font } from "@react-pdf/renderer";

// =============================================================================
// FONTS (Using system fonts that are available in react-pdf)
// =============================================================================

// Register Helvetica variants (built-in)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
    { src: "Helvetica-BoldOblique", fontWeight: "bold", fontStyle: "italic" },
  ],
});

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Primary brand colors
  primary: "#1e3a5f", // AAPRP navy blue
  primaryLight: "#2c5282",
  primaryDark: "#1a365d",

  // Severity colors
  critical: "#dc2626",
  major: "#d97706",
  minor: "#2563eb",
  observation: "#6b7280",
  goodPractice: "#16a34a",

  // Status colors
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0ea5e9",

  // Neutral colors
  white: "#ffffff",
  black: "#000000",
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
};

// =============================================================================
// BASE STYLES
// =============================================================================

export const styles = StyleSheet.create({
  // Page styles
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
    backgroundColor: colors.white,
  },

  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: colors.white,
    padding: 0,
  },

  // Header/Footer
  header: {
    position: "absolute",
    top: 20,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },

  headerText: {
    fontSize: 8,
    color: colors.gray[500],
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },

  footerText: {
    fontSize: 8,
    color: colors.gray[500],
  },

  pageNumber: {
    fontSize: 8,
    color: colors.gray[500],
  },

  // Typography
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 20,
  },

  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryLight,
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  subsectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.gray[700],
    marginTop: 15,
    marginBottom: 8,
  },

  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: colors.gray[700],
    marginBottom: 10,
    textAlign: "justify",
  },

  label: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.gray[600],
    marginBottom: 2,
  },

  value: {
    fontSize: 10,
    color: colors.gray[800],
  },

  // Tables
  table: {
    display: "flex",
    width: "100%",
    marginVertical: 10,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderBottomWidth: 0,
  },

  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.white,
    padding: 8,
    textAlign: "left",
  },

  tableCell: {
    fontSize: 9,
    color: colors.gray[700],
    padding: 8,
    textAlign: "left",
  },

  tableCellAlt: {
    backgroundColor: colors.gray[50],
  },

  // Cards/Boxes
  box: {
    padding: 15,
    marginVertical: 10,
    backgroundColor: colors.gray[50],
    borderRadius: 4,
  },

  infoBox: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: colors.gray[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },

  warningBox: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: "#fffbeb",
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },

  dangerBox: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },

  successBox: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },

  // Finding cards
  findingCard: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 4,
  },

  findingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },

  findingReference: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
  },

  // Badges
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
  },

  badgeCritical: {
    backgroundColor: colors.critical,
    color: colors.white,
  },

  badgeMajor: {
    backgroundColor: colors.major,
    color: colors.white,
  },

  badgeMinor: {
    backgroundColor: colors.minor,
    color: colors.white,
  },

  badgeObservation: {
    backgroundColor: colors.gray[400],
    color: colors.white,
  },

  badgeGoodPractice: {
    backgroundColor: colors.goodPractice,
    color: colors.white,
  },

  // Layout helpers
  row: {
    flexDirection: "row",
  },

  column: {
    flexDirection: "column",
  },

  spaceBetween: {
    justifyContent: "space-between",
  },

  alignCenter: {
    alignItems: "center",
  },

  flex1: {
    flex: 1,
  },

  flex2: {
    flex: 2,
  },

  flex3: {
    flex: 3,
  },

  marginTop: {
    marginTop: 10,
  },

  marginBottom: {
    marginBottom: 10,
  },

  marginVertical: {
    marginVertical: 10,
  },

  // Statistics
  statBox: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    backgroundColor: colors.gray[50],
    marginHorizontal: 5,
    borderRadius: 4,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
  },

  statLabel: {
    fontSize: 8,
    color: colors.gray[500],
    marginTop: 4,
    textTransform: "uppercase",
  },

  // Lists
  listItem: {
    flexDirection: "row",
    marginBottom: 5,
  },

  listBullet: {
    width: 15,
    fontSize: 10,
    color: colors.primary,
  },

  listContent: {
    flex: 1,
    fontSize: 10,
    color: colors.gray[700],
    lineHeight: 1.4,
  },

  // Dividers
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    marginVertical: 15,
  },

  dividerThick: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginVertical: 15,
  },
});

// =============================================================================
// BILINGUAL LABELS
// =============================================================================

export const labels = {
  en: {
    // Document
    peerReviewReport: "Peer Review Report",
    confidential: "CONFIDENTIAL",
    reviewReference: "Review Reference",
    reportDate: "Report Date",
    page: "Page",
    of: "of",
    preparedBy: "Prepared by the AAPRP Review Team",

    // Sections
    executiveSummary: "Executive Summary",
    reviewTeam: "Review Team",
    scopeMethodology: "Scope & Methodology",
    findingsSummary: "Findings Summary",
    detailedFindings: "Detailed Findings",
    correctiveActionPlans: "Corrective Action Plans",
    bestPractices: "Best Practices Identified",
    conclusionRecommendations: "Conclusion & Recommendations",
    annexes: "Annexes",

    // Executive summary
    overallAssessment: "Overall Assessment",
    keyStrengths: "Key Strengths",
    areasForImprovement: "Areas for Improvement",
    summaryStatistics: "Summary Statistics",

    // Team
    leadReviewer: "Lead Reviewer",
    teamMembers: "Team Members",
    organization: "Organization",
    role: "Role",
    expertise: "Expertise",

    // Scope
    areasReviewed: "Areas Reviewed",
    documentsExamined: "Documents Examined",
    interviewsConducted: "Interviews Conducted",
    facilitiesVisited: "Facilities Visited",
    reviewPeriod: "Review Period",

    // Findings
    findingsByArea: "Findings by Area",
    findingsBySeverity: "Findings by Severity",
    total: "Total",
    critical: "Critical",
    major: "Major",
    minor: "Minor",
    observations: "Observations",
    goodPractices: "Good Practices",
    findingReference: "Finding Reference",
    classification: "Classification",
    description: "Description",
    evidence: "Evidence",
    icaoReference: "ICAO Reference",
    capRequired: "CAP Required",
    yes: "Yes",
    no: "No",
    rootCause: "Root Cause",
    recommendation: "Recommendation",

    // CAP
    capStatusSummary: "CAP Status Summary",
    completionTimeline: "Completion Timeline",
    capReference: "CAP Reference",
    finding: "Finding",
    status: "Status",
    dueDate: "Due Date",
    progress: "Progress",
    pending: "Pending",
    inProgress: "In Progress",
    submitted: "Submitted",
    accepted: "Accepted",
    verified: "Verified",
    overdue: "Overdue",

    // Best practices
    bestPracticeDescription:
      "The following practices were identified as noteworthy and are recommended for sharing across the AAPRP community:",

    // Conclusion
    conclusionIntro:
      "This peer review has provided valuable insights into the operations and safety management practices of the reviewed organization.",
    recommendations: "Recommendations",
    acknowledgments: "Acknowledgments",
    acknowledgmentText:
      "The review team would like to thank the host organization for their cooperation and openness throughout the review process.",

    // Annexes
    annexA: "Annex A: Interview List",
    annexB: "Annex B: Document List",
    annexC: "Annex C: Acronyms",
    interviewee: "Interviewee",
    position: "Position",
    date: "Date",
    documentTitle: "Document Title",
    documentReference: "Reference",
    acronym: "Acronym",
    meaning: "Meaning",
  },
  fr: {
    // Document
    peerReviewReport: "Rapport d'Examen par les Pairs",
    confidential: "CONFIDENTIEL",
    reviewReference: "Référence de l'examen",
    reportDate: "Date du rapport",
    page: "Page",
    of: "sur",
    preparedBy: "Préparé par l'équipe d'examen AAPRP",

    // Sections
    executiveSummary: "Résumé Exécutif",
    reviewTeam: "Équipe d'Examen",
    scopeMethodology: "Portée et Méthodologie",
    findingsSummary: "Résumé des Constatations",
    detailedFindings: "Constatations Détaillées",
    correctiveActionPlans: "Plans d'Action Corrective",
    bestPractices: "Bonnes Pratiques Identifiées",
    conclusionRecommendations: "Conclusion et Recommandations",
    annexes: "Annexes",

    // Executive summary
    overallAssessment: "Évaluation Globale",
    keyStrengths: "Points Forts",
    areasForImprovement: "Axes d'Amélioration",
    summaryStatistics: "Statistiques Résumées",

    // Team
    leadReviewer: "Examinateur Principal",
    teamMembers: "Membres de l'Équipe",
    organization: "Organisation",
    role: "Rôle",
    expertise: "Expertise",

    // Scope
    areasReviewed: "Domaines Examinés",
    documentsExamined: "Documents Examinés",
    interviewsConducted: "Entretiens Menés",
    facilitiesVisited: "Installations Visitées",
    reviewPeriod: "Période d'Examen",

    // Findings
    findingsByArea: "Constatations par Domaine",
    findingsBySeverity: "Constatations par Gravité",
    total: "Total",
    critical: "Critiques",
    major: "Majeures",
    minor: "Mineures",
    observations: "Observations",
    goodPractices: "Bonnes Pratiques",
    findingReference: "Référence de la Constatation",
    classification: "Classification",
    description: "Description",
    evidence: "Preuves",
    icaoReference: "Référence OACI",
    capRequired: "PAC Requis",
    yes: "Oui",
    no: "Non",
    rootCause: "Cause Profonde",
    recommendation: "Recommandation",

    // CAP
    capStatusSummary: "Résumé du Statut des PAC",
    completionTimeline: "Calendrier de Réalisation",
    capReference: "Référence PAC",
    finding: "Constatation",
    status: "Statut",
    dueDate: "Date d'Échéance",
    progress: "Progression",
    pending: "En attente",
    inProgress: "En cours",
    submitted: "Soumis",
    accepted: "Accepté",
    verified: "Vérifié",
    overdue: "En retard",

    // Best practices
    bestPracticeDescription:
      "Les pratiques suivantes ont été identifiées comme remarquables et sont recommandées pour le partage au sein de la communauté AAPRP :",

    // Conclusion
    conclusionIntro:
      "Cet examen par les pairs a fourni des informations précieuses sur les opérations et les pratiques de gestion de la sécurité de l'organisation examinée.",
    recommendations: "Recommandations",
    acknowledgments: "Remerciements",
    acknowledgmentText:
      "L'équipe d'examen tient à remercier l'organisation hôte pour sa coopération et son ouverture tout au long du processus d'examen.",

    // Annexes
    annexA: "Annexe A : Liste des Entretiens",
    annexB: "Annexe B : Liste des Documents",
    annexC: "Annexe C : Acronymes",
    interviewee: "Interviewé(e)",
    position: "Poste",
    date: "Date",
    documentTitle: "Titre du Document",
    documentReference: "Référence",
    acronym: "Acronyme",
    meaning: "Signification",
  },
};

export type Locale = "en" | "fr";
export type Labels = typeof labels.en;
