// Opening-state chat seeds for the playground workspace (launch hand-off,
// first-turn replay, safety-refused explanation — PRD J2/J9, D-PAP-20).
// Extracted from `useGameAgent`, which re-exports `FirstTurnSeed`.

import type { FileNote, NextStep } from '../../code/codeApi';
import type { ChatItem } from './useGameAgent';

const STARTER_MESSAGE =
  'Your game starter is ready to play 🎮\n\n' +
  'I put together a runnable starter for your idea — it already works out of the ' +
  'box. Take it for a spin now, or open the code whenever you want to start ' +
  'changing things.';

/** The launch hand-off: kid prompt + a generic "starter ready" with Run/See-code. */
export function buildIntro(prompt: string | undefined): ChatItem[] {
  const items: ChatItem[] = [];
  const p = prompt?.trim();
  if (p) items.push({ id: 'intro-kid', role: 'kid', text: p });
  items.push({ id: 'intro-agent', role: 'agent', text: STARTER_MESSAGE, actions: ['run', 'code'] });
  return items;
}

/** The AI's first turn (run on the loading screen) replayed into the chat so the
 *  workspace opens with the real opening exchange, not a canned starter. */
export interface FirstTurnSeed {
  prompt: string;
  reply: string;
  toolsFired?: string[];
  /** The teacher's 2–3 next-step options from the first turn (§11.4 / D-PAP-06). */
  nextSteps?: NextStep[];
  /** Per-file "what changed" notes from the first turn — descriptions for the file rows. */
  fileNotes?: FileNote[];
}

export function buildFirstTurn(seed: FirstTurnSeed): ChatItem[] {
  return [
    { id: 'first-kid', role: 'kid', text: seed.prompt },
    {
      id: 'first-agent',
      role: 'agent',
      text: seed.reply,
      toolsFired: seed.toolsFired,
      fileNotes: seed.fileNotes,
      nextSteps: seed.nextSteps,
      actions: ['run', 'code'],
    },
  ];
}

// The safety check refused the opening idea (D-PAP-20). Instead of dropping the kid
// into a silent empty project, explain what happened and offer gentle, ready-to-tap
// ideas that will pass — tapping a chip sends its prompt and builds that game.
const BLOCKED_MESSAGE =
  "I couldn't start that one — our safety helper thought the idea sounded a bit too rough for here. 🛡️ " +
  "No worries, your project is open and ready (it's just empty for now). " +
  'Try describing your game in a gentler way, or tap one of these to get going:';
const BLOCKED_SUGGESTIONS: NextStep[] = [
  {
    label: '🚀 Spaceship dodging asteroids',
    prompt: 'a spaceship flying through space, dodging asteroids and collecting stars',
    tag: 'concept',
  },
  {
    label: '✈️ Plane racing through rings',
    prompt: 'an airplane racing through floating rings in the sky to score points',
    tag: 'concept',
  },
  {
    label: '🐱 Catch the falling treats',
    prompt: 'a cat moving left and right to catch yummy treats falling from the top',
    tag: 'fun',
  },
];

export function buildBlockedSeed(): ChatItem[] {
  return [
    { id: 'blocked-agent', role: 'agent', text: BLOCKED_MESSAGE, nextSteps: BLOCKED_SUGGESTIONS },
  ];
}
