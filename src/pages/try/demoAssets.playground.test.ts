// Crafted demo asset art (try-demo-mode-prd §3 step 7). Asserts the demo
// generator is deterministic, genuinely composed art (gradients/shading/
// sparkles — not the stub's flat swatch), honest for audio, and — the DRIFT
// ALARM — that the REAL generation store writes the remix exactly where the
// script's wire-in step expects it (`TOUR_REMIX_ASSET_PATH`): a slug/extension
// change in `generationStore` breaks loudly here, never silently in the demo.

import { afterEach, describe, expect, it } from 'vitest';

import { setDemoAssetGen } from '../learn/playground/assetGen';
import { useGenerationStore } from '../learn/playground/generationStore';
import { useProjectStore } from '../learn/playground/projectStore';
import { demoAssetGen } from './demoAssets.playground';
import {
  TOUR_ASSET_PROMPT,
  TOUR_REMIX_PROMPT,
  TOUR_REMIX_ASSET_PATH,
} from './demoScript.playground';

const decodeSvg = (dataUrl: string): string => {
  expect(dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
  return atob(dataUrl.split(',')[1]);
};

afterEach(() => {
  setDemoAssetGen(null);
  useGenerationStore.getState().cancel();
  useProjectStore.getState().setFiles([]);
});

describe('demoAssetGen (crafted offline art)', () => {
  it('is deterministic — same prompt, byte-identical art', async () => {
    const a = await demoAssetGen({ prompt: TOUR_ASSET_PROMPT });
    const b = await demoAssetGen({ prompt: TOUR_ASSET_PROMPT });
    expect(a.dataUrl).toBe(b.dataUrl);
  });

  it('the tour prompts get composed apple art (gradients, leaf, highlight)', async () => {
    const apple = decodeSvg((await demoAssetGen({ prompt: TOUR_ASSET_PROMPT })).dataUrl);
    expect(apple).toContain('radialGradient');
    expect(apple).toContain('url(#leaf)');
    expect(apple).toContain('ellipse'); // specular highlight
    const golden = decodeSvg(
      (await demoAssetGen({ prompt: TOUR_REMIX_PROMPT, refAssetPath: 'assets/generated/x.svg' }))
        .dataUrl,
    );
    expect(golden).toContain('#ffc107'); // gold body
    expect(golden.match(/opacity="0\.[789]\d?"/g)?.length ?? 0).toBeGreaterThanOrEqual(3); // sparkles
    expect(golden).not.toBe(apple);
  });

  it('free-explore image prompts get the glossy generic sticker (not a flat swatch)', async () => {
    const out = await demoAssetGen({ prompt: 'a happy dragon' });
    const svg = decodeSvg(out.dataUrl);
    expect(svg).toContain('linearGradient');
    expect(svg).toContain('a happy dragon'); // labelled
    expect(svg).toContain('<path'); // sheen + sparkles, not just a rect
  });

  it('audio prompts stay honest — the stub tone, not fake art', async () => {
    const out = await demoAssetGen({ prompt: 'a jump sound' });
    expect(out.mime).toBe('audio/wav');
  });

  it('escapes markup in free-explore prompts (no SVG injection)', async () => {
    const svg = decodeSvg((await demoAssetGen({ prompt: '<script>alert(1)</script>' })).dataUrl);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
});

describe('the REAL generation store lands the remix at TOUR_REMIX_ASSET_PATH (drift alarm)', () => {
  it('generate → remix through useGenerationStore writes the script-expected path', async () => {
    setDemoAssetGen(demoAssetGen);
    useProjectStore.getState().setFiles([]);
    const store = useGenerationStore.getState();

    await store.start({ prompt: TOUR_ASSET_PROMPT });
    const first = useGenerationStore.getState();
    expect(first.status).toBe('done');
    expect(first.resultPath).toMatch(/^assets\/generated\/.+\.svg$/);
    useGenerationStore.getState().dismiss();

    await store.start({
      prompt: TOUR_REMIX_PROMPT,
      mode: 'remix',
      refAssetPath: first.resultPath!,
    });
    const second = useGenerationStore.getState();
    expect(second.status).toBe('done');
    // The script's wire-in edit points the game at exactly this path — if the
    // store's slugging/extension ever changes, fix TOUR_REMIX_ASSET_PATH + the
    // wire step in demoScript.playground.ts in the same change.
    expect(second.resultPath).toBe(TOUR_REMIX_ASSET_PATH);
    // Both stickers are now real VFS assets the viewer lists + the game can load.
    const files = useProjectStore.getState().files;
    expect(files.find((f) => f.path === TOUR_REMIX_ASSET_PATH)?.kind).toBe('asset');
  }, 15_000);
});
