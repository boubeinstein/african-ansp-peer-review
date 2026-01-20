# CLAUDE.md - African ANSP Peer Review Programme

> Quick context for Claude Code. Read guiding docs for full details.

**Last Updated**: January 20, 2026  
**Sprint Status**: Training Demo Final Polish  
**Days to Training**: 13 days (Feb 2-5, 2026 - Dar es Salaam)

---

## Project Overview

**Purpose**: Enterprise PWA for ICAO-endorsed peer review mechanism among 54 African ANSPs.  
**Current State**: 95% Phase 1 complete, entering final polish phase  
**Target**: Feb 2-5, 2026 AFI Training → Q2 2026 Pilot Launch

---

## Implementation Status (January 20, 2026)

### ✅ COMPLETED MODULES (95%)

| Module | Components | Status |
|--------|------------|--------|
| **Authentication & RBAC** | Login, 11 roles, permissions | ✅ 100% |
| **Organization Management** | 54 ANSPs, CRUD, membership | ✅ 100% |
| **Dual Questionnaire System** | ANS (USOAP CMA) + SMS (CANSO SoE) | ✅ 100% |
| **Self-Assessment Module** | Response entry, scoring, submission | ✅ 100% |
| **Reviewer Profile Module** | 99 reviewers, COI, matching algorithm | ✅ 100% |
| **Team Assignment Wizard** | 3-step flow, role assignment | ✅ 100% |
| **Findings Management** | CRUD, severity, status workflow | ✅ 100% |
| **CAP Workflow** | 6-stage status, verification, overdue tracking | ✅ 100% |
| **Review Reports** | Data aggregation, PDF export, summaries | ✅ 100% |
| **Training Module** | 6 modules, detail views, toggle preference | ✅ 100% |
| **Settings Page** | Profile, preferences, notifications, security | ✅ 100% |
| **Demo Data** | Reviews, findings, CAPs for 5 teams | ✅ 100% |

### 🔵 REMAINING TASKS (5%)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Bug fix: French "Français" Unicode | P0 | Low | 🔵 Fix Ready |
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

---

## Key Domain Models

### Dual Questionnaire System
| Type | Framework | Questions |
|------|-----------|-----------|
| `ANS_USOAP_CMA` | ICAO 2024 USOAP CMA | 851 PQs, 9 audit areas |
| `SMS_CANSO_SOE` | CANSO SoE 2024 | 13 study areas, 5 maturity levels |

### 11 User Roles (RBAC)
`SUPER_ADMIN` > `SYSTEM_ADMIN` > `STEERING_COMMITTEE` > `PROGRAMME_COORDINATOR` >
`LEAD_REVIEWER` > `PEER_REVIEWER` > `OBSERVER` > `ANSP_ADMIN` > `SAFETY_MANAGER` > 
`QUALITY_MANAGER` > `STAFF`

### Finding & CAP Workflow
```
Finding: OPEN → IN_PROGRESS → CLOSED → VERIFIED
CAP:     DRAFT → SUBMITTED → ACCEPTED → IMPLEMENTED → VERIFIED → CLOSED
                         ↘ REJECTED (back to DRAFT)
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
| Training | `/training` | ✅ (toggleable) |
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
npm run dev                    # Start dev server

# Database
npx prisma studio             # Open Prisma Studio
npx prisma migrate dev        # Run migrations
npm run db:seed               # Seed base data
npm run db:seed:demo          # Seed demo data
npm run db:seed:training      # Seed training modules

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
| `prisma/schema.prisma` | Database schema (1016 lines) |
| `DATABASE_SCHEMA.md` | Schema documentation |

---

*Last Updated: January 20, 2026 | Sprint: Training Demo Final Polish*
