/**
 * Scope & Methodology Section Component
 *
 * Details what was reviewed and how the review was conducted.
 */

import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles, labels, colors } from "../styles";
import type { ReportPageProps } from "../types";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

// =============================================================================
// COMPONENT
// =============================================================================

export function ScopeSection({ review, locale }: ReportPageProps) {
  const t = labels[locale];
  const dateLocale = locale === "fr" ? fr : enUS;

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.scopeMethodology}</Text>

      {/* Review Period */}
      <View style={styles.box}>
        <Text style={styles.label}>{t.reviewPeriod}</Text>
        <Text style={{ ...styles.value, fontSize: 12 }}>
          {format(review.startDate, "d MMMM yyyy", { locale: dateLocale })} -{" "}
          {format(review.endDate, "d MMMM yyyy", { locale: dateLocale })}
        </Text>
      </View>

      {/* Areas Reviewed */}
      <Text style={styles.subsectionTitle}>{t.areasReviewed}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 15 }}>
        {review.areasInScope.map((area, index) => (
          <View
            key={index}
            style={{
              backgroundColor: colors.gray[100],
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 3,
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 9, color: colors.gray[700] }}>{area}</Text>
          </View>
        ))}
      </View>

      {/* Documents Examined */}
      <Text style={styles.subsectionTitle}>{t.documentsExamined}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 3 }}>
            {t.documentTitle}
          </Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>
            {t.documentReference}
          </Text>
        </View>
        {review.documentsExamined.slice(0, 10).map((doc, index) => (
          <View
            key={index}
            style={{
              ...styles.tableRow,
              ...(index % 2 === 1 ? styles.tableCellAlt : {}),
            }}
          >
            <Text style={{ ...styles.tableCell, flex: 3 }}>{doc.title}</Text>
            <Text style={{ ...styles.tableCell, flex: 1 }}>{doc.reference}</Text>
          </View>
        ))}
        {review.documentsExamined.length > 10 && (
          <View style={styles.tableRow}>
            <Text
              style={{
                ...styles.tableCell,
                flex: 1,
                fontStyle: "italic",
                color: colors.gray[500],
              }}
            >
              {locale === "fr"
                ? `... et ${review.documentsExamined.length - 10} autres documents (voir Annexe B)`
                : `... and ${review.documentsExamined.length - 10} more documents (see Annex B)`}
            </Text>
          </View>
        )}
      </View>

      {/* Interviews Conducted */}
      <Text style={styles.subsectionTitle}>{t.interviewsConducted}</Text>
      <View style={styles.infoBox}>
        <Text style={{ fontSize: 10, color: colors.gray[700], marginBottom: 8 }}>
          {locale === "fr"
            ? `${review.interviewsConducted.length} entretiens ont été menés avec le personnel de l'organisation hôte, couvrant tous les domaines de l'examen.`
            : `${review.interviewsConducted.length} interviews were conducted with host organization personnel, covering all areas of the review.`}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {[
            ...new Set(review.interviewsConducted.map((i) => i.position)),
          ].map((position, index) => (
            <View
              key={index}
              style={{
                backgroundColor: colors.white,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 3,
                marginRight: 6,
                marginBottom: 6,
                borderWidth: 1,
                borderColor: colors.gray[200],
              }}
            >
              <Text style={{ fontSize: 8, color: colors.gray[600] }}>
                {position}
              </Text>
            </View>
          ))}
        </View>
        <Text
          style={{
            fontSize: 8,
            color: colors.gray[500],
            marginTop: 8,
            fontStyle: "italic",
          }}
        >
          {locale === "fr"
            ? "Voir l'Annexe A pour la liste complète des entretiens"
            : "See Annex A for the complete interview list"}
        </Text>
      </View>

      {/* Facilities Visited */}
      {review.facilitiesVisited.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>{t.facilitiesVisited}</Text>
          <View style={{ marginBottom: 15 }}>
            {review.facilitiesVisited.map((facility, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listContent}>{facility}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Methodology Note */}
      <View style={styles.box}>
        <Text style={{ fontSize: 9, color: colors.gray[600], lineHeight: 1.5 }}>
          {locale === "fr"
            ? "Cet examen a été mené conformément aux procédures du Programme Africain d'Examen par les Pairs des ANSP (AAPRP), alignées sur les normes et pratiques recommandées de l'OACI."
            : "This review was conducted in accordance with the African ANSP Peer Review Programme (AAPRP) procedures, aligned with ICAO Standards and Recommended Practices."}
        </Text>
      </View>
    </View>
  );
}
