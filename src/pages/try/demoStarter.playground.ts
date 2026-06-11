// The bundled starter VFS for the `/try/playground` demo (try-demo-mode-prd §3):
// a small, fully-playable fruit-catcher game — the client-side equivalent of the
// backend-seeded `phaser_catcher` template. Served through the demo seam in
// `panes/playgroundApi.ts` so the REAL studio opens on these files with zero
// network. It follows the playground runtime contract (playground/CLAUDE.md):
// `Phaser` global, mount `id="game"`, global classes, no import/export, entry
// `main.js` injected last.
//
// The sprites are EMOJI ART shipped as real VFS assets (`assets/*.svg`, §3 step
// 2/7): the game loads them via `this.load.image(...)` — `buildGamePreview`
// inlines VFS asset paths as data: URLs — and the SAME files appear in the Asset
// Viewer, so the art the kid sees in the game is the art in the viewer.
//
// The named constants below (FALL_SPEED / POINTS_PER_CATCH) and the structural
// anchors (`class Game…`, `this.cursors = …`, the catchApple body) are what the
// scripted demo turns edit (`demoScript.playground.ts`) — if you rename or
// reformat them, update the script's find/replace pairs in the same change
// (the script tests assert every edit still applies).

import type { VfsFile } from '../learn/code/codeApi';

/** A 64×64 transparent SVG with one big centred emoji, as a base64 data URL. */
export function emojiSvgDataUrl(emoji: string): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
    `<text x="32" y="36" font-size="52" text-anchor="middle" dominant-baseline="central">${emoji}</text>` +
    '</svg>';
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}

const APPLE_SVG = emojiSvgDataUrl('🍎');
const BASKET_SVG = emojiSvgDataUrl('🧺');

const MAIN_JS = `// Fruit Catcher — entry point. Wires the Game scene into one Phaser.Game.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  height: 600,
  backgroundColor: '#0f172a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade' },
  scene: [Game],
});
`;

const GAME_JS = `// Game scene: catch the falling apples! Move the basket with the mouse or ← →.
const W = 800;
const H = 600;
const FALL_SPEED = 150; // how fast apples fall (pixels per second)
const SPAWN_EVERY_MS = 900; // a new apple drops this often
const BASKET_WIDTH = 110;
const APPLE_SIZE = 44;
const POINTS_PER_CATCH = 1; // score for each apple you catch

class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  preload() {
    // Emoji art — these live in the project's assets (open the Asset Viewer!).
    this.load.image('apple', 'assets/apple.svg');
    this.load.image('basket', 'assets/basket.svg');
  }

  create() {
    this.score = 0;
    this.basket = this.add.image(W / 2, H - 60, 'basket');
    this.basket.setDisplaySize(BASKET_WIDTH, BASKET_WIDTH);
    this.physics.add.existing(this.basket);
    this.basket.body.setImmovable(true);

    this.apples = this.add.group();
    this.time.addEvent({ delay: SPAWN_EVERY_MS, loop: true, callback: () => this.dropApple() });

    this.scoreText = this.add.text(W / 2, 40, '0', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(W / 2, H - 16, 'Move the basket with the mouse or ← →', {
      fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8',
    }).setOrigin(0.5);

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  dropApple() {
    const apple = this.add.image(Phaser.Math.Between(30, W - 30), -20, 'apple');
    apple.setDisplaySize(APPLE_SIZE, APPLE_SIZE);
    this.physics.add.existing(apple);
    apple.body.setVelocity(0, FALL_SPEED);
    this.apples.add(apple);
    this.physics.add.overlap(this.basket, apple, () => this.catchApple(apple));
  }

  catchApple(apple) {
    if (!apple.active) return;
    apple.destroy();
    this.score += POINTS_PER_CATCH;
    this.scoreText.setText(String(this.score));
  }

  update() {
    const pointer = this.input.activePointer;
    if (pointer.worldX) {
      this.basket.x = Phaser.Math.Clamp(pointer.worldX, BASKET_WIDTH / 2, W - BASKET_WIDTH / 2);
    }
    if (this.cursors.left.isDown) this.basket.x = Math.max(BASKET_WIDTH / 2, this.basket.x - 8);
    if (this.cursors.right.isDown) this.basket.x = Math.min(W - BASKET_WIDTH / 2, this.basket.x + 8);
    this.basket.body.updateFromGameObject();

    // Tidy up apples that fell past the bottom.
    for (const apple of this.apples.getChildren().slice()) {
      if (apple.y > H + 30) apple.destroy();
    }
  }
}
`;

const STYLE_CSS = `html, body { margin: 0; background: #000; }
`;

/** The demo's initial project — fresh copies so demo edits never mutate it. */
export function demoStarterFiles(): VfsFile[] {
  return [
    { path: 'main.js', content: MAIN_JS, kind: 'text', size: MAIN_JS.length },
    { path: 'src/scenes/Game.js', content: GAME_JS, kind: 'text', size: GAME_JS.length },
    { path: 'style.css', content: STYLE_CSS, kind: 'text', size: STYLE_CSS.length },
    { path: 'assets/apple.svg', content: APPLE_SVG, kind: 'asset', size: APPLE_SVG.length },
    { path: 'assets/basket.svg', content: BASKET_SVG, kind: 'asset', size: BASKET_SVG.length },
  ];
}

/** The file every scripted demo turn edits. */
export const DEMO_GAME_FILE = 'src/scenes/Game.js';
