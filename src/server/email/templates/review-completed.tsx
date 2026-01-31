/**
 * Review Completed Email Template
 *
 * Sent when a peer review has been completed.
 * Includes summary of findings and next steps for the organization.
 */

import { Text, Button, Hr } from "@react-email/components";
import * as React from "react";
import { BaseLayout, InfoBox, InfoRow, styles } from "./base-layout";

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewCompletedEmailProps {
  recipientName: string;
  organizationName: string;
  reviewReference: string;
  reviewDates: string;
  leadReviewer: string;
  teamSize: number;
  findingsSummary: {
    total: number;
    critical: number;
    major: number;
    minor: number;
    observations: number;
    goodPractices: number;
  };
  overallRating?: string;
  reportAvailable: boolean;
  capsRequired: number;
  locale: "en" | "fr";
}

// =============================================================================
// BILINGUAL CONTENT
// =============================================================================

const content = {
  en: {
    subject: (ref: string) => `Peer Review Completed - ${ref}`,
    preview: (org: string) => `The peer review of ${org} has been completed`,
    greeting: (name: string) => `Dear ${name},`,
    intro: (org: string) =>
      `We are pleased to inform you that the peer review of ${org} has been completed. Thank you for your participation and cooperation throughout the review process.`,
    completionBadge: "REVIEW COMPLETED",
    details: "Review Summary",
    reference: "Review Reference",
    organization: "Organization",
    reviewDates: "Review Period",
    leadReviewer: "Lead Reviewer",
    teamSize: "Team Size",
    reviewers: "reviewers",
    findingsTitle: "Findings Overview",
    findingsTotal: "Total Findings",
    critical: "Critical",
    major: "Major",
    minor: "Minor",
    observations: "Observations",
    goodPractices: "Good Practices",
    rating: "Overall Rating",
    capsRequired: "CAPs Required",
    reportSection: "Review Report",
    reportAvailable:
      "The review report is now available. Please review it carefully and address any findings that require corrective action.",
    reportPending:
      "The review report is being finalized and will be available shortly. You will receive a notification when it is ready.",
    viewReport: "View Report",
    viewFindings: "View All Findings",
    nextStepsTitle: "Next Steps",
    nextSteps: {
      withCaps: [
        "Review the final report and all identified findings",
        "Develop Corrective Action Plans (CAPs) for findings that require them",
        "Submit CAPs within the specified deadlines",
        "Begin implementing corrective actions",
        "Prepare evidence of implementation for verification",
      ],
      noCaps: [
        "Review the final report and all identified findings",
        "Consider implementing suggested improvements",
        "Share good practices with your teams",
        "Document lessons learned for continuous improvement",
      ],
    },
    acknowledgment:
      "We would like to acknowledge the commitment and professionalism demonstrated by your team during this review. Your openness and engagement have contributed significantly to the success of this peer review.",
    support:
      "The review team remains available to provide clarification on any findings or to support you in developing your corrective action plans.",
    closing:
      "Thank you for your continued commitment to enhancing aviation safety across Africa.",
    signature: "The AAPRP Coordination Team",
  },
  fr: {
    subject: (ref: string) => `Évaluation par les pairs terminée - ${ref}`,
    preview: (org: string) => `L'évaluation par les pairs de ${org} est terminée`,
    greeting: (name: string) => `Cher/Chère ${name},`,
    intro: (org: string) =>
      `Nous avons le plaisir de vous informer que l'évaluation par les pairs de ${org} est terminée. Merci de votre participation et de votre coopération tout au long du processus d'évaluation.`,
    completionBadge: "ÉVALUATION TERMINÉE",
    details: "Résumé de l'évaluation",
    reference: "Référence de l'évaluation",
    organization: "Organisation",
    reviewDates: "Période d'évaluation",
    leadReviewer: "Évaluateur principal",
    teamSize: "Taille de l'équipe",
    reviewers: "évaluateurs",
    findingsTitle: "Aperçu des constatations",
    findingsTotal: "Total des constatations",
    critical: "Critiques",
    major: "Majeures",
    minor: "Mineures",
    observations: "Observations",
    goodPractices: "Bonnes pratiques",
    rating: "Évaluation globale",
    capsRequired: "PACs requis",
    reportSection: "Rapport d'évaluation",
    reportAvailable:
      "Le rapport d'évaluation est maintenant disponible. Veuillez l'examiner attentivement et traiter toutes les constatations nécessitant une action corrective.",
    reportPending:
      "Le rapport d'évaluation est en cours de finalisation et sera disponible prochainement. Vous recevrez une notification lorsqu'il sera prêt.",
    viewReport: "Voir le rapport",
    viewFindings: "Voir toutes les constatations",
    nextStepsTitle: "Prochaines étapes",
    nextSteps: {
      withCaps: [
        "Examiner le rapport final et toutes les constatations identifiées",
        "Développer des Plans d'Action Corrective (PAC) pour les constatations qui le nécessitent",
        "Soumettre les PAC dans les délais spécifiés",
        "Commencer à mettre en œuvre les actions correctives",
        "Préparer les preuves de mise en œuvre pour la vérification",
      ],
      noCaps: [
        "Examiner le rapport final et toutes les constatations identifiées",
        "Considérer la mise en œuvre des améliorations suggérées",
        "Partager les bonnes pratiques avec vos équipes",
        "Documenter les leçons apprises pour l'amélioration continue",
      ],
    },
    acknowledgment:
      "Nous tenons à reconnaître l'engagement et le professionnalisme démontrés par votre équipe lors de cet évaluation. Votre ouverture et votre engagement ont contribué de manière significative au succès de cet évaluation par les pairs.",
    support:
      "L'équipe d'évaluation reste disponible pour fournir des éclaircissements sur les constatations ou pour vous aider à développer vos plans d'action corrective.",
    closing:
      "Merci de votre engagement continu à améliorer la sécurité aérienne en Afrique.",
    signature: "L'équipe de coordination AAPRP",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewCompletedEmail(props: ReviewCompletedEmailProps) {
  const {
    recipientName,
    organizationName,
    reviewReference,
    reviewDates,
    leadReviewer,
    teamSize,
    findingsSummary,
    overallRating,
    reportAvailable,
    capsRequired,
    locale,
  } = props;

  const t = content[locale];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aaprp.aero";
  const hasCaps = capsRequired > 0;

  return (
    <BaseLayout locale={locale} previewText={t.preview(organizationName)}>
      <div style={styles.successBadge}>{t.completionBadge}</div>

      <Text style={styles.greeting}>{t.greeting(recipientName)}</Text>

      <Text style={styles.paragraph}>{t.intro(organizationName)}</Text>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.details}
      </Text>

      <InfoBox>
        <InfoRow label={t.reference} value={reviewReference} />
        <InfoRow label={t.organization} value={organizationName} />
        <InfoRow label={t.reviewDates} value={reviewDates} />
        <InfoRow label={t.leadReviewer} value={leadReviewer} />
        <InfoRow label={t.teamSize} value={`${teamSize} ${t.reviewers}`} />
        {overallRating && <InfoRow label={t.rating} value={overallRating} />}
      </InfoBox>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.findingsTitle}
      </Text>

      <table
        style={{
          ...styles.infoBox,
          width: "100%",
          borderCollapse: "collapse" as const,
        }}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            <td
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e2e8f0",
                fontWeight: 600,
              }}
            >
              {t.findingsTotal}
            </td>
            <td
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e2e8f0",
                textAlign: "right" as const,
                fontWeight: 600,
                fontSize: "18px",
              }}
            >
              {findingsSummary.total}
            </td>
          </tr>
          {findingsSummary.critical > 0 && (
            <tr>
              <td
                style={{
                  padding: "8px 16px",
                  color: "#dc2626",
                }}
              >
                {t.critical}
              </td>
              <td
                style={{
                  padding: "8px 16px",
                  textAlign: "right" as const,
                  color: "#dc2626",
                  fontWeight: 600,
                }}
              >
                {findingsSummary.critical}
              </td>
            </tr>
          )}
          {findingsSummary.major > 0 && (
            <tr>
              <td
                style={{
                  padding: "8px 16px",
                  color: "#d97706",
                }}
              >
                {t.major}
              </td>
              <td
                style={{
                  padding: "8px 16px",
                  textAlign: "right" as const,
                  color: "#d97706",
                  fontWeight: 600,
                }}
              >
                {findingsSummary.major}
              </td>
            </tr>
          )}
          {findingsSummary.minor > 0 && (
            <tr>
              <td style={{ padding: "8px 16px" }}>{t.minor}</td>
              <td
                style={{
                  padding: "8px 16px",
                  textAlign: "right" as const,
                  fontWeight: 600,
                }}
              >
                {findingsSummary.minor}
              </td>
            </tr>
          )}
          {findingsSummary.observations > 0 && (
            <tr>
              <td style={{ padding: "8px 16px", color: "#6b7280" }}>
                {t.observations}
              </td>
              <td
                style={{
                  padding: "8px 16px",
                  textAlign: "right" as const,
                  color: "#6b7280",
                }}
              >
                {findingsSummary.observations}
              </td>
            </tr>
          )}
          {findingsSummary.goodPractices > 0 && (
            <tr>
              <td
                style={{
                  padding: "8px 16px",
                  color: "#16a34a",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                {t.goodPractices}
              </td>
              <td
                style={{
                  padding: "8px 16px",
                  textAlign: "right" as const,
                  color: "#16a34a",
                  fontWeight: 600,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                {findingsSummary.goodPractices}
              </td>
            </tr>
          )}
          {hasCaps && (
            <tr>
              <td
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid #e2e8f0",
                  fontWeight: 600,
                }}
              >
                {t.capsRequired}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid #e2e8f0",
                  textAlign: "right" as const,
                  fontWeight: 600,
                }}
              >
                {capsRequired}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.reportSection}
      </Text>

      <div style={styles.highlight}>
        <Text style={styles.highlightText}>
          {reportAvailable ? t.reportAvailable : t.reportPending}
        </Text>
      </div>

      <table cellPadding={0} cellSpacing={0} style={{ margin: "24px 0" }}>
        <tr>
          {reportAvailable && (
            <td>
              <Button
                href={`${baseUrl}/reviews/${reviewReference}/report`}
                style={styles.button}
              >
                {t.viewReport}
              </Button>
            </td>
          )}
          <td style={{ paddingLeft: reportAvailable ? "12px" : "0" }}>
            <Button
              href={`${baseUrl}/reviews/${reviewReference}/findings`}
              style={reportAvailable ? styles.buttonSecondary : styles.button}
            >
              {t.viewFindings}
            </Button>
          </td>
        </tr>
      </table>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.nextStepsTitle}
      </Text>

      <div style={{ marginBottom: "24px" }}>
        {(hasCaps ? t.nextSteps.withCaps : t.nextSteps.noCaps).map(
          (step, index) => (
            <Text
              key={index}
              style={{
                ...styles.paragraph,
                margin: "8px 0",
                paddingLeft: "16px",
              }}
            >
              {index + 1}. {step}
            </Text>
          )
        )}
      </div>

      <Hr style={styles.hr} />

      <Text style={styles.paragraph}>{t.acknowledgment}</Text>

      <Text style={styles.paragraph}>{t.support}</Text>

      <Text style={styles.paragraph}>{t.closing}</Text>

      <Text style={{ ...styles.paragraph, fontWeight: 600 }}>{t.signature}</Text>
    </BaseLayout>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export function getReviewCompletedSubject(
  reviewReference: string,
  locale: "en" | "fr"
): string {
  return content[locale].subject(reviewReference);
}

export default ReviewCompletedEmail;
