// The VERSIONED scripted-demo data file for `/try/playground` (try-demo-mode-prd
// §2 D-DEMO-04 / §3 v2). Each step is either:
//   - an `edit` step: a canned kid prompt + a canned VFS diff (find/replace pairs,
//     applied through the real `useProjectStore` mutation funnel by the scripted
//     agent), or
//   - an `explain` step: the exact code snippet the tour selects in the editor —
//     the scripted agent answers the REAL "✨ Explain this" prompt
//     (`buildExplainPrompt(snippet)`) with a canned plain-words explanation.
// Steps apply strictly in order, so each edit's `find` strings target the file
// state AFTER the previous step — `scriptedAgent.test.ts` asserts every anchor
// still applies. Step 3 lands a DELIBERATE bug (a call to an undefined method,
// thrown the moment the scene builds, so the runner console reliably shows a
// real error); step 4 is the fix turn that repairs it (§3 steps 8–9).
//
// ⚠️ Demo parity (D-DEMO-07): if the starter files or the real studio chat flow
// change, update this script (and bump `version`) in the same task.

import { DEMO_GAME_FILE } from './demoStarter.playground';

export interface DemoScriptEdit {
  /** Exact substring of the current file content to replace (must be unique). */
  find: string;
  replace: string;
}

export interface DemoEditStep {
  kind: 'edit';
  /** The canned kid prompt the tour's "Next" sends through the real chat. */
  prompt: string;
  /** Airo's canned reply (rendered by the real chat message UI). */
  reply: string;
  /** The VFS file this step edits. */
  path: string;
  edits: DemoScriptEdit[];
}

export interface DemoExplainStep {
  kind: 'explain';
  /** The exact snippet (as it reads in `path` when this step runs) the tour
   *  selects and hands to the REAL explain-this path. */
  snippet: string;
  /** Airo's canned plain-words explanation (no diff — explains never edit). */
  reply: string;
  path: string;
}

export type DemoScriptStep = DemoEditStep | DemoExplainStep;

export interface PlaygroundDemoScript {
  /** Bump on every script change (D-DEMO-04 — the script is versioned data). */
  version: number;
  /** D-DEMO-04: the locked, non-editable initial prompt. */
  lockedPrompt: string;
  steps: DemoScriptStep[];
}

/** The catchApple method as it reads AFTER step 2 (score +10) — the snippet the
 *  tour selects for the explain-this step. Kept verbatim with the file. */
const CATCH_APPLE_SNIPPET =
  'catchApple(apple) {\n' +
  '    if (!apple.active) return;\n' +
  '    apple.destroy();\n' +
  '    this.score += POINTS_PER_CATCH;\n' +
  '    this.scoreText.setText(String(this.score));\n' +
  '  }';

export const PLAYGROUND_DEMO_SCRIPT: PlaygroundDemoScript = {
  version: 2,
  lockedPrompt: 'Make a fruit-catcher game where I move a basket to catch falling apples',
  steps: [
    {
      kind: 'edit',
      prompt: 'Make the apples fall faster',
      reply:
        'Speedy! 💨 I changed FALL_SPEED from 150 to 260 — one small change, big ' +
        'difference. Feel how much harder it is now!',
      path: DEMO_GAME_FILE,
      edits: [{ find: 'const FALL_SPEED = 150;', replace: 'const FALL_SPEED = 260;' }],
    },
    {
      kind: 'edit',
      prompt: 'Add a score that goes up by 10 each catch',
      reply:
        'Done! 🏆 POINTS_PER_CATCH is now 10, so the score in the corner climbs ten ' +
        'at a time. Catch three apples and watch it jump!',
      path: DEMO_GAME_FILE,
      edits: [{ find: 'const POINTS_PER_CATCH = 1;', replace: 'const POINTS_PER_CATCH = 10;' }],
    },
    {
      kind: 'explain',
      snippet: CATCH_APPLE_SNIPPET,
      reply:
        'Happy to! 🍎 This little block runs every time an apple lands in the basket: ' +
        'first it checks the apple is still in the game, then it makes the apple ' +
        'disappear, adds points to your score, and repaints the number at the top of ' +
        'the screen. Small steps, big game!',
      path: DEMO_GAME_FILE,
    },
    {
      kind: 'edit',
      prompt: 'Show a big "You win!" when I reach 100 points',
      reply:
        'Victory time! 🎉 I added a WIN_SCORE of 100 and a banner that pops up the ' +
        'moment your score gets there. Go catch some apples!',
      path: DEMO_GAME_FILE,
      edits: [
        {
          find: 'class Game extends Phaser.Scene {',
          replace:
            'const WIN_SCORE = 100; // reach this score to win\n\n' +
            'class Game extends Phaser.Scene {',
        },
        // ⚠️ The DELIBERATE bug (§3 step 8): `makeWinBanner` doesn't exist yet, so
        // this throws a real TypeError the moment create() runs — the runner's
        // console catches it at the right file/line. Step 4 repairs it.
        {
          find: '    this.cursors = this.input.keyboard.createCursorKeys();\n  }',
          replace:
            '    this.cursors = this.input.keyboard.createCursorKeys();\n' +
            '    this.winBanner = this.makeWinBanner();\n  }',
        },
        {
          find:
            '    this.score += POINTS_PER_CATCH;\n' +
            '    this.scoreText.setText(String(this.score));',
          replace:
            '    this.score += POINTS_PER_CATCH;\n' +
            '    this.scoreText.setText(String(this.score));\n' +
            '    if (this.score >= WIN_SCORE) this.winBanner.setVisible(true);',
        },
      ],
    },
    {
      kind: 'edit',
      prompt: 'The game stopped and the console shows an error. Can you fix it?',
      reply:
        'Found it! 🔧 I asked for makeWinBanner() but never wrote that function — ' +
        'even pros do this. I added it: the banner now starts hidden and shows the ' +
        'moment you reach 100. Back to catching!',
      path: DEMO_GAME_FILE,
      edits: [
        {
          find: '  catchApple(apple) {',
          replace:
            '  makeWinBanner() {\n' +
            "    return this.add.text(W / 2, H / 2, 'You win! 🏆', {\n" +
            "      fontFamily: 'monospace', fontSize: '56px', color: '#fde047',\n" +
            '    }).setOrigin(0.5).setVisible(false);\n' +
            '  }\n\n' +
            '  catchApple(apple) {',
        },
      ],
    },
  ],
};

/**
 * Find the 1-based inclusive line range of `needle` inside `content` (the demo
 * uses it to point the editor's real jump/highlight path at a diff or snippet).
 */
export function locateLines(
  content: string,
  needle: string,
): { from: number; to: number } | null {
  const at = content.indexOf(needle);
  if (at === -1) return null;
  const from = content.slice(0, at).split('\n').length;
  return { from, to: from + needle.split('\n').length - 1 };
}

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
