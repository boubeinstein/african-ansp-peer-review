# African ANSP Peer Review Platform - API Documentation

## Overview

The African ANSP Peer Review Platform uses tRPC for type-safe API endpoints. All APIs are accessed via the `/api/trpc` endpoint and are organized into routers by domain.

## Authentication

All API endpoints (except public endpoints) require authentication via NextAuth v5. The user session is automatically attached to the tRPC context.

```typescript
// Client-side usage
import { trpc } from "@/lib/trpc/client";

// The session is automatically included in requests
const { data } = trpc.assessment.list.useQuery({ page: 1, limit: 20 });
```

## API Routers

### Assessment Router (`assessment.*`)

Manages the full lifecycle of assessments from creation to completion.

#### `assessment.create`

Creates a new assessment for an organization.

**Input:**
```typescript
{
  questionnaireId?: string;      // Optional: specific questionnaire ID
  questionnaireType?: "ANS_USOAP_CMA" | "SMS_CANSO_SOE"; // Or type to auto-select
  assessmentType: "SELF_ASSESSMENT" | "GAP_ANALYSIS" | "PRE_REVIEW" | "MOCK_REVIEW";
  title: string;                 // 3-200 characters
  description?: string;          // Max 2000 characters
  dueDate?: Date;
  scope?: string[];              // Audit areas or SMS components to include
}
```

**Returns:** Created assessment with organization and questionnaire details.

**Authorization:** Requires `ASSESSMENT_MANAGER_ROLES` (SUPER_ADMIN, SYSTEM_ADMIN, PROGRAMME_COORDINATOR, ANSP_ADMIN, SAFETY_MANAGER, QUALITY_MANAGER)

---

#### `assessment.getById`

Retrieves a single assessment with full details.

**Input:**
```typescript
{ id: string } // Assessment ID (CUID)
```

**Returns:** Assessment with responses, organization, questionnaire, and progress info.

**Authorization:** Based on role and organization membership.

---

#### `assessment.list`

Lists assessments with filtering and pagination.

**Input:**
```typescript
{
  organizationId?: string;
  questionnaireId?: string;
  questionnaireType?: "ANS_USOAP_CMA" | "SMS_CANSO_SOE";
  type?: "SELF_ASSESSMENT" | "GAP_ANALYSIS" | "PRE_REVIEW" | "MOCK_REVIEW";
  status?: AssessmentStatus | AssessmentStatus[];
  search?: string;               // Max 100 characters
  page?: number;                 // Default: 1
  limit?: number;                // 1-100, default: 20
  sortBy?: "createdAt" | "updatedAt" | "status" | "progress";
  sortOrder?: "asc" | "desc";
}
```

**Returns:** Paginated list with total count and page info.

---

#### `assessment.submit`

Submits a completed assessment for review.

**Input:**
```typescript
{
  id: string;
  submissionNotes?: string;      // Max 2000 characters
}
```

**Validation:**
- All questions must be answered (100% progress)
- No "NOT_REVIEWED" responses for ANS assessments
- Calculates and stores EI score or SMS maturity level

**Returns:** Updated assessment with calculated scores and any warnings.

---

#### `assessment.startReview`

Moves a submitted assessment to "UNDER_REVIEW" status.

**Input:** `{ id: string }`

**Authorization:** SUPER_ADMIN, SYSTEM_ADMIN, PROGRAMME_COORDINATOR, LEAD_REVIEWER, PEER_REVIEWER

---

#### `assessment.complete`

Marks an assessment as completed after review.

**Input:**
```typescript
{
  id: string;
  completionNotes?: string;
}
```

**Authorization:** SUPER_ADMIN, SYSTEM_ADMIN, PROGRAMME_COORDINATOR, LEAD_REVIEWER

---

#### `assessment.reopen`

Reopens a submitted assessment for further editing.

**Input:**
```typescript
{
  id: string;
  reason: string;                // 10-500 characters
}
```

---

#### `assessment.saveResponse`

Saves a single response to a question.

**Input:**
```typescript
{
  assessmentId: string;
  questionId: string;
  responseValue?: string | null;       // For ANS: SATISFACTORY, NOT_SATISFACTORY, NOT_APPLICABLE, NOT_REVIEWED
  maturityLevel?: "A" | "B" | "C" | "D" | "E" | null; // For SMS
  notes?: string;                      // Max 2000 characters
  evidenceUrls?: string[];
}
```

**Returns:** Updated response with progress recalculation.

---

#### `assessment.saveResponses`

Bulk saves multiple responses.

**Input:**
```typescript
{
  assessmentId: string;
  responses: Array<{
    questionId: string;
    responseValue?: string | null;
    maturityLevel?: "A" | "B" | "C" | "D" | "E" | null;
    notes?: string;
  }>;                            // 1-100 responses
}
```

---

#### `assessment.getResponses`

Retrieves responses with filtering.

**Input:**
```typescript
{
  assessmentId: string;
  categoryId?: string;
  auditArea?: string;
  criticalElement?: string;
  smsComponent?: string;
  studyArea?: string;
  onlyUnanswered?: boolean;
  page?: number;
  limit?: number;                // 1-100, default: 50
}
```

---

#### `assessment.calculateScores`

Calculates current scores without saving.

**Input:** `{ assessmentId: string }`

**Returns:**
- For ANS: EI score breakdown by audit area and critical element
- For SMS: Maturity levels by component and study area

---

#### `assessment.export`

Exports assessment data.

**Input:**
```typescript
{
  assessmentId: string;
  format: "JSON" | "CSV";
  includeEvidence?: boolean;     // Default: true
  includeNotes?: boolean;        // Default: true
}
```

**Returns:** Formatted data with suggested filename.

---

### Response Router (`response.*`)

Manages individual assessment responses.

#### `response.save`

Saves or updates a response with full validation.

**Input:** Same as `assessment.saveResponse`

---

#### `response.getByAssessment`

Gets all responses for an assessment with question details.

**Input:**
```typescript
{
  assessmentId: string;
  includeQuestion?: boolean;
  includeEvidence?: boolean;
}
```

---

### Scoring Router (`scoring.*`)

Provides scoring calculations and analysis.

#### `scoring.calculateEI`

Calculates EI (Effective Implementation) score.

**Input:** `{ assessmentId: string }`

**Returns:**
```typescript
{
  overallEI: number;             // 0-100
  totalApplicable: number;
  satisfactoryCount: number;
  notSatisfactoryCount: number;
  notApplicableCount: number;
  auditAreaScores: Record<USOAPAuditArea, { ei: number; ... }>;
  criticalElementScores: Record<CriticalElement, { ei: number; ... }>;
  priorityPQScore?: number;
}
```

---

#### `scoring.calculateSMSMaturity`

Calculates SMS maturity score.

**Input:** `{ assessmentId: string }`

**Returns:**
```typescript
{
  overallLevel: "A" | "B" | "C" | "D" | "E" | null;
  overallScore: number;          // 1-5 scale
  overallPercentage: number;     // 0-100
  componentLevels: Record<SMSComponent, {
    level: string;
    score: number;
    weight: number;
    weightedScore: number;
  }>;
  studyAreaLevels: Record<CANSOStudyArea, { level: string; score: number; }>;
  gapAreas: string[];            // Components below Level C
}
```

---

### Progress Router (`progress.*`)

Tracks assessment progress and activity.

#### `progress.getAssessmentSummary`

Gets comprehensive progress summary.

**Input:** `{ assessmentId: string }`

**Returns:** Assessment details with progress stats and category breakdown.

---

#### `progress.getTimeline`

Gets activity timeline for an assessment.

**Input:**
```typescript
{
  assessmentId: string;
  limit?: number;                // Default: 20
  offset?: number;               // Default: 0
}
```

**Returns:** List of events with user info and metadata.

---

#### `progress.getDashboardStats`

Gets dashboard statistics.

**Input:** `{ organizationId?: string }`

**Returns:**
```typescript
{
  assessments: {
    total: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  documents: { total: number; thisWeek: number; };
  activity: Array<{ ... }>;
}
```

---

#### `progress.getAssessmentsNeedingAttention`

Gets assessments that are overdue or stalled.

**Input:**
```typescript
{
  organizationId?: string;
  limit?: number;
}
```

**Returns:** List of assessments with reason ("overdue" | "stalled").

---

### Questionnaire Router (`questionnaire.*`)

Manages questionnaires and questions.

#### `questionnaire.list`

Lists available questionnaires.

**Input:**
```typescript
{
  type?: "ANS_USOAP_CMA" | "SMS_CANSO_SOE";
  isActive?: boolean;
}
```

---

#### `questionnaire.getById`

Gets questionnaire with categories and question counts.

**Input:** `{ id: string }`

---

#### `questionnaire.getQuestions`

Gets questions with filtering.

**Input:**
```typescript
{
  questionnaireId: string;
  categoryId?: string;
  auditArea?: string;
  criticalElement?: string;
  smsComponent?: string;
  studyArea?: string;
  isPriorityPQ?: boolean;
  page?: number;
  limit?: number;
}
```

---

### Evidence Router (`evidence.*`)

Manages evidence documents.

#### `evidence.upload`

Initiates file upload.

**Input:**
```typescript
{
  assessmentId: string;
  questionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;              // Max 10MB
}
```

**Returns:** Signed upload URL.

---

#### `evidence.confirm`

Confirms successful upload.

**Input:**
```typescript
{
  assessmentId: string;
  questionId: string;
  fileUrl: string;
  description?: string;
}
```

---

#### `evidence.remove`

Removes evidence from a response.

**Input:**
```typescript
{
  assessmentId: string;
  questionId: string;
  evidenceUrl: string;
}
```

---

## Error Handling

All tRPC errors follow this structure:

```typescript
{
  code: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST" | "UNAUTHORIZED" | "CONFLICT" | ...;
  message: string;
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource does not exist |
| `FORBIDDEN` | User lacks permission |
| `BAD_REQUEST` | Invalid input or state |
| `UNAUTHORIZED` | Not authenticated |
| `CONFLICT` | Resource conflict (e.g., duplicate) |

---

## Status Transitions

### Valid Assessment Status Transitions

```
DRAFT → SUBMITTED → UNDER_REVIEW → COMPLETED → ARCHIVED
         ↓              ↓
       DRAFT        SUBMITTED
```

| From | Allowed To |
|------|-----------|
| DRAFT | SUBMITTED, ARCHIVED |
| SUBMITTED | UNDER_REVIEW, DRAFT (reopen) |
| UNDER_REVIEW | COMPLETED, SUBMITTED (return) |
| COMPLETED | ARCHIVED |
| ARCHIVED | (none) |

---

## Role-Based Access

### Assessment Access Matrix

| Role | View Own Org | View Other Org | Edit Own Org |
|------|-------------|----------------|--------------|
| SUPER_ADMIN | ✓ | ✓ | ✓ |
| SYSTEM_ADMIN | ✓ | ✓ | ✓ |
| PROGRAMME_COORDINATOR | ✓ | ✓ | ✓ |
| ANSP_ADMIN | ✓ | ✗ | ✓ |
| SAFETY_MANAGER | ✓ | ✗ | ✓ |
| QUALITY_MANAGER | ✓ | ✗ | ✓ |
| STAFF | ✓ | ✗ | ✗ |
| PEER_REVIEWER | ✓ | Submitted+ | ✗ |
| LEAD_REVIEWER | ✓ | Submitted+ | Review only |
| STEERING_COMMITTEE | ✓ | Completed only | ✗ |

---

## Scoring Formulas

### EI Score (ANS USOAP CMA)

```
EI = (Satisfactory / (Satisfactory + Not Satisfactory)) × 100
```

- NOT_APPLICABLE and NOT_REVIEWED are excluded from calculation
- Calculated per audit area and critical element

### SMS Maturity (CANSO SoE)

```
Component Score = Average of question scores (1-5)
Overall Score = Weighted average of component scores
Overall Level = Lowest component level (per CANSO guidance)
```

**Component Weights:**
- Safety Policy & Objectives: 25%
- Safety Risk Management: 30%
- Safety Assurance: 25%
- Safety Promotion: 20%

**Level Thresholds:**
| Level | Score Range | Percentage |
|-------|-------------|------------|
| A | 1.0 - 1.4 | 0-20% |
| B | 1.5 - 2.4 | 21-40% |
| C | 2.5 - 3.4 | 41-60% |
| D | 3.5 - 4.4 | 61-80% |
| E | 4.5 - 5.0 | 81-100% |

---

## Client Usage Examples

### React Query (via tRPC)

```typescript
// Fetching assessments
const { data, isLoading, error } = trpc.assessment.list.useQuery({
  status: "DRAFT",
  page: 1,
  limit: 10,
});

// Creating an assessment
const createMutation = trpc.assessment.create.useMutation({
  onSuccess: (data) => {
    // Navigate to new assessment
    router.push(`/assessments/${data.id}`);
  },
});

createMutation.mutate({
  questionnaireType: "ANS_USOAP_CMA",
  assessmentType: "SELF_ASSESSMENT",
  title: "2024 ANS Self-Assessment",
});

// Saving a response
const saveMutation = trpc.assessment.saveResponse.useMutation();

saveMutation.mutate({
  assessmentId: "clx...",
  questionId: "clx...",
  responseValue: "SATISFACTORY",
  notes: "Evidence document attached.",
});
```

### Server-Side Usage

```typescript
// In a Server Component or API route
import { createCaller } from "@/server/trpc/routers/_app";
import { createContext } from "@/server/trpc/context";

const ctx = await createContext();
const caller = createCaller(ctx);

const assessments = await caller.assessment.list({
  status: "COMPLETED",
  limit: 5,
});
```

---

## Internationalization

All API responses include bilingual fields where applicable:

```typescript
interface BilingualField {
  nameEn: string;
  nameFr: string;
  // or
  titleEn: string;
  titleFr: string;
  // or
  descriptionEn: string;
  descriptionFr: string;
}
```

Select the appropriate field based on user locale:
```typescript
const label = locale === "fr" ? item.nameFr : item.nameEn;
```
