/**
 * ANS Protocol Questions Parser
 *
 * Extracts 128+ ANS (Air Navigation Services) Protocol Questions from
 * the ICAO USOAP CMA 2024 document (IP03-USOAP-Update.md)
 */

import * as fs from "fs";
import * as path from "path";

interface ParsedQuestion {
  pqNumber: string;
  questionTextEn: string;
  questionTextFr: string;
  guidanceEn: string;
  guidanceFr: string;
  icaoReferences: string;
  isPriorityPQ: boolean;
  criticalElement: string;
  requiresOnSite: boolean;
  auditArea: "ANS";
}

// Valid PQ number pattern (7.XXX where XXX is 3 digits)
const PQ_PATTERN = /^7\.\d{3}$/;

// Critical Element pattern
const CE_PATTERN = /^CE-[1-8]$/;

// Lines to skip (headers, footers, etc.)
const SKIP_PATTERNS = [
  /^PQ No\.?$/,
  /^Protocol Question$/,
  /^Guidance for Review of Evidence$/,
  /^ICAO References$/,
  /^PPQ$/,
  /^CE$/,
  /^Page \d+ of \d+$/,
  /^QMSF-007/,
  /^USOAP CMA 2024 Protocol Questions/,
  /^—\s*—/,
  /^\s*$/,
];

// ICAO Reference patterns
const REFERENCE_PATTERNS = [
  /^CC$/,           // Chicago Convention
  /^STD$/,          // Standard
  /^GM$/,           // Guidance Material
  /^RP$/,           // Recommended Practice
  /^PANS$/,         // Procedures for Air Navigation Services
  /^Doc\s*\d+/,     // Doc 9734, Doc 10066, etc.
  /^A\d+$/,         // A2, A11, A19, etc. (Annexes)
  /^Art\./,         // Article
  /^Att\./,         // Attachment
  /^App\./,         // Appendix
  /^\d+\.\d+/,      // Section numbers like 3.2.2, 2.1.1
  /^Part\s+[A-Z]/,  // Part A, Part B
  /^Foreword/,
  /^Chapter/,
];

function shouldSkipLine(line: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(line));
}

function isReference(line: string): boolean {
  return REFERENCE_PATTERNS.some(pattern => pattern.test(line));
}

function isGuidanceStart(line: string): boolean {
  return (
    /^1\)/.test(line) ||
    /^2\)/.test(line) ||
    /^3\)/.test(line) ||
    /^Verify/.test(line) ||
    /^Review/.test(line) ||
    /^Confirm/.test(line) ||
    /^Note to/.test(line) ||
    /^Notes to/.test(line) ||
    /^Check/.test(line) ||
    /^Assess/.test(line) ||
    /^Determine/.test(line)
  );
}

function parseANSQuestions(): ParsedQuestion[] {
  const filePath = path.join(process.cwd(), "IP03-USOAP-Update.md");

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Read and clean the file content
  const rawContent = fs.readFileSync(filePath, "utf-8");
  // Remove control characters but keep printable chars and newlines
  const content = rawContent.replace(/[^\x20-\x7E\n\r]/g, '');
  const lines = content.split(/\r?\n/);

  console.log(`📄 Read ${lines.length} lines from ${filePath}`);

  const questions: ParsedQuestion[] = [];
  const seenPQs = new Set<string>();

  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentSection: "question" | "guidance" | "reference" = "question";
  let lastCE = "CE_1";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip headers, footers, empty lines
    if (shouldSkipLine(line)) {
      continue;
    }

    // Detect new PQ number
    if (PQ_PATTERN.test(line)) {
      // Save previous question if valid and not duplicate
      if (currentQuestion?.pqNumber && currentQuestion?.questionTextEn && !seenPQs.has(currentQuestion.pqNumber)) {
        seenPQs.add(currentQuestion.pqNumber);
        questions.push({
          pqNumber: currentQuestion.pqNumber,
          questionTextEn: currentQuestion.questionTextEn.trim(),
          questionTextFr: `[FR] ${currentQuestion.questionTextEn.trim()}`,
          guidanceEn: (currentQuestion.guidanceEn || "").trim(),
          guidanceFr: `[FR] ${(currentQuestion.guidanceEn || "").trim()}`,
          icaoReferences: (currentQuestion.icaoReferences || "").trim(),
          isPriorityPQ: currentQuestion.isPriorityPQ || false,
          criticalElement: currentQuestion.criticalElement || lastCE,
          requiresOnSite: false,
          auditArea: "ANS",
        });
        lastCE = currentQuestion.criticalElement || lastCE;
      }

      currentQuestion = {
        pqNumber: line,
        questionTextEn: "",
        guidanceEn: "",
        icaoReferences: "",
        isPriorityPQ: false,
        criticalElement: lastCE,
      };
      currentSection = "question";
      continue;
    }

    if (!currentQuestion) continue;

    // Detect CE assignment
    if (CE_PATTERN.test(line)) {
      currentQuestion.criticalElement = line.replace("-", "_");
      continue;
    }

    // Detect PPQ marker
    if (line === "Yes") {
      currentQuestion.isPriorityPQ = true;
      continue;
    }

    // Detect ICAO reference
    if (isReference(line)) {
      if (currentQuestion.icaoReferences) {
        currentQuestion.icaoReferences += " " + line;
      } else {
        currentQuestion.icaoReferences = line;
      }
      currentSection = "reference";
      continue;
    }

    // Detect guidance start
    if (isGuidanceStart(line)) {
      currentSection = "guidance";
    }

    // Collect text based on current section
    if (currentSection === "question") {
      if (currentQuestion.questionTextEn) {
        currentQuestion.questionTextEn += " " + line;
      } else {
        currentQuestion.questionTextEn = line;
      }
    } else if (currentSection === "guidance") {
      if (currentQuestion.guidanceEn) {
        currentQuestion.guidanceEn += " " + line;
      } else {
        currentQuestion.guidanceEn = line;
      }
    }
  }

  // Don't forget the last question
  if (currentQuestion?.pqNumber && currentQuestion?.questionTextEn && !seenPQs.has(currentQuestion.pqNumber)) {
    questions.push({
      pqNumber: currentQuestion.pqNumber,
      questionTextEn: currentQuestion.questionTextEn.trim(),
      questionTextFr: `[FR] ${currentQuestion.questionTextEn.trim()}`,
      guidanceEn: (currentQuestion.guidanceEn || "").trim(),
      guidanceFr: `[FR] ${(currentQuestion.guidanceEn || "").trim()}`,
      icaoReferences: (currentQuestion.icaoReferences || "").trim(),
      isPriorityPQ: currentQuestion.isPriorityPQ || false,
      criticalElement: currentQuestion.criticalElement || lastCE,
      requiresOnSite: false,
      auditArea: "ANS",
    });
  }

  // Sort by PQ number
  questions.sort((a, b) => {
    const numA = parseInt(a.pqNumber.replace("7.", ""));
    const numB = parseInt(b.pqNumber.replace("7.", ""));
    return numA - numB;
  });

  return questions;
}

export { parseANSQuestions };
export type { ParsedQuestion };

// Run standalone for testing
if (require.main === module) {
  try {
    console.log("🔍 Parsing ANS Protocol Questions...\n");

    const questions = parseANSQuestions();

    console.log(`\n✅ Parsed ${questions.length} ANS questions\n`);

    // Statistics
    const byCE: Record<string, number> = {};
    let ppqCount = 0;

    questions.forEach(q => {
      byCE[q.criticalElement] = (byCE[q.criticalElement] || 0) + 1;
      if (q.isPriorityPQ) ppqCount++;
    });

    console.log("📊 Questions by Critical Element:");
    Object.entries(byCE).sort().forEach(([ce, count]) => {
      console.log(`   ${ce}: ${count}`);
    });
    console.log(`\n📌 Priority PQs (PPQ): ${ppqCount}`);

    // Print first 5 for verification
    console.log("\n" + "=".repeat(60));
    console.log("First 5 questions:");
    console.log("=".repeat(60));
    questions.slice(0, 5).forEach((q, i) => {
      console.log(`\n${i + 1}. PQ ${q.pqNumber} (${q.criticalElement})${q.isPriorityPQ ? " [PPQ]" : ""}`);
      console.log(`   Q: ${q.questionTextEn.substring(0, 100)}${q.questionTextEn.length > 100 ? "..." : ""}`);
      console.log(`   Guidance: ${q.guidanceEn.substring(0, 80)}${q.guidanceEn.length > 80 ? "..." : ""}`);
      console.log(`   Refs: ${q.icaoReferences.substring(0, 60)}${q.icaoReferences.length > 60 ? "..." : ""}`);
    });

    // Print last 5 for verification
    console.log("\n" + "=".repeat(60));
    console.log("Last 5 questions:");
    console.log("=".repeat(60));
    questions.slice(-5).forEach((q, i) => {
      console.log(`\n${questions.length - 4 + i}. PQ ${q.pqNumber} (${q.criticalElement})${q.isPriorityPQ ? " [PPQ]" : ""}`);
      console.log(`   Q: ${q.questionTextEn.substring(0, 100)}${q.questionTextEn.length > 100 ? "..." : ""}`);
    });

    // Save to JSON for review
    const outputPath = path.join(process.cwd(), "scripts", "parsed-ans-questions.json");
    fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
    console.log(`\n📁 Saved to ${outputPath}`);

    console.log("\n✅ Parsing complete!");

  } catch (error) {
    console.error("❌ Parsing failed:", error);
    process.exit(1);
  }
}
