# African ANSP Peer Review Programme - Requirements Specification v4

## Table of Contents

1. [Overview](#1-overview)
2. [Functional Requirements](#2-functional-requirements)
   - 2.1 [Authentication & Authorization](#21-authentication--authorization-req-auth)
   - 2.2 [Organization Management](#22-organization-management-req-org)
   - 2.3 [User Management](#23-user-management-req-usr)
   - 2.4 [Assessment Management](#24-assessment-management-req-asm)
   - 2.5 [Peer Review Workflow](#25-peer-review-workflow-req-rev)
   - 2.5.1 [Fieldwork Checklist with Validation](#251-fieldwork-checklist-with-validation-req-fwc)
   - 2.5.2 [Document Management with Status Workflow](#252-document-management-with-status-workflow-req-doc)
   - 2.6 [Review Team Management](#26-review-team-management-req-rtm)
   - 2.7 [Findings & CAP Management](#27-findings--cap-management-req-fnd)
   - 2.8 [Reporting](#28-reporting-req-rpt)
3. [Integration Points](#3-integration-points)
4. [API Reference](#4-api-reference)
5. [Phase Information](#5-phase-information)

---

## 1. Overview

The African ANSP Peer Review Programme is a collaborative platform for Air Navigation Service Providers (ANSPs) and Civil Aviation Authorities (CAAs) across Africa to conduct systematic peer reviews, enhancing aviation safety through knowledge sharing and best practice adoption.

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization (REQ-AUTH)

*See existing implementation documentation.*

### 2.2 Organization Management (REQ-ORG)

*See existing implementation documentation.*

### 2.3 User Management (REQ-USR)

*See existing implementation documentation.*

### 2.4 Assessment Management (REQ-ASM)

*See existing implementation documentation.*

### 2.5 Peer Review Workflow (REQ-REV)

*See existing implementation documentation.*

---

### 2.5.1 Fieldwork Checklist with Validation (REQ-FWC) ✅ COMPLETE

The Fieldwork Checklist provides structured tracking of peer review activities across three phases, with automated validation against uploaded documents, findings, and prerequisite completion. This ensures reviewers follow proper procedures and documentation requirements before marking the review as complete.

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| REQ-FWC-001 | 14-item checklist organized by 3 phases | P0 | ✅ |
| REQ-FWC-002 | Automatic initialization on review access | P0 | ✅ |
| REQ-FWC-003 | Document-based validation rules | P0 | ✅ |
| REQ-FWC-004 | Finding-based validation rules | P0 | ✅ |
| REQ-FWC-005 | Prerequisite item validation | P0 | ✅ |
| REQ-FWC-006 | Manual completion for flexible items | P1 | ✅ |
| REQ-FWC-007 | Progress tracking by phase and overall | P1 | ✅ |
| REQ-FWC-008 | Override capability with audit trail | P1 | ✅ |
| REQ-FWC-009 | Role-based completion permissions | P1 | ✅ |
| REQ-FWC-010 | Bilingual labels (EN/FR) | P1 | ✅ |
| REQ-FWC-011 | Complete Fieldwork action with validation | P0 | ✅ |
| REQ-FWC-012 | Real-time validation status indicators | P1 | ✅ |

**Fieldwork Phases & Items:**

| Phase | Item Code | Description | Validation Type |
|-------|-----------|-------------|-----------------|
| **PRE-VISIT** | PRE_DOC_REQUEST_SENT | Document request sent to host organization | DOCUMENT_EXISTS (PRE_VISIT_REQUEST) |
| | PRE_DOCS_RECEIVED | Pre-visit documents received and reviewed | DOCUMENT_EXISTS (HOST_SUBMISSION, status: REVIEWED) |
| | PRE_COORDINATION_MEETING | Pre-visit coordination meeting held with team | MANUAL_OR_DOCUMENT |
| | PRE_PLAN_APPROVED | Review plan approved by team | APPROVAL_REQUIRED (Lead Reviewer, Coordinator) |
| **ON-SITE** | SITE_OPENING_MEETING | Opening meeting conducted with host | MANUAL_OR_DOCUMENT |
| | SITE_INTERVIEWS | Staff interviews completed | DOCUMENT_EXISTS (INTERVIEW_NOTES) |
| | SITE_FACILITIES | Facilities inspection completed | DOCUMENT_EXISTS (EVIDENCE) |
| | SITE_DOC_REVIEW | Document review completed | DOCUMENTS_REVIEWED (HOST_SUBMISSION) |
| | SITE_FINDINGS_DISCUSSED | Preliminary findings discussed with host | FINDINGS_EXIST (min: 1) |
| | SITE_CLOSING_MEETING | Closing meeting conducted | PREREQUISITE_ITEMS (all ON-SITE items) |
| **POST-VISIT** | POST_FINDINGS_ENTERED | All findings entered in system | AUTO_CHECK (findings count > 0) |
| | POST_EVIDENCE_UPLOADED | Supporting evidence uploaded | FINDINGS_HAVE_EVIDENCE |
| | POST_DRAFT_REPORT | Draft report prepared | DOCUMENT_EXISTS (DRAFT_REPORT) |
| | POST_HOST_FEEDBACK | Host feedback received on draft findings | MANUAL_OR_DOCUMENT (CORRESPONDENCE) |

**Validation Rule Types:**

| Type | Description | Parameters |
|------|-------------|------------|
| DOCUMENT_EXISTS | Checks for documents in specified category | category, minCount, requiredStatus[] |
| DOCUMENTS_REVIEWED | Verifies all documents in category are reviewed | category, allMustBeReviewed |
| FINDINGS_EXIST | Checks for findings with optional status filter | minCount, statusRequired[] |
| FINDINGS_HAVE_EVIDENCE | Ensures all findings have attached evidence | allFindingsMustHaveEvidence |
| PREREQUISITE_ITEMS | Requires other checklist items completed first | requiredItems[] |
| APPROVAL_REQUIRED | Requires completion by specific roles | approverRoles[] |
| MANUAL_OR_DOCUMENT | Allows manual completion or document upload | category (optional), allowManual |
| AUTO_CHECK | Automatic validation based on system state | condition (FINDINGS_COUNT_GT_0, ALL_CAPS_SUBMITTED, REPORT_GENERATED) |

**Override Capability:**

Coordinators and administrators can override validation requirements when exceptional circumstances prevent normal completion. Overrides require:
- Minimum 10-character justification reason
- Audit trail (who, when, why)
- Visual indicator on overridden items
- Ability to remove override and restore validation

**Permissions Matrix:**

| Action | Coordinator | Lead Reviewer | Peer Reviewer | Host Org |
|--------|-------------|---------------|---------------|----------|
| View Checklist | ✅ | ✅ | ✅ | ✅ (read-only) |
| Complete Items | ✅ | ✅ | ✅ | ❌ |
| Override Items | ✅ | ❌ | ❌ | ❌ |
| Remove Override | ✅ | ❌ | ❌ | ❌ |
| Complete Fieldwork | ✅ | ✅ | ❌ | ❌ |

---

### 2.5.2 Document Management with Status Workflow (REQ-DOC) ✅ COMPLETE

Enhanced document management provides a complete workflow for uploading, reviewing, and approving documents throughout the peer review process. Documents are categorized by purpose and tracked through a status workflow that integrates with the fieldwork checklist validation.

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| REQ-DOC-001 | Document upload with category selection | P0 | ✅ |
| REQ-DOC-002 | 9 document categories aligned with review phases | P0 | ✅ |
| REQ-DOC-003 | 6-stage status workflow | P0 | ✅ |
| REQ-DOC-004 | Review action with notes | P1 | ✅ |
| REQ-DOC-005 | Approval/rejection workflow | P1 | ✅ |
| REQ-DOC-006 | Rejection requires reason | P1 | ✅ |
| REQ-DOC-007 | Document statistics dashboard | P1 | ✅ |
| REQ-DOC-008 | Category-based filtering | P1 | ✅ |
| REQ-DOC-009 | Status-based filtering | P1 | ✅ |
| REQ-DOC-010 | Search by filename | P2 | ✅ |
| REQ-DOC-011 | Bulk status update | P2 | ✅ |
| REQ-DOC-012 | Integration with checklist validation | P0 | ✅ |
| REQ-DOC-013 | File size limit (10MB) | P1 | ✅ |
| REQ-DOC-014 | Supported file types validation | P1 | ✅ |
| REQ-DOC-015 | Audit trail (uploader, reviewer, approver) | P1 | ✅ |

**Document Categories:**

| Category | Code | Description | Checklist Integration |
|----------|------|-------------|----------------------|
| Pre-Visit Request | PRE_VISIT_REQUEST | Document request sent to host | PRE_DOC_REQUEST_SENT |
| Host Submission | HOST_SUBMISSION | Documents provided by host organization | PRE_DOCS_RECEIVED, SITE_DOC_REVIEW |
| Evidence | EVIDENCE | Photos, inspection records, observations | SITE_FACILITIES, POST_EVIDENCE_UPLOADED |
| Interview Notes | INTERVIEW_NOTES | Staff interview records and notes | SITE_INTERVIEWS |
| Draft Report | DRAFT_REPORT | Preliminary review report | POST_DRAFT_REPORT |
| Final Report | FINAL_REPORT | Completed review report | - |
| CAP Evidence | CAP_EVIDENCE | Corrective action plan supporting documents | - |
| Correspondence | CORRESPONDENCE | Communications with host organization | POST_HOST_FEEDBACK |
| Other | OTHER | Miscellaneous documents | - |

**Document Status Workflow:**

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ UPLOADED │────▶│ UNDER_REVIEW │────▶│ REVIEWED │
└──────────┘     └──────────────┘     └────┬─────┘
                                           │
                                           ▼
                                    ┌──────────────────┐
                                    │ PENDING_APPROVAL │
                                    └────────┬─────────┘
                                             │
                 ┌───────────────────────────┼───────────────────────────┐
                 │                           │                           │
                 ▼                           ▼                           │
          ┌──────────┐               ┌──────────┐                        │
          │ REJECTED │◀──────────────│ APPROVED │                        │
          └────┬─────┘               └──────────┘                        │
               │                                                         │
               ▼ (re-upload)                                             │
          ┌──────────┐                                                   │
          │ UPLOADED │◀──────────────────────────────────────────────────┘
          └──────────┘
```

**Status Definitions:**

| Status | Description | Next States |
|--------|-------------|-------------|
| UPLOADED | Document uploaded, awaiting review | UNDER_REVIEW, REVIEWED |
| UNDER_REVIEW | Currently being reviewed | REVIEWED, REJECTED |
| REVIEWED | Review complete, no approval needed | PENDING_APPROVAL, APPROVED |
| PENDING_APPROVAL | Awaiting formal approval | APPROVED, REJECTED |
| APPROVED | Formally approved (final state) | - |
| REJECTED | Rejected, requires re-upload | UPLOADED (via re-upload) |

**Permissions Matrix:**

| Action | Coordinator | Lead Reviewer | Peer Reviewer | Host Org |
|--------|-------------|---------------|---------------|----------|
| Upload Documents | ✅ | ✅ | ✅ | ✅ |
| View Documents | ✅ | ✅ | ✅ | ✅ |
| Mark as Reviewed | ✅ | ✅ | ✅ | ❌ |
| Approve Documents | ✅ | ✅ | ❌ | ❌ |
| Reject Documents | ✅ | ✅ | ❌ | ❌ |
| Delete Documents | ✅ | ✅ | ❌ (own only) | ❌ |
| Bulk Update | ✅ | ✅ | ❌ | ❌ |

**File Specifications:**

| Parameter | Value |
|-----------|-------|
| Maximum file size | 10 MB |
| Supported formats | PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG, GIF, WEBP, TXT, CSV |
| Storage | Vercel Blob (production) / Data URL (development) |
| Naming | Sanitized filename with timestamp prefix |

---

### 2.6 Review Team Management (REQ-RTM)

*See existing implementation documentation.*

---

### 2.7 Findings & CAP Management (REQ-FND)

*See existing implementation documentation.*

**Integration with Fieldwork Checklist:**

Findings are validated by the fieldwork checklist in two ways:
1. **SITE_FINDINGS_DISCUSSED** - Requires at least 1 finding to exist before marking preliminary findings as discussed
2. **POST_FINDINGS_ENTERED** - Auto-checks when findings count > 0
3. **POST_EVIDENCE_UPLOADED** - Validates all findings have at least one evidence document attached

---

### 2.8 Reporting (REQ-RPT)

*See existing implementation documentation.*

---

## 3. Integration Points

### 3.1 Checklist-Document Integration

The fieldwork checklist and document management systems are tightly integrated to ensure proper documentation throughout the review process:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐         ┌──────────────┐         ┌──────────────┐  │
│  │  Document   │────────▶│  Validation  │────────▶│  Checklist   │  │
│  │  Uploaded   │         │   Service    │         │    Item      │  │
│  └─────────────┘         └──────────────┘         └──────────────┘  │
│         │                       │                        │          │
│         │                       │                        │          │
│         ▼                       ▼                        ▼          │
│  ┌─────────────┐         ┌──────────────┐         ┌──────────────┐  │
│  │  Document   │────────▶│  Re-validate │────────▶│   Progress   │  │
│  │  Reviewed   │         │   Checklist  │         │   Updated    │  │
│  └─────────────┘         └──────────────┘         └──────────────┘  │
│                                                          │          │
│                                                          ▼          │
│                                                   ┌──────────────┐  │
│                                                   │   Complete   │  │
│                                                   │  Fieldwork   │  │
│                                                   └──────────────┘  │
│                                                          │          │
│                                                          ▼          │
│                                                   ┌──────────────┐  │
│                                                   │  Transition  │  │
│                                                   │ to REPORTING │  │
│                                                   └──────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Trigger Points:**
- Document upload → Invalidates relevant checklist item cache → Re-validates on next view
- Document status change → Updates checklist validation results
- Finding created → Updates POST_FINDINGS_ENTERED auto-check
- Evidence attached to finding → Updates POST_EVIDENCE_UPLOADED validation
- All checklist items complete → Enables "Complete Fieldwork" button
- Complete Fieldwork → Transitions review to REPORTING phase

### 3.2 Data Model Relationships

```
Review (1)
    │
    ├──▶ FieldworkChecklistItem (14 per review)
    │       ├── phase: PRE_VISIT | ON_SITE | POST_VISIT
    │       ├── validationRules: JSON
    │       ├── isCompleted: boolean
    │       └── isOverridden: boolean (with audit trail)
    │
    ├──▶ Document (many)
    │       ├── category: 9 types
    │       ├── status: 6-stage workflow
    │       ├── uploadedBy → User
    │       ├── reviewedBy → User (optional)
    │       └── approvedBy → User (optional)
    │
    └──▶ Finding (many)
            ├── documents: Document[] (evidence)
            └── correctiveActionPlan: CAP (optional)
```

---

## 4. API Reference

### 4.1 Checklist API (tRPC)

| Procedure | Type | Description |
|-----------|------|-------------|
| `checklist.initialize` | Mutation | Create 14 checklist items for a review |
| `checklist.getByReviewId` | Query | Get all items with validation status |
| `checklist.toggleItem` | Mutation | Complete/uncomplete an item (with validation) |
| `checklist.overrideItem` | Mutation | Override validation (coordinator only) |
| `checklist.removeOverride` | Mutation | Remove override (coordinator only) |
| `checklist.getCompletionStatus` | Query | Get progress stats and completion eligibility |
| `checklist.completeFieldwork` | Mutation | Transition review to REPORTING phase |

### 4.2 Document API (tRPC)

| Procedure | Type | Description |
|-----------|------|-------------|
| `document.upload` | Mutation | Upload new document with category |
| `document.getByReviewId` | Query | Get all documents for a review |
| `document.getById` | Query | Get single document details |
| `document.updateStatus` | Mutation | Change document status (review/approve/reject) |
| `document.delete` | Mutation | Delete a document |
| `document.getStatsByReviewId` | Query | Get document statistics |
| `document.getByFindingId` | Query | Get evidence documents for a finding |
| `document.getByCapId` | Query | Get documents for a CAP |
| `document.bulkUpdateStatus` | Mutation | Update multiple documents at once |
| `document.getCountsByCategory` | Query | Get counts by category (for validation) |

---

## 5. Phase Information

### Implementation Phases

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Core Infrastructure & Auth | ✅ Complete |
| Phase 2 | Organization & User Management | ✅ Complete |
| Phase 3 | Assessment Module | ✅ Complete |
| Phase 4 | Peer Review Workflow | ✅ Complete |
| Phase 5 | Findings & CAP Management | ✅ Complete |
| Phase 6 | Reporting & Analytics | 🔄 In Progress |

---

*Document Version: 4.0*
*Last Updated: January 2025*
