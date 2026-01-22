/**
 * Base Email Layout
 *
 * Shared layout component for all AAPRP email templates.
 * Provides consistent branding, styling, and footer across all emails.
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
  Img,
  Preview,
} from "@react-email/components";
import * as React from "react";

// =============================================================================
// STYLES
// =============================================================================

export const styles = {
  body: {
    backgroundColor: "#f4f4f5",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: "20px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    margin: "0 auto",
    maxWidth: "600px",
    padding: "0",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  header: {
    backgroundColor: "#1e3a5f",
    borderRadius: "8px 8px 0 0",
    padding: "24px 32px",
    textAlign: "center" as const,
  },
  headerText: {
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: "bold" as const,
    margin: 0,
  },
  headerSubtext: {
    color: "#94a3b8",
    fontSize: "12px",
    margin: "8px 0 0 0",
    letterSpacing: "0.5px",
  },
  content: {
    padding: "32px",
  },
  greeting: {
    color: "#1f2937",
    fontSize: "16px",
    fontWeight: 600,
    margin: "0 0 16px 0",
  },
  paragraph: {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px 0",
  },
  highlight: {
    backgroundColor: "#f0f9ff",
    borderLeft: "4px solid #0ea5e9",
    borderRadius: "0 4px 4px 0",
    padding: "16px",
    margin: "24px 0",
  },
  highlightText: {
    color: "#0369a1",
    fontSize: "14px",
    margin: 0,
    lineHeight: "22px",
  },
  infoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "20px",
    margin: "24px 0",
    border: "1px solid #e2e8f0",
  },
  infoRow: {
    display: "flex" as const,
    marginBottom: "12px",
  },
  infoLabel: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 500,
    minWidth: "140px",
  },
  infoValue: {
    color: "#1f2937",
    fontSize: "14px",
    fontWeight: 600,
  },
  button: {
    backgroundColor: "#1e3a5f",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 600,
    padding: "12px 24px",
    textDecoration: "none",
    textAlign: "center" as const,
    margin: "24px 0",
  },
  buttonSecondary: {
    backgroundColor: "#ffffff",
    border: "2px solid #1e3a5f",
    borderRadius: "6px",
    color: "#1e3a5f",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 600,
    padding: "10px 22px",
    textDecoration: "none",
    textAlign: "center" as const,
    margin: "24px 8px 24px 0",
  },
  urgentBadge: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "4px",
    color: "#dc2626",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "16px",
  },
  warningBadge: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "4px",
    color: "#d97706",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "16px",
  },
  successBadge: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "4px",
    color: "#16a34a",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "16px",
  },
  hr: {
    borderColor: "#e2e8f0",
    margin: "24px 0",
  },
  footer: {
    backgroundColor: "#f8fafc",
    borderRadius: "0 0 8px 8px",
    padding: "24px 32px",
    borderTop: "1px solid #e2e8f0",
  },
  footerText: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "20px",
    margin: "0 0 8px 0",
    textAlign: "center" as const,
  },
  footerLink: {
    color: "#1e3a5f",
    textDecoration: "underline",
  },
  logo: {
    width: "48px",
    height: "48px",
    marginBottom: "12px",
  },
};

// =============================================================================
// BILINGUAL CONTENT
// =============================================================================

export const footerContent = {
  en: {
    description:
      "This email was sent by the African ANSP Peer Review Programme (AAPRP), a collaborative initiative endorsed by ICAO, CANSO, and AFCAC to enhance aviation safety across Africa.",
    unsubscribe: "Manage your notification preferences",
    contact: "Contact support",
    copyright: `${new Date().getFullYear()} African ANSP Peer Review Programme. All rights reserved.`,
  },
  fr: {
    description:
      "Cet e-mail a été envoyé par le Programme Africain d'Examen par les Pairs des ANSP (AAPRP), une initiative collaborative approuvée par l'OACI, CANSO et l'AFCAC pour améliorer la sécurité aérienne en Afrique.",
    unsubscribe: "Gérer vos préférences de notification",
    contact: "Contacter le support",
    copyright: `${new Date().getFullYear()} Programme Africain d'Examen par les Pairs des ANSP. Tous droits réservés.`,
  },
};

// =============================================================================
// BASE LAYOUT COMPONENT
// =============================================================================

interface BaseLayoutProps {
  locale: "en" | "fr";
  previewText: string;
  children: React.ReactNode;
}

export function BaseLayout({ locale, previewText, children }: BaseLayoutProps) {
  const footer = footerContent[locale];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aaprp.aero";

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Text style={styles.headerText}>AAPRP</Text>
            <Text style={styles.headerSubtext}>
              {locale === "fr"
                ? "Programme Africain d'Examen par les Pairs"
                : "African ANSP Peer Review Programme"}
            </Text>
          </Section>

          {/* Content */}
          <Section style={styles.content}>{children}</Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>{footer.description}</Text>
            <Text style={styles.footerText}>
              <Link href={`${baseUrl}/settings`} style={styles.footerLink}>
                {footer.unsubscribe}
              </Link>
              {" | "}
              <Link href={`${baseUrl}/support`} style={styles.footerLink}>
                {footer.contact}
              </Link>
            </Text>
            <Text style={{ ...styles.footerText, marginTop: "16px" }}>
              {footer.copyright}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <tr>
      <td style={{ ...styles.infoLabel, paddingBottom: "8px" }}>{label}</td>
      <td style={{ ...styles.infoValue, paddingBottom: "8px" }}>{value}</td>
    </tr>
  );
}

interface InfoBoxProps {
  children: React.ReactNode;
}

export function InfoBox({ children }: InfoBoxProps) {
  return (
    <table style={styles.infoBox} cellPadding={0} cellSpacing={0}>
      <tbody>{children}</tbody>
    </table>
  );
}
