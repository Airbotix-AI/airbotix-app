import { test, expect, type Page } from '@playwright/test';

// ── PR FE1 — real game project create/open + core UDL + naming (PRD J1) ───────
// Every backend call is ROUTE-MOCKED (page.route) so the suite is deterministic
// and offline: auth bootstrap, /auth/me (a kid), wallet, project list, the real
// `POST /projects {kind:'game'}` create, and the seeded VFS read. No network, no
// live LLM. Asserts the J1 flow: pick the Tiny Game card on the authed hub →
// studio opens on the real (mocked) VFS, chat-first, with a named project; plus a
// UDL accessibility smoke (picture starter chips + read-aloud + voice present)
// and a stable hub screenshot.

const KID = { id: 'kid-1', nickname: 'Robo', age: 9, family_id: 'fam-1' };

// The seeded Phaser VFS the backend returns for a freshly-created game project
// (D-GAME2 shape: entry main.js + a scene + style.css). Kept minimal + runnable.
const SEEDED_VFS = {
  files: [
    {
      path: 'main.js',
      content:
        "new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 320, height: 240, scene: [Boot] });\n",
      kind: 'text',
      size: 96,
    },
    {
      path: 'src/scenes/Boot.js',
      content: "class Boot extends Phaser.Scene { constructor(){ super('Boot'); } create(){} }\n",
      kind: 'text',
      size: 80,
    },
    { path: 'style.css', content: 'html,body{margin:0;background:#000}\n', kind: 'text', size: 34 },
  ],
};

/**
 * Mock the whole backend the hub→studio flow touches and seat a kid session.
 * `addInitScript` seeds the in-memory access token + bootstrapped flag BEFORE the
 * app mounts so the kid-only routes don't bounce to /learn/login.
 */
async function mockBackendAsKid(page: Page) {
  // Auth bootstrap: /auth/refresh hands back an access token; /auth/me a kid.
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'kid-token' }) }),
  );
  await page.route('**/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ role: 'kid', kid: KID }),
    }),
  );
  // Wallet (the hub shows the Stars balance).
  await page.route('**/families/*/wallet', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stars_balance: 42, daily_used: 0, daily_cap: 100, paused: false }),
    }),
  );
  // Past projects list (empty — keeps the hub deterministic).
  await page.route('**/kids/*/projects*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
  );
  // The seeded VFS read for the created project (studio opens on these files).
  // Registered BEFORE the create route so the more-specific `/code/files` glob
  // wins for that request (Playwright matches most-recently-added first).
  await page.route('**/projects/*/code/files', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SEEDED_VFS) }),
  );
  // The REAL game-project create (PRD J1): assert it's kind=game, then 201 an id.
  await page.route('**/projects', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = route.request().postDataJSON() as { kind?: string; template?: string; title?: string };
    expect(body.kind).toBe('game');
    expect(body.template).toBe('phaser_pong');
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'game-77' }),
    });
  });
}

test('J1: Tiny Game card creates a real game project and opens the studio on its VFS', async ({ page }) => {
  await mockBackendAsKid(page);
  await page.goto('/learn/create/code');

  // The hub renders the Tiny Game card (J1 `hub-template-pong`).
  const card = page.getByTestId('hub-template-pong');
  await expect(card).toBeVisible();

  // Pick it → backend create (mocked, asserted kind=game) → route to the studio.
  await card.click();
  await expect(page).toHaveURL(/\/learn\/playground\/game-77$/);

  // Studio opens chat-first on the REAL (mocked) seeded VFS: the launch hand-off
  // message is present, and the seeded entry file is reachable in the editor.
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'See code' }).click();
  await expect(page.getByText('main.js').first()).toBeVisible();
});

test('UDL accessibility smoke: picture starter chips + read-aloud + voice on the landing', async ({ page }) => {
  // The DEV sandbox renders the same LandingScreen (no auth needed for the a11y
  // surface). Assert the OD-6 controls are present and labelled.
  await page.goto('/playground-sandbox');
  await expect(page.getByTestId('studio-root')).toBeVisible();

  // Picture/icon starter chips (≥1) — each a tappable picture for non-readers.
  await expect(page.getByTestId('starter-chip').first()).toBeVisible();
  expect(await page.getByTestId('starter-chip').count()).toBeGreaterThan(0);

  // Read-aloud + voice input are present with accessible labels. (No game-name
  // field: the project title is derived from the prompt and the AI names it.)
  await expect(page.getByTestId('read-aloud')).toHaveAttribute('aria-label', 'Read aloud');
  await expect(page.getByTestId('voice-input')).toBeVisible();

  // Read-aloud uses on-device speech synthesis (no network / no LLM): clicking it
  // must not throw and must call window.speechSynthesis.speak.
  const spoke = await page.evaluate(() => {
    let called = false;
    const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      called = true;
      try {
        orig(u);
      } catch {
        /* headless may lack a voice; the call is what we assert */
      }
    };
    (document.querySelector('[data-testid="read-aloud"]') as HTMLButtonElement).click();
    return called;
  });
  expect(spoke).toBe(true);
});

test('voice input: a chip-named game can be named and submitted (UDL naming)', async ({ page }) => {
  await page.goto('/playground-sandbox');
  // Name the game (PRD J1) + pick a picture chip, then build — the name + prompt
  // carry into the studio (chat-first launch echoes the kid's idea).
  await page.getByTestId('game-name-input').fill('SUPERCAT');
  await page.getByTestId('starter-chip').first().click();
  await page.getByRole('button', { name: 'Build game' }).click();
  await expect(page.getByRole('button', { name: /Split/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('chat-starter')).toBeVisible();
});

// ── Stable hub screenshot ─────────────────────────────────────────────────────
test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: landing screen with UDL controls', async ({ page }) => {
    await page.goto('/playground-sandbox');
    await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'light');
    // Wait on a stable element so the screen is fully laid out before the shot.
    await expect(page.getByTestId('game-name-input')).toBeVisible();
    await expect(page.getByTestId('starter-chip').first()).toBeVisible();
    await expect(page).toHaveScreenshot('landing-udl.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
});
