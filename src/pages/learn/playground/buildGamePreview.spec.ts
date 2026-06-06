import { describe, expect, it } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { buildGameSrcDoc, isStatMessage } from './buildGamePreview';

function f(path: string, content = '', kind: VfsFile['kind'] = 'text'): VfsFile {
  return { path, content, kind, size: content.length };
}

describe('isStatMessage', () => {
  it('accepts a tagged stat frame and rejects everything else', () => {
    expect(isStatMessage({ __airbotixStat: true, fps: 60, paused: false })).toBe(true);
    expect(isStatMessage({ __airbotixStat: false })).toBe(false);
    expect(isStatMessage({ fps: 60 })).toBe(false);
    expect(isStatMessage(null)).toBe(false);
    expect(isStatMessage('nope')).toBe(false);
  });
});

describe('buildGameSrcDoc', () => {
  it('hosts the game div + self-hosted Phaser engine (never a CDN)', () => {
    const doc = buildGameSrcDoc([f('game.js', 'const x = 1;')]);
    expect(doc).toContain('<div id="game"></div>');
    expect(doc).toContain('<script src="/vendor/phaser-3.80.1.min.js"></script>');
  });

  it('injects each js file with a //# sourceURL and NO leading newline', () => {
    // A leading "\n" after <script> would shift every reported line by one and
    // break jump-to-error — assert the content butts straight against the tag.
    const doc = buildGameSrcDoc([f('game.js', 'CODE_MARKER')]);
    expect(doc).toContain('<script>CODE_MARKER');
    expect(doc).toContain('//# sourceURL=game.js');
  });

  it('injects the entry file LAST (main.js > game.js > last)', () => {
    const withMain = buildGameSrcDoc([f('helper.js', 'HELPER'), f('main.js', 'MAIN')]);
    expect(withMain.indexOf('MAIN')).toBeGreaterThan(withMain.indexOf('HELPER'));

    // main.js wins over game.js
    const mainBeatsGame = buildGameSrcDoc([f('game.js', 'GAMEJS'), f('main.js', 'MAINJS')]);
    expect(mainBeatsGame.indexOf('MAINJS')).toBeGreaterThan(mainBeatsGame.indexOf('GAMEJS'));

    // no main → game.js is the entry
    const gameFallback = buildGameSrcDoc([f('a.js', 'AAA'), f('game.js', 'GGG')]);
    expect(gameFallback.indexOf('GGG')).toBeGreaterThan(gameFallback.indexOf('AAA'));
  });

  it('concatenates css into the stage style', () => {
    const doc = buildGameSrcDoc([f('game.js', 'x'), f('style.css', '.hero{color:red}')]);
    expect(doc).toContain('.hero{color:red}');
  });

  it('threads the physics-debug flag from options', () => {
    expect(buildGameSrcDoc([f('game.js', 'x')], { debug: true })).toContain('window.__airbotixDebug=true');
    expect(buildGameSrcDoc([f('game.js', 'x')])).toContain('window.__airbotixDebug=false');
  });

  it('inlines a referenced asset path as a data: URL', () => {
    const doc = buildGameSrcDoc([
      f('game.js', "this.load.image('hero', 'sprites/hero.png');"),
      f('sprites/hero.png', 'BASE64DATA', 'asset'),
    ]);
    expect(doc).toContain('data:image/png;base64,BASE64DATA');
    expect(doc).not.toContain("'sprites/hero.png'");
  });
});
