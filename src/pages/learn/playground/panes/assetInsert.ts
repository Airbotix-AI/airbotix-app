// One-tap "Add to my game" (PRD J5). A kid won't hand-paste a Phaser loader
// code-ref — this auto-inserts the loader (`this.load.*`) into a scene's
// `preload()` AND a sensible first use into `create()`, so a generated/imported
// asset shows up in the game with a single click. Pure VFS transform: takes the
// current files + the asset, returns the next files (the caller applies them
// through projectStore → autosave). No DOM, no network — unit-tested.
//
// Targeting (runtime contract, see playground/CLAUDE.md): scenes are GLOBAL
// classes (no import/export). We inject into the FIRST playable scene that has a
// `create()` — prefer `src/scenes/Game.js`, else the first `.js` that defines a
// `Phaser.Scene` subclass, else `main.js`. The loader goes in `preload()` (added
// if missing); the use goes at the end of `create()`.

import type { VfsFile } from '../../code/codeApi';
import {
  AUDIO_EXTS,
  IMAGE_EXTS,
  VIDEO_EXTS,
  parseAnimSidecar,
  animSidecarPath,
  slugifyKey,
  type AnimMeta,
} from './assetMeta';

/** Outcome of an insert attempt — `null` files means "couldn't find a scene". */
export interface InsertResult {
  files: VfsFile[] | null;
  /** The scene file we edited (for the kid-facing confirmation). */
  scenePath: string | null;
  /** The Phaser asset key we registered (so the kid knows what to reference). */
  key: string | null;
}

function extOf(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

/** The scene we should inject into: prefer Game.js, else any Phaser.Scene, else main.js. */
function pickSceneFile(files: VfsFile[]): VfsFile | null {
  const js = files.filter((f) => f.path.endsWith('.js'));
  const game = js.find((f) => /\/Game\.js$/.test(f.path) || f.path === 'Game.js');
  if (game) return game;
  const scene = js.find((f) => /extends\s+Phaser\.Scene/.test(f.content));
  if (scene) return scene;
  return js.find((f) => f.path === 'main.js') ?? js[0] ?? null;
}

/** The `this.load.*` loader line for an asset (mirrors `codeRefFor`). */
function loaderLine(path: string, key: string, anim: AnimMeta | null): string {
  const ext = extOf(path);
  if (VIDEO_EXTS.includes(ext)) return `this.load.video('${key}', '${path}');`;
  if (AUDIO_EXTS.includes(ext)) return `this.load.audio('${key}', '${path}');`;
  if (IMAGE_EXTS.includes(ext) && anim) {
    return `this.load.spritesheet('${key}', '${path}', { frameWidth: ${anim.frameWidth}, frameHeight: ${anim.frameHeight} });`;
  }
  return `this.load.image('${key}', '${path}');`;
}

/** A safe, visible first USE of the asset in `create()` (so the kid sees it). */
function usageLine(path: string, key: string): string {
  const ext = extOf(path);
  if (AUDIO_EXTS.includes(ext)) return `this.sound.play('${key}');`;
  // Images / sprites / video: drop it in the centre as a sprite the kid can move.
  return `this.add.sprite(this.scale.width / 2, this.scale.height / 2, '${key}');`;
}

/**
 * Insert `block` as the LAST statement inside the named method's body. If the
 * method is absent, one is created (right after the class's opening brace, or —
 * for a non-class scene — not applicable, see `pickSceneFile`). Brace-balanced
 * so it survives nested blocks in the method.
 */
function insertIntoMethod(src: string, method: string, block: string): string | null {
  const sig = new RegExp(`(^|\\n)(\\s*)${method}\\s*\\([^)]*\\)\\s*\\{`);
  const m = sig.exec(src);
  if (m) {
    const bodyStart = m.index + m[0].length;
    // Find the matching close brace for the method body.
    let depth = 1;
    let i = bodyStart;
    for (; i < src.length && depth > 0; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') depth -= 1;
    }
    if (depth !== 0) return null; // unbalanced — bail rather than corrupt
    const closeIdx = i - 1;
    const indent = `${m[2]}  `;
    const insertion = `\n${indent}// Added by you ✨\n${block
      .split('\n')
      .map((l) => `${indent}${l}`)
      .join('\n')}\n${m[2]}`;
    return src.slice(0, closeIdx) + insertion + src.slice(closeIdx);
  }
  // Method absent — add it right after the class opening brace.
  const classOpen = /class\s+\w+\s+extends\s+Phaser\.Scene\s*\{/.exec(src);
  if (!classOpen) return null;
  const at = classOpen.index + classOpen[0].length;
  const indent = '  ';
  const inner = block
    .split('\n')
    .map((l) => `${indent}${indent}${l}`)
    .join('\n');
  const newMethod = `\n${indent}${method}() {\n${indent}${indent}// Added by you ✨\n${inner}\n${indent}}\n`;
  return src.slice(0, at) + newMethod + src.slice(at);
}

/**
 * Add an asset to the game in one tap: register a unique Phaser key, inject the
 * loader into `preload()` and a sensible use into `create()` of the target
 * scene. Returns the next files (or `null` files if no scene was found).
 */
export function addAssetToGame(files: VfsFile[], asset: VfsFile): InsertResult {
  const scene = pickSceneFile(files);
  if (!scene) return { files: null, scenePath: null, key: null };

  const anim = parseAnimSidecar(files.find((f) => f.path === animSidecarPath(asset.path)));

  // A unique key across the scene so re-adding the same name never collides.
  const base = slugifyKey(asset.path);
  let key = base;
  let n = 1;
  while (new RegExp(`['"]${key}['"]`).test(scene.content)) {
    n += 1;
    key = `${base}_${n}`;
  }

  const withLoader = insertIntoMethod(scene.content, 'preload', loaderLine(asset.path, key, anim));
  if (withLoader == null) return { files: null, scenePath: null, key: null };
  const withUse = insertIntoMethod(withLoader, 'create', usageLine(asset.path, key));
  if (withUse == null) return { files: null, scenePath: null, key: null };

  const nextScene: VfsFile = { ...scene, content: withUse, size: withUse.length };
  const nextFiles = files.map((f) => (f.path === scene.path ? nextScene : f));
  return { files: nextFiles, scenePath: scene.path, key };
}
