/**
 * Reviewer Export Utility
 *
 * Enterprise-grade export functionality for reviewer data.
 * Supports Excel, CSV, and PDF formats.
 */

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewerExportData {
  id: string;
  name: string;
  email?: string;
  organization: string;
  organizationCode?: string;
  country: string;
  position: string;
  expertise: string[];
  languages: string[];
  reviewerType: string;
  selectionStatus: string;
  reviewsCompleted: number;
  yearsExperience: number;
  isLeadQualified: boolean;
  isAvailable: boolean;
}

export type ExportFormat = "xlsx" | "csv" | "pdf";

export interface ExportOptions {
  includeContactInfo?: boolean;
  filename?: string;
  title?: string;
}

// =============================================================================
// TRANSFORM FUNCTIONS
// =============================================================================

/**
 * Transform reviewer data for export
 */
export function transformReviewerForExport(reviewer: {
  id: string;
  fullName?: string;
  email?: string;
  homeOrganization?: {
    nameEn: string;
    nameFr: string;
    organizationCode?: string | null;
    country: string;
  };
  currentPosition?: string;
  primaryExpertise?: string[];
  languages?: string[];
  reviewerType?: string;
  selectionStatus?: string;
  reviewsCompleted?: number;
  yearsExperience?: number;
  isLeadQualified?: boolean;
  isAvailable?: boolean;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  expertiseRecords?: { area: string }[];
}): ReviewerExportData {
  // Handle both list item format and API format
  const name = reviewer.fullName ||
    (reviewer.user
      ? `${reviewer.user.firstName} ${reviewer.user.lastName}`
      : "N/A");

  const email = reviewer.email || reviewer.user?.email;

  const expertise = reviewer.primaryExpertise ||
    reviewer.expertiseRecords?.map((e) => e.area) ||
    [];

  return {
    id: reviewer.id,
    name,
    email,
    organization: reviewer.homeOrganization?.nameEn || "N/A",
    organizationCode: reviewer.homeOrganization?.organizationCode || undefined,
    country: reviewer.homeOrganization?.country || "N/A",
    position: reviewer.currentPosition || "N/A",
    expertise,
    languages: reviewer.languages || [],
    reviewerType: reviewer.reviewerType || "N/A",
    selectionStatus: reviewer.selectionStatus || "N/A",
    reviewsCompleted: reviewer.reviewsCompleted || 0,
    yearsExperience: reviewer.yearsExperience || 0,
    isLeadQualified: reviewer.isLeadQualified || false,
    isAvailable: reviewer.isAvailable || false,
  };
}

// =============================================================================
// EXCEL EXPORT
// =============================================================================

/**
 * Export reviewers to Excel format
 */
export function exportToExcel(
  reviewers: ReviewerExportData[],
  options: ExportOptions = {}
): void {
  const { includeContactInfo = false, filename = "reviewers" } = options;

  const rows = reviewers.map((r) => {
    const baseRow: Record<string, string | number> = {
      Name: r.name,
      Organization: r.organization,
      "ICAO Code": r.organizationCode || "",
      Country: r.country,
      Position: r.position,
      "Expertise Areas": r.expertise.join(", "),
      Languages: r.languages.join(", "),
      "Reviewer Type": r.reviewerType,
      "Selection Status": r.selectionStatus,
      "Reviews Completed": r.reviewsCompleted,
      "Years Experience": r.yearsExperience,
      "Lead Qualified": r.isLeadQualified ? "Yes" : "No",
      Available: r.isAvailable ? "Yes" : "No",
    };

    if (includeContactInfo && r.email) {
      return { Email: r.email, ...baseRow };
    }

    return baseRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const colWidths = includeContactInfo
    ? [
        { wch: 30 }, // Email
        { wch: 25 }, // Name
        { wch: 35 }, // Organization
        { wch: 10 }, // ICAO Code
        { wch: 15 }, // Country
        { wch: 25 }, // Position
        { wch: 35 }, // Expertise
        { wch: 15 }, // Languages
        { wch: 15 }, // Reviewer Type
        { wch: 15 }, // Selection Status
        { wch: 12 }, // Reviews
        { wch: 12 }, // Years
        { wch: 12 }, // Lead
        { wch: 10 }, // Available
      ]
    : [
        { wch: 25 }, // Name
        { wch: 35 }, // Organization
        { wch: 10 }, // ICAO Code
        { wch: 15 }, // Country
        { wch: 25 }, // Position
        { wch: 35 }, // Expertise
        { wch: 15 }, // Languages
        { wch: 15 }, // Reviewer Type
        { wch: 15 }, // Selection Status
        { wch: 12 }, // Reviews
        { wch: 12 }, // Years
        { wch: 12 }, // Lead
        { wch: 10 }, // Available
      ];

  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reviewers");

  // Add metadata sheet
  const metaSheet = XLSX.utils.json_to_sheet([
    { Field: "Export Date", Value: new Date().toISOString() },
    { Field: "Total Records", Value: reviewers.length },
    { Field: "Source", Value: "AFI Peer Review Programme" },
  ]);
  XLSX.utils.book_append_sheet(workbook, metaSheet, "Export Info");

  XLSX.writeFile(workbook, `${filename}_${formatDate(new Date())}.xlsx`);
}

// =============================================================================
// CSV EXPORT
// =============================================================================

/**
 * Export reviewers to CSV format
 */
export function exportToCSV(
  reviewers: ReviewerExportData[],
  options: ExportOptions = {}
): void {
  const { includeContactInfo = false, filename = "reviewers" } = options;

  const rows = reviewers.map((r) => {
    const baseRow: Record<string, string | number> = {
      Name: r.name,
      Organization: r.organization,
      "ICAO Code": r.organizationCode || "",
      Country: r.country,
      Position: r.position,
      "Expertise Areas": r.expertise.join("; "),
      Languages: r.languages.join("; "),
      "Reviewer Type": r.reviewerType,
      "Selection Status": r.selectionStatus,
      "Reviews Completed": r.reviewsCompleted,
      "Years Experience": r.yearsExperience,
      "Lead Qualified": r.isLeadQualified ? "Yes" : "No",
      Available: r.isAvailable ? "Yes" : "No",
    };

    if (includeContactInfo && r.email) {
      return { Email: r.email, ...baseRow };
    }

    return baseRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Add UTF-8 BOM for Excel compatibility with French characters
  const BOM = "\uFEFF";
  downloadFile(BOM + csv, `${filename}_${formatDate(new Date())}.csv`, "text/csv;charset=utf-8;");
}

// =============================================================================
// PDF EXPORT
// =============================================================================

/**
 * Export reviewers to PDF format
 */
export function exportToPDF(
  reviewers: ReviewerExportData[],
  options: ExportOptions = {}
): void {
  const {
    filename = "reviewers",
    title = "AFI Peer Review Programme - Reviewer Directory",
  } = options;

  const doc = new jsPDF({ orientation: "landscape" });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 20);

  // Subtitle with date and count
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} | ${reviewers.length} reviewers`,
    14,
    28
  );

  // Table data
  const tableData = reviewers.map((r) => [
    r.name,
    r.organization,
    r.country,
    r.position.length > 20 ? r.position.substring(0, 20) + "..." : r.position,
    r.expertise.slice(0, 3).join(", "),
    r.languages.join(", "),
    r.selectionStatus,
    String(r.reviewsCompleted),
    r.isLeadQualified ? "Yes" : "-",
  ]);

  // Generate table
  autoTable(doc, {
    startY: 35,
    head: [
      [
        "Name",
        "Organization",
        "Country",
        "Position",
        "Expertise",
        "Languages",
        "Status",
        "Reviews",
        "Lead",
      ],
    ],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [0, 82, 147], // AFI blue
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Name
      1: { cellWidth: 45 }, // Organization
      2: { cellWidth: 25 }, // Country
      3: { cellWidth: 30 }, // Position
      4: { cellWidth: 40 }, // Expertise
      5: { cellWidth: 25 }, // Languages
      6: { cellWidth: 25 }, // Status
      7: { cellWidth: 18 }, // Reviews
      8: { cellWidth: 15 }, // Lead
    },
  });

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    // Page number
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );

    // Footer text
    doc.text(
      "AFI Peer Review Programme - Confidential",
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}_${formatDate(new Date())}.pdf`);
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

/**
 * Export reviewers to the specified format
 */
export async function exportReviewers(
  reviewers: unknown[],
  format: ExportFormat,
  options: ExportOptions = {}
): Promise<void> {
  const data = reviewers.map((r) =>
    transformReviewerForExport(r as Parameters<typeof transformReviewerForExport>[0])
  );

  switch (format) {
    case "xlsx":
      exportToExcel(data, options);
      break;
    case "csv":
      exportToCSV(data, options);
      break;
    case "pdf":
      exportToPDF(data, options);
      break;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Download a file in the browser
 */
function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
