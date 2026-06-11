// The bundled Game Guide corpus for `/try/playground` (try-demo-mode-prd §3
// step 10). The REAL `HelpPane` renders + searches it through its normal path
// (`loadHelpCorpus` → the demo seam in `panes/help/helpApi.ts`) — same shape as
// `GET /help/docs`, just shipped client-side so the demo stays offline.
//
// ⚠️ THIS IS A VERBATIM COPY of the REAL corpus — the single source of truth in
// `platform-backend/src/help/help-content.ts` (D-HELP-02). Nothing here is
// invented: the demo guide is the product guide. The drift alarm in
// `demoHelp.playground.test.ts` compares every doc/pillar/block against the
// backend source file (when the sibling checkout is present) — if the backend
// corpus changes, that test fails loudly: re-copy the content here.

import type { HelpCorpus } from '../learn/playground/panes/help/helpTypes';

/** The doc the tour's Guide step opens — the most diagram-rich page (two
 *  diagrams: the game loop + the scene flow), so evaluators land on visuals. */
export const DEMO_GUIDE_TOUR_DOC = 'engine/scenes-and-the-game-loop';

export const DEMO_HELP_CORPUS: HelpCorpus = {
  pillars: [
    { id: 'engine', title: 'How games work', blurb: 'The big ideas behind every game.' },
    { id: 'basics', title: 'Game basics', blurb: 'Sprites, moving, scoring, winning.' },
    { id: 'phaser', title: 'Phaser 4', blurb: 'The engine your game runs on.' },
  ],
  docs: [
    // ══════════════════════════════════════════════════════════════════════════
    // engine/ — how games work (the big ideas)
    // ══════════════════════════════════════════════════════════════════════════
    {
      id: 'engine/what-is-an-engine',
      pillar: 'engine',
      title: 'What is a game engine?',
      tags: ['engine', 'phaser', 'library', 'what is', 'basics', 'framework'],
      blocks: [
        { kind: 'heading', text: 'A helper that does the hard parts', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Imagine building a LEGO castle. A game engine is like a giant box of LEGO that already has wheels, doors and windows made for you — so instead of cutting every brick yourself, you just snap the ready-made pieces together to build your game.',
        },
        {
          kind: 'para',
          tier: 'lite',
          text: 'The engine already knows how to draw pictures on the screen, move them around, play sounds, and notice when two things bump into each other. You tell it WHAT you want to happen, and it takes care of the tricky how.',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'It draws your game many times every second so things look like they move.',
            'It listens to the keyboard and mouse for you.',
            'It checks when things touch (like a player grabbing a coin).',
            'It can add gravity so things fall, just like in real life.',
          ],
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'A game engine is a runtime + library that handles the cross-cutting work every game needs: a render loop, a scene graph, an input system, physics/collision, audio, asset loading and timing. Your studio uses Phaser, a 2D HTML5 engine that runs in the browser on a Canvas/WebGL surface.',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Without an engine you would hand-write the requestAnimationFrame loop, track delta time, manage a draw order, do AABB collision maths and wire raw DOM input events. The engine gives you Scenes, Game Objects, an Arcade physics world and an input manager out of the box, so your code is about YOUR game, not the plumbing.',
        },
        {
          kind: 'callout',
          text: 'You bring the idea; the engine does the drawing and the maths.',
        },
      ],
    },
    {
      id: 'engine/scenes-and-the-game-loop',
      pillar: 'engine',
      title: 'Scenes and the game loop',
      tags: ['scene', 'loop', 'update', 'create', 'preload', 'frame', 'tick', 'fps', 'delta'],
      blocks: [
        { kind: 'heading', text: 'A game runs in a loop', anchor: 'the-loop' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'A movie is lots of pictures shown quickly so it looks like things move. A game is the same — but the game DRAWS each new picture itself, about 60 times every second. Each picture is called a frame.',
        },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Every frame the game does three things, over and over: look at what changed (did you press a key?), move things a tiny bit, then draw the new picture. Doing it 60 times a second makes everything look smooth.',
        },
        {
          kind: 'diagram',
          diagram: 'game-loop',
          alt: 'The game loop as a circle: read input, then update (move things), then draw, then repeat — about 60 times a second.',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'The engine drives a fixed-ish loop on requestAnimationFrame (~60fps). Each tick it samples input, steps the physics world, runs your update(time, delta), then renders. `delta` is the milliseconds since the last frame — multiply movement by it (or use velocities) so speed is the same on a fast or slow device.',
        },
        { kind: 'heading', text: 'A scene is one screen', anchor: 'scenes' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'A scene is one screen of your game — like the title screen, the main game, or the "Game Over" screen. Each scene has its own stuff and its own rules. You switch scenes to move between screens.',
        },
        {
          kind: 'diagram',
          diagram: 'scene-flow',
          alt: 'Three scenes in a row — Title, Game, Game Over — with arrows showing you move from one screen to the next, and back to Game to play again.',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'preload — get your pictures and sounds ready before the screen starts.',
            'create — set everything up once, when the screen opens.',
            'update — runs again and again to move things and check the keys.',
          ],
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'A Phaser Scene is a class with lifecycle hooks: init(data) → preload() (queue asset loads) → create(data) (build the world once) → update(time, delta) (per-frame). One-time setup goes in create(); anything that must react every frame goes in update(). Move between scenes with this.scene.start("Key", data).',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "class Game extends Phaser.Scene {\n  constructor() { super('Game'); }\n  create() { this.player = this.add.rectangle(200, 100, 40, 40, 0x44ff88); }\n  update(time, delta) { this.player.y += 0.1 * delta; } // delta-scaled\n}",
        },
      ],
    },
    {
      id: 'engine/coordinates-and-the-canvas',
      pillar: 'engine',
      title: 'Coordinates and the canvas',
      tags: ['coordinates', 'x', 'y', 'canvas', 'position', 'screen', 'pixels', 'origin'],
      blocks: [
        { kind: 'heading', text: 'x goes right, y goes DOWN', anchor: 'xy' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Every spot on the screen has two numbers. The first is x — how far ACROSS (to the right). The second is y — how far DOWN. The very top-left corner is 0, 0.',
        },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Here is the surprising part: bigger y means LOWER on the screen, not higher. So to move something UP, you make its y number SMALLER. To move it down, make y bigger.',
        },
        {
          kind: 'diagram',
          diagram: 'xy-coordinates',
          alt: 'The screen with 0,0 in the top-left corner; x increases to the right, y increases downward, and a dot marks a point at its x and y.',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'The canvas uses screen coordinates: origin (0,0) at the top-left, +x right, +y down. The game has a fixed width/height (the config size); the studio scales the canvas to fit the stage but the coordinate space stays the same. Most Game Objects default to an origin of (0.5, 0.5) — their x/y is their CENTRE — except text/images where you may want setOrigin(0).',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "// centre of an 800x600 game:\nconst cx = this.scale.width / 2;   // 400\nconst cy = this.scale.height / 2;  // 300\nthis.add.text(cx, cy, 'Hi!').setOrigin(0.5); // centred on that point",
        },
        { kind: 'callout', text: 'To move something up, make its y SMALLER.' },
      ],
    },
    {
      id: 'engine/why-its-sandboxed',
      pillar: 'engine',
      title: 'Why your game runs in a safe box',
      tags: ['sandbox', 'safe', 'iframe', 'security', 'privacy'],
      blocks: [
        { kind: 'heading', text: 'A safe play area', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Your game runs inside a locked box on the page. It can draw, play sounds and read your key presses — but it cannot reach the rest of the app or the internet. That means you can experiment as much as you like and never break anything outside your game.',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'The game is assembled into a sandboxed <iframe> with an OPAQUE origin (no allow-same-origin), so your code cannot read the app, cookies or the login token, and cannot call the network. The only way it talks to the studio is by posting messages out (that is how the console, fps and screenshots reach the toolbar). It is a real security boundary, not just a setting.',
        },
        {
          kind: 'list',
          tier: 'pro',
          items: [
            'No network: fetch/XHR/WebSocket are unavailable — keep all logic self-contained.',
            'No modules: scripts share one global scope (see the runtime-contract doc).',
            'Errors and console.log are forwarded out so the studio can show them with file + line.',
          ],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // basics/ — game basics
    // ══════════════════════════════════════════════════════════════════════════
    {
      id: 'basics/sprites-and-objects',
      pillar: 'basics',
      title: 'Sprites and game objects',
      tags: [
        'sprite',
        'object',
        'player',
        'guy',
        'character',
        'image',
        'shape',
        'rectangle',
        'circle',
      ],
      blocks: [
        { kind: 'heading', text: 'The things in your game', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'A sprite is any THING in your game that you can see and move — your player, an enemy, a coin, a cloud. Think of each sprite as a sticker you can place on the screen and then slide around.',
        },
        {
          kind: 'para',
          tier: 'lite',
          text: 'A sprite can be a picture, OR a simple shape like a rectangle, circle or star. Shapes are great because you do not need any artwork — you just pick a size and a colour and it appears.',
        },
        {
          kind: 'diagram',
          diagram: 'sprite-shapes',
          alt: 'Examples of sprites made from shapes: a rectangle player, a circle coin, and a star — all built from shapes with no artwork.',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'Give each sprite a spot (its x and y).',
            'Give it a size and a colour.',
            'Keep it in a variable so you can move it later.',
          ],
        },
        {
          kind: 'heading',
          text: 'Making them in code',
          anchor: 'making-them',
          tier: 'pro',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Build visuals from shapes with this.add.rectangle / circle / star / triangle, or from loaded art with this.add.image / this.add.sprite. Keep a reference on `this` so update() can reach it. To move or collide it under physics, give it a body with this.physics.add.existing(obj).',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "// a shape sprite with physics\nthis.player = this.add.rectangle(120, 300, 40, 40, 0x44ff88);\nthis.physics.add.existing(this.player);\nthis.player.body.setCollideWorldBounds(true);\n\n// an image sprite (needs a loaded 'hero' key)\nthis.hero = this.physics.add.sprite(200, 300, 'hero').setScale(1.5);",
        },
      ],
    },
    {
      id: 'basics/moving-with-input',
      pillar: 'basics',
      title: 'Moving your player',
      tags: [
        'move',
        'input',
        'keyboard',
        'arrow',
        'keys',
        'mouse',
        'pointer',
        'control',
        'go',
        'walk',
        'wasd',
      ],
      blocks: [
        { kind: 'heading', text: 'Listen for keys, then move', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Moving your player is two steps: (1) find out which key is being held down, and (2) move the player a little in that direction. You check this every single frame, so while you HOLD an arrow key the player keeps moving.',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'Holding ← (left arrow)? Move the player a little to the left.',
            'Holding → (right arrow)? Move it a little to the right.',
            'Holding nothing? Stand still.',
          ],
        },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Tip: remember up is a SMALLER y. So "move up" means take a little OFF the y number.',
        },
        {
          kind: 'heading',
          text: 'Reading the keys in code',
          anchor: 'in-code',
          tier: 'pro',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Create cursor keys once in create(), then poll .isDown each frame in update(). For physics bodies set a velocity (it keeps moving smoothly and respects collisions); for plain objects nudge x/y directly. Set velocity back to 0 when no key is held so the player stops.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: '// create():\nthis.cursors = this.input.keyboard.createCursorKeys();\n\n// update():\nconst speed = 200;\nif (this.cursors.left.isDown) this.player.body.setVelocityX(-speed);\nelse if (this.cursors.right.isDown) this.player.body.setVelocityX(speed);\nelse this.player.body.setVelocityX(0);',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'For tap/click control instead, use this.input.on("pointerdown", (p) => { ... }) or make an object interactive (see the input doc).',
        },
      ],
    },
    {
      id: 'basics/collisions',
      pillar: 'basics',
      title: 'Bumping and collecting',
      tags: ['collision', 'overlap', 'hit', 'touch', 'collect', 'bump', 'crash', 'coin', 'enemy'],
      blocks: [
        { kind: 'heading', text: 'When two things touch', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Lots of games need to know when two things touch — the player grabs a coin, or an enemy bumps into you. The engine watches for this and runs your code the moment it happens, so you do not have to check every position yourself.',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'Overlap = they pass through each other but you get told (great for collecting coins).',
            'Collide = they bounce off / block each other (great for walls and floors).',
          ],
        },
        {
          kind: 'diagram',
          diagram: 'collision-overlap',
          alt: 'Two pictures: on the left two shapes overlap with a sparkle (overlap — you get told); on the right two shapes meet a wall and stop (collide — they block each other).',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Both objects need physics bodies. Use this.physics.add.overlap(a, b, cb) for "they touched, do something" and this.physics.add.collider(a, b, cb) for "they push each other". The callback receives the two objects so you can destroy one, add score, etc. Groups work too — pass a group as a or b to test many objects at once.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "// collect coins on overlap\nthis.physics.add.overlap(this.player, this.coins, (player, coin) => {\n  coin.destroy();\n  this.score += 1;\n  this.scoreText.setText('Score: ' + this.score);\n});\n\n// block the player with walls\nthis.physics.add.collider(this.player, this.walls);",
        },
      ],
    },
    {
      id: 'basics/score-and-lives',
      pillar: 'basics',
      title: 'Score and lives',
      tags: ['score', 'points', 'lives', 'health', 'text', 'counter', 'hud'],
      blocks: [
        { kind: 'heading', text: 'Keeping count', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'A score is just a number you keep. It starts at 0, and you ADD to it when something good happens (like grabbing a coin). Lives work the same way but you take 1 AWAY when something bad happens.',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'Make a number and start it at 0.',
            'Show it on the screen with text.',
            'Every time it changes, update the text so the player sees the new number.',
          ],
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Keep the value on `this` (so every method can reach it) and a Text object to display it. Update the text only when the value changes. Text added in create() stays fixed on screen — perfect for a HUD.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "// create():\nthis.score = 0;\nthis.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', color: '#fff' });\n\n// when you score:\nthis.score += 1;\nthis.scoreText.setText('Score: ' + this.score);",
        },
      ],
    },
    {
      id: 'basics/win-and-lose',
      pillar: 'basics',
      title: 'Winning and losing',
      tags: ['win', 'lose', 'game over', 'end', 'restart', 'goal'],
      blocks: [
        { kind: 'heading', text: 'Ending the game', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Every game needs a way to WIN and a way to LOSE — otherwise it never ends! Decide what winning means (reach 10 points, get to the door) and what losing means (run out of lives, fall off the screen).',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'When the win thing happens → show "You win!" and let them play again.',
            'When the lose thing happens → show "Game Over" and let them try again.',
          ],
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Check your win/lose condition in update() (or in a collision callback) and switch to a result scene. A separate GameOver scene keeps things tidy — pass data in, and start the main scene again to restart.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "// in update():\nif (this.score >= 10) this.scene.start('GameOver', { won: true, score: this.score });\nif (this.lives <= 0) this.scene.start('GameOver', { won: false, score: this.score });\n\n// in GameOver create(): press SPACE to retry\nthis.input.keyboard.once('keydown-SPACE', () => this.scene.start('Game'));",
        },
      ],
    },
    {
      id: 'basics/levels-and-difficulty',
      pillar: 'basics',
      title: 'Levels and making it harder',
      tags: ['level', 'difficulty', 'speed', 'harder', 'waves', 'spawn', 'timer'],
      blocks: [
        { kind: 'heading', text: 'Keep it exciting', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'A fun game gets a little harder as you go, so it never feels boring or impossible. Easy ways to do that: make things move faster over time, or add more enemies, or shrink the time you have.',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'Speed up: add a tiny bit to the enemy speed each time you score.',
            'More stuff: add a new enemy every few seconds.',
            'Levels: when the score hits a number, jump to a harder round.',
          ],
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Drive difficulty from a variable you ramp over time or score (e.g. this.speed += 5 on each point). Spawn waves with a repeating timer and clean up off-screen objects so the object count stays bounded. Store per-level config (spawn rate, speed) in an array and index it by level.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: '// spawn an enemy every second, faster each level\nthis.time.addEvent({\n  delay: 1000,\n  loop: true,\n  callback: () => {\n    const e = this.add.rectangle(800, Phaser.Math.Between(50, 550), 30, 30, 0xff5566);\n    this.physics.add.existing(e);\n    e.body.setVelocityX(-(150 + this.level * 40));\n    this.enemies.add(e);\n  },\n});',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // phaser/ — Phaser 4 specifics
    // ══════════════════════════════════════════════════════════════════════════
    {
      id: 'phaser/runtime-contract',
      pillar: 'phaser',
      title: 'How your code runs here',
      tags: [
        'import',
        'export',
        'module',
        'global',
        'main.js',
        'rules',
        'phaser',
        'mount',
        'game',
        'setup',
      ],
      blocks: [
        { kind: 'heading', text: 'The rules your game must follow', anchor: 'overview' },
        {
          kind: 'para',
          text: 'Your game runs a little differently from a normal web project. A few rules really matter — if you break them, the game will not start at all. They are easy once you know them.',
        },
        { kind: 'heading', text: 'No import or export', anchor: 'no-imports' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Do NOT write things like "import Phaser" and do NOT use "export". Phaser is already here for you as a word you can use directly: Phaser. Your scene classes are shared too — every file can see them. So just use them, with no import lines.',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'There is no module system in the sandbox — every file shares ONE global scope. So no import / export / require. `Phaser` is a global (window.Phaser), and your Scene classes are globals across files. Adding an import line throws and the game never boots.',
        },
        {
          kind: 'callout',
          text: 'Phaser is a global. Never import or export — it stops your game from running.',
        },
        { kind: 'heading', text: 'main.js runs last', anchor: 'entry-last' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Your scene files load first, and main.js runs LAST. That is where you actually start the game. Your game shows up inside the box on the page that is called "game".',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Files load in order with main.js injected last; it constructs new Phaser.Game(config). Mount into the element id "game" via parent:"game", set the scene list, and turn on Arcade physics if you need gravity/collisions. Build visuals from shapes unless an asset already exists under assets/.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: '// main.js (runs LAST)\nnew Phaser.Game({\n  type: Phaser.AUTO,\n  parent: \'game\',           // mount into <div id="game">\n  backgroundColor: \'#1a1a2e\',\n  physics: { default: \'arcade\', arcade: { gravity: { y: 0 } } },\n  scene: [Boot, Game, GameOver],\n});',
        },
      ],
    },
    {
      id: 'phaser/scenes',
      pillar: 'phaser',
      title: 'Phaser scenes',
      tags: ['scene', 'class', 'preload', 'create', 'update', 'extends', 'switch', 'start'],
      blocks: [
        { kind: 'heading', text: 'A scene is a class', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Each screen of your game is a "class" — a named box that holds that screen\'s stuff and its rules. You give it three jobs: get ready (preload), set up (create), and keep going (update).',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'A scene extends Phaser.Scene and registers a string key in its constructor (super("Game")). That key is how you start it. Lifecycle: init(data) → preload() → create(data) → update(time, delta). Use this.scene.start / launch / pause / resume / stop to manage screens; launch runs a scene IN PARALLEL (handy for a HUD overlay).',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "class Game extends Phaser.Scene {\n  constructor() { super('Game'); }\n  create(data) {\n    this.add.text(20, 20, 'Level ' + (data.level ?? 1));\n  }\n  update(time, delta) { /* per-frame logic */ }\n}\n// elsewhere: this.scene.start('Game', { level: 2 });",
        },
      ],
    },
    {
      id: 'phaser/arcade-physics',
      pillar: 'phaser',
      title: 'Arcade physics (gravity, jumping)',
      tags: [
        'physics',
        'gravity',
        'jump',
        'velocity',
        'fall',
        'bounce',
        'go up',
        'platformer',
        'collide',
      ],
      blocks: [
        { kind: 'heading', text: 'Make things fall and jump', anchor: 'gravity' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Arcade physics is the part of the engine that makes things move like in real life. Turn on gravity and your player will FALL down on its own. To jump, you give the player a quick push UPWARD — and remember, up means a smaller y, so a jump push is a negative number.',
        },
        {
          kind: 'diagram',
          diagram: 'gravity-and-jump',
          alt: 'A player on the ground with a down arrow labelled gravity (pulls it down) and an up arrow labelled jump (a negative-y push that sends it up).',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'Gravity pulls your player down toward the ground.',
            'A jump is a sudden push up (only when you are standing on something).',
            'Velocity is just "how fast and which way" something is moving.',
          ],
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Give a body gravity with setGravityY, and move it with setVelocityX / setVelocityY (negative y = up). For a platformer jump, only fire when the body is grounded (body.blocked.down or body.touching.down). Add a collider with the ground so the player lands. setBounce, setCollideWorldBounds and setDrag tune the feel.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: '// create(): gravity + ground collision\nthis.player.body.setGravityY(800);\nthis.physics.add.collider(this.player, this.ground);\n\n// update(): jump only when standing on something\nif (this.cursors.up.isDown && this.player.body.blocked.down) {\n  this.player.body.setVelocityY(-450);   // negative = up\n}',
        },
        {
          kind: 'callout',
          tier: 'pro',
          text: 'Set the world gravity once in the game config (arcade.gravity.y), or per-body with setGravityY for finer control.',
        },
      ],
    },
    {
      id: 'phaser/input',
      pillar: 'phaser',
      title: 'Keyboard and pointer input',
      tags: ['input', 'keyboard', 'keys', 'pointer', 'mouse', 'tap', 'click', 'space', 'wasd'],
      blocks: [
        { kind: 'heading', text: 'Reading keys and taps', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Your game can listen to the keyboard and the mouse. For arrow keys you check if a key "is down" every frame. For a click or tap, you tell the game "when someone clicks, do this".',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'Held keys (move while holding): check isDown every frame in update.',
            'One-shot keys (jump on press): listen for a keydown event.',
            'Clicks/taps: listen for pointerdown.',
          ],
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'createCursorKeys() gives arrows + space + shift; poll .isDown in update for held movement. For a single press use this.input.keyboard.on("keydown-SPACE", cb) or once(). Add custom keys with this.input.keyboard.addKey("W"). Pointer: this.input.on("pointerdown", p => p.worldX/worldY), or make an object clickable with setInteractive() + obj.on("pointerdown", cb).',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "this.cursors = this.input.keyboard.createCursorKeys();\nthis.keyW = this.input.keyboard.addKey('W');\nthis.input.keyboard.on('keydown-SPACE', () => this.shoot());\nthis.input.on('pointerdown', (p) => this.moveTo(p.worldX, p.worldY));",
        },
      ],
    },
    {
      id: 'phaser/loading-assets',
      pillar: 'phaser',
      title: 'Loading images and sounds',
      tags: ['assets', 'image', 'sound', 'audio', 'load', 'preload', 'key', 'sprite', 'music'],
      blocks: [
        { kind: 'heading', text: 'Add it, then load it by name', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'To use a picture or a sound, first add it to your project as an asset. Then "load" it in preload and give it a short nickname (a key). After that you use the nickname whenever you want that picture or sound.',
        },
        {
          kind: 'callout',
          tier: 'lite',
          text: 'No pictures yet? No problem — build everything from shapes (rectangles, circles, stars). They need no files at all.',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Queue loads in preload() with a key + path; the engine fetches them before create() runs. Only reference files that actually exist under assets/ (otherwise you get broken textures). Use this.load.image / spritesheet / audio, then refer to assets by key in add.image / physics.add.sprite / sound.add.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "// preload():\nthis.load.image('hero', 'assets/hero.png');\nthis.load.audio('coin', 'assets/coin.mp3');\n\n// create():\nthis.player = this.physics.add.sprite(100, 100, 'hero');\nthis.sound.add('coin');  // later: this.sound.play('coin');",
        },
      ],
    },
    {
      id: 'phaser/groups-and-many-objects',
      pillar: 'phaser',
      title: 'Many objects at once (groups)',
      tags: ['group', 'many', 'enemies', 'bullets', 'coins', 'spawn', 'pool'],
      blocks: [
        { kind: 'heading', text: 'When you have lots of the same thing', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'Some games have LOTS of the same thing — many coins, many enemies, many bullets. Instead of naming each one, you put them all in a "group". Then you can check the whole group for collisions at once, which is much easier.',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Create a group with this.add.group(), add shape-or-sprite members to it, and pass the group to physics.add.overlap/collider to test every member in one call. In this sandbox build members as shapes + physics.add.existing and group.add(obj) — do NOT use group.create(x,y,"key") with an asset key that does not exist. Destroy members when done to keep the count bounded.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: 'this.coins = this.add.group();\nfor (let i = 0; i < 8; i++) {\n  const c = this.add.circle(100 + i * 80, 200, 12, 0xffd43b);\n  this.physics.add.existing(c);\n  this.coins.add(c);\n}\nthis.physics.add.overlap(this.player, this.coins, (_p, c) => c.destroy());',
        },
      ],
    },
    {
      id: 'phaser/tweens-and-timers',
      pillar: 'phaser',
      title: 'Smooth motion and timers',
      tags: ['tween', 'timer', 'animation', 'move', 'delay', 'wait', 'repeat', 'ease', 'pulse'],
      blocks: [
        { kind: 'heading', text: 'Make things glide and wait', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'A tween is a smooth move — it slides a thing from here to there (or makes it grow, shrink, or fade) all by itself. A timer lets you wait a bit and then do something, or do something over and over.',
        },
        {
          kind: 'list',
          tier: 'lite',
          items: [
            'Tween: "float this cloud across the screen and back, forever".',
            'Timer: "every 2 seconds, drop a new star".',
          ],
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'this.tweens.add({ targets, ...props, duration, ease, yoyo, repeat }) animates any numeric property (x, y, scale, alpha, angle). this.time.addEvent({ delay, loop, callback }) repeats on an interval; this.time.delayedCall(ms, cb) runs once. Tweens and timers are frame-rate independent.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "this.tweens.add({ targets: this.coin, scale: 1.4, yoyo: true, repeat: -1, duration: 400, ease: 'Sine.easeInOut' });\nthis.time.addEvent({ delay: 2000, loop: true, callback: () => this.dropStar() });",
        },
      ],
    },
    {
      id: 'phaser/text-and-shapes',
      pillar: 'phaser',
      title: 'Text, shapes and colour',
      tags: [
        'text',
        'shapes',
        'rectangle',
        'circle',
        'star',
        'colour',
        'color',
        'font',
        'ui',
        'title',
      ],
      blocks: [
        { kind: 'heading', text: 'Build a look with no artwork', anchor: 'overview' },
        {
          kind: 'para',
          tier: 'lite',
          text: 'You can make a whole game look great using only shapes and text — no drawings needed. Rectangles, circles and stars in fun colours, plus big text for titles and the score. Pick colours you like and arrange them on the screen.',
        },
        {
          kind: 'para',
          tier: 'pro',
          text: 'Colours are hex numbers like 0xff7a66 (note 0x, not "#"). Shapes: add.rectangle/circle/star/triangle/line. Text: add.text(x, y, str, { fontFamily, fontSize, color }) — here color IS a "#rrggbb" string. setOrigin(0.5) centres a Game Object on its x/y; setDepth controls draw order; setAlpha fades.',
        },
        {
          kind: 'code',
          tier: 'pro',
          code: "this.add.star(400, 120, 5, 30, 60, 0xffd43b);\nthis.add.text(400, 220, 'SUPER GAME', {\n  fontFamily: 'Arial', fontSize: '48px', color: '#ffffff',\n}).setOrigin(0.5);",
        },
      ],
    },
  ],
};
