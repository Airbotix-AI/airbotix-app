// The bundled starter VFS for the `/try/playground` demo (try-demo-mode-prd §3):
// a small, fully-playable fruit-catcher game — the client-side equivalent of the
// backend-seeded `phaser_catcher` template. Served through the demo seam in
// `panes/playgroundApi.ts` so the REAL studio opens on these files with zero
// network. It follows the playground runtime contract (playground/CLAUDE.md):
// `Phaser` global, mount `id="game"`, global classes, no import/export, entry
// `main.js` injected last.
//
// The named constants below (FALL_SPEED / POINTS_PER_CATCH / BASKET_WIDTH) are
// the anchors the scripted demo turns edit (`demoScript.playground.ts`) — if you
// rename or reformat them, update the script's find/replace pairs in the same
// change (the script tests assert every edit still applies).

import type { VfsFile } from '../learn/code/codeApi';

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
const POINTS_PER_CATCH = 1; // score for each apple you catch

class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.score = 0;
    this.basket = this.add.rectangle(W / 2, H - 50, BASKET_WIDTH, 26, 0x6ee7b7);
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
    const apple = this.add.circle(Phaser.Math.Between(30, W - 30), -20, 14, 0xfca5a5);
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
  ];
}

/** The file every scripted demo turn edits. */
export const DEMO_GAME_FILE = 'src/scenes/Game.js';
