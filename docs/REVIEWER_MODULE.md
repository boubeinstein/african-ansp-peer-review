# Reviewer Profile Module

> Weeks 9-10 Implementation for African ANSP Peer Review Programme

## Overview

The Reviewer Profile Module manages peer reviewers for the African ANSP Peer Review Programme. It tracks 99 nominated reviewers (45 selected) with their expertise, language proficiencies, certifications, availability, and conflicts of interest.

## Data Models

### Entity Relationship Diagram

```
┌──────────────────┐     ┌──────────────────────┐
│      User        │     │    Organization      │
│  ─────────────── │     │ ──────────────────── │
│  id              │◄────│ id                   │
│  email           │     │ nameEn / nameFr      │
│  firstName       │     │ organizationCode             │
│  lastName        │     │ country              │
│  role            │     │ region               │
└────────┬─────────┘     └──────────┬───────────┘
         │                          │
         │                          │
         ▼                          │
┌──────────────────────────────────────────────────────┐
│                   ReviewerProfile                    │
│ ──────────────────────────────────────────────────── │
│ id                    │ homeOrganizationId ◄────────┘
│ userId ───────────────┘ reviewerType
│ selectionStatus         isLeadQualified
│ yearsExperience         reviewsCompleted
│ currentPosition         professionalBio
└──────────────────────────────────────────────────────┘
         │
         │ 1:N relationships
         │
    ┌────┴────┬─────────┬────────────┬──────────┐
    ▼         ▼         ▼            ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Expertise│ │Language│ │Certif. │ │Avail.  │ │  COI   │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

### Key Models

#### ReviewerProfile
- **userId**: Link to User entity
- **homeOrganizationId**: Home ANSP organization
- **reviewerType**: NOMINATED | SELECTED
- **selectionStatus**: NOMINATED | UNDER_REVIEW | SELECTED | INACTIVE | WITHDRAWN | REJECTED
- **isLeadQualified**: Can lead peer review teams
- **yearsExperience**: Years in aviation industry
- **reviewsCompleted**: Number of completed peer reviews

#### ReviewerExpertise
- **area**: One of 16 expertise areas (ATS, CNS, MET, etc.)
- **proficiencyLevel**: BASIC | COMPETENT | PROFICIENT | EXPERT
- **yearsExperience**: Years in this specific area
- **isPrimary**: Primary expertise designation

#### ReviewerLanguage
- **language**: EN | FR | PT | AR | ES
- **proficiency**: BASIC | INTERMEDIATE | ADVANCED | NATIVE
- **canConductInterviews**: Ability to conduct interviews
- **canWriteReports**: Ability to write reports

#### ReviewerAvailability
- **startDate / endDate**: Availability period
- **availabilityType**: AVAILABLE | TENTATIVE | UNAVAILABLE | ON_ASSIGNMENT
- **isRecurring**: For recurring patterns

#### ReviewerCOI (Conflict of Interest)
- **organizationId**: Organization with conflict
- **coiType**: EMPLOYMENT | FINANCIAL | CONTRACTUAL | PERSONAL | PREVIOUS_REVIEW | OTHER
- **isActive**: Current active status

## Scoring Algorithm

### Overview

The matching algorithm scores reviewers (0-100 points) across four dimensions:

| Dimension | Max Points | Weight |
|-----------|------------|--------|
| Expertise | 40 | 40% |
| Language | 25 | 25% |
| Availability | 25 | 25% |
| Experience | 10 | 10% |

### Expertise Scoring (40 points max)

```typescript
// Required expertise: up to 30 points
// - Points per area = 30 / requiredAreas.length
// - Multiplied by proficiency: BASIC=0.6, COMPETENT=0.8, PROFICIENT=1.0, EXPERT=1.2

// Preferred expertise: up to 10 bonus points
// - Points per area = 10 / preferredAreas.length
// - Same proficiency multiplier

score = min(requiredScore + preferredScore, 40)
```

### Language Scoring (25 points max)

```typescript
// Per required language:
// - Base: 60% of points for having the language
// - Proficiency bonus: 25% × proficiency multiplier
// - Interview capability: 15% bonus

// Proficiency multipliers:
// BASIC=0.25, INTERMEDIATE=0.5, ADVANCED=0.8, NATIVE=1.0
```

### Availability Scoring (25 points max)

```typescript
// Coverage = available days / total review days
// - AVAILABLE days count as 1.0
// - TENTATIVE days count as 0.5
// - Other types count as 0

score = coverage × 25
```

### Experience Scoring (10 points max)

```typescript
// Years bonus (0-5 points):
// - 5 years = 1 point
// - 10 years = 3 points
// - 15+ years = 5 points

// Reviews bonus (0-5 points):
// - 2 reviews = 1 point
// - 5 reviews = 3 points
// - 10+ reviews = 5 points
```

## COI Rules

### Hard Conflicts (Cannot Assign)

| Type | Description |
|------|-------------|
| EMPLOYMENT | Current or recent employment at target org |
| FINANCIAL | Financial interest in target org |
| Home Org | Reviewer's home organization = target |

### Soft Conflicts (Can Assign with Waiver)

| Type | Description |
|------|-------------|
| CONTRACTUAL | Contractual relationship |
| PERSONAL | Personal relationship |
| PREVIOUS_REVIEW | Recently reviewed this org |
| OTHER | Other declared conflicts |

## API Reference

### Matching Functions

#### findMatchingReviewers(criteria, allReviewers)

Find and rank all matching reviewers for given criteria.

```typescript
const criteria: MatchingCriteria = {
  targetOrganizationId: "org_123",
  requiredExpertise: ["ATS", "CNS", "MET"],
  preferredExpertise: ["SMS_RISK"],
  requiredLanguages: ["EN", "FR"],
  reviewStartDate: new Date("2026-03-01"),
  reviewEndDate: new Date("2026-03-05"),
  teamSize: 3,
  excludeReviewerIds: ["reviewer_456"],
};

const results = findMatchingReviewers(criteria, reviewers);
// Returns: MatchResult[] sorted by eligibility and score
```

#### buildOptimalTeam(criteria, candidates)

Build optimal team from candidates using greedy algorithm.

```typescript
const teamResult = buildOptimalTeam(criteria, candidates);
// Returns: TeamBuildResult with team, coverage report, warnings
```

### Scoring Functions

```typescript
import {
  scoreExpertise,
  scoreLanguage,
  scoreAvailability,
  scoreExperience,
  calculateTotalScore,
} from "@/lib/reviewer/scoring";

// Score individual dimensions
const expertiseResult = scoreExpertise(expertise, required, preferred);
const languageResult = scoreLanguage(languages, required);
const availabilityResult = scoreAvailability(slots, startDate, endDate);
const experienceResult = scoreExperience(years, reviews);

// Calculate total
const total = calculateTotalScore(expertise, language, availability, experience);
```

## Components

### Reviewer Management

| Component | Purpose |
|-----------|---------|
| `ReviewerDirectory` | List view with search/filter |
| `ReviewerCard` | Card display for grid view |
| `ReviewerTable` | Table display with sorting |
| `ReviewerProfileView` | Full profile display |
| `ReviewerProfileForm` | Profile editing form |

### Expertise & Language

| Component | Purpose |
|-----------|---------|
| `ExpertiseSelector` | Multi-select expertise areas |
| `LanguageProficiencyManager` | Language proficiency management |

### Availability

| Component | Purpose |
|-----------|---------|
| `AvailabilityCalendar` | Calendar view with slots |
| `AvailabilitySlotDialog` | Add/edit availability periods |
| `AvailabilityLegend` | Color legend for statuses |
| `AvailabilitySummary` | Summary statistics |
| `BulkAvailability` | Bulk operations |

### Matching & Assignment

| Component | Purpose |
|-----------|---------|
| `ReviewerMatcher` | Main matching interface |
| `MatchScoreCard` | Individual match score display |
| `TeamCoverageReport` | Team coverage analysis |

## Configuration

### Constants (lib/reviewer/constants.ts)

```typescript
// Matching weights
export const MATCHING_WEIGHTS = {
  EXPERTISE: 40,
  LANGUAGE: 25,
  AVAILABILITY: 25,
  EXPERIENCE: 10,
};

// Team capacity
export const REVIEWER_CAPACITY = {
  MIN_TEAM_SIZE: 2,
  MAX_TEAM_SIZE: 5,
  IDEAL_TEAM_SIZE: 3,
};

// Qualification requirements
export const QUALIFICATION_REQUIREMENTS = {
  MIN_YEARS_EXPERIENCE: 5,
  MIN_REVIEWS_FOR_LEAD: 2,
  MIN_EXPERTISE_AREAS: 2,
};
```

## Usage Examples

### Finding Reviewers for a Peer Review

```typescript
import { findMatchingReviewers, buildOptimalTeam } from "@/lib/reviewer/matching";

// Define criteria
const criteria = {
  targetOrganizationId: "senegalese-ansp",
  requiredExpertise: ["ATS", "CNS", "SMS_RISK"],
  requiredLanguages: ["EN", "FR"],
  reviewStartDate: new Date("2026-03-15"),
  reviewEndDate: new Date("2026-03-20"),
  teamSize: 3,
};

// Find all matching reviewers
const matches = findMatchingReviewers(criteria, allReviewers);

// Build optimal team
const { team, coverageReport, warnings } = buildOptimalTeam(criteria, matches);

// Check coverage
if (coverageReport.expertiseCoverage < 1) {
  console.warn("Missing expertise:", coverageReport.expertiseMissing);
}

if (!coverageReport.hasLeadQualified) {
  console.warn("Team needs a lead-qualified reviewer");
}
```

### Checking COI Before Assignment

```typescript
import { canAssignReviewer } from "@/lib/reviewer/matching";

const { canAssign, reasons } = canAssignReviewer(reviewer, criteria);

if (!canAssign) {
  console.error("Cannot assign:", reasons);
}
```

## Internationalization

The module supports English (EN) and French (FR). All text is managed through next-intl:

```typescript
import { useTranslations } from "next-intl";

// In component
const t = useTranslations("reviewer");

// Usage
t("profile.title")       // "Profile Information" | "Informations du profil"
t("status.SELECTED")     // "Selected" | "Sélectionné"
t("matching.findMatches") // "Find Matches" | "Rechercher"
```

## Testing

### Running Tests

```bash
# Run all reviewer tests
npm run test src/__tests__/unit/reviewer

# Run with coverage
npm run test:coverage
```

### Test Files

| File | Purpose |
|------|---------|
| `matching.test.ts` | Matching algorithm tests |
| `scoring.test.ts` | Scoring function tests |
| `coi.test.ts` | COI checking tests |
| `translations.test.ts` | Bilingual translation tests |

## Seeding Demo Data

```bash
# Seed 99 demo reviewers
npx tsx prisma/seed-reviewers.ts

# Output:
# - 45 selected reviewers
# - 54 nominated reviewers
# - Distributed expertise areas
# - All with EN+FR
# - Various certifications
# - Random availability
# - Some COI entries
```

## Files Reference

```
src/
├── lib/
│   └── reviewer/
│       ├── index.ts          # Module exports
│       ├── constants.ts      # Configuration constants
│       ├── labels.ts         # Expertise/language labels
│       ├── scoring.ts        # Scoring functions
│       └── matching.ts       # Matching algorithm
├── types/
│   └── reviewer.ts           # TypeScript types
├── components/
│   └── features/
│       └── reviewer/
│           ├── index.ts              # Component exports
│           ├── availability-*.tsx    # Availability components
│           ├── match-score-card.tsx  # Score display
│           ├── team-coverage-report.tsx
│           └── reviewer-matcher.tsx
├── __tests__/
│   └── unit/
│       └── reviewer/
│           ├── matching.test.ts
│           ├── scoring.test.ts
│           ├── coi.test.ts
│           └── translations.test.ts
├── messages/
│   ├── en.json              # English translations
│   └── fr.json              # French translations
└── prisma/
    └── seed-reviewers.ts    # Demo data seeding
```

## Status

**Ready for March 2026 Training deployment**

- ✅ Data models implemented
- ✅ Scoring algorithm complete
- ✅ COI checking implemented
- ✅ Matching algorithm tested
- ✅ UI components built
- ✅ Bilingual translations complete
- ✅ Unit tests passing
- ✅ Demo data seeder ready
