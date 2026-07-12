import { readFileSync } from 'node:fs';

import { test, expect } from '@playwright/test';

import { installGameSignalRecorder, mockBackendAsKid, openStudio, type VfsFile } from './helpers';

// ── M0 game-smoke ─────────────────────────────────────────────────────────────
// The verification harness every Game Studio PR reuses. Migrated off the DEV-only
// `/playground-sandbox` route onto the AUTHED `/learn/playground/:projectId` route
// with a fully route-mocked backend (see `helpers.ts`): it seats a kid session,
// seeds the REAL multi-file `STARTER_PROJECT` scaffold as the project's VFS, opens
// the studio chat-first, runs the (stub) Phaser starter, and proves the game
// actually RUNS, deterministically:
//
//   "game runs" === zero console errors  AND  the canvas renders (a stat fps > 0)
//
// Both signals come from the same postMessage channel the runner already uses
// (see buildGamePreview.ts / GameFrame.tsx): the sandboxed iframe posts
//   { __airbotixConsole, level, text, loc }   for every console call, and
//   { __airbotixStat,    fps, paused }         every ~500ms while the game loops.
// The iframe posts to `parent` (the page's own window), so we capture them with a
// page init-script (`installGameSignalRecorder`) — no app/source changes, no
// arbitrary sleeps.

test('game-smoke: the starter game runs with zero console errors and a live canvas (fps > 0)', async ({
  page,
}) => {
  await installGameSignalRecorder(page);
  // Seed the REAL starter scaffold as the project VFS so the studio opens on a
  // runnable multi-file Phaser game (main.js + Boot/Game scenes).
  await mockBackendAsKid(page, { age: 9 });
  await openStudio(page);

  // Chat-first launch: "Run game" opens the runner AND plays it (mounts the game
  // iframe, no Play-placeholder). This is the same path a kid takes from chat.
  await page.getByRole('button', { name: 'Run game' }).click();
  await expect(page.locator('iframe[title="Game"]')).toBeVisible({ timeout: 6_000 });

  // Signal 1 — the canvas renders: the game loop is posting stats with fps > 0.
  // Polled (not slept): waits on the explicit condition, then settles.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeMaxFps: number }).__smokeMaxFps), {
      timeout: 10_000,
      message: 'expected a runner stat with fps > 0 (the game loop is alive)',
    })
    .toBeGreaterThan(0);

  // Cross-check the same signal via the runner's own status-bar fps readout — so
  // the smoke also guards the visible UI, not just the wire.
  await expect(page.getByText(/\bRunning\b/)).toBeVisible();
  await expect(page.getByText(/[1-9]\d* fps/)).toBeVisible({ timeout: 6_000 });

  // Signal 2 — zero uncaught console errors from the kid's game. The recorder
  // captures every error-level console message (the runtime's 'ready' handshake
  // is info-level, so it never counts). Give a beat for any late error to
  // arrive AFTER we've already confirmed the loop is running.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeErrors: string[] }).__smokeErrors), {
      timeout: 3_000,
      message: 'the starter game must run clean (no console-level errors)',
    })
    .toEqual([]);
});

// ── HTML overlay smoke (D-GAME13) ─────────────────────────────────────────────
// The starter now ships `overlay.html` (score chip + ▲/▼ touch buttons) — the ONE
// reserved fragment the runtime injects as `<div id="overlay">` above the canvas.
// Proves the full overlay contract in a REAL browser: the fragment renders inside
// the sandboxed frame, the container is pass-through (pointer-events: none) while
// the buttons opt back in (auto), a HELD ▲ still moves the paddle AFTER the
// canvas has been touched (the stale-activePointer regression class: an ungated
// pointer-follow re-pins the paddle every frame and deads the buttons), the
// composited snapshot channel delivers canvas+DOM pixels, and the game-runs
// oracle (fps > 0) is unchanged.

test('game-smoke (overlay): the starter overlay renders, passes events through, and its buttons work', async ({
  page,
}) => {
  await installGameSignalRecorder(page);
  await mockBackendAsKid(page, { age: 9 });
  await openStudio(page);

  await page.getByRole('button', { name: 'Run game' }).click();
  await expect(page.locator('iframe[title="Game"]')).toBeVisible({ timeout: 6_000 });
  const frame = page.frameLocator('iframe[title="Game"]');

  // The overlay fragment renders INSIDE the sandboxed frame, above the canvas.
  const upBtn = frame.locator('#overlay [data-ui]#btn-up');
  await expect(upBtn).toBeVisible({ timeout: 6_000 });
  await expect(frame.locator('#hud-score')).toHaveText('0');

  // Pointer-events contract: the container swallows nothing; buttons opt in.
  expect(
    await frame.locator('#overlay').evaluate((el) => getComputedStyle(el).pointerEvents),
  ).toBe('none');
  expect(await upBtn.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('auto');

  // Touch the canvas once — this leaves activePointer holding a stale position,
  // the exact state where an ungated pointer-follow would dead the buttons…
  await frame.locator('#game canvas').click({ position: { x: 40, y: 40 } });
  // The starter's main.js keeps the game on `var game` (a window global in the
  // classic-script srcdoc), so the paddle is directly observable in-frame.
  const paddleY = () =>
    frame
      .locator('#overlay')
      .evaluate(
        () =>
          (window as unknown as { game: { scene: { keys: { Game: { player: { y: number } } } } } })
            .game.scene.keys.Game.player.y,
      );
  const before = await paddleY();
  // …then HOLD ▲ and assert the paddle actually keeps moving up.
  await upBtn.dispatchEvent('pointerdown');
  await expect
    .poll(paddleY, {
      timeout: 5_000,
      message: 'expected a held ▲ to keep moving the paddle up after a canvas touch',
    })
    .toBeLessThan(before - 10);
  await upBtn.dispatchEvent('pointerup');

  // Composited snapshot (D-HARN-21b): with an overlay present, the snapshot
  // channel must reply with canvas+DOM pixels (`composited: true`) — the
  // foreignObject compositor working in a real browser, not just the fallback.
  const snapshot = await page.evaluate(async () => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Game"]');
    if (!iframe?.contentWindow) return null;
    const reply = new Promise<{ composited?: boolean; dataUrl?: string } | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 5_000);
      window.addEventListener('message', function onMsg(e: MessageEvent) {
        const d = e.data as { __airbotixSnapshot?: boolean; dataUrl?: string; composited?: boolean };
        if (d && d.__airbotixSnapshot === true) {
          clearTimeout(timer);
          window.removeEventListener('message', onMsg);
          resolve({ composited: d.composited, dataUrl: d.dataUrl });
        }
      });
    });
    iframe.contentWindow.postMessage({ __airbotixControl: true, action: 'snapshot' }, '*');
    return reply;
  });
  expect(snapshot?.composited, 'the foreignObject compositor must succeed in a real browser').toBe(
    true,
  );
  expect(snapshot?.dataUrl ?? '').toMatch(/^data:image\//);

  // The game-runs oracle is UNCHANGED: loop alive + zero console errors.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeMaxFps: number }).__smokeMaxFps), {
      timeout: 10_000,
      message: 'expected a runner stat with fps > 0 (the game loop is alive)',
    })
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeErrors: string[] }).__smokeErrors), {
      timeout: 3_000,
      message: 'the starter game with an overlay must run clean',
    })
    .toEqual([]);
});

// ── 3D + GLB smoke (D-3D-09) ──────────────────────────────────────────────────
// The full "use a 3D model in the game" chain, sandbox-side: a three-engine
// project whose VFS carries an animated .glb asset loads it with the vendored
// `THREE.GLTFLoader` global (the path literal is inlined to a data: URL by
// buildGamePreview) and plays a clip via AnimationMixer. Same oracle as above:
// the loop is alive (fps > 0) and the game runs clean — plus the game's own
// "glb-loaded" log proves the model + its animation clips actually arrived.

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const GLB_DATA_URL = `data:model/gltf-binary;base64,${readFileSync('e2e/fixtures/spin.glb').toString('base64')}`;

const THREE_GLB_PROJECT: VfsFile[] = [
  { path: 'assets/imported/spin.glb', content: GLB_DATA_URL, kind: 'asset', size: GLB_DATA_URL.length },
  text(
    'main.js',
    `const mount = document.getElementById('game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100);
camera.position.set(0, 1, 3);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(mount.clientWidth, mount.clientHeight);
mount.appendChild(renderer.domElement);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(3, 6, 4);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x8899ff, 0.7));
let mixer = null;
new THREE.GLTFLoader().load('assets/imported/spin.glb', (gltf) => {
  scene.add(gltf.scene);
  mixer = new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Spin')).play();
  console.log('glb-loaded:' + gltf.animations.length + ' clips');
});
let rafId = null;
let last = null;
function loop(now) {
  rafId = requestAnimationFrame(loop);
  const dt = (now - (last || now)) / 1000;
  last = now;
  if (mixer) mixer.update(dt);
  renderer.render(scene, camera);
}
loop();
window.__game = {
  renderer: renderer,
  pause() { if (rafId) cancelAnimationFrame(rafId); rafId = null; },
  resume() { if (!rafId) loop(); },
};`,
  ),
];

test('game-smoke (3D): a three game loads an animated .glb via THREE.GLTFLoader and runs clean', async ({
  page,
}) => {
  await installGameSignalRecorder(page);
  await mockBackendAsKid(page, { age: 9, engine: 'three', files: THREE_GLB_PROJECT });
  await openStudio(page);

  await page.getByRole('button', { name: 'Run game' }).click();
  const gameFrame = page.locator('iframe[title="Game"]');
  await expect(gameFrame).toBeVisible({ timeout: 6_000 });

  // Cache-bust guard: the vendored three.js global is loaded from a CONTENT-HASHED
  // URL (three-0.184.0-<8hex>.global.js), never the bare fixed name — so a deploy
  // that changes the engine (e.g. adding the GLTFLoader addon) can't be masked by
  // a stale `immutable` cache serving a THREE with no GLTFLoader. Regression guard
  // for "GLTFLoader is not available" (learn-game-studio-3d-prd D-3D-09).
  const srcdoc = (await gameFrame.getAttribute('srcdoc')) ?? '';
  expect(srcdoc).toMatch(/<script src="\/vendor\/three-0\.184\.0-[0-9a-f]{8}\.global\.js"><\/script>/);

  // The model + its clips actually loaded inside the sandbox.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeLogs: string[] }).__smokeLogs), {
      timeout: 10_000,
      message: 'expected the game to log glb-loaded (GLTFLoader delivered the model)',
    })
    .toContain('glb-loaded:2 clips');

  // The render loop is alive (the 3D control shim derives fps from the renderer).
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeMaxFps: number }).__smokeMaxFps), {
      timeout: 10_000,
      message: 'expected a runner stat with fps > 0 (the 3D loop is alive)',
    })
    .toBeGreaterThan(0);

  // Zero uncaught console errors from the game.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeErrors: string[] }).__smokeErrors), {
      timeout: 3_000,
      message: 'the 3D glb game must run clean (no console-level errors)',
    })
    .toEqual([]);
});
