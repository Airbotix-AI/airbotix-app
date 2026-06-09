import { describe, it, expect } from 'vitest';
import type { VfsFile } from '../../code/codeApi';
import {
  categoryOf,
  assetKindOf,
  animSidecarPath,
  parseAnimSidecar,
  slugifyKey,
  codeRefFor,
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

describe('codeRefFor', () => {
  it('image / audio / video / spritesheet', () => {
    expect(codeRefFor(asset('assets/ui/btn.png'))).toBe("this.load.image('btn', 'assets/ui/btn.png')");
    expect(codeRefFor(asset('assets/audio/ding.mp3'))).toBe("this.load.audio('ding', 'assets/audio/ding.mp3')");
    expect(codeRefFor(asset('assets/video/intro.mp4'))).toBe("this.load.video('intro', 'assets/video/intro.mp4')");
    expect(
      codeRefFor(asset('assets/characters/walk.png'), { frameWidth: 96, frameHeight: 128, frames: 4, fps: 8 }),
    ).toBe("this.load.spritesheet('walk', 'assets/characters/walk.png', { frameWidth: 96, frameHeight: 128 })");
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
