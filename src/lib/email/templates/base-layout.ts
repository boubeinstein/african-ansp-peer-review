export interface EmailLayoutProps {
  previewText?: string;
  locale?: "en" | "fr";
}

export function getEmailLayout(
  content: string,
  props: EmailLayoutProps = {}
): string {
  const { previewText = "", locale = "en" } = props;

  const year = new Date().getFullYear();
  const footerText =
    locale === "fr"
      ? `© ${year} Programme Africain d'Évaluation par les Pairs des ANSP. Tous droits réservés.`
      : `© ${year} African ANSP Peer Review Programme. All rights reserved.`;

  const unsubscribeText =
    locale === "fr"
      ? "Gérer vos préférences de notification"
      : "Manage your notification preferences";

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>AAPRP</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f4f5; }

    /* Typography */
    .email-body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }

    /* Button */
    .btn { display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .btn:hover { background-color: #0284c7; }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .content { padding: 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ""}

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 12px;">
                    <img src="${appUrl}/logo.png" alt="AAPRP" width="40" height="40" style="display: block;" />
                  </td>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #0ea5e9;">AAPRP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td class="content" style="padding: 32px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
                ${footerText}
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="${appUrl}/settings/notifications" style="color: #0ea5e9; text-decoration: none;">
                  ${unsubscribeText}
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Create a primary action button
 */
export function emailButton(text: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td>
          <a href="${url}" class="btn" style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Create a secondary/outline button
 */
export function emailButtonOutline(text: string, url: string): string {
  return `
    <a href="${url}" style="display: inline-block; padding: 10px 20px; border: 2px solid #0ea5e9; color: #0ea5e9; text-decoration: none; border-radius: 6px; font-weight: 600;">
      ${text}
    </a>
  `;
}
