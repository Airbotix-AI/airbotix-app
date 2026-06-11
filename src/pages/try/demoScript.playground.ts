// The VERSIONED scripted-demo data file for `/try/playground` (try-demo-mode-prd
// §2 D-DEMO-04 / §3). Each step = a canned kid prompt + a canned VFS diff
// (find/replace pairs against `demoStarter.playground.ts`, applied through the
// real `useProjectStore` mutation funnel by the scripted agent) + the overlay
// card copy (addressed to the ADULT evaluator, D-DEMO-05). Steps apply strictly
// in order, so each step's `find` strings target the file state AFTER the
// previous step — `scriptedAgent.test.ts` asserts every edit still applies.
//
// ⚠️ Demo parity (D-DEMO-07): if the starter files or the real studio chat flow
// change, update this script (and bump `version`) in the same task.

import { DEMO_GAME_FILE } from './demoStarter.playground';

export interface DemoScriptEdit {
  /** Exact substring of the current file content to replace (must be unique). */
  find: string;
  replace: string;
}

export interface DemoScriptStep {
  /** The canned kid prompt the tour's "Next" sends through the real chat. */
  prompt: string;
  /** Airo's canned reply (rendered by the real chat message UI). */
  reply: string;
  /** The VFS file this step edits. */
  path: string;
  edits: DemoScriptEdit[];
}

export interface PlaygroundDemoScript {
  /** Bump on every script change (D-DEMO-04 — the script is versioned data). */
  version: number;
  /** D-DEMO-04: the locked, non-editable initial prompt. */
  lockedPrompt: string;
  steps: DemoScriptStep[];
}

export const PLAYGROUND_DEMO_SCRIPT: PlaygroundDemoScript = {
  version: 1,
  lockedPrompt: 'Make a fruit-catcher game where I move a basket to catch falling apples',
  steps: [
    {
      prompt: 'Make the apples fall faster',
      reply:
        'Speedy! 💨 I changed FALL_SPEED from 150 to 260 — one small change, big ' +
        'difference. Run it and feel how much harder it is!',
      path: DEMO_GAME_FILE,
      edits: [{ find: 'const FALL_SPEED = 150;', replace: 'const FALL_SPEED = 260;' }],
    },
    {
      prompt: 'Add a score that goes up by 10 each catch',
      reply:
        'Done! 🏆 POINTS_PER_CATCH is now 10, so the score in the corner climbs ten ' +
        'at a time. Catch three apples and watch it jump!',
      path: DEMO_GAME_FILE,
      edits: [{ find: 'const POINTS_PER_CATCH = 1;', replace: 'const POINTS_PER_CATCH = 10;' }],
    },
    {
      prompt: 'Make the basket bigger and show "You win!" at 100',
      reply:
        'Champion mode! 🎉 Bigger basket, and when the score reaches 100 the game ' +
        'celebrates with a big "You win!". You just finished your first game — high five! ✋',
      path: DEMO_GAME_FILE,
      edits: [
        { find: 'const BASKET_WIDTH = 110;', replace: 'const BASKET_WIDTH = 160;' },
        {
          find: 'class Game extends Phaser.Scene {',
          replace:
            'const WIN_SCORE = 100; // show "You win!" when the score reaches this\n\n' +
            'class Game extends Phaser.Scene {',
        },
        { find: 'this.score = 0;', replace: 'this.score = 0;\n    this.won = false;' },
        {
          find:
            '    this.score += POINTS_PER_CATCH;\n' +
            '    this.scoreText.setText(String(this.score));',
          replace:
            '    this.score += POINTS_PER_CATCH;\n' +
            '    this.scoreText.setText(String(this.score));\n' +
            '    if (this.score >= WIN_SCORE && !this.won) {\n' +
            '      this.won = true;\n' +
            "      this.add.text(W / 2, H / 2, 'You win!', {\n" +
            "        fontFamily: 'monospace', fontSize: '56px', color: '#fde047',\n" +
            '      }).setOrigin(0.5);\n' +
            '    }',
        },
      ],
    },
  ],
};

/**
 * The AI contact-us gate reply (D-DEMO-06): any prompt OUTSIDE the script (and
 * everything once the script completes) gets this instead of a turn. Rendered by
 * the real chat message UI; no network, no diff, no fake ability.
 */
export const CONTACT_GATE_MESSAGE =
  "That's the real Airo's job! 🤖 In this demo I follow a fixed script, so I can't " +
  'build new ideas here. With a real account your child chats with the real Airo ' +
  'about their own ideas — safely, with you in control.\n\n' +
  'Book a chat: airbotix.ai/book · Ask a question: airbotix.ai/contact\n\n' +
  'Everything else is still live — edit the code, run the game, undo.';
