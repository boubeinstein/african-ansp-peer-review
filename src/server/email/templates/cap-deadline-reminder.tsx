/**
 * CAP Deadline Reminder Email Template
 *
 * Sent when a Corrective Action Plan milestone deadline is approaching.
 * Reminds the host organization to complete their CAP actions.
 */

import { Text, Button, Hr } from "@react-email/components";
import * as React from "react";
import { BaseLayout, InfoBox, InfoRow, styles } from "./base-layout";

// =============================================================================
// TYPES
// =============================================================================

export interface CAPDeadlineReminderEmailProps {
  recipientName: string;
  organizationName: string;
  reviewReference: string;
  findingReference: string;
  findingTitle: string;
  severity: string;
  milestoneTitle: string;
  dueDate: string;
  daysRemaining: number;
  capProgress: number;
  locale: "en" | "fr";
}

// =============================================================================
// BILINGUAL CONTENT
// =============================================================================

const content = {
  en: {
    subject: (days: number, ref: string) =>
      days <= 7
        ? `URGENT: CAP Deadline in ${days} days - ${ref}`
        : `CAP Deadline Reminder - ${ref}`,
    preview: (days: number, milestone: string) =>
      `Reminder: Your CAP milestone "${milestone}" is due in ${days} days`,
    greeting: (name: string) => `Dear ${name},`,
    intro: (days: number) =>
      `This is a reminder that you have a Corrective Action Plan (CAP) milestone due in ${days} day${days === 1 ? "" : "s"}.`,
    urgentIntro: (days: number) =>
      `URGENT: Your Corrective Action Plan (CAP) milestone is due in ${days} day${days === 1 ? "" : "s"}. Immediate action is required.`,
    details: "CAP Details",
    review: "Review Reference",
    finding: "Finding Reference",
    findingTitle: "Finding",
    severity: "Severity",
    milestone: "Milestone",
    dueDate: "Due Date",
    progress: "Overall Progress",
    actionRequired: "Action Required",
    actionText:
      "Please ensure you complete the required actions and upload any supporting evidence before the deadline.",
    viewCAP: "View CAP Details",
    uploadEvidence: "Upload Evidence",
    consequences:
      "Failure to address findings within the agreed timeframe may affect your organization's standing in the peer review programme.",
    support:
      "If you are experiencing difficulties or need an extension, please contact the review team immediately.",
    closing: "Thank you for your attention to this matter.",
    signature: "The AAPRP Coordination Team",
  },
  fr: {
    subject: (days: number, ref: string) =>
      days <= 7
        ? `URGENT: Échéance PAC dans ${days} jours - ${ref}`
        : `Rappel d'échéance PAC - ${ref}`,
    preview: (days: number, milestone: string) =>
      `Rappel: Votre jalon PAC "${milestone}" est dû dans ${days} jours`,
    greeting: (name: string) => `Cher/Chère ${name},`,
    intro: (days: number) =>
      `Ceci est un rappel qu'un jalon de votre Plan d'Action Corrective (PAC) est dû dans ${days} jour${days === 1 ? "" : "s"}.`,
    urgentIntro: (days: number) =>
      `URGENT: Un jalon de votre Plan d'Action Corrective (PAC) est dû dans ${days} jour${days === 1 ? "" : "s"}. Une action immédiate est requise.`,
    details: "Détails du PAC",
    review: "Référence de l'examen",
    finding: "Référence de la constatation",
    findingTitle: "Constatation",
    severity: "Gravité",
    milestone: "Jalon",
    dueDate: "Date d'échéance",
    progress: "Progression globale",
    actionRequired: "Action requise",
    actionText:
      "Veuillez vous assurer de compléter les actions requises et de télécharger les preuves justificatives avant la date limite.",
    viewCAP: "Voir les détails du PAC",
    uploadEvidence: "Télécharger les preuves",
    consequences:
      "Le non-respect des constatations dans les délais convenus peut affecter la position de votre organisation dans le programme d'examen par les pairs.",
    support:
      "Si vous rencontrez des difficultés ou avez besoin d'une prolongation, veuillez contacter l'équipe d'examen immédiatement.",
    closing: "Merci de votre attention à cette question.",
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

export function CAPDeadlineReminderEmail(props: CAPDeadlineReminderEmailProps) {
  const {
    recipientName,
    organizationName,
    reviewReference,
    findingReference,
    findingTitle,
    severity,
    milestoneTitle,
    dueDate,
    daysRemaining,
    capProgress,
    locale,
  } = props;

  const t = content[locale];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aaprp.aero";
  const isUrgent = daysRemaining <= 7;
  const translatedSeverity = severityTranslations[severity]?.[locale] || severity;

  return (
    <BaseLayout
      locale={locale}
      previewText={t.preview(daysRemaining, milestoneTitle)}
    >
      <div style={isUrgent ? styles.urgentBadge : styles.warningBadge}>
        {isUrgent
          ? locale === "fr"
            ? "URGENT"
            : "URGENT"
          : locale === "fr"
            ? "RAPPEL"
            : "REMINDER"}
      </div>

      <Text style={styles.greeting}>{t.greeting(recipientName)}</Text>

      <Text style={styles.paragraph}>
        {isUrgent ? t.urgentIntro(daysRemaining) : t.intro(daysRemaining)}
      </Text>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.details}
      </Text>

      <InfoBox>
        <InfoRow label={t.review} value={reviewReference} />
        <InfoRow label={t.finding} value={findingReference} />
        <InfoRow label={t.findingTitle} value={findingTitle} />
        <InfoRow label={t.severity} value={translatedSeverity} />
        <InfoRow label={t.milestone} value={milestoneTitle} />
        <InfoRow label={t.dueDate} value={dueDate} />
        <InfoRow label={t.progress} value={`${capProgress}%`} />
      </InfoBox>

      <div style={styles.highlight}>
        <Text style={{ ...styles.highlightText, fontWeight: 600 }}>
          {t.actionRequired}
        </Text>
        <Text style={styles.highlightText}>{t.actionText}</Text>
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
              href={`${baseUrl}/caps/${findingReference}/evidence`}
              style={styles.buttonSecondary}
            >
              {t.uploadEvidence}
            </Button>
          </td>
        </tr>
      </table>

      <Hr style={styles.hr} />

      {isUrgent && (
        <Text
          style={{
            ...styles.paragraph,
            color: "#dc2626",
            fontWeight: 500,
          }}
        >
          {t.consequences}
        </Text>
      )}

      <Text style={styles.paragraph}>{t.support}</Text>

      <Text style={styles.paragraph}>{t.closing}</Text>

      <Text style={{ ...styles.paragraph, fontWeight: 600 }}>{t.signature}</Text>
    </BaseLayout>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export function getCAPDeadlineReminderSubject(
  daysRemaining: number,
  findingReference: string,
  locale: "en" | "fr"
): string {
  return content[locale].subject(daysRemaining, findingReference);
}

export default CAPDeadlineReminderEmail;
