# CLAUDE.md - African ANSP Peer Review Programme

> Quick context for Claude Code. Read guiding docs for full details.

**Last Updated**: January 20, 2026  
**Sprint Status**: Training Demo Final Polish  
**Days to Training**: 46 days (March 23-26, 2026 - Dar es Salaam, Tanzania)

---

## Project Overview

**Purpose**: Enterprise PWA for ICAO-endorsed peer review mechanism among African Air Navigation Service Providers and Civil Aviation Authorities.

**Programme Scope**:
- **Current Participants**: 20 ANSPs/CAAs organized into 5 regional teams
- **Future Expansion**: Open to additional African ANSPs/CAAs
- **Note**: ASECNA (1 ANSP) serves 18 member states; some member states like Rwanda CAA and Madagascar CAA participate separately

**Current State**: 95% Phase 1 complete, entering final polish phase  
**Target**: March 23-26, 2026 AFI Training → Q2 2026 Pilot Launch

---

## Programme Context

### Key Stakeholders
- **Steering Committee**: ASECNA (Chair), ATNS (Vice-Chair), CANSO (Secretariat), ICAO
- **International Partners**: ICAO, CANSO, AFCAC

### Regional Team Structure (5 Teams, 20 ANSPs/CAAs)

| Team | Region | Composition |
|------|--------|-------------|
| Team 1 | ESAF | 4 ANSPs including KCAA (Kenya) |
| Team 2 | ESAF | 4 ANSPs including TCAA (Tanzania), Rwanda CAA |
| Team 3 | WACAF | 4 ANSPs including NAMA (Nigeria) |
| Team 4 | WACAF | 4 ANSPs including ASECNA, Madagascar CAA |
| Team 5 | Northern | 4 ANSPs including ONDA (Morocco) |

### 2026 Timeline
- **March 23-26**: AFI Peer Reviewers' Refresher Training (Dar es Salaam)
- **Q1-Q2**: Pilot peer reviews to validate tools
- **Q2**: Official programme launch
- **Q3-Q4**: First cycle of peer reviews

---

## Implementation Status (January 20, 2026)

### ✅ COMPLETED MODULES (95%)

| Module | Components | Status |
|--------|------------|--------|
| **Authentication & RBAC** | Login, 11 roles, permissions | ✅ 100% |
| **Organization Management** | ANSPs/CAAs CRUD, membership | ✅ 100% |
| **Dual Questionnaire System** | ANS (USOAP CMA) + SMS (CANSO SoE) | ✅ 100% |
| **Self-Assessment Module** | Response entry, scoring, submission | ✅ 100% |
| **Reviewer Profile Module** | 99 reviewers, COI, matching algorithm | ✅ 100% |
| **Team Assignment Wizard** | 3-step flow, role assignment, COI filtering | ✅ 100% |
| **Findings Management** | CRUD, severity, status workflow | ✅ 100% |
| **CAP Workflow** | 6-stage status, verification, overdue tracking | ✅ 100% |
| **Review Reports** | Data aggregation, PDF export, summaries | ✅ 100% |
| **Training Module** | 6 modules (M0-M5), detail views, toggle preference | ✅ 100% |
| **Settings Page** | Profile, preferences, notifications, security, org, admin | ✅ 100% |
| **Demo Data** | Reviews, findings, CAPs for 5 regional teams | ✅ 100% |

### 🔵 REMAINING TASKS (5%)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Bug fix: French "Français" Unicode | P0 | Low | 🔵 Fix Ready |
| Enhanced Sign-In/Sign-Up Pages | P1 | Medium | 🔵 Prompts Ready |
| End-to-end workflow testing | P0 | Medium | 🔵 Planned |
| Documentation/walkthrough | P1 | Low | 🔵 Planned |
| Production verification | P0 | Low | 🔵 Planned |

### Known Bugs

1. **French Language Display**: Language dropdown shows "Franlu00E7ais" instead of "Français"
   - Location: `src/components/features/settings/preferences-settings.tsx`
   - Fix: Replace escaped Unicode with actual "ç" character

---

## Tech Stack

```
Next.js 14+ (App Router) | TypeScript 5.x (strict) | Prisma + PostgreSQL
tRPC | Zustand | TanStack Query | shadcn/ui + Radix UI + Tailwind CSS
NextAuth.js v5 | next-intl (EN/FR bilingual)
```

---

## Critical Conventions

### 1. ALWAYS Bilingual (EN/FR)
```tsx
// ❌ Never hardcode text
<Button>Submit</Button>

// ✅ Always use translations
<Button>{t('common.actions.submit')}</Button>
```
- Update BOTH `messages/en.json` AND `messages/fr.json`
- Use actual characters (Français) not escaped Unicode (\u00E7)

### 2. TypeScript Strict Mode
```typescript
// ❌ No 'any' types
const data: any = {};

// ✅ Explicit types
interface AssessmentResponse {
  id: string;
  score: number;
}
```

### 3. Auth Pattern (NO useSession in client components)
```typescript
// ❌ Don't use useSession in client components
const { data: session } = useSession();

// ✅ Pass from server component as props
// Server component (page.tsx):
const session = await auth();
return <ClientComponent userId={session.user.id} userRole={session.user.role} />;
```

### 4. tRPC Procedures Pattern
```typescript
export const featureRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listSchema)
    .query(async ({ ctx, input }) => { /* ... */ }),
  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

### 5. Component Organization
```
src/components/features/{feature}/
├── {feature}-list.tsx
├── {feature}-card.tsx
├── {feature}-form.tsx
├── {feature}-detail.tsx
└── index.ts (barrel export)
```

---

## Key Domain Models

### Dual Questionnaire System
| Type | Framework | Structure |
|------|-----------|-----------|
| `ANS_USOAP_CMA` | AFI ANSP Peer Review ANS Questionnaire | PQs across 7 review areas (ATS, FPD, AIS, MAP, MET, CNS, SAR) |
| `SMS_CANSO_SOE` | CANSO SoE 2024 | 4 components, 13 study areas, 5 maturity levels (A-E) |

### AAPRP Review Areas (Programme Manual Section 1.6)
| Code | Review Area | Questionnaire Source |
|------|-------------|---------------------|
| ATS | Air Traffic Services | ANS (ATM PQs) |
| FPD | Flight Procedures Design | ANS (PANS-OPS/IFPD PQs) |
| AIS | Aeronautical Information Service | ANS (AIS PQs) |
| MAP | Aeronautical Charts | ANS (Chart PQs) |
| MET | Meteorological Service | ANS (MET PQs) |
| CNS | Communications, Navigation, Surveillance | ANS (CNS PQs) |
| SAR | Search and Rescue | ANS (SAR PQs) |
| SMS | Safety Management System | CANSO SoE |

> **Note**: The `USOAPAuditArea` enum (LEG, ORG, PEL, OPS, AIR, AIG, ANS, AGA, SSP) is retained as ICAO reference metadata. The primary classification for peer reviews uses `ANSReviewArea`.

### CANSO SoE SMS Components
| Component | Study Areas |
|-----------|-------------|
| Safety Policy & Objectives | SA 1.1 - SA 1.5 |
| Safety Risk Management | SA 2.1 - SA 2.2 |
| Safety Assurance | SA 3.1 - SA 3.3 |
| Safety Promotion | SA 4.1 - SA 4.2 |

### SMS Maturity Levels
| Level | Name (EN) | Name (FR) | Score Range |
|-------|-----------|-----------|-------------|
| A | Initial/Ad-hoc | Initial/Ad hoc | 0-20% |
| B | Defined/Documented | Défini/Documenté | 21-40% |
| C | Implemented/Measured | Mis en œuvre/Mesuré | 41-60% |
| D | Managed/Controlled | Géré/Contrôlé | 61-80% |
| E | Optimizing/Leading | Optimisation/Leader | 81-100% |

### 11 User Roles (RBAC)
```
SUPER_ADMIN > SYSTEM_ADMIN > STEERING_COMMITTEE > PROGRAMME_COORDINATOR >
LEAD_REVIEWER > PEER_REVIEWER > OBSERVER > ANSP_ADMIN > SAFETY_MANAGER > 
QUALITY_MANAGER > STAFF
```

### Finding Types & Severity
| Type | Description | CAP Required |
|------|-------------|--------------|
| OBSERVATION | Minor issue | Optional |
| CONCERN | Potential non-compliance | Recommended |
| NON_CONFORMITY | Clear non-compliance | Required |

| Severity | Response Time |
|----------|---------------|
| CRITICAL | Immediate action |
| MAJOR | 30 days |
| MINOR | 90 days |

### Finding & CAP Workflow
```
Finding: OPEN → IN_PROGRESS → CLOSED → VERIFIED

CAP:     DRAFT → SUBMITTED → ACCEPTED → IMPLEMENTED → VERIFIED → CLOSED
                         ↘ REJECTED (back to DRAFT with feedback)
```

---

## File Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/           # Login, register
│   │   ├── (dashboard)/      # Protected pages
│   │   │   ├── dashboard/
│   │   │   ├── questionnaires/
│   │   │   ├── assessments/
│   │   │   ├── reviews/
│   │   │   ├── findings/
│   │   │   ├── caps/
│   │   │   ├── reviewers/
│   │   │   ├── organizations/
│   │   │   ├── training/
│   │   │   └── settings/
│   │   └── layout.tsx
│   └── api/
│       └── trpc/
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── features/             # Feature components
│   │   ├── assessment/
│   │   ├── questionnaire/
│   │   ├── reviewer/
│   │   ├── review/
│   │   ├── finding/
│   │   ├── cap/
│   │   ├── training/
│   │   ├── settings/
│   │   └── auth/
│   └── layout/               # Sidebar, header, etc.
├── server/
│   └── trpc/
│       └── routers/          # tRPC routers
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   └── trpc/
├── hooks/
├── stores/
└── types/
```

---

## Sidebar Navigation Structure

| Page | Route | Status |
|------|-------|--------|
| Dashboard | `/dashboard` | ✅ |
| Questionnaires | `/questionnaires` | ✅ |
| Assessments | `/assessments` | ✅ |
| Peer Reviews | `/reviews` | ✅ |
| Findings | `/findings` | ✅ |
| CAPs | `/caps` | ✅ |
| Reviewers | `/reviewers` | ✅ |
| Organizations | `/organizations` | ✅ |
| Training | `/training` | ✅ (user-toggleable) |
| Settings | `/settings` | ✅ |

---

## Quality Gates (Run Before Every Commit)

```bash
npm run typecheck   # Must pass (0 errors)
npm run lint        # Must pass (0 errors)
npm run build       # Must succeed
```

---

## Key Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)

# Database
npx prisma studio              # Open Prisma Studio
npx prisma migrate dev         # Run migrations
npx prisma db push             # Push schema changes
npm run db:seed                # Seed base data (organizations, users)
npm run db:seed:demo           # Seed demo data (reviews, findings, CAPs)
npm run db:seed:training       # Seed training modules (M0-M5)

# Quality
npm run typecheck              # TypeScript check
npm run lint                   # ESLint
npm run lint:fix               # Auto-fix lint issues

# Git
git checkout feature/peer-review-module
git add -A && git commit -m "feat(scope): description"
git push origin feature/peer-review-module
```

---

## Guiding Documents

| Document | Purpose |
|----------|---------|
| `REQUIREMENTS_v4.md` | Enterprise requirements, ICAO/CANSO alignment |
| `STRATEGIC_ROADMAP_v4.md` | Timeline, phases, milestones |
| `TASKS_v4.md` | Current sprint, remaining tasks |
| `DATABASE_SCHEMA.md` | Schema documentation |
| `prisma/schema.prisma` | Database schema (1016 lines) |

---

## Reference Documents

### ICAO Standards
- **ICAO EB 2024/22**: 2024 Edition of USOAP CMA Protocol Questions
- **ICAO EB 2025/8**: Comparison between 2024 and 2020 editions
- **ICAO Doc 9859**: Safety Management Manual
- **ICAO Annex 19**: Safety Management

### CANSO Standards
- **CANSO Standard of Excellence in SMS 2024**: SMS questionnaire framework

### Programme Documents
- **AASPG/1-IP/19**: African ANSP Peer Review Programme Status
- **AFI Peer Review Manual** (EN/FR): Programme procedures

---

## Aviation Terminology Quick Reference

| Term | Definition |
|------|------------|
| ANSP | Air Navigation Service Provider |
| CAA | Civil Aviation Authority |
| SMS | Safety Management System |
| CAP | Corrective Action Plan |
| SoE | Standard of Excellence (CANSO) |
| USOAP CMA | Universal Safety Oversight Audit Programme - Continuous Monitoring Approach |
| AFI | Africa-Indian Ocean Region |
| PQ | Protocol Question |
| PPQ | Priority Protocol Question |
| EI | Effective Implementation (score) |
| CE | Critical Element (CE-1 to CE-8) |
| SSP | State Safety Programme |
| COI | Conflict of Interest |
| ASECNA | Agency for Aerial Navigation Safety in Africa and Madagascar (18 member states) |
| WACAF | Western and Central Africa |
| ESAF | Eastern and Southern Africa |
| ANSReviewArea | The 8 AAPRP review areas: ATS, FPD, AIS, MAP, MET, CNS, SAR, SMS |

---

*Last Updated: January 20, 2026 | Sprint: Training Demo Final Polish*
