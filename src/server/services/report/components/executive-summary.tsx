/**
 * Executive Summary Component
 *
 * High-level overview of the peer review results.
 */

import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles, labels, colors } from "../styles";
import type { ReportPageProps } from "../types";

// =============================================================================
// COMPONENT
// =============================================================================

export function ExecutiveSummary({ review, locale }: ReportPageProps) {
  const t = labels[locale];
  const { findingsSummary } = review;

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.executiveSummary}</Text>

      {/* Overall Assessment */}
      <Text style={styles.subsectionTitle}>{t.overallAssessment}</Text>
      <Text style={styles.paragraph}>{review.overallAssessment}</Text>

      {/* Summary Statistics */}
      <Text style={styles.subsectionTitle}>{t.summaryStatistics}</Text>
      <View style={{ flexDirection: "row", marginVertical: 15 }}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{findingsSummary.total}</Text>
          <Text style={styles.statLabel}>{t.total}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ ...styles.statValue, color: colors.critical }}>
            {findingsSummary.bySeverity.critical}
          </Text>
          <Text style={styles.statLabel}>{t.critical}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ ...styles.statValue, color: colors.major }}>
            {findingsSummary.bySeverity.major}
          </Text>
          <Text style={styles.statLabel}>{t.major}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ ...styles.statValue, color: colors.minor }}>
            {findingsSummary.bySeverity.minor}
          </Text>
          <Text style={styles.statLabel}>{t.minor}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ ...styles.statValue, color: colors.goodPractice }}>
            {findingsSummary.goodPractices}
          </Text>
          <Text style={styles.statLabel}>{t.goodPractices}</Text>
        </View>
      </View>

      {/* Key Strengths */}
      <Text style={styles.subsectionTitle}>{t.keyStrengths}</Text>
      <View style={styles.successBox}>
        {review.keyStrengths.map((strength, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listBullet}>+</Text>
            <Text style={styles.listContent}>{strength}</Text>
          </View>
        ))}
      </View>

      {/* Areas for Improvement */}
      <Text style={styles.subsectionTitle}>{t.areasForImprovement}</Text>
      <View style={styles.warningBox}>
        {review.areasForImprovement.map((area, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listBullet}>-</Text>
            <Text style={styles.listContent}>{area}</Text>
          </View>
        ))}
      </View>

      {/* Findings by Area Chart (represented as table) */}
      <Text style={styles.subsectionTitle}>{t.findingsByArea}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>
            {locale === "fr" ? "Domaine" : "Area"}
          </Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1, textAlign: "center" }}>
            {t.total}
          </Text>
        </View>
        {Object.entries(findingsSummary.byArea).map(([area, count], index) => (
          <View
            key={area}
            style={{
              ...styles.tableRow,
              ...(index % 2 === 1 ? styles.tableCellAlt : {}),
            }}
          >
            <Text style={{ ...styles.tableCell, flex: 2 }}>{area}</Text>
            <Text style={{ ...styles.tableCell, flex: 1, textAlign: "center" }}>
              {count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
