/**
 * Best Practices Section Component
 *
 * Highlights noteworthy practices identified during the review.
 */

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { styles, labels, colors } from "../styles";
import type { ReportPageProps, BestPracticeInfo } from "../types";

// =============================================================================
// LOCAL STYLES
// =============================================================================

const bpStyles = StyleSheet.create({
  practiceCard: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.goodPractice,
    borderRadius: 4,
    overflow: "hidden",
  },
  practiceHeader: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.goodPractice,
  },
  practiceIcon: {
    width: 24,
    height: 24,
    backgroundColor: colors.goodPractice,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  practiceIconText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: "bold",
  },
  practiceBody: {
    padding: 12,
  },
  practiceField: {
    marginBottom: 10,
  },
  areaBadge: {
    backgroundColor: colors.gray[100],
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 3,
    alignSelf: "flex-start",
    marginLeft: "auto",
  },
});

// =============================================================================
// BEST PRACTICE CARD
// =============================================================================

interface BestPracticeCardProps {
  practice: BestPracticeInfo;
  locale: "en" | "fr";
}

function BestPracticeCard({ practice, locale }: BestPracticeCardProps) {
  return (
    <View style={bpStyles.practiceCard} wrap={false}>
      {/* Header */}
      <View style={bpStyles.practiceHeader}>
        <View style={bpStyles.practiceIcon}>
          <Text style={bpStyles.practiceIconText}>+</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.goodPractice }}>
            {practice.reference}
          </Text>
          <Text style={{ fontSize: 11, color: colors.gray[800], marginTop: 2 }}>
            {practice.title}
          </Text>
        </View>
        <View style={bpStyles.areaBadge}>
          <Text style={{ fontSize: 8, color: colors.gray[600] }}>
            {practice.reviewArea}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={bpStyles.practiceBody}>
        {/* Description */}
        <View style={bpStyles.practiceField}>
          <Text style={styles.label}>
            {locale === "fr" ? "Description" : "Description"}
          </Text>
          <Text style={{ fontSize: 9, color: colors.gray[700], lineHeight: 1.4 }}>
            {practice.description}
          </Text>
        </View>

        {/* Benefit */}
        <View style={bpStyles.practiceField}>
          <Text style={styles.label}>
            {locale === "fr" ? "Bénéfice" : "Benefit"}
          </Text>
          <View style={styles.successBox}>
            <Text style={{ fontSize: 9, color: colors.goodPractice }}>
              {practice.benefit}
            </Text>
          </View>
        </View>

        {/* Applicability */}
        <View style={{ ...bpStyles.practiceField, marginBottom: 0 }}>
          <Text style={styles.label}>
            {locale === "fr" ? "Applicabilité" : "Applicability"}
          </Text>
          <Text style={{ fontSize: 9, color: colors.gray[600], fontStyle: "italic" }}>
            {practice.applicability}
          </Text>
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BestPracticesSection({ review, locale }: ReportPageProps) {
  const t = labels[locale];
  const { bestPractices } = review;

  if (bestPractices.length === 0) {
    return null;
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.bestPractices}</Text>

      {/* Introduction */}
      <Text style={styles.paragraph}>{t.bestPracticeDescription}</Text>

      {/* Summary */}
      <View style={{ ...styles.successBox, marginBottom: 20 }}>
        <Text style={{ fontSize: 10, color: colors.goodPractice, fontWeight: "bold" }}>
          {locale === "fr"
            ? `${bestPractices.length} bonne(s) pratique(s) identifiée(s)`
            : `${bestPractices.length} best practice(s) identified`}
        </Text>
      </View>

      {/* Best Practice Cards */}
      {bestPractices.map((practice) => (
        <BestPracticeCard
          key={practice.id}
          practice={practice}
          locale={locale}
        />
      ))}

      {/* Note */}
      <View style={styles.infoBox}>
        <Text style={{ fontSize: 8, color: colors.gray[500] }}>
          {locale === "fr"
            ? "Ces bonnes pratiques seront partagées au sein du réseau AAPRP afin de promouvoir l'amélioration continue dans l'ensemble de la communauté des fournisseurs de services de navigation aérienne africains."
            : "These best practices will be shared within the AAPRP network to promote continuous improvement across the African air navigation service provider community."}
        </Text>
      </View>
    </View>
  );
}
