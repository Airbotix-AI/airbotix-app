// Sample assets seeded into the starter project so the Asset Viewer has one
// nice example of every supported kind to test against: image, sprite (image +
// .anim.json sidecar), audio, video, and text. Image/sprite/audio are built as
// data: URLs in code here; the video is a pre-encoded mp4 (see sampleVideo.ts).

import type { VfsFile } from '../code/codeApi';
import { SAMPLE_MP4_BASE64 } from './sampleVideo';

const WAV_SAMPLE_RATE = 8000;
const WAV_HEADER_BYTES = 44;
const INT16_MAX = 32767;

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

/** A short, friendly C–E–G arpeggio chime as a mono 16-bit PCM WAV data URL. */
function buildChimeWav(): string {
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const noteSeconds = 0.16;
  const samplesPerNote = Math.floor(WAV_SAMPLE_RATE * noteSeconds);
  const totalSamples = samplesPerNote * notes.length;
  const dataSize = totalSamples * 2;
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, WAV_SAMPLE_RATE, true);
  view.setUint32(28, WAV_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let idx = 0;
  for (const freq of notes) {
    for (let i = 0; i < samplesPerNote; i += 1) {
      const envelope = 1 - i / samplesPerNote; // gentle decay so it's not harsh
      const value = Math.sin((2 * Math.PI * freq * i) / WAV_SAMPLE_RATE) * 0.3 * envelope;
      view.setInt16(WAV_HEADER_BYTES + idx * 2, Math.round(value * INT16_MAX), true);
      idx += 1;
    }
  }
  return `data:audio/wav;base64,${bytesToBase64(new Uint8Array(buffer))}`;
}

const COIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs><radialGradient id="c" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFE9A8"/><stop offset="1" stop-color="#F2A93B"/></radialGradient></defs>
  <circle cx="32" cy="32" r="28" fill="url(#c)" stroke="#C77F1A" stroke-width="3"/>
  <circle cx="32" cy="32" r="20" fill="none" stroke="#C77F1A" stroke-width="2" opacity="0.5"/>
  <text x="32" y="43" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="bold" fill="#9A5B12">$</text>
</svg>`;

// 4 frames, 64x64 each (256x64 total): a blue smiley hopping (y bounces).
function bouncer(cx: number, cy: number): string {
  return (
    `<g><circle cx="${cx}" cy="${cy}" r="14" fill="#5DAEFF" stroke="#2D6FB8" stroke-width="2"/>` +
    `<circle cx="${cx - 5}" cy="${cy - 3}" r="2.2" fill="#11324f"/>` +
    `<circle cx="${cx + 5}" cy="${cy - 3}" r="2.2" fill="#11324f"/>` +
    `<path d="M ${cx - 6} ${cy + 4} Q ${cx} ${cy + 9} ${cx + 6} ${cy + 4}" stroke="#11324f" stroke-width="2" fill="none" stroke-linecap="round"/></g>`
  );
}
const HERO_STRIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="64" viewBox="0 0 256 64">
  ${bouncer(32, 44)}${bouncer(96, 32)}${bouncer(160, 22)}${bouncer(224, 32)}
</svg>`;
const HERO_ANIM = JSON.stringify({ frameWidth: 64, frameHeight: 64, frames: 4, fps: 6 }, null, 2);

function asset(path: string, content: string): VfsFile {
  return { path, content, kind: 'asset', size: content.length };
}
function textFile(path: string, content: string): VfsFile {
  return { path, content, kind: 'text', size: content.length };
}

/** One sample per supported kind, ready to drop into the starter VFS. */
export const SAMPLE_ASSETS: VfsFile[] = [
  asset('assets/ui/coin.svg', svgDataUrl(COIN_SVG)),
  asset('assets/characters/hero_bounce.svg', svgDataUrl(HERO_STRIP_SVG)),
  textFile('assets/characters/hero_bounce.svg.anim.json', HERO_ANIM),
  asset('assets/audio/chime.wav', buildChimeWav()),
  asset('assets/video/intro.mp4', `data:video/mp4;base64,${SAMPLE_MP4_BASE64}`),
];

/**
 * Preloaded sample paths (+ the starter README): always merged into a project on
 * load and READ-ONLY in the Asset Viewer — they "stay" and can't be modified,
 * while user/AI-created assets get full CRUD.
 */
export const PRELOADED_ASSET_PATHS: ReadonlySet<string> = new Set<string>([
  ...SAMPLE_ASSETS.map((a) => a.path),
  'assets/README.txt',
]);

export function isPreloadedAsset(path: string): boolean {
  return PRELOADED_ASSET_PATHS.has(path);
}

/** Add any missing preloaded samples to a file set (deduped by path). */
export function withPreloadedAssets(files: VfsFile[]): VfsFile[] {
  const have = new Set(files.map((f) => f.path));
  const missing = SAMPLE_ASSETS.filter((a) => !have.has(a.path));
  return missing.length ? [...files, ...missing] : files;
}
