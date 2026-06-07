import { test, expect, type Page } from '@playwright/test';

// ── PR FE5 — teacher class dashboard + live view + assessment (PRD §17.12 J12) ─
// Every backend call is ROUTE-MOCKED (page.route) so the suite is offline and
// byte-deterministic: auth bootstrap (/auth/refresh + /auth/me as a TEACHER, a
// `user` principal with role=teacher), the class dashboard snapshot, the per-kid
// assessment, and the teacher actions (push-hint / take-over / freeze / phase).
// The live class feed (WS class.feed) is driven via the DEV-only
// `class-feed-test` window seam so a kid's live edit is deterministic with no
// socket.io backend.

const TEACHER = {
  id: 'teacher-1',
  email: 'ms.lee@school.example',
  display_name: 'Ms Lee',
  role: 'teacher',
  family_id: null,
};

// Three seeded kids: one running, one with an error (auto-flagged), one with a
// raised hand. Class-nickname only — never real-name PII (compliance §11).
const DASHBOARD = {
  classId: 'class-9',
  className: 'Year 5 Robotics',
  phase: 'build',
  timerSeconds: 1500,
  frozen: false,
  tiles: [
    {
      kidId: 'k-ana',
      nickname: 'Ana',
      status: 'running',
      needsHelp: false,
      handRaisedAt: null,
      thumbnailDataUrl: null,
      takenOver: false,
    },
    {
      kidId: 'k-bo',
      nickname: 'Bo',
      status: 'error',
      needsHelp: false,
      handRaisedAt: null,
      thumbnailDataUrl: null,
      takenOver: false,
    },
    {
      kidId: 'k-cy',
      nickname: 'Cy',
      status: 'running',
      needsHelp: true,
      handRaisedAt: 1000,
      thumbnailDataUrl: null,
      takenOver: false,
    },
  ],
};

const ASSESSMENT = {
  kidId: 'k-ana',
  nickname: 'Ana',
  promptHistory: ['make the ball faster', 'add a score'],
  timeline: [
    { id: 'e1', source: 'kid_edit', at: 1, summary: 'wrote: make the ball faster', criteria: ['c1'] },
    { id: 'e2', source: 'ai_turn', at: 2, summary: 'edited Game.js velocity', criteria: ['c1'] },
    { id: 'e3', source: 'prediction', at: 3, summary: 'predicted faster', criteria: [] },
  ],
  criteria: [
    { id: 'c1', label: 'Uses variables to control movement', coverage: 'confirmed' },
    { id: 'c2', label: 'Adds a scoring system', coverage: 'suggested' },
    { id: 'c3', label: 'Handles game-over', coverage: 'none' },
  ],
};

// Scope every API mock to the BACKEND origin (the dev server points the app at
// localhost:3001). The teacher SPA routes (/teacher/classes/.../assessment) share
// the same path shape as the API, so an unscoped `**/…` glob would also match the
// page navigation itself and serve raw JSON. Pinning the origin avoids that.
const API = 'http://localhost:3001';

async function mockBackendAsTeacher(page: Page) {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'teacher-token' }),
    }),
  );
  await page.route(`${API}/auth/me`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ role: 'teacher', user: TEACHER, family: null }),
    }),
  );
  await page.route(`${API}/teacher/classes/*/dashboard`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DASHBOARD) }),
  );
  await page.route(`${API}/teacher/classes/*/kids/*/assessment`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ASSESSMENT) }),
  );
}

test('J12: needs-help kid sorts to top, error tile is flagged, kid edit updates its tile', async ({
  page,
}) => {
  const hintCalls: unknown[] = [];
  const takeoverCalls: string[] = [];
  await mockBackendAsTeacher(page);
  await page.route(`${API}/teacher/classes/*/kids/*/hint`, (route) => {
    hintCalls.push(route.request().postDataJSON());
    return route.fulfill({ status: 204, body: '' });
  });
  await page.route(`${API}/teacher/classes/*/kids/*/takeover`, (route) => {
    takeoverCalls.push(route.request().method());
    return route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/teacher/classes/class-9');
  await expect(page.getByTestId('class-dashboard')).toBeVisible();

  // Three tiles render.
  const tiles = page.getByTestId('kid-tile');
  await expect(tiles).toHaveCount(3);

  // The raised-hand kid (Cy) sorts to the very top (wait-time ordering, §17.17),
  // and carries the needs-help flag.
  await expect(tiles.first()).toHaveAttribute('data-kid-id', 'k-cy');
  await expect(tiles.first().getByTestId('needs-help-flag')).toBeVisible();

  // The error kid (Bo) is flagged with an error status and sorts above the plain
  // running kid (Ana).
  const order = await tiles.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-kid-id')),
  );
  expect(order).toEqual(['k-cy', 'k-bo', 'k-ana']);

  // A live kid edit (Bo recovers → running) updates exactly that tile via the
  // class feed; Bo then re-sorts below the still-idle/running set order rule.
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('class-feed-test', {
        detail: { type: 'game.vfs.changed', kidId: 'k-bo', at: 2000 },
      }),
    );
  });
  await expect(page.locator('[data-kid-id="k-bo"]')).toHaveAttribute('data-status', 'running');

  // Push-hint and take-over fire backend actions for the top (needs-help) kid.
  const topTile = page.locator('[data-kid-id="k-cy"]');
  await topTile.getByTestId('push-hint').click();
  await expect.poll(() => hintCalls.length).toBe(1);
  await topTile.getByTestId('teacher-takeover').click();
  await expect.poll(() => takeoverCalls).toEqual(['POST']);
  await expect(topTile.getByText('You have the wheel')).toBeVisible();
});

test('J12: pacing controls — freeze-all and phase fire backend actions', async ({ page }) => {
  const freezeCalls: unknown[] = [];
  const phaseCalls: unknown[] = [];
  await mockBackendAsTeacher(page);
  await page.route(`${API}/teacher/classes/*/freeze`, (route) => {
    freezeCalls.push(route.request().postDataJSON());
    return route.fulfill({ status: 204, body: '' });
  });
  await page.route(`${API}/teacher/classes/*/phase`, (route) => {
    phaseCalls.push(route.request().postDataJSON());
    return route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/teacher/classes/class-9');
  await expect(page.getByTestId('class-timer')).toContainText('25:00');

  await page.getByTestId('freeze-all').click();
  await expect.poll(() => freezeCalls).toEqual([{ frozen: true }]);

  await page.getByTestId('phase-share').click();
  await expect.poll(() => phaseCalls).toEqual([{ phase: 'share' }]);
});

test('J12: assessment view shows prompt history, process timeline, and criterion coverage', async ({
  page,
}) => {
  await mockBackendAsTeacher(page);
  await page.goto('/teacher/classes/class-9/kids/k-ana/assessment');

  await expect(page.getByTestId('assessment-view')).toBeVisible();

  // Prompt history (the kid's own authoring).
  await expect(page.getByTestId('prompt-entry')).toHaveCount(2);
  await expect(page.getByTestId('prompt-history')).toContainText('make the ball faster');

  // Process timeline (NOT a kid-vs-AI %).
  await expect(page.getByTestId('timeline-event')).toHaveCount(3);
  await expect(page.getByTestId('contribution-breakdown')).toContainText('AI turn');

  // Criterion coverage — confirmed vs suggested vs none are distinct.
  await expect(page.locator('[data-coverage="confirmed"]')).toHaveCount(1);
  await expect(page.locator('[data-coverage="suggested"]')).toHaveCount(1);
  await expect(page.locator('[data-coverage="none"]')).toHaveCount(1);

  // Exportable as evidence.
  await expect(page.getByTestId('export-evidence')).toHaveAttribute('download', /assessment-k-ana/);
});

// ── Stable dashboard screenshot ───────────────────────────────────────────────
test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: class dashboard', async ({ page }) => {
    await mockBackendAsTeacher(page);
    await page.goto('/teacher/classes/class-9');
    await expect(page.getByTestId('class-dashboard')).toBeVisible();
    await expect(page.getByTestId('kid-tile')).toHaveCount(3);
    await expect(page.getByTestId('raised-hands')).toBeVisible();
    await expect(page).toHaveScreenshot('class-dashboard.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
});
