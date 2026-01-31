/**
 * Cover Page Component
 *
 * First page of the peer review report with AAPRP branding.
 */

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, labels } from "../styles";
import type { ReportPageProps } from "../types";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

// =============================================================================
// STYLES
// =============================================================================

const coverStyles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    padding: 0,
  },
  header: {
    backgroundColor: colors.primary,
    height: 120,
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.white,
    letterSpacing: 4,
  },
  logoSubtext: {
    fontSize: 10,
    color: colors.gray[300],
    marginTop: 8,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 60,
    paddingTop: 80,
    justifyContent: "center",
  },
  reportTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 40,
  },
  organizationName: {
    fontSize: 24,
    color: colors.gray[700],
    textAlign: "center",
    marginBottom: 15,
  },
  organizationCountry: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: "center",
    marginBottom: 50,
  },
  infoBox: {
    backgroundColor: colors.gray[50],
    padding: 25,
    marginHorizontal: 40,
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoLabel: {
    width: 150,
    fontSize: 10,
    color: colors.gray[500],
  },
  infoValue: {
    flex: 1,
    fontSize: 11,
    color: colors.gray[800],
    fontWeight: "bold",
  },
  classificationBadge: {
    alignSelf: "center",
    marginTop: 30,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: colors.danger,
    borderRadius: 4,
  },
  classificationText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.white,
    letterSpacing: 2,
  },
  footer: {
    backgroundColor: colors.gray[100],
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 9,
    color: colors.gray[500],
  },
  footerPartners: {
    fontSize: 8,
    color: colors.gray[400],
    marginTop: 5,
  },
});

// =============================================================================
// COMPONENT
// =============================================================================

export function CoverPage({ review, locale }: ReportPageProps) {
  const t = labels[locale];
  const dateLocale = locale === "fr" ? fr : enUS;

  return (
    <Page size="A4" style={coverStyles.page}>
      {/* Header with AAPRP branding */}
      <View style={coverStyles.header}>
        <View style={coverStyles.logo}>
          <Text style={coverStyles.logoText}>AAPRP</Text>
        </View>
        <Text style={coverStyles.logoSubtext}>
          {locale === "fr"
            ? "Programme Africain d'Évaluation par les Pairs des ANSP"
            : "African ANSP Peer Review Programme"}
        </Text>
      </View>

      {/* Main content */}
      <View style={coverStyles.content}>
        <Text style={coverStyles.reportTitle}>{t.peerReviewReport}</Text>

        <Text style={coverStyles.organizationName}>
          {review.hostOrganization.name}
        </Text>
        <Text style={coverStyles.organizationCountry}>
          {review.hostOrganization.country}
        </Text>

        {/* Info box */}
        <View style={coverStyles.infoBox}>
          <View style={coverStyles.infoRow}>
            <Text style={coverStyles.infoLabel}>{t.reviewReference}:</Text>
            <Text style={coverStyles.infoValue}>{review.reference}</Text>
          </View>
          <View style={coverStyles.infoRow}>
            <Text style={coverStyles.infoLabel}>{t.reviewPeriod}:</Text>
            <Text style={coverStyles.infoValue}>
              {format(review.startDate, "d MMMM yyyy", { locale: dateLocale })} -{" "}
              {format(review.endDate, "d MMMM yyyy", { locale: dateLocale })}
            </Text>
          </View>
          <View style={coverStyles.infoRow}>
            <Text style={coverStyles.infoLabel}>{t.reportDate}:</Text>
            <Text style={coverStyles.infoValue}>
              {format(review.reportDate, "d MMMM yyyy", { locale: dateLocale })}
            </Text>
          </View>
          <View style={{ ...coverStyles.infoRow, marginBottom: 0 }}>
            <Text style={coverStyles.infoLabel}>{t.leadReviewer}:</Text>
            <Text style={coverStyles.infoValue}>
              {review.leadReviewer.firstName} {review.leadReviewer.lastName}
            </Text>
          </View>
        </View>

        {/* Classification badge if applicable */}
        {review.classification && (
          <View style={coverStyles.classificationBadge}>
            <Text style={coverStyles.classificationText}>
              {review.classification.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={coverStyles.footer}>
        <Text style={coverStyles.footerText}>{t.preparedBy}</Text>
        <Text style={coverStyles.footerPartners}>
          {locale === "fr"
            ? "En partenariat avec l'OACI, CANSO et l'AFCAC"
            : "In partnership with ICAO, CANSO & AFCAC"}
        </Text>
      </View>
    </Page>
  );
}
