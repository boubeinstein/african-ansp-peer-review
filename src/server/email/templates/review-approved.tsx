/**
 * Review Approved Email Template
 *
 * Sent when a peer review request has been approved.
 * Notifies the host organization that their review is moving forward.
 */

import { Text, Button, Hr } from "@react-email/components";
import * as React from "react";
import { BaseLayout, InfoBox, InfoRow, styles } from "./base-layout";

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewApprovedEmailProps {
  recipientName: string;
  organizationName: string;
  reviewReference: string;
  approvedBy: string;
  approvalDate: string;
  proposedStartDate: string;
  proposedEndDate: string;
  nextSteps: string[];
  locale: "en" | "fr";
}

// =============================================================================
// BILINGUAL CONTENT
// =============================================================================

const content = {
  en: {
    subject: (ref: string) => `Review Request Approved - ${ref}`,
    preview: (org: string) => `Great news! The peer review request for ${org} has been approved`,
    greeting: (name: string) => `Dear ${name},`,
    intro:
      "We are pleased to inform you that your peer review request has been approved. Your organization is now scheduled to participate in the African ANSP Peer Review Programme.",
    details: "Approval Details",
    reference: "Review Reference",
    organization: "Organization",
    approvedBy: "Approved by",
    approvalDate: "Approval Date",
    proposedDates: "Proposed Dates",
    nextStepsTitle: "Next Steps",
    viewReview: "View Review Details",
    note: "Our coordination team will be in contact shortly to confirm the review dates and discuss the preparation process.",
    closing: "Thank you for your commitment to enhancing aviation safety through peer review.",
    signature: "The AAPRP Coordination Team",
  },
  fr: {
    subject: (ref: string) => `Demande d'examen approuvée - ${ref}`,
    preview: (org: string) => `Bonne nouvelle ! La demande d'examen par les pairs pour ${org} a été approuvée`,
    greeting: (name: string) => `Cher/Chère ${name},`,
    intro:
      "Nous avons le plaisir de vous informer que votre demande d'examen par les pairs a été approuvée. Votre organisation est maintenant programmée pour participer au Programme Africain d'Examen par les Pairs des ANSP.",
    details: "Détails de l'approbation",
    reference: "Référence de l'examen",
    organization: "Organisation",
    approvedBy: "Approuvé par",
    approvalDate: "Date d'approbation",
    proposedDates: "Dates proposées",
    nextStepsTitle: "Prochaines étapes",
    viewReview: "Voir les détails de l'examen",
    note: "Notre équipe de coordination vous contactera prochainement pour confirmer les dates de l'examen et discuter du processus de préparation.",
    closing: "Merci de votre engagement à améliorer la sécurité aérienne grâce à l'examen par les pairs.",
    signature: "L'équipe de coordination AAPRP",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewApprovedEmail(props: ReviewApprovedEmailProps) {
  const {
    recipientName,
    organizationName,
    reviewReference,
    approvedBy,
    approvalDate,
    proposedStartDate,
    proposedEndDate,
    nextSteps,
    locale,
  } = props;

  const t = content[locale];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aaprp.aero";

  return (
    <BaseLayout locale={locale} previewText={t.preview(organizationName)}>
      <div style={styles.successBadge}>
        {locale === "fr" ? "APPROUVÉ" : "APPROVED"}
      </div>

      <Text style={styles.greeting}>{t.greeting(recipientName)}</Text>

      <Text style={styles.paragraph}>{t.intro}</Text>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.details}
      </Text>

      <InfoBox>
        <InfoRow label={t.reference} value={reviewReference} />
        <InfoRow label={t.organization} value={organizationName} />
        <InfoRow label={t.approvedBy} value={approvedBy} />
        <InfoRow label={t.approvalDate} value={approvalDate} />
        <InfoRow
          label={t.proposedDates}
          value={`${proposedStartDate} - ${proposedEndDate}`}
        />
      </InfoBox>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.nextStepsTitle}
      </Text>

      <div style={{ marginBottom: "24px" }}>
        {nextSteps.map((step, index) => (
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
        ))}
      </div>

      <Button
        href={`${baseUrl}/reviews/${reviewReference}`}
        style={styles.button}
      >
        {t.viewReview}
      </Button>

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

export function getReviewApprovedSubject(
  reviewReference: string,
  locale: "en" | "fr"
): string {
  return content[locale].subject(reviewReference);
}

export const defaultNextSteps = {
  en: [
    "Review team assembly will begin shortly",
    "You will receive the pre-review documentation requirements",
    "A kick-off meeting will be scheduled with the review team",
    "Begin preparing the required documentation and evidence",
  ],
  fr: [
    "La constitution de l'équipe d'examen commencera prochainement",
    "Vous recevrez les exigences de documentation pré-examen",
    "Une réunion de lancement sera programmée avec l'équipe d'examen",
    "Commencez à préparer la documentation et les preuves requises",
  ],
};

export default ReviewApprovedEmail;
