# airbotix-app — Development Plan

> **Status**: v0.2 · 2026-05-16
> **Stack reset**: replaces v0.1 creative-web + Supabase plan after 2026-05-14 hard-rule lock-in. Old plan archived in git history (commit `0509057 feat(auth): Phase 1 — Supabase Auth`).
> **Owner**: Airbotix engineering
> **Goal**: Unified Portal (`/portal/*`, parents) + Learn (`/learn/*`, kids) SPA running on AWS S3 + CloudFront Sydney, talking to platform-backend NestJS API.

---

## What's already in place (after 2026-05-16 scaffold)

- ✅ Vite + React 18 + TypeScript strict bootstrap
- ✅ Tailwind + ESLint flat config + Prettier
- ✅ TanStack Query + Zustand + react-hook-form + zod stack
- ✅ Unified router with all 25 routes and two layouts (Portal + Learn)
- ✅ AuthStore (in-memory access token) + auth principal discriminated union
- ✅ API client with single-flight silent refresh on 401
- ✅ ProtectedRoute with cross-surface bounce (kid ↔ parent)
- ✅ 5 REAL auth pages end-to-end:
  - `/portal/login` (email → OTP request)
  - `/portal/verify-otp` (6-digit code → JWT)
  - `/portal/register` (first-time family setup)
  - `/learn/login` (family code + nickname + PIN)
  - `/learn/class-code` (one-shot workshop login)
- ✅ Profile + sign-out + sign-out-everywhere
- ✅ 19 business page placeholders (each tagged with PRD §)

---

## Phase 1 — Wire family + dashboard (Week 1)

**Goal**: Logged-in parent sees a real dashboard with their family + kids + wallet.

- [ ] `/portal` Dashboard
  - Hit `GET /auth/me` (already wired), display kid cards
  - `GET /families/:id/wallet` → balance + caps
  - `GET /families/:id/approvals?status=pending` → red badge count
  - Recent activity from `GET /families/:id/audit?limit=10`
- [ ] `/portal/family` Multi-kid manager
  - Empty / single / multi-kid card layouts (parent-portal-prd.md §4.2)
  - Family-wide controls: caps, pause family
- [ ] `/portal/family/new` Add-kid wizard
  - Reuses the `RegisterPage` field set, scoped to kid only
- [ ] `/portal/family/:kidId` Single-kid detail
  - Login info, Stars/limits per-kid override, topic limits, danger zone
- [ ] WS hook `useFamilyAuditStream` — subscribe to `family:<family_id>` room

## Phase 2 — Wallet + Airwallex topup (Week 2)

- [ ] `/portal/wallet` — balance + transactions feed + filters
- [ ] `/portal/wallet/topup` — Stars Pack picker → Airwallex hosted checkout → callback
- [ ] Cap update form, pause/resume controls
- [ ] Live wallet update via WS `wallet.update` event

## Phase 3 — Approvals + Audit (Week 3)

- [ ] `/portal/approvals` — pending queue + recently resolved
- [ ] `approval.new` WS event → toast + badge bump
- [ ] `/portal/audit` — cursor-paginated feed
- [ ] `/portal/audit/project/:id` — single-project replay

## Phase 4 — Kid surface foundation (Week 4)

- [ ] `/learn` Home — mission carousel + current projects + class wall preview
- [ ] `/learn/projects` list + `/learn/projects/new` create
- [ ] `/learn/projects/:id` editor surface:
  - Prompt / chat pane (calls `POST /llm/text-completion` on backend)
  - Artifact gallery (signed S3 URLs)
  - Stars meter
  - "Ask parent for more Stars" trigger
- [ ] Kid-friendly visual treatment (airbotix-app-learn-prd.md §UI/UX) — bigger buttons, mascot, warm palette

## Phase 5 — Missions + Class Wall + Polish (Week 5)

- [ ] `/learn/missions` + `/learn/missions/:id` — course pack runner
- [ ] `/learn/wall` — class wall (approved class-share projects)
- [ ] `/learn/profile` — picture / nickname change, sign-out
- [ ] Settings (`/portal/settings`) — notification prefs, data export, account delete
- [ ] Billing (`/portal/billing`) — receipts + refund history

## Phase 6 — Production deploy + observability (Week 6)

- [ ] Copy `infra/github-actions/deploy-airbotix-app.yml.example` into `.github/workflows/deploy.yml`
- [ ] Provision S3 + CloudFront via infra walkthrough
- [ ] First deploy to `app.airbotix.ai`
- [ ] Sentry wiring
- [ ] Lighthouse pass on /portal/login + /learn/login (FCP <1.5s target)
- [ ] Bundle audit (target <1MB gz)

---

## Critical-path dependency

```
P0 scaffold ✅
   │
   ▼
P1 family + dashboard ── depends on platform-backend Phase 1 (auth + family bootstrap)
   │
   ▼
P2 wallet + Airwallex ── depends on platform-backend Phase 3 (wallet) + Airwallex PRD
   │
   ▼
P3 approvals + audit ── depends on platform-backend Phase 7
   │
   ▼
P4 kid surface ────── depends on platform-backend Phase 4 (LLM proxy) + Phase 6 (projects)
   │
   ▼
P5 polish
   │
   ▼
P6 ship
```

Phases P1-P3 (parent portal) can start as soon as platform-backend Phase 1-2 is up. Phase P4 blocks on Phase 4 of backend.

---

## Open questions

| ID | Decision | Phase | Notes |
|---|---|---|---|
| APP-1 | Should `/portal/register` keep V0 collapsed form or split into the 5-step wizard from parent-portal-prd.md §3.1? | P1 | Probably split once UX feedback says it's overwhelming |
| APP-2 | Kid editor (`/learn/projects/:id`) — embed chat-like UI vs canvas vs hybrid? | P4 | Defer to airbotix-app-learn-prd.md UX session |
| APP-3 | WS reconnect strategy — exponential backoff cap? | P1 | start with 1-5s, evolve |
| APP-4 | Should "ask for more Stars" land in approvals queue with custom UI, or reuse generic approval renderer? | P4 | Probably reuse — approvals are polymorphic |

---

## Risk register

| Risk | Sev | Mitigation |
|---|---|---|
| platform-backend Phase 1 slips → no real /auth/me for dashboard | High | Mock fixture in dev; Vite proxy → mock server |
| Kid-friendly visual design takes a full design sprint | Medium | Ship Phase 4 with neutral palette; iterate on visuals async |
| Bundle bloat from TanStack Query + Recharts | Low | Code-split by route; lazy-load Recharts in admin-style pages |
| Cross-surface session bug (kid token used at `/portal`) | High | Both client guard + server family-scope guard; e2e test in Phase 5 |

---

## Revision history

| Version | Date | Note |
|---|---|---|
| v0.2 | 2026-05-16 | Full stack reset: NestJS-compatible. Two surfaces in one SPA. 5 REAL auth pages + 19 placeholders. Phases 1-6 rewritten. |
| v0.1 | 2026-05-12 | (DISCARDED) Supabase + creative-web single-product-line plan. |
