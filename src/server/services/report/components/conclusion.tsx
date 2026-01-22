/**
 * Conclusion Section Component
 *
 * Final recommendations and acknowledgments.
 */

import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles, labels, colors } from "../styles";
import type { ReportPageProps } from "../types";

// =============================================================================
// COMPONENT
// =============================================================================

export function ConclusionSection({ review, locale }: ReportPageProps) {
  const t = labels[locale];

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.conclusionRecommendations}</Text>

      {/* Conclusion Introduction */}
      <Text style={styles.paragraph}>{t.conclusionIntro}</Text>

      {/* Summary of Key Points */}
      <View style={styles.box}>
        <Text style={{ fontSize: 10, color: colors.gray[700], lineHeight: 1.5 }}>
          {locale === "fr"
            ? `Cet examen a identifié ${review.findingsSummary.total} constatation(s), dont ${review.findingsSummary.bySeverity.critical} critique(s) et ${review.findingsSummary.bySeverity.major} majeure(s). ${review.findingsSummary.goodPractices > 0 ? `${review.findingsSummary.goodPractices} bonne(s) pratique(s) remarquable(s) ont également été identifiée(s).` : ""}`
            : `This review identified ${review.findingsSummary.total} finding(s), including ${review.findingsSummary.bySeverity.critical} critical and ${review.findingsSummary.bySeverity.major} major. ${review.findingsSummary.goodPractices > 0 ? `${review.findingsSummary.goodPractices} noteworthy best practice(s) were also identified.` : ""}`}
        </Text>
      </View>

      {/* Recommendations */}
      <Text style={styles.subsectionTitle}>{t.recommendations}</Text>
      <View style={{ marginBottom: 15 }}>
        {review.recommendations.map((recommendation, index) => (
          <View key={index} style={{ ...styles.listItem, marginBottom: 8 }}>
            <View
              style={{
                width: 20,
                height: 20,
                backgroundColor: colors.primary,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ fontSize: 9, color: colors.white, fontWeight: "bold" }}>
                {index + 1}
              </Text>
            </View>
            <Text style={{ ...styles.listContent, flex: 1 }}>{recommendation}</Text>
          </View>
        ))}
      </View>

      {/* Acknowledgments */}
      <Text style={styles.subsectionTitle}>{t.acknowledgments}</Text>
      <View style={styles.infoBox}>
        <Text style={{ fontSize: 10, color: colors.gray[600], lineHeight: 1.5 }}>
          {review.acknowledgments || t.acknowledgmentText}
        </Text>
      </View>

      {/* Closing Statement */}
      <View style={{ marginTop: 20 }}>
        <Text
          style={{
            fontSize: 10,
            color: colors.gray[700],
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {locale === "fr"
            ? "L'équipe d'examen reste disponible pour fournir des conseils supplémentaires et un soutien pendant la phase de mise en œuvre des actions correctives."
            : "The review team remains available to provide additional guidance and support during the corrective action implementation phase."}
        </Text>
      </View>

      {/* Signature Block */}
      <View style={{ marginTop: 40 }}>
        <View style={styles.divider} />
        <View style={{ flexDirection: "row", marginTop: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t.leadReviewer}</Text>
            <Text style={{ ...styles.value, fontSize: 12, marginTop: 5 }}>
              {review.leadReviewer.firstName} {review.leadReviewer.lastName}
            </Text>
            <Text style={{ fontSize: 9, color: colors.gray[500], marginTop: 2 }}>
              {review.leadReviewer.organization}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={styles.label}>{t.reportDate}</Text>
            <Text style={{ ...styles.value, fontSize: 12, marginTop: 5 }}>
              {new Date(review.reportDate).toLocaleDateString(
                locale === "fr" ? "fr-FR" : "en-GB",
                { day: "numeric", month: "long", year: "numeric" }
              )}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
