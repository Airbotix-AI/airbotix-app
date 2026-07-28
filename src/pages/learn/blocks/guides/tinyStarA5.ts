// Tiny Star Village A5｜大家一起说，谁也听不清 — Story Blocks mission guides.
// Split out of curriculumGuides.ts to keep every file under the 1000-line
// hard rule in rules/file-organization.md. curriculumGuides.ts stays the
// public module and re-exports the assembled catalogue.

import type { StoryMission } from './types';

export const TSV_A5_MISSIONS: Record<string, StoryMission> = {
  'tsv-s1-a5-h': {
    mode: 'observe-only', lessonId: 'tsv-s1-a5-h', celebrate: false,
    hero: { name: 'Lumilo', role: 'Morning Light Keeper', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png' },
    eyebrow: 'Tiny Star Village · Chapter 5 · Mission 17', title: 'Who is speaking?',
    storyPages: [
      { emoji: '⭐🐻', title: 'Two friends, one good morning', body: 'Breakfast arrived, so Lumilo and Tuan Tuan both came to say good morning. Each friend has a finished program of their own.', speaker: 'Lumilo', dialogue: 'Tuan Tuan is here too!', scene: 1 },
      { emoji: '🚩🚩', title: 'Both programs wait for the same Go', body: 'Look at the two chains. Neither one is broken and neither one is missing a block — but both of them start on the same green flag.', speaker: 'Lumilo', dialogue: 'We both start when you press Go.', scene: 3, blocks: ['🚩 Start', '💬 Say → End'] },
      { emoji: '💬💬', title: 'Press Go and listen', body: 'Run the story and watch the two speech bubbles. Do not change any block — this mission is only for looking.', speaker: 'Dot Dot', dialogue: 'I hear two voices squashed together!', scene: 5 },
    ],
    partnerLine: 'Two Start blocks on one page begin at the same moment, so both friends speak at once.',
    mission: 'Press Go and watch both friends. Then say who spoke first. Do not change any block.',
    question: 'Who spoke first?',
    choices: [
      { id: 'lumilo', label: 'Lumilo spoke first', correct: false },
      { id: 'tuan-tuan', label: 'Tuan Tuan spoke first', correct: false },
      { id: 'together', label: 'They both spoke at the same time', correct: true },
    ],
    retry: 'Press Go again and watch both bubbles. Did one of them wait for the other?',
    successTitle: 'Nobody waited!', success: 'Both bubbles opened on the same Go, so the two good mornings squashed together.',
    fixTitle: 'Story Hook complete', fixPrompt: 'Keep both programs exactly as they are. In the next mission you will give Tuan Tuan a Wait.',
    workspaceIntro: 'Do not change the blocks. Press Go, watch both bubbles, then answer who spoke first.', fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Press Go and watch both friends at the same time.', watch: 'Two bubbles at once. Is anyone waiting?',
      sayFirst: 'Both friends are speaking right now.', sayThen: 'Both friends are speaking right now.',
      hopFirst: 'Keep both programs unchanged.', hopThen: 'Keep both programs unchanged.',
      retry: 'Watch the run again. Neither friend waited for the other.', fix: 'You saw both bubbles open together. Now answer who spoke first.',
      test: 'Press Go to hear the two good mornings.', saving: 'Saving your observation with both programs unchanged…',
      complete: 'Both friends start on the same Go, so nobody goes first.',
    },
    logicSteps: [{ icon: '▶️', label: 'Press Go', order: 'First' }, { icon: '💬💬', label: 'Two bubbles', order: 'Watch' }, { icon: '🤝', label: 'Same moment', order: 'Explain' }],
    logicWhy: 'Both chains hang off the same green flag, so the runner starts them together and neither greeting waits.',
    completionTitle: 'Story Hook complete · They spoke together!', completion: 'You ran the two-friend greeting, saw both bubbles open at once, and named the problem: nobody took a turn.',
    completionSteps: [{ icon: '🚩', label: 'One Go', order: 'Start' }, { icon: '💬💬', label: 'Both talk', order: 'Run' }, { icon: '⏱', label: 'Needs a wait', order: 'Idea' }],
    completionWhy: 'The two unchanged Start → Say → End chains both ran from the same flag, and the real runner held both speech bubbles open at the same time.',
    next: 'Next, give Tuan Tuan a Wait block so the two good mornings take turns.',
  },
  // Tiny Star Village S1/A5-B — chapter five's Logic Build (scene-specs A5-B,
  // teaching script §7.4 "给团团一只沙漏"). A5-H's stage returns with one block
  // missing from Tuan Tuan's chain. The child adds the Wait AND decides where it
  // goes: after the Say it changes nothing, before the Say it hands Lumilo the
  // first turn. Tapping Wait in the palette lands it after the Say, so the
  // placement is genuinely the child's move, not the product's.
  'tsv-s1-a5-b': {
    mode: 'complete', lessonId: 'tsv-s1-a5-b', celebrate: true,
    hero: { name: 'Tuan Tuan', role: 'Cloud-path Maker', asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png' },
    eyebrow: 'Tiny Star Village · Chapter 5 · Mission 18', title: 'Wait a moment',
    storyPages: [
      { emoji: '💬💬', title: 'Two good mornings at once', body: 'Last time both friends spoke on the same Go and nobody could hear either one. Tuan Tuan would like to go second this time.', speaker: 'Tuan Tuan', dialogue: 'I do not mind waiting for Lumi.', scene: 1 },
      { emoji: '⏱', title: 'An hourglass for Tuan Tuan', body: 'Open Tuan Tuan and look at the chain. There is room between Start and Say — that is where a Wait block belongs.', speaker: 'Lumilo', dialogue: 'Wait, then say it.', scene: 3, blocks: ['🚩 Start', '⏱ Wait → 💬 Say'] },
      { emoji: '⭐➡️🐻', title: 'Where you drop it matters', body: 'A Wait after the Say changes nothing — Tuan Tuan still speaks straight away. Put the Wait first, press Go, and listen for Lumi starting alone.', speaker: 'Tuan Tuan', dialogue: 'Lumi first, then me!', scene: 5 },
    ],
    partnerLine: 'Wait does not stop a friend — it makes that friend start later.',
    mission: 'Choose Tuan Tuan, add one Wait block BEFORE the Say, wait for Saved, then press Go.',
    question: 'Who will speak first now?', choices: [],
    retry: 'Tuan Tuan still starts with Lumi. The Wait has to sit between Start and Say.',
    successTitle: 'Lumi went first!', success: 'The saved Wait held Tuan Tuan back, so the two good mornings started one after the other.',
    fixTitle: 'Give Tuan Tuan a Wait', fixPrompt: 'Close this card, tap Tuan Tuan, open ⏱ Control, and put a Wait between Start and Say.',
    workspaceIntro: 'Lumilo’s chain stays exactly as it is. Only Tuan Tuan needs the new block.', fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Tap Tuan Tuan, then add a Wait before the Say.', watch: 'Listen for who starts first.',
      sayFirst: 'Lumi is speaking first.', sayThen: 'Tuan Tuan speaks after the wait.',
      hopFirst: 'Leave Lumilo’s chain alone.', hopThen: 'Leave Lumilo’s chain alone.',
      retry: 'Move the Wait in front of the Say and run it again.', fix: 'Tuan Tuan still needs a Wait before the Say.',
      test: 'Saved? Press Go and listen to the turns.', saving: 'Lumi started first. Saving the two-friend greeting…',
      complete: 'Tuan Tuan waited, so both good mornings could be heard.',
    },
    logicSteps: [{ icon: '🐻', label: 'Choose Tuan Tuan', order: 'First' }, { icon: '⏱', label: 'Wait before Say', order: 'Add' }, { icon: '▶️', label: 'Run', order: 'Test' }],
    logicWhy: 'Both chains still start on the same green flag, so only a Wait in front of the Say can push the second greeting later.',
    completionTitle: 'They took turns! ⭐🐻', completion: 'You gave Tuan Tuan a Wait, saved it, and the real run let Lumi start first.',
    completionSteps: [{ icon: '⏱', label: 'Wait added', order: 'Build' }, { icon: '💾', label: 'Saved', order: 'Prove' }, { icon: '⭐→🐻', label: 'Lumi first', order: 'Run' }],
    completionWhy: 'The server-saved Start → Wait → Say → End chain ran beside Lumilo’s untouched greeting, and the run measured Tuan Tuan’s bubble opening after Lumi’s.',
    next: 'Next, the friends turn their good morning into a bounce — and Tuan Tuan’s hourglass is turned up far too high.',
  },
  // Tiny Star Village S1/A5-D — chapter five's Twist & Debug (scene-specs A5-D,
  // teaching script §7.6 "团团等到早餐都凉了"). The greeting became a bounce on
  // purpose: a speech bubble lives 1400 ms and the longest Wait this runtime can
  // express is 900 ms, so two Says can never be pulled apart, while a 360 ms
  // bounce can. Every block is already in the right order — only the number is
  // wrong, and several numbers are right, which is the whole Checkpoint B point.
  'tsv-s1-a5-d': {
    mode: 'observe-fix', lessonId: 'tsv-s1-a5-d', celebrate: true,
    hero: { name: 'Tuan Tuan', role: 'Cloud-path Maker', asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png' },
    eyebrow: 'Tiny Star Village · Chapter 5 · Mission 19', title: 'That wait was too long!',
    storyPages: [
      { emoji: '⭐🦘🐻', title: 'A bouncing good morning', body: 'Taking turns worked so well that Lumi and Tuan Tuan now say good morning with a bounce. Lumi bounces first, then Tuan Tuan bounces back.', speaker: 'Lumilo', dialogue: 'You can SEE a bounce take its turn.', scene: 1 },
      { emoji: '⏱9️⃣', title: 'The hourglass is turned up too high', body: 'Tuan Tuan’s Wait is set to 9. Press Go and watch: Lumi bounces, lands, and then nothing happens for a long, empty moment.', speaker: 'Tuan Tuan', dialogue: 'Was I supposed to go already?', scene: 3, blocks: ['🚩 Start', '⏱ Wait 9 → 🦘 Hop 1 → End'] },
      { emoji: '9️⃣➖', title: 'Find a just-right wait', body: 'Do not move any block. Tap the number on Wait and make it smaller, until Tuan Tuan bounces back right after Lumi lands.', speaker: 'Lumilo', dialogue: 'Not together, and not too late.', scene: 5 },
    ],
    partnerLine: 'A wait that is too long is just as hard to follow as no wait at all.',
    mission: 'Press Go first. After the long empty pause, choose less and make the Wait number smaller until the two bounces answer each other.',
    question: 'Tuan Tuan bounced back long after Lumi landed. Does the hourglass need more or less?', choices: [{ id: 'more', label: 'More', correct: false }, { id: 'less', label: 'Less', correct: true }],
    retry: 'Run Wait 9 first and watch the empty stage between the two bounces.', successTitle: 'You heard the gap!', success: 'Nine was far too long, so the waiting number needs less.',
    fixTitle: 'Retune the hourglass', fixPrompt: 'Keep every block where it is. Tap the number on Wait and lower it until the bounces answer each other.', workspaceIntro: 'Run the bug first. Then only Tuan Tuan’s Wait number can change — no block may be added, moved or removed.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Press Go and watch the long pause after Lumi lands.', watch: 'Count the empty moment between the two bounces.', sayFirst: 'This morning is bounces, not words.', sayThen: 'This morning is bounces, not words.', hopFirst: 'Lumi bounces first.', hopThen: 'Tuan Tuan bounces after the wait.', retry: 'Too big leaves a hole; too small makes them bounce together.', fix: 'Now tap the 9 on Wait and make it smaller.', test: 'Saved? Press Go and watch the two bounces.', saving: 'The bounces answered each other. Saving the repair…', complete: 'You found a just-right wait!' },
    logicSteps: [{ icon: '▶️', label: 'Run Wait 9', order: 'Observe' }, { icon: '➖', label: 'Choose less', order: 'Predict' }, { icon: '⏱', label: 'Just-right wait', order: 'Repair' }], logicWhy: 'A bounce takes about as long as Wait 4. Wait 9 leaves the stage empty for a whole extra bounce, and Wait 1 makes both friends bounce at once.',
    completionTitle: 'A just-right morning bounce! ⭐🐻', completion: 'You watched the too-long wait, changed only its number, saved it, and reran the real bounces.', completionSteps: [{ icon: '9️⃣', label: 'Too long', order: 'See' }, { icon: '⏱', label: 'Number', order: 'Fix' }, { icon: '⭐→🐻', label: 'In time', order: 'Run' }], completionWhy: 'The server-saved Start → Wait → Hop 1 → End chain kept every block in place beside Lumilo’s untouched bounce, and the run measured Tuan Tuan lifting off after Lumi landed but before the stage had stood still for another bounce.', next: 'Next, both friends will be yours to choose in your own two-friend greeting.',
  },
  // Tiny Star Village S1/A5-S — chapter five's Personal Ship (scene-specs A5-S,
  // teaching script §7.7 "我的双人问候"). Four things are genuinely the child's:
  // which two friends perform, which of them greets first, what each of them
  // does, and how long the second one waits. The starter casts ONE friend into
  // both spots and ships two empty chains, so it cannot complete itself.
  'tsv-s1-a5-s': {
    mode: 'personal-ship', lessonId: 'tsv-s1-a5-s', celebrate: true,
    hero: { name: 'Lumilo', role: 'Morning Light Keeper', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png' },
    eyebrow: 'Tiny Star Village · Chapter 5 · Mission 20', title: 'My two-friend greeting',
    storyPages: [
      { emoji: '⭐⭐', title: 'Two Lumis? That is not a duet', body: 'The greeting stage is set, but the same friend is standing in both spots. Choose two different friends: Lumi, Tuan Tuan or Dot Dot.', speaker: 'Lumilo', dialogue: 'A duet needs two of us!', scene: 1 },
      { emoji: '1️⃣2️⃣', title: 'You decide who goes first', body: 'The friend on the left greets the moment you press Go. The friend on the right waits first, so whoever you put on the left is the one who starts.', speaker: 'Dot Dot', dialogue: 'Put me first and I will start the morning.', scene: 3 },
      { emoji: '💬🦘⏱', title: 'Build both hellos', body: 'Give the first friend a Say or a Hop. Give the second friend a Wait and then a Say or a Hop. Press Go and watch: can a grown-up tell who greeted first?', speaker: 'Lumilo', dialogue: 'Not together, and not too late.', scene: 5, blocks: ['🚩 Start → 💬 Say', '🚩 Start → ⏱ Wait → 🦘 Hop'] },
    ],
    partnerLine: 'Every child’s duet is different, so there is no single right answer — only a greeting a grown-up can follow.',
    mission: 'Cast two different friends, build one greeting for each, and set the Wait so the second friend clearly comes after the first.',
    question: 'Who will greet your village first?', choices: [],
    retry: 'Check three things: two DIFFERENT friends, a greeting for each, and a Wait long enough to hear who started.',
    successTitle: 'Your friends took turns!', success: 'The run really did put one greeting before the other.',
    fixTitle: 'Design my duet', fixPrompt: 'Close this card, cast your two friends below the stage, then build a chain for each of them.',
    workspaceIntro: 'The friend buttons only change who is standing there — they never add a block. Both chains are yours to build.', fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Cast two different friends, then build a greeting for each.', watch: 'Watch which friend goes first.',
      sayFirst: 'That hello came first.', sayThen: 'That hello came after the wait.',
      hopFirst: 'That bounce came first.', hopThen: 'That bounce came after the wait.',
      retry: 'Two different friends, one greeting each, and a Wait in between.', fix: 'Add a Wait to the second friend, then their greeting.',
      test: 'Both chains are ready. Press Go!', saving: 'They took turns. Saving your duet…',
      complete: 'Your saved duet greets the village one friend at a time!',
    },
    logicSteps: [{ icon: '⭐🐻', label: 'My two friends', order: 'Mine' }, { icon: '1️⃣', label: 'Who first', order: 'Mine' }, { icon: '⏱', label: 'How long', order: 'Mine' }],
    logicWhy: 'The second friend starts as late as their Wait says, so the Wait is what turns two greetings into a turn-taking duet.',
    completionTitle: 'Chapter 5 complete! ⭐🐻🐱', completion: 'You cast your two friends, decided who greets first, built both hellos, and chose the wait that keeps them apart.',
    completionSteps: [{ icon: '⭐🐻', label: 'My cast', order: '1' }, { icon: '💬', label: 'My hellos', order: '2' }, { icon: '⏱', label: 'My wait', order: '3' }, { icon: '👂', label: 'Took turns', order: '4' }],
    completionWhy: 'The server-saved project holds two different friends, a greeting for each and your own Wait, and the run measured the second greeting starting after the first without leaving the stage empty.',
    next: 'A clear greeting makes three footprints glow on the Bell Tower path — but the middle one keeps flickering. Chapter 6 is next.',
  },
  // Tiny Star Village S1/A6-H — chapter six's Story Hook (scene-specs A6-H,
  // teaching script §8.2/§8.3 "钟楼三步身体剧"). The class lays three cards on
  // the floor — walk, hop, ring — and the teacher takes the middle one away.
  // On screen the same thing has happened: the route runs, the bell rings, and
  // nobody ever jumped up to touch it. Nothing is edited here; the child looks.,
};
