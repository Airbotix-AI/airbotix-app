import { test, expect, type Page } from '@playwright/test';

// E2E for concurrent dual sessions (auth-system-prd.md §3.2.1): a parent
// (/portal) and a kid (/learn) signed in at the same time in ONE browser. A kid
// login must not evict the parent, and vice-versa.
//
// The e2e harness boots only the Vite dev server (no backend), so we stub the
// auth API with page.route. On boot the SPA calls POST /auth/refresh for BOTH
// kinds — stubbing both populates both in-memory tokens, exactly as a browser
// holding both refresh cookies would. /auth/me is answered per-kind from the
// bearer token. We then prove BOTH surfaces render in the same context and
// survive a reload — the dual-session guarantee.

const USER_TOKEN = 'user-access-token';
const KID_TOKEN = 'kid-access-token';

async function stubDualAuth(page: Page): Promise<{ refreshKinds: string[] }> {
  const refreshKinds: string[] = [];

  // Two refresh cookies → two refresh endpoints keyed by ?kind=. Both succeed,
  // simulating a browser that holds a live parent AND kid session.
  await page.route('**/auth/refresh**', async (route) => {
    const url = new URL(route.request().url());
    const kind = url.searchParams.get('kind') ?? 'user';
    refreshKinds.push(kind);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: kind === 'kid' ? KID_TOKEN : USER_TOKEN,
        expires_in: 900,
      }),
    });
  });

  // /auth/me answers per principal, distinguished by the bearer token the api
  // client attaches for that surface's session.
  await page.route('**/auth/me', async (route) => {
    const auth = route.request().headers()['authorization'] ?? '';
    const isKid = auth.includes(KID_TOKEN);
    const body = isKid
      ? { role: 'kid', kid: { id: 'kid_1', nickname: 'Mia', age: 10, family_id: 'fam_1' } }
      : {
          role: 'parent',
          user: {
            id: 'usr_1',
            email: 'parent@example.com',
            display_name: 'Parent One',
            role: 'parent',
            family_id: 'fam_1',
          },
          family: { id: 'fam_1', name: 'Ones', region: 'AU' },
          kid_profiles: [{ id: 'kid_1', nickname: 'Mia', age: 10 }],
        };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  return { refreshKinds };
}

test('boot refreshes BOTH kinds, and parent + kid surfaces coexist in one browser', async ({
  page,
}) => {
  const tracker = await stubDualAuth(page);

  // Parent surface renders (not bounced to /portal/login).
  await page.goto('/portal');
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  expect(page.url()).toContain('/portal');
  expect(page.url()).not.toContain('/login');

  // Kid surface renders too — the parent session was NOT evicted by the kid one.
  await page.goto('/learn');
  await expect(page.getByRole('link', { name: '✨ AI Studio' })).toBeVisible();
  expect(page.url()).not.toContain('/login');

  // Back to the parent surface — still authed (both sessions are live at once).
  await page.goto('/portal');
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  expect(page.url()).not.toContain('/login');

  // Boot attempted a refresh for each kind.
  expect(tracker.refreshKinds).toContain('user');
  expect(tracker.refreshKinds).toContain('kid');
});

test('reload on /learn keeps the kid session AND the parent session restorable', async ({
  page,
}) => {
  await stubDualAuth(page);

  await page.goto('/learn');
  await expect(page.getByRole('link', { name: '✨ AI Studio' })).toBeVisible();

  // A reload restores from the (stubbed) refresh cookies — kid stays signed in.
  await page.reload();
  await expect(page.getByRole('link', { name: '✨ AI Studio' })).toBeVisible();
  expect(page.url()).not.toContain('/login');

  // And the parent surface is still reachable in the same browser after reload.
  await page.goto('/portal');
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  expect(page.url()).not.toContain('/login');
});
