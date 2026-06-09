// Derived asset metadata for the Asset Viewer (design §4 + §6). NOTHING here is
// persisted — every value is computed from a VfsFile on demand. The VFS data
// model is unchanged: an asset is a VfsFile whose `content` is a base64 `data:`
// URL (binary) or plain text, living under `assets/`.

import type { VfsFile } from '../../code/codeApi';

export type AssetKind = 'image' | 'sprite' | 'audio' | 'video' | 'text' | 'other';

/** Frame grid for a sprite-strip animation, from a `<path>.anim.json` sidecar. */
export interface AnimMeta {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
}

export interface ImageMeta {
  width: number;
  height: number;
}

export const IMAGE_EXTS: readonly string[] = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
export const AUDIO_EXTS: readonly string[] = ['mp3', 'wav', 'ogg', 'm4a'];
export const VIDEO_EXTS: readonly string[] = ['mp4', 'webm'];
const TEXT_EXTS: readonly string[] = ['css', 'txt', 'json', 'md'];

const ASSETS_PREFIX = 'assets/';
const ANIM_SUFFIX = '.anim.json';
const OTHER_CATEGORY = 'other';
const FALLBACK_KEY = 'asset';
const BYTES_PER_KB = 1024;

function extOf(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

/** First path segment under `assets/` (e.g. `characters`); `other` if none. */
export function categoryOf(path: string): string {
  if (!path.startsWith(ASSETS_PREFIX)) return OTHER_CATEGORY;
  const rest = path.slice(ASSETS_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return OTHER_CATEGORY;
  return rest.slice(0, slash);
}

/** The sidecar path that, if present, makes an image a sprite strip. */
export function animSidecarPath(path: string): string {
  return `${path}${ANIM_SUFFIX}`;
}

/**
 * Classify an asset by extension. An image is a `sprite` when `files` contains a
 * sibling `<path>.anim.json` sidecar.
 */
export function assetKindOf(path: string, files?: VfsFile[]): AssetKind {
  const ext = extOf(path);
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (IMAGE_EXTS.includes(ext)) {
    const sidecar = animSidecarPath(path);
    if (files?.some((f) => f.path === sidecar)) return 'sprite';
    return 'image';
  }
  if (TEXT_EXTS.includes(ext)) return 'text';
  return 'other';
}

/** Parse + validate a `.anim.json` sidecar; `null` on anything malformed. */
export function parseAnimSidecar(fileOrContent: VfsFile | string | undefined): AnimMeta | null {
  const content = typeof fileOrContent === 'string' ? fileOrContent : fileOrContent?.content;
  if (!content) return null;
  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    const { frameWidth, frameHeight, frames, fps } = raw;
    const values = [frameWidth, frameHeight, frames, fps];
    const allPositiveNumbers = values.every(
      (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
    );
    if (!allPositiveNumbers) return null;
    return {
      frameWidth: frameWidth as number,
      frameHeight: frameHeight as number,
      frames: frames as number,
      fps: fps as number,
    };
  } catch {
    return null;
  }
}

/** Basename without extension → a valid Phaser asset key (`[a-z0-9_]`). */
export function slugifyKey(path: string): string {
  const base = path.split('/').pop() ?? path;
  const dot = base.lastIndexOf('.');
  const noExt = dot > 0 ? base.slice(0, dot) : base;
  const slug = noExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || FALLBACK_KEY;
}

/**
 * The copy-able Phaser loader snippet for an asset (design §6). The path string
 * is the contract — `buildGamePreview.inlineAssetRefs` rewrites it to a data URL
 * at build time.
 */
export function codeRefFor(asset: VfsFile, anim?: AnimMeta | null): string {
  const { path } = asset;
  const key = slugifyKey(path);
  const ext = extOf(path);
  if (VIDEO_EXTS.includes(ext)) return `this.load.video('${key}', '${path}')`;
  if (AUDIO_EXTS.includes(ext)) return `this.load.audio('${key}', '${path}')`;
  if (IMAGE_EXTS.includes(ext) && anim) {
    return `this.load.spritesheet('${key}', '${path}', { frameWidth: ${anim.frameWidth}, frameHeight: ${anim.frameHeight} })`;
  }
  return `this.load.image('${key}', '${path}')`;
}

/**
 * The copy-able Phaser loader for a shared **Library** asset (D-ASSET-2): it is
 * referenced by its stable URL, not a VFS path. Images set `crossOrigin` so the
 * cross-origin texture doesn't taint the canvas (D-ASSET-7). Mirrors what
 * `assetInsert.addLibraryAssetToGame` injects.
 */
export function libraryCodeRef(name: string, kind: AssetKind, url: string): string {
  const key = slugifyKey(name);
  if (kind === 'audio') return `this.load.audio('${key}', '${url}')`;
  return `this.load.setCORS('anonymous');\nthis.load.image('${key}', '${url}')`;
}

export function formatBytes(n: number): string {
  if (n < BYTES_PER_KB) return `${n} B`;
  const kb = n / BYTES_PER_KB;
  if (kb < BYTES_PER_KB) return `${kb.toFixed(1)} KB`;
  return `${(kb / BYTES_PER_KB).toFixed(1)} MB`;
}

// ── DOM decode helpers (cached). Not unit-tested — no jsdom configured; the e2e
// spec exercises these in a real browser. ───────────────────────────────────
const imageMetaCache = new Map<string, ImageMeta>();
const audioMetaCache = new Map<string, { duration: number }>();

export function decodeImageMeta(dataUrl: string): Promise<ImageMeta> {
  const cached = imageMetaCache.get(dataUrl);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const meta: ImageMeta = { width: img.naturalWidth, height: img.naturalHeight };
      imageMetaCache.set(dataUrl, meta);
      resolve(meta);
    };
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataUrl;
  });
}

export function decodeAudioMeta(dataUrl: string): Promise<{ duration: number }> {
  const cached = audioMetaCache.get(dataUrl);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const meta = { duration: audio.duration };
      audioMetaCache.set(dataUrl, meta);
      resolve(meta);
    };
    audio.onerror = () => reject(new Error('Failed to decode audio'));
    audio.src = dataUrl;
  });
}
