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
// URL rewrite, so this scaffold references none and runs as-is. `overlay.html`
// is the ONE reserved HTML fragment the runtime injects as `<div id="overlay">`
// above the canvas (D-GAME13) — markup only, wired from Game.js via
// getElementById (the overlay div exists before any kid script runs).

import type { VfsFile } from '../../code/codeApi';

// ── Entry: builds the game and wires the scene list (entry, injected LAST) ────

const MAIN_JS = `// Entry point. Wires the global scene classes into one Phaser.Game.
// Boot runs first, then hands off to Game. GameOver is reachable from Game.
// Kept on \`var game\` (a window global in this classic script) so you can poke
// the running game from the console — try game.scene.keys.Game in devtools.
var game = new Phaser.Game({
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
    this.wireOverlay();
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

    this.add.text(W / 2, H - 28, 'Drag to move your paddle — or use ↑ / ↓ or the buttons', {
      fontFamily: 'monospace', fontSize: '16px', color: '#94a3b8',
    }).setOrigin(0.5);

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  // Wire the HTML overlay (overlay.html): the ▲/▼ touch buttons set held-flags
  // (pointerdown = press, pointerup/cancel = release) and the score chip mirrors
  // the in-canvas score. Overlay elements may be edited away — always null-check.
  // Property assignment (not addEventListener) so a scene restart re-binds to
  // the NEW scene instance instead of stacking a listener per restart.
  wireOverlay() {
    this.touch = { up: false, down: false };
    const hold = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.onpointerdown = () => { this.touch[key] = true; };
      el.onpointerup = () => { this.touch[key] = false; };
      el.onpointercancel = () => { this.touch[key] = false; };
    };
    hold('btn-up', 'up');
    hold('btn-down', 'down');
  }

  resetBall() {
    this.ball.body.reset(W / 2, H / 2);
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.ball.body.setVelocity(260 * dir, Phaser.Math.Between(-160, 160));
  }

  bump() {
    this.score += 1;
    this.scoreText.setText(String(this.score));
    const chip = document.getElementById('hud-score');
    if (chip) chip.textContent = String(this.score);
    const b = this.ball.body;
    b.setVelocity(b.velocity.x * 1.05, b.velocity.y * 1.05);
  }

  update() {
    const pointer = this.input.activePointer;
    // Follow the pointer only while it is HELD DOWN (drag). activePointer keeps
    // its last position after a touch ends, so an ungated follow would pin the
    // paddle to a stale spot forever and dead the ▲/▼ hold-buttons.
    if (pointer.isDown && pointer.worldY) this.player.y = Phaser.Math.Clamp(pointer.worldY, 55, H - 55);
    if (this.cursors.up.isDown || this.touch.up) this.player.y = Math.max(55, this.player.y - 7);
    if (this.cursors.down.isDown || this.touch.down) this.player.y = Math.min(H - 55, this.player.y + 7);
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

// ── HTML overlay (the ONE reserved fragment, injected as <div id="overlay">) ──
// Markup only — no <script> (the runtime strips them). The runtime's base CSS
// makes the container pass-through (pointer-events:none) and opts buttons back
// in; the inline pointer-events/touch-action keep held-buttons working even if
// a kid edits the base rules away (touch-action:none = no scroll while held).

const OVERLAY_HTML = `<div style="position:absolute;top:12px;left:12px;background:rgba(15,23,42,0.72);border-radius:12px;padding:6px 14px;font:bold 18px system-ui,sans-serif">
  Score: <span id="hud-score">0</span>
</div>
<div style="position:absolute;right:16px;bottom:16px;display:flex;flex-direction:column;gap:10px">
  <button id="btn-up" data-ui type="button" aria-label="Move up" style="pointer-events:auto;touch-action:none;width:56px;height:56px;font-size:24px;border-radius:16px;border:0;background:rgba(255,255,255,0.85)">▲</button>
  <button id="btn-down" data-ui type="button" aria-label="Move down" style="pointer-events:auto;touch-action:none;width:56px;height:56px;font-size:24px;border-radius:16px;border:0;background:rgba(255,255,255,0.85)">▼</button>
</div>
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
  { path: 'overlay.html', content: OVERLAY_HTML, kind: 'text', size: OVERLAY_HTML.length },
  { path: 'style.css', content: STYLE_CSS, kind: 'text', size: STYLE_CSS.length },
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
