import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────
// TEST CONFIGURATION & HELPERS
// ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Demo user credentials (from seed-demo-users.ts)
const USERS = {
  coordinator: {
    email: "coordinator@aaprp.aero",
    password: "Demo2024!",
    role: "PROGRAMME_COORDINATOR",
  },
  leadReviewer: {
    email: "sekou.camara@lcaa.gov.lr",
    password: "Demo2024!",
    role: "LEAD_REVIEWER",
    org: "RFIR",
  },
  peerReviewer: {
    email: "boubacar.diallo@lcaa.gov.lr",
    password: "Demo2024!",
    role: "PEER_REVIEWER",
    org: "RFIR",
  },
  anspAdmin: {
    email: "fatou.diallo@asecna.org",
    password: "Demo2024!",
    role: "LEAD_REVIEWER",
    org: "ASECNA",
  },
};

// Test data
const TEST_REVIEW_TITLE = "E2E Test Review - ASECNA Peer Review 2026";

// Helper functions
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/en/auth/signin`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/.*dashboard.*/);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: /user menu/i }).click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await page.waitForURL(/.*signin.*/);
}

async function navigateToReview(page: Page, reviewTitle: string) {
  await page.goto(`${BASE_URL}/en/reviews`);
  await page.getByRole("link", { name: reviewTitle }).first().click();
  await page.waitForURL(/.*reviews\/.*/);
}

async function navigateToChecklistTab(page: Page) {
  await page.getByRole("tab", { name: /fieldwork checklist|liste de contrôle/i }).click();
  await expect(page.getByText(/fieldwork checklist|liste de contrôle/i).first()).toBeVisible();
}

async function navigateToDocumentsTab(page: Page) {
  await page.getByRole("tab", { name: /documents/i }).click();
  await expect(page.getByText(/review documents|documents de la revue/i).first()).toBeVisible();
}

// ─────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" }); // Run tests in order

// ─────────────────────────────────────────────────────────────────
// SUITE 1: CHECKLIST INITIALIZATION & DISPLAY
// ─────────────────────────────────────────────────────────────────

test.describe("Fieldwork Checklist - Initialization", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);
  });

  test("should display all 14 checklist items organized by phase", async ({ page }) => {
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Verify all 3 phases are visible
    await expect(page.getByText("Pre-Visit Preparation")).toBeVisible();
    await expect(page.getByText("On-Site Activities")).toBeVisible();
    await expect(page.getByText("Post-Visit Activities")).toBeVisible();

    // Verify item count per phase
    const preVisitSection = page.locator('[data-phase="PRE_VISIT"]');
    const onSiteSection = page.locator('[data-phase="ON_SITE"]');
    const postVisitSection = page.locator('[data-phase="POST_VISIT"]');

    // PRE_VISIT: 4 items
    await expect(preVisitSection.getByText("Document request sent to host organization")).toBeVisible();
    await expect(preVisitSection.getByText("Pre-visit documents received and reviewed")).toBeVisible();
    await expect(preVisitSection.getByText("Pre-visit coordination meeting held with team")).toBeVisible();
    await expect(preVisitSection.getByText("Review plan approved by team")).toBeVisible();

    // ON_SITE: 6 items
    await expect(onSiteSection.getByText("Opening meeting conducted with host")).toBeVisible();
    await expect(onSiteSection.getByText("Staff interviews completed")).toBeVisible();
    await expect(onSiteSection.getByText("Facilities inspection completed")).toBeVisible();
    await expect(onSiteSection.getByText("Document review completed")).toBeVisible();
    await expect(onSiteSection.getByText("Preliminary findings discussed with host")).toBeVisible();
    await expect(onSiteSection.getByText("Closing meeting conducted")).toBeVisible();

    // POST_VISIT: 4 items
    await expect(postVisitSection.getByText("All findings entered in system")).toBeVisible();
    await expect(postVisitSection.getByText("Supporting evidence uploaded")).toBeVisible();
    await expect(postVisitSection.getByText("Draft report prepared")).toBeVisible();
    await expect(postVisitSection.getByText("Host feedback received on draft findings")).toBeVisible();
  });

  test("should display progress bar at 0% initially", async ({ page }) => {
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Overall progress should be 0%
    await expect(page.getByText("0%").first()).toBeVisible();
    await expect(page.getByText("0 / 14")).toBeVisible();
  });

  test("should expand and collapse phase sections", async ({ page }) => {
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Click to collapse Pre-Visit section
    await page.getByText("Pre-Visit Preparation").click();

    // Items should be hidden
    await expect(page.getByText("Document request sent to host organization")).not.toBeVisible();

    // Click to expand again
    await page.getByText("Pre-Visit Preparation").click();

    // Items should be visible again
    await expect(page.getByText("Document request sent to host organization")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 2: VALIDATION INDICATORS
// ─────────────────────────────────────────────────────────────────

test.describe("Fieldwork Checklist - Validation Indicators", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.leadReviewer.email, USERS.leadReviewer.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);
  });

  test("should show warning indicator for items requiring documents", async ({ page }) => {
    // Document request item should show warning (no PRE_VISIT_REQUEST documents)
    const docRequestItem = page.locator('[data-item-code="PRE_DOC_REQUEST_SENT"]');

    // Should have amber/warning styling
    await expect(docRequestItem).toHaveClass(/bg-amber/);

    // Should show AlertCircle icon
    await expect(docRequestItem.locator('svg[class*="text-amber"]')).toBeVisible();

    // Should show validation message
    await expect(docRequestItem.getByText(/requires at least 1/i)).toBeVisible();
  });

  test("should show upload button for items requiring documents", async ({ page }) => {
    const docRequestItem = page.locator('[data-item-code="PRE_DOC_REQUEST_SENT"]');

    // Upload button should be visible
    const uploadButton = docRequestItem.getByRole("button", { name: /upload/i });
    await expect(uploadButton).toBeVisible();

    // Clicking upload should navigate to documents tab with category filter
    await uploadButton.click();
    await expect(page).toHaveURL(/.*tab=documents.*docCategory=PRE_VISIT_REQUEST/);
  });

  test("should allow manual completion for items with allowManual: true", async ({ page }) => {
    // Pre-visit coordination meeting allows manual completion
    const meetingItem = page.locator('[data-item-code="PRE_COORDINATION_MEETING"]');

    // Should not show warning (manual allowed)
    await expect(meetingItem).not.toHaveClass(/bg-amber/);

    // Checkbox should be clickable
    const checkbox = meetingItem.locator('button').first();
    await checkbox.click();

    // Should now show as completed
    await expect(meetingItem).toHaveClass(/bg-green/);
    await expect(meetingItem.locator('svg[class*="text-green"]')).toBeVisible();
  });

  test("should prevent completion of items with failed validation", async ({ page }) => {
    // Try to click the checkbox for an item that requires documents
    const docReceivedItem = page.locator('[data-item-code="PRE_DOCS_RECEIVED"]');
    const checkbox = docReceivedItem.locator('button').first();

    await checkbox.click();

    // Should show error toast
    await expect(page.getByText(/cannot complete this item/i)).toBeVisible();

    // Item should not be marked as completed
    await expect(docReceivedItem).not.toHaveClass(/bg-green/);
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 3: DOCUMENT UPLOAD & VALIDATION INTEGRATION
// ─────────────────────────────────────────────────────────────────

test.describe("Document Upload Integration", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.leadReviewer.email, USERS.leadReviewer.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
  });

  test("should upload document and update checklist validation", async ({ page }) => {
    // Navigate to documents tab
    await navigateToDocumentsTab(page);

    // Click upload button
    await page.getByRole("button", { name: /upload document/i }).click();

    // Select category
    await page.getByLabel(/document category/i).click();
    await page.getByRole("option", { name: /pre-visit request/i }).click();

    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "document-request.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("Test PDF content"),
    });

    // Wait for upload to complete
    await expect(page.getByText(/document uploaded successfully/i)).toBeVisible();

    // Navigate to checklist tab
    await navigateToChecklistTab(page);

    // Document request item should now be completable
    const docRequestItem = page.locator('[data-item-code="PRE_DOC_REQUEST_SENT"]');

    // Warning should be gone or reduced
    await expect(docRequestItem.getByText(/1 \/ 1/i)).toBeVisible();
  });

  test("should show document counts in validation details", async ({ page }) => {
    await navigateToChecklistTab(page);

    // Item should show current vs required count
    const docRequestItem = page.locator('[data-item-code="PRE_DOC_REQUEST_SENT"]');

    // Should show badge with counts (e.g., "0 / 1" or "1 / 1")
    const countBadge = docRequestItem.locator('[class*="Badge"]');
    await expect(countBadge).toBeVisible();
  });

  test("should update checklist when document is reviewed", async ({ page }) => {
    // Upload a HOST_SUBMISSION document first
    await navigateToDocumentsTab(page);
    await page.getByRole("button", { name: /upload document/i }).click();
    await page.getByLabel(/document category/i).click();
    await page.getByRole("option", { name: /host submission/i }).click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "host-docs.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("Host submission content"),
    });

    await expect(page.getByText(/document uploaded successfully/i)).toBeVisible();

    // Now mark document as reviewed
    await page.getByRole("button", { name: /more/i }).first().click();
    await page.getByRole("menuitem", { name: /mark as reviewed/i }).click();
    await page.getByRole("button", { name: /mark reviewed/i }).click();

    await expect(page.getByText(/document status updated/i)).toBeVisible();

    // Check that checklist item validation is updated
    await navigateToChecklistTab(page);

    const docsReceivedItem = page.locator('[data-item-code="PRE_DOCS_RECEIVED"]');
    // Should now be completable (document is reviewed)
    await expect(docsReceivedItem).not.toHaveClass(/bg-amber/);
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 4: DOCUMENT STATUS WORKFLOW
// ─────────────────────────────────────────────────────────────────

test.describe("Document Status Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.leadReviewer.email, USERS.leadReviewer.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToDocumentsTab(page);
  });

  test("should display correct status badges", async ({ page }) => {
    // Check for different status badges
    await expect(page.locator('[data-status="UPLOADED"]').first()).toBeVisible();
  });

  test("should transition document from UPLOADED to REVIEWED", async ({ page }) => {
    // Find an uploaded document
    const docRow = page.locator('tr').filter({ hasText: /uploaded/i }).first();

    // Open actions menu
    await docRow.getByRole("button", { name: /more/i }).click();
    await page.getByRole("menuitem", { name: /mark as reviewed/i }).click();

    // Add notes (optional)
    await page.getByLabel(/notes/i).fill("Document reviewed and verified");
    await page.getByRole("button", { name: /mark reviewed/i }).click();

    // Verify status changed
    await expect(page.getByText(/document status updated/i)).toBeVisible();
    await expect(docRow.getByText(/reviewed/i)).toBeVisible();
  });

  test("should transition document from REVIEWED to APPROVED", async ({ page }) => {
    // Find a reviewed document
    const docRow = page.locator('tr').filter({ hasText: /reviewed/i }).first();

    if (await docRow.count() === 0) {
      test.skip();
      return;
    }

    // Open actions menu
    await docRow.getByRole("button", { name: /more/i }).click();
    await page.getByRole("menuitem", { name: /approve/i }).click();
    await page.getByRole("button", { name: /approve/i }).click();

    // Verify status changed
    await expect(page.getByText(/document status updated/i)).toBeVisible();
    await expect(docRow.getByText(/approved/i)).toBeVisible();
  });

  test("should require reason when rejecting document", async ({ page }) => {
    // Find a reviewed document
    const docRow = page.locator('tr').filter({ hasText: /reviewed/i }).first();

    if (await docRow.count() === 0) {
      test.skip();
      return;
    }

    // Open actions menu
    await docRow.getByRole("button", { name: /more/i }).click();
    await page.getByRole("menuitem", { name: /reject/i }).click();

    // Try to submit without reason
    const rejectButton = page.getByRole("button", { name: /^reject$/i });
    await expect(rejectButton).toBeDisabled();

    // Add reason
    await page.getByLabel(/notes/i).fill("Document is incomplete, missing required sections");
    await expect(rejectButton).toBeEnabled();

    await rejectButton.click();

    // Verify status changed
    await expect(page.getByText(/document status updated/i)).toBeVisible();
  });

  test("should show reviewer info in tooltip", async ({ page }) => {
    // Find a reviewed document
    const docRow = page.locator('tr').filter({ hasText: /reviewed|approved/i }).first();

    if (await docRow.count() === 0) {
      test.skip();
      return;
    }

    // Hover over status badge
    const statusBadge = docRow.locator('[data-status]');
    await statusBadge.hover();

    // Tooltip should show reviewer name
    await expect(page.getByText(/reviewed by:|examiné par:/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 5: CHECKLIST ITEM COMPLETION
// ─────────────────────────────────────────────────────────────────

test.describe("Checklist Item Completion", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.leadReviewer.email, USERS.leadReviewer.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);
  });

  test("should complete manual item and update progress", async ({ page }) => {
    // Get initial progress
    const progressText = await page.getByText(/\d+ \/ 14/).first().textContent();
    const initialCompleted = parseInt(progressText?.split("/")[0] || "0");

    // Complete a manual item
    const meetingItem = page.locator('[data-item-code="PRE_COORDINATION_MEETING"]');
    await meetingItem.locator('button').first().click();

    // Wait for update
    await expect(page.getByText(/item updated/i)).toBeVisible();

    // Progress should increase
    const newProgressText = await page.getByText(/\d+ \/ 14/).first().textContent();
    const newCompleted = parseInt(newProgressText?.split("/")[0] || "0");

    expect(newCompleted).toBe(initialCompleted + 1);
  });

  test("should show completion info after marking complete", async ({ page }) => {
    // Complete an item
    const meetingItem = page.locator('[data-item-code="SITE_OPENING_MEETING"]');

    if (await meetingItem.locator('svg[class*="text-green"]').count() === 0) {
      await meetingItem.locator('button').first().click();
      await expect(page.getByText(/item updated/i)).toBeVisible();
    }

    // Should show completed by info
    await expect(meetingItem.getByText(/completed by/i)).toBeVisible();
    await expect(meetingItem.getByText(/sekou camara/i)).toBeVisible();
  });

  test("should allow unchecking completed item", async ({ page }) => {
    // Find a completed item
    const completedItem = page.locator('[data-item-code="PRE_COORDINATION_MEETING"]');

    // If not completed, complete it first
    if (await completedItem.locator('svg[class*="text-green"]').count() === 0) {
      await completedItem.locator('button').first().click();
      await page.waitForTimeout(500);
    }

    // Now uncheck it
    await completedItem.locator('button').first().click();

    // Should be unchecked
    await expect(completedItem.locator('svg[class*="text-green"]')).not.toBeVisible();
  });

  test("should enforce prerequisite items for closing meeting", async ({ page }) => {
    // Try to complete closing meeting without prerequisites
    const closingMeetingItem = page.locator('[data-item-code="SITE_CLOSING_MEETING"]');

    // Should show that it requires prerequisites
    await expect(closingMeetingItem.getByText(/complete prerequisite items/i)).toBeVisible();

    // Try to click
    await closingMeetingItem.locator('button').first().click();

    // Should show error
    await expect(page.getByText(/cannot complete this item/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 6: OVERRIDE FUNCTIONALITY
// ─────────────────────────────────────────────────────────────────

test.describe("Checklist Override Functionality", () => {
  test("should show override button for coordinators", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Find an item that requires documents (has validation issue)
    const docRequestItem = page.locator('[data-item-code="PRE_DOC_REQUEST_SENT"]');

    // Override button (unlock icon) should be visible
    await expect(docRequestItem.getByRole("button", { name: /override/i })).toBeVisible();
  });

  test("should not show override button for peer reviewers", async ({ page }) => {
    await login(page, USERS.peerReviewer.email, USERS.peerReviewer.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Find an item that requires documents
    const docRequestItem = page.locator('[data-item-code="PRE_DOC_REQUEST_SENT"]');

    // Override button should NOT be visible
    await expect(docRequestItem.getByRole("button", { name: /override/i })).not.toBeVisible();
  });

  test("should require reason when overriding item", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Click override button
    const docRequestItem = page.locator('[data-item-code="PRE_DOC_REQUEST_SENT"]');
    await docRequestItem.getByRole("button", { name: /override/i }).click();

    // Dialog should open
    await expect(page.getByText(/override checklist item/i)).toBeVisible();

    // Submit button should be disabled without reason
    const submitButton = page.getByRole("button", { name: /override item/i });
    await expect(submitButton).toBeDisabled();

    // Enter short reason (less than 10 chars)
    await page.getByLabel(/override reason/i).fill("short");
    await expect(submitButton).toBeDisabled();

    // Enter valid reason
    await page.getByLabel(/override reason/i).fill("Document was received via email and verified offline by programme coordinator");
    await expect(submitButton).toBeEnabled();

    // Submit
    await submitButton.click();

    // Should show success and override badge
    await expect(page.getByText(/item overridden/i)).toBeVisible();
    await expect(docRequestItem.getByText(/overridden/i)).toBeVisible();
  });

  test("should show override info in tooltip", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Find an overridden item
    const overriddenItem = page.locator('[data-item-code]').filter({ hasText: /overridden/i }).first();

    if (await overriddenItem.count() === 0) {
      test.skip();
      return;
    }

    // Hover over info icon
    await overriddenItem.locator('svg[class*="Info"]').hover();

    // Should show override reason
    await expect(page.getByText(/override reason:/i)).toBeVisible();
  });

  test("should allow removing override", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Find an overridden item
    const overriddenItem = page.locator('[data-item-code]').filter({ hasText: /overridden/i }).first();

    if (await overriddenItem.count() === 0) {
      test.skip();
      return;
    }

    // Click remove override button (lock icon)
    await overriddenItem.getByRole("button", { name: /remove override/i }).click();

    // Should show success and remove override badge
    await expect(page.getByText(/override removed/i)).toBeVisible();
    await expect(overriddenItem.getByText(/overridden/i)).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 7: COMPLETE FIELDWORK
// ─────────────────────────────────────────────────────────────────

test.describe("Complete Fieldwork", () => {
  test("should show incomplete items warning when fieldwork not ready", async ({ page }) => {
    await login(page, USERS.leadReviewer.email, USERS.leadReviewer.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Complete Fieldwork button should be visible but show warning
    await expect(page.getByRole("button", { name: /complete fieldwork/i })).toBeVisible();
    await expect(page.getByText(/all checklist items must be completed/i)).toBeVisible();

    // Should list incomplete items
    await expect(page.locator("ul li")).toHaveCount({ min: 1 });
  });

  test("should disable Complete Fieldwork button when items incomplete", async ({ page }) => {
    await login(page, USERS.leadReviewer.email, USERS.leadReviewer.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    const completeButton = page.getByRole("button", { name: /complete fieldwork/i });
    await expect(completeButton).toBeDisabled();
  });

  test("should enable Complete Fieldwork when all items complete", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Override all incomplete items (for testing purposes)
    const incompleteItems = page.locator('[data-item-code]').filter({
      has: page.locator('svg[class*="text-amber"], svg[class*="Circle"]'),
    });

    const count = await incompleteItems.count();
    for (let i = 0; i < count; i++) {
      const item = incompleteItems.nth(i);
      const overrideButton = item.getByRole("button", { name: /override/i });

      if (await overrideButton.count() > 0) {
        await overrideButton.click();
        await page.getByLabel(/override reason/i).fill("Overriding for E2E test completion verification");
        await page.getByRole("button", { name: /override item/i }).click();
        await page.waitForTimeout(300);
      } else {
        // Manual item - just click to complete
        await item.locator('button').first().click();
        await page.waitForTimeout(300);
      }
    }

    // Now Complete Fieldwork button should be enabled
    const completeButton = page.getByRole("button", { name: /complete fieldwork/i });
    await expect(completeButton).toBeEnabled();
  });

  test("should transition review to REPORTING phase on completion", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Ensure all items are complete (from previous test or setup)
    const completeButton = page.getByRole("button", { name: /complete fieldwork/i });

    if (await completeButton.isDisabled()) {
      test.skip();
      return;
    }

    await completeButton.click();

    // Should show success message
    await expect(page.getByText(/fieldwork completed/i)).toBeVisible();

    // Review phase should change to REPORTING
    await expect(page.getByText(/reporting/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 8: BILINGUAL SUPPORT
// ─────────────────────────────────────────────────────────────────

test.describe("Bilingual Support", () => {
  test("should display French labels when locale is FR", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);

    // Navigate to French version
    await page.goto(`${BASE_URL}/fr/reviews`);
    await page.getByRole("link", { name: TEST_REVIEW_TITLE }).first().click();

    // Navigate to checklist
    await page.getByRole("tab", { name: /liste de contrôle/i }).click();

    // Should show French labels
    await expect(page.getByText("Préparation pré-visite")).toBeVisible();
    await expect(page.getByText("Activités sur site")).toBeVisible();
    await expect(page.getByText("Activités post-visite")).toBeVisible();
    await expect(page.getByText("Demande de documents envoyée à l'organisation hôte")).toBeVisible();
  });

  test("should show French validation messages", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);

    await page.goto(`${BASE_URL}/fr/reviews`);
    await page.getByRole("link", { name: TEST_REVIEW_TITLE }).first().click();
    await page.getByRole("tab", { name: /liste de contrôle/i }).click();

    // French validation message
    const docRequestItem = page.locator('[data-item-code="PRE_DOC_REQUEST_SENT"]');
    await expect(docRequestItem.getByText(/nécessite au moins/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 9: ROLE-BASED ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────

test.describe("Role-Based Access Control", () => {
  test("coordinator should have full access to checklist", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Should see override buttons
    await expect(page.getByRole("button", { name: /override/i }).first()).toBeVisible();

    // Should see complete fieldwork button
    await expect(page.getByRole("button", { name: /complete fieldwork/i })).toBeVisible();
  });

  test("lead reviewer should be able to complete items", async ({ page }) => {
    await login(page, USERS.leadReviewer.email, USERS.leadReviewer.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Should be able to click checkboxes
    const manualItem = page.locator('[data-item-code="PRE_COORDINATION_MEETING"]');
    const checkbox = manualItem.locator('button').first();
    await expect(checkbox).toBeEnabled();
  });

  test("peer reviewer should be able to complete items but not override", async ({ page }) => {
    await login(page, USERS.peerReviewer.email, USERS.peerReviewer.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Should be able to click checkboxes
    const manualItem = page.locator('[data-item-code="PRE_COORDINATION_MEETING"]');
    const checkbox = manualItem.locator('button').first();
    await expect(checkbox).toBeEnabled();

    // Should NOT see override buttons
    await expect(page.getByRole("button", { name: /override/i })).not.toBeVisible();
  });

  test("host organization user should only view checklist (read-only)", async ({ page }) => {
    // Login as host org user (ASECNA admin viewing their own review)
    await login(page, USERS.anspAdmin.email, USERS.anspAdmin.password);

    // Navigate to a review where this user is the host
    await page.goto(`${BASE_URL}/en/reviews`);

    // If no reviews visible, skip test
    const reviewLink = page.getByRole("link", { name: /asecna/i }).first();
    if (await reviewLink.count() === 0) {
      test.skip();
      return;
    }

    await reviewLink.click();
    await navigateToChecklistTab(page);

    // Checkboxes should be disabled for non-team members
    const checkbox = page.locator('[data-item-code] button').first();
    await expect(checkbox).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 10: ERROR HANDLING
// ─────────────────────────────────────────────────────────────────

test.describe("Error Handling", () => {
  test("should handle network errors gracefully", async ({ page }) => {
    await login(page, USERS.coordinator.email, USERS.coordinator.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Simulate network error by blocking API calls
    await page.route("**/api/trpc/checklist**", (route) => {
      route.abort("failed");
    });

    // Try to complete an item
    const manualItem = page.locator('[data-item-code="PRE_COORDINATION_MEETING"]');
    await manualItem.locator('button').first().click();

    // Should show error message
    await expect(page.getByText(/error|failed/i)).toBeVisible();
  });

  test("should show loading state while fetching checklist", async ({ page }) => {
    // Slow down the API response
    await page.route("**/api/trpc/checklist.getByReviewId**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    await login(page, USERS.coordinator.email, USERS.coordinator.password);
    await navigateToReview(page, TEST_REVIEW_TITLE);
    await navigateToChecklistTab(page);

    // Should show loading spinner briefly
    await expect(page.locator('[class*="animate-spin"]')).toBeVisible();
  });
});
