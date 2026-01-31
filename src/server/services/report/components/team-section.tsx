/**
 * Team Section Component
 *
 * Lists the review team members and their roles.
 */

import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles, labels, colors } from "../styles";
import type { ReportPageProps } from "../types";
import { getRoleLabel } from "../types";

// =============================================================================
// COMPONENT
// =============================================================================

export function TeamSection({ review, locale }: ReportPageProps) {
  const t = labels[locale];

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.reviewTeam}</Text>

      {/* Lead Reviewer */}
      <Text style={styles.subsectionTitle}>{t.leadReviewer}</Text>
      <View style={styles.box}>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>
              {locale === "fr" ? "Nom" : "Name"}
            </Text>
            <Text style={{ ...styles.value, fontWeight: "bold", fontSize: 12 }}>
              {review.leadReviewer.firstName} {review.leadReviewer.lastName}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t.organization}</Text>
            <Text style={styles.value}>{review.leadReviewer.organization}</Text>
          </View>
        </View>
        <View>
          <Text style={styles.label}>{t.expertise}</Text>
          <Text style={styles.value}>
            {review.leadReviewer.expertise.join(", ")}
          </Text>
        </View>
      </View>

      {/* Team Members */}
      <Text style={styles.subsectionTitle}>{t.teamMembers}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>
            {locale === "fr" ? "Nom" : "Name"}
          </Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>
            {t.organization}
          </Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>{t.role}</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>
            {t.expertise}
          </Text>
        </View>
        {review.teamMembers.map((member, index) => (
          <View
            key={member.id}
            style={{
              ...styles.tableRow,
              ...(index % 2 === 1 ? styles.tableCellAlt : {}),
            }}
          >
            <Text style={{ ...styles.tableCell, flex: 2 }}>
              {member.firstName} {member.lastName}
            </Text>
            <Text style={{ ...styles.tableCell, flex: 2 }}>
              {member.organization}
            </Text>
            <Text style={{ ...styles.tableCell, flex: 1 }}>
              {getRoleLabel(member.role, locale)}
            </Text>
            <Text style={{ ...styles.tableCell, flex: 2 }}>
              {member.expertise.join(", ")}
            </Text>
          </View>
        ))}
      </View>

      {/* Team Composition Summary */}
      <View style={{ ...styles.infoBox, marginTop: 15 }}>
        <Text style={{ fontSize: 9, color: colors.gray[600] }}>
          {locale === "fr"
            ? `L'équipe d'évaluation était composée de ${review.teamMembers.length + 1} membres représentant ${new Set([review.leadReviewer.organization, ...review.teamMembers.map((m) => m.organization)]).size} organisations différentes.`
            : `The review team was composed of ${review.teamMembers.length + 1} members representing ${new Set([review.leadReviewer.organization, ...review.teamMembers.map((m) => m.organization)]).size} different organizations.`}
        </Text>
      </View>
    </View>
  );
}
