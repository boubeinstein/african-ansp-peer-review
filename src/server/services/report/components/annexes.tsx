/**
 * Annexes Section Components
 *
 * Interview list, document list, and acronyms.
 */

import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles, labels, colors } from "../styles";
import type { ReportPageProps } from "../types";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

// =============================================================================
// ANNEX A: INTERVIEW LIST
// =============================================================================

export function AnnexInterviews({ review, locale }: ReportPageProps) {
  const t = labels[locale];
  const dateLocale = locale === "fr" ? fr : enUS;

  if (review.interviewsConducted.length === 0) {
    return null;
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.annexA}</Text>

      <Text style={styles.paragraph}>
        {locale === "fr"
          ? `${review.interviewsConducted.length} entretiens ont été menés au cours de cet examen.`
          : `${review.interviewsConducted.length} interviews were conducted during this review.`}
      </Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>{t.interviewee}</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>{t.position}</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>{t.organization}</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>{t.date}</Text>
        </View>
        {review.interviewsConducted.map((interview, index) => (
          <View
            key={index}
            style={{
              ...styles.tableRow,
              ...(index % 2 === 1 ? styles.tableCellAlt : {}),
            }}
          >
            <Text style={{ ...styles.tableCell, flex: 2 }}>{interview.interviewee}</Text>
            <Text style={{ ...styles.tableCell, flex: 2 }}>{interview.position}</Text>
            <Text style={{ ...styles.tableCell, flex: 2 }}>{interview.organization}</Text>
            <Text style={{ ...styles.tableCell, flex: 1 }}>
              {format(interview.date, "d MMM", { locale: dateLocale })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// =============================================================================
// ANNEX B: DOCUMENT LIST
// =============================================================================

export function AnnexDocuments({ review, locale }: ReportPageProps) {
  const t = labels[locale];

  if (review.documentsExamined.length === 0) {
    return null;
  }

  // Group documents by type
  const docsByType: Record<string, typeof review.documentsExamined> = {};
  review.documentsExamined.forEach((doc) => {
    const type = doc.type || "Other";
    if (!docsByType[type]) {
      docsByType[type] = [];
    }
    docsByType[type].push(doc);
  });

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.annexB}</Text>

      <Text style={styles.paragraph}>
        {locale === "fr"
          ? `${review.documentsExamined.length} documents ont été examinés au cours de cet examen.`
          : `${review.documentsExamined.length} documents were examined during this review.`}
      </Text>

      {Object.entries(docsByType).map(([type, docs]) => (
        <View key={type}>
          <Text style={styles.subsectionTitle}>
            {type} ({docs.length})
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableHeaderCell, flex: 3 }}>
                {t.documentTitle}
              </Text>
              <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>
                {t.documentReference}
              </Text>
            </View>
            {docs.map((doc, index) => (
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
          </View>
        </View>
      ))}
    </View>
  );
}

// =============================================================================
// ANNEX C: ACRONYMS
// =============================================================================

export function AnnexAcronyms({ review, locale }: ReportPageProps) {
  const t = labels[locale];

  // Default aviation acronyms
  const defaultAcronyms = [
    { acronym: "AAPRP", meaning: locale === "fr" ? "Programme Africain d'Examen par les Pairs des ANSP" : "African ANSP Peer Review Programme" },
    { acronym: "AFCAC", meaning: locale === "fr" ? "Commission Africaine de l'Aviation Civile" : "African Civil Aviation Commission" },
    { acronym: "ANS", meaning: locale === "fr" ? "Services de Navigation Aérienne" : "Air Navigation Services" },
    { acronym: "ANSP", meaning: locale === "fr" ? "Fournisseur de Services de Navigation Aérienne" : "Air Navigation Service Provider" },
    { acronym: "ATC", meaning: locale === "fr" ? "Contrôle de la Circulation Aérienne" : "Air Traffic Control" },
    { acronym: "ATM", meaning: locale === "fr" ? "Gestion du Trafic Aérien" : "Air Traffic Management" },
    { acronym: "CAA", meaning: locale === "fr" ? "Autorité de l'Aviation Civile" : "Civil Aviation Authority" },
    { acronym: "CANSO", meaning: locale === "fr" ? "Organisation des Services de Navigation Aérienne Civile" : "Civil Air Navigation Services Organisation" },
    { acronym: "CAP", meaning: locale === "fr" ? "Plan d'Action Corrective" : "Corrective Action Plan" },
    { acronym: "ICAO", meaning: locale === "fr" ? "Organisation de l'Aviation Civile Internationale" : "International Civil Aviation Organization" },
    { acronym: "MET", meaning: locale === "fr" ? "Météorologie" : "Meteorology" },
    { acronym: "NOTAM", meaning: locale === "fr" ? "Notice aux Aviateurs" : "Notice to Airmen" },
    { acronym: "QMS", meaning: locale === "fr" ? "Système de Management de la Qualité" : "Quality Management System" },
    { acronym: "SAR", meaning: locale === "fr" ? "Recherche et Sauvetage" : "Search and Rescue" },
    { acronym: "SARPs", meaning: locale === "fr" ? "Normes et Pratiques Recommandées" : "Standards and Recommended Practices" },
    { acronym: "SMS", meaning: locale === "fr" ? "Système de Gestion de la Sécurité" : "Safety Management System" },
  ];

  // Combine with review-specific acronyms
  const allAcronyms = [...defaultAcronyms, ...review.acronyms]
    .sort((a, b) => a.acronym.localeCompare(b.acronym))
    // Remove duplicates
    .filter((item, index, self) =>
      index === self.findIndex((t) => t.acronym === item.acronym)
    );

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.annexC}</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>{t.acronym}</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 4 }}>{t.meaning}</Text>
        </View>
        {allAcronyms.map((item, index) => (
          <View
            key={item.acronym}
            style={{
              ...styles.tableRow,
              ...(index % 2 === 1 ? styles.tableCellAlt : {}),
            }}
          >
            <Text style={{ ...styles.tableCell, flex: 1, fontWeight: "bold" }}>
              {item.acronym}
            </Text>
            <Text style={{ ...styles.tableCell, flex: 4 }}>{item.meaning}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// =============================================================================
// COMBINED ANNEXES
// =============================================================================

export function AnnexesSection({ locale }: ReportPageProps) {
  const t = labels[locale];

  return (
    <View>
      <Text style={styles.sectionTitle}>{t.annexes}</Text>

      <View style={styles.box}>
        <Text style={{ fontSize: 10, color: colors.gray[700], marginBottom: 10 }}>
          {locale === "fr" ? "Ce rapport comprend les annexes suivantes :" : "This report includes the following annexes:"}
        </Text>
        <View style={styles.listItem}>
          <Text style={styles.listBullet}>A.</Text>
          <Text style={styles.listContent}>
            {locale === "fr" ? "Liste des entretiens" : "Interview List"}
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.listBullet}>B.</Text>
          <Text style={styles.listContent}>
            {locale === "fr" ? "Liste des documents" : "Document List"}
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.listBullet}>C.</Text>
          <Text style={styles.listContent}>
            {locale === "fr" ? "Acronymes" : "Acronyms"}
          </Text>
        </View>
      </View>
    </View>
  );
}
