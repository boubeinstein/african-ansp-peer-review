# AAPRP Strategic Roadmap v4.1

## African ANSP Peer Review Programme - Development Roadmap

**Document Version:** 4.1
**Last Updated:** January 25, 2026
**Training Date:** March 23-26, 2026 (Dar es Salaam, Tanzania)
**Target Launch:** Q3 2026

---

## Executive Summary

The African ANSP Peer Review Programme (AAPRP) platform is being developed to facilitate aviation safety peer reviews among **20 participating Air Navigation Service Providers** in the AFI (Africa-Indian Ocean) region. These ANSPs are organized into **5 regional teams** for peer review activities. This roadmap outlines the development phases, milestones, and deliverables leading to the AFI Peer Reviewers' Refresher Training in March 2026 and subsequent production launch.

**Programme Scope:**
- 20 participating ANSPs across 5 regional teams
- ICAO USOAP CMA 2024 and CANSO Standard of Excellence frameworks
- Bilingual support (English/French)

**Key Dates:**
- ✅ Phase 1 Foundation: December 2025 - January 2026 (COMPLETE)
- 🔄 Phase 1.5 Enhanced Workflows: January - February 2026 (IN PROGRESS)
- 📅 Phase 2 Training Preparation: February - March 2026
- 📅 **AFI Training Event: March 23-26, 2026**
- 📅 Phase 3 Pilot Operations: April - June 2026
- 📅 Phase 4 Production Launch: July - October 2026

---

## Participating Organizations

### Regional Team Structure

| Team | ANSPs | Region |
|------|-------|--------|
| **Team 1** | ASECNA, ATNS, CAAB, ESWACAA | Multi-state, Southern, Botswana, Eswatini |
| **Team 2** | KCAA, TCAA, UCAA, RCAA, BCAA | Kenya, Tanzania, Uganda, Rwanda, Burundi |
| **Team 3** | NAMA, GCAA, RFIR | Nigeria, Ghana, Roberts FIR (Guinea/Liberia/Sierra Leone) |
| **Team 4** | ADM, MCAA, ACM, CAAZ, ZACL | Madagascar, Malawi, Mozambique, Zimbabwe, Zambia |
| **Team 5** | DGAC, OACA, ANAC | DRC, Tunisia, Angola |

**Total: 20 ANSPs across 5 regional teams**

---

## Progress Overview

```
PHASE 1   ████████████████████████████████████████ 100% ✅ COMPLETE
PHASE 1.5 ██████████████████░░░░░░░░░░░░░░░░░░░░░░  45% 🔄 IN PROGRESS
PHASE 2   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% → Feb-Mar 2026
PHASE 3   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% → Apr-Jun 2026
PHASE 4   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% → Jul-Oct 2026
```

---

## Phase 1: Foundation Complete ✅ (Dec 2025 - Jan 2026)

### Deliverables Achieved

| Deliverable | Completion | Notes |
|-------------|------------|-------|
| Authentication with 11-role RBAC | ✅ 100% | All roles functional |
| 20 ANSP organization profiles | ✅ 100% | Seeded with real data |
| Dual questionnaire system (ANS + SMS) | ✅ 100% | 163 protocol questions |
| Self-assessment with EI/maturity scoring | ✅ 100% | Auto-calculation working |
| Reviewer profiles with COI management | ✅ 100% | 40 demo reviewers seeded |
| Team assignment with matching algorithm | ✅ 100% | 3-step wizard |
| Findings management with workflow | ✅ 100% | Linked to PQs |
| CAP workflow (6-stage) | ✅ 100% | Full status transitions |
| Review reports with PDF export | ✅ 100% | Bilingual support |
| Training reference module | ✅ 100% | 6 modules (M0-M5) |
| Settings with user preferences | ✅ 100% | Theme, language, notifications |
| Demo data for training | ✅ 100% | 43 users, 20 organizations |
| Bilingual UI (EN/FR) | ✅ 100% | Complete translations |

---

## Phase 1.5: Enhanced Workflows 🔄 (Jan - Feb 2026)

### Objective
Implement enterprise-grade workflow enforcement to ensure proper documentation and procedural compliance during peer reviews.

### Deliverables

| Deliverable | Status | Target Date | Notes |
|-------------|--------|-------------|-------|
| Fieldwork Checklist with Validation | ✅ 100% | Jan 25, 2026 | 14 items, 3 phases |
| Document Status Workflow | ✅ 100% | Jan 25, 2026 | 6-stage workflow |
| Checklist-Document Integration | ✅ 100% | Jan 25, 2026 | Real-time validation |
| Checklist Validation Service | ✅ 100% | Jan 25, 2026 | 8 validation types |
| Override Capability with Audit | ✅ 100% | Jan 25, 2026 | Coordinator only |
| Unit Tests (Validation Service) | ✅ 100% | Jan 25, 2026 | 39 test cases |
| E2E Tests (Workflow) | ✅ 100% | Jan 25, 2026 | 37 test scenarios |
| Assessment RBAC Fixes | 🔄 90% | Jan 27, 2026 | Organization visibility |
| Notification System Enhancement | 📅 0% | Feb 5, 2026 | Email + in-app |
| Dashboard Analytics | 📅 0% | Feb 15, 2026 | KPIs, charts |
| Performance Optimization | 📅 0% | Feb 28, 2026 | Caching, lazy loading |
| Security Audit | 📅 0% | Mar 5, 2026 | Penetration testing |

### Detailed Timeline (8 Weeks to Training)

```
Week 1 (Jan 20-26) - Workflow Enhancement ✅
├── Mon-Tue: Fieldwork checklist schema & validation service
├── Wed-Thu: Document status workflow & tRPC routers
├── Fri-Sat: UI components & integration
└── Sun: Testing & documentation

Week 2 (Jan 27 - Feb 2) - RBAC & Bug Fixes
├── Mon-Tue: Assessment visibility RBAC fixes
├── Wed-Thu: Infinite loop fixes, edge cases
├── Fri: Code review & refactoring
└── Sat-Sun: Integration testing

Week 3 (Feb 3-9) - Notifications
├── Mon-Tue: Email notification service (Resend)
├── Wed-Thu: In-app notification system
├── Fri: Notification preferences
└── Sat-Sun: Testing all notification triggers

Week 4 (Feb 10-16) - Analytics Dashboard
├── Mon-Tue: Dashboard layout & KPI cards
├── Wed-Thu: Charts (EI trends, maturity levels)
├── Fri: Regional comparison views
└── Sat-Sun: Data aggregation optimization

Week 5 (Feb 17-23) - Performance & Polish
├── Mon-Tue: Database query optimization
├── Wed-Thu: Frontend performance (code splitting)
├── Fri: Caching strategy implementation
└── Sat-Sun: Load testing

Week 6 (Feb 24 - Mar 2) - Security & QA
├── Mon-Tue: Security audit preparation
├── Wed-Thu: Vulnerability scanning & fixes
├── Fri: Penetration testing
└── Sat-Sun: Security documentation

Week 7 (Mar 3-9) - Final Features & Fixes
├── Mon-Tue: Priority bug fixes from testing
├── Wed-Thu: UI/UX polish
├── Fri: Final feature freeze
└── Sat-Sun: Regression testing

Week 8 (Mar 10-16) - Training Preparation
├── Mon-Tue: Demo environment setup
├── Wed-Thu: Training materials finalization
├── Fri: Dry run with test users
└── Sat-Sun: Final adjustments

Week 9 (Mar 17-22) - Pre-Training
├── Mon-Tue: Production deployment
├── Wed-Thu: Data migration & verification
├── Fri: Final smoke testing
└── Sat-Sun: Travel to Dar es Salaam

Week 10 (Mar 23-26) - AFI TRAINING EVENT 🎯
├── Mon Mar 23: Day 1 - Introduction & Platform Overview
├── Tue Mar 24: Day 2 - Self-Assessment Workshop
├── Wed Mar 25: Day 3 - Peer Review Workflow
└── Thu Mar 26: Day 4 - Reporting & Next Steps
```

---

## Phase 2: Training Event (March 23-26, 2026)

### Training Agenda

| Day | Focus | Platform Features Used |
|-----|-------|----------------------|
| **Day 1** | Programme Introduction | Dashboard, Organization profiles, RBAC demo |
| **Day 2** | Self-Assessment Module | Questionnaire entry, Progress tracking, EI scoring |
| **Day 3** | Peer Review Process | Team assignment, Fieldwork checklist, Document workflow, Findings |
| **Day 4** | Reporting & CAP | Review reports, CAP workflow, Analytics, Q&A |

### Training Demo Capabilities

| Feature | Ready | Demo Scenario |
|---------|-------|---------------|
| Login and role-based access | ✅ | 11 roles with different permissions |
| Organization management | ✅ | View RFIR, ASECNA, KCAA profiles |
| Create self-assessment | ✅ | RFIR creates ANS assessment |
| Complete questionnaire responses | ✅ | Answer 10+ protocol questions |
| View EI scores and maturity levels | ✅ | See calculated scores |
| Create peer review | ✅ | ASECNA requests review |
| Assign review team | ✅ | 3-step wizard with COI filtering |
| **Fieldwork checklist workflow** | ✅ | Track all 14 items across phases |
| **Document upload & review** | ✅ | Upload, review, approve documents |
| **Validation enforcement** | ✅ | Show blocked items, upload to unlock |
| Create findings | ✅ | Link to protocol questions |
| Create CAPs | ✅ | 6-stage workflow demonstration |
| Generate review report | ✅ | PDF export in EN/FR |
| View training modules | ✅ | Reference M0-M5 content |
| Update user settings | ✅ | Language, theme, preferences |

### Demo User Accounts (43 Total)

| Role | Count | Example Account |
|------|-------|-----------------|
| Programme Coordinator | 1 | coordinator@aaprp.aero |
| System Admin | 1 | admin@aaprp.aero |
| Steering Committee | 1 | steering@aaprp.aero |
| Lead Reviewers | 20 | sekou.camara@lcaa.gov.lr (RFIR) |
| Peer Reviewers | 20 | boubacar.diallo@lcaa.gov.lr (RFIR) |

**Demo Password:** `Demo2024!`

### Training Environment Checklist

| Item | Status | Owner |
|------|--------|-------|
| Production-like environment deployed | 📅 | DevOps |
| All 20 organizations seeded | ✅ | Completed |
| Demo users with reviewer profiles | ✅ | Completed |
| Sample assessments (2 per type) | 📅 | Seed script |
| Sample reviews (5 regional) | 📅 | Seed script |
| Sample findings and CAPs | 📅 | Seed script |
| Training handouts (EN/FR) | 📅 | Documentation |
| Quick reference cards | 📅 | Documentation |
| Backup/failover plan | 📅 | DevOps |
| Offline contingency materials | 📅 | Documentation |

---

## Phase 3: Pilot Operations (April - June 2026)

### Objectives

1. Conduct 5 pilot peer reviews (1 per regional team)
2. Gather user feedback and iterate
3. Complete remaining protocol questions (690 PQs)
4. Refine analytics and reporting

### Pilot Review Schedule

| Team | Host ANSP | Review Period | Status |
|------|-----------|---------------|--------|
| Team 1 | ESWACAA (Eswatini) | April 7-18, 2026 | Planned |
| Team 2 | BCAA (Burundi) | April 21 - May 2, 2026 | Planned |
| Team 3 | RFIR (Roberts FIR) | May 5-16, 2026 | Planned |
| Team 4 | ZACL (Zambia) | May 19-30, 2026 | Planned |
| Team 5 | ANAC (Angola) | June 1-12, 2026 | Planned |

### Phase 3 Deliverables

| Deliverable | Target Date | Priority |
|-------------|-------------|----------|
| Load remaining 690 Protocol Questions | April 15 | P1 |
| Full CANSO SoE questionnaire | April 30 | P1 |
| Advanced analytics dashboard | May 15 | P2 |
| Regional benchmarking views | May 30 | P2 |
| Mobile responsiveness improvements | June 15 | P2 |
| Feedback-driven bug fixes | Ongoing | P0 |
| Performance monitoring & alerts | April 30 | P1 |

### Success Criteria

| Metric | Target |
|--------|--------|
| Pilot reviews completed | 5/5 |
| User satisfaction score | ≥ 4.0/5.0 |
| System uptime | ≥ 99.5% |
| Critical bugs | 0 |
| Average page load time | < 2 seconds |
| Fieldwork checklist completion rate | ≥ 90% |
| Document review turnaround | < 48 hours |

---

## Phase 4: Production Launch (July - October 2026)

### Pre-Launch Checklist

| Category | Item | Target Date |
|----------|------|-------------|
| **Security** | Final security audit | July 15 |
| | SSL/TLS configuration verified | July 15 |
| | RBAC penetration testing | July 20 |
| | Data encryption at rest | July 20 |
| **Performance** | Load testing (100 concurrent users) | July 25 |
| | CDN configuration | July 25 |
| | Database optimization | July 30 |
| **Operations** | Monitoring & alerting setup | August 1 |
| | Backup & disaster recovery | August 5 |
| | Runbook documentation | August 10 |
| **Compliance** | Data protection review | August 15 |
| | Data retention policies | August 15 |
| | Audit logging verification | August 20 |

### Launch Timeline

```
July 2026
├── Week 1-2: Security hardening
├── Week 3-4: Performance optimization
└── Final security audit sign-off

August 2026
├── Week 1-2: Operations readiness
├── Week 3-4: Compliance verification
└── Soft launch with select ANSPs

September 2026
├── Week 1-2: Soft launch monitoring
├── Week 3-4: Issue resolution
└── Full launch preparation

October 2026
├── Week 1: Full production launch 🚀
├── Week 2-3: Post-launch support
└── Week 4: Retrospective & Phase 5 planning
```

### Production Infrastructure

| Component | Specification |
|-----------|---------------|
| Hosting | Vercel (Frontend) + Supabase (Database) |
| Database | PostgreSQL 15 with connection pooling |
| File Storage | Vercel Blob |
| Email | Resend API |
| Monitoring | Vercel Analytics + Sentry |
| CDN | Vercel Edge Network |
| SSL | Automatic via Vercel |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Training date change | Low | Medium | Flexible timeline, modular development |
| Key developer unavailable | Medium | High | Documentation, knowledge sharing |
| Database performance issues | Medium | High | Query optimization, caching, indexing |
| Integration failures | Low | Medium | Comprehensive testing, CI/CD |
| User adoption challenges | Medium | Medium | Training materials, UX improvements |
| Security vulnerabilities | Low | Critical | Regular audits, security scanning |
| Internet connectivity at training | Medium | High | Offline contingency materials |

---

## Resource Allocation

### Development Team

| Role | Allocation | Focus Area |
|------|------------|------------|
| Lead Developer | 100% | Architecture, core features |
| QA/Testing | 40% | Testing, quality assurance |
| DevOps | 20% | Infrastructure, deployment |
| Technical Writer | 20% | Documentation, training materials |

### Infrastructure Costs (Monthly)

| Service | Estimated Cost | Notes |
|---------|----------------|-------|
| Vercel Pro | $20/month | Hosting |
| Supabase Pro | $25/month | Database |
| Resend | $20/month | Email (10k/month) |
| Vercel Blob | ~$5/month | File storage |
| Domain | $15/year | aaprp.aero |

---

## Appendices

### A. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query (via tRPC) |
| Backend | tRPC, Next.js API Routes |
| Database | PostgreSQL, Prisma ORM |
| Auth | NextAuth.js |
| Internationalization | next-intl |
| Testing | Vitest (unit), Playwright (E2E) |
| Deployment | Vercel |

### B. Quality Standards

| Standard | Target | Current |
|----------|--------|---------|
| TypeScript strict mode | Enabled | ✅ |
| ESLint (no errors) | 0 errors | ✅ |
| Test coverage (services) | ≥ 80% | 85% |
| Lighthouse Performance | ≥ 90 | TBD |
| Lighthouse Accessibility | ≥ 95 | TBD |
| WCAG 2.1 AA | Compliant | In progress |

### C. Programme Participants

**20 ANSPs organized into 5 Regional Teams:**

| ICAO Code | Organization Name | Country/Region |
|-----------|-------------------|----------------|
| ASECNA | Agency for Aerial Navigation Safety | Multi-state (17 countries) |
| ATNS | Air Traffic and Navigation Services | South Africa |
| CAAB | Civil Aviation Authority of Botswana | Botswana |
| ESWACAA | Eswatini Civil Aviation Authority | Eswatini |
| KCAA | Kenya Civil Aviation Authority | Kenya |
| TCAA | Tanzania Civil Aviation Authority | Tanzania |
| UCAA | Uganda Civil Aviation Authority | Uganda |
| RCAA | Rwanda Civil Aviation Authority | Rwanda |
| BCAA | Burundi Civil Aviation Authority | Burundi |
| NAMA | Nigerian Airspace Management Agency | Nigeria |
| GCAA | Ghana Civil Aviation Authority | Ghana |
| RFIR | Roberts FIR | Guinea, Liberia, Sierra Leone |
| ADM | Aviation Civile de Madagascar | Madagascar |
| MCAA | Malawi Civil Aviation Authority | Malawi |
| ACM | Aeroportos de Moçambique | Mozambique |
| CAAZ | Civil Aviation Authority of Zimbabwe | Zimbabwe |
| ZACL | Zambia Airports Corporation Limited | Zambia |
| DGAC | Direction Générale de l'Aviation Civile | DRC |
| OACA | Office de l'Aviation Civile et des Aéroports | Tunisia |
| ANAC | Autoridade Nacional da Aviação Civil | Angola |

### D. Key Contacts

| Role | Name | Organization |
|------|------|--------------|
| Programme Coordinator | TBD | ICAO WACAF |
| Technical Lead | Boubacar S. C. Diallo | Roberts FIR |
| CANSO Representative | TBD | CANSO |
| Training Coordinator | TBD | ICAO ESAF |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 4.0 | Jan 15, 2026 | B. Diallo | Initial Phase 1 complete |
| 4.1 | Jan 25, 2026 | B. Diallo | Added Phase 1.5, updated training date to March 23-26, added fieldwork checklist & document workflow features, corrected ANSP count to 20 |

---

*This roadmap is a living document and will be updated as the project progresses.*
