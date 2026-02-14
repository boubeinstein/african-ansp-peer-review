/**
 * Findings Section Components
 *
 * Summary table and detailed finding cards for the report.
 */

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { styles, labels, colors } from "../styles";
import type { ReportPageProps, FindingInfo } from "../types";
import { getSeverityLabel } from "../types";

// =============================================================================
// LOCAL STYLES
// =============================================================================

const findingStyles = StyleSheet.create({
  severityBar: {
    width: 4,
    marginRight: 10,
    borderRadius: 2,
  },
  findingCard: {
    marginBottom: 15,
    padding: 0,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 4,
    overflow: "hidden",
  },
  findingHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  findingHeaderContent: {
    flex: 1,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  findingBody: {
    padding: 12,
  },
  findingField: {
    marginBottom: 10,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
});

// =============================================================================
// SEVERITY COLORS
// =============================================================================

function getSeverityColor(severity: string): string {
  const colorMap: Record<string, string> = {
    CRITICAL: colors.critical,
    MAJOR: colors.major,
    MINOR: colors.minor,
    OBSERVATION: colors.observation,
  };
  return colorMap[severity] || colors.gray[500];
}

// =============================================================================
// FINDINGS SUMMARY COMPONENT
// =============================================================================

export function FindingsSummary({ review, locale }: ReportPageProps) {
  const t = labels[locale];
  const { findingsSummary, findings } = review;

  // Group findings by severity for the table
  const severityOrder = ["CRITICAL", "MAJOR", "MINOR", "OBSERVATION"];
  const areasList = Object.keys(findingsSummary.byArea);

  // Create a matrix of findings by area and severity
  const findingMatrix: Record<string, Record<string, number>> = {};
  findings.forEach((f) => {
    if (!findingMatrix[f.reviewArea]) {
      findingMatrix[f.reviewArea] = { CRITICAL: 0, MAJOR: 0, MINOR: 0, OBSERVATION: 0 };
    }
    if (f.type !== "GOOD_PRACTICE") {
      findingMatrix[f.reviewArea][f.severity]++;
    }
  });

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.findingsSummary}</Text>

      {/* Summary Statistics */}
      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        <View style={{ ...styles.statBox, backgroundColor: colors.gray[100] }}>
          <Text style={{ ...styles.statValue, fontSize: 28 }}>
            {findingsSummary.total}
          </Text>
          <Text style={styles.statLabel}>
            {locale === "fr" ? "Total Constatations" : "Total Findings"}
          </Text>
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
          <Text style={{ ...styles.statValue, color: colors.observation }}>
            {findingsSummary.bySeverity.observation}
          </Text>
          <Text style={styles.statLabel}>{t.observations}</Text>
        </View>
      </View>

      {/* Findings by Area and Severity Table */}
      <Text style={styles.subsectionTitle}>
        {locale === "fr" ? "Répartition par domaine et gravité" : "Distribution by Area and Severity"}
      </Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 3 }}>
            {locale === "fr" ? "Domaine d'examen" : "Review Area"}
          </Text>
          {severityOrder.map((sev) => (
            <Text
              key={sev}
              style={{
                ...styles.tableHeaderCell,
                flex: 1,
                textAlign: "center",
                backgroundColor: getSeverityColor(sev),
              }}
            >
              {getSeverityLabel(sev, locale).charAt(0)}
            </Text>
          ))}
          <Text
            style={{
              ...styles.tableHeaderCell,
              flex: 1,
              textAlign: "center",
            }}
          >
            {t.total}
          </Text>
        </View>
        {areasList.map((area, index) => {
          const areaFindings = findingMatrix[area] || {
            CRITICAL: 0,
            MAJOR: 0,
            MINOR: 0,
            OBSERVATION: 0,
          };
          const areaTotal = Object.values(areaFindings).reduce((a, b) => a + b, 0);

          return (
            <View
              key={area}
              style={{
                ...styles.tableRow,
                ...(index % 2 === 1 ? styles.tableCellAlt : {}),
              }}
            >
              <Text style={{ ...styles.tableCell, flex: 3 }}>{area}</Text>
              {severityOrder.map((sev) => (
                <Text
                  key={sev}
                  style={{
                    ...styles.tableCell,
                    flex: 1,
                    textAlign: "center",
                    color: areaFindings[sev] > 0 ? getSeverityColor(sev) : colors.gray[400],
                    fontWeight: areaFindings[sev] > 0 ? "bold" : "normal",
                  }}
                >
                  {areaFindings[sev] || "-"}
                </Text>
              ))}
              <Text
                style={{
                  ...styles.tableCell,
                  flex: 1,
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                {areaTotal}
              </Text>
            </View>
          );
        })}
        {/* Totals row */}
        <View style={{ ...styles.tableRow, backgroundColor: colors.gray[100] }}>
          <Text style={{ ...styles.tableCell, flex: 3, fontWeight: "bold" }}>
            {t.total}
          </Text>
          {severityOrder.map((sev) => (
            <Text
              key={sev}
              style={{
                ...styles.tableCell,
                flex: 1,
                textAlign: "center",
                fontWeight: "bold",
                color: getSeverityColor(sev),
              }}
            >
              {findingsSummary.bySeverity[sev.toLowerCase() as keyof typeof findingsSummary.bySeverity]}
            </Text>
          ))}
          <Text
            style={{
              ...styles.tableCell,
              flex: 1,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {findingsSummary.total}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", marginTop: 10, justifyContent: "center" }}>
        {severityOrder.map((sev) => (
          <View key={sev} style={{ flexDirection: "row", alignItems: "center", marginRight: 15 }}>
            <View
              style={{
                width: 12,
                height: 12,
                backgroundColor: getSeverityColor(sev),
                borderRadius: 2,
                marginRight: 4,
              }}
            />
            <Text style={{ fontSize: 8, color: colors.gray[600] }}>
              {getSeverityLabel(sev, locale)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// =============================================================================
// DETAILED FINDINGS COMPONENT
// =============================================================================

interface FindingCardProps {
  finding: FindingInfo;
  locale: "en" | "fr";
}

function FindingCard({ finding, locale }: FindingCardProps) {
  const t = labels[locale];
  const severityColor = getSeverityColor(finding.severity);

  return (
    <View style={findingStyles.findingCard} wrap={false}>
      {/* Header */}
      <View style={findingStyles.findingHeader}>
        <View style={{ ...findingStyles.severityBar, backgroundColor: severityColor }} />
        <View style={findingStyles.findingHeaderContent}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primary }}>
              {finding.reference}
            </Text>
            <Text style={{ fontSize: 10, color: colors.gray[700], marginTop: 2 }}>
              {finding.title}
            </Text>
          </View>
          <View
            style={{
              ...findingStyles.badge,
              backgroundColor: severityColor,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.white }}>
              {getSeverityLabel(finding.severity, locale)}
            </Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={findingStyles.findingBody}>
        {/* Review Area and ICAO Reference */}
        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>
              {locale === "fr" ? "Domaine d'examen" : "Review Area"}
            </Text>
            <Text style={styles.value}>{finding.reviewArea}</Text>
          </View>
          {finding.icaoReference && (
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t.icaoReference}</Text>
              <Text style={styles.value}>{finding.icaoReference}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={findingStyles.findingField}>
          <Text style={styles.label}>{t.description}</Text>
          <Text style={{ ...styles.paragraph, marginBottom: 0 }}>
            {finding.description}
          </Text>
        </View>

        {/* Evidence */}
        <View style={findingStyles.findingField}>
          <Text style={styles.label}>{t.evidence}</Text>
          <View style={{ ...styles.infoBox, marginVertical: 0 }}>
            <Text style={{ fontSize: 9, color: colors.gray[600] }}>
              {finding.evidence}
            </Text>
          </View>
        </View>

        {/* Root Cause (if available) */}
        {finding.rootCause && (
          <View style={findingStyles.findingField}>
            <Text style={styles.label}>{t.rootCause}</Text>
            <Text style={{ fontSize: 9, color: colors.gray[700] }}>
              {finding.rootCause}
            </Text>
          </View>
        )}

        {/* Recommendation (if available) */}
        {finding.recommendation && (
          <View style={findingStyles.findingField}>
            <Text style={styles.label}>{t.recommendation}</Text>
            <Text style={{ fontSize: 9, color: colors.gray[700] }}>
              {finding.recommendation}
            </Text>
          </View>
        )}

        {/* CAP Required */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
          <Text style={{ ...styles.label, marginBottom: 0, marginRight: 5 }}>
            {t.capRequired}:
          </Text>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "bold",
              color: finding.capRequired ? colors.warning : colors.gray[500],
            }}
          >
            {finding.capRequired ? t.yes : t.no}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function DetailedFindings({ review, locale }: ReportPageProps) {
  const t = labels[locale];

  // Filter out good practices and sort by severity
  const nonGoodPracticeFindings = review.findings.filter(
    (f) => f.type !== "GOOD_PRACTICE"
  );

  const severityOrder = { CRITICAL: 0, MAJOR: 1, MINOR: 2, OBSERVATION: 3 };
  const sortedFindings = [...nonGoodPracticeFindings].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  // Group by severity
  const groupedFindings = {
    CRITICAL: sortedFindings.filter((f) => f.severity === "CRITICAL"),
    MAJOR: sortedFindings.filter((f) => f.severity === "MAJOR"),
    MINOR: sortedFindings.filter((f) => f.severity === "MINOR"),
    OBSERVATION: sortedFindings.filter((f) => f.severity === "OBSERVATION"),
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.detailedFindings}</Text>

      {/* Critical Findings */}
      {groupedFindings.CRITICAL.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>
            {t.critical} ({groupedFindings.CRITICAL.length})
          </Text>
          {groupedFindings.CRITICAL.map((finding) => (
            <FindingCard key={finding.id} finding={finding} locale={locale} />
          ))}
        </>
      )}

      {/* Major Findings */}
      {groupedFindings.MAJOR.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>
            {t.major} ({groupedFindings.MAJOR.length})
          </Text>
          {groupedFindings.MAJOR.map((finding) => (
            <FindingCard key={finding.id} finding={finding} locale={locale} />
          ))}
        </>
      )}

      {/* Minor Findings */}
      {groupedFindings.MINOR.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>
            {t.minor} ({groupedFindings.MINOR.length})
          </Text>
          {groupedFindings.MINOR.map((finding) => (
            <FindingCard key={finding.id} finding={finding} locale={locale} />
          ))}
        </>
      )}

      {/* Observations */}
      {groupedFindings.OBSERVATION.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>
            {t.observations} ({groupedFindings.OBSERVATION.length})
          </Text>
          {groupedFindings.OBSERVATION.map((finding) => (
            <FindingCard key={finding.id} finding={finding} locale={locale} />
          ))}
        </>
      )}
    </View>
  );
}
