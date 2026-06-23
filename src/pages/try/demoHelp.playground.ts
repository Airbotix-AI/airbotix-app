// The bundled Game Guide corpus for `/try/playground` (try-demo-mode-prd §3).
// The REAL `HelpPane` renders + searches it through its normal path
// (`loadHelpCorpus` → the demo seam in `panes/help/helpApi.ts`) — same shape as
// `GET /help/docs`, just shipped client-side so the demo stays offline.
//
// ⚠️ VERBATIM COPY of the single source of truth in
// `platform-backend/src/help/help-content.ts` (D-HELP-02). Do NOT hand-edit — it is
// generated from that file; the drift alarm in `demoHelp.playground.test.ts` fails
// if it diverges. To refresh: re-run the backend generator and commit the result.

import type { HelpCorpus } from '../learn/playground/panes/help/helpTypes';

/** The doc the tour's Guide step opens — the most diagram-rich page. */
export const DEMO_GUIDE_TOUR_DOC = 'motion/game-loop';

export const DEMO_HELP_CORPUS: HelpCorpus = {
  "pillars": [
    {
      "id": "start",
      "title": "Start here",
      "blurb": "What a game is and how yours runs.",
      "order": 1
    },
    {
      "id": "world",
      "title": "The world & objects",
      "blurb": "Space, things, the camera, style.",
      "order": 2
    },
    {
      "id": "motion",
      "title": "Making it move",
      "blurb": "The loop, input, movement, animation.",
      "order": 3
    },
    {
      "id": "rules",
      "title": "Rules & play",
      "blurb": "Collisions, score, winning, levels.",
      "order": 4
    },
    {
      "id": "polish",
      "title": "Polish & share",
      "blurb": "Juice, speed, sharing your game.",
      "order": 5
    }
  ],
  "docs": [
    {
      "id": "start/what-is-a-game",
      "pillar": "start",
      "order": 1,
      "title": "What a game is",
      "tags": [
        "game",
        "loop",
        "start",
        "begin",
        "basics",
        "what is",
        "player",
        "overview"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Every game is a loop",
          "anchor": "loop"
        },
        {
          "kind": "diagram",
          "diagram": "game-loop",
          "alt": "A loop: read the input, update the world, draw the picture — over and over, many times a second."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "A game does three things again and again, super fast: it LOOKS at what you press, it CHANGES the world a tiny bit, then it DRAWS the new picture. Do that ~60 times a second and things look like they move!"
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "A game is a loop running ~60 times/second: read input → update state (positions, score, timers) → render a frame. Each pass is one \"frame\"; smooth motion is just many small changes drawn quickly. Everything else you learn here hangs off this loop."
        },
        {
          "kind": "para",
          "text": "A game also has THINGS in it (a player, enemies, coins) and RULES (what happens when they touch). That is the whole idea — things in a world, changed by a loop, following rules."
        },
        {
          "kind": "callout",
          "text": "Input → Update → Draw, over and over. That loop is the heart of every game — 2D or 3D."
        }
      ]
    },
    {
      "id": "start/2d-vs-3d",
      "pillar": "start",
      "order": 2,
      "title": "2D, 3D, and our tools",
      "tags": [
        "2d",
        "3d",
        "phaser",
        "three",
        "threejs",
        "engine",
        "choose",
        "flat",
        "depth",
        "difference"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Flat vs deep",
          "anchor": "flat-vs-deep"
        },
        {
          "kind": "diagram",
          "diagram": "sprite-vs-mesh",
          "alt": "The same character as a flat 2D sprite and as a 3D mesh you can turn around."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "2D games are FLAT — like a cartoon. Things have a left/right and an up/down. 3D games have DEPTH too — you can go closer and further away, and turn things around to see the other side."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "2D works in two directions (x, y) and draws flat pictures; 3D adds a third (z) for depth, places shapes in a real space, and a camera looks into it. Same concepts (loop, objects, input, rules) — just an extra dimension and a camera you aim."
        },
        {
          "kind": "heading",
          "text": "The tools your studio uses",
          "anchor": "tools"
        },
        {
          "kind": "para",
          "text": "Your studio builds 2D games with Phaser 4 and 3D games with three.js. You do not install them — they are already loaded and ready. This Guide teaches the idea first, then shows the Phaser 4 way and the three.js way side by side."
        },
        {
          "kind": "list",
          "items": [
            "Pick 2D (Phaser 4) for platformers, top-down, puzzle, arcade — quick to make, easy to read.",
            "Pick 3D (three.js) for worlds you move through, fly around, or look at from any angle."
          ]
        }
      ]
    },
    {
      "id": "start/what-an-engine-does",
      "pillar": "start",
      "order": 3,
      "title": "What a game engine does",
      "tags": [
        "engine",
        "library",
        "framework",
        "render",
        "physics",
        "what is",
        "runtime",
        "tools"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "The engine does the hard parts",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "engine-parts",
          "alt": "A game engine bundles the render loop, drawing, input, physics, sound and asset loading so you just describe your game."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "An engine is a big helper. It runs the loop, draws your shapes, listens to the keyboard, checks when things bump, and plays sounds — so YOU just say what your game is, not how every little thing works."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "A game engine is a runtime + library handling the cross-cutting work every game needs: the frame loop, a render pipeline, input, collision/physics, audio, asset loading and timing. You describe objects + rules; it does the plumbing. Phaser 4 is a 2D engine; three.js is a 3D render engine."
        }
      ]
    },
    {
      "id": "start/how-it-runs",
      "pillar": "start",
      "order": 4,
      "title": "How your game runs here",
      "tags": [
        "import",
        "export",
        "module",
        "global",
        "main.js",
        "rules",
        "mount",
        "game",
        "setup",
        "sandbox",
        "phaser",
        "three"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "The rules your game must follow",
          "anchor": "overview"
        },
        {
          "kind": "para",
          "text": "Your game runs in a safe box (a sandbox) right on the page. A few rules really matter — break them and the game will not start at all. They are the same idea for 2D and 3D."
        },
        {
          "kind": "heading",
          "text": "No import or export",
          "anchor": "no-imports"
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Do NOT write \"import\" and do NOT write \"export\". The engine is already here as a word you can use: Phaser for 2D, THREE for 3D. Every file shares everything — just use it, no import lines."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "There is no module system in the sandbox — every file shares ONE global scope. So no import / export / require. The engine is a GLOBAL: `Phaser` (window.Phaser) in 2D, `THREE` (window.THREE) in 3D. Adding an import line throws and the game never boots."
        },
        {
          "kind": "callout",
          "text": "The engine is a global (Phaser / THREE). Never import or export — it stops your game from running."
        },
        {
          "kind": "heading",
          "text": "main.js runs last",
          "anchor": "entry-last"
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Your other files load first; main.js runs LAST and starts the game. Your game shows up inside the box on the page called \"game\"."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): main.js builds `new Phaser.Game({ parent: \"game\", scene: [...] })`; mount into the #game element and turn on Arcade physics if you need gravity/collisions."
        },
        {
          "kind": "code",
          "tier": "pro",
          "code": "// main.js (runs LAST) — 2D / Phaser 4\nnew Phaser.Game({\n  type: Phaser.AUTO,\n  parent: 'game',                 // mount into <div id=\"game\">\n  physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },\n  scene: [Boot, Game, GameOver],\n});"
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): make a Scene, a Camera and a WebGLRenderer (with preserveDrawingBuffer:true so the studio can snapshot it), append `renderer.domElement` to #game, run your own requestAnimationFrame loop, and publish `window.__game = { renderer, pause, resume }` so the studio can pause/snapshot it."
        },
        {
          "kind": "code",
          "tier": "pro",
          "code": "// main.js (runs LAST) — 3D / three.js\nconst mount = document.getElementById('game');\nconst scene = new THREE.Scene();\nconst camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100);\ncamera.position.set(3, 3, 5);\nconst renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });\nrenderer.setSize(mount.clientWidth, mount.clientHeight);\nmount.appendChild(renderer.domElement);\nlet running = true, id = 0;\nfunction loop() { id = requestAnimationFrame(loop); renderer.render(scene, camera); }\nloop();\nwindow.__game = { renderer, pause: () => { running = false; cancelAnimationFrame(id); }, resume: () => { if (!running) { running = true; loop(); } } };"
        }
      ]
    },
    {
      "id": "world/coordinates",
      "pillar": "world",
      "section": "Space",
      "order": 1,
      "title": "Coordinates & space",
      "tags": [
        "coordinates",
        "xy",
        "xyz",
        "position",
        "x",
        "y",
        "z",
        "space",
        "place",
        "where",
        "axis"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Every spot has numbers",
          "anchor": "xy"
        },
        {
          "kind": "diagram",
          "diagram": "coords-explorer",
          "alt": "Drag a point to read its position: x and y in 2D, plus z for depth in 3D."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "To put something somewhere, you give it numbers. In 2D you give x (left↔right) and y (up↔down). In 3D you add z (near↔far) — how close it is to you."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "A position is a set of numbers. 2D = (x, y); 3D = (x, y, z). Heads-up: in 2D screen space y usually grows DOWNWARD, while in 3D y grows UPWARD and z is depth. Drag the point above to feel it."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): place at `this.add.sprite(x, y, key)`; read/move with `obj.x` / `obj.y`."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): place with `mesh.position.set(x, y, z)`; read/move `mesh.position.x/y/z`."
        }
      ]
    },
    {
      "id": "world/objects",
      "pillar": "world",
      "section": "Objects",
      "order": 2,
      "title": "Objects: sprites & meshes",
      "tags": [
        "object",
        "sprite",
        "mesh",
        "guy",
        "player",
        "thing",
        "shape",
        "character",
        "add",
        "create"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Things you put in the world",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "sprite-vs-mesh",
          "alt": "A 2D sprite is a flat picture; a 3D mesh is a shape made of a geometry plus a material."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Everything in your game — your guy, a coin, a wall — is an OBJECT you place in the world. In 2D an object is a flat picture or shape (a \"sprite\"). In 3D it is a real shape you can turn around (a \"mesh\")."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "An object has a position, a size and a look. In 2D it is a sprite/shape; in 3D a mesh = a geometry (the shape) + a material (the surface). You add it to the world, then move/scale/rotate it each frame."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `const player = this.add.rectangle(x, y, 40, 40, 0x6ee7b7)` (or `this.add.sprite(x, y, \"hero\")`)."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): `const player = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: 0x6ee7b7 })); scene.add(player)`."
        }
      ]
    },
    {
      "id": "world/camera",
      "pillar": "world",
      "section": "Seeing",
      "order": 3,
      "title": "The camera",
      "tags": [
        "camera",
        "view",
        "see",
        "follow",
        "scroll",
        "orbit",
        "zoom",
        "look"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "What the player sees",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "camera-view",
          "alt": "The camera is the window into your world: in 2D it pans across the scene; in 3D it can orbit around things."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "The camera is your window into the game. It does not change the world — it changes what part of the world you SEE. Move the camera to follow your player, or to look at things from a new spot."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "The camera decides the view. 2D: it pans/zooms across a flat scene and can follow a target. 3D: it sits at a position and looks at a point, so moving it orbits/zooms around your objects."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `this.cameras.main.startFollow(player)` to track the hero; `.setZoom(2)` to zoom."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): `camera.position.set(x,y,z); camera.lookAt(target)`. Drag-to-orbit comes free from `new THREE.OrbitControls(camera, renderer.domElement)`."
        }
      ]
    },
    {
      "id": "world/look-and-style",
      "pillar": "world",
      "section": "Style",
      "order": 4,
      "title": "Look & style",
      "tags": [
        "style",
        "colour",
        "color",
        "material",
        "light",
        "texture",
        "look",
        "shape",
        "paint"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Making it look good",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "materials-lights",
          "alt": "In 2D you pick shapes and colours; in 3D a material plus lights decide how a surface looks."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Give your game a style with colour and shape. In 2D you pick colours and draw shapes. In 3D you also need LIGHTS — without a light, 3D shapes look black!"
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Look = colour + shape (+ in 3D, light). 2D: choose shapes and hex colours, or load a picture. 3D: a material sets the surface, and lights make it visible — a sun-like DirectionalLight plus a soft AmbientLight is a good default."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `this.add.star(x, y, 5, 12, 26, 0xffd43b)`; tint a sprite with `.setTint(0xff7a66)`."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): `scene.add(new THREE.DirectionalLight(0xffffff, 2)); scene.add(new THREE.AmbientLight(0x8899ff, 0.6))` so MeshStandardMaterial shows up."
        }
      ]
    },
    {
      "id": "motion/game-loop",
      "pillar": "motion",
      "order": 1,
      "title": "The loop & time",
      "tags": [
        "loop",
        "update",
        "frame",
        "time",
        "delta",
        "fps",
        "tick",
        "per frame",
        "speed"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "One step per frame",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "game-loop-stepper",
          "alt": "Press Step to advance one frame: read input, update the world, draw — the cycle that makes a game."
        },
        {
          "kind": "diagram",
          "diagram": "game-loop",
          "alt": "The loop again, at a glance: input then update then draw, repeating about sixty times a second.",
          "tier": "lite"
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Your update code runs once every frame — about 60 times a second. Each time, move things a tiny bit. Many tiny moves look like smooth motion. Press Step in the picture to watch one frame happen."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Per-frame code runs ~60×/sec, but slower devices skip frames — so multiply movement by delta (time since the last frame) to move at the same SPEED everywhere, not the same amount per frame."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `update(time, delta) { this.player.x += 0.2 * delta; }` (delta in ms)."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): compute your own delta from the rAF timestamp: `function loop(now){ const dt=(now-last)/1000; last=now; cube.rotation.y += dt; renderer.render(scene,camera); requestAnimationFrame(loop); }`."
        }
      ]
    },
    {
      "id": "motion/input",
      "pillar": "motion",
      "order": 2,
      "title": "Input: keys & pointer",
      "tags": [
        "input",
        "keyboard",
        "keys",
        "arrow",
        "mouse",
        "pointer",
        "touch",
        "press",
        "control"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Reading the player",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "input-keys",
          "alt": "Each frame you check which keys are held and where the pointer is, then act on it."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "To control the game you check the keyboard and the mouse/finger every frame: \"is the left arrow held down? then move left.\" Same idea in 2D and 3D."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Input is state you sample each frame (held keys, pointer position) plus one-shot events (key pressed, clicked). Read it in update and turn it into movement."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `this.cursors = this.input.keyboard.createCursorKeys()` then `if (this.cursors.left.isDown) ...`; pointer via `this.input.activePointer`."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): `const keys = {}; addEventListener(\"keydown\", e => keys[e.key]=true); addEventListener(\"keyup\", e => keys[e.key]=false)` then `if (keys.ArrowLeft) ...`."
        }
      ]
    },
    {
      "id": "motion/movement",
      "pillar": "motion",
      "order": 3,
      "title": "Movement",
      "tags": [
        "move",
        "movement",
        "velocity",
        "speed",
        "position",
        "walk",
        "run",
        "fly"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Position vs velocity",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "velocity",
          "alt": "Velocity is a direction and speed; each frame it nudges the position."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Two ways to move a thing: set where it IS (its position), or give it a SPEED so it keeps drifting on its own each frame. Speed is great for balls, bullets and anything that flies."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Position is where it is now; velocity is how fast + which way it moves each frame. Set position for instant placement; set velocity for continuous motion (then the engine, or your loop, adds it every frame)."
        },
        {
          "kind": "code",
          "tier": "pro",
          "code": "// 2D / Phaser 4 — give it a body, then a velocity\nthis.physics.add.existing(ball);\nball.body.setVelocityX(200); // drifts right on its own"
        },
        {
          "kind": "code",
          "tier": "pro",
          "code": "// 3D / three.js — keep a velocity, add it each frame\nball.userData.vx = 0.05;\n// in the loop:\nball.position.x += ball.userData.vx;"
        }
      ]
    },
    {
      "id": "motion/animation",
      "pillar": "motion",
      "order": 4,
      "title": "Animation & tweens",
      "tags": [
        "animation",
        "animate",
        "tween",
        "spin",
        "grow",
        "fade",
        "smooth",
        "ease",
        "move to"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Smooth, automatic motion",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "tween-curve",
          "alt": "A tween smoothly changes a value from start to end over time, with easing for a natural feel."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "A tween is an easy way to make something move, grow, spin or fade SMOOTHLY all by itself — you say \"go from here to there over half a second\" and it does the in-between."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "A tween animates a property from A to B over a duration with an easing curve (so it speeds up/slows down naturally). Great for pop-ins, pulses and moving between spots without hand-coding each frame."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `this.tweens.add({ targets: coin, scale: 1.4, yoyo: true, repeat: -1, duration: 400 })`."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): tween by hand in the loop (`mesh.rotation.y += dt`) or animate values yourself; no built-in tweener, so step the property toward its target each frame."
        }
      ]
    },
    {
      "id": "rules/collisions",
      "pillar": "rules",
      "order": 1,
      "title": "Collisions & overlap",
      "tags": [
        "collision",
        "collide",
        "overlap",
        "touch",
        "hit",
        "bump",
        "catch",
        "pickup",
        "sparkle"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "When two things touch",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "collision-overlap",
          "alt": "Drag two shapes together and they sparkle when they overlap — that overlap is how the game knows you caught the coin."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Lots of game rules are really \"did these two things touch?\" Touch a coin → collect it. Touch a spike → lose. The game checks for overlap, then does something. Drag the shapes together to see it."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Collision = detecting that two objects intersect, then reacting. 2D engines do it for you with colliders/overlap callbacks; in 3D you often check it yourself with distances or bounding boxes."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `this.physics.add.overlap(player, coins, (p, c) => c.destroy())` — fires when they touch."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): `if (player.position.distanceTo(coin.position) < 0.8) coin.visible = false` — or use `new THREE.Box3().setFromObject(a).intersectsBox(boxB)`."
        }
      ]
    },
    {
      "id": "rules/physics-and-gravity",
      "pillar": "rules",
      "order": 2,
      "title": "Gravity & jumping",
      "tags": [
        "gravity",
        "jump",
        "fall",
        "physics",
        "bounce",
        "platformer",
        "velocity",
        "ground"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Pulling things down",
          "anchor": "gravity"
        },
        {
          "kind": "diagram",
          "diagram": "gravity-jump",
          "alt": "Gravity pulls down every frame; a jump gives a quick push up, then gravity wins and you arc back down."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Gravity pulls things DOWN a little every frame. A jump is a quick push UP — then gravity slows it, stops it, and pulls it back down. That up-then-down curve is the jump arc!"
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Gravity adds downward velocity each frame; a jump sets a one-time upward velocity (only when on the ground). Gravity then decelerates and reverses it — the classic arc. Tune gravity + jump strength to get the feel."
        },
        {
          "kind": "code",
          "tier": "pro",
          "code": "// 2D / Phaser 4 — Arcade gravity + jump\n// config: physics: { default:'arcade', arcade:{ gravity:{ y: 800 } } }\nif (cursors.up.isDown && player.body.blocked.down) player.body.setVelocityY(-450);"
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): no built-in gravity — keep a vy: `vy -= 9.8 * dt; player.position.y += vy * dt;` and zero it when you land (a jump sets vy to a positive push)."
        }
      ]
    },
    {
      "id": "rules/score-and-state",
      "pillar": "rules",
      "order": 3,
      "title": "Score, lives & state",
      "tags": [
        "score",
        "points",
        "lives",
        "state",
        "variable",
        "counter",
        "health",
        "remember",
        "hud"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Remembering numbers",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "hud-score",
          "alt": "Keep numbers like score and lives in variables, then show them on screen and update the text when they change."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Your game remembers things in variables — like score and lives. When something happens (you grab a coin), change the number, then update the words on screen so the player sees it."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Game state is just variables you keep and read: score, lives, level, \"is the game over\". Change them on events; reflect them in on-screen text (the HUD). Keep state in one place so rules stay simple."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `this.score = 0; this.label = this.add.text(10,10,\"0\")` then `this.label.setText(this.score)`."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): keep `let score = 0` and show it in an HTML overlay or a canvas-texture label; `console.log(score)` while you build."
        }
      ]
    },
    {
      "id": "rules/win-and-lose",
      "pillar": "rules",
      "order": 4,
      "title": "Winning & losing",
      "tags": [
        "win",
        "lose",
        "game over",
        "end",
        "goal",
        "victory",
        "restart",
        "condition"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "How a game ends",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "win-lose",
          "alt": "Each frame, check the win condition and the lose condition; when one is true, end the round."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "A game needs a way to WIN (reach the goal, get 10 points) and a way to LOSE (run out of lives, fall off). Each frame, check: did I win? did I lose? If yes, show a message and let the player try again."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Win/lose are just conditions you test each frame against your state (score ≥ target, lives ≤ 0). When one fires, stop play and switch to an end state — then offer a restart."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): switch screens with `this.scene.start(\"GameOver\", { score })`."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): set a `gameOver = true` flag your loop checks (skip updates, show an overlay), and rebuild to restart."
        }
      ]
    },
    {
      "id": "rules/levels",
      "pillar": "rules",
      "order": 5,
      "title": "Levels & difficulty",
      "tags": [
        "level",
        "levels",
        "difficulty",
        "harder",
        "waves",
        "spawn",
        "progress",
        "stage"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Making it harder",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "levels",
          "alt": "As the level number rises, dial up speed, spawn rate or count to keep it challenging."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Games get fun when they get harder slowly. Keep a \"level\" number and use it to speed enemies up or add more of them as the player does well."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Difficulty is a number (level/time/score) you feed into your spawn and speed values. Raise it on a timer or milestone; tie enemy speed, spawn rate and count to it for a smooth ramp."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Same in 2D and 3D: `const speed = 150 + level * 40;` and spawn on a timer (`this.time.addEvent` in Phaser, or a time check in your three.js loop)."
        }
      ]
    },
    {
      "id": "polish/juice",
      "pillar": "polish",
      "order": 1,
      "title": "Juice: making it feel great",
      "tags": [
        "juice",
        "feel",
        "sound",
        "shake",
        "particle",
        "feedback",
        "pop",
        "effect",
        "polish"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Small touches, big feel",
          "anchor": "overview"
        },
        {
          "kind": "diagram",
          "diagram": "juice",
          "alt": "On a hit: a quick scale pop, a screen shake and a sound make the moment feel great."
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "\"Juice\" is the little extras that make a game feel alive: a pop when you grab a coin, a tiny screen shake on a hit, a sound. They are easy to add and make a huge difference."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Juice = immediate feedback on events: scale pops/flashes, camera shake, sound, particles. Add it on the same line you change state (collect, hit, win) — small, cheap, and it sells the moment."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `this.cameras.main.shake(120)`, a scale tween, and `this.sound.add(\"pop\").play()`."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): nudge the camera a few frames for a shake, scale the mesh up then back, and play an HTML `<audio>` for the sound."
        }
      ]
    },
    {
      "id": "polish/performance",
      "pillar": "polish",
      "order": 2,
      "title": "Keeping it smooth",
      "tags": [
        "performance",
        "fps",
        "slow",
        "lag",
        "smooth",
        "speed",
        "optimise",
        "cleanup",
        "destroy"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Why games slow down",
          "anchor": "overview"
        },
        {
          "kind": "para",
          "tier": "lite",
          "text": "Games slow down when there is too much to draw or too many things alive. The fix is tidy-up: remove things that flew off screen, and do not make new things every single frame."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "Frame budget is ~16ms. Watch for: unbounded object counts, work every frame that could be cached, and never cleaning up. Destroy/recycle off-screen objects; reuse instead of recreating; move heavy setup out of update."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 2D (Phaser 4): `obj.destroy()` off-screen objects; reuse a group/pool instead of creating new ones each frame."
        },
        {
          "kind": "para",
          "tier": "pro",
          "text": "In 3D (three.js): `scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose()` to free what you no longer show."
        }
      ]
    },
    {
      "id": "polish/sharing",
      "pillar": "polish",
      "order": 3,
      "title": "Sharing your game",
      "tags": [
        "share",
        "play",
        "publish",
        "link",
        "class",
        "show",
        "wall"
      ],
      "blocks": [
        {
          "kind": "heading",
          "text": "Let people play it",
          "anchor": "overview"
        },
        {
          "kind": "para",
          "text": "When your game runs the way you want, you can share it so others can play — on your class wall, or with a safe play-link a grown-up approves. Sharing freezes a copy, so you can keep editing without changing what people are playing."
        },
        {
          "kind": "callout",
          "text": "Tip: give your game a clear title and make the very first thing the player does obvious — a good first 10 seconds is what makes people want to play more."
        }
      ]
    }
  ]
};
