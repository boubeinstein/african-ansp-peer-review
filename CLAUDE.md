# CLAUDE.md - African ANSP Peer Review Programme

> Quick context for Claude Code. Read guiding docs in `/docs` for full details.

## Project Overview

**Purpose**: Enterprise PWA for ICAO-endorsed peer review mechanism among 54 African ANSPs.  
**Target**: Feb 2-5, 2026 AFI Training (Dar es Salaam) → Q2 2026 Pilot Launch  
**Current State**: ~85% Phase 1 complete, implementing Findings & CAP workflow

## Tech Stack

```
Next.js 14+ (App Router) | TypeScript 5.x (strict) | Prisma + PostgreSQL
tRPC | Zustand | TanStack Query | shadcn/ui + Radix UI + Tailwind CSS
NextAuth.js v5 | next-intl (EN/FR bilingual)
```

## Critical Conventions

### 1. ALWAYS Bilingual (EN/FR)
```tsx
// ❌ Never hardcode text
<Button>Submit</Button>

// ✅ Always use translations
<Button>{t('common.actions.submit')}</Button>
```
- Update BOTH `messages/en.json` AND `messages/fr.json`
- Aviation terms: verify correct French terminology

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

### 3. tRPC Procedures Pattern
```typescript
// src/server/trpc/routers/{feature}.ts
export const featureRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listSchema)
    .query(async ({ ctx, input }) => { /* ... */ }),
  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

### 4. Component Organization
```
src/components/features/{feature}/
├── {feature}-list.tsx       # List with filters
├── {feature}-card.tsx       # Card view
├── {feature}-form.tsx       # Create/edit form
├── {feature}-detail.tsx     # Detail view
└── {feature}-badge.tsx      # Status/type badges
```

## Key Domain Models

### Dual Questionnaire System
| Type | Framework | Questions |
|------|-----------|-----------|
| `ANS_USOAP_CMA` | ICAO 2024 USOAP CMA | 851 PQs, 9 audit areas |
| `SMS_CANSO_SOE` | CANSO SoE 2024 | 13 study areas, 5 maturity levels |

### Assessment Scoring
```typescript
// ICAO Effective Implementation (ANS)
EI = (Satisfactory PQs / Applicable PQs) × 100%

// CANSO SMS Maturity (SMS)
Levels: A (Initial) → B (Defined) → C (Managed) → D (Resilient) → E (Excellence)
```

### 11 User Roles (RBAC)
`SUPER_ADMIN` > `SYSTEM_ADMIN` > `STEERING_COMMITTEE` > `PROGRAMME_COORDINATOR` >
`LEAD_REVIEWER` > `PEER_REVIEWER` > `OBSERVER` > `ANSP_ADMIN` > `SAFETY_MANAGER` > 
`QUALITY_MANAGER` > `STAFF`

### Finding & CAP Workflow
```
Finding: OPEN → CAP_REQUIRED → CAP_SUBMITTED → CAP_ACCEPTED → IN_PROGRESS → VERIFICATION → CLOSED
CAP:     DRAFT → SUBMITTED → ACCEPTED → IN_PROGRESS → COMPLETED → VERIFIED → CLOSED
                         ↘ REJECTED (back to DRAFT)
```

## Current Sprint (Jan 18 - Feb 1, 2026)

### P0 - Must Complete for Training
1. ✅ Findings tRPC Router (Prompt 1) - DONE
2. ✅ Findings List Page (Prompt 2) - DONE  
3. ✅ Finding Creation Form (Prompt 3) - DONE
4. ✅ CAP tRPC Router (Prompt 4A) - DONE
5. ✅ CAP Form & List Components (Prompt 4B) - DONE
6. 🔵 **CAP Workflow UI & Status Management (Prompt 4C)** - CURRENT
7. 🔵 Review Report Generation (Prompt 5-6)
8. 🔵 Demo Data & Walkthrough

## File Structure

```
src/
├── app/[locale]/(dashboard)/      # Pages (protected routes)
│   ├── findings/                  # Finding pages
│   ├── caps/                      # CAP pages  
│   ├── reviews/                   # Review pages
│   └── assessments/               # Assessment pages
├── components/features/           # Feature components
│   ├── finding/                   # Finding components
│   ├── cap/                       # CAP components
│   └── review/                    # Review components
├── server/trpc/routers/           # API routes
│   ├── finding.ts
│   ├── cap.ts
│   └── review.ts
└── messages/{en,fr}.json          # Translations
```

## Quality Gates (Run Before Every Commit)

```bash
npm run typecheck   # Must pass (0 errors)
npm run lint        # Must pass (0 errors)
npm run build       # Must succeed
```

## Key Commands

```bash
# Development
npm run dev                    # Start dev server

# Database
npx prisma studio             # Open Prisma Studio
npx prisma migrate dev        # Run migrations
npm run db:seed               # Seed data (99 reviewers, 161 questions)

# Git
git checkout feature/peer-review-module
git add -A && git commit -m "feat(cap): implement workflow UI"
git push origin feature/peer-review-module
```

## Guiding Documents (Read for Full Context)

| Document | Purpose |
|----------|---------|
| `docs/REQUIREMENTS_v3.md` | Enterprise requirements, ICAO/CANSO alignment |
| `docs/STRATEGIC_ROADMAP_v3.md` | Timeline, phases, milestones |
| `docs/TASKS_v3.md` | Current sprint, implementation prompts |
| `prisma/schema.prisma` | Database schema (1000+ lines) |
| `docs/DATABASE_SCHEMA.md` | Schema documentation |

## Aviation Terminology Quick Reference

| Abbrev | Full Form |
|--------|-----------|
| ANSP | Air Navigation Service Provider |
| CAP | Corrective Action Plan |
| CE | Critical Element (CE-1 to CE-8) |
| EI | Effective Implementation score |
| PQ | Protocol Question |
| SMS | Safety Management System |
| SoE | Standard of Excellence (CANSO) |
| USOAP CMA | Universal Safety Oversight Audit Programme - Continuous Monitoring Approach |

## Best Practices for This Project

1. **Keep changes small**: <200 lines per commit for reliability
2. **Test incrementally**: Run typecheck/lint after each change
3. **Check existing patterns**: Look at similar components before creating new ones
4. **Consider COI**: Conflict of Interest filtering in reviewer assignments
5. **Evidence management**: Files stored in Supabase, linked via Document model
6. **Responsive design**: shadcn/ui components, test mobile views

## Roberts FIR Context

Boubacar's ANSP (Roberts FIR) covers Guinea, Liberia, and Sierra Leone.  
Part of Team 3: NAMA (Nigeria), GCAA (Ghana) in WACAF region.

---
*Last Updated: January 18, 2026 | Sprint: Peer Review Module Completion*
