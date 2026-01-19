/**
 * Report PDF Generation Utility
 *
 * Provides functions for generating PDF reports using browser print functionality.
 * This approach leverages print-optimized CSS for consistent PDF output.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PDFGenerationOptions {
  /** Title for the PDF document */
  title?: string;
  /** Whether to include background graphics */
  includeBackgrounds?: boolean;
  /** Delay in ms before triggering print (for rendering) */
  renderDelay?: number;
}

// =============================================================================
// PRINT STYLES INJECTION
// =============================================================================

/**
 * Injects print-specific styles into the document
 */
export function injectPrintStyles(): void {
  // Check if styles already injected
  if (document.getElementById("report-print-styles")) {
    return;
  }

  const styleElement = document.createElement("style");
  styleElement.id = "report-print-styles";
  styleElement.textContent = `
    @media print {
      /* Hide everything except print content */
      body > *:not(.print-container) {
        display: none !important;
      }

      .print-container {
        display: block !important;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
      }

      /* Ensure colors print correctly */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
  document.head.appendChild(styleElement);
}

/**
 * Removes injected print styles
 */
export function removePrintStyles(): void {
  const styleElement = document.getElementById("report-print-styles");
  if (styleElement) {
    styleElement.remove();
  }
}

// =============================================================================
// PDF GENERATION
// =============================================================================

/**
 * Triggers the browser print dialog for PDF generation
 *
 * @param options - PDF generation options
 * @returns Promise that resolves when print dialog is closed
 */
export async function generatePDF(
  options: PDFGenerationOptions = {}
): Promise<void> {
  const { title, renderDelay = 100 } = options;

  // Store original title
  const originalTitle = document.title;

  // Set document title (used as PDF filename in some browsers)
  if (title) {
    document.title = title;
  }

  // Inject print styles
  injectPrintStyles();

  // Wait for render
  await new Promise((resolve) => setTimeout(resolve, renderDelay));

  // Create a promise that resolves when print completes
  return new Promise((resolve) => {
    // Add event listener for when printing ends
    const handleAfterPrint = () => {
      // Restore original title
      document.title = originalTitle;

      // Cleanup
      window.removeEventListener("afterprint", handleAfterPrint);

      resolve();
    };

    window.addEventListener("afterprint", handleAfterPrint);

    // Trigger print
    window.print();

    // Fallback for browsers that don't fire afterprint
    setTimeout(() => {
      document.title = originalTitle;
      resolve();
    }, 1000);
  });
}

// =============================================================================
// PRINT PREVIEW
// =============================================================================

/**
 * Opens a print preview in a new window
 * Useful for debugging print styles
 *
 * @param content - HTML content to preview
 * @param title - Document title
 */
export function openPrintPreview(content: string, title: string): Window | null {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    console.error("Could not open print preview window");
    return null;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <link rel="stylesheet" href="/styles/report-print.css" />
        <style>
          @media screen {
            body {
              background: #f5f5f5;
              padding: 20px;
            }
            .page {
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              margin: 0 auto 20px;
              max-width: 210mm;
              min-height: 297mm;
              padding: 20mm;
            }
          }
          @media print {
            body { margin: 0; padding: 0; background: white; }
            .page { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);

  printWindow.document.close();

  return printWindow;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if the browser supports printing
 */
export function isPrintSupported(): boolean {
  return typeof window !== "undefined" && typeof window.print === "function";
}

/**
 * Formats a filename for the PDF
 *
 * @param baseName - Base name for the file
 * @param referenceNumber - Optional reference number to include
 * @param locale - Locale for date formatting
 */
export function formatPDFFilename(
  baseName: string,
  referenceNumber?: string
): string {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  const parts = [baseName];

  if (referenceNumber) {
    // Sanitize reference number for filename
    parts.push(referenceNumber.replace(/[^a-zA-Z0-9-]/g, "_"));
  }

  parts.push(dateStr);

  return `${parts.join("_")}.pdf`;
}

/**
 * Converts an element to a data URL image (for charts)
 * Useful for including chart snapshots in PDFs
 *
 * @param element - DOM element to capture
 */
export async function elementToDataURL(): Promise<string | null> {
  // This would require html2canvas library
  // For now, return null - charts will be rendered as tables in print view
  console.warn("Chart image capture not implemented. Using table fallback.");
  return null;
}

// =============================================================================
// EXPORT ALL
// =============================================================================

const pdfUtils = {
  generatePDF,
  openPrintPreview,
  isPrintSupported,
  formatPDFFilename,
  injectPrintStyles,
  removePrintStyles,
};

export default pdfUtils;
