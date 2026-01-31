import { getEmailLayout, emailButton } from "./base-layout";

export interface NotificationEmailData {
  recipientName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  locale?: "en" | "fr";
}

export function notificationEmailTemplate(data: NotificationEmailData): string {
  const {
    recipientName,
    title,
    message,
    actionUrl,
    actionLabel,
    locale = "en",
  } = data;

  const greeting =
    locale === "fr" ? `Bonjour ${recipientName},` : `Hello ${recipientName},`;

  const content = `
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #18181b;">
      ${title}
    </h1>

    <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">
      ${greeting}
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      ${message}
    </p>

    ${actionUrl && actionLabel ? emailButton(actionLabel, actionUrl) : ""}

    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a;">
      ${
        locale === "fr"
          ? "Si vous avez des questions, n'hésitez pas à nous contacter."
          : "If you have any questions, please don't hesitate to contact us."
      }
    </p>
  `;

  return getEmailLayout(content, {
    previewText: message.substring(0, 100),
    locale,
  });
}
