# creative-web — Development Plan (V0 → Workshop dogfood)

> **Status**: v0.1 living plan · 12-week sprint · Updated 2026-05-12
> **Owner**: 1 React engineer + Lightman (UX direction)
> **Goal**: Production-ready low-age (6-11) AI creation platform. Image / music / story creation in a safe, parent-monitored UI. Talks only to `platform-backend`.
> **Cross-PRD links**:
> - Product PRD: `~/Documents/sites/airbotix/docs/product/prd/kids-ai-platform-prd.md`
> - Backend we depend on: `~/Documents/sites/kidsinai/platform-backend/PLAN.md`
> - Master cross-product plan: `~/Documents/sites/kidsinai/planning/PROJECT.md`

---

## Phase 0 — Foundation ✅ DONE (2026-05-12)

- [x] Vite + React 18 + TypeScript + Tailwind scaffold
- [x] Cream/charcoal Lovable-inspired palette (matches design system)
- [x] `.env.example` (`VITE_API_BASE_URL`)
- [x] README.md + CLAUDE.md

**Output**: `pnpm dev` brings up "hello world" SPA at :5173.

---

## Phase 1 — Auth + family bootstrap (Week 3-4)

**Goal**: A parent can sign up via Supabase Auth → family is created → land on a kid-picker page.

### Tasks
- [ ] Install `@supabase/supabase-js`
- [ ] `src/lib/supabase.ts` — Supabase client (anon key only; never service role on client)
- [ ] Auth pages
  - `/login` (email + password OR magic link)
  - `/signup` (email + password + accept terms)
  - `/forgot-password`
- [ ] On signup completion → POST to backend `/api/families/me` to confirm family bootstrap
- [ ] `/setup` page — first-time parent flow
  - Step 1: parent profile (display name)
  - Step 2: add first kid profile (nickname + age band)
  - Step 3: family timezone confirm
- [ ] Routing
  - React Router v6
  - Protected routes wrapper that redirects to `/login` if no session
- [ ] `/picker` — landing after auth: list kid profiles, pick one to enter

### Acceptance
- [ ] Signup → setup → picker flow works end-to-end against local platform-backend
- [ ] Refresh preserves auth state
- [ ] Sign out clears session

---

## Phase 2 — Kid shell + Course Pack runner (Week 5-6)

**Goal**: Kid enters their profile → sees available course packs → enters a mission → can navigate.

### Tasks
- [ ] Kid layout shell
  - Big touch-friendly UI; minimal text density (target reading age 7)
  - Cream background, large rounded buttons, friendly icons
  - Persistent "back to picker" + "ask parent" pause button
- [ ] `/kid/:kidId/home` — kid landing
  - Three big cards: "My creations" / "My classes" / "Try something new"
- [ ] `/kid/:kidId/courses` — available course packs grid
  - Filter by `age_band` matching kid
  - Card shows title, mission count, Stars budget
- [ ] `/kid/:kidId/course/:slug/:mission` — mission runtime
  - Mission objective (1-2 sentences, kid-readable)
  - Inline tutorial (image / step list)
  - "Start creating" button → launches creation flow
- [ ] Progress persistence via `platform-backend/api/enrollments/me`
- [ ] Stars meter visible at top — current balance + "today used X⭐"

### Acceptance
- [ ] Kid enrols in a course pack → enters Mission 1 → sees objective + tutorial
- [ ] Progress saved on backend (verified by querying `/api/enrollments/me`)
- [ ] UI works on iPad / school Chromebook (test breakpoints)

### Risks
- **Course Pack content not ready** — work with curriculum team in parallel; have at least 1 placeholder pack to test against

---

## Phase 3 — AI image creation flow (Week 7-8) 🔴 P0 — first real LLM feature

⚠️ **Dependency**: platform-backend Phase 3 (LLM proxy) must be live.

**Goal**: Kid types prompt or picks template → backend calls DeepRouter → image rendered → saved to portfolio.

### Tasks
- [ ] Creation flow UI
  - Step 1: pick a template ("AI 表情包", "我的奇幻动物", etc.) or free prompt
  - Step 2: prompt builder with kid-friendly UI (drag-drop nouns + adjectives, OR text input with suggestions)
  - Step 3: cost preview ("This will use 1⭐") + "Make it!" button
  - Step 4: loading state with friendly animation (NOT a spinner — something educational)
  - Step 5: result display with "Save" + "Try again" + "Show parent" actions
- [ ] API call to `/api/llm/proxy` with `model: gpt-image-1` (or whatever DeepRouter routes)
- [ ] Streaming progress (if applicable) → fun UI updates
- [ ] Error handling
  - 422 (content blocked) → friendly "Let's try something different!" — never show the raw content filter reason
  - 402 (insufficient Stars) → "Ask your parent for more stars" flow
  - Network error → retry with backoff
- [ ] Save to portfolio
  - POST result to `/api/portfolio` (backend stores ref in Supabase Storage)
  - Show in `/kid/:kidId/portfolio` gallery

### Acceptance
- [ ] Kid completes full creation flow end-to-end (3+ creations in 5 min)
- [ ] Content block returns gentle redirect, not error message
- [ ] Stars deducted exactly once per generation (cross-check ledger)

### Risks
- **Image latency > 10s frustrates kids** — show progress; consider switching to faster model in DeepRouter
- **Content filter false positives on innocent prompts** — calibrate the LLM classifier in DeepRouter; have a tester on hand during P3

---

## Phase 4 — Portfolio + Class Wall (Week 9-10)

**Goal**: Kid can see all their creations + classmates' work; teacher/parent can curate.

### Tasks
- [ ] `/kid/:kidId/portfolio` — kid's own gallery
  - Grid view of all creations
  - Per-item: download, share to class wall, delete
- [ ] `/kid/:kidId/class/:classId/wall` — class wall
  - Grid of classmates' shared work (filtered by class enrolment)
  - Like / comment (V1 — defer if tight)
  - "Remix" button (uses same template; spends own Stars)
- [ ] Sharing flow
  - Default privacy: private to kid + parent
  - Share to class wall: requires class enrolment; opt-in
  - Share publicly: requires parent + teacher dual approval (V1 — defer; V0 has private + class only)
- [ ] Parent visibility
  - All actions visible in parent dashboard audit feed (backend handles)

### Acceptance
- [ ] Kid creates 5 images → portfolio shows all 5
- [ ] Share 2 to class wall → classmates see them
- [ ] Delete one → removed from both views immediately

---

## Phase 5 — Workshop mode + offline resilience (Week 11)

**Goal**: When launched from a class URL, switch to Workshop Mode; handle classroom WiFi flakiness.

### Tasks
- [ ] Workshop Mode detection
  - URL param `?class=abc123` → enter Workshop Mode
  - Banner: "🎓 Workshop with [class name] · using class credits"
  - Class-specific Course Pack auto-loaded
- [ ] Offline / flaky network
  - Service worker for static assets (images, fonts, JS bundle)
  - Local queue for save-to-portfolio while offline → sync on reconnect
  - Friendly "trying to reach AI..." UI on slow / intermittent network
- [ ] Multi-kid same device support
  - Quick switch between sibling kids on same login (e.g. tablet shared by 2 kids in class)
- [ ] Pre-warm
  - On class start: preload Course Pack assets to cache

### Acceptance
- [ ] Class URL → enters Workshop Mode automatically
- [ ] Offline: kid can still see portfolio + queued saves; resume when online
- [ ] Switch kid quickly without re-login

---

## Phase 6 — Workshop dogfood (Week 12)

**Goal**: 2 real workshops (low-age 6-11 cohort) with ≥18/20 kids completing.

### Tasks
- [ ] Pre-flight
  - Deploy to Cloudflare Pages staging
  - Test on real iPad / Chromebook / Android tablet (the devices schools actually have)
  - Bandwidth test in a realistic school WiFi environment
- [ ] Workshop #1 (W12 mid)
  - 20 kids 6-11, 2-hour session, "AI 表情包" course pack
  - Notes on friction; iterate same day
- [ ] Workshop #2 (W12 end)
  - 20 kids, "我的奇幻故事书" pack (multi-mission)
  - Validate iterations from Workshop #1 hold

### Acceptance
- [ ] Workshop #1: ≥18/20 complete Mission 1 in 90 min
- [ ] Workshop #2: ≥18/20 complete all 3 missions in 2h
- [ ] Parent NPS post-workshop ≥ 60

---

## Critical-path dependency

```
platform-backend P3 (LLM proxy, W7-8) ──┐
                                         ▼
                          creative-web P3 (image flow)
                                         │
                                         ▼
                          P4 (portfolio/class wall)
                                         │
                                         ▼
                          P5 (workshop mode)
                                         │
                                         ▼
                          P6 (workshop dogfood)
```

P1+P2 can proceed without backend P3, working against mock data.

---

## Open decisions

| ID | Decision needed | Phase | Owner |
|---|---|---|---|
| CW-1 | i18n: Chinese-first or English-first? Bilingual toggle? | P1 (W3) | Lightman (markets) |
| CW-2 | Service worker library: Workbox vs custom | P5 (W11) | Engineer |
| CW-3 | Animation library for kid UI: Framer Motion vs CSS-only | P2 (W5) | Engineer (perf budget) |

---

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| **Backend P3 late** | High | Build P1-P2 against mock; have ~1 week buffer |
| Course Pack content delays | Medium | Engineering ships schema; curriculum can ship later |
| iPad / Chromebook compatibility issues | Medium | Test on real devices weekly from Phase 2 |
| Kid frustration with prompt content filter false-positives | Medium | Friendly redirects, not error toasts; calibrate filter |

---

## Definition of "creative-web V0 Done"

1. ✅ Deployed to Cloudflare Pages (`creative.kidsinai.org` or similar)
2. ✅ Signup → kid creates first AI image → saves to portfolio in ≤5 min
3. ✅ Workshop dogfood: 2 sessions × ≥18/20 completion
4. ✅ Works on iPad + Chromebook + Android tablet (3 actual devices)
5. ✅ Zero unsafe content reaching kid screens
6. ✅ Parent dashboard reflects kid activity in real time

---

## Weekly cadence

Mon plan-check, Fri 30 min sync with backend + DeepRouter teams, end-of-phase retro.

---

## Revision History

| Version | Date | Note |
|---|---|---|
| v0.1 | 2026-05-12 | Initial plan. Scaffold done. Phases 1-6 with acceptance + dependency on backend P3. |
