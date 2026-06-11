// Hand-crafted offline asset art for the `/try/playground` demo (try-demo-mode-prd
// §3 step 7 "Make it beautiful"). The REAL Asset Viewer / chat generation pipeline
// runs unchanged — only the art source is swapped (the `setDemoAssetGen` seam in
// `assetGen.ts`), so demo evaluators see genuinely good-looking stickers instead
// of the e2e stub's flat colour swatches (which stay untouched for the real
// product's offline/dev sessions). Everything here is deterministic: the same
// prompt always yields byte-identical art. Audio prompts keep the stub's honest
// offline tone.

import {
  type GenAssetRequest,
  type GenAssetResult,
} from '../learn/playground/assetGen';
import { generateAssetStub, inferStubKind } from '../learn/playground/assetGenStub';
import { TOUR_ASSET_PROMPT, TOUR_REMIX_PROMPT } from './demoScript.playground';

const SIZE = 256;

/** Stable, bitwise-free string hash (mirrors the stub's) for fallback hues. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 1_000_000_007;
  return h;
}

function svgDataUrl(body: string): GenAssetResult {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" ` +
    `viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`;
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return { dataUrl: `data:image/svg+xml;base64,${btoa(bin)}`, mime: 'image/svg+xml', meta: { demo: true, kind: 'image' } };
}

/** A 4-point sparkle star at (x, y) with radius r. */
function sparkle(x: number, y: number, r: number, opacity: number): string {
  const q = r * 0.22;
  return (
    `<path fill="#ffffff" opacity="${opacity}" d="M${x} ${y - r} L${x + q} ${y - q} ` +
    `L${x + r} ${y} L${x + q} ${y + q} L${x} ${y + r} L${x - q} ${y + q} ` +
    `L${x - r} ${y} L${x - q} ${y - q} Z"/>`
  );
}

/** The shared apple silhouette: body path + stem + leaf + highlight + shading. */
function appleArt(opts: {
  bodyStops: [string, string, string];
  leafStops: [string, string];
  shade: string;
  extras?: string;
}): string {
  const [b0, b1, b2] = opts.bodyStops;
  const [l0, l1] = opts.leafStops;
  return (
    '<defs>' +
    `<radialGradient id="body" cx="0.35" cy="0.3" r="0.95">` +
    `<stop offset="0" stop-color="${b0}"/><stop offset="0.45" stop-color="${b1}"/>` +
    `<stop offset="1" stop-color="${b2}"/></radialGradient>` +
    `<linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${l0}"/><stop offset="1" stop-color="${l1}"/></linearGradient>` +
    '</defs>' +
    // soft ground shadow
    '<ellipse cx="128" cy="234" rx="72" ry="12" fill="#000000" opacity="0.12"/>' +
    // the apple body (two lobes meeting in a top dip)
    '<path fill="url(#body)" d="M128 92 C150 62 200 66 212 110 C224 154 196 210 160 226 ' +
    'C146 232 138 230 128 224 C118 230 110 232 96 226 C60 210 32 154 44 110 C56 66 106 62 128 92 Z"/>' +
    // bottom inner shading (gives the body roundness)
    `<path opacity="0.18" fill="${opts.shade}" d="M60 180 C84 216 172 216 196 180 ` +
    'C186 210 152 228 128 224 C104 228 70 210 60 180 Z"/>' +
    // specular highlight
    '<ellipse cx="92" cy="126" rx="20" ry="34" fill="#ffffff" opacity="0.35" transform="rotate(-18 92 126)"/>' +
    // stem
    '<path d="M128 90 C126 70 132 56 142 46" stroke="#6d4c41" stroke-width="11" stroke-linecap="round" fill="none"/>' +
    // leaf
    '<path fill="url(#leaf)" d="M146 62 C170 42 202 44 210 52 C202 76 172 88 148 78 C144 72 144 66 146 62 Z"/>' +
    (opts.extras ?? '')
  );
}

/** §3 step 7a — "a shiny red apple sticker": a glossy red apple. */
export function redAppleSticker(): GenAssetResult {
  return svgDataUrl(
    appleArt({
      bodyStops: ['#ff8a80', '#e53935', '#8e0000'],
      leafStops: ['#9ccc65', '#558b2f'],
      shade: '#4a0e0e',
    }),
  );
}

/** §3 step 7b — "make it golden and sparkly": the golden remix, with sparkles. */
export function goldenAppleSticker(): GenAssetResult {
  return svgDataUrl(
    appleArt({
      bodyStops: ['#fff3b0', '#ffc107', '#b8860b'],
      leafStops: ['#dce775', '#9e9d24'],
      shade: '#7a5c00',
      extras:
        sparkle(70, 84, 16, 0.95) +
        sparkle(196, 96, 12, 0.9) +
        sparkle(176, 196, 14, 0.85) +
        sparkle(96, 206, 9, 0.8) +
        sparkle(216, 156, 8, 0.75),
    }),
  );
}

/** Free-explore fallback: a soft-gradient glossy sticker (hue from the prompt,
 *  like the stub's) with sparkles + the prompt as its label — deterministic, and
 *  far friendlier than a flat colour block. */
export function genericSticker(prompt: string, ref: string): GenAssetResult {
  const hue = hashString(`${prompt}|${ref}`) % 360;
  const label = prompt
    .slice(0, 26)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return svgDataUrl(
    '<defs>' +
      `<linearGradient id="bg" x1="0" y1="0" x2="0.8" y2="1">` +
      `<stop offset="0" stop-color="hsl(${hue}, 85%, 72%)"/>` +
      `<stop offset="1" stop-color="hsl(${(hue + 40) % 360}, 75%, 52%)"/></linearGradient>` +
      '</defs>' +
      '<rect x="10" y="10" width="236" height="236" rx="40" fill="url(#bg)"/>' +
      '<rect x="10" y="10" width="236" height="236" rx="40" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="6"/>' +
      // glossy top sheen
      '<path d="M30 78 C70 44 186 44 226 78 L226 50 C226 28 208 16 186 16 L70 16 C48 16 30 28 30 50 Z" fill="#ffffff" opacity="0.28"/>' +
      sparkle(60, 64, 13, 0.9) +
      sparkle(200, 88, 9, 0.85) +
      sparkle(176, 180, 11, 0.8) +
      `<text x="128" y="140" fill="#ffffff" font-family="sans-serif" font-size="19" ` +
      `font-weight="bold" text-anchor="middle" dominant-baseline="middle">${label}</text>`,
  );
}

/**
 * The demo's asset generator (installed behind `setDemoAssetGen` by
 * `demoAdapters.ts`): crafted art for the two tour prompts, the glossy generic
 * sticker for free-explore image asks, and the stub's honest tone for audio.
 */
export function demoAssetGen(req: GenAssetRequest): Promise<GenAssetResult> {
  const kind = req.kind ?? inferStubKind(req.prompt);
  if (kind === 'audio') return generateAssetStub(req);
  const prompt = req.prompt.trim();
  if (prompt === TOUR_ASSET_PROMPT) return Promise.resolve(redAppleSticker());
  if (prompt === TOUR_REMIX_PROMPT) return Promise.resolve(goldenAppleSticker());
  return Promise.resolve(genericSticker(prompt, req.refUrl ?? req.refAssetPath ?? ''));
}
