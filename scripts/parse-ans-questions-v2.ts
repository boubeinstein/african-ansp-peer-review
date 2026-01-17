/**
 * ANS Protocol Questions Parser V2
 *
 * Enhanced parser that handles PDF conversion artifacts:
 * - Skips summary/index sections (consecutive PQ numbers)
 * - Looks ahead for question content
 * - Better handles merged questions
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

// Lines to skip
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
  /^New\s+Revised\s+Deleted/,
  /^No\s*change$/,
  /^Description of Amendments$/,
  /^\?+$/,
];

// Reference patterns
const REFERENCE_PATTERNS = [
  /^CC$/,
  /^STD$/,
  /^GM$/,
  /^RP$/,
  /^PANS$/,
  /^Doc\s*\d+/,
  /^A\d+$/,
  /^Art\./,
  /^Att\./,
  /^App\./,
  /^\d+\.\d+/,
  /^Part\s+[A-Z]/,
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
    /^Determine/.test(line) ||
    /^Sample/.test(line)
  );
}

function isQuestionStart(line: string): boolean {
  return (
    /^Has the State/.test(line) ||
    /^Does the State/.test(line) ||
    /^Is the State/.test(line) ||
    /^Are the /.test(line) ||
    /^Is there/.test(line) ||
    /^Does the ANS/.test(line) ||
    /^Has the ANS/.test(line) ||
    /^Does the ATS/.test(line) ||
    /^Has the ATS/.test(line) ||
    /^If the State/.test(line) ||
    /^Has the competent/.test(line)
  );
}

function parseANSQuestionsV2(): ParsedQuestion[] {
  const filePath = path.join(process.cwd(), "IP03-USOAP-Update.md");

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const rawContent = fs.readFileSync(filePath, "utf-8");
  const content = rawContent.replace(/[^\x20-\x7E\n\r]/g, '');
  const lines = content.split(/\r?\n/);

  console.log(`📄 Read ${lines.length} lines from ${filePath}`);

  const questions: ParsedQuestion[] = [];
  const seenPQs = new Set<string>();

  // First pass: identify all PQ number positions and their contexts
  interface PQOccurrence {
    lineNum: number;
    pqNumber: string;
    hasContentNearby: boolean;
    contentStartLine: number;
  }

  const pqOccurrences: PQOccurrence[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (PQ_PATTERN.test(line)) {
      // Check if this is part of a summary section (multiple PQs in sequence)
      const prevLine = i > 0 ? lines[i-1].trim() : "";
      const nextLine = i < lines.length - 1 ? lines[i+1].trim() : "";

      // Skip if surrounded by other PQ numbers (summary section)
      if (PQ_PATTERN.test(prevLine) || PQ_PATTERN.test(nextLine)) {
        continue;
      }

      // Look ahead for question content (up to 5 lines)
      let hasContent = false;
      let contentStart = -1;

      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const checkLine = lines[j].trim();
        if (shouldSkipLine(checkLine)) continue;
        if (PQ_PATTERN.test(checkLine)) break;
        if (CE_PATTERN.test(checkLine)) continue;
        if (checkLine === "Yes" || checkLine === "No") continue;

        if (isQuestionStart(checkLine) || checkLine.length > 30) {
          hasContent = true;
          contentStart = j;
          break;
        }
      }

      if (hasContent) {
        pqOccurrences.push({
          lineNum: i,
          pqNumber: line,
          hasContentNearby: true,
          contentStartLine: contentStart
        });
      }
    }
  }

  console.log(`\n📍 Found ${pqOccurrences.length} PQ numbers with nearby content\n`);

  // Second pass: extract questions
  for (let idx = 0; idx < pqOccurrences.length; idx++) {
    const occ = pqOccurrences[idx];
    const nextOcc = pqOccurrences[idx + 1];

    if (seenPQs.has(occ.pqNumber)) {
      continue;
    }

    let questionText = "";
    let guidanceText = "";
    let references = "";
    let criticalElement = "CE_1";
    let isPPQ = false;
    let currentSection: "question" | "guidance" | "reference" = "question";

    // Determine end line (start of next PQ or +100 lines max)
    const endLine = nextOcc ? nextOcc.lineNum : Math.min(occ.lineNum + 100, lines.length);

    for (let i = occ.contentStartLine; i < endLine; i++) {
      const line = lines[i].trim();

      if (shouldSkipLine(line)) continue;
      if (PQ_PATTERN.test(line)) break;

      // Detect CE
      if (CE_PATTERN.test(line)) {
        criticalElement = line.replace("-", "_");
        continue;
      }

      // Detect PPQ
      if (line === "Yes" && currentSection === "question") {
        isPPQ = true;
        continue;
      }

      // Detect reference
      if (isReference(line)) {
        if (references) {
          references += " " + line;
        } else {
          references = line;
        }
        currentSection = "reference";
        continue;
      }

      // Detect guidance start
      if (isGuidanceStart(line)) {
        currentSection = "guidance";
      }

      // Collect text
      if (currentSection === "question") {
        if (questionText) {
          questionText += " " + line;
        } else {
          questionText = line;
        }
      } else if (currentSection === "guidance") {
        if (guidanceText) {
          guidanceText += " " + line;
        } else {
          guidanceText = line;
        }
      }
    }

    // Only save if we have meaningful question text
    if (questionText && questionText.length > 20) {
      seenPQs.add(occ.pqNumber);
      questions.push({
        pqNumber: occ.pqNumber,
        questionTextEn: questionText.trim(),
        questionTextFr: `[FR] ${questionText.trim()}`,
        guidanceEn: guidanceText.trim(),
        guidanceFr: `[FR] ${guidanceText.trim()}`,
        icaoReferences: references.trim(),
        isPriorityPQ: isPPQ,
        criticalElement: criticalElement,
        requiresOnSite: false,
        auditArea: "ANS",
      });
    }
  }

  // Sort by PQ number
  questions.sort((a, b) => {
    const numA = parseInt(a.pqNumber.replace("7.", ""));
    const numB = parseInt(b.pqNumber.replace("7.", ""));
    return numA - numB;
  });

  return questions;
}

// Run
if (require.main === module) {
  try {
    console.log("🔍 Parsing ANS Protocol Questions (V2)...\n");

    const questions = parseANSQuestionsV2();

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

    // Compare with V1
    const v1Path = path.join(process.cwd(), "scripts", "parsed-ans-questions.json");
    if (fs.existsSync(v1Path)) {
      const v1Questions = JSON.parse(fs.readFileSync(v1Path, "utf-8"));
      const v1PQs = new Set(v1Questions.map((q: ParsedQuestion) => q.pqNumber));

      const newPQs = questions.filter(q => !v1PQs.has(q.pqNumber));
      console.log(`\n📈 New questions found (not in V1): ${newPQs.length}`);
      newPQs.slice(0, 10).forEach(q => {
        console.log(`   ${q.pqNumber}: ${q.questionTextEn.substring(0, 60)}...`);
      });
    }

    // Save to JSON
    const outputPath = path.join(process.cwd(), "scripts", "parsed-ans-questions-v2.json");
    fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
    console.log(`\n📁 Saved to ${outputPath}`);

    console.log("\n✅ Parsing complete!");

  } catch (error) {
    console.error("❌ Parsing failed:", error);
    process.exit(1);
  }
}

export { parseANSQuestionsV2 };
export type { ParsedQuestion };
