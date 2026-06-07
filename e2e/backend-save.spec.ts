import { test, expect, type Page } from '@playwright/test';

// ── PR FE2 — backend save/load + offline outbox + save-status UX (PRD J3/J9) ──
// Every backend call is ROUTE-MOCKED (page.route) so the suite is deterministic
// and offline: auth bootstrap, /auth/me (a kid), wallet, project list, the game
// create, the versioned VFS read (GET …/code/files), and the SAVE write-back
// (PUT …/code/files). No network, no live LLM. Asserts:
//   - editing reaches a visible "All saved ✓" status (the PUT landed),
//   - a reload restores the SAVED server state (not the scaffold),
//   - a stale-version save keeps the newest copy ("we kept your newest copy")
//     and never shows the word "conflict",
//   - a stable screenshot of the save-state badge.

const KID = { id: 'kid-1', nickname: 'Robo', age: 9, family_id: 'fam-1' };

// The seeded Phaser VFS the backend serves for a freshly-created game project.
const SCAFFOLD_VFS = {
  version: 1,
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
 * Mock the backend the studio touches + seat a kid session. The VFS GET is
 * STATEFUL: it returns whatever the last successful PUT saved (so a reload
 * restores the saved state, not the scaffold). The PUT bumps the version.
 */
async function mockBackendAsKid(page: Page, opts: { conflict?: boolean } = {}) {
  // A mutable server VFS so the GET reflects what a PUT saved (last-write-wins).
  const server = { files: structuredClone(SCAFFOLD_VFS.files), version: SCAFFOLD_VFS.version };
  // The conflict fires only on the FIRST save (another tab saved first); after we
  // adopt the server's version the next save succeeds — the realistic reconcile.
  let conflictArmed = !!opts.conflict;

  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'kid-token' }) }),
  );
  await page.route('**/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'kid', kid: KID }) }),
  );
  await page.route('**/families/*/wallet', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stars_balance: 42, daily_used: 0, daily_cap: 100, paused: false }),
    }),
  );
  await page.route('**/kids/*/projects*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
  );

  // GET + PUT share the same glob; branch on method. Registered before the create
  // route so the more-specific `/code/files` glob wins (most-recent-added first).
  await page.route('**/projects/*/code/files', (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ files: server.files, version: server.version }),
      });
    }
    // PUT — save write-back.
    const body = req.postDataJSON() as { files: typeof server.files; version: number };
    if (conflictArmed) {
      conflictArmed = false;
      // Simulate another tab/device having saved first: reject as stale (409) and
      // hand back a NEWER server snapshot the client must keep. Adopt it as the
      // server state so the client's follow-up save (with the new version) wins.
      const newer = {
        files: [
          { path: 'main.js', content: '// newer copy from another tab\n', kind: 'text', size: 31 },
          ...server.files.filter((f) => f.path !== 'main.js'),
        ],
        version: server.version + 5,
      };
      server.files = newer.files;
      server.version = newer.version;
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'SAVE_CONFLICT', message: 'stale', details: newer } }),
      });
    }
    // Accept: adopt the saved files, bump the version, echo it back.
    server.files = body.files;
    server.version += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ files: server.files, version: server.version }),
    });
  });

  await page.route('**/projects', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'game-77' }) });
  });
}

/** Drive the J1 hub → studio flow into the Code Editor on the seeded VFS. */
async function openStudio(page: Page) {
  await page.goto('/learn/create/code');
  await page.getByTestId('hub-template-pong').click();
  await expect(page).toHaveURL(/\/learn\/playground\/game-77$/);
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'See code' }).click();
  await expect(page.getByText('main.js').first()).toBeVisible();
}

test('J3: edit → save-status reaches "All saved ✓" → reload restores the saved state (mocked)', async ({ page }) => {
  await mockBackendAsKid(page);
  await openStudio(page);

  // Edit via the file tree (a deterministic VFS change → debounced save).
  await page.getByRole('button', { name: 'New file', exact: true }).click();
  await page.getByLabel('File or folder name').fill('Saved.js');
  await page.getByLabel('File or folder name').press('Enter');
  await expect(page.getByText('Saved.js').first()).toBeVisible();

  // The visible save status reaches "All saved ✓" once the PUT lands.
  const status = page.getByTestId('save-status');
  await expect(status).toHaveAttribute('data-status', 'saved', { timeout: 6_000 });
  await expect(status).toContainText('All saved');

  // Reload → re-enter the studio → the SAVED server state is restored (the new
  // file is present; not the scaffold which lacked it).
  await page.reload();
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'See code' }).click();
  await expect(page.getByText('Saved.js').first()).toBeVisible({ timeout: 10_000 });
});

test('J3: a stale-version save keeps the newest copy (never the word "conflict")', async ({ page }) => {
  await mockBackendAsKid(page, { conflict: true });
  await openStudio(page);

  await page.getByRole('button', { name: 'New file', exact: true }).click();
  await page.getByLabel('File or folder name').fill('Mine.js');
  await page.getByLabel('File or folder name').press('Enter');

  // The save hits a 409 → we keep the server's newest copy, reassure the kid, and
  // NEVER surface the word "conflict".
  const status = page.getByTestId('save-status');
  await expect(status).toHaveAttribute('data-status', 'kept-newest', { timeout: 6_000 });
  await expect(status).toContainText('We kept your newest copy');
  await expect(page.getByText(/conflict/i)).toHaveCount(0);

  // The superseded build is recoverable in History (not silently lost).
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText(/we kept your newest/i)).toBeVisible();
});

// ── Stable save-state screenshot ──────────────────────────────────────────────
test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: the save-status badge in the taskbar', async ({ page }) => {
    await mockBackendAsKid(page);
    await openStudio(page);

    await page.getByRole('button', { name: 'New file', exact: true }).click();
    await page.getByLabel('File or folder name').fill('Shot.js');
    await page.getByLabel('File or folder name').press('Enter');

    const status = page.getByTestId('save-status');
    await expect(status).toHaveAttribute('data-status', 'saved', { timeout: 6_000 });
    await expect(status).toHaveScreenshot('save-status-saved.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
});
