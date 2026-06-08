import { test, expect } from '@playwright/test';

import { mockBackendAsKid, openStudio, openLanding, STUDIO_PROJECT_ID } from './helpers';

// ── PR FE1 — real game project create/open + core UDL + naming (PRD J1) ───────
// Every backend call is ROUTE-MOCKED through the SHARED harness (`./helpers`) so
// the suite is deterministic, offline, and LLM-free (CLAUDE.md #5). The harness
// owns the auth bootstrap (its globs match the real `?kind=kid` query, and it
// mocks `/classes/mine` so the kid isn't logged out — two fixes the old local
// mock here was missing), the wallet, the project list, the real `POST /projects
// {kind:'game'}` create (→ `game-77`), and the seeded VFS read.
//
// These specs now run on the AUTHED route (the DEV `/playground-sandbox` is going
// away): the J1 hub→studio flow via `openStudio`, and the LandingScreen UDL/voice
// surface via `openLanding` (the authed `/learn/playground/new` prompt-first
// entry). Asserts the J1 flow (Tiny Game card → studio on the real mocked VFS,
// chat-first) plus the UDL accessibility surface (picture starter chips +
// read-aloud + voice) and a stable landing screenshot.

const LANDING_PLACEHOLDER = "Describe a game and we'll build it…";

test('J1: Tiny Game card creates a real game project and opens the studio on its VFS', async ({ page }) => {
  await mockBackendAsKid(page);
  // `openStudio` drives the real authed J1 hub → prompt-first landing → create
  // flow into the chat-first workspace on `game-77` (the mocked create id), and
  // (with `openCode`) opens the editor and awaits the seeded `main.js`.
  await openStudio(page, { openCode: true });

  // Landed on the studio for the real (mocked) created project, chat-first.
  await expect(page).toHaveURL(new RegExp(`/learn/playground/${STUDIO_PROJECT_ID}$`));
  await expect(page.getByTestId('chat-starter')).toBeVisible();
  await expect(page.getByText('main.js').first()).toBeVisible();
});

test('UDL accessibility smoke: picture starter chips + read-aloud + voice on the landing', async ({ page }) => {
  // The LandingScreen a11y surface now lives at the AUTHED `/learn/playground/new`
  // (no longer the DEV sandbox). Assert the OD-6 controls are present and labelled.
  await mockBackendAsKid(page);
  await openLanding(page);
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

test('voice input: a spoken idea fills the prompt and submits into the create flow (UDL naming)', async ({ page }) => {
  // Voice idea input (OD-6): the mic records → backend STT (`/llm/transcribe`) →
  // the transcript fills the prompt box. Stub that seam so the click is offline +
  // deterministic, then submit ("Build game") → the mocked create→workspace flow.
  await mockBackendAsKid(page);
  await page.route('**/llm/transcribe', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: 'a game with a cute cat hero' }),
    }),
  );
  // The voice button drives MediaRecorder + getUserMedia; stub them so a tap
  // records, stops, and resolves through the (mocked) STT seam without a real mic.
  await page.addInitScript(() => {
    class FakeRecorder {
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      mimeType = 'audio/webm';
      start() {
        this.ondataavailable?.({ data: new Blob(['x'], { type: this.mimeType }) });
      }
      stop() {
        this.onstop?.();
      }
    }
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorder;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [] }) },
    });
  });

  await openLanding(page);

  // Tap voice (start recording) → tap again (stop) → STT fills the prompt box.
  const voice = page.getByTestId('voice-input');
  await voice.click();
  await voice.click();
  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await expect(input).toHaveValue(/cute cat hero/, { timeout: 10_000 });

  // Submit ("Build game") → the mocked create→workspace flow advances into the
  // studio on `game-77`, chat-first.
  await page.getByRole('button', { name: 'Build game' }).click();
  await expect(page).toHaveURL(new RegExp(`/learn/playground/${STUDIO_PROJECT_ID}$`));
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 15_000 });
});

// ── Stable landing screenshot ─────────────────────────────────────────────────
test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: landing screen with UDL controls', async ({ page }) => {
    await mockBackendAsKid(page);
    await openLanding(page);
    await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'light');
    // Wait on stable elements so the screen is fully laid out before the shot.
    await expect(page.getByPlaceholder(LANDING_PLACEHOLDER)).toBeVisible();
    await expect(page.getByTestId('starter-chip').first()).toBeVisible();
    await expect(page).toHaveScreenshot('landing-udl.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
});
