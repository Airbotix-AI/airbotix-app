import { describe, it, expect } from 'vitest';
import { addAssetToGame, addLibraryAssetToGame } from './assetInsert';
import type { VfsFile } from '../../code/codeApi';
import type { LibraryAsset } from '../assetLibrary';

const libAsset = (over: Partial<LibraryAsset> = {}): LibraryAsset => ({
  id: 'emoji/🪙',
  name: 'Gold Coin',
  category: 'items',
  tags: ['coin'],
  kind: 'image',
  provider: 'emoji',
  license: 'CC-BY-4.0',
  url: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1fa99.png',
  thumbUrl: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1fa99.png',
  ...over,
});

const file = (path: string, content: string): VfsFile => ({ path, content, kind: 'text', size: content.length });
const asset = (path: string): VfsFile => ({ path, content: 'data:image/png;base64,AA', kind: 'asset', size: 24 });

const GAME_WITH_PRELOAD = file(
  'src/scenes/Game.js',
  `class Game extends Phaser.Scene {
  constructor() { super('Game'); }
  preload() {
    this.load.image('existing', 'assets/existing.png');
  }
  create() {
    this.add.text(10, 10, 'hi');
  }
}
`,
);

describe('addAssetToGame', () => {
  it('inserts an image loader into preload() and a use into create()', () => {
    const files = [GAME_WITH_PRELOAD];
    const r = addAssetToGame(files, asset('assets/generated/coin.png'));

    expect(r.scenePath).toBe('src/scenes/Game.js');
    expect(r.key).toBe('coin');
    const next = r.files?.find((f) => f.path === 'src/scenes/Game.js')?.content ?? '';
    // Loader landed inside preload(), use landed inside create().
    expect(next).toContain("this.load.image('coin', 'assets/generated/coin.png');");
    expect(next).toContain("this.add.sprite(this.scale.width / 2, this.scale.height / 2, 'coin');");
    // The pre-existing loader is untouched.
    expect(next).toContain("this.load.image('existing', 'assets/existing.png');");
  });

  it('uses this.sound.play for audio assets', () => {
    const r = addAssetToGame([GAME_WITH_PRELOAD], asset('assets/generated/boing.wav'));
    const next = r.files?.find((f) => f.path === 'src/scenes/Game.js')?.content ?? '';
    expect(next).toContain("this.load.audio('boing', 'assets/generated/boing.wav');");
    expect(next).toContain("this.sound.play('boing');");
  });

  it('creates preload()/create() when the scene lacks them', () => {
    const bare = file(
      'src/scenes/Game.js',
      `class Game extends Phaser.Scene {
  constructor() { super('Game'); }
}
`,
    );
    const r = addAssetToGame([bare], asset('assets/hero.png'));
    const next = r.files?.find((f) => f.path === 'src/scenes/Game.js')?.content ?? '';
    expect(next).toContain('preload() {');
    expect(next).toContain('create() {');
    expect(next).toContain("this.load.image('hero', 'assets/hero.png');");
  });

  it('makes the key unique when the name already exists', () => {
    const r = addAssetToGame([GAME_WITH_PRELOAD], asset('assets/existing.png'));
    expect(r.key).toBe('existing_2');
    const next = r.files?.find((f) => f.path === 'src/scenes/Game.js')?.content ?? '';
    expect(next).toContain("this.load.image('existing_2', 'assets/existing.png');");
  });

  it('prefers Game.js over other scenes', () => {
    const boot = file('src/scenes/Boot.js', `class Boot extends Phaser.Scene { create() {} }`);
    const r = addAssetToGame([boot, GAME_WITH_PRELOAD], asset('assets/coin.png'));
    expect(r.scenePath).toBe('src/scenes/Game.js');
  });

  it('returns null files when there is no scene to edit', () => {
    const r = addAssetToGame([file('style.css', 'body{}')], asset('assets/coin.png'));
    expect(r.files).toBeNull();
    expect(r.scenePath).toBeNull();
  });
});

describe('addLibraryAssetToGame (URL-form loader — D-ASSET-2)', () => {
  it('loads the library asset by its CDN URL (not a VFS path) with crossOrigin set', () => {
    const r = addLibraryAssetToGame([GAME_WITH_PRELOAD], libAsset());
    expect(r.scenePath).toBe('src/scenes/Game.js');
    expect(r.key).toBe('gold_coin'); // key derived from the display name
    const next = r.files?.find((f) => f.path === 'src/scenes/Game.js')?.content ?? '';
    expect(next).toContain("this.load.setCORS('anonymous');");
    expect(next).toContain(
      "this.load.image('gold_coin', 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1fa99.png');",
    );
    expect(next).toContain("this.add.sprite(this.scale.width / 2, this.scale.height / 2, 'gold_coin');");
    // No VFS path leaked in; the pre-existing loader is untouched.
    expect(next).not.toContain('assets/gold_coin');
    expect(next).toContain("this.load.image('existing', 'assets/existing.png');");
  });

  it('uses load.audio + sound.play for an audio library asset', () => {
    const r = addLibraryAssetToGame(
      [GAME_WITH_PRELOAD],
      libAsset({ name: 'Jump SFX', kind: 'audio', url: 'https://cdn.example/jump.mp3' }),
    );
    const next = r.files?.find((f) => f.path === 'src/scenes/Game.js')?.content ?? '';
    expect(next).toContain("this.load.audio('jump_sfx', 'https://cdn.example/jump.mp3');");
    expect(next).toContain("this.sound.play('jump_sfx');");
    expect(next).not.toContain('setCORS'); // audio doesn't taint the canvas
  });

  it('makes the key unique when the derived name already exists', () => {
    const r = addLibraryAssetToGame([GAME_WITH_PRELOAD], libAsset({ name: 'Existing' }));
    expect(r.key).toBe('existing_2');
  });

  it('returns null files when there is no scene to edit', () => {
    const r = addLibraryAssetToGame([file('style.css', 'body{}')], libAsset());
    expect(r.files).toBeNull();
  });
});
