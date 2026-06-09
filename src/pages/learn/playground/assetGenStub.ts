// Local, deterministic, offline stub for AI asset generation (design §7). NO
// network, NO LLM, NO DOM. Same (kind, prompt) → byte-identical data URL, so the
// generate → preview → use path is exercised before the backend lands. Mirrors
// how `gameAgentStub` stands in for the real chat turn behind the `runTurn` seam.

import type { GenAssetRequest, GenAssetResult } from './assetGen';

const SWATCH_DEFAULT_PX = 256;
const WAV_SAMPLE_RATE = 8000;
const WAV_DURATION_SEC = 0.25;
const WAV_MIN_FREQ = 220;
const WAV_FREQ_SPREAD = 660;
const WAV_AMPLITUDE = 0.3;
const INT16_MAX = 32767;
const HASH_MODULUS = 1_000_000_007;

/** Stable, bitwise-free string hash → non-negative integer. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) % HASH_MODULUS;
  }
  return h;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function utf8ToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

function parseSize(size: string | undefined): { w: number; h: number } {
  const m = size?.match(/(\d+)\D+(\d+)/);
  if (m) return { w: Number(m[1]), h: Number(m[2]) };
  return { w: SWATCH_DEFAULT_PX, h: SWATCH_DEFAULT_PX };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** A coloured rounded-rect swatch labelled with the prompt — deterministic SVG. */
function buildSvgSwatch(req: GenAssetRequest): GenAssetResult {
  const { w, h } = parseSize(req.size);
  // Fold any remix reference into the hash so a remix is a deterministic
  // VARIATION of a plain generation (different hue), not the same swatch.
  const seed = `${req.prompt}|${req.refUrl ?? req.refAssetPath ?? ''}`;
  const hue = hashString(seed) % 360;
  const fill = `hsl(${hue}, 70%, 62%)`;
  const label = escapeXml(req.prompt.slice(0, 40));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" rx="16" fill="${fill}"/>` +
    `<text x="50%" y="50%" fill="#ffffff" font-family="sans-serif" font-size="14" ` +
    `text-anchor="middle" dominant-baseline="middle">${label}</text>` +
    `</svg>`;
  return {
    dataUrl: `data:image/svg+xml;base64,${utf8ToBase64(svg)}`,
    mime: 'image/svg+xml',
    meta: { stub: true, kind: 'image', hue },
  };
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

/** A short mono 16-bit PCM WAV sine — frequency derived from the prompt hash. */
function buildWavTone(req: GenAssetRequest): GenAssetResult {
  const freq = WAV_MIN_FREQ + (hashString(req.prompt) % WAV_FREQ_SPREAD);
  const numSamples = Math.floor(WAV_SAMPLE_RATE * WAV_DURATION_SEC);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, WAV_SAMPLE_RATE, true);
  view.setUint32(28, WAV_SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i += 1) {
    const sample = Math.sin((2 * Math.PI * freq * i) / WAV_SAMPLE_RATE) * WAV_AMPLITUDE;
    view.setInt16(44 + i * 2, Math.round(sample * INT16_MAX), true);
  }

  return {
    dataUrl: `data:audio/wav;base64,${bytesToBase64(new Uint8Array(buffer))}`,
    mime: 'audio/wav',
    meta: { stub: true, kind: 'audio', freq },
  };
}

// Mirror of the backend's prompt → kind inference (D-ASSET-4) so the offline
// stub routes a "jump sound" to audio and "pixel coin" to an image with no kind
// picker. Audio cue word → audio; otherwise default to an image.
const AUDIO_HINTS =
  /\b(sound|sounds|sfx|audio|music|musical|song|tune|melody|jingle|voice|voices|speak|spoken|saying|noise|beep|chime|ringtone|bgm|soundtrack|whistle|hum)\b/i;

export function inferStubKind(prompt: string): 'image' | 'audio' {
  return AUDIO_HINTS.test(prompt) ? 'audio' : 'image';
}

export function generateAssetStub(req: GenAssetRequest): Promise<GenAssetResult> {
  const kind = req.kind ?? inferStubKind(req.prompt);
  const result = kind === 'audio' ? buildWavTone(req) : buildSvgSwatch(req);
  return Promise.resolve(result);
}
