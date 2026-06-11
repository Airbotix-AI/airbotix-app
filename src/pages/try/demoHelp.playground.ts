// The bundled Game Guide corpus for `/try/playground` (try-demo-mode-prd §3
// step 10). The REAL `HelpPane` renders + searches it through its normal path
// (`loadHelpCorpus` → the demo seam in `panes/help/helpApi.ts`) — same shape as
// `GET /help/docs`, just shipped client-side so the demo stays offline. A small,
// honest sample of the real guide: one doc per pillar, tier-tagged blocks so the
// Simple/More toggle works. The default doc id (`engine/what-is-an-engine`)
// MUST exist — it's what the pane opens first.

import type { HelpCorpus } from '../learn/playground/panes/help/helpTypes';

export const DEMO_HELP_CORPUS: HelpCorpus = {
  pillars: [
    { id: 'engine', title: 'The Engine', blurb: 'What runs your game' },
    { id: 'basics', title: 'Game Basics', blurb: 'Scores, winning, moving' },
    { id: 'phaser', title: 'Phaser How-To', blurb: 'Recipes for your code' },
  ],
  docs: [
    {
      id: 'engine/what-is-an-engine',
      pillar: 'engine',
      title: 'What is a game engine?',
      tags: ['engine', 'phaser', 'loop'],
      blocks: [
        { kind: 'heading', text: 'The engine does the heavy lifting', anchor: 'heavy-lifting' },
        {
          kind: 'para',
          text:
            'A game engine is the helper that draws your game, moves things, and ' +
            'listens for taps and keys — many times every second. Your code tells ' +
            'it WHAT to do; the engine does it fast.',
          tier: 'lite',
        },
        {
          kind: 'para',
          text:
            'Your game uses the Phaser engine. Phaser runs a loop: update the world, ' +
            'draw a frame, repeat about 60 times a second. Your scene code plugs into ' +
            'that loop with create() (run once) and update() (run every frame).',
          tier: 'pro',
        },
        {
          kind: 'callout',
          text: 'You never have to redraw anything yourself — change a thing, and the next frame shows it.',
        },
      ],
    },
    {
      id: 'basics/keeping-score',
      pillar: 'basics',
      title: 'Keeping score (and winning)',
      tags: ['score', 'win', 'points', 'text'],
      blocks: [
        { kind: 'heading', text: 'A score is just a number', anchor: 'score-number' },
        {
          kind: 'para',
          text:
            'Keep the score in a variable, add points when something good happens, ' +
            'and show it with a text object so the player can see it.',
        },
        {
          kind: 'code',
          code:
            'this.score += POINTS_PER_CATCH;\n' +
            "this.scoreText.setText(String(this.score));",
        },
        {
          kind: 'para',
          text: 'To win, check the score after it changes — if it crossed your goal, celebrate!',
          tier: 'lite',
        },
        {
          kind: 'para',
          text:
            'Compare against a named constant (like WIN_SCORE) right after the score ' +
            'changes, and guard so the win only fires once.',
          tier: 'pro',
        },
      ],
    },
    {
      id: 'phaser/moving-things',
      pillar: 'phaser',
      title: 'Moving things around',
      tags: ['move', 'velocity', 'speed', 'jump', 'physics'],
      blocks: [
        { kind: 'heading', text: 'Velocity = speed with a direction', anchor: 'velocity' },
        {
          kind: 'para',
          text:
            'Give a thing a physics body, then set its velocity: how many pixels it ' +
            'moves each second, sideways (x) and down (y).',
        },
        { kind: 'code', code: "this.physics.add.existing(apple);\napple.body.setVelocity(0, FALL_SPEED);" },
        {
          kind: 'callout',
          text: 'Bigger number = faster. Try changing a speed constant and feel the difference!',
        },
      ],
    },
  ],
};
