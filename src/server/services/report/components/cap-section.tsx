/**
 * CAP Section Component
 *
 * Displays the Corrective Action Plans status and timeline.
 */

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { styles, labels, colors } from "../styles";
import type { ReportPageProps } from "../types";
import { getStatusLabel } from "../types";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

// =============================================================================
// LOCAL STYLES
// =============================================================================

const capStyles = StyleSheet.create({
  progressBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: "bold",
  },
});

// =============================================================================
// STATUS COLORS
// =============================================================================

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING: colors.gray[400],
    IN_PROGRESS: colors.info,
    SUBMITTED: colors.primary,
    ACCEPTED: colors.success,
    VERIFIED: colors.goodPractice,
    OVERDUE: colors.danger,
  };
  return colorMap[status] || colors.gray[400];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CAPSection({ review, locale }: ReportPageProps) {
  const t = labels[locale];
  const { caps, capSummary } = review;
  const dateLocale = locale === "fr" ? fr : enUS;

  if (caps.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>{t.correctiveActionPlans}</Text>
        <View style={styles.infoBox}>
          <Text style={{ fontSize: 10, color: colors.gray[600] }}>
            {locale === "fr"
              ? "Aucun Plan d'Action Corrective n'est requis suite à cet examen."
              : "No Corrective Action Plans are required following this review."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.correctiveActionPlans}</Text>

      {/* CAP Status Summary */}
      <Text style={styles.subsectionTitle}>{t.capStatusSummary}</Text>
      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        <View style={{ ...styles.statBox, backgroundColor: colors.gray[100] }}>
          <Text style={{ ...styles.statValue, fontSize: 24 }}>
            {capSummary.total}
          </Text>
          <Text style={styles.statLabel}>{t.total}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ ...styles.statValue, fontSize: 20, color: colors.gray[400] }}>
            {capSummary.byStatus.pending}
          </Text>
          <Text style={styles.statLabel}>{t.pending}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ ...styles.statValue, fontSize: 20, color: colors.info }}>
            {capSummary.byStatus.inProgress}
          </Text>
          <Text style={styles.statLabel}>{t.inProgress}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ ...styles.statValue, fontSize: 20, color: colors.primary }}>
            {capSummary.byStatus.submitted}
          </Text>
          <Text style={styles.statLabel}>{t.submitted}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ ...styles.statValue, fontSize: 20, color: colors.success }}>
            {capSummary.byStatus.verified}
          </Text>
          <Text style={styles.statLabel}>{t.verified}</Text>
        </View>
        {capSummary.byStatus.overdue > 0 && (
          <View style={styles.statBox}>
            <Text style={{ ...styles.statValue, fontSize: 20, color: colors.danger }}>
              {capSummary.byStatus.overdue}
            </Text>
            <Text style={styles.statLabel}>{t.overdue}</Text>
          </View>
        )}
      </View>

      {/* Average Progress */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
          <Text style={{ fontSize: 9, color: colors.gray[600] }}>
            {locale === "fr" ? "Progression moyenne" : "Average Progress"}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>
            {Math.round(capSummary.averageProgress)}%
          </Text>
        </View>
        <View style={capStyles.progressBar}>
          <View
            style={{
              ...capStyles.progressFill,
              width: `${capSummary.averageProgress}%`,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>

      {/* CAP Details Table */}
      <Text style={styles.subsectionTitle}>{t.completionTimeline}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>{t.capReference}</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>{t.finding}</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1, textAlign: "center" }}>
            {t.status}
          </Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1, textAlign: "center" }}>
            {t.dueDate}
          </Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1, textAlign: "center" }}>
            {t.progress}
          </Text>
        </View>
        {caps.map((cap, index) => {
          const isOverdue = cap.status === "OVERDUE";
          const statusColor = getStatusColor(cap.status);

          return (
            <View
              key={cap.id}
              style={{
                ...styles.tableRow,
                ...(index % 2 === 1 ? styles.tableCellAlt : {}),
                ...(isOverdue ? { backgroundColor: "#fef2f2" } : {}),
              }}
            >
              <Text style={{ ...styles.tableCell, flex: 1, fontWeight: "bold" }}>
                {cap.reference}
              </Text>
              <Text style={{ ...styles.tableCell, flex: 2 }}>
                {cap.findingReference}: {cap.findingTitle}
              </Text>
              <View style={{ ...styles.tableCell, flex: 1, alignItems: "center" }}>
                <View
                  style={{
                    ...capStyles.statusBadge,
                    backgroundColor: statusColor,
                  }}
                >
                  <Text style={{ color: colors.white }}>
                    {getStatusLabel(cap.status, locale)}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  ...styles.tableCell,
                  flex: 1,
                  textAlign: "center",
                  color: isOverdue ? colors.danger : colors.gray[700],
                }}
              >
                {format(cap.dueDate, "d MMM yyyy", { locale: dateLocale })}
              </Text>
              <View style={{ ...styles.tableCell, flex: 1 }}>
                <View style={{ ...capStyles.progressBar, height: 6 }}>
                  <View
                    style={{
                      ...capStyles.progressFill,
                      width: `${cap.progress}%`,
                      backgroundColor:
                        cap.progress === 100
                          ? colors.success
                          : cap.progress >= 50
                            ? colors.info
                            : colors.warning,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 7,
                    textAlign: "center",
                    marginTop: 2,
                    color: colors.gray[500],
                  }}
                >
                  {cap.progress}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Overdue Warning */}
      {capSummary.byStatus.overdue > 0 && (
        <View style={styles.dangerBox}>
          <Text style={{ fontSize: 9, color: colors.danger, fontWeight: "bold" }}>
            {locale === "fr"
              ? `${capSummary.byStatus.overdue} PAC est/sont en retard et nécessite(nt) une attention immédiate.`
              : `${capSummary.byStatus.overdue} CAP(s) is/are overdue and require(s) immediate attention.`}
          </Text>
        </View>
      )}

      {/* Note */}
      <View style={styles.infoBox}>
        <Text style={{ fontSize: 8, color: colors.gray[500] }}>
          {locale === "fr"
            ? "Les dates d'échéance des PAC sont calculées à partir de la date de publication du rapport et des exigences de gravité des constatations."
            : "CAP due dates are calculated from the report publication date and finding severity requirements."}
        </Text>
      </View>
    </View>
  );
}
