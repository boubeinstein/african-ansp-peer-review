import { getEmailLayout, emailButton } from "./base-layout";

export interface BestPracticePromotionEmailData {
  recipientName: string;
  bestPracticeTitle: string;
  bestPracticeDescription: string;
  originatingOrg: string;
  category: string;
  customMessage?: string;
  actionUrl: string;
  locale?: "en" | "fr";
}

export function bestPracticePromotionEmailTemplate(
  data: BestPracticePromotionEmailData
): string {
  const {
    recipientName,
    bestPracticeTitle,
    bestPracticeDescription,
    originatingOrg,
    category,
    customMessage,
    actionUrl,
    locale = "en",
  } = data;

  const isEn = locale === "en";

  const content = `
    <!-- Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      <tr>
        <td style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">
          ${isEn ? "Recommended Best Practice" : "Bonne Pratique Recommandée"}
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px; font-size: 14px; color: #71717a;">
      ${isEn ? `Hello ${recipientName},` : `Bonjour ${recipientName},`}
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      ${
        isEn
          ? "The AAPRP Programme has identified a best practice that may benefit your organization:"
          : "Le Programme AAPRP a identifié une bonne pratique qui pourrait bénéficier à votre organisation :"
      }
    </p>

    <!-- Best Practice Card -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #0ea5e9; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #64748b;">
            ${category} • ${originatingOrg}
          </p>
          <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #0f172a;">
            ${bestPracticeTitle}
          </h2>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #475569;">
            ${bestPracticeDescription}
          </p>
        </td>
      </tr>
    </table>

    ${
      customMessage
        ? `
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #3f3f46; padding: 16px; background-color: #fefce8; border-radius: 8px; border-left: 4px solid #eab308;">
      <strong>${isEn ? "Note from Programme Coordinator:" : "Note du Coordinateur du Programme :"}</strong><br/>
      ${customMessage}
    </p>
    `
        : ""
    }

    ${emailButton(isEn ? "View Best Practice" : "Voir la Bonne Pratique", actionUrl)}

    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a;">
      ${
        isEn
          ? "Consider adopting this practice to enhance your organization's safety management capabilities."
          : "Envisagez d'adopter cette pratique pour améliorer les capacités de gestion de la sécurité de votre organisation."
      }
    </p>
  `;

  return getEmailLayout(content, {
    previewText: `${isEn ? "Recommended:" : "Recommandé :"} ${bestPracticeTitle}`,
    locale,
  });
}
