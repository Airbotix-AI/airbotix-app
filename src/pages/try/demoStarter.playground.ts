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
  backgroundColor: '#bfe9ff',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade' },
  scene: [Game],
});
`;

const GAME_JS = `// Game scene: catch the falling apples! Move the basket with the mouse or ← →.
// Look: "paper-cut on a layered scene" — a sky → hills → ground backdrop, with
// objects lifted by soft offset shadows (depth from layers + shadows, not detail).
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

    // A layered orchard scene — sky, hills, and ground as separate depth layers.
    this.paintScene();

    // Title, lifted off the sky with a soft shadow (paper-cut depth).
    this.add.text(W / 2, 42, 'Fruit Catcher', {
      fontFamily: 'system-ui, "Segoe UI", sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#33240f',
    }).setOrigin(0.5).setShadow(2, 3, 'rgba(0,0,0,0.18)', 4).setDepth(10);

    // A soft shadow keeps the basket sitting ON the ground, not floating.
    this.basketShadow = this.add.ellipse(W / 2, H - 36, BASKET_WIDTH * 0.85, 20, 0x1f3d1f, 0.22).setDepth(4);
    this.basket = this.add.image(W / 2, H - 60, 'basket');
    this.basket.setDisplaySize(BASKET_WIDTH, BASKET_WIDTH).setDepth(5);
    this.physics.add.existing(this.basket);
    this.basket.body.setImmovable(true);

    this.apples = this.add.group();
    this.time.addEvent({ delay: SPAWN_EVERY_MS, loop: true, callback: () => this.dropApple() });

    // Score on a little paper-cut pill so it reads on the bright sky.
    this.add.graphics().fillStyle(0x33240f, 0.85).fillRoundedRect(28, 26, 96, 56, 16).setDepth(10);
    this.scoreText = this.add.text(76, 54, '0', {
      fontFamily: 'system-ui, sans-serif', fontSize: '36px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H - 16, 'Move the basket with the mouse or ← →', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#33240f',
    }).setOrigin(0.5).setDepth(11);

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  // The layered backdrop: sky gradient → sun → far hills → near hill → ground.
  // Each layer is a flat shape at a low depth, so gameplay objects sit in front.
  paintScene() {
    this.add.graphics().fillGradientStyle(0xbfe9ff, 0xbfe9ff, 0xe9f8da, 0xe9f8da, 1).fillRect(0, 0, W, H).setDepth(-30);
    this.add.circle(W - 96, 92, 46, 0xfff2a8).setDepth(-29);
    this.add.ellipse(W * 0.26, H * 0.94, W * 0.95, H * 0.52, 0x9bd888).setDepth(-20);
    this.add.ellipse(W * 0.82, H * 0.98, W * 0.8, H * 0.46, 0x8ad07a).setDepth(-20);
    this.add.ellipse(W * 0.5, H * 1.08, W * 1.35, H * 0.6, 0x5cae57).setDepth(-10);
    this.add.rectangle(W / 2, H, W, H * 0.16, 0x46883f).setOrigin(0.5, 1).setDepth(-5);
  }

  dropApple() {
    const apple = this.add.image(Phaser.Math.Between(30, W - 30), -20, 'apple');
    apple.setDisplaySize(APPLE_SIZE, APPLE_SIZE).setDepth(6);
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
    this.basketShadow.x = this.basket.x;

    // Tidy up apples that fell past the bottom.
    for (const apple of this.apples.getChildren().slice()) {
      if (apple.y > H + 30) apple.destroy();
    }
  }
}
`;

const STYLE_CSS = `html, body { margin: 0; background: #bfe9ff; }
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
