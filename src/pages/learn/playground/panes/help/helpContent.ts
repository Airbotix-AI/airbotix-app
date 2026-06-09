// The Game Guide corpus — the curated, kid-tiered learning content for the Game
// Studio (PRD `learn-game-studio-help-prd.md` §3). Authored as TYPED, STRUCTURED
// content (not raw Markdown) so it renders through plain React components with no
// markdown/sanitizer dependency — XSS-safe by construction on a kids' surface.
//
// Each doc has a stable `id` (`<pillar>/<slug>`) that NEVER changes without a
// redirect, headings whose `anchor` is the jump target (`docId#anchor`), and
// blocks tagged with a tier so the reader can show Lite (8–11) or Pro (12–17)
// depth from ONE authored doc (D‑HELP‑03). `searchText()` (helpApi) indexes the
// title + tags + every block's text for the kid's pane search and (later, MH2)
// the agent's `search_help` tool.
//
// ⚠️ `phaser/runtime-contract` is LOAD-BEARING (D‑HELP‑06): it mirrors the real
// runtime contract in `buildGamePreview.ts` + `vite.config.ts` (`PHASER_VERSION`).
// `helpContent.test.ts` fails the build if it drifts. Keep them in sync.

/** Reading tier. `both` (the default when a block omits `tier`) shows always. */
export type Tier = 'lite' | 'pro';

/** The three learning pillars. */
export type Pillar = 'engine' | 'basics' | 'phaser';

/** A renderable block. `tier` omitted = shown in BOTH tiers. */
export type HelpBlock =
  | { kind: 'heading'; text: string; anchor: string; tier?: Tier }
  | { kind: 'para'; text: string; tier?: Tier }
  | { kind: 'list'; items: string[]; tier?: Tier }
  | { kind: 'code'; code: string; tier?: Tier }
  | { kind: 'callout'; text: string; tier?: Tier };

export interface HelpDoc {
  /** Stable id `<pillar>/<slug>` — the `open_help` target + the deep-link key. */
  id: string;
  pillar: Pillar;
  title: string;
  /** Lexical-search boosters — kid synonyms ("guy", "go up") live here. */
  tags: string[];
  blocks: HelpBlock[];
}

export interface PillarMeta {
  id: Pillar;
  title: string;
  blurb: string;
}

/** Pillar order + kid-facing labels for the Guide nav. */
export const HELP_PILLARS: readonly PillarMeta[] = [
  { id: 'engine', title: 'How games work', blurb: 'The big ideas behind every game.' },
  { id: 'basics', title: 'Game basics', blurb: 'Sprites, moving, scoring, winning.' },
  { id: 'phaser', title: 'Phaser 4', blurb: 'The engine your game runs on.' },
] as const;

/** The Phaser MAJOR version the Guide teaches — asserted against the real engine
 *  version in `helpContent.test.ts` (HJ6 / D‑HELP‑06). */
export const GUIDE_PHASER_MAJOR = 4;

export const HELP_DOCS: readonly HelpDoc[] = [
  // ── engine/ — game-engine basics ──────────────────────────────────────────
  {
    id: 'engine/what-is-an-engine',
    pillar: 'engine',
    title: 'What is a game engine?',
    tags: ['engine', 'phaser', 'library', 'what is', 'basics'],
    blocks: [
      { kind: 'heading', text: 'A helper that draws and moves things', anchor: 'overview' },
      {
        kind: 'para',
        text: 'A game engine is a big helper that already knows how to draw pictures on the screen, move them around, and check when they bump into each other. You tell it WHAT you want, and it does the hard parts for you.',
      },
      {
        kind: 'para',
        tier: 'pro',
        text: 'Your studio uses Phaser. Without an engine you would have to write the drawing loop, input handling, and collision maths yourself — the engine gives you scenes, sprites, physics and an input system out of the box so you can focus on YOUR game.',
      },
      {
        kind: 'callout',
        text: 'You write the idea; the engine does the drawing and the maths.',
      },
    ],
  },
  {
    id: 'engine/scenes-and-the-game-loop',
    pillar: 'engine',
    title: 'Scenes and the game loop',
    tags: ['scene', 'loop', 'update', 'create', 'preload', 'frame', 'tick'],
    blocks: [
      { kind: 'heading', text: 'A game runs in a loop', anchor: 'the-loop' },
      {
        kind: 'para',
        text: 'A game does the same thing over and over, many times a second: look at what changed, move things, and draw. That repeating is called the game loop.',
      },
      {
        kind: 'heading', text: 'Three moments in a scene', anchor: 'preload-create-update', tier: 'lite',
      },
      {
        kind: 'list',
        tier: 'lite',
        items: [
          'preload — get your pictures and sounds ready.',
          'create — set up your game the first time.',
          'update — runs again and again to move things.',
        ],
      },
      {
        kind: 'para',
        tier: 'pro',
        text: 'A Phaser Scene has lifecycle methods: preload() loads assets, create() builds the world once, and update(time, delta) runs every frame. Put one-time setup in create() and per-frame logic (movement, input checks) in update().',
      },
    ],
  },
  {
    id: 'engine/coordinates-and-the-canvas',
    pillar: 'engine',
    title: 'Coordinates and the canvas',
    tags: ['coordinates', 'x', 'y', 'canvas', 'position', 'screen', 'pixels'],
    blocks: [
      { kind: 'heading', text: 'x goes right, y goes DOWN', anchor: 'xy' },
      {
        kind: 'para',
        text: 'Every spot on the screen has two numbers: x (how far right) and y (how far down). The top-left corner is 0,0. This surprises people: bigger y means LOWER on the screen, not higher.',
      },
      {
        kind: 'callout',
        text: 'To move something up, make its y SMALLER.',
      },
    ],
  },
  {
    id: 'engine/why-its-sandboxed',
    pillar: 'engine',
    title: 'Why your game runs in a safe box',
    tags: ['sandbox', 'safe', 'iframe', 'security'],
    blocks: [
      { kind: 'heading', text: 'A safe play area', anchor: 'overview' },
      {
        kind: 'para',
        text: 'Your game runs inside a locked box on the page. It can draw, play sounds and take key presses, but it cannot reach the rest of the app. That keeps everyone safe and means you can experiment freely — you cannot break anything outside your game.',
      },
    ],
  },

  // ── basics/ — game basics ───────────────────────────────────────────────────
  {
    id: 'basics/sprites-and-objects',
    pillar: 'basics',
    title: 'Sprites and game objects',
    tags: ['sprite', 'object', 'player', 'guy', 'character', 'image', 'shape'],
    blocks: [
      { kind: 'heading', text: 'The things in your game', anchor: 'overview' },
      {
        kind: 'para',
        text: 'A sprite is a thing in your game you can see and move — your player, an enemy, a coin. It can be a picture or a simple shape like a rectangle or circle.',
      },
      {
        kind: 'para',
        tier: 'pro',
        text: 'In Phaser you make shapes with this.add.rectangle(x, y, w, h, color) or images with this.add.image(x, y, key). For movement and collisions, add it to physics with this.physics.add.existing(obj).',
      },
    ],
  },
  {
    id: 'basics/moving-with-input',
    pillar: 'basics',
    title: 'Moving your player',
    tags: ['move', 'input', 'keyboard', 'arrow', 'keys', 'mouse', 'pointer', 'control', 'go', 'walk'],
    blocks: [
      { kind: 'heading', text: 'Listen for keys, then move', anchor: 'overview' },
      {
        kind: 'para',
        text: 'To move your player you check which keys are pressed during update, then change where the player is (or how fast it moves).',
      },
      {
        kind: 'code',
        tier: 'pro',
        code: "// in create():\nthis.cursors = this.input.keyboard.createCursorKeys();\n\n// in update():\nif (this.cursors.left.isDown)  this.player.body.setVelocityX(-200);\nelse if (this.cursors.right.isDown) this.player.body.setVelocityX(200);\nelse this.player.body.setVelocityX(0);",
      },
      {
        kind: 'para',
        tier: 'lite',
        text: 'Use the arrow keys: when ← is held, move the player left; when → is held, move it right. Check this every update so it keeps moving while you hold the key.',
      },
    ],
  },
  {
    id: 'basics/collisions',
    pillar: 'basics',
    title: 'Bumping and collecting',
    tags: ['collision', 'overlap', 'hit', 'touch', 'collect', 'bump', 'crash'],
    blocks: [
      { kind: 'heading', text: 'When two things touch', anchor: 'overview' },
      {
        kind: 'para',
        text: 'Games often need to know when two things touch — the player grabs a coin, or an enemy hits you. The engine can watch for that and call your code when it happens.',
      },
      {
        kind: 'code',
        tier: 'pro',
        code: "this.physics.add.overlap(this.player, this.coins, (player, coin) => {\n  coin.destroy();\n  this.score += 1;\n});",
      },
    ],
  },
  {
    id: 'basics/score-and-lives',
    pillar: 'basics',
    title: 'Score and lives',
    tags: ['score', 'points', 'lives', 'health', 'text', 'counter'],
    blocks: [
      { kind: 'heading', text: 'Keeping count', anchor: 'overview' },
      {
        kind: 'para',
        text: 'A score is just a number you add to when something good happens. Show it with on-screen text and update the text whenever the number changes.',
      },
      {
        kind: 'code',
        tier: 'pro',
        code: "// create():\nthis.score = 0;\nthis.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px' });\n\n// when you score:\nthis.score += 1;\nthis.scoreText.setText('Score: ' + this.score);",
      },
    ],
  },
  {
    id: 'basics/win-and-lose',
    pillar: 'basics',
    title: 'Winning and losing',
    tags: ['win', 'lose', 'game over', 'end', 'restart'],
    blocks: [
      { kind: 'heading', text: 'Ending the game', anchor: 'overview' },
      {
        kind: 'para',
        text: 'Decide what counts as winning (reach a score, finish a level) and what counts as losing (run out of lives). When it happens, show a message and let the player start again.',
      },
      {
        kind: 'para',
        tier: 'pro',
        text: 'A clean way is a separate GameOver scene you start with this.scene.start("GameOver", { score }). Pressing a key there can this.scene.start your main scene again to restart.',
      },
    ],
  },

  // ── phaser/ — Phaser 4 specifics ────────────────────────────────────────────
  {
    id: 'phaser/runtime-contract',
    pillar: 'phaser',
    title: 'How your code runs here',
    tags: ['import', 'export', 'module', 'global', 'main.js', 'rules', 'phaser', 'mount', 'game'],
    blocks: [
      { kind: 'heading', text: 'The rules your game must follow', anchor: 'overview' },
      {
        kind: 'para',
        text: 'Your game runs a little differently from a normal web project. A few rules matter — if you break them, your game will not start.',
      },
      { kind: 'heading', text: 'No import or export', anchor: 'no-imports' },
      {
        kind: 'para',
        text: 'Do NOT write "import Phaser from \'phaser\'" or use export. Phaser is already here as a global called Phaser, and your scene classes are global too. Just use them — no import lines.',
      },
      {
        kind: 'callout',
        text: 'Phaser is a global. Never import or export — it will stop your game from running.',
      },
      { kind: 'heading', text: 'main.js runs last', anchor: 'entry-last' },
      {
        kind: 'para',
        text: 'Your scene files load first, then main.js runs last and starts the game with new Phaser.Game(...). Mount your game into the element with id "game".',
      },
      {
        kind: 'code',
        tier: 'pro',
        code: "// main.js (runs LAST)\nnew Phaser.Game({\n  type: Phaser.AUTO,\n  parent: 'game',           // mount into <div id=\"game\">\n  physics: { default: 'arcade' },\n  scene: [Boot, Game, GameOver],\n});",
      },
    ],
  },
  {
    id: 'phaser/scenes',
    pillar: 'phaser',
    title: 'Phaser scenes',
    tags: ['scene', 'class', 'preload', 'create', 'update', 'extends'],
    blocks: [
      { kind: 'heading', text: 'A scene is a class', anchor: 'overview' },
      {
        kind: 'para',
        text: 'Each scene is a class that extends Phaser.Scene. It has preload (get assets), create (build once), and update (every frame).',
      },
      {
        kind: 'code',
        tier: 'pro',
        code: "class Game extends Phaser.Scene {\n  constructor() { super('Game'); }\n  preload() { /* this.load.image(...) */ }\n  create()  { /* build the world */ }\n  update()  { /* runs every frame */ }\n}",
      },
    ],
  },
  {
    id: 'phaser/arcade-physics',
    pillar: 'phaser',
    title: 'Arcade physics (gravity, jumping)',
    tags: ['physics', 'gravity', 'jump', 'velocity', 'fall', 'bounce', 'go up'],
    blocks: [
      { kind: 'heading', text: 'Make things fall and jump', anchor: 'gravity' },
      {
        kind: 'para',
        text: 'Arcade physics gives your sprites gravity (they fall) and velocity (a speed and direction). To jump, give the player an upward push — remember up means a NEGATIVE y velocity.',
      },
      {
        kind: 'para',
        tier: 'lite',
        text: 'Turn on gravity so your player falls. When the player is standing on the ground and you press the jump key, give it a quick push upward.',
      },
      {
        kind: 'code',
        tier: 'pro',
        code: "// give the player gravity (create):\nthis.player.body.setGravityY(800);\n\n// jump only when standing on something (update):\nif (this.cursors.up.isDown && this.player.body.blocked.down) {\n  this.player.body.setVelocityY(-450);   // negative = up\n}",
      },
    ],
  },
  {
    id: 'phaser/input',
    pillar: 'phaser',
    title: 'Keyboard and pointer input',
    tags: ['input', 'keyboard', 'keys', 'pointer', 'mouse', 'tap', 'click'],
    blocks: [
      { kind: 'heading', text: 'Reading keys and taps', anchor: 'overview' },
      {
        kind: 'para',
        text: 'Make cursor keys with this.input.keyboard.createCursorKeys(), then check .isDown in update. For taps/clicks, listen with this.input.on("pointerdown", ...).',
      },
    ],
  },
  {
    id: 'phaser/loading-assets',
    pillar: 'phaser',
    title: 'Loading images and sounds',
    tags: ['assets', 'image', 'sound', 'audio', 'load', 'preload', 'key'],
    blocks: [
      { kind: 'heading', text: 'Add it, then load it by name', anchor: 'overview' },
      {
        kind: 'para',
        text: 'Add a picture or sound as a project asset, then load it in preload with a name (a "key"), and use that key when you make a sprite or play a sound.',
      },
      {
        kind: 'code',
        tier: 'pro',
        code: "// preload():\nthis.load.image('hero', 'assets/hero.png');\n\n// create():\nthis.player = this.physics.add.sprite(100, 100, 'hero');",
      },
    ],
  },
] as const;
