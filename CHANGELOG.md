# Changelog

All notable changes to airbotix-app (Portal + Learn SPA) are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); entries are grouped
by date (AEST), newest first. Update this file in the **same commit** as the code change.

## 2026-06-07

### Added
- Parent Portal **Courses** page (`/portal/courses`): browse published course packs and
  request a seat for a kid. Submits to `POST /bookings` (`source=parent_portal`) so the
  request lands in the super-admin Bookings inbox.
- **My Family is now a growth surface, not a settings form** (`parent-portal-growth-report-prd.md`): tapping a kid lands on a warm **growth report** (`/portal/family/:kidId`, new `KidGrowthPage`) — a one-sentence headline, highlight tiles (creations / day-streak / minutes exploring / studios tried), a 28-day daily-activity sparkline, and a friendly "what they've been making" breakdown — instead of the profile editor. The family list now shows a per-kid growth teaser (`KidGrowthTeaser`) + sparkline with a "See growth →" action, kids first and the family code demoted below. A brand-new kid shows an encouraging **🌱 early state** (reuses the onboarding `KidLoginHelper` with the copyable family code) rather than "No data". Profile / Reset PIN / Delete move verbatim to `/portal/family/:kidId/settings`. Growth derived purely from the existing usage endpoints (`/kids/:id/usage`, `/usage/trend`) in new pure helpers (`kidGrowth.ts`, +Vitest); shared `TrendBars` extracted to `src/components/`. Frontend-only, no backend change.
- Parent onboarding clarity pass (follow-up to the welcome flow): the welcome tour
  gained a concrete **"What your child will make & learn"** slide (Image/Music/Voice,
  Video, Code & Games + the skills built) and is now **re-openable any time** via a
  **"How it works"** button on the Dashboard (`openWelcomeTour`), not just on first
  login. New reusable **`StarsExplainer`** ("what are Stars?", qualitative — no hard
  $ conversion) on the top-up + wallet pages and a clearer checklist subtitle. The
  kid-login helper now shows a **QR code + "Copy login link"** (`/learn/login?family_code=…`)
  so parents don't dictate a code and kids don't type one; the kid login page pre-fills
  the family code from that query param. City is now a **dropdown of major AU cities
  (+ "Other")** on register + settings instead of free text. Adds `qrcode.react`.
- Parent-portal first-login onboarding (`parent-portal-onboarding-prd.md`): a one-time,
  skippable 3-slide **WelcomeWizard** ("what Airbotix is / you're in control / 3 next steps")
  and a persistent, data-driven **GettingStartedCard** checklist on the Dashboard (log kid in →
  add Stars → optional spending limits), plus a **KidLoginHelper** modal showing the copyable
  family code + plain-language login steps. Frontend-only: completion derived from existing
  family/wallet/payment-methods/auto-topup queries + per-parent (`sub`-keyed) localStorage flags
  (`src/lib/onboardingStorage.ts`); pure logic in `onboardingState.ts` with Vitest coverage.
  Mounted in `DashboardPage` (parent-with-family branch only). Payment step is gentle / never
  blocking (D-ONB2-02).

### Changed
- **Stars economy re-pegged: 1 star = A$0.02 (was A$1)** — mirrors platform-backend.
  Top-up packs now credit 500 / 1750 / 3250 / 7000★ (Starter/Family/Mega/School,
  incl. bonus), auto-topup SKUs + threshold options realigned to 50★ per A$, and
  Studio per-action costs updated (image 4→8★, video 5→40★; chat/voice/code/music
  unchanged) so a single chat costs ≈ A$0.02 and a $10 pack lasts hundreds of turns.
- **Activity page (`/portal/audit`) now speaks plain language.** It previously dumped
  raw machine `event_type` strings (`wallet.topup_initiated`) and the full JSON payload
  (`pack_sku`, `payment_intent_id`, `amount_aud_cents`…) — unreadable for parents. Each
  event is now mapped to a friendly icon + headline + detail line (e.g. 💳 *Top-up started
  · 10 Stars · $10.00 AUD*) via a new `src/lib/auditCopy.ts` table covering wallet / LLM /
  approval / project / auth / class / safety / family / incident events, with a title-cased
  fallback so no unmapped event ever leaks a raw `dotted.snake_case` string. The raw
  `event_type` + JSON is preserved behind a collapsed **"Technical details"** disclosure
  for auditability. Actor labels are now parent-facing ("You" / "Your child" / "AI helper").
  Vitest coverage in `auditCopy.test.ts`. Step toward the richer §4.6 vision (session
  grouping / filters / export remain unbuilt).
- `.gitignore`: explicitly ignore the compiled `vite.config.js` / `vite.config.d.ts`
  (stray `tsc -b` outputs) so they never get committed alongside `vite.config.ts`.

### CI
- `ci.yml` now actually runs the unit tests: the job runs `lint → typecheck →
  test → build` (was build-only, so the Vitest suite never ran in CI).

## 2026-06-06

### Added
- Portal onboarding captures the parent name + an editable display name.
- Playground v2 desktop workspace: window / split layout, Monaco code editor,
  Phaser game runner, standalone chat pane, taskbar + desktop icons, error
  debugging (jump-to-error + Ask AI to fix), light/dark theme, and S3-backed
  editor files.

### Fixed
- Playground UX polish: Monaco hover/suggest tooltips no longer clipped, robust
  Phaser vendoring at build time, wider editor launch, chat keeps focus/history,
  smoother generating screen.
