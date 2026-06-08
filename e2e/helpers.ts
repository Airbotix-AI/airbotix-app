import { expect, type Page } from '@playwright/test';

import type { VfsFile } from '../src/pages/learn/code/codeApi';
import { STARTER_PROJECT } from '../src/pages/learn/playground/panes/starterProject';

// ── Shared Playwright e2e harness for the AUTHED game studio ──────────────────
// The DEV-only `/playground-sandbox` route is going away; every game-studio spec
// is migrating onto the AUTHED `/learn/playground/:projectId` route with a fully
// ROUTE-MOCKED backend (page.route) so the suite stays deterministic, offline,
// and LLM-free (CLAUDE.md #5). This module is the single reusable harness:
//   - `mockBackendAsKid` — seats a kid session + mocks every backend the studio
//     touches (auth, wallet, projects, the agent turn + approve, a STATEFUL VFS).
//   - `openStudio` — drives the real authed J1 hub → landing → create flow into
//     the chat-first workspace on `game-77`.
//   - `openLanding` — opens the authed new-project LandingScreen (the prompt-first
//     entry), for the landing/generating-flow specs.
//   - `installGameSignalRecorder` — the game-smoke oracle (errors + fps over the
//     runner's postMessage channel).
//
// The seed VFS is the REAL `STARTER_PROJECT` scaffold (imported from src, so the
// seed can never drift from the app's actual multi-file scaffold: main.js,
// src/scenes/Boot.js/Game.js/GameOver.js, assets/README.txt, style.css, +sample
// assets). The migratable workspace tests assert on THIS structure.

export type { VfsFile };

/** The owned project id the authed hub → create flow lands on (mocked create). */
export const STUDIO_PROJECT_ID = 'game-77';

/** The seeded VFS = the app's real starter scaffold (kept in sync via import). */
export const SEEDED_PROJECT: VfsFile[] = STARTER_PROJECT;

const LANDING_PLACEHOLDER = "Describe a game and we'll build it…";

// ── A runnable single-file Phaser turn result (the J2 colour-swap edit) ───────
// Used by the agent-turn mock so a turn produces a real, runnable diff. Mirrors
// the runtime contract (Phaser global, mount #game, no module system).
const TURN_JS_BEFORE = `new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 320,
  height: 240,
  backgroundColor: '#0f172a',
  scene: { create() { this.add.rectangle(160, 120, 40, 40, 0x38bdf8); } },
});
`;
const TURN_JS_AFTER = TURN_JS_BEFORE.replace('0x38bdf8', '0xff6ba9');

function turnResult(over: Record<string, unknown> = {}) {
  return {
    turn_id: 'turn-1',
    requires_approval: false,
    plan: null,
    changes: [
      { path: 'main.js', before: TURN_JS_BEFORE, after: TURN_JS_AFTER, lines_added: 1, lines_removed: 1 },
    ],
    files: [{ path: 'main.js', content: TURN_JS_AFTER, kind: 'text', size: TURN_JS_AFTER.length }],
    summary: 'I changed the block colour to pink — press Play to see it!',
    stars_charged: 2,
    tools_fired: ['edit_file:main.js'],
    ...over,
  };
}

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

interface MockBackendOpts {
  /** Kid age → sets the Lite (<13) / Pro (≥13) tier. Default 9 (Lite). */
  age?: number;
  /** Force the Pro plan→approve gate on turns (a multi-file turn). */
  pro?: boolean;
  /** Override the seeded VFS the GET /code/files serves. Default STARTER_PROJECT. */
  files?: VfsFile[];
}

/**
 * Seat a kid session + mock EVERY backend the studio touches. `age` sets the
 * Lite/Pro tier; the wallet debits on a turn so the metered badge decrements; the
 * VFS GET is STATEFUL (returns whatever was last persisted, seeded from
 * `opts.files ?? STARTER_PROJECT`) and the PUT bumps the version.
 */
export async function mockBackendAsKid(page: Page, opts: MockBackendOpts = {}): Promise<void> {
  const kid = { id: 'kid-1', nickname: 'Robo', age: opts.age ?? 9, family_id: 'fam-1' };
  // The wallet debits on a turn so the metered badge visibly decrements.
  let stars = 42;
  // The persisted server-side VFS, seeded from the real scaffold. A non-approval
  // turn AUTO-APPLIES (mutates this); a reload's GET re-reads it.
  let persistedFiles: VfsFile[] = (opts.files ?? STARTER_PROJECT).map((f) => ({ ...f }));
  let version = 1;

  // ── Auth bootstrap ──────────────────────────────────────────────────────────
  // NOTE the trailing `*`: the real refresh/me URLs carry a `?kind=kid` query, and
  // a bare `**/auth/refresh` glob does NOT match a query string (the page would
  // bounce to /learn/login). `**/auth/refresh*` matches the query.
  await page.route('**/auth/refresh*', (route) => route.fulfill(json({ access_token: 'kid-token' })));
  await page.route('**/auth/me*', (route) => route.fulfill(json({ role: 'kid', kid })));

  // ── Wallet (Stars badge; refetched after a debit) ────────────────────────────
  await page.route('**/families/*/wallet*', (route) =>
    route.fulfill(json({ stars_balance: stars, daily_used: 0, daily_cap: 100, paused: false })),
  );

  // ── Hub queries (kept deterministic) ─────────────────────────────────────────
  await page.route('**/kids/*/projects*', (route) => route.fulfill(json([])));
  // `/classes/mine` gates the "Ask my teacher" toggle; left unmocked it 401s and
  // logs the kid out (→ /learn/login). Return an empty list to keep the session.
  await page.route('**/classes/mine*', (route) => route.fulfill(json([])));

  // ── The agent turn pipeline ──────────────────────────────────────────────────
  // ROUTE-REGISTRATION ORDER MATTERS: Playwright matches the MOST-RECENTLY-ADDED
  // route first, so the specific turn globs (`/code/turn/classify`,
  // `/code/turn/*/approve`, `/code/turn`) MUST be registered BEFORE the broader
  // `/code/files` glob below — otherwise `/code/files` could shadow them.

  // Safeguarding classify runs server-side BEFORE any turn (J13). Happy path →
  // `{ safeguarding: null }` so the studio proceeds to the turn.
  await page.route('**/projects/*/code/turn/classify', (route) =>
    route.fulfill(json({ safeguarding: null })),
  );

  await page.route('**/projects/*/code/turn/*/approve', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const decision = (route.request().postDataJSON() as { decision: string }).decision;
    if (decision === 'reject') {
      // Reject discards the collected writes — nothing persists, nothing debits.
      return route.fulfill(json({ ...turnResult(), changes: [], stars_charged: 0 }));
    }
    // Approve persists the collected writes + debits once (后扣模式 on approve).
    stars -= 2;
    persistedFiles = turnResult().files as VfsFile[];
    return route.fulfill(json(turnResult({ requires_approval: false })));
  });

  await page.route('**/projects/*/code/turn', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    // A Pro multi-file turn COLLECTS writes — it does NOT persist or debit until
    // approve. A Lite (non-approval) turn AUTO-APPLIES: it persists + debits here.
    if (opts.pro) {
      return route.fulfill(
        json(
          turnResult({
            requires_approval: true,
            plan: { plan_text: "I'll edit main.js to change the colour.", planned_tools: [] },
          }),
        ),
      );
    }
    stars -= 2;
    persistedFiles = turnResult().files as VfsFile[];
    return route.fulfill(json(turnResult()));
  });

  // ── The STATEFUL VFS (GET seeded from the scaffold; PUT bumps the version) ────
  await page.route('**/projects/*/code/files', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill(json({ files: persistedFiles, version }));
    }
    // PUT autosave — adopt the saved files, bump the version, echo it back.
    const body = route.request().postDataJSON() as { files: VfsFile[]; version: number };
    persistedFiles = body.files;
    version += 1;
    return route.fulfill(json({ files: persistedFiles, version }));
  });

  // ── The real game-project create (authed hub → studio) ───────────────────────
  await page.route('**/projects', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill(json({ id: STUDIO_PROJECT_ID }, 201));
  });
}

/** Record the runner's game signals (errors + fps) — the game-smoke oracle. */
export async function installGameSignalRecorder(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __smokeErrors: string[]; __smokeMaxFps: number };
    w.__smokeErrors = [];
    w.__smokeMaxFps = 0;
    window.addEventListener('message', (e: MessageEvent) => {
      const m = e.data as
        | { __airbotixConsole?: true; level?: string; text?: string; __airbotixStat?: true; fps?: number }
        | null;
      if (!m || typeof m !== 'object') return;
      if (m.__airbotixConsole === true) {
        if (m.level === 'error') w.__smokeErrors.push(String(m.text));
      } else if (m.__airbotixStat === true) {
        const fps = m.fps ?? 0;
        if (fps > w.__smokeMaxFps) w.__smokeMaxFps = fps;
      }
    });
  });
}

/**
 * Drive the authed J1 flow → the chat-first workspace on `game-77`. The Tiny Game
 * hub card now opens PROMPT-FIRST (`/learn/playground/new` → LandingScreen); the
 * real `kind='game'` project is created on prompt submit (mocked → `game-77`).
 * With `openCode`, also opens the Code editor and awaits the seeded `main.js`.
 */
export async function openStudio(page: Page, opts: { openCode?: boolean } = {}): Promise<void> {
  await page.goto('/learn/create/code');
  await page.getByTestId('hub-template-pong').click();
  // The card routes to the prompt-first landing screen; submitting creates the
  // real (mocked) project and advances into the studio on `game-77`.
  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.fill('a pong game');
  await input.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/learn/playground/${STUDIO_PROJECT_ID}$`));
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 15_000 });

  if (opts.openCode) {
    await page.getByRole('button', { name: 'See code' }).click();
    await expect(page.getByText('main.js').first()).toBeVisible();
  }
}

/**
 * Open the authed new-project LandingScreen (the prompt-first entry). The hub
 * routes a new Tiny Game to `/learn/playground/new`, whose `isNew` sentinel makes
 * `PlaygroundApp` open on the landing phase (see PlaygroundApp.tsx `isNew`). This
 * replaces `goto('/playground-sandbox')` for the landing/generating-flow specs.
 */
export async function openLanding(page: Page): Promise<void> {
  await page.goto(`/learn/playground/new`);
  await expect(page.getByPlaceholder(LANDING_PLACEHOLDER)).toBeVisible({ timeout: 15_000 });
}
