// @vitest-environment jsdom
//
// Syntax-error location resolution (playground self-fix context): a script that
// fails to PARSE never gets its `//# sourceURL` applied, so the browser reports
// the error against the srcdoc document. buildGamePreview returns each script's
// line range inside the srcdoc; resolveErrorLoc maps the document line back to
// the kid's file:line — the location the console, jump-to-error, and the AI
// self-fix round-trip all rely on.
import { describe, expect, it } from 'vitest';
import { OVERLAY_PATH, buildGamePreview, resolveErrorLoc, sanitizeOverlay } from './buildGamePreview';
import type { VfsFile } from '../code/codeApi';

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const FILES: VfsFile[] = [
  text('src/scenes/Game.js', 'class Game {\n  go() {}\n}\n'), // 4 source lines (incl. trailing)
  text('main.js', 'new Game();\nstart();'), // entry — injected LAST
];

describe('buildGamePreview script ranges', () => {
  it('maps each script range to the file content at that srcdoc line', () => {
    const { srcDoc, scriptRanges } = buildGamePreview(FILES);
    const docLines = srcDoc.split('\n');
    expect(scriptRanges.map((r) => r.path)).toEqual(['src/scenes/Game.js', 'main.js']);
    for (const range of scriptRanges) {
      const file = FILES.find((f) => f.path === range.path)!;
      const fileLines = file.content.split('\n');
      // First line rides on the `<script>` tag line; every later line matches exactly.
      expect(docLines[range.start - 1].endsWith(fileLines[0])).toBe(true);
      for (let i = 1; i < fileLines.length; i++) {
        expect(docLines[range.start - 1 + i]).toBe(fileLines[i]);
      }
      expect(range.end - range.start + 1).toBe(fileLines.length);
    }
  });
});

describe('resolveErrorLoc', () => {
  const { scriptRanges } = buildGamePreview(FILES);

  it('passes a kid-file loc through unchanged (sourceURL applied — runtime errors)', () => {
    const loc = { file: 'main.js', line: 2, col: 1 };
    expect(resolveErrorLoc(loc, scriptRanges)).toEqual(loc);
  });

  it('maps an about:srcdoc line inside a script back to the kid file:line', () => {
    const game = scriptRanges[0];
    const doc = { file: 'about:srcdoc', line: game.start + 1, col: 7 }; // file line 2
    expect(resolveErrorLoc(doc, scriptRanges)).toEqual({
      file: 'src/scenes/Game.js',
      line: 2,
      col: 7,
    });
  });

  it('drops a loc that points at host chrome (outside every script)', () => {
    expect(resolveErrorLoc({ file: 'about:srcdoc', line: 1, col: 1 }, scriptRanges)).toBeUndefined();
  });

  it('returns undefined for a missing loc', () => {
    expect(resolveErrorLoc(undefined, scriptRanges)).toBeUndefined();
  });
});

describe('engine profiles (2D Phaser / 3D three.js)', () => {
  it('defaults to Phaser: loads the Phaser global + wraps Phaser.Game (back-compat)', () => {
    const def = buildGamePreview(FILES).srcDoc;
    const phaser = buildGamePreview(FILES, { engine: 'phaser' }).srcDoc;
    // Omitting engine is byte-identical to engine:'phaser' (no behaviour change for 2D games).
    expect(def).toBe(phaser);
    // The vendored URL is version-pinned but CONTENT-HASHED in a real build
    // (three-0.184.0-<hash>.global.js); under vitest the plugin serves the
    // unhashed fallback. Match either so the assertion holds in both.
    expect(def).toMatch(/\/vendor\/phaser-4\.1\.0[.\w-]*\.min\.js/);
    expect(def).toContain('window.Phaser.Game'); // the constructor-wrap control shim
    expect(def).not.toContain('/vendor/three-');
  });

  it('engine:three loads the three.js global + the three control shim, not Phaser', () => {
    const doc = buildGamePreview(FILES, { engine: 'three' }).srcDoc;
    expect(doc).toMatch(/\/vendor\/three-0\.184\.0[.\w-]*\.global\.js/);
    expect(doc).toContain('if (!window.THREE)'); // the three load guard
    expect(doc).toContain('window.__game'); // the three control contract
    expect(doc).not.toContain('/vendor/phaser-');
    expect(doc).not.toContain('window.Phaser.Game');
  });

  it('keeps the engine-agnostic pieces identical across engines (kid script ranges + sandbox shell)', () => {
    const phaser = buildGamePreview(FILES, { engine: 'phaser' });
    const three = buildGamePreview(FILES, { engine: 'three' });
    // The kid's own scripts are injected the same way regardless of engine: the entry
    // (main.js) still goes LAST and every script keeps its //# sourceURL attribution.
    expect(three.scriptRanges.map((r) => r.path)).toEqual(['src/scenes/Game.js', 'main.js']);
    for (const doc of [phaser.srcDoc, three.srcDoc]) {
      expect(doc).toContain('//# sourceURL=main.js');
      expect(doc).toContain('<div id="game"></div>');
    }
  });

  it('both engines speak the same control wire protocol (pause/snapshot/stat)', () => {
    for (const engine of ['phaser', 'three'] as const) {
      const doc = buildGamePreview(FILES, { engine }).srcDoc;
      expect(doc).toContain('__airbotixControl');
      expect(doc).toContain('__airbotixSnapshot');
      expect(doc).toContain('__airbotixStat');
    }
  });

  it('inlines a referenced .glb asset as a model/gltf-binary data URL (D-3D-09)', () => {
    const glb: VfsFile = {
      path: 'assets/imported/robot.glb',
      content: 'Z2xURg==', // backend shape: raw base64, no data: prefix
      kind: 'asset',
      size: 4,
    };
    const game = text(
      'main.js',
      "new THREE.GLTFLoader().load('assets/imported/robot.glb', (gltf) => scene.add(gltf.scene));",
    );
    const doc = buildGamePreview([game, glb], { engine: 'three' }).srcDoc;
    expect(doc).toContain("load('data:model/gltf-binary;base64,Z2xURg==',");
    expect(doc).not.toContain("'assets/imported/robot.glb'");
  });

  it('inlines a raw-base64 audio asset as a data:audio/* URL — NEVER octet-stream', () => {
    // The public /play page fetches a frozen share snapshot whose assets are RAW
    // base64 (they bypass codeApi's toStudioContent wrapper), so the srcdoc builder
    // types them by extension. A data: URL is never MIME-sniffed: an mp3 inlined as
    // application/octet-stream is refused by `new Audio()` — the shared game's BGM
    // (and anything gated on it, e.g. on-beat note spawning) silently dies.
    const mp3: VfsFile = {
      path: 'assets/class/Golden.mp3',
      content: 'SUQzBA==', // backend shape: raw base64, no data: prefix
      kind: 'asset',
      size: 4,
    };
    const game = text('main.js', "const bgm = new Audio('assets/class/Golden.mp3');");
    const doc = buildGamePreview([game, mp3], { engine: 'three' }).srcDoc;
    expect(doc).toContain("new Audio('data:audio/mpeg;base64,SUQzBA==')");
    expect(doc).not.toContain('octet-stream');
    expect(doc).not.toContain("'assets/class/Golden.mp3'");
  });

  it('types every supported audio extension with a real audio/* MIME', () => {
    // wav/mp3/ogg/m4a mirror the platform's audio asset kinds (backend
    // asset-kinds.ts MIME_BY_EXT + codeApi BINARY_ASSET_MIME) — a row missing
    // HERE is exactly the drift that broke shared-link background music.
    for (const [ext, mime] of [
      ['wav', 'audio/wav'],
      ['mp3', 'audio/mpeg'],
      ['ogg', 'audio/ogg'],
      ['m4a', 'audio/mp4'],
    ] as const) {
      const asset: VfsFile = { path: `sounds/bgm.${ext}`, content: 'QUJD', kind: 'asset', size: 3 };
      const game = text('main.js', `const bgm = new Audio('sounds/bgm.${ext}');`);
      const doc = buildGamePreview([game, asset], { engine: 'phaser' }).srcDoc;
      expect(doc).toContain(`new Audio('data:${mime};base64,QUJD')`);
    }
  });

  it('inlines a VIRTUAL class asset (Model A) the game references, without it being in files', () => {
    // A class asset lives at assets/class/<name> but is NOT in the project VFS —
    // it's passed as a virtualAssets data URL and must inline exactly like a real
    // VFS asset so the game loads it with no copy.
    const game = text('main.js', "this.load.image('stage', 'assets/class/game_stage.png');");
    const virtual: VfsFile = {
      path: 'assets/class/game_stage.png',
      content: 'data:image/png;base64,STAGE',
      kind: 'asset',
      size: 5,
    };
    const doc = buildGamePreview([game], { virtualAssets: [virtual] }).srcDoc;
    expect(doc).toContain("this.load.image('stage', 'data:image/png;base64,STAGE');");
    expect(doc).not.toContain("'assets/class/game_stage.png'");
  });

  it('injects the run probe in BOTH engines, the loader guard in three only (D-PAP-41)', () => {
    const phaser = buildGamePreview(FILES, { engine: 'phaser' }).srcDoc;
    const three = buildGamePreview(FILES, { engine: 'three' }).srcDoc;
    for (const doc of [phaser, three]) {
      expect(doc).toContain('__airbotixRunReport'); // the run probe's reply tag
      expect(doc).toContain("m.action !== 'report'"); // listens for the report request
      expect(doc).toContain('frames:'); // engine frame counter in the stat message
    }
    // The loader guard (asset-outcome instrumentation) is three-only.
    expect(three).toContain('__airbotixAsset');
    expect(three).toContain('GLTFLoader');
    expect(three).toContain('TextureLoader');
    expect(phaser).not.toContain('__airbotixAsset');
  });

  it('loader guard sits after the vendored global and before every kid script', () => {
    const { srcDoc, scriptRanges } = buildGamePreview(FILES, { engine: 'three' });
    const guardAt = srcDoc.indexOf('__airbotixAsset');
    const vendorAt = srcDoc.indexOf('/vendor/three-');
    const firstKidLine = scriptRanges[0].start;
    const guardLine = srcDoc.slice(0, guardAt).split('\n').length;
    expect(guardAt).toBeGreaterThan(vendorAt);
    expect(guardLine).toBeLessThan(firstKidLine);
  });

  it('returns an assetManifest of prefix+length identities for every inlined asset', () => {
    const glb: VfsFile = {
      path: 'assets/imported/robot.glb',
      content: 'Z2xURg==',
      kind: 'asset',
      size: 4,
    };
    const { assetManifest } = buildGamePreview([...FILES, glb], { engine: 'three' });
    const dataUrl = 'data:model/gltf-binary;base64,Z2xURg==';
    expect(assetManifest).toEqual([
      { path: 'assets/imported/robot.glb', prefix: dataUrl.slice(0, 256), length: dataUrl.length },
    ]);
  });

  it('regression: kid file:line still resolves exactly with the probe + guard parts present', () => {
    // The probe (both engines) and the loader guard (three) add prefix parts —
    // scriptRanges are computed by reducing over the parts, so an error on line
    // N of a kid file must STILL resolve to that file:line.
    for (const engine of ['phaser', 'three'] as const) {
      const { srcDoc, scriptRanges } = buildGamePreview(FILES, { engine });
      const docLines = srcDoc.split('\n');
      for (const range of scriptRanges) {
        const file = FILES.find((f) => f.path === range.path)!;
        const fileLines = file.content.split('\n');
        expect(docLines[range.start - 1].endsWith(fileLines[0])).toBe(true);
        for (let i = 1; i < fileLines.length; i++) {
          expect(docLines[range.start - 1 + i]).toBe(fileLines[i]);
        }
      }
      // A syntax error reported against srcdoc line (main.js line 2) maps back.
      const main = scriptRanges.find((r) => r.path === 'main.js')!;
      expect(
        resolveErrorLoc({ file: 'about:srcdoc', line: main.start + 1, col: 3 }, scriptRanges),
      ).toEqual({ file: 'main.js', line: 2, col: 3 });
    }
  });

  it('injects the engine-agnostic audio control BEFORE the vendored engine, for BOTH engines', () => {
    // The pause/mute buttons must silence the game's AUDIO, not just freeze its
    // loop — so an AudioContext-patching shim ships for every engine and MUST run
    // ahead of the engine (which creates its AudioContext at boot).
    for (const engine of ['phaser', 'three'] as const) {
      const doc = buildGamePreview(FILES, { engine }).srcDoc;
      const audioAt = doc.indexOf('__airbotixTracked'); // AUDIO_CONTROL fingerprint
      expect(audioAt).toBeGreaterThan(-1);
      const vendorAt = doc.search(/\/vendor\/(phaser|three)-/);
      expect(audioAt).toBeLessThan(vendorAt);
      // It patches the AudioContext constructor and reacts to pause + mute.
      expect(doc).toContain('window.AudioContext = Patched');
      expect(doc).toContain("msg.action === 'pause'");
      expect(doc).toContain("msg.action === 'mute'");
    }
  });

  it('BYTE-IDENTITY: a project with NO overlay.html builds the exact pre-overlay srcdoc (both engines)', () => {
    // Pinned BEFORE the overlay feature landed (vitest snapshot): a no-overlay
    // build must stay byte-for-byte what it was — no seam text, no extra lines,
    // no CSS — so every existing game, share snapshot, and thumbnail is
    // untouched. The with-css variant pins the `${css}` seam the overlay base
    // CSS injects in front of.
    for (const engine of ['phaser', 'three'] as const) {
      expect(buildGamePreview(FILES, { engine }).srcDoc).toMatchSnapshot(`no-overlay-${engine}`);
    }
    const withCss = [...FILES, text('style.css', 'body{background:#111}')];
    expect(buildGamePreview(withCss).srcDoc).toMatchSnapshot('no-overlay-phaser-with-css');
  });

  it('inlines a .glb whose path contains SPACES (real imported filenames, D-3D-09)', () => {
    // Imported models keep their original names, which routinely contain spaces
    // ("Cube Guy Character.glb"). The path must still be matched + inlined so the
    // sandbox never falls back to fetching a relative URL that 404s.
    const glb: VfsFile = {
      path: 'assets/imported/Cube Guy Character.glb',
      content: 'Z2xURg==',
      kind: 'asset',
      size: 4,
    };
    const game = text(
      'main.js',
      "new THREE.GLTFLoader().load('assets/imported/Cube Guy Character.glb', (g) => scene.add(g.scene));",
    );
    const doc = buildGamePreview([game, glb], { engine: 'three' }).srcDoc;
    expect(doc).toContain("load('data:model/gltf-binary;base64,Z2xURg==',");
    expect(doc).not.toContain("'assets/imported/Cube Guy Character.glb'");
  });
});

// ── overlay.html — the ONE reserved HTML fragment (D-GAME13) ──────────────────

describe('overlay.html injection', () => {
  const overlay = (content: string): VfsFile => text(OVERLAY_PATH, content);
  const HUD = '<div class="hud">Score: <span id="hud-score">0</span></div>';

  it('a build with NO overlay.html carries NO overlay seam at all (both engines)', () => {
    for (const engine of ['phaser', 'three'] as const) {
      const doc = buildGamePreview(FILES, { engine }).srcDoc;
      expect(doc).not.toContain('id="overlay"');
      expect(doc).not.toContain('#overlay');
      expect(doc).not.toContain('__airbotixSnapshotOut');
      // The wire field never appears ('composited' the WORD is in a shim comment).
      expect(doc).not.toContain('composited:');
    }
  });

  it('injects the sanitized fragment as <div id="overlay"> AFTER the run probe and BEFORE the first kid script', () => {
    const { srcDoc, scriptRanges } = buildGamePreview([...FILES, overlay(HUD)]);
    const overlayAt = srcDoc.indexOf(`<div id="overlay">${HUD}</div>`);
    expect(overlayAt).toBeGreaterThan(-1);
    expect(overlayAt).toBeGreaterThan(srcDoc.indexOf('__airbotixRunReport')); // after RUN_PROBE
    const overlayLine = srcDoc.slice(0, overlayAt).split('\n').length;
    expect(overlayLine).toBeLessThan(scriptRanges[0].start); // before every kid script
  });

  it('injects the overlay base CSS into the shell <style> BEFORE kid css (kid css wins)', () => {
    const kidCss = text('style.css', '#overlay{color:red}');
    const doc = buildGamePreview([...FILES, overlay(HUD), kidCss]).srcDoc;
    const baseAt = doc.indexOf('#overlay{position:fixed;inset:0;z-index:10;pointer-events:none');
    const kidAt = doc.indexOf('#overlay{color:red}');
    expect(baseAt).toBeGreaterThan(-1);
    expect(kidAt).toBeGreaterThan(baseAt);
    // The frozen pass-through + touch-target rules ride along.
    expect(doc).toContain('[data-ui]){pointer-events:auto;touch-action:manipulation}');
    expect(doc).toContain('#overlay button{min-width:44px;min-height:44px}');
  });

  it('keeps scriptRanges EXACT with a multi-line overlay in front of the kid scripts', () => {
    const multi = overlay('<div class="hud">\n  <button id="b1" data-ui>▲</button>\n  <button id="b2" data-ui>▼</button>\n</div>');
    const { srcDoc, scriptRanges } = buildGamePreview([...FILES, multi]);
    const docLines = srcDoc.split('\n');
    for (const range of scriptRanges) {
      const file = FILES.find((f) => f.path === range.path)!;
      const fileLines = file.content.split('\n');
      expect(docLines[range.start - 1].endsWith(fileLines[0])).toBe(true);
      for (let i = 1; i < fileLines.length; i++) {
        expect(docLines[range.start - 1 + i]).toBe(fileLines[i]);
      }
    }
  });

  it('inlines quoted asset refs inside the overlay (an <img src> becomes a data: URL)', () => {
    const heart: VfsFile = { path: 'assets/hud/heart.png', content: 'SEVBUlQ=', kind: 'asset', size: 6 };
    const doc = buildGamePreview([
      ...FILES,
      heart,
      overlay('<img src="assets/hud/heart.png" alt="life">'),
    ]).srcDoc;
    expect(doc).toContain('<img src="data:image/png;base64,SEVBUlQ=" alt="life">');
    expect(doc).not.toContain('"assets/hud/heart.png"');
  });

  it('inlines asset paths containing & / spaces (innerHTML entity-encodes attributes — the DOM pass must win)', () => {
    // `assets/a&b.png` serializes as `assets/a&amp;b.png` in innerHTML, so a raw
    // text-level path match can never hit it — the regression this pins is a
    // silently-broken <img> for a perfectly legal imported filename.
    const amp: VfsFile = { path: 'assets/a&b.png', content: 'QUImQg==', kind: 'asset', size: 6 };
    const spaced: VfsFile = {
      path: 'assets/fish & chips.png',
      content: 'RklTSA==',
      kind: 'asset',
      size: 6,
    };
    const doc = buildGamePreview([
      ...FILES,
      amp,
      spaced,
      overlay('<img src="assets/a&b.png"><img src="assets/fish & chips.png">'),
    ]).srcDoc;
    expect(doc).toContain('src="data:image/png;base64,QUImQg=="');
    expect(doc).toContain('src="data:image/png;base64,RklTSA=="');
    expect(doc).not.toContain('a&amp;b.png');
    expect(doc).not.toContain('fish &amp; chips.png');
  });

  it('strips <script> from the overlay and repairs malformed markup so kid scripts still execute', () => {
    expect(sanitizeOverlay('<button>ok</button><script>alert(1)</script>')).toBe('<button>ok</button>');
    // DOMParser repair: an unclosed tag is CLOSED inside the fragment — raw
    // injection would have swallowed every following kid <script>.
    expect(sanitizeOverlay('<div class="hud">hi')).toBe('<div class="hud">hi</div>');
    for (const broken of ['<style>.hud{color:red}', '<div class="hud">hi']) {
      const { srcDoc, scriptRanges } = buildGamePreview([...FILES, overlay(broken)]);
      expect(srcDoc).not.toContain('alert(1)');
      // The kid entry is still an executable <script> with its sourceURL intact.
      expect(srcDoc).toContain('<script>new Game();');
      expect(srcDoc).toContain('//# sourceURL=main.js');
      expect(scriptRanges.map((r) => r.path)).toEqual(['src/scenes/Game.js', 'main.js']);
    }
  });

  it('does NOT inject any other .html file (only the reserved overlay.html renders)', () => {
    const doc = buildGamePreview([...FILES, text('notes.html', '<h1>my secret notes</h1>')]).srcDoc;
    expect(doc).not.toContain('my secret notes');
    expect(doc).not.toContain('id="overlay"');
  });

  it('resolveErrorLoc drops a loc pointing into the overlay region (host chrome, not kid code)', () => {
    const { srcDoc, scriptRanges } = buildGamePreview([...FILES, overlay(HUD)]);
    const overlayLine = srcDoc.slice(0, srcDoc.indexOf('<div id="overlay">')).split('\n').length;
    expect(
      resolveErrorLoc({ file: 'about:srcdoc', line: overlayLine, col: 1 }, scriptRanges),
    ).toBeUndefined();
  });

  it('with an overlay BOTH engines route snapshots through the composited seam', () => {
    for (const engine of ['phaser', 'three'] as const) {
      const doc = buildGamePreview([...FILES, overlay(HUD)], { engine }).srcDoc;
      expect(doc).toContain('window.__airbotixSnapshotOut = function (canvasUrl)'); // the shim
      expect(doc).toContain('(window.__airbotixSnapshotOut || function (u)'); // the control-shim seam
      expect(doc).toContain('composited: true');
      expect(doc).toContain('composited: false');
    }
  });
});
