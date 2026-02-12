/**
 * Offline Fieldwork Integration Verification Script
 *
 * Run with: npx tsx scripts/test-offline-fieldwork.ts
 *
 * Verifies that all pieces of the offline fieldwork system are properly
 * integrated:
 *   a. Dexie database schema is valid
 *   b. All required types and exports exist
 *   c. Sync engine and handlers are wired correctly
 *   d. All translation keys exist in both en.json and fr.json
 *   e. TypeScript compiles with zero errors
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// =============================================================================
// Helpers
// =============================================================================

const ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function check(name: string, fn: () => boolean | string) {
  try {
    const result = fn();
    if (result === true) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}: ${result}`);
      failed++;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ ${name}: ${msg}`);
    failed++;
  }
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

function fileContains(relPath: string, needle: string): boolean {
  const content = fs.readFileSync(path.join(ROOT, relPath), "utf-8");
  return content.includes(needle);
}

function jsonKeyExists(relPath: string, keyPath: string): boolean {
  const content = fs.readFileSync(path.join(ROOT, relPath), "utf-8");
  const json = JSON.parse(content);
  const keys = keyPath.split(".");
  let current = json;
  for (const key of keys) {
    if (current === undefined || current === null) return false;
    current = current[key];
  }
  return current !== undefined;
}

// =============================================================================
// 1. Dexie database schema
// =============================================================================

function checkDexieSchema() {
  console.log("\n📦 1. Dexie Database Schema");

  check("fieldwork-db.ts exists", () =>
    fileExists("src/lib/offline/fieldwork-db.ts")
  );

  check("Database defines checklistItems store", () =>
    fileContains("src/lib/offline/fieldwork-db.ts", "checklistItems")
  );

  check("Database defines fieldEvidence store", () =>
    fileContains("src/lib/offline/fieldwork-db.ts", "fieldEvidence")
  );

  check("Database defines draftFindings store", () =>
    fileContains("src/lib/offline/fieldwork-db.ts", "draftFindings")
  );

  check("Database defines syncQueue store", () =>
    fileContains("src/lib/offline/fieldwork-db.ts", "syncQueue")
  );

  check("Database defines offlineSessions store", () =>
    fileContains("src/lib/offline/fieldwork-db.ts", "offlineSessions")
  );
}

// =============================================================================
// 2. Types and exports
// =============================================================================

function checkTypesAndExports() {
  console.log("\n📋 2. Types and Exports");

  check("types.ts exports SyncStatus", () =>
    fileContains("src/lib/offline/types.ts", "export type SyncStatus")
  );

  check("types.ts exports OfflineChecklistItem", () =>
    fileContains("src/lib/offline/types.ts", "export interface OfflineChecklistItem")
  );

  check("types.ts exports OfflineFieldEvidence", () =>
    fileContains("src/lib/offline/types.ts", "export interface OfflineFieldEvidence")
  );

  check("types.ts exports OfflineDraftFinding", () =>
    fileContains("src/lib/offline/types.ts", "export interface OfflineDraftFinding")
  );

  check("types.ts exports SyncQueueEntry", () =>
    fileContains("src/lib/offline/types.ts", "export interface SyncQueueEntry")
  );

  check("types.ts exports ChecklistItemStatus", () =>
    fileContains("src/lib/offline/types.ts", "export type ChecklistItemStatus")
  );

  check("index.ts barrel exports fieldworkDB", () =>
    fileContains("src/lib/offline/index.ts", "fieldworkDB")
  );

  check("index.ts barrel exports syncEngine", () =>
    fileContains("src/lib/offline/index.ts", "syncEngine")
  );
}

// =============================================================================
// 3. Sync engine and handlers
// =============================================================================

function checkSyncEngine() {
  console.log("\n🔄 3. Sync Engine and Handlers");

  check("sync-engine.ts exists", () =>
    fileExists("src/lib/offline/sync-engine.ts")
  );

  check("sync-handlers.ts exists", () =>
    fileExists("src/lib/offline/sync-handlers.ts")
  );

  check("sync-handlers exports syncChecklistItem", () =>
    fileContains("src/lib/offline/sync-handlers.ts", "syncChecklistItem")
  );

  check("sync-handlers exports syncFieldEvidence", () =>
    fileContains("src/lib/offline/sync-handlers.ts", "syncFieldEvidence")
  );

  check("sync-handlers exports syncDraftFinding", () =>
    fileContains("src/lib/offline/sync-handlers.ts", "syncDraftFinding")
  );

  check("connectivity.ts exports createConnectivityMonitor", () =>
    fileContains("src/lib/offline/connectivity.ts", "export function createConnectivityMonitor")
  );
}

// =============================================================================
// 4. Component files
// =============================================================================

function checkComponents() {
  console.log("\n🧩 4. Fieldwork Components");

  const components = [
    "offline-checklist.tsx",
    "checklist-item-card.tsx",
    "checklist-progress-bar.tsx",
    "evidence-capture-button.tsx",
    "evidence-gallery.tsx",
    "evidence-picker.tsx",
    "voice-note-recorder.tsx",
    "draft-finding-form.tsx",
    "draft-findings-list.tsx",
    "sync-status-panel.tsx",
    "sync-progress-indicator.tsx",
    "conflict-resolver.tsx",
    "photo-annotator.tsx",
    "preflight-dialog.tsx",
    "fieldwork-entry-banner.tsx",
  ];

  for (const comp of components) {
    check(`${comp} exists`, () =>
      fileExists(`src/components/fieldwork/${comp}`)
    );
  }
}

// =============================================================================
// 5. Server-side sync endpoints
// =============================================================================

function checkServerEndpoints() {
  console.log("\n🌐 5. Server-Side Sync Endpoints");

  check("fieldwork-sync.ts router exists", () =>
    fileExists("src/server/trpc/routers/fieldwork-sync.ts")
  );

  check("Router registered in _app.ts", () =>
    fileContains("src/server/trpc/routers/_app.ts", "fieldworkSync")
  );

  check("syncChecklistItem procedure defined", () =>
    fileContains("src/server/trpc/routers/fieldwork-sync.ts", "syncChecklistItem")
  );

  check("uploadEvidence procedure defined", () =>
    fileContains("src/server/trpc/routers/fieldwork-sync.ts", "uploadEvidence")
  );

  check("syncDraftFinding procedure defined", () =>
    fileContains("src/server/trpc/routers/fieldwork-sync.ts", "syncDraftFinding")
  );

  check("getReviewOfflineData procedure defined", () =>
    fileContains("src/server/trpc/routers/fieldwork-sync.ts", "getReviewOfflineData")
  );
}

// =============================================================================
// 6. Translation keys
// =============================================================================

function checkTranslationKeys() {
  console.log("\n🌍 6. Translation Keys (EN/FR)");

  const requiredKeys = [
    // Fieldwork checklist
    "fieldwork.checklist.progress",
    "fieldwork.checklist.progressLabel",
    "fieldwork.checklist.online",
    "fieldwork.checklist.offline",
    "fieldwork.checklist.evidence",
    "fieldwork.checklist.annotate",
    "fieldwork.checklist.annotated",
    "fieldwork.checklist.phase.PRE_VISIT",
    "fieldwork.checklist.phase.ON_SITE",
    "fieldwork.checklist.phase.POST_VISIT",
    "fieldwork.checklist.status.NOT_STARTED",
    "fieldwork.checklist.status.COMPLETED",
    // Findings
    "fieldwork.findings.title",
    "fieldwork.findings.save",
    "fieldwork.findings.severity.CRITICAL",
    "fieldwork.findings.severity.MAJOR",
    // Mode
    "fieldwork.mode.title",
    "fieldwork.mode.tabChecklist",
    "fieldwork.mode.tabFindings",
    "fieldwork.mode.tabSync",
    "fieldwork.mode.bannerTitle",
    // Annotator
    "fieldwork.annotator.title",
    "fieldwork.annotator.save",
    "fieldwork.annotator.cancel",
    // Preflight
    "fieldwork.preflight.title",
    "fieldwork.preflight.checks.indexeddb",
    "fieldwork.preflight.checks.camera",
    "fieldwork.preflight.checks.storage",
    "fieldwork.preflight.allPassed",
    "fieldwork.preflight.hasFailed",
    // Offline sync
    "offline.syncStatus",
    "offline.syncNow",
    "offline.online",
    "offline.offline",
    // Review tab
    "reviews.detail.tabs.fieldwork",
  ];

  for (const keyPath of requiredKeys) {
    check(`EN: ${keyPath}`, () =>
      jsonKeyExists("messages/en.json", keyPath)
        ? true
        : `Missing key in en.json`
    );
    check(`FR: ${keyPath}`, () =>
      jsonKeyExists("messages/fr.json", keyPath)
        ? true
        : `Missing key in fr.json`
    );
  }
}

// =============================================================================
// 7. TypeScript compilation
// =============================================================================

function checkTypeScript() {
  console.log("\n🔧 7. TypeScript Compilation");

  check("TypeScript compiles with zero errors", () => {
    try {
      execSync("npx tsc --noEmit", {
        cwd: ROOT,
        stdio: "pipe",
        timeout: 120_000,
      });
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error && "stderr" in err
          ? String((err as { stderr: Buffer }).stderr)
          : String(err);
      return `Compilation failed:\n${msg.slice(0, 500)}`;
    }
  });
}

// =============================================================================
// 8. PWA / Service Worker
// =============================================================================

function checkPWA() {
  console.log("\n📱 8. PWA & Service Worker");

  check("Service worker file exists", () =>
    fileExists("public/sw.js")
  );

  check("PWA manifest exists", () =>
    fileExists("public/manifest.json") || fileExists("public/manifest.webmanifest")
  );

  check("Cache manager exists", () =>
    fileExists("src/lib/offline/cache-manager.ts")
  );

  check("Preflight check module exists", () =>
    fileExists("src/lib/offline/preflight-check.ts")
  );
}

// =============================================================================
// 9. Store and hooks
// =============================================================================

function checkStoreAndHooks() {
  console.log("\n🏪 9. Store & Hooks");

  check("Zustand store exists", () =>
    fileExists("src/stores/offline-fieldwork-store.ts")
  );

  check("useOfflineFieldwork hook exists", () =>
    fileExists("src/hooks/use-offline-fieldwork.ts")
  );

  check("Store exports useOfflineFieldworkStore", () =>
    fileContains("src/stores/offline-fieldwork-store.ts", "export const useOfflineFieldworkStore")
  );

  check("Hook registers sync handlers", () =>
    fileContains("src/hooks/use-offline-fieldwork.ts", "registerHandler")
  );
}

// =============================================================================
// Run all
// =============================================================================

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║   Offline Fieldwork Integration Verification            ║");
console.log("║   African ANSP Peer Review Programme                    ║");
console.log("╚══════════════════════════════════════════════════════════╝");

checkDexieSchema();
checkTypesAndExports();
checkSyncEngine();
checkComponents();
checkServerEndpoints();
checkTranslationKeys();
checkPWA();
checkStoreAndHooks();
checkTypeScript();

console.log("\n" + "═".repeat(58));
console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log("  ⚠️  Some checks failed. Review the output above.\n");
  process.exit(1);
} else {
  console.log("  🎉 All checks passed! Offline fieldwork system is ready.\n");
  process.exit(0);
}
