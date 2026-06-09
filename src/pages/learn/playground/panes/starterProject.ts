// Multi-file Phaser game scaffold + a stubbed scaffold generator. This models a
// realistic small game project (Moon-Breaker-style layout: a Boot scene that
// hands off to the main Game scene, plus a GameOver placeholder, an assets
// folder, and a host stylesheet) so the playground can exercise the multi-file /
// multi-folder VFS path instead of the single-file Pong seed (`starterGame.ts`).
//
// Runtime contract (see playground/CLAUDE.md): the preview injects EVERY `.js`
// text file as a classic `<script>` tag with the entry (`main.js`) injected
// LAST. There is no module system in the sandbox, so files must NOT use
// `import`/`export` — every scene is a GLOBAL class, and `main.js` constructs
// `new Phaser.Game({ scene: [Boot, Game] })` referencing those globals. Mount is
// the host element `id="game"`; assets/sounds resolve via the build-time data:
// URL rewrite, so this scaffold references none and runs as-is.

import type { VfsFile } from '../../code/codeApi';
import { SAMPLE_ASSETS } from '../sampleAssets';

// ── Entry: builds the game and wires the scene list (entry, injected LAST) ────

const MAIN_JS = `// Entry point. Wires the global scene classes into one Phaser.Game.
// Boot runs first, then hands off to Game. GameOver is reachable from Game.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  height: 600,
  backgroundColor: '#0f172a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade' },
  scene: [Boot, Game],
});
`;

// ── Boot: tiny bootstrap scene — load nothing, jump straight to Game ──────────

const BOOT_JS = `// Boot scene: a place to preload assets later. For now it just starts the game.
class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Game');
  }
}
`;

// ── Game: the playable scene (Pong logic, ported from starterGame.ts) ─────────

const GAME_JS = `// Game scene: a one-paddle Pong rally. Move with the mouse or arrow keys; the
// CPU tracks the ball and every hit speeds things up and bumps the score.
const W = 800;
const H = 600;

class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.score = 0;
    this.player = this.add.rectangle(30, H / 2, 16, 110, 0x6ee7b7);
    this.cpu = this.add.rectangle(W - 30, H / 2, 16, 110, 0xfca5a5);
    this.physics.add.existing(this.player);
    this.physics.add.existing(this.cpu);
    this.player.body.setImmovable(true);
    this.cpu.body.setImmovable(true);

    this.ball = this.add.circle(W / 2, H / 2, 12, 0xffffff);
    this.physics.add.existing(this.ball);
    this.ball.body.setBounce(1, 1).setCollideWorldBounds(true);
    this.resetBall();

    this.physics.add.collider(this.ball, this.player, () => this.bump());
    this.physics.add.collider(this.ball, this.cpu);

    this.scoreText = this.add.text(W / 2, 40, '0', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(W / 2, H - 28, 'Move your paddle with the mouse or ↑ / ↓', {
      fontFamily: 'monospace', fontSize: '16px', color: '#94a3b8',
    }).setOrigin(0.5);

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  resetBall() {
    this.ball.body.reset(W / 2, H / 2);
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.ball.body.setVelocity(260 * dir, Phaser.Math.Between(-160, 160));
  }

  bump() {
    this.score += 1;
    this.scoreText.setText(String(this.score));
    const b = this.ball.body;
    b.setVelocity(b.velocity.x * 1.05, b.velocity.y * 1.05);
  }

  update() {
    const pointer = this.input.activePointer;
    if (pointer.worldY) this.player.y = Phaser.Math.Clamp(pointer.worldY, 55, H - 55);
    if (this.cursors.up.isDown) this.player.y = Math.max(55, this.player.y - 7);
    if (this.cursors.down.isDown) this.player.y = Math.min(H - 55, this.player.y + 7);
    this.player.body.updateFromGameObject();

    // Simple CPU: track the ball.
    this.cpu.y = Phaser.Math.Linear(this.cpu.y, this.ball.y, 0.08);
    this.cpu.y = Phaser.Math.Clamp(this.cpu.y, 55, H - 55);
    this.cpu.body.updateFromGameObject();

    // Ball left the field — reset and keep the rally going.
    if (this.ball.x < 0 || this.ball.x > W) this.resetBall();
  }
}
`;

// ── GameOver: minimal placeholder scene (wired into the project for later) ────

const GAME_OVER_JS = `// GameOver scene: placeholder for an end screen. Start it from Game when you
// add a lose condition, e.g. this.scene.start('GameOver', { score: this.score }).
class GameOver extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data) {
    this.add.text(400, 300, 'Game Over', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffffff',
    }).setOrigin(0.5);
  }
}
`;

// ── Static assets folder (kept text so the VFS stays free of binary blobs) ────

const ASSETS_README = `Drop sprites/sounds here.

Reference them from src/scenes/Game.js, for example:
  this.load.image('hero', 'assets/hero.png');
`;

// ── Host stylesheet (the studio owns the page; kids may tweak the frame) ──────

const STYLE_CSS = `html, body { margin: 0; background: #000; }
`;

// Paths use slashes to model real folders; the preview flattens by file kind,
// not by directory, so nested `.js` files still inject as scripts in order.
export const STARTER_PROJECT: VfsFile[] = [
  { path: 'main.js', content: MAIN_JS, kind: 'text', size: MAIN_JS.length },
  { path: 'src/scenes/Boot.js', content: BOOT_JS, kind: 'text', size: BOOT_JS.length },
  { path: 'src/scenes/Game.js', content: GAME_JS, kind: 'text', size: GAME_JS.length },
  { path: 'src/scenes/GameOver.js', content: GAME_OVER_JS, kind: 'text', size: GAME_OVER_JS.length },
  { path: 'assets/README.txt', content: ASSETS_README, kind: 'text', size: ASSETS_README.length },
  { path: 'style.css', content: STYLE_CSS, kind: 'text', size: STYLE_CSS.length },
  // One sample of every Asset Viewer kind (image / sprite / audio / video) so
  // the viewer has something to show out of the box. Text is README.txt above.
  ...SAMPLE_ASSETS,
];

// How long the stub pretends to "generate" before returning the scaffold.
// Kept short (2s) so dev/debugging reaches the workspace fast; exported so the
// Generating screen syncs its progress bar / status ticks to the same span.
export const SCAFFOLD_DELAY_MS = 2000;

/**
 * STUB scaffold generator. Stands in for the server-side agent build (decision
 * D-CODE1 — the real loop runs in `platform-backend/code-sessions`, never on the
 * kid surface). It does no network work: it waits a beat to drive the Generating
 * screen, then returns {@link STARTER_PROJECT} with the kid's prompt recorded as
 * a header comment in `main.js` so the output visibly reflects the request.
 */
export async function generateScaffold(prompt: string): Promise<VfsFile[]> {
  await new Promise<void>((resolve) => setTimeout(resolve, SCAFFOLD_DELAY_MS));

  const title = prompt.trim() || 'My Game';
  return STARTER_PROJECT.map((file) => {
    if (file.path !== 'main.js') return file;
    const content = `// ${title}\n${file.content}`;
    return { ...file, content, size: content.length };
  });
}
