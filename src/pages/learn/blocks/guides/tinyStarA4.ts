// Tiny Star Village A4｜早餐车差一点 — Story Blocks mission guides.
// Split out of curriculumGuides.ts to keep every file under the 1000-line
// hard rule in rules/file-organization.md. curriculumGuides.ts stays the
// public module and re-exports the assembled catalogue.

import type { StoryMission } from './types';

export const TSV_A4_MISSIONS: Record<string, StoryMission> = {
  'tsv-s1-a4-h': {
    mode: 'observe-only', lessonId: 'tsv-s1-a4-h', celebrate: false,
    hero: { name: 'Breakfast Cart', role: 'Morning Delivery', asset: '/story-blocks/tiny-star-village/props/breakfast-cart.svg' },
    eyebrow: 'Tiny Star Village · Chapter 4 · Mission 13', title: 'How far is breakfast?',
    storyPages: [
      { emoji: '🚙🍎', title: 'Breakfast is waiting', body: 'The cart starts at space 4. The breakfast table waits at space 7.', speaker: 'Lumilo', dialogue: 'Point from the cart to the table.', scene: 1 },
      { emoji: '1️⃣➡️', title: 'The cart knows one step', body: 'The unchanged program says Right 1. Before Go, predict the full distance to the table.', speaker: 'Lumilo', dialogue: 'How many spaces are between them?', scene: 3, blocks: ['🚩 Start', '➡️ Right 1 → End'] },
      { emoji: '🚙…🍽️', title: 'Compare after Go', body: 'Run the real program. The cart stops at space 5, still two spaces before the table.', speaker: 'Breakfast Cart', dialogue: 'One step was too short!', scene: 5 },
    ],
    partnerLine: 'A number tells the cart how many spaces to travel.',
    mission: 'Before Go, choose how many spaces reach the table. Then run the unchanged Right 1 program and compare its stop with the table.',
    question: 'How many spaces from the cart to the table?', choices: [{ id: 'one', label: '1 space', correct: false }, { id: 'two', label: '2 spaces', correct: false }, { id: 'three', label: '3 spaces', correct: true }],
    retry: 'Count from space 4 to space 7. Choose before Go, then compare the run.', successTitle: 'You predicted three spaces!', success: 'The real one-space run stopped early at space 5.',
    fixTitle: 'Story Hook complete', fixPrompt: 'Keep Right 1 unchanged. In the next mission you will change its number.', workspaceIntro: 'Do not change the blocks. Choose 3 spaces before Go, then watch where Right 1 stops.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Count to the table and choose before Go.', watch: 'The cart stopped at space 5. Is that the table?', sayFirst: 'Count three spaces from 4 to 7.', sayThen: 'Count three spaces from 4 to 7.', hopFirst: 'Keep the cart program unchanged.', hopThen: 'Keep the cart program unchanged.', retry: 'Choose the full distance before Go.', fix: 'One step stopped early. Your three-space prediction was right.', test: 'Run the unchanged Right 1 program.', saving: 'Saving your observation with the unchanged program…', complete: 'Three spaces reach the table; Right 1 stops early.' },
    logicSteps: [{ icon: '👉', label: 'Predict 3', order: 'Before' }, { icon: '▶️', label: 'Run Right 1', order: 'Then' }, { icon: '🍽️', label: 'Compare', order: 'Explain' }],
    logicWhy: 'The cart starts at 4 and the table is at 7, so the distance is three spaces.', completionTitle: 'Story Hook complete · Three spaces!', completion: 'You predicted before running and saw the unchanged one-space program stop early.', completionSteps: [{ icon: '3️⃣', label: 'Predict', order: 'First' }, { icon: '🚙', label: 'Stop at 5', order: 'Run' }, { icon: '🍽️', label: 'Table at 7', order: 'Compare' }], completionWhy: 'The exact unchanged Start → Right 1 → End program ran from 4 to 5 while the table stayed at 7.', next: 'Next, change only the movement number to 3 in A4-B.',
  },
  'tsv-s1-a4-b': {
    mode: 'complete', lessonId: 'tsv-s1-a4-b', celebrate: true,
    hero: { name: 'Breakfast Cart', role: 'Morning Delivery', asset: '/story-blocks/tiny-star-village/props/breakfast-cart.svg' },
    eyebrow: 'Tiny Star Village · Chapter 4 · Mission 14', title: 'How many spaces?',
    storyPages: [
      { emoji: '🚙…🍽️', title: 'The cart stopped early', body: 'Right 1 moved the cart from space 4 to space 5. The table is still at space 7.', speaker: 'Breakfast Cart', dialogue: 'I need a bigger number.', scene: 1 },
      { emoji: '1️⃣→3️⃣', title: 'Change only the number', body: 'Keep Start, Right, and End exactly where they are. Tap the 1 and change it to 3.', speaker: 'Lumilo', dialogue: 'Three spaces reaches the table.', scene: 3, blocks: ['🚩 Start', '➡️ Right 1 → change to 3 → End'] },
      { emoji: '▶️🚙🍽️', title: 'Save, then test', body: 'Wait for Saved, press Go, and watch the real cart stop exactly beside breakfast.', speaker: 'Lumilo', dialogue: 'No new blocks are needed.', scene: 5 },
    ],
    partnerLine: 'The movement stays Right; only its distance number changes.',
    mission: 'Tap Right 1, change only its number to 3, wait for Saved, then press Go.',
    question: 'Which number reaches the table?', choices: [], retry: 'Keep the three-block chain. Change only Right 1 to Right 3.',
    successTitle: 'Breakfast delivered!', success: 'The saved Right 3 program moved the real cart from space 4 to the table at space 7.',
    fixTitle: 'Change one number', fixPrompt: 'Close this card, tap the number on Right, and choose 3.',
    workspaceIntro: 'Start, Right, and End are locked in place. Edit only the movement number.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Tap the 1 on Right and change it to 3.', watch: 'Watch where the cart stops.', sayFirst: 'Count three spaces from 4 to 7.', sayThen: 'Right 3 reaches the table.', hopFirst: 'Keep the direction Right.', hopThen: 'Keep the direction Right.', retry: 'Change only the movement number to 3.', fix: 'The cart still needs Right 3.', test: 'Saved? Press Go to deliver breakfast.', saving: 'The cart arrived. Saving the exact Right 3 program…', complete: 'Breakfast is at the table!' },
    logicSteps: [{ icon: '1️⃣', label: 'Find number', order: 'Tap' }, { icon: '3️⃣', label: 'Choose 3', order: 'Change' }, { icon: '▶️', label: 'Run', order: 'Test' }],
    logicWhy: 'From space 4 to space 7 is three spaces, so Right 3 reaches the target.',
    completionTitle: 'Breakfast delivered! 🚙🍽️', completion: 'You changed one real parameter, saved the exact chain, and ran it to the table.',
    completionSteps: [{ icon: '3️⃣', label: 'Right 3', order: 'Build' }, { icon: '💾', label: 'Saved', order: 'Prove' }, { icon: '🍽️', label: 'At table', order: 'Run' }],
    completionWhy: 'The server-saved Start → Right 3 → End program ran from space 4 and finished at space 7.', next: 'Next, repair an overshoot by changing only its distance.',
  },
  'tsv-s1-a4-d': {
    mode: 'observe-fix', lessonId: 'tsv-s1-a4-d', celebrate: true,
    hero: { name: 'Breakfast Cart', role: 'Morning Delivery', asset: '/story-blocks/tiny-star-village/props/breakfast-cart.svg' },
    eyebrow: 'Tiny Star Village · Chapter 4 · Mission 15', title: 'The cart went too far!',
    storyPages: [
      { emoji: '🚙✨', title: 'Breakfast starts moving', body: 'The saved delivery worked, but a windy sparkle changed Right 3 into Right 4.', speaker: 'Breakfast Cart', dialogue: 'I will test before guessing.', scene: 1 },
      { emoji: '🍽️…🚙', title: 'Watch the first run', body: 'The table is at space 7. Run Right 4 from space 4 and watch the cart pass it to space 8.', speaker: 'Lumilo', dialogue: 'Does the number need more or less?', scene: 3, blocks: ['🚩 Start', '➡️ Right 4 → End'] },
      { emoji: '4️⃣→3️⃣', title: 'Repair one number', body: 'Choose less, keep every block in place, and change only 4 to 3. Save and run again.', speaker: 'Breakfast Cart', dialogue: 'Right 3 stops beside breakfast.', scene: 5 },
    ],
    partnerLine: 'A number that is one too big carries the cart one space too far.',
    mission: 'Press Go first. After the cart overshoots, choose less and change only Right 4 to Right 3.',
    question: 'The cart passed the table. Does its number need more or less?', choices: [{ id: 'more', label: 'More', correct: false }, { id: 'less', label: 'Less', correct: true }],
    retry: 'Run Right 4 first. Space 8 is past the table at space 7.', successTitle: 'You found the overshoot!', success: 'Four was one too many, so the distance needs less.',
    fixTitle: 'Repair one number', fixPrompt: 'Keep Start, Right, and End. Tap 4 and choose 3.', workspaceIntro: 'Run the bug first. Then only the Right number can change.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Press Go and watch where Right 4 stops.', watch: 'The cart passed space 7 and stopped at 8.', sayFirst: 'Predict more or less after the first run.', sayThen: 'Less makes 4 become 3.', hopFirst: 'Keep every block in place.', hopThen: 'Only the distance number changes.', retry: 'First run Right 4, then choose less.', fix: 'Now tap the 4 and choose 3.', test: 'Saved? Run the repaired cart.', saving: 'The cart stopped at breakfast. Saving the repair…', complete: 'You fixed the overshoot with one parameter!' },
    logicSteps: [{ icon: '▶️', label: 'Run 4', order: 'Observe' }, { icon: '➖', label: 'Choose less', order: 'Predict' }, { icon: '3️⃣', label: 'Right 3', order: 'Repair' }], logicWhy: 'Right 4 ends at space 8; reducing it to Right 3 ends at the table on space 7.',
    completionTitle: 'Overshoot repaired! 🚙🍽️', completion: 'You observed the bug, changed only its distance, saved, and reran the real cart.', completionSteps: [{ icon: '8️⃣', label: 'Overshoot', order: 'See' }, { icon: '3️⃣', label: 'Distance', order: 'Fix' }, { icon: '🍽️', label: 'At table', order: 'Run' }], completionWhy: 'The server-saved Start → Right 3 → End repair ran from space 4 to space 7 after the original Right 4 run reached space 8.', next: 'Continue to A4-S and choose your own delivery stop.',
  },
  'tsv-s1-a4-s': {
    mode: 'personal-ship', lessonId: 'tsv-s1-a4-s', celebrate: true,
    hero: { name: 'Breakfast Cart', role: 'Morning Delivery', asset: '/story-blocks/tiny-star-village/props/breakfast-cart.svg' },
    eyebrow: 'Tiny Star Village · Chapter 4 · Mission 16', title: 'My delivery stop',
    storyPages: [
      { emoji: '🚙📦', title: 'Where should breakfast stop?', body: 'The cart always starts at space 4. Put your delivery stop 1, 2 or 3 spaces to the right and the story becomes yours.', speaker: 'Breakfast Cart', dialogue: 'Tell me where to stop today.', scene: 1 },
      { emoji: '🍎🎁⭐', title: 'Choose what you deliver', body: 'Pick the apple breakfast, the gift breakfast or the star breakfast. The parcel buttons only rename your stop — they never add a block.', speaker: 'Lumilo', dialogue: 'Your parcel, your stop, your number.', scene: 3 },
      { emoji: '➡️🔢', title: 'Match the number to the distance', body: 'Add one Right block yourself, then tap its number until it matches how many spaces you chose. Press Go and the cart must stop exactly on your parcel.', speaker: 'Breakfast Cart', dialogue: 'One space, two spaces or three — you decide!', scene: 5, blocks: ['🚩 Start', '➡️ Right ? → End'] },
    ],
    partnerLine: 'A different stop needs a different number, so there is no single right answer here.',
    mission: 'Choose your stop and your parcel, add one Right block, set its number to the same distance, then press Go.',
    question: 'How far will your breakfast travel?', choices: [],
    retry: 'Your number must match your stop: 1 space is Right 1, 2 spaces is Right 2, 3 spaces is Right 3.',
    successTitle: 'Your delivery arrived!', success: 'The saved Right block carried the cart exactly onto the stop you chose.',
    fixTitle: 'Design your delivery', fixPrompt: 'Close this card, choose a stop and a parcel below the stage, then build the Right block.',
    workspaceIntro: 'The stop and parcel buttons never add blocks. You must add the Right block and set its number yourself.', fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Choose your stop and parcel, then add one Right block.', watch: 'Watch whether the cart stops on your parcel.',
      sayFirst: 'Count the spaces out loud.', sayThen: 'Count the spaces out loud.',
      hopFirst: 'The cart always starts at space 4.', hopThen: 'The cart always starts at space 4.',
      retry: 'More spaces need a bigger number; fewer spaces need a smaller one.', fix: 'Add one Right block and set its number to your distance.',
      test: 'Your number matches your stop. Press Go!', saving: 'Breakfast arrived. Saving your own delivery…',
      complete: 'Your saved cart stopped exactly where you decided!',
    },
    logicSteps: [{ icon: '📦', label: 'Choose stop', order: 'Mine' }, { icon: '🍎', label: 'Choose parcel', order: 'Mine' }, { icon: '➡️', label: 'Match number', order: 'Build' }],
    logicWhy: 'The cart starts at space 4, so a stop 1, 2 or 3 spaces away needs Right 1, Right 2 or Right 3.',
    completionTitle: 'Chapter 4 complete! 🚙📦', completion: 'You chose the stop, chose the parcel, built the matching Right block, ran the cart and saved your own delivery.',
    completionSteps: [{ icon: '📦', label: 'My stop', order: '1' }, { icon: '🍎', label: 'My parcel', order: '2' }, { icon: '➡️', label: 'My number', order: '3' }, { icon: '🍽️', label: 'Arrived', order: '4' }],
    completionWhy: 'The server-saved project holds your stop, your parcel and a movement number equal to the distance, and the real runner finished on that square.',
    next: 'Breakfast is delivered and all three friends start saying good morning at once. Next, help them take turns.',
  },
  // Tiny Star Village S1/A5-H — chapter five's Story Hook (scene-specs A5-H,
  // teaching script §7.2 "早安挤在一起"). Nothing is broken and nothing is
  // missing: the child runs a finished two-friend program and discovers that
  // both greetings start together. The question can only be answered AFTER the
  // run, because the two chains look identical on the page.,
};
