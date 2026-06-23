// Derived asset metadata for the Asset Viewer (design §4 + §6). NOTHING here is
// persisted — every value is computed from a VfsFile on demand. The VFS data
// model is unchanged: an asset is a VfsFile whose `content` is a base64 `data:`
// URL (binary) or plain text, living under `assets/`.

import type { VfsFile } from '../../code/codeApi';
import type { ClassAssetView } from './playgroundApi';

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

// ── Asset references for the AI chat ─────────────────────────────────────────
// Kids vibe-code through the chat, not by hand-editing loader code, so the
// "Copy … reference" affordance copies the asset's bare REFERENCE — its VFS path
// (e.g. `assets/class/hero.png`) or, for the shared library, its URL. The kid
// pastes that into the chat ("make the player look like assets/class/hero.png")
// and the agent reads/loads it. (The loader wiring is the agent's / `assetInsert`'s
// job — never hand-pasted Phaser code.)

const KIND_NOUN: Record<AssetKind, string> = {
  image: 'image',
  sprite: 'sprite sheet',
  audio: 'sound',
  video: 'video',
  text: 'file',
  other: 'file',
};

/** Heading/label for the reference block, e.g. "Copy image reference". */
export function referenceLabel(kind: AssetKind): string {
  return `Copy ${KIND_NOUN[kind] ?? 'asset'} reference`;
}

/** The chat reference for one of the kid's own (VFS) assets — its bare path. */
export function assetChatRef(asset: VfsFile, _anim?: AnimMeta | null): string {
  return asset.path;
}

/**
 * The chat reference for a shared **Library** asset (D-ASSET-2): its stable URL
 * (not a VFS path), so the agent loads it from there.
 */
export function libraryChatRef(_name: string, _kind: AssetKind, url: string): string {
  return url;
}

// ── Class shared assets (class-shared-assets-prd) ────────────────────────────

/** The VFS directory a copied class asset lands in ("Add to my game"). */
export const CLASS_ASSET_DIR = 'assets/class';

/**
 * The chat reference for a class asset — the `assets/class/<name>` VFS path it
 * lands at after "Add to my game" (never the signed URL — playground/CLAUDE.md:
 * a class asset enters the game only as a VFS file). Pair with "Add to my game"
 * so the file actually exists when used.
 */
export function classAssetChatRef(asset: ClassAssetView): string {
  return `${CLASS_ASSET_DIR}/${asset.name}`;
}

export function formatBytes(n: number): string {
  if (n < BYTES_PER_KB) return `${n} B`;
  const kb = n / BYTES_PER_KB;
  if (kb < BYTES_PER_KB) return `${kb.toFixed(1)} KB`;
  return `${(kb / BYTES_PER_KB).toFixed(1)} MB`;
}

/**
 * Render a text asset's content as readable text. Imported files are stored as
 * `data:` URLs (D-ASSET A4 — one uniform VFS shape), so a `.txt`'s content is a
 * base64 (or percent-encoded) data URL; AI/editor text files are raw strings.
 * Decode the former, pass the latter through unchanged.
 */
export function dataUrlToText(content: string): string {
  if (!content.startsWith('data:')) return content;
  const comma = content.indexOf(',');
  if (comma === -1) return content;
  const meta = content.slice(5, comma);
  const data = content.slice(comma + 1);
  try {
    if (/;base64/i.test(meta)) {
      const bin = atob(data);
      const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
      return new TextDecoder().decode(bytes); // UTF-8 safe
    }
    return decodeURIComponent(data);
  } catch {
    return content; // malformed — show the raw URL rather than throw
  }
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
