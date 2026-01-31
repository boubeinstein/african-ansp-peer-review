/**
 * Finding Notification Email Template
 *
 * Sent when a new finding is created or an existing finding is updated.
 * Notifies the host organization about findings from their peer review.
 */

import { Text, Button, Hr } from "@react-email/components";
import * as React from "react";
import { BaseLayout, InfoBox, InfoRow, styles } from "./base-layout";

// =============================================================================
// TYPES
// =============================================================================

export interface FindingNotificationEmailProps {
  recipientName: string;
  organizationName: string;
  reviewReference: string;
  findingReference: string;
  findingTitle: string;
  severity: string;
  auditArea: string;
  icaoReference?: string;
  findingType: string;
  description: string;
  capRequired: boolean;
  capDeadline?: string;
  createdBy: string;
  action: "created" | "updated";
  locale: "en" | "fr";
}

// =============================================================================
// BILINGUAL CONTENT
// =============================================================================

const content = {
  en: {
    subject: {
      created: (severity: string, ref: string) =>
        severity === "CRITICAL"
          ? `CRITICAL Finding Identified - ${ref}`
          : `New Finding Identified - ${ref}`,
      updated: (ref: string) => `Finding Updated - ${ref}`,
    },
    preview: {
      created: (severity: string, area: string) =>
        `A ${severity.toLowerCase()} finding has been identified in ${area}`,
      updated: (ref: string) => `Finding ${ref} has been updated`,
    },
    greeting: (name: string) => `Dear ${name},`,
    intro: {
      created:
        "A finding has been identified during the peer review of your organization. Please review the details below.",
      updated:
        "A finding from your peer review has been updated. Please review the changes below.",
    },
    criticalWarning:
      "This is a CRITICAL finding that requires immediate attention and a Corrective Action Plan.",
    details: "Finding Details",
    reference: "Finding Reference",
    review: "Review Reference",
    title: "Finding Title",
    severity: "Severity",
    auditArea: "Audit Area",
    icaoRef: "ICAO Reference",
    type: "Finding Type",
    createdBy: "Identified by",
    capRequired: "CAP Required",
    capDeadline: "CAP Deadline",
    yes: "Yes",
    no: "No",
    descriptionTitle: "Description",
    nextStepsTitle: "Next Steps",
    nextSteps: {
      capRequired: [
        "Review the finding details carefully",
        "Develop a Corrective Action Plan (CAP) addressing the root cause",
        "Submit the CAP by the deadline indicated",
        "Implement corrective actions and collect evidence",
      ],
      noCapRequired: [
        "Review the finding details",
        "Consider if any preventive actions would be beneficial",
        "The finding will be included in the final review report",
      ],
    },
    viewFinding: "View Finding Details",
    createCAP: "Create CAP",
    note: "If you have questions about this finding or need clarification, please contact the review team.",
    closing: "Thank you for your commitment to continuous improvement.",
    signature: "The AAPRP Review Team",
  },
  fr: {
    subject: {
      created: (severity: string, ref: string) =>
        severity === "CRITICAL"
          ? `Constatation CRITIQUE identifiée - ${ref}`
          : `Nouvelle constatation identifiée - ${ref}`,
      updated: (ref: string) => `Constatation mise à jour - ${ref}`,
    },
    preview: {
      created: (severity: string, area: string) =>
        `Une constatation ${severity.toLowerCase()} a été identifiée dans ${area}`,
      updated: (ref: string) => `La constatation ${ref} a été mise à jour`,
    },
    greeting: (name: string) => `Cher/Chère ${name},`,
    intro: {
      created:
        "Une constatation a été identifiée lors de l'évaluation par les pairs de votre organisation. Veuillez examiner les détails ci-dessous.",
      updated:
        "Une constatation de votre évaluation par les pairs a été mise à jour. Veuillez examiner les modifications ci-dessous.",
    },
    criticalWarning:
      "Il s'agit d'une constatation CRITIQUE qui nécessite une attention immédiate et un Plan d'Action Corrective.",
    details: "Détails de la constatation",
    reference: "Référence de la constatation",
    review: "Référence de l'évaluation",
    title: "Titre de la constatation",
    severity: "Gravité",
    auditArea: "Domaine d'audit",
    icaoRef: "Référence OACI",
    type: "Type de constatation",
    createdBy: "Identifié par",
    capRequired: "PAC requis",
    capDeadline: "Date limite du PAC",
    yes: "Oui",
    no: "Non",
    descriptionTitle: "Description",
    nextStepsTitle: "Prochaines étapes",
    nextSteps: {
      capRequired: [
        "Examiner attentivement les détails de la constatation",
        "Développer un Plan d'Action Corrective (PAC) traitant la cause profonde",
        "Soumettre le PAC avant la date limite indiquée",
        "Mettre en œuvre les actions correctives et collecter les preuves",
      ],
      noCapRequired: [
        "Examiner les détails de la constatation",
        "Considérer si des actions préventives seraient bénéfiques",
        "La constatation sera incluse dans le rapport final de l'évaluation",
      ],
    },
    viewFinding: "Voir les détails",
    createCAP: "Créer un PAC",
    note: "Si vous avez des questions sur cette constatation ou avez besoin d'éclaircissements, veuillez contacter l'équipe d'évaluation.",
    closing: "Merci de votre engagement envers l'amélioration continue.",
    signature: "L'équipe d'évaluation AAPRP",
  },
};

// =============================================================================
// SEVERITY TRANSLATIONS
// =============================================================================

const severityTranslations: Record<string, { en: string; fr: string }> = {
  CRITICAL: { en: "Critical", fr: "Critique" },
  MAJOR: { en: "Major", fr: "Majeure" },
  MINOR: { en: "Minor", fr: "Mineure" },
  OBSERVATION: { en: "Observation", fr: "Observation" },
};

// =============================================================================
// FINDING TYPE TRANSLATIONS
// =============================================================================

const findingTypeTranslations: Record<string, { en: string; fr: string }> = {
  NON_CONFORMITY: { en: "Non-Conformity", fr: "Non-conformité" },
  CONCERN: { en: "Concern", fr: "Préoccupation" },
  OBSERVATION: { en: "Observation", fr: "Observation" },
  GOOD_PRACTICE: { en: "Good Practice", fr: "Bonne pratique" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function FindingNotificationEmail(props: FindingNotificationEmailProps) {
  const {
    recipientName,
    reviewReference,
    findingReference,
    findingTitle,
    severity,
    auditArea,
    icaoReference,
    findingType,
    description,
    capRequired,
    capDeadline,
    createdBy,
    action,
    locale,
  } = props;

  const t = content[locale];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aaprp.aero";
  const translatedSeverity = severityTranslations[severity]?.[locale] || severity;
  const translatedType = findingTypeTranslations[findingType]?.[locale] || findingType;
  const isCritical = severity === "CRITICAL";

  return (
    <BaseLayout
      locale={locale}
      previewText={
        action === "created"
          ? t.preview.created(translatedSeverity, auditArea)
          : t.preview.updated(findingReference)
      }
    >
      {isCritical && <div style={styles.urgentBadge}>CRITICAL</div>}

      <Text style={styles.greeting}>{t.greeting(recipientName)}</Text>

      <Text style={styles.paragraph}>{t.intro[action]}</Text>

      {isCritical && (
        <div
          style={{
            ...styles.highlight,
            backgroundColor: "#fef2f2",
            borderLeftColor: "#dc2626",
          }}
        >
          <Text style={{ ...styles.highlightText, color: "#dc2626" }}>
            {t.criticalWarning}
          </Text>
        </div>
      )}

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.details}
      </Text>

      <InfoBox>
        <InfoRow label={t.reference} value={findingReference} />
        <InfoRow label={t.review} value={reviewReference} />
        <InfoRow label={t.title} value={findingTitle} />
        <InfoRow label={t.severity} value={translatedSeverity} />
        <InfoRow label={t.auditArea} value={auditArea} />
        {icaoReference && <InfoRow label={t.icaoRef} value={icaoReference} />}
        <InfoRow label={t.type} value={translatedType} />
        <InfoRow label={t.createdBy} value={createdBy} />
        <InfoRow label={t.capRequired} value={capRequired ? t.yes : t.no} />
        {capRequired && capDeadline && (
          <InfoRow label={t.capDeadline} value={capDeadline} />
        )}
      </InfoBox>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.descriptionTitle}
      </Text>

      <div style={styles.infoBox}>
        <Text style={{ ...styles.paragraph, margin: 0, whiteSpace: "pre-wrap" as const }}>
          {description}
        </Text>
      </div>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.nextStepsTitle}
      </Text>

      <div style={{ marginBottom: "24px" }}>
        {(capRequired ? t.nextSteps.capRequired : t.nextSteps.noCapRequired).map(
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

      <table cellPadding={0} cellSpacing={0} style={{ margin: "24px 0" }}>
        <tr>
          <td>
            <Button
              href={`${baseUrl}/findings/${findingReference}`}
              style={styles.button}
            >
              {t.viewFinding}
            </Button>
          </td>
          {capRequired && (
            <td style={{ paddingLeft: "12px" }}>
              <Button
                href={`${baseUrl}/findings/${findingReference}/cap`}
                style={styles.buttonSecondary}
              >
                {t.createCAP}
              </Button>
            </td>
          )}
        </tr>
      </table>

      <Hr style={styles.hr} />

      <Text style={styles.paragraph}>{t.note}</Text>

      <Text style={styles.paragraph}>{t.closing}</Text>

      <Text style={{ ...styles.paragraph, fontWeight: 600 }}>{t.signature}</Text>
    </BaseLayout>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export function getFindingNotificationSubject(
  action: "created" | "updated",
  severity: string,
  findingReference: string,
  locale: "en" | "fr"
): string {
  return action === "created"
    ? content[locale].subject.created(severity, findingReference)
    : content[locale].subject.updated(findingReference);
}

export default FindingNotificationEmail;
