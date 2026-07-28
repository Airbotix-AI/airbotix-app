// Tiny Star Village A6｜钟楼少了哪一步 — Story Blocks mission guides.
// Split out of curriculumGuides.ts to keep every file under the 1000-line
// hard rule in rules/file-organization.md. curriculumGuides.ts stays the
// public module and re-exports the assembled catalogue.

import type { StoryMission } from './types';

export const TSV_A6_MISSIONS: Record<string, StoryMission> = {
  'tsv-s1-a6-h': {
    mode: 'observe-only', lessonId: 'tsv-s1-a6-h', celebrate: false,
    hero: { name: 'Lumilo', role: 'Morning Light Keeper', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png' },
    eyebrow: 'Tiny Star Village · Chapter 6 · Mission 21', title: 'Three Bell Tower cards',
    storyPages: [
      { emoji: '⭐🔔', title: 'The last stop is the Bell Tower', body: 'Order, direction, tapping, distance and taking turns — five chapters of clues have reached the tower. Lumi only has to ring the bell to bring the morning light back.', speaker: 'Lumilo', dialogue: 'The whole village is waiting for one bell.', scene: 1 },
      { emoji: '🚶🦘🔔', title: 'Three cards tell the story', body: 'Walk to the tower. Hop up to the bell. Hear the bell ring. Those three cards are the whole morning — first, then, last.', speaker: 'Dot Dot', dialogue: 'Three cards, always in that order.', scene: 3, blocks: ['🚩 Start → ➡️ Right 3', '🫧 Pop → End'] },
      { emoji: '🚶❓🔔', title: 'Press Go and watch', body: 'One of the three cards is missing from this program. Run it and watch what really happens. Do not change any block — this mission is only for looking.', speaker: 'Lumilo', dialogue: 'The bell rang… but did I touch it?', scene: 5 },
    ],
    partnerLine: 'A story can run to the end and still be missing a step in the middle.',
    mission: 'Press Go and watch the whole route. Then choose the card that never happened. Do not change any block.',
    question: 'Which Bell Tower card is missing?',
    choices: [
      { id: 'walk', label: '🚶 Walk to the tower', correct: false },
      { id: 'hop', label: '🦘 Hop up to the bell', correct: true },
      { id: 'ring', label: '🔔 Hear the bell ring', correct: false },
    ],
    retry: 'Press Go again. Lumi really walked, and the bell really rang. Which card never happened at all?',
    successTitle: 'Nobody touched the bell!', success: 'Lumi walked to the tower and the bell rang by itself — the hop in the middle is missing.',
    fixTitle: 'Story Hook complete', fixPrompt: 'Keep the program exactly as it is. In the next mission you will add the missing Hop.',
    workspaceIntro: 'Do not change the blocks. Press Go, watch the route, then choose the missing card.', fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Press Go and watch all three cards — or only two of them.', watch: 'Lumi is walking. Watch for a hop before the bell.',
      sayFirst: 'Keep the bell program unchanged.', sayThen: 'Keep the bell program unchanged.',
      hopFirst: 'Keep the bell program unchanged.', hopThen: 'Keep the bell program unchanged.',
      retry: 'Watch the run again. Walk happened, ring happened — what did not?', fix: 'You saw the bell ring with nobody jumping. Now choose the missing card.',
      test: 'Press Go to watch the route to the tower.', saving: 'Saving your observation with the program unchanged…',
      complete: 'The bell rang without a hop, so the middle card is missing.',
    },
    logicSteps: [{ icon: '🚶', label: 'Walk 3', order: 'First' }, { icon: '❓', label: 'Nothing', order: 'Then' }, { icon: '🔔', label: 'Bell rings', order: 'Last' }],
    logicWhy: 'The program goes straight from the walk to the bell, so the tower rings without anyone reaching it.',
    completionTitle: 'Story Hook complete · The Hop is missing!', completion: 'You ran the Bell Tower route, heard the bell ring with nobody jumping, and found the card that is missing from the middle.',
    completionSteps: [{ icon: '🚶', label: 'Walk to tower', order: 'Run' }, { icon: '🦘', label: 'Hop missing', order: 'Find' }, { icon: '🔔', label: 'Bell rang anyway', order: 'Explain' }],
    completionWhy: 'The unchanged Start → Right 3 → Pop → End program walked Lumi to the tower and the real runner played the bell without ever reaching a Hop block.',
    next: 'Next, add the missing Hop between the walk and the bell.',
  },
  // Tiny Star Village S1/A6-B — chapter six's Logic Build (scene-specs A6-B,
  // teaching script §8.4 "补上那一步"). The floor cards come back with the middle
  // one in the child's hand: the same route runs, and they put the Hop back
  // between the walk and the bell. Tapping Hop in the Motion palette appends it
  // AFTER the Pop and on its own default of 2, so both the position and the
  // number are genuinely the child's moves — the product supplies neither.
  'tsv-s1-a6-b': {
    mode: 'complete', lessonId: 'tsv-s1-a6-b', celebrate: true,
    hero: { name: 'Lumilo', role: 'Morning Light Keeper', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png' },
    eyebrow: 'Tiny Star Village · Chapter 6 · Mission 22', title: 'Add the missing step',
    storyPages: [
      { emoji: '🚶❓🔔', title: 'The middle card is in your hand', body: 'You found it last time: Lumi walks to the Bell Tower and the bell rings, but nobody ever jumps up to touch it. The hop card is still missing from the program.', speaker: 'Lumilo', dialogue: 'I never actually reached the bell.', scene: 1 },
      { emoji: '🦘', title: 'Find Hop in Move', body: 'Open the Move blocks and tap 🦘 Hop. It joins the end of the chain, after the bell — that is not where the story needs it yet.', speaker: 'Dot Dot', dialogue: 'A hop after the bell is too late!', scene: 3, blocks: ['🚩 Start → ➡️ Right 3', '🦘 Hop 1 → 🫧 Pop → End'] },
      { emoji: '1️⃣2️⃣3️⃣', title: 'Walk, hop, ring', body: 'Drag the Hop in front of the Pop, and change its number to 1 so Lumi jumps one space. Then save, press Go, and watch all three cards happen in order.', speaker: 'Lumilo', dialogue: 'First I walk, then I jump, then it rings!', scene: 5 },
    ],
    partnerLine: 'A missing step does not stop a program running — it stops the story making sense.',
    mission: 'Add a Hop between Right 3 and Pop, set its number to 1, wait for Saved, then press Go.',
    question: 'Where does the hop belong?', choices: [],
    retry: 'The Hop has to sit between the walk and the bell, and it hops 1 space.',
    successTitle: 'Walk, hop, ring!', success: 'Lumi walked to the tower, jumped up to the bell, and the bell rang because someone reached it.',
    fixTitle: 'Put the middle card back', fixPrompt: 'Close this card, open 🦘 Move, tap Hop, then drag it in front of Pop and change its number to 1.',
    workspaceIntro: 'Start, Right 3 and Pop stay exactly as they are. Only the missing Hop is yours to add.', fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Open Move and tap Hop, then drag it in front of Pop.', watch: 'Watch for a jump before the bell.',
      sayFirst: 'This route has no words — walk, hop, ring.', sayThen: 'This route has no words — walk, hop, ring.',
      hopFirst: 'The hop must come after the walk, not before it.', hopThen: 'Lumi jumped up to the bell.',
      retry: 'Put the Hop between Right 3 and Pop, and make it Hop 1.', fix: 'The route still goes straight from the walk to the bell.',
      test: 'Saved? Press Go and watch all three steps.', saving: 'The bell rang after the jump. Saving the repaired route…',
      complete: 'Walk, hop, ring — the whole morning happened in order.',
    },
    logicSteps: [{ icon: '🦘', label: 'Tap Hop', order: 'Add' }, { icon: '↔️', label: 'Before Pop', order: 'Place' }, { icon: '▶️', label: 'Run', order: 'Test' }],
    logicWhy: 'Blocks run left to right, so a Hop after the Pop happens after the bell has already rung. Only a Hop between the walk and the bell makes the ringing something Lumi caused.',
    completionTitle: 'The Bell Tower is complete! ⭐🔔', completion: 'You added the missing Hop, put it between the walk and the bell, saved it, and ran the whole three-step morning.',
    completionSteps: [{ icon: '🚶', label: 'Walk 3', order: 'First' }, { icon: '🦘', label: 'Hop 1', order: 'Then' }, { icon: '🔔', label: 'Bell rings', order: 'Last' }],
    completionWhy: 'The server-saved Start → Right 3 → Hop 1 → Pop → End route ran on the unchanged Bell Tower stage, and the run reached the Hop before the bell with Lumi standing at the foot of the tower.',
    next: 'Next, the same three steps arrive in the wrong order — the bell rings first.',
  },
  // Tiny Star Village S1/A6-D — chapter six's Twist & Debug (scene-specs A6-D,
  // teaching script §8.6 "钟先响了"). All three cards are on the page at last —
  // and the bell has slipped to the FRONT, so it rings before anybody has walked
  // or jumped. §8.6 forbids rebuilding the chain: run it, name the card that
  // belongs last, move that ONE card, check the Hop is still in the middle, run
  // again. So no block may be added, deleted or retuned here — the single legal
  // edit is where the Pop sits.
  'tsv-s1-a6-d': {
    mode: 'observe-fix', lessonId: 'tsv-s1-a6-d', celebrate: true,
    hero: { name: 'Lumilo', role: 'Morning Light Keeper', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png' },
    eyebrow: 'Tiny Star Village · Chapter 6 · Mission 23', title: 'The bell rang first!',
    storyPages: [
      { emoji: '🔔🚶🦘', title: 'All three cards are here', body: 'Walk to the tower, hop up to the bell, hear the bell ring. Every card the morning needs is finally in the program — but the village woke up confused.', speaker: 'Lumilo', dialogue: 'Something happened in the wrong order.', scene: 1 },
      { emoji: '🔔❓', title: 'Press Go and listen', body: 'The bell is the FIRST block, so it rings while Lumi is still three spaces away. Then Lumi walks. Then Lumi jumps at a bell that already rang.', speaker: 'Dot Dot', dialogue: 'Who rang it? Nobody was even there!', scene: 3, blocks: ['🚩 Start → 🫧 Pop', '➡️ Right 3 → 🦘 Hop 1 → End'] },
      { emoji: '🫧➡️', title: 'Move one card only', body: 'Do not add a block, do not delete one, do not change a number. Drag the 🫧 Pop down past the Hop so the bell is the last thing that happens, then run it again.', speaker: 'Lumilo', dialogue: 'First I walk, then I jump, THEN it rings.', scene: 5 },
    ],
    partnerLine: 'The same blocks in a different order tell a different story.',
    mission: 'Press Go first. After the bell rings too early, choose the card that must come last, then drag only the Pop behind the Hop.',
    question: 'The bell rang before Lumi arrived. Which card must come LAST?',
    choices: [
      { id: 'walk', label: '🚶 Walk to the tower', correct: false },
      { id: 'hop', label: '🦘 Hop up to the bell', correct: false },
      { id: 'ring', label: '🔔 Hear the bell ring', correct: true },
    ],
    retry: 'Press Go again. The walking and the jumping have to happen before a bell can ring for them.',
    successTitle: 'The ring belongs at the end!', success: 'A bell rings because somebody reached it, so hearing it is the last card, not the first.',
    fixTitle: 'Move the bell to the end', fixPrompt: 'Close this card, then drag the 🫧 Pop down past the 🦘 Hop. Nothing else may change.',
    workspaceIntro: 'Run the bug first. Then the only legal edit is moving the Pop — no block may be added, deleted or retuned.', fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Press Go and listen for when the bell rings.', watch: 'The bell rang already — Lumi has not even moved.',
      sayFirst: 'This route has no words — walk, hop, ring.', sayThen: 'This route has no words — walk, hop, ring.',
      hopFirst: 'The jump has to come before the bell, not after it.', hopThen: 'Lumi jumped up to the bell.',
      retry: 'Keep all five blocks. Only the Pop moves, and it moves to the end.',
      fix: 'Now drag the Pop down past the Hop.',
      test: 'Saved? Press Go and listen again.', saving: 'The bell rang last this time. Saving the repair…',
      complete: 'Walk, hop, ring — in that order at last!',
    },
    logicSteps: [{ icon: '▶️', label: 'Run the bug', order: 'Observe' }, { icon: '🔔', label: 'Ring is last', order: 'Predict' }, { icon: '🫧', label: 'Move the Pop', order: 'Repair' }],
    logicWhy: 'Blocks run left to right, so a Pop at the front rings before the walk and the hop have happened. Moving it behind the Hop makes the bell the thing Lumi caused.',
    completionTitle: 'The morning is in order! ⭐🔔', completion: 'You ran the wrong order, named the card that belongs last, moved only the Pop, saved it, and reran the whole three-step morning.',
    completionSteps: [{ icon: '🚶', label: 'Walk 3', order: 'First' }, { icon: '🦘', label: 'Hop 1', order: 'Then' }, { icon: '🔔', label: 'Bell rings', order: 'Last' }],
    completionWhy: 'The server-saved Start → Right 3 → Hop 1 → Pop → End route holds the same five blocks the bug shipped, and the rerun reached the Hop before the bell with Lumi standing at the foot of the tower.',
    next: 'The Bell Tower works. Next, the last mission of the season: choose who rings it and how the morning ends.',
  },
  // Tiny Star Village S1/A6-S — the season's Personal Ship (scene-specs A6-S,
  // teaching script §8.7 "我的晨光结局"). The three-step core is settled: the
  // child built it in A6-B and repaired it in A6-D, so it ships built and fixed
  // ("固定核心"). What is genuinely theirs is who rings the bell (§8.7 "敲钟角
  // 色") and what happens when the morning light comes back (§8.7 "晨光出现后的
  // 一个动作：Hop、Grow或Say" plus the very short ending line). The starter casts
  // NOBODY as the ringer and ships no ending, so it cannot complete itself.
  'tsv-s1-a6-s': {
    mode: 'personal-ship', lessonId: 'tsv-s1-a6-s', celebrate: true,
    hero: { name: 'Lumilo', role: 'Morning Light Keeper', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png' },
    eyebrow: 'Tiny Star Village · Chapter 6 · Mission 24', title: 'My morning-light ending',
    storyPages: [
      { emoji: '🔔❓', title: 'The route is ready. Nobody is standing there.', body: 'Walk three spaces, hop up, ring the bell — you built that story and you fixed it. It is waiting at the tower, and this time it is empty: no friend has been chosen to ring it.', speaker: 'Lumilo', dialogue: 'Someone has to bring the morning back. Who will it be?', scene: 1 },
      { emoji: '⭐🐻🐱', title: 'Choose your ringer', body: 'Lumi, Tuan Tuan or Dot Dot — you have built the whole season with all three. Pick the friend who gets to ring the Bell Tower, and they will walk, hop and ring your route.', speaker: 'Dot Dot', dialogue: 'Pick me and the whole village will hear it!', scene: 3 },
      { emoji: '💬🦘🔼', title: 'Then choose how the morning ends', body: 'Add ONE last block after the 🫧 Pop: a 💬 Say with your own ending words, a 🦘 Hop for joy, or a 🔼 Grow to shine bigger. Then press Go and tell someone your three steps.', speaker: 'Lumilo', dialogue: 'First I walk, then I jump, then it rings — and then this is mine.', scene: 5, blocks: ['🚩 Start → ➡️ Right 3 → 🦘 Hop 1', '🫧 Pop → 💬 Say → End'] },
    ],
    partnerLine: 'Every child’s morning ends differently, so there is no single right answer — only a story you can tell out loud.',
    mission: 'Choose your ringer, add one ending block after the Pop, wait for Saved, then press Go and tell someone your three steps.',
    question: 'Who will ring in your morning?', choices: [],
    retry: 'Two things finish the season: a friend at the tower, and ONE ending block after the 🫧 Pop.',
    successTitle: 'Your morning came back!', success: 'The bell rang, and then your own ending happened.',
    fixTitle: 'Make the ending mine', fixPrompt: 'Close this card, choose your ringer below the stage, then add one ending block after the 🫧 Pop.',
    workspaceIntro: 'The friend buttons only choose who is standing there — they never add a block. Walk, hop and ring stay exactly as you built them; the last block is yours.', fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Choose your ringer, then add one ending block after the Pop.', watch: 'Watch for your own ending after the bell.',
      sayFirst: 'Your ending words belong after the bell.', sayThen: 'That was your ending.',
      hopFirst: 'That hop belongs to the tower, not the ending.', hopThen: 'A jump for joy — the morning is back.',
      retry: 'A friend at the tower, and one ending block AFTER the 🫧 Pop.', fix: 'Pick your ringer, then add the last block.',
      test: 'Your ending is ready. Press Go!', saving: 'The bell rang, then your ending. Saving your season…',
      complete: 'Your saved morning-light story ends exactly the way you chose!',
    },
    logicSteps: [{ icon: '⭐🐻🐱', label: 'My ringer', order: 'Mine' }, { icon: '🚶🦘🔔', label: 'Walk, hop, ring', order: 'Fixed' }, { icon: '💬', label: 'My ending', order: 'Mine' }],
    logicWhy: 'The three steps have to stay in order for the bell to ring at all — so your ending is the block that comes after them, not instead of them.',
    completionTitle: 'Season 1 complete! ⭐🔔🌅', completion: 'You chose who rings the Bell Tower, kept the walk, the hop and the ring in order, added your own ending, and ran the whole morning-light story.',
    completionSteps: [{ icon: '⭐', label: 'My ringer', order: '1' }, { icon: '🚶', label: 'Walk 3', order: '2' }, { icon: '🦘', label: 'Hop 1', order: '3' }, { icon: '🔔', label: 'Bell rings', order: '4' }, { icon: '💬', label: 'My ending', order: '5' }],
    completionWhy: 'The server-saved project holds your chosen friend at the tower on the untouched Start → Right 3 → Hop 1 → Pop core with your own ending block after it, and the run played the hop before the bell and your ending after it, with your ringer standing at the foot of the tower.',
    next: 'The morning light is back for good. Show your four-page story to your family and tell them what you made, what you fixed, and who you let ring the bell.',
  },
  // Journey to the West S1/C1-P4 — the chapter's Build 1 (scene-specs
  // JTW-S1-C1-P4). Chinese story world; the child picks the four core blocks
  // from a palette that also offers Grow/Turn distractors.,
};
