/**
 * CAP Overdue Email Template
 *
 * Sent when a Corrective Action Plan milestone is overdue.
 * Escalates the urgency and notifies relevant stakeholders.
 */

import { Text, Button, Hr } from "@react-email/components";
import * as React from "react";
import { BaseLayout, InfoBox, InfoRow, styles } from "./base-layout";

// =============================================================================
// TYPES
// =============================================================================

export interface CAPOverdueEmailProps {
  recipientName: string;
  organizationName: string;
  reviewReference: string;
  findingReference: string;
  findingTitle: string;
  severity: string;
  milestoneTitle: string;
  originalDueDate: string;
  daysOverdue: number;
  capProgress: number;
  escalationLevel: "first" | "second" | "final";
  locale: "en" | "fr";
}

// =============================================================================
// BILINGUAL CONTENT
// =============================================================================

const content = {
  en: {
    subject: (days: number, ref: string, level: string) => {
      const prefix =
        level === "final" ? "FINAL NOTICE" : level === "second" ? "ESCALATION" : "OVERDUE";
      return `${prefix}: CAP ${days} days overdue - ${ref}`;
    },
    preview: (days: number, org: string) =>
      `Action required: CAP for ${org} is ${days} days overdue`,
    greeting: (name: string) => `Dear ${name},`,
    intro: (days: number) =>
      `A Corrective Action Plan (CAP) milestone for your organization is now ${days} day${days === 1 ? "" : "s"} overdue.`,
    escalationNotice: {
      first:
        "This is the first overdue notice. Please take immediate action to address this matter.",
      second:
        "This is an escalated notice. Senior management has been notified of this overdue status.",
      final:
        "This is the FINAL notice. Failure to respond may result in formal escalation to regulatory authorities and programme governance bodies.",
    },
    details: "Overdue CAP Details",
    review: "Review Reference",
    finding: "Finding Reference",
    findingTitle: "Finding",
    severity: "Severity",
    milestone: "Overdue Milestone",
    originalDue: "Original Due Date",
    daysOverdue: "Days Overdue",
    progress: "Current Progress",
    requiredActions: "Required Actions",
    actions: [
      "Complete all outstanding corrective actions immediately",
      "Upload supporting evidence of implementation",
      "Contact the review team if you need assistance or an extension",
      "Provide a written explanation for the delay",
    ],
    viewCAP: "View CAP Details",
    requestExtension: "Request Extension",
    implications: "Programme Implications",
    implicationsText:
      "Continued non-compliance with agreed timelines may result in:",
    implicationsList: [
      "Formal reporting to programme governance",
      "Impact on organization's programme standing",
      "Escalation to regional aviation authorities",
      "Inclusion in programme performance reports",
    ],
    support:
      "We understand that circumstances may arise that prevent timely completion. If this is the case, please contact us immediately to discuss options.",
    closing: "Immediate action is required to resolve this matter.",
    signature: "The AAPRP Coordination Team",
  },
  fr: {
    subject: (days: number, ref: string, level: string) => {
      const prefix =
        level === "final"
          ? "DERNIER AVIS"
          : level === "second"
            ? "ESCALADE"
            : "EN RETARD";
      return `${prefix}: PAC en retard de ${days} jours - ${ref}`;
    },
    preview: (days: number, org: string) =>
      `Action requise: Le PAC de ${org} est en retard de ${days} jours`,
    greeting: (name: string) => `Cher/Chère ${name},`,
    intro: (days: number) =>
      `Un jalon du Plan d'Action Corrective (PAC) de votre organisation est maintenant en retard de ${days} jour${days === 1 ? "" : "s"}.`,
    escalationNotice: {
      first:
        "Ceci est le premier avis de retard. Veuillez prendre des mesures immédiates pour résoudre cette situation.",
      second:
        "Ceci est un avis d'escalade. La direction a été informée de ce retard.",
      final:
        "Ceci est l'avis FINAL. L'absence de réponse peut entraîner une escalade formelle auprès des autorités réglementaires et des organes de gouvernance du programme.",
    },
    details: "Détails du PAC en retard",
    review: "Référence de l'examen",
    finding: "Référence de la constatation",
    findingTitle: "Constatation",
    severity: "Gravité",
    milestone: "Jalon en retard",
    originalDue: "Date d'échéance originale",
    daysOverdue: "Jours de retard",
    progress: "Progression actuelle",
    requiredActions: "Actions requises",
    actions: [
      "Compléter immédiatement toutes les actions correctives en suspens",
      "Télécharger les preuves justificatives de mise en œuvre",
      "Contacter l'équipe d'examen si vous avez besoin d'aide ou d'une prolongation",
      "Fournir une explication écrite du retard",
    ],
    viewCAP: "Voir les détails du PAC",
    requestExtension: "Demander une prolongation",
    implications: "Implications pour le programme",
    implicationsText:
      "Le non-respect continu des délais convenus peut entraîner :",
    implicationsList: [
      "Un rapport formel à la gouvernance du programme",
      "Un impact sur la position de l'organisation dans le programme",
      "Une escalade aux autorités aéronautiques régionales",
      "Une inclusion dans les rapports de performance du programme",
    ],
    support:
      "Nous comprenons que des circonstances peuvent empêcher l'achèvement dans les délais. Si tel est le cas, veuillez nous contacter immédiatement pour discuter des options.",
    closing: "Une action immédiate est requise pour résoudre cette question.",
    signature: "L'équipe de coordination AAPRP",
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
// COMPONENT
// =============================================================================

export function CAPOverdueEmail(props: CAPOverdueEmailProps) {
  const {
    recipientName,
    organizationName,
    reviewReference,
    findingReference,
    findingTitle,
    severity,
    milestoneTitle,
    originalDueDate,
    daysOverdue,
    capProgress,
    escalationLevel,
    locale,
  } = props;

  const t = content[locale];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aaprp.aero";
  const translatedSeverity = severityTranslations[severity]?.[locale] || severity;

  return (
    <BaseLayout
      locale={locale}
      previewText={t.preview(daysOverdue, organizationName)}
    >
      <div style={styles.urgentBadge}>
        {escalationLevel === "final"
          ? locale === "fr"
            ? "DERNIER AVIS"
            : "FINAL NOTICE"
          : locale === "fr"
            ? "EN RETARD"
            : "OVERDUE"}
      </div>

      <Text style={styles.greeting}>{t.greeting(recipientName)}</Text>

      <Text style={styles.paragraph}>{t.intro(daysOverdue)}</Text>

      <div
        style={{
          ...styles.highlight,
          backgroundColor: "#fef2f2",
          borderLeftColor: "#dc2626",
        }}
      >
        <Text style={{ ...styles.highlightText, color: "#dc2626" }}>
          {t.escalationNotice[escalationLevel]}
        </Text>
      </div>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.details}
      </Text>

      <InfoBox>
        <InfoRow label={t.review} value={reviewReference} />
        <InfoRow label={t.finding} value={findingReference} />
        <InfoRow label={t.findingTitle} value={findingTitle} />
        <InfoRow label={t.severity} value={translatedSeverity} />
        <InfoRow label={t.milestone} value={milestoneTitle} />
        <InfoRow label={t.originalDue} value={originalDueDate} />
        <InfoRow
          label={t.daysOverdue}
          value={`${daysOverdue} ${locale === "fr" ? "jours" : "days"}`}
        />
        <InfoRow label={t.progress} value={`${capProgress}%`} />
      </InfoBox>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.requiredActions}
      </Text>

      <div style={{ marginBottom: "24px" }}>
        {t.actions.map((action, index) => (
          <Text
            key={index}
            style={{
              ...styles.paragraph,
              margin: "8px 0",
              paddingLeft: "16px",
            }}
          >
            {index + 1}. {action}
          </Text>
        ))}
      </div>

      <table cellPadding={0} cellSpacing={0} style={{ margin: "24px 0" }}>
        <tr>
          <td>
            <Button
              href={`${baseUrl}/caps/${findingReference}`}
              style={styles.button}
            >
              {t.viewCAP}
            </Button>
          </td>
          <td style={{ paddingLeft: "12px" }}>
            <Button
              href={`${baseUrl}/caps/${findingReference}/extension`}
              style={styles.buttonSecondary}
            >
              {t.requestExtension}
            </Button>
          </td>
        </tr>
      </table>

      {(escalationLevel === "second" || escalationLevel === "final") && (
        <>
          <Hr style={styles.hr} />

          <Text
            style={{ ...styles.paragraph, fontWeight: 600, color: "#dc2626" }}
          >
            {t.implications}
          </Text>

          <Text style={styles.paragraph}>{t.implicationsText}</Text>

          <div style={{ marginBottom: "24px" }}>
            {t.implicationsList.map((item, index) => (
              <Text
                key={index}
                style={{
                  ...styles.paragraph,
                  margin: "4px 0",
                  paddingLeft: "16px",
                  color: "#6b7280",
                }}
              >
                • {item}
              </Text>
            ))}
          </div>
        </>
      )}

      <Hr style={styles.hr} />

      <Text style={styles.paragraph}>{t.support}</Text>

      <Text style={{ ...styles.paragraph, fontWeight: 500 }}>{t.closing}</Text>

      <Text style={{ ...styles.paragraph, fontWeight: 600 }}>{t.signature}</Text>
    </BaseLayout>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export function getCAPOverdueSubject(
  daysOverdue: number,
  findingReference: string,
  escalationLevel: "first" | "second" | "final",
  locale: "en" | "fr"
): string {
  return content[locale].subject(daysOverdue, findingReference, escalationLevel);
}

export default CAPOverdueEmail;
