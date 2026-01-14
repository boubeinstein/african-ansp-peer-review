# Questionnaire System Documentation

## Overview

The African ANSP Peer Review Platform implements a dual questionnaire system supporting two complementary assessment frameworks:

1. **ANS USOAP CMA 2024** - ICAO Universal Safety Oversight Audit Programme
2. **SMS CANSO SoE 2024** - CANSO Standard of Excellence for Safety Management Systems

Both frameworks are designed to assess and improve aviation safety oversight and management across African ANSPs.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ ANS Browser  │  │ SMS Browser  │  │ Question Detail View │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Admin Import Interface                       │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        API Layer (tRPC)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ questionnaire│  │   question   │  │        admin         │  │
│  │    router    │  │    router    │  │    questionnaire     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Prisma ORM                             │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐   │  │
│  │  │Questionnaire│ │  Question   │ │ ICAOReference     │   │  │
│  │  └─────────────┘ └─────────────┘ └───────────────────┘   │  │
│  │  ┌─────────────┐ ┌─────────────┐                         │  │
│  │  │  Category   │ │  Response   │                         │  │
│  │  └─────────────┘ └─────────────┘                         │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     PostgreSQL Database                         │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── lib/questionnaire/
│   ├── constants.ts      # All static data (audit areas, CEs, SMS components)
│   ├── types.ts          # TypeScript interfaces and Zod schemas
│   └── import-parser.ts  # JSON/CSV import parsing logic
├── components/features/questionnaire/
│   ├── ans/              # ANS browser components
│   │   ├── ans-browser.tsx
│   │   ├── audit-area-filter.tsx
│   │   ├── critical-element-filter.tsx
│   │   └── pq-list.tsx
│   ├── sms/              # SMS browser components
│   │   ├── sms-browser.tsx
│   │   ├── component-tabs.tsx
│   │   ├── maturity-table.tsx
│   │   └── study-area-accordion.tsx
│   └── question-detail-modal.tsx
├── server/trpc/routers/
│   ├── questionnaire.ts  # Questionnaire CRUD operations
│   ├── question.ts       # Question queries with pagination
│   └── admin/
│       └── questionnaire.ts  # Admin import operations
└── app/[locale]/(dashboard)/
    ├── questionnaires/
    │   ├── page.tsx      # Questionnaire type selection
    │   ├── ans/page.tsx  # ANS browser page
    │   ├── sms/page.tsx  # SMS browser page
    │   └── question/[id]/page.tsx  # Question detail
    └── admin/questionnaires/
        ├── page.tsx      # Admin list view
        └── import/page.tsx  # Import wizard
```

## Data Models

### Questionnaire

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| code | String | Unique code (e.g., "USOAP_CMA_2024") |
| type | Enum | ANS_USOAP_CMA or SMS_CANSO_SOE |
| version | String | Version identifier |
| titleEn | String | English title |
| titleFr | String | French title |
| effectiveDate | DateTime | When questionnaire becomes effective |
| expiryDate | DateTime? | When questionnaire expires (optional) |
| isActive | Boolean | Whether questionnaire is active |

### QuestionnaireCategory

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| questionnaireId | String | Foreign key to Questionnaire |
| code | String | Category code (e.g., "AGA") |
| nameEn | String | English name |
| nameFr | String | French name |
| auditArea | Enum? | For ANS: LEG, ORG, PEL, OPS, AIR, AIG, ANS, AGA, SSP |
| criticalElement | Enum? | For ANS: CE_1 through CE_8 |
| smsComponent | Enum? | For SMS: SAFETY_POLICY_OBJECTIVES, etc. |
| studyArea | Enum? | For SMS: SA_1_1, SA_1_2, etc. |
| sortOrder | Int | Display order |

### Question

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| questionnaireId | String | Foreign key to Questionnaire |
| categoryId | String | Foreign key to Category |
| pqNumber | String? | Protocol Question number (e.g., "AGA 1.001") |
| questionTextEn | String | English question text |
| questionTextFr | String | French question text |
| guidanceEn | String? | English guidance for reviewers |
| guidanceFr | String? | French guidance for reviewers |
| auditArea | Enum? | Audit area (for ANS) |
| criticalElement | Enum? | Critical element (for ANS) |
| isPriorityPQ | Boolean | Is priority Protocol Question |
| requiresOnSite | Boolean | Requires on-site verification |
| pqStatus | Enum | NO_CHANGE, REVISED, NEW, MERGED, DELETED |
| smsComponent | Enum? | SMS component (for SMS) |
| studyArea | Enum? | Study area (for SMS) |
| maturityLevel | Enum? | Maturity level objective (for SMS) |
| responseType | Enum | SATISFACTORY_NOT, MATURITY_LEVEL, etc. |
| weight | Float | Question weight for scoring |
| sortOrder | Int | Display order |

### ICAOReference

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| questionId | String | Foreign key to Question |
| referenceType | Enum | CC, STD, RP, PANS, GM, Cir, SUPPS |
| document | String | Document identifier (e.g., "Annex 14") |
| chapter | String? | Chapter/section reference |
| description | String? | Reference description |

## API Endpoints

### tRPC Routes

#### Questionnaire Router (`/api/trpc/questionnaire.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | Query | List all questionnaires with pagination |
| `getById` | Query | Get single questionnaire by ID |
| `getByCode` | Query | Get questionnaire by code |
| `getActive` | Query | Get all active questionnaires |
| `getStats` | Query | Get questionnaire statistics |

#### Question Router (`/api/trpc/question.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | Query | List questions with filters and pagination |
| `getById` | Query | Get single question with ICAO references |
| `getByPqNumber` | Query | Get question by PQ number |
| `getFiltered` | Query | Get filtered questions for export |

#### Admin Questionnaire Router (`/api/trpc/admin.questionnaire.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `import` | Mutation | Import questionnaire from JSON/CSV |
| `validate` | Mutation | Validate import data before import |
| `delete` | Mutation | Soft delete (deactivate) questionnaire |
| `hardDelete` | Mutation | Permanently delete questionnaire |

### Query Parameters

#### Question List Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| questionnaireId | String | Filter by questionnaire |
| auditArea | Enum | Filter by audit area |
| criticalElement | Enum | Filter by critical element |
| smsComponent | Enum | Filter by SMS component |
| studyArea | Enum | Filter by study area |
| isPriorityPQ | Boolean | Filter priority PQs only |
| requiresOnSite | Boolean | Filter on-site required only |
| pqStatus | Enum | Filter by amendment status |
| search | String | Full-text search on question text |
| page | Number | Page number (default: 1) |
| pageSize | Number | Items per page (1-100, default: 20) |

## Scoring Methods

### ANS USOAP CMA - Effective Implementation (EI)

The EI score is calculated as:

```
EI = (Satisfactory PQs / Total Applicable PQs) × 100
```

- Each Protocol Question has a binary result: Satisfactory (S) or Not Satisfactory (NS)
- Not Applicable (NA) questions are excluded from the calculation
- Priority PQs may be weighted differently

### SMS CANSO SoE - Maturity Scoring

The SMS score uses a weighted average across components:

```
SMS Score = Σ (Component Score × Component Weight)
```

| Component | Weight |
|-----------|--------|
| Safety Policy and Objectives | 25% |
| Safety Risk Management | 30% |
| Safety Assurance | 25% |
| Safety Promotion | 20% |

Each question is scored on a 5-level maturity scale:

| Level | Name | Score |
|-------|------|-------|
| A | Informal | 1 |
| B | Defined | 2 |
| C | Managed | 3 |
| D | Resilient | 4 |
| E | Excellence | 5 |

## Filtering and Search

### ANS Browser

The ANS browser supports:
- **Multi-select audit area filter**: Select one or more of 9 audit areas
- **Multi-select critical element filter**: Select one or more of 8 critical elements
- **Priority PQ toggle**: Show only priority Protocol Questions
- **On-site required toggle**: Show only questions requiring on-site verification
- **Full-text search**: Search by PQ number or question text
- **Amendment status badge**: Visual indicator for new/revised questions

### SMS Browser

The SMS browser supports:
- **Component tabs**: Navigate between 4 SMS components
- **Study area accordion**: Expand study areas within each component
- **Maturity level table**: View objectives by maturity level
- **Transversal area indicators**: SPM, HP, CI cross-cutting areas

## Internationalization

All content supports English (EN) and French (FR):
- Question text in both languages
- Guidance text in both languages
- Category and audit area names
- Critical element descriptions
- SMS component and study area names
- UI labels and navigation

Language is determined by:
1. URL locale parameter (`/en/` or `/fr/`)
2. User preference stored in profile
3. Browser language detection

## Admin Operations

### Import Workflow

1. **Select Type**: Choose ANS or SMS questionnaire type
2. **Upload File**: Upload JSON or CSV file
3. **Preview**: Review parsed data with validation
4. **Import**: Bulk insert into database

### Data Validation

The import process validates:
- Required fields present
- Valid enum values for areas/elements/components
- Unique PQ numbers
- Valid ICAO reference format
- UTF-8 encoding for bilingual text

### Bulk Operations

- **Deactivate**: Soft delete (preserves assessment data)
- **Delete**: Permanent removal (admin only)
- **Export**: Generate JSON/CSV for backup

## Performance Considerations

### Pagination

All list endpoints return paginated results:
- Default page size: 20
- Maximum page size: 100
- Cursor-based pagination for large datasets

### Indexing

Database indexes on:
- `questions.auditArea, criticalElement`
- `questions.smsComponent, studyArea`
- `questions.questionnaireId, pqNumber`
- `questions.questionTextEn, questionTextFr` (full-text)

### Caching

- Static constants cached at module level
- React Query caching for API responses
- Server-side rendering for initial data

## Testing

### Unit Tests

Location: `src/__tests__/questionnaire/`

- `constants.test.ts`: Tests for all static data
- `types.test.ts`: Tests for Zod validation schemas

### Running Tests

```bash
# Run all tests
npm run test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

## Related Documentation

- [Import Format Specification](./IMPORT_FORMAT.md)
- [API Reference](./API_REFERENCE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
