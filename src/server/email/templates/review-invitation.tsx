/**
 * Review Invitation Email Template
 *
 * Sent when a reviewer is invited to participate in a peer review.
 * Includes review details and action buttons to accept/decline.
 */

import { Text, Button, Hr, Link } from "@react-email/components";
import * as React from "react";
import { BaseLayout, InfoBox, InfoRow, styles } from "./base-layout";

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewInvitationEmailProps {
  reviewerName: string;
  reviewReference: string;
  hostOrganization: string;
  hostCountry: string;
  role: string;
  startDate: string;
  endDate: string;
  areasInScope: string[];
  invitedBy: string;
  responseDeadline: string;
  locale: "en" | "fr";
}

// =============================================================================
// BILINGUAL CONTENT
// =============================================================================

const content = {
  en: {
    subject: (ref: string) => `Invitation to Peer Review ${ref}`,
    preview: (org: string) => `You've been invited to participate in the peer review of ${org}`,
    greeting: (name: string) => `Dear ${name},`,
    intro: (role: string, org: string) =>
      `You have been invited to participate as ${role} in an upcoming peer review of ${org}.`,
    details: "Review Details",
    reference: "Reference",
    organization: "Host Organization",
    country: "Country",
    role: "Your Role",
    dates: "Review Dates",
    areas: "Areas in Scope",
    invitedBy: "Invited by",
    deadline: "Response Deadline",
    action: "Please respond to this invitation by the deadline indicated above.",
    acceptButton: "Accept Invitation",
    declineButton: "Decline Invitation",
    viewDetails: "View Review Details",
    note: "If you have any questions about this review or need to discuss your availability, please contact the review coordinator.",
    closing: "We look forward to your participation in this important initiative.",
    signature: "The AAPRP Coordination Team",
  },
  fr: {
    subject: (ref: string) => `Invitation à l'évaluation par les pairs ${ref}`,
    preview: (org: string) => `Vous avez été invité(e) à participer à l'évaluation par les pairs de ${org}`,
    greeting: (name: string) => `Cher/Chère ${name},`,
    intro: (role: string, org: string) =>
      `Vous avez été invité(e) à participer en tant que ${role} à un prochain évaluation par les pairs de ${org}.`,
    details: "Détails de l'évaluation",
    reference: "Référence",
    organization: "Organisation hôte",
    country: "Pays",
    role: "Votre rôle",
    dates: "Dates de l'évaluation",
    areas: "Domaines couverts",
    invitedBy: "Invité(e) par",
    deadline: "Date limite de réponse",
    action: "Veuillez répondre à cette invitation avant la date limite indiquée ci-dessus.",
    acceptButton: "Accepter l'invitation",
    declineButton: "Décliner l'invitation",
    viewDetails: "Voir les détails",
    note: "Si vous avez des questions sur cet évaluation ou si vous devez discuter de votre disponibilité, veuillez contacter le coordinateur de l'évaluation.",
    closing: "Nous espérons votre participation à cette importante initiative.",
    signature: "L'équipe de coordination AAPRP",
  },
};

// =============================================================================
// ROLE TRANSLATIONS
// =============================================================================

const roleTranslations: Record<string, { en: string; fr: string }> = {
  LEAD_REVIEWER: { en: "Lead Reviewer", fr: "Évaluateur principal" },
  TEAM_MEMBER: { en: "Team Member", fr: "Membre de l'équipe" },
  OBSERVER: { en: "Observer", fr: "Observateur" },
  TECHNICAL_EXPERT: { en: "Technical Expert", fr: "Expert technique" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewInvitationEmail(props: ReviewInvitationEmailProps) {
  const {
    reviewerName,
    reviewReference,
    hostOrganization,
    hostCountry,
    role,
    startDate,
    endDate,
    areasInScope,
    invitedBy,
    responseDeadline,
    locale,
  } = props;

  const t = content[locale];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aaprp.aero";
  const translatedRole = roleTranslations[role]?.[locale] || role;

  return (
    <BaseLayout locale={locale} previewText={t.preview(hostOrganization)}>
      <Text style={styles.greeting}>{t.greeting(reviewerName)}</Text>

      <Text style={styles.paragraph}>{t.intro(translatedRole, hostOrganization)}</Text>

      <Text style={{ ...styles.paragraph, fontWeight: 600, marginTop: "24px" }}>
        {t.details}
      </Text>

      <InfoBox>
        <InfoRow label={t.reference} value={reviewReference} />
        <InfoRow label={t.organization} value={hostOrganization} />
        <InfoRow label={t.country} value={hostCountry} />
        <InfoRow label={t.role} value={translatedRole} />
        <InfoRow label={t.dates} value={`${startDate} - ${endDate}`} />
        <InfoRow label={t.areas} value={areasInScope.join(", ")} />
        <InfoRow label={t.invitedBy} value={invitedBy} />
        <InfoRow label={t.deadline} value={responseDeadline} />
      </InfoBox>

      <div style={styles.highlight}>
        <Text style={styles.highlightText}>{t.action}</Text>
      </div>

      <table cellPadding={0} cellSpacing={0} style={{ margin: "24px 0" }}>
        <tr>
          <td>
            <Button href={`${baseUrl}/reviews?action=accept`} style={styles.button}>
              {t.acceptButton}
            </Button>
          </td>
          <td style={{ paddingLeft: "12px" }}>
            <Link
              href={`${baseUrl}/reviews?action=decline`}
              style={styles.buttonSecondary}
            >
              {t.declineButton}
            </Link>
          </td>
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

export function getReviewInvitationSubject(
  reviewReference: string,
  locale: "en" | "fr"
): string {
  return content[locale].subject(reviewReference);
}

export default ReviewInvitationEmail;
