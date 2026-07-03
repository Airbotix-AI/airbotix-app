import { describe, it, expect } from 'vitest';
import type { VfsFile } from '../../code/codeApi';
import {
  categoryOf,
  assetKindOf,
  animSidecarPath,
  parseAnimSidecar,
  slugifyKey,
  assetChatRef,
  libraryChatRef,
  classAssetChatRef,
  clipLabels,
  referenceLabel,
  formatBytes,
  dataUrlToText,
} from './assetMeta';

function asset(path: string): VfsFile {
  return { path, content: '', kind: 'asset', size: 0 };
}

describe('categoryOf', () => {
  it('uses the first folder under assets/', () => {
    expect(categoryOf('assets/characters/worker.png')).toBe('characters');
    expect(categoryOf('assets/ui/btn.png')).toBe('ui');
  });
  it('is "other" for top-level assets and non-asset paths', () => {
    expect(categoryOf('assets/logo.png')).toBe('other');
    expect(categoryOf('src/main.js')).toBe('other');
  });
});

describe('assetKindOf', () => {
  it('classifies by extension', () => {
    expect(assetKindOf('assets/audio/ding.mp3')).toBe('audio');
    expect(assetKindOf('assets/video/intro.mp4')).toBe('video');
    expect(assetKindOf('assets/ui/btn.png')).toBe('image');
    expect(assetKindOf('assets/imported/robot.glb')).toBe('model');
    expect(assetKindOf('assets/readme.txt')).toBe('text');
    expect(assetKindOf('assets/data.bin')).toBe('other');
  });
  it('is a sprite when a sibling .anim.json exists', () => {
    const files = [asset('assets/characters/walk.png'), asset('assets/characters/walk.png.anim.json')];
    expect(assetKindOf('assets/characters/walk.png', files)).toBe('sprite');
    expect(assetKindOf('assets/characters/walk.png')).toBe('image');
  });
});

describe('animSidecarPath / parseAnimSidecar', () => {
  it('builds the sidecar path', () => {
    expect(animSidecarPath('assets/characters/walk.png')).toBe('assets/characters/walk.png.anim.json');
  });
  it('parses a valid sidecar', () => {
    const out = parseAnimSidecar('{"frameWidth":96,"frameHeight":128,"frames":4,"fps":8}');
    expect(out).toEqual({ frameWidth: 96, frameHeight: 128, frames: 4, fps: 8 });
  });
  it('rejects malformed or non-positive sidecars', () => {
    expect(parseAnimSidecar('not json')).toBeNull();
    expect(parseAnimSidecar('{"frameWidth":96}')).toBeNull();
    expect(parseAnimSidecar('{"frameWidth":0,"frameHeight":128,"frames":4,"fps":8}')).toBeNull();
    expect(parseAnimSidecar(undefined)).toBeNull();
  });
});

describe('slugifyKey', () => {
  it('strips folders + extension and normalises', () => {
    expect(slugifyKey('assets/characters/worker-walk.png')).toBe('worker_walk');
    expect(slugifyKey('assets/ui/Btn Buy.png')).toBe('btn_buy');
  });
});

describe('assetChatRef (bare reference, not code)', () => {
  it('is the asset’s VFS path (any kind)', () => {
    expect(assetChatRef(asset('assets/ui/btn.png'))).toBe('assets/ui/btn.png');
    expect(assetChatRef(asset('assets/audio/ding.mp3'))).toBe('assets/audio/ding.mp3');
    expect(assetChatRef(asset('assets/video/intro.mp4'))).toBe('assets/video/intro.mp4');
    expect(
      assetChatRef(asset('assets/characters/walk.png'), { frameWidth: 96, frameHeight: 128, frames: 4, fps: 8 }),
    ).toBe('assets/characters/walk.png');
  });

  it('libraryChatRef is the stable URL', () => {
    expect(libraryChatRef('Coin', 'image', 'https://cdn/coin.png')).toBe('https://cdn/coin.png');
    expect(libraryChatRef('Boing', 'audio', 'https://cdn/boing.mp3')).toBe('https://cdn/boing.mp3');
  });

  it('classAssetChatRef is the assets/class path it lands at', () => {
    expect(
      classAssetChatRef({
        id: 'a',
        class_id: 'c',
        name: 'hero.png',
        kind: 'image',
        mime_type: 'image/png',
        size_bytes: 1,
        created_at: '',
        download_url: '',
      }),
    ).toBe('assets/class/hero.png');
  });

  it('referenceLabel is kind-aware', () => {
    expect(referenceLabel('image')).toBe('Copy image reference');
    expect(referenceLabel('audio')).toBe('Copy sound reference');
    expect(referenceLabel('video')).toBe('Copy video reference');
    expect(referenceLabel('sprite')).toBe('Copy sprite sheet reference');
    expect(referenceLabel('model')).toBe('Copy 3D model reference');
  });
});

describe('clipLabels', () => {
  it('shows the last | segment, keeping the full name as the key', () => {
    const m = clipLabels(['CharacterArmature|Death', 'CharacterArmature|HitReact', 'Wave']);
    expect(m.get('CharacterArmature|Death')).toBe('Death');
    expect(m.get('CharacterArmature|HitReact')).toBe('HitReact');
    expect(m.get('Wave')).toBe('Wave'); // un-namespaced name unchanged
  });

  it('falls back to the full names when shortening would collide', () => {
    const m = clipLabels(['RigA|Run', 'RigB|Run', 'RigA|Idle']);
    expect(m.get('RigA|Run')).toBe('RigA|Run');
    expect(m.get('RigB|Run')).toBe('RigB|Run');
    expect(m.get('RigA|Idle')).toBe('Idle'); // no collision — still shortened
  });

  it('never yields an empty label (trailing pipe / whitespace)', () => {
    const m = clipLabels(['Rig|', '  ']);
    expect(m.get('Rig|')).toBe('Rig|');
    expect(m.get('  ')).toBe('  ');
  });
});

describe('formatBytes', () => {
  it('formats B / KB / MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(18841)).toBe('18.4 KB');
    expect(formatBytes(2_000_000)).toBe('1.9 MB');
  });
});

describe('dataUrlToText', () => {
  const b64 = (s: string) => Buffer.from(s, 'utf-8').toString('base64');

  it('decodes a base64 text data URL (imported .txt)', () => {
    expect(dataUrlToText(`data:text/plain;base64,${b64('Drop sprites/sounds here.')}`)).toBe(
      'Drop sprites/sounds here.',
    );
  });

  it('decodes UTF-8 multibyte content', () => {
    expect(dataUrlToText(`data:text/plain;base64,${b64('café — 日本語')}`)).toBe('café — 日本語');
  });

  it('decodes a non-base64 (percent-encoded) text data URL', () => {
    expect(dataUrlToText('data:text/plain,hello%20world')).toBe('hello world');
  });

  it('passes raw text through unchanged (AI/editor files)', () => {
    expect(dataUrlToText('const x = 1;')).toBe('const x = 1;');
  });

  it('returns the raw string when the data URL is malformed', () => {
    expect(dataUrlToText('data:text/plain;base64,!!!not-base64')).toBe(
      'data:text/plain;base64,!!!not-base64',
    );
  });
});
