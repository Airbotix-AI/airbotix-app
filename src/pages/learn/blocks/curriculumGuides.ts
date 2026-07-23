export interface StoryMissionChoice {
  id: string;
  label: string;
  correct: boolean;
}

export type StoryCoachCue =
  | 'ready'
  | 'watch'
  | 'sayFirst'
  | 'sayThen'
  | 'hopFirst'
  | 'hopThen'
  | 'retry'
  | 'fix'
  | 'test'
  | 'saving'
  | 'complete';

export interface StoryCoachCopy {
  ready: string;
  watch: string;
  sayFirst: string;
  sayThen: string;
  hopFirst: string;
  hopThen: string;
  retry: string;
  fix: string;
  test: string;
  saving: string;
  complete: string;
}

export interface StoryLogicStep {
  icon: string;
  label: string;
  order: string;
}

export interface StoryPage {
  emoji: string;
  title: string;
  body: string;
  speaker?: string;
  dialogue?: string;
  visualSpeech?: string;
  /** Reuse one of the five tested Tiny Star Village story compositions. */
  scene?: 1 | 2 | 3 | 4 | 5;
  /** Optional two-block visual sentence for the program scene. */
  blocks?: [string, string];
  /** A direction sentence shown as start, arrow, and target for spatial missions. */
  direction?: {
    arrow: 'left' | 'right';
    target: string;
  };
}

export interface StoryMission {
  mode: 'observe-fix' | 'observe-only' | 'complete' | 'manual-fix' | 'personal-ship';
  lessonId: string;
  hero: {
    name: string;
    role: string;
    asset: string;
  };
  /** Chapter ships celebrate; an Explore hook uses quieter in-card feedback. */
  celebrate?: boolean;
  eyebrow: string;
  title: string;
  storyPages: StoryPage[];
  partnerLine: string;
  mission: string;
  question: string;
  choices: StoryMissionChoice[];
  retry: string;
  successTitle: string;
  success: string;
  fixTitle: string;
  fixPrompt: string;
  workspaceIntro: string;
  fixChoices: StoryMissionChoice[];
  fixRetry: string;
  coach: StoryCoachCopy;
  logicSteps: StoryLogicStep[];
  logicWhy: string;
  completionTitle: string;
  completion: string;
  completionSteps: StoryLogicStep[];
  completionWhy: string;
  next: string;
}

const STORY_MISSIONS: Record<string, StoryMission> = {
  'tsv-s1-a1-h': {
    mode: 'observe-fix',
    lessonId: 'tsv-s1-a1-h',
    hero: {
      name: 'Lumilo',
      role: 'Morning Light Keeper',
      asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
    },
    eyebrow: 'Tiny Star Village · Chapter 1',
    title: 'A strange good morning',
    storyPages: [
      {
        emoji: '🌟👋',
        title: 'Meet Lumi, your morning-light friend',
        body: 'This is Lumilo—Lumi to friends. Lumi is Tiny Star Village’s first Morning Light Keeper. Every morning begins at Lumi’s little window.',
        speaker: 'Lumilo',
        dialogue: 'Hi! Call me Lumi. Will you help me wake the village?',
      },
      {
        emoji: '🏘️✨🔔',
        title: 'Lumi starts the morning light',
        body: 'When Lumi hops awake, one wake-up star appears. Lumi says “Morning!” next, and the star travels to the Bell Tower. Other homes send their stars too, and the tower joins them into warm morning light.',
        speaker: 'Lumilo',
        dialogue: 'My star goes first. Then the other homes join in!',
      },
      {
        emoji: '🌑🔕',
        title: 'The light chain stopped today',
        body: 'Today the tower heard “Morning!”, but no wake-up star arrived first. It paused the light chain, so the bell stayed quiet and the village stayed dim.',
        speaker: 'Cloud Bear',
        dialogue: 'The tower heard a hello. Where is the wake-up star?',
      },
      {
        emoji: '⭐⏰',
        title: 'The program mixed up the story',
        body: 'At the window, Lumi called “Morning!” from a dream—and only then hopped awake. The blocks run from left to right, so the mixed-up order made the morning happen backwards.',
        speaker: 'Lumilo',
        dialogue: 'My steps are both here. Can you put them in the right order?',
      },
      {
        emoji: '🤝🧩✨',
        title: 'Why the village needs a Story Partner',
        body: 'The village friends can see the darkness, but you can read the glowing blocks and change their order. Fix this first link to light Lumi’s window and send the tower its first morning clue.',
        speaker: 'Lumilo',
        dialogue: 'Will you help my wake-up star reach the Bell Tower?',
      },
    ],
    partnerLine: "Lumilo needs a Story Partner. That's you!",
    mission:
      'Help Lumi send the first wake-up star: press Go, find what happens first, then make Lumi hop awake before saying “Morning!”',
    question: 'What happens first?',
    choices: [
      { id: 'say-first', label: 'It says ‘Morning!’ first', correct: true },
      { id: 'hop-first', label: 'It hops awake first', correct: false },
    ],
    retry: 'Almost! Watch the speech bubble and the jump once more.',
    successTitle: 'You found the mixed-up step! ⭐',
    success: 'Lumi talks before waking up. The order of the blocks makes the story feel strange.',
    fixTitle: 'Now fix the morning',
    fixPrompt: 'Which order will wake Lumi properly?',
    workspaceIntro: 'You found the mixed-up order. Now repair the real blocks.',
    fixChoices: [
      { id: 'hop-then-say', label: '🦘 Hop awake → 💬 Say “Morning!”', correct: true },
      { id: 'say-then-hop', label: '💬 Say “Morning!” → 🦘 Hop awake', correct: false },
    ],
    fixRetry: 'That is the mixed-up order we just saw. Try the other plan.',
    coach: {
      ready: 'Press Go. Watch only two things: the speech bubble and the hop.',
      watch: 'Watch closely… which block lights up first?',
      sayFirst: 'First, I say “Morning!” 💬',
      sayThen: 'Then, I say “Morning!” 💬',
      hopFirst: 'First, I hop awake! 🦘',
      hopThen: 'Then, I hop awake! 🦘',
      retry: 'Let’s watch again. Look for the speech bubble first.',
      fix: 'Choose the new order: hop awake first, then say hello.',
      test: 'Your blocks changed! Press Go to test the new morning.',
      saving: 'The morning worked! I am saving your real blocks…',
      complete: 'You repaired the morning chain! The wake-up star reached the Bell Tower.',
    },
    logicSteps: [
      { icon: '💬', label: 'Morning!', order: 'First' },
      { icon: '🦘', label: 'Hop', order: 'Then' },
    ],
    logicWhy: 'The speech block is on the left, so it runs first.',
    completionTitle: 'First mission complete! 🌅',
    completion:
      'You changed the real program and tested it. Lumi now wakes first, then sends the wake-up star to the Bell Tower.',
    completionSteps: [
      { icon: '🦘', label: 'Hop', order: 'First' },
      { icon: '💬', label: 'Morning!', order: 'Then' },
    ],
    completionWhy: 'The Hop block is now on the left, so Lumi wakes up first.',
    next: 'Lumi’s window glows. The Bell Tower now has the first of six morning clues.',
  },
  'tsv-s1-a1-b': {
    mode: 'complete',
    lessonId: 'tsv-s1-a1-b',
    hero: {
      name: 'Lumilo',
      role: 'Morning Light Keeper',
      asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
    },
    eyebrow: 'Tiny Star Village · Chapter 1 · Mission 2',
    title: 'Build Lumi’s morning',
    storyPages: [
      {
        emoji: '🌟👋',
        title: 'Lumi remembers you',
        body: 'Yesterday you spotted the mixed-up morning. Today Lumi wants to build the right order with you—not copy a finished program.',
        speaker: 'Lumilo',
        dialogue: 'You found my first step. Will you build it with me?',
        scene: 1,
      },
      {
        emoji: '🚩🧩',
        title: 'Only Start is ready',
        body: 'The green flag is waiting, but Lumi has no actions yet. The Bell Tower needs one clear morning sentence from left to right.',
        speaker: 'Lumilo',
        dialogue: 'Start is here. What should I do first?',
        scene: 3,
      },
      {
        emoji: '🦘💬',
        title: 'Build the two morning steps',
        body: 'Add Hop first and set it to 1, then Say “Morning!”, and finish with End. Press Go only after the blocks tell the whole morning sentence.',
        speaker: 'Lumilo',
        dialogue: 'First I hop awake. Then I say “Morning!”',
        scene: 4,
        blocks: ['🦘 Hop', '💬 Say'],
      },
    ],
    partnerLine: 'Lumi remembers your first repair. Now you are the builder!',
    mission:
      'Start is ready. Add Hop and set it to 1, then add Say “Morning!” and End. Press Go to test your own program.',
    question: 'Which action belongs directly after Start?',
    choices: [],
    retry: 'Look at the two picture cards: Lumi must wake before talking.',
    successTitle: 'Your program is ready to test! ⭐',
    success: 'You built the morning sentence yourself. Now run it and watch the order.',
    fixTitle: 'Finish the block sentence',
    fixPrompt: 'Close this card and add the real blocks: blue Hop 1 → purple Say → red End.',
    workspaceIntro: 'Lumi still needs you to build the program in the real workspace.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Build time: add blue Hop 1, purple Say, then red End after Start.',
      watch: 'Watch your own blocks run from left to right.',
      sayFirst: 'I talked before waking. Move Hop before Say.',
      sayThen: 'Then, I say “Morning!” 💬',
      hopFirst: 'First, I hop awake! 🦘',
      hopThen: 'Hop came after Say. Put Hop first.',
      retry: 'The morning sentence is not finished yet. Add Hop, Say, and End.',
      fix: 'Build the real blocks in the workspace—no answer button will do it for you.',
      test: 'Your block sentence is complete. Press Go to test it!',
      saving: 'It worked! I am saving the blocks you built…',
      complete: 'You built and tested Lumi’s morning all by yourself!',
    },
    logicSteps: [
      { icon: '🚩', label: 'Start', order: 'Ready' },
      { icon: '🧩', label: 'Add actions', order: 'Build' },
    ],
    logicWhy: 'The program is incomplete until the action blocks are attached to Start.',
    completionTitle: 'Mission 2 complete! 🌟',
    completion:
      'You added real blocks, ran the program, and saved it. Lumi hops awake before saying “Morning!”.',
    completionSteps: [
      { icon: '🦘', label: 'Hop', order: 'First' },
      { icon: '💬', label: 'Morning!', order: 'Then' },
    ],
    completionWhy: 'You placed Hop directly after Start, so Lumi wakes before talking.',
    next: 'A second wake-up star glows. Next, you will debug a morning that is backwards again.',
  },
  'tsv-s1-a1-d': {
    mode: 'manual-fix',
    lessonId: 'tsv-s1-a1-d',
    hero: {
      name: 'Lumilo',
      role: 'Morning Light Keeper',
      asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
    },
    eyebrow: 'Tiny Star Village · Chapter 1 · Mission 3',
    title: 'The morning flipped backwards',
    storyPages: [
      {
        emoji: '🌟🌬️',
        title: 'Lumi kept your morning program',
        body: 'Your last program made Lumi hop awake before saying “Morning!”. The second wake-up star reached the Bell Tower, and Lumi saved the four blocks.',
        speaker: 'Lumilo',
        dialogue: 'I remember: wake first, talk next.',
        scene: 1,
      },
      {
        emoji: '🌬️🧩',
        title: 'A breeze flipped two blocks',
        body: 'A window breeze did not add or remove anything. It only pushed Say in front of Hop, so the same morning actions now tell the story backwards.',
        speaker: 'Lumilo',
        dialogue: 'All my blocks are here, but are they in the right places?',
        scene: 4,
        blocks: ['💬 Say', '🦘 Hop'],
      },
      {
        emoji: '👀↔️',
        title: 'Test, then move only one block',
        body: 'Press Go and watch the first action. Then drag the blue Hop block to the left of purple Say. Keep Start, Hop, Say, and End—change only their order.',
        speaker: 'Lumilo',
        dialogue: 'Do not give me a new block. Put my two actions back in order.',
        scene: 4,
        blocks: ['🦘 Hop', '💬 Say'],
      },
    ],
    partnerLine: 'You built this sentence before. Now you can debug it!',
    mission:
      'Press Go once. Then drag the existing Hop before Say without adding or deleting a block. Press Go again to test your fix.',
    question: 'Which action happened first in the backwards program?',
    choices: [],
    retry: 'Watch the speech bubble and hop again.',
    successTitle: 'You found the flipped blocks! ⭐',
    success: 'The program still has the right four blocks, but Say runs before Hop.',
    fixTitle: 'Repair the same four blocks',
    fixPrompt:
      'Close this card. Drag blue Hop to the left of purple Say. Do not add or remove anything.',
    workspaceIntro:
      'You saw the backwards morning. Fix it by reordering the existing blocks in the real workspace.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Press Go first. Watch whether I talk or hop before anything else.',
      watch: 'Watch closely… which of my two action blocks lights up first?',
      sayFirst: 'First, I say “Morning!” The breeze flipped my story. 💬',
      sayThen: 'Then, I say “Morning!” 💬',
      hopFirst: 'First, I hop awake! 🦘',
      hopThen: 'Then, I hop. Drag this Hop before Say.',
      retry: 'Now drag the existing blue Hop left of purple Say. Keep all four blocks.',
      fix: 'Move only Hop. Do not add a new action.',
      test: 'The same four blocks are in the right order. Press Go to test!',
      saving: 'The repaired order worked. I am saving the same four blocks…',
      complete: 'You debugged the backwards morning without adding an answer!',
    },
    logicSteps: [
      { icon: '💬', label: 'Morning!', order: 'First now' },
      { icon: '🦘', label: 'Hop', order: 'Then now' },
    ],
    logicWhy: 'The breeze changed only the order: Say is left of Hop.',
    completionTitle: 'Mission 3 complete! 🔧',
    completion:
      'You kept Start, Hop, Say, and End, moved the existing Hop before Say, ran the repaired program, and saved it.',
    completionSteps: [
      { icon: '🦘', label: 'Hop', order: 'First' },
      { icon: '💬', label: 'Morning!', order: 'Then' },
    ],
    completionWhy: 'The operation set stayed the same; only Hop and Say changed places.',
    next: 'The third wake-up star glows. Next, you will choose a village friend and make your own wake-up story.',
  },
  'tsv-s1-a1-s': {
    mode: 'personal-ship',
    lessonId: 'tsv-s1-a1-s',
    hero: {
      name: 'Lumilo',
      role: 'Morning Light Keeper',
      asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
    },
    eyebrow: 'Tiny Star Village · Chapter 1 · Mission 4',
    title: 'Make the morning yours',
    storyPages: [
      {
        emoji: '🌟🔧',
        title: 'Your repaired morning still works',
        body: 'You kept the same four blocks and repaired their order. Lumi now hops awake before speaking, and the Bell Tower knows the morning has begun.',
        speaker: 'Lumilo',
        dialogue: 'You fixed my steps. Now what should my morning sound like?',
        scene: 1,
      },
      {
        emoji: '💬✨',
        title: 'One story can have different greetings',
        body: 'The order stays clear: Start, Hop, Say, End. But the purple Say block can carry your choice—“Good morning, village!”, “I’m awake!”, or “Let’s go!”.',
        speaker: 'Lumilo',
        dialogue: 'Choose the words that fit your wake-up story.',
        scene: 4,
        blocks: ['🦘 Hop', '💬 Your words'],
      },
      {
        emoji: '👉💬▶️',
        title: 'Choose, run, and save your version',
        body: 'Tap the purple Say block, choose one greeting, then close the editor and press Go. Your choice must stay inside the saved program.',
        speaker: 'Lumilo',
        dialogue: 'I will say the words you really put in my block!',
        scene: 4,
        blocks: ['🦘 Hop', '💬 Choose'],
      },
    ],
    partnerLine: 'The working order is ready. You are the story maker now!',
    mission:
      'Tap the purple Say block and choose “Good morning, village!”, “I’m awake!”, or “Let’s go!”. Keep Start → Hop 1 → Say → End, then press Go.',
    question: 'Which greeting will make this your version?',
    choices: [],
    retry: 'Tap the purple Say block and choose one of the three greeting cards.',
    successTitle: 'Your greeting is ready! ⭐',
    success: 'The same logic now tells your own wake-up story.',
    fixTitle: 'Choose your greeting',
    fixPrompt:
      'Close this card. Tap purple Say, choose one greeting card, then press Go to run your saved version.',
    workspaceIntro:
      'The block order already works. Personalize the real Say block so the saved program carries your choice.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Tap purple Say and choose your greeting before you press Go.',
      watch: 'Listen and watch: did I use the greeting inside your block?',
      sayFirst: 'My greeting came before the hop. Keep Hop first.',
      sayThen: 'Then I say the words you chose! 💬',
      hopFirst: 'First, I hop awake! 🦘',
      hopThen: 'Keep Hop directly after Start.',
      retry: 'Choose a greeting card in the purple Say block, then try again.',
      fix: 'Make a real choice in the Say block—there is no answer button.',
      test: 'Your greeting is inside the program. Press Go to test your story!',
      saving: 'Your version worked. I am saving your chosen words…',
      complete: 'Your own wake-up greeting is saved in the real program!',
    },
    logicSteps: [
      { icon: '🦘', label: 'Hop', order: 'First' },
      { icon: '💬', label: 'Choose words', order: 'Then' },
    ],
    logicWhy: 'The order stays understandable while the Say text changes the story result.',
    completionTitle: 'Chapter 1 complete! 🌅',
    completion:
      'You kept the working order, changed the real Say block, ran your version, and saved your chosen greeting.',
    completionSteps: [
      { icon: '🦘', label: 'Hop', order: 'First' },
      { icon: '💬', label: 'My greeting', order: 'Then' },
    ],
    completionWhy: 'The saved Say block contains the greeting you chose, not the starter words.',
    next: 'The fourth wake-up star glows. Its light reveals Cloud Bear walking the wrong way on the village path.',
  },
  'tsv-s1-a2-h': {
    mode: 'observe-only',
    lessonId: 'tsv-s1-a2-h',
    hero: {
      name: 'Tuan Tuan',
      role: 'Cloud-path Maker',
      asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
    },
    celebrate: false,
    eyebrow: 'Tiny Star Village · Chapter 2 · Mission 5',
    title: 'Which way is the plaza?',
    storyPages: [
      {
        emoji: '☁️🐻',
        title: 'Meet Tuan Tuan, the cloud-path maker',
        body: 'Your fourth wake-up star lights a soft cloud path. This is Tuan Tuan, the friend who shapes the village paths and always carries one bright idea.',
        speaker: 'Tuan Tuan',
        dialogue: 'Hello! The morning light showed me the way… I think.',
        visualSpeech: "Hi! I'm Tuan Tuan!",
        scene: 1,
      },
      {
        emoji: '☁️⭐',
        title: 'The plaza star is on the right',
        body: 'Tuan Tuan starts in the middle. The glowing plaza star is three steps to the right, but the program arrow points three steps left.',
        speaker: 'Tuan Tuan',
        dialogue: 'I am here. The plaza star is over there. Which way should I face?',
        visualSpeech: 'The plaza is over there!',
        scene: 2,
        direction: { arrow: 'right', target: 'Plaza star' },
      },
      {
        emoji: '👉▶️',
        title: 'Point first, then press Go',
        body: 'Point to the plaza star before you run the program. Then press Go and watch Tuan Tuan move left. Did Tuan Tuan finish closer to the star or farther away?',
        speaker: 'Tuan Tuan',
        dialogue: 'Do not fix my arrow yet. Watch where it takes me!',
        visualSpeech: 'Watch my Left arrow!',
        scene: 3,
        direction: { arrow: 'left', target: 'Plaza star' },
        blocks: ['⬅️ Left 3', '⭐ Plaza'],
      },
    ],
    partnerLine: 'Tuan Tuan needs a careful path watcher. That is you!',
    mission:
      'Point to the plaza star on the right. Press Go without changing any block, then choose whether Tuan Tuan finished closer or farther away.',
    question: 'After moving left, is Tuan Tuan closer to the plaza star or farther away?',
    choices: [
      { id: 'closer', label: '⭐ Closer to the plaza', correct: false },
      { id: 'farther', label: '☁️ Farther from the plaza', correct: true },
    ],
    retry: 'Look at the gap between Tuan Tuan and the star. It grew wider.',
    successTitle: 'You read the path! ⭐',
    success: 'Tuan Tuan moved left while the plaza star stayed on the right, so the gap grew.',
    fixTitle: 'Story Hook complete',
    fixPrompt: 'Keep the Left block for now. You will choose a new arrow in the next mission.',
    workspaceIntro: 'This Hook is for watching and explaining. Do not repair the blocks yet.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Point to the plaza star on the right, then press Go. Do not change the blocks.',
      watch: 'Watch the gap between me and the plaza star as I move left.',
      sayFirst: 'The plaza star stays on the right.',
      sayThen: 'The plaza star stays on the right.',
      hopFirst: 'I am moving left, away from the star.',
      hopThen: 'I am moving left, away from the star.',
      retry: 'Look again: the star is on the right and I move left.',
      fix: 'No fix yet. Tell me what happened to the gap.',
      test: 'Keep the starter unchanged and press Go once.',
      saving: 'No program change to save—this Hook checks what you observed.',
      complete: 'You saw the gap grow and correctly chose farther away!',
    },
    logicSteps: [
      { icon: '☁️', label: 'Tuan Tuan starts', order: 'Middle' },
      { icon: '⬅️', label: 'Moves 3 left', order: 'Then' },
      { icon: '⭐', label: 'Plaza stays right', order: 'Target' },
    ],
    logicWhy: 'Moving left while the target stays right makes the distance larger.',
    completionTitle: 'Story Hook complete · You spotted the wrong way!',
    completion:
      'You kept the starter scene unchanged, ran it to the end, and noticed that Tuan Tuan finished farther from the plaza star.',
    completionSteps: [
      { icon: '⭐', label: 'Point to target', order: 'Before Go' },
      { icon: '⬅️', label: 'Watch Left 3', order: 'Run' },
      { icon: '📏', label: 'Farther away', order: 'Observe' },
    ],
    completionWhy: 'Tuan Tuan moved from grid 8 to grid 5 while the plaza star stayed at grid 11.',
    next: 'Carry the Left and Right arrow cards into A2-B, where you will choose the arrow that reaches the plaza.',
  },
  'tsv-s1-a2-b': {
    mode: 'complete',
    lessonId: 'tsv-s1-a2-b',
    hero: {
      name: 'Tuan Tuan',
      role: 'Cloud-path Maker',
      asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
    },
    eyebrow: 'Tiny Star Village · Chapter 2 · Mission 6',
    title: 'Choose one arrow for the plaza',
    storyPages: [
      {
        emoji: '☁️🐻',
        title: 'Tuan Tuan remembers your careful watching',
        body: 'This is Tuan Tuan, the cloud-path maker you met on the glowing path. You watched the Left arrow carry Tuan Tuan farther from the plaza, and now Tuan Tuan is ready to follow your direction.',
        speaker: 'Tuan Tuan',
        dialogue: 'You saw where I went. Will you choose my next arrow?',
        visualSpeech: 'Thank you for watching my path!',
        scene: 1,
      },
      {
        emoji: '☁️➡️⭐',
        title: 'The plaza star is three steps right',
        body: 'Tuan Tuan starts in the middle at grid 8. The plaza star waits at grid 11. One three-step direction block can join Start to End and carry Tuan Tuan exactly to the star.',
        speaker: 'Tuan Tuan',
        dialogue: 'The star is on my right. Which arrow points toward it?',
        visualSpeech: 'My plaza star is over there!',
        scene: 2,
        direction: { arrow: 'right', target: 'Plaza star' },
      },
      {
        emoji: '🚩🧩🏁',
        title: 'Put one real arrow before End',
        body: 'Start and End are already connected. In the real workspace, open Motion and tap Left or Right. Your direction snaps before End with three steps ready. Press Go and see whether Tuan Tuan reaches the star.',
        speaker: 'Tuan Tuan',
        dialogue: 'Choose only one arrow. The path will show whether it points toward my star.',
        visualSpeech: 'One arrow, then Go!',
        scene: 4,
        blocks: ['🧩 Choose arrow', '🏁 End'],
      },
    ],
    partnerLine: 'You observed the wrong way. Now build the path that reaches the plaza!',
    mission:
      'Open Motion and add one direction block between Start and End. The block is already set to 3 steps. Press Go and help Tuan Tuan reach the plaza star on the right.',
    question: 'Which arrow points from Tuan Tuan toward the plaza star?',
    choices: [],
    retry: 'Look at the stage: the plaza star waits on the right.',
    successTitle: 'Your arrow is ready to test! ⭐',
    success: 'The real program now has one direction between Start and End.',
    fixTitle: 'Build the path in the real workspace',
    fixPrompt:
      'Close this card. Open Motion and tap one arrow. It will snap before End with 3 steps ready.',
    workspaceIntro:
      'No answer button can build this path. Add the real direction block between Start and End.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Open Motion and choose one arrow. The plaza star is on the right.',
      watch: 'Watch whether I finish on the plaza star at grid 11.',
      sayFirst: 'The plaza stays on the right.',
      sayThen: 'The plaza stays on the right.',
      hopFirst: 'I moved along your arrow.',
      hopThen: 'I moved along your arrow.',
      retry: 'That path did not reach the star. Keep one arrow between Start and End.',
      fix: 'Build with a real Motion block—there is no answer button.',
      test: 'Your Right 3 block points to the star. Press Go to test the path!',
      saving: 'Tuan Tuan reached grid 11. I am saving your real direction block…',
      complete: 'Your saved Right 3 path carried Tuan Tuan to the plaza star!',
    },
    logicSteps: [
      { icon: '🚩', label: 'Start', order: 'Ready' },
      { icon: '🧩', label: 'Choose arrow', order: 'Build' },
      { icon: '🏁', label: 'End', order: 'Ready' },
    ],
    logicWhy: 'The empty space between Start and End needs one direction toward the target.',
    completionTitle: 'Mission 6 complete! ☁️⭐',
    completion:
      'You added a real Right 3 block, saved it, and ran the whole program. Tuan Tuan travelled from grid 8 to the plaza star at grid 11.',
    completionSteps: [
      { icon: '🚩', label: 'Start', order: 'First' },
      { icon: '➡️', label: 'Right 3', order: 'Then' },
      { icon: '🏁', label: 'End', order: 'Finish' },
    ],
    completionWhy: 'Right 3 adds three grid steps: 8 + 3 = 11, exactly where the plaza star waits.',
    next: 'Tuan Tuan arrives at the plaza. Next, a mixed-up arrow will test whether you can debug the same route.',
  },
  'tsv-s1-a2-d': {
    mode: 'manual-fix',
    lessonId: 'tsv-s1-a2-d',
    hero: {
      name: 'Tuan Tuan',
      role: 'Cloud-path Maker',
      asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
    },
    eyebrow: 'Tiny Star Village · Chapter 2 · Mission 7',
    title: 'Tuan Tuan walked the wrong way again',
    storyPages: [
      {
        emoji: '☁️🐻',
        title: 'Tuan Tuan has one mixed-up arrow',
        body: 'Tuan Tuan kept the three steps that reached the plaza. But a gust turned the arrow around. The plaza star is still on the right, while the path now points left.',
        speaker: 'Tuan Tuan',
        dialogue: 'My path has three steps, but is my arrow facing the star?',
        visualSpeech: 'Please spot the mixed-up arrow!',
        scene: 1,
      },
      {
        emoji: '⬅️☁️🐻⭐',
        title: 'Run the wrong path once',
        body: 'Press Go and watch carefully. Left 3 carries Tuan Tuan from grid 8 to grid 5. The plaza star waits at grid 11, so Tuan Tuan is farther away—not closer.',
        speaker: 'Tuan Tuan',
        dialogue: 'Will Left carry me toward the star or farther away?',
        visualSpeech: 'Watch where I finish.',
        scene: 2,
        direction: { arrow: 'left', target: 'Plaza star' },
      },
      {
        emoji: '🛠️➡️',
        title: 'Swap only the arrow',
        body: 'Tap the Left 3 block in the real workspace. Choose Right. Keep Start, 3, and End exactly as they are—only the arrow changes. Then press Go to test the repaired path.',
        speaker: 'Tuan Tuan',
        dialogue: 'Do not add a block. Just turn my one arrow toward the plaza!',
        visualSpeech: 'Left becomes Right. Three stays three!',
        scene: 4,
        blocks: ['⬅️ Left 3', '➡️ Right 3'],
      },
    ],
    partnerLine: 'You can debug one tiny mistake without changing the whole path!',
    mission:
      'Press Go once to see Left 3 walk away from the plaza. Then tap the Left 3 block and swap it to Right. Keep the number 3, Start, and End unchanged. Press Go again.',
    question: 'Which single part of the path needs to turn around?',
    choices: [],
    retry: 'The plaza star is still on the right. Check which way the one arrow points.',
    successTitle: 'Your repaired arrow is ready to test! ⭐',
    success: 'Only the arrow changed. The three steps, Start, and End stayed in their places.',
    fixTitle: 'Repair one real block',
    fixPrompt: 'Close this card. Tap Left 3 in the real chain, then choose Right. Do not add or remove a block.',
    workspaceIntro: 'No answer button fixes this path. Tap the real Left 3 block and turn only its arrow.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Press Go once. Let’s see where Left 3 finishes.',
      watch: 'Watch whether Left carries me closer to the plaza star.',
      sayFirst: 'The plaza stays on the right.',
      sayThen: 'The plaza stays on the right.',
      hopFirst: 'I followed the arrow.',
      hopThen: 'I followed the arrow.',
      retry: 'I finished at grid 5. Tap Left 3 and turn only the arrow toward the right.',
      fix: 'Tap the real Left 3 block. Keep its 3 and the two other blocks.',
      test: 'Right 3 points to the plaza. Press Go to test your one-block repair!',
      saving: 'Tuan Tuan reached grid 11. I am saving your repaired arrow…',
      complete: 'You changed only Left to Right, and your saved path reached the plaza!',
    },
    logicSteps: [
      { icon: '🚩', label: 'Start', order: 'Keep' },
      { icon: '⬅️', label: 'Turn to Right', order: 'Change' },
      { icon: '🏁', label: 'End', order: 'Keep' },
    ],
    logicWhy: 'The distance was already 3. Only the direction was reversed, so changing Left to Right sends 8 + 3 to the plaza at 11.',
    completionTitle: 'Mission 7 complete! 🛠️⭐',
    completion: 'You ran the wrong path, changed only its arrow from Left 3 to Right 3, saved it, and tested the whole repaired program.',
    completionSteps: [
      { icon: '🚩', label: 'Start', order: 'Keep' },
      { icon: '➡️', label: 'Right 3', order: 'Fixed' },
      { icon: '🏁', label: 'End', order: 'Keep' },
    ],
    completionWhy: 'Only the arrow changed. Right 3 moves from grid 8 to grid 11, where the plaza star waits.',
    next: 'The cloud path is working again. Next, you will make a two-step path of your own.',
  },
  'tsv-s1-a2-s': {
    mode: 'personal-ship',
    lessonId: 'tsv-s1-a2-s',
    hero: {
      name: 'Tuan Tuan',
      role: 'Cloud-path Maker',
      asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
    },
    eyebrow: 'Tiny Star Village · Chapter 2 · Mission 8',
    title: 'Make your own two-step path',
    storyPages: [
      {
        emoji: '☁️🐻⭐', title: 'Choose where the story ends',
        body: 'Tuan Tuan starts at grid 8. Put your home star two spaces left at grid 6 or two spaces right at grid 10.',
        speaker: 'Tuan Tuan', dialogue: 'Which home star should my path reach?', scene: 1,
      },
      {
        emoji: '⬅️⬅️➡️➡️', title: 'Build two real arrows',
        body: 'The star buttons move only the star. You must add two one-step arrows in the real workspace. Both arrows must point toward your chosen star.',
        speaker: 'Tuan Tuan', dialogue: 'Place both arrows yourself, then test my path!', scene: 3,
      },
      {
        emoji: '▶️💾✨', title: 'Run and save your route',
        body: 'Press Go. Your story ships only when the saved four-block program carries Tuan Tuan exactly onto the home star you chose.',
        speaker: 'Tuan Tuan', dialogue: 'I will follow your two steps!', scene: 5,
      },
    ],
    partnerLine: 'Your endpoint choice changes the exact program that can finish this story.',
    mission: 'Choose the left or right home star. Then add exactly two matching one-step arrows between Start and End and press Go.',
    question: 'Where will your two-step story end?', choices: [],
    retry: 'Check your star and both arrows. Two Left steps reach grid 6; two Right steps reach grid 10.',
    successTitle: 'Your two-step path is ready!',
    success: 'The star and the two real arrows tell the same route.',
    fixTitle: 'Build your route',
    fixPrompt: 'Choose an endpoint below the stage, then add both arrows in the workspace.',
    workspaceIntro: 'The endpoint buttons never add answer blocks. Build both one-step arrows yourself.',
    fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Choose a home star, then build two arrows.', watch: 'Watch where both one-step arrows carry me.',
      sayFirst: 'Follow your star.', sayThen: 'Follow your star.', hopFirst: 'First step.', hopThen: 'Second step.',
      retry: 'Your saved arrows must land exactly on your chosen star.', fix: 'Add two matching one-step arrows.',
      test: 'Your star and arrows match. Press Go!', saving: 'You arrived. Saving your personal path…',
      complete: 'Your saved two-step story reached your chosen home star!',
    },
    logicSteps: [
      { icon: '⭐', label: 'Choose star', order: 'First' },
      { icon: '⬅️', label: 'Add arrow 1', order: 'Second' },
      { icon: '⬅️', label: 'Add arrow 2', order: 'Third' },
    ],
    logicWhy: 'Two one-step arrows in the same direction move from grid 8 to grid 6 or grid 10.',
    completionTitle: 'Chapter 2 complete! ☁️⭐',
    completion: 'You chose a meaningful endpoint, authored both real arrows, ran the exact route, and saved your personal story.',
    completionSteps: [
      { icon: '🚩', label: 'Start', order: '1' },
      { icon: '⬅️', label: 'One step', order: '2' },
      { icon: '⬅️', label: 'One step', order: '3' },
      { icon: '🏁', label: 'End', order: '4' },
    ],
    completionWhy: 'The runner finished on the selected star and the same exact program was saved on the server.',
    next: 'Tuan Tuan sees Dot Dot sleeping under the rooftop star. Next, discover what wakes Dot Dot.',
  },
  'tsv-s1-a3-h': {
    mode: 'observe-only', lessonId: 'tsv-s1-a3-h', celebrate: false,
    hero: { name: 'Dot Dot', role: 'Rooftop Star Keeper', asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 3 · Mission 9', title: 'Go cannot wake Dot Dot',
    storyPages: [
      { emoji: '🐱💤', title: 'Dot Dot is sleeping', body: 'Dot Dot sleeps under the rooftop star. The green Go button starts the village, but Dot Dot is waiting for a different start.', speaker: 'Lumilo', dialogue: 'Try Go first. Watch Dot Dot.', scene: 1 },
      { emoji: '▶️😴', title: 'Go makes no response', body: 'Press Go. Dot Dot does not hop or speak because this script does not begin with Start.', speaker: 'Lumilo', dialogue: 'Go did not wake Dot Dot.', scene: 3, blocks: ['▶️ Go', '😴 No response'] },
      { emoji: '👆🐱', title: 'Try your fingertip', body: 'Tap Dot Dot on the stage. On Tap runs only for the character you touched, so Dot Dot hops and says “醒啦”.', speaker: 'Dot Dot', dialogue: 'A gentle tap wakes me!', scene: 5, blocks: ['👆 On Tap', '🦘 Hop + Say'] },
    ],
    partnerLine: 'Your real touch can be the reason a story begins.',
    mission: 'Press Go once and notice Dot Dot stays asleep. Then tap Dot Dot on the stage and watch the different event run.',
    question: 'What woke Dot Dot?', choices: [{ id: 'go', label: '▶️ The Go button', correct: false }, { id: 'tap', label: '👆 My tap on Dot Dot', correct: true }],
    retry: 'Try the two starts again: Go first, then tap Dot Dot.', successTitle: 'You found a different start!', success: 'Only your tap ran Dot Dot’s On Tap script.',
    fixTitle: 'Story Hook complete', fixPrompt: 'Keep the finished On Tap program. You will build a response in the next mission.', workspaceIntro: 'Do not change the blocks. Compare Go with a real tap on Dot Dot.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Press Go first. Watch Dot Dot.', watch: 'Did Go make Dot Dot hop or speak?', sayFirst: 'Dot Dot speaks after a tap.', sayThen: 'Dot Dot speaks after a tap.', hopFirst: 'Dot Dot hops after a tap.', hopThen: 'Dot Dot hops after a tap.', retry: 'Now tap Dot Dot directly on the stage.', fix: 'No fix yet. Name what started the response.', test: 'Press Go, then tap Dot Dot.', saving: 'Your observation is saved with the unchanged program.', complete: 'Your tap—not Go—woke Dot Dot!' },
    logicSteps: [{ icon: '▶️', label: 'Go', order: 'No response' }, { icon: '👆', label: 'Tap Dot Dot', order: 'Starts' }, { icon: '🦘', label: 'Hop and say', order: 'Response' }],
    logicWhy: 'A script beginning with On Tap waits for that character to be touched.', completionTitle: 'Story Hook complete · You discovered On Tap!', completion: 'You ran Go, then used a real stage tap and identified the event that made Dot Dot respond.', completionSteps: [{ icon: '▶️', label: 'Try Go', order: 'First' }, { icon: '👆', label: 'Tap Dot Dot', order: 'Then' }, { icon: '💬', label: 'Name the cause', order: 'Explain' }], completionWhy: 'The exact saved script starts with On Tap, so Go cannot run it.', next: 'Next, add one visible response after On Tap in A3-B.',
  },
  'tsv-s1-a3-b': {
    mode: 'complete', lessonId: 'tsv-s1-a3-b', celebrate: true,
    hero: { name: 'Dot Dot', role: 'Rooftop Star Keeper', asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 3 · Mission 10', title: 'Build a tap response',
    storyPages: [
      { emoji: '👆🧩', title: 'On Tap is waiting', body: 'Dot Dot has an On Tap start and an End, but nothing visible happens between them yet.', speaker: 'Dot Dot', dialogue: 'Give my tap a response!', scene: 1 },
      { emoji: '🦘💬', title: 'Choose a visible response', body: 'Add Hop 1 or a Say block in the real workspace. You may add both, but On Tap must stay first.', speaker: 'Lumilo', dialogue: 'Your block decides what a tap will do.', scene: 3, blocks: ['👆 On Tap', '🦘 Hop 1 or 💬 Say'] },
      { emoji: '🐱👆✨', title: 'Tap Dot Dot to test', body: 'The green Go button cannot start this script. Save your chain, then tap Dot Dot on the stage to run your response.', speaker: 'Dot Dot', dialogue: 'Tap me when your block is ready!', scene: 5 },
    ],
    partnerLine: 'You choose a real response, and your fingertip starts it.',
    mission: 'Add Hop 1 or Say between On Tap and End. Wait for it to save, then tap Dot Dot on the stage.',
    question: 'What should Dot Dot do when tapped?', choices: [], retry: 'Keep On Tap first. Add Hop 1 or a non-empty Say before End.',
    successTitle: 'Your tap response is ready!', success: 'The saved chain starts with On Tap and contains your visible response.',
    fixTitle: 'Build one real response', fixPrompt: 'Close this card. Add Hop 1 or Say in the real chain, then tap Dot Dot.',
    workspaceIntro: 'No answer button builds this scene. Add a real response block between On Tap and End.', fixChoices: [], fixRetry: '',
    coach: {
      ready: 'Add Hop 1 or Say after On Tap.', watch: 'Go cannot start this chain. Tap Dot Dot instead.',
      sayFirst: 'Dot Dot can speak after your tap.', sayThen: 'Your tap started the saved Say block.',
      hopFirst: 'Dot Dot can hop after your tap.', hopThen: 'Your tap started the saved Hop block.',
      retry: 'Keep On Tap first and add one visible response.', fix: 'Add Hop 1 or a non-empty Say before End.',
      test: 'Your tap response is ready. Wait for Saved, then tap Dot Dot!', saving: 'Your real tap ran the response. Saving the exact chain…',
      complete: 'Your saved On Tap story responded to a real tap!',
    },
    logicSteps: [{ icon: '👆', label: 'On Tap', order: 'First' }, { icon: '🦘', label: 'Hop or Say', order: 'Response' }, { icon: '🏁', label: 'End', order: 'Last' }],
    logicWhy: 'On Tap listens for a touch on Dot Dot, then runs the response blocks below it.',
    completionTitle: 'Mission 10 complete! 👆✨', completion: 'You added a visible response, saved it, and used a real stage tap to run it.',
    completionSteps: [{ icon: '👆', label: 'On Tap', order: 'Start' }, { icon: '🦘', label: 'Your response', order: 'Run' }, { icon: '💾', label: 'Saved', order: 'Proof' }],
    completionWhy: 'The server-saved chain kept On Tap first, and the real tap ran your chosen visible response.', next: 'Next, repair a tap script whose event block is wrong.',
  },
  'tsv-s1-a3-d': {
    mode: 'observe-fix', lessonId: 'tsv-s1-a3-d', celebrate: true,
    hero: { name: 'Dot Dot', role: 'Rooftop Star Keeper', asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 3 · Mission 11', title: 'The wrong start hat',
    storyPages: [
      { emoji: '🐱🎩', title: 'Dot Dot has the wrong hat', body: 'The response is ready, but its first block says Start. That hat listens for Go, not a fingertip.', speaker: 'Dot Dot', dialogue: 'Why does your tap do nothing?', scene: 1 },
      { emoji: '👆😴', title: 'Find the bug', body: 'Tap Dot Dot on the real stage first. Nothing happens because the event block does not match your action.', speaker: 'Lumilo', dialogue: 'The response is fine. Check the first block.', scene: 3, blocks: ['🚩 Start', '🦘 Hop 1 → End'] },
      { emoji: '👆🔁', title: 'Swap only the event', body: 'Tap the Start block and replace it with On Tap. Keep Hop 1 and End exactly where they are, then tap Dot Dot again.', speaker: 'Dot Dot', dialogue: 'Give me my tap hat!', scene: 5, blocks: ['👆 On Tap', '🦘 Hop 1 → End'] },
    ],
    partnerLine: 'A matching event makes the same response wake up.',
    mission: 'Tap Dot Dot once to see no response. Replace only Start with On Tap, wait for Saved, then tap Dot Dot again.',
    question: 'Which start listens for your fingertip?', choices: [], retry: 'Tap Dot Dot first. Then change only the first event block.',
    successTitle: 'The event matches!', success: 'Your real tap ran the unchanged Hop response.',
    fixTitle: 'Repair one event block', fixPrompt: 'Close this card, tap Start, and choose On Tap. Do not add or remove response blocks.',
    workspaceIntro: 'First prove the tap does nothing. Then repair only the first block in the real chain.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Tap Dot Dot first. Watch for no response.', watch: 'The tap did nothing. Which first block listens for touch?', sayFirst: 'Keep the response unchanged.', sayThen: 'Keep the response unchanged.', hopFirst: 'Hop is already correct.', hopThen: 'The repaired tap ran Hop.', retry: 'Tap Dot Dot before opening the wrong Start block.', fix: 'Now tap Start and replace it with On Tap.', test: 'Saved? Tap Dot Dot again to test the repair.', saving: 'Your repaired event ran. Saving the exact chain…', complete: 'On Tap now wakes Dot Dot!' },
    logicSteps: [{ icon: '👆', label: 'Tap Dot Dot', order: 'Find bug' }, { icon: '🔁', label: 'Start → On Tap', order: 'Fix one' }, { icon: '👆', label: 'Tap again', order: 'Test' }],
    logicWhy: 'The first event block decides which action starts the response.',
    completionTitle: 'Mission 11 complete! 🎩✨', completion: 'You proved the tap failed, replaced only the wrong event, saved it, and ran the response with a real tap.',
    completionSteps: [{ icon: '👆', label: 'No response', order: 'Before' }, { icon: '🔁', label: 'On Tap', order: 'Repair' }, { icon: '🦘', label: 'Hop runs', order: 'After' }],
    completionWhy: 'The server-saved program is exactly On Tap → Hop 1 → End, and the real tap finished it.', next: 'Next, design your own tap surprise in A3-S.',
  },
  'tsv-s1-a3-s': {
    mode: 'complete', lessonId: 'tsv-s1-a3-s', celebrate: true,
    hero: { name: 'Your secret friend', role: 'Tap Surprise Maker', asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 3 · Mission 12', title: 'My tap surprise',
    storyPages: [
      { emoji: '🌟👀', title: 'Hide a rooftop secret', body: 'The rooftop star needs a surprise that a friend can discover by tapping.', speaker: 'Lumilo', dialogue: 'Choose who will keep your secret.', scene: 1 },
      { emoji: '🐱🐻⭐', title: 'Choose your character', body: 'Pick Dot Dot, Tuan Tuan, or Lumilo. This changes the real saved character but never adds an answer block.', speaker: 'Lumilo', dialogue: 'Your character, your story.', scene: 3 },
      { emoji: '👆✨', title: 'Build one surprise', body: 'Add exactly one Hop 1, Grow 1, or preset Say between On Tap and End. Save it, then tap the character to test.', speaker: 'Your friend', dialogue: 'Can someone discover me?', scene: 5, blocks: ['👆 On Tap', '✨ One response → End'] },
    ],
    partnerLine: 'Your choice changes both the saved character and its secret response.',
    mission: 'Choose one character, add exactly one visible response, wait for Saved, then tap the character.',
    question: 'What will your secret character do?', choices: [], retry: 'Keep On Tap first and End last. Add exactly one Hop 1, Grow 1, or preset Say.',
    successTitle: 'Your tap surprise is ready!', success: 'A real tap ran your saved character and response.',
    fixTitle: 'Build your own surprise', fixPrompt: 'Close this card, choose a character, and add one real response block.',
    workspaceIntro: 'Character buttons change only the saved character. You must add the response in the real editor.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Choose your secret character, then add one response.', watch: 'Tap your chosen character only after the chain is ready.', sayFirst: 'Choose a preset message.', sayThen: 'Your tap revealed the saved message.', hopFirst: 'Hop 1 makes a small surprise.', hopThen: 'Your tap ran the saved hop.', retry: 'Use exactly one Hop 1, Grow 1, or preset Say.', fix: 'Build the response in the real chain.', test: 'Saved? Tap your secret character now.', saving: 'Your tap surprise ran. Saving the exact story…', complete: 'A friend can now discover your tap surprise!' },
    logicSteps: [{ icon: '🐱', label: 'Choose friend', order: 'Mine' }, { icon: '👆', label: 'On Tap', order: 'Start' }, { icon: '✨', label: 'One response', order: 'Secret' }],
    logicWhy: 'On Tap waits for a touch, then runs the one response you authored.',
    completionTitle: 'Chapter 3 complete! 👆✨', completion: 'You chose a character, authored one visible response, saved it, and ran it with a real tap.',
    completionSteps: [{ icon: '🐱', label: 'Character', order: 'Choose' }, { icon: '🧩', label: 'Response', order: 'Build' }, { icon: '👆', label: 'Tap', order: 'Reveal' }],
    completionWhy: 'The server-saved project contains your selected character and exact On Tap surprise, and the real runner finished it.', next: 'Dot Dot spots the breakfast cart. Next, predict how far it should travel.',
  },
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
    mode: 'complete', lessonId: 'tsv-s1-a4-s', celebrate: true,
    hero: { name: 'Breakfast Cart', role: 'Morning Delivery', asset: '/story-blocks/tiny-star-village/props/breakfast-cart.svg' },
    eyebrow: 'Tiny Star Village · Chapter 4 · Mission 16', title: 'Where should breakfast stop?',
    storyPages: [
      { emoji: '🌅🚙', title: 'The village is waking', body: 'Lumilo, Tuan Tuan, and Dot Dot are waiting for one last delivery before they say good morning.', speaker: 'Lumilo', dialogue: 'You can choose where the cart stops.', scene: 1 },
      { emoji: '🍎🎁⭐', title: 'Three useful stops', body: 'Apple breakfast is one space away, gift breakfast is two, and star breakfast is three.', speaker: 'Breakfast Cart', dialogue: 'My number must match your stop.', scene: 3, blocks: ['🚩 Start', '➡️ Right ? → End'] },
      { emoji: '🚙🍽️💬', title: 'Deliver, then listen', body: 'Choose a stop, set the matching number, save, and run. The friends gather beside the delivered breakfast—then all begin speaking at once.', speaker: 'Dot Dot', dialogue: 'Three hellos together are hard to hear!', scene: 5 },
    ],
    partnerLine: 'Your endpoint choice changes which movement number is correct.',
    mission: 'Choose a delivery stop, change Right to its matching 1, 2, or 3, wait for Saved, then run the real cart.',
    question: 'What must match the stop you chose?', choices: [], retry: 'Count spaces from the cart at 4 to your chosen stop.',
    successTitle: 'Your delivery arrived!', success: 'The saved movement number matched your chosen endpoint.',
    fixTitle: 'Make this delivery yours', fixPrompt: 'Close this card, choose a stop, then edit the Right number to match.', workspaceIntro: 'The picker moves only the endpoint. You must change the real movement number yourself.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Choose a stop, then count from space 4.', watch: 'Watch whether the cart reaches your chosen delivery.', sayFirst: 'The endpoint comes first.', sayThen: 'Then the number must match.', hopFirst: 'Keep the cart moving Right.', hopThen: 'Only its distance needs to match.', retry: 'Your stop and movement number do not match yet.', fix: 'Tap the Right number and match your stop.', test: 'Saved? Press Go to deliver.', saving: 'The cart arrived. Saving your personal delivery…', complete: 'Your chosen breakfast is delivered!' },
    logicSteps: [{ icon: '🎯', label: 'Choose stop', order: 'First' }, { icon: '1️⃣2️⃣3️⃣', label: 'Match number', order: 'Build' }, { icon: '▶️', label: 'Deliver', order: 'Run' }], logicWhy: 'A stop one, two, or three spaces right needs the same movement number.',
    completionTitle: 'My delivery arrived! 🚙✨', completion: 'You chose an endpoint, matched its movement value, saved, and ran a visible delivery.', completionSteps: [{ icon: '🎯', label: 'My stop', order: 'Choose' }, { icon: '💾', label: 'Saved', order: 'Prove' }, { icon: '🍽️', label: 'Delivered', order: 'Run' }], completionWhy: 'The server-saved Right distance matched the chosen stop and the real runner arrived there.', next: 'Breakfast is ready. In A5-H, notice why three friends speaking together is hard to understand.',
  },
  'tsv-s1-a5-h': {
    mode: 'observe-only', lessonId: 'tsv-s1-a5-h', celebrate: false,
    hero: { name: 'Lumilo', role: 'First Morning Greeter', asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 5 · Mission 17', title: 'Who is speaking?',
    storyPages: [
      { emoji: '🚙🍽️', title: 'Breakfast has arrived', body: 'Lumilo and Tuan Tuan gather beside breakfast. Both are excited to welcome the morning.', speaker: 'Lumilo', dialogue: 'Let us say good morning!', scene: 1 },
      { emoji: '💬💬', title: 'Two voices start together', body: 'Both unchanged scripts begin at Start and say their greeting straight away.', speaker: 'Tuan Tuan', dialogue: 'Listen for whether there is a first voice.', scene: 3, blocks: ['🚩 Start → Say', '🚩 Start → Say'] },
      { emoji: '⭐➡️🐻', title: 'A clear greeting needs turns', body: 'After you hear both voices together, choose Lumilo to speak first. The next mission will make Tuan Tuan wait.', speaker: 'Lumilo', dialogue: 'First me, then Tuan Tuan.', scene: 5 },
    ],
    partnerLine: 'Two Start scripts can run together, so their Say blocks happen at the same time.',
    mission: 'Press Go without changing either script. Listen to both greetings, then choose who should speak first.',
    question: 'Both friends spoke together. Who should take the first turn?', choices: [{ id: 'lumilo', label: 'Lumilo first', correct: true }, { id: 'tuan-tuan', label: 'Tuan Tuan first', correct: false }],
    retry: 'Press Go first and notice that both speech bubbles appear together.', successTitle: 'You found the speaking problem!', success: 'Both scripts started together. Lumilo can speak first, then Tuan Tuan can wait.',
    fixTitle: 'Story Hook complete', fixPrompt: 'Keep both programs unchanged. In A5-B you will add a wait for the second turn.', workspaceIntro: 'Do not edit the blocks. Run both Start → Say → End scripts and listen.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Press Go and listen to both friends.', watch: 'Both Say blocks started together.', sayFirst: 'The voices overlap because neither friend waits.', sayThen: 'The voices overlap because neither friend waits.', hopFirst: 'Keep both scripts unchanged.', hopThen: 'Keep both scripts unchanged.', retry: 'Run first, then choose Lumilo for the first turn.', fix: 'Lumilo first; Tuan Tuan can wait in the next mission.', test: 'Run the unchanged greetings.', saving: 'Saving your observation with both scripts unchanged…', complete: 'You noticed the overlap and chose a clear first speaker.' },
    logicSteps: [{ icon: '▶️', label: 'Run together', order: 'Listen' }, { icon: '💬💬', label: 'Hear overlap', order: 'Notice' }, { icon: '⭐', label: 'Lumilo first', order: 'Choose' }],
    logicWhy: 'Both scripts begin with Start and immediately Say, so neither voice waits for the other.',
    completionTitle: 'Story Hook complete · Take turns!', completion: 'You ran the real concurrent scripts, heard both greetings together, and chose Lumilo to speak first.',
    completionSteps: [{ icon: '💬💬', label: 'Together', order: 'Hear' }, { icon: '⭐', label: 'Lumilo', order: 'First' }, { icon: '🐻', label: 'Tuan Tuan', order: 'Then' }],
    completionWhy: 'The exact unchanged two-character programs both reached Say from Start during the same run.', next: 'Next, add Wait so Tuan Tuan speaks after Lumilo.',
  },
  'tsv-s1-a6-h': {
    mode: 'observe-only', lessonId: 'tsv-s1-a6-h', celebrate: false,
    hero: { name: 'Lumilo', role: 'Morning Bell Ringer', asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 6 · Mission 21', title: 'Which step is missing?',
    storyPages: [
      { emoji: '⭐⭐⭐🔔', title: 'The Bell Tower path appears', body: 'The five morning clues join into a path. Lumilo can finally reach the quiet Bell Tower.', speaker: 'Lumilo', dialogue: 'The morning light is waiting for one last step.', scene: 1 },
      { emoji: '➡️❓🔔', title: 'The middle footprint flickers', body: 'The unchanged program walks to the tower and makes the bell sound, but Lumilo never jumps up to touch it.', speaker: 'Tuan Tuan', dialogue: 'A bell should not ring by itself!', scene: 3, blocks: ['🚩 Start → ➡️ Right 3', '❓ Missing step → 💥 Pop → End'] },
      { emoji: '➡️⬆️🔔', title: 'Find the missing action', body: 'Run the strange story first. Then choose the action that belongs between walking and ringing.', speaker: 'Dot Dot', dialogue: 'Walk, jump, then ring.', scene: 5 },
    ],
    partnerLine: 'The program has a beginning and an ending, but its missing middle action breaks the visible cause.',
    mission: 'Press Go without changing the blocks. Watch Lumilo walk and hear the bell ring without a jump, then choose the missing middle action.',
    question: 'What belongs between Right 3 and Pop?', choices: [{ id: 'hop', label: 'Hop', correct: true }, { id: 'say', label: 'Say', correct: false }, { id: 'wait', label: 'Wait', correct: false }],
    retry: 'Run first, then act out walk → ? → ring. Lumilo must reach up to touch the bell.',
    successTitle: 'You found the missing middle step!', success: 'Hop belongs after the walk and before the bell sound.',
    fixTitle: 'Story Hook complete', fixPrompt: 'Keep the strange program unchanged. In A6-B you will add Hop between Right 3 and Pop.', workspaceIntro: 'Do not edit the blocks. Run Start → Right 3 → Pop → End and notice why the bell seems to ring by itself.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Press Go and watch the whole strange story.', watch: 'Lumilo walks, but the bell rings without a jump.', sayFirst: 'First Lumilo walks to the tower.', sayThen: 'Hop must come before the bell sound.', hopFirst: 'Keep the missing-step program unchanged.', hopThen: 'Choose Hop after you run it.', retry: 'Run first, then choose the action that reaches the bell.', fix: 'Hop belongs between Right 3 and Pop.', test: 'Run the unchanged program.', saving: 'Saving your missing-step observation…', complete: 'You identified Hop as the missing middle step.' },
    logicSteps: [{ icon: '➡️', label: 'Walk to tower', order: 'First' }, { icon: '⬆️', label: 'Hop to bell', order: 'Missing' }, { icon: '🔔', label: 'Hear the bell', order: 'Then' }],
    logicWhy: 'Walking reaches the tower, Hop makes contact with the bell, and only then should Pop make the sound.',
    completionTitle: 'Story Hook complete · Hop is missing!', completion: 'You ran the real incomplete sequence, saw the bell ring without contact, and identified Hop as the missing middle action.',
    completionSteps: [{ icon: '▶️', label: 'Run', order: 'Watch' }, { icon: '❓', label: 'Missing cause', order: 'Notice' }, { icon: '⬆️', label: 'Hop', order: 'Choose' }],
    completionWhy: 'The exact unchanged program reached Pop after Right 3 with no Hop block between them.', next: 'Next, add Hop between Right 3 and Pop so Lumilo can really ring the Bell Tower.',
  },
  'tsv-s1-a6-b': {
    mode: 'complete', lessonId: 'tsv-s1-a6-b', celebrate: false,
    hero: { name: 'Lumilo', role: 'Morning Bell Ringer', asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 6 · Mission 22', title: 'Add the missing Hop',
    storyPages: [
      { emoji: '➡️❓🔔', title: 'The route still skips the bell', body: 'Lumilo can walk to the Bell Tower, but the program jumps straight from the walk to the bell sound.', speaker: 'Lumilo', dialogue: 'I found where Hop belongs. Now I need to build it.', scene: 1 },
      { emoji: '➡️⬆️🔔', title: 'Build the whole cause', body: 'Keep Start, Right 3, Pop, and End. Add exactly Hop 1 between Right 3 and Pop so Lumilo reaches the bell before it sounds.', speaker: 'Tuan Tuan', dialogue: 'Walk, hop, then ring!', scene: 3, blocks: ['🚩 Start → ➡️ Right 3', '⬆️ Hop 1 → 💥 Pop → End'] },
      { emoji: '💾▶️🌅', title: 'Save and test the route', body: 'Save the real program, predict walk → hop → ring, then press Go and watch the whole chain.', speaker: 'Dot Dot', dialogue: 'Every visible result now has a cause.', scene: 5 },
    ],
    partnerLine: 'Hop connects reaching the tower to making the bell sound.',
    mission: 'Add exactly Hop 1 between Right 3 and Pop. Save, predict walk → hop → ring, then press Go.',
    question: 'What should happen after Lumilo walks to the tower?', choices: [{ id: 'hop', label: 'Hop to the bell', correct: true }, { id: 'pop', label: 'Ring before reaching it', correct: false }],
    retry: 'Follow the story cause: walk to the tower, hop up, then ring.',
    successTitle: 'The route has its missing cause!', success: 'Hop now connects the walk to the bell sound.',
    fixTitle: 'Build the Bell Tower route', fixPrompt: 'Add only Hop 1 between Right 3 and Pop.', workspaceIntro: 'Keep every starter block. Insert Hop 1 in the open middle place.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Find Right 3 and Pop.', watch: 'Watch for walk, hop, then bell.', sayFirst: 'First Lumilo walks to the tower.', sayThen: 'Then the bell can sound.', hopFirst: 'Hop belongs after Right 3.', hopThen: 'Keep Pop after Hop.', retry: 'Put Hop 1 between Right 3 and Pop.', fix: 'Add exactly one Hop 1 block.', test: 'Saved? Predict the three actions, then press Go.', saving: 'Saving the complete Bell Tower route…', complete: 'Lumilo walked, hopped, and rang the bell in order.' },
    logicSteps: [{ icon: '➡️', label: 'Right 3', order: 'Walk' }, { icon: '⬆️', label: 'Hop 1', order: 'Reach' }, { icon: '🔔', label: 'Pop', order: 'Ring' }],
    logicWhy: 'The added Hop gives the bell sound a visible contact cause.',
    completionTitle: 'Logic Build complete · The bell has a cause!', completion: 'You added the real Hop block, saved the exact five-block program, predicted it, and ran the complete route.',
    completionSteps: [{ icon: '🧩', label: 'Hop 1', order: 'Build' }, { icon: '💾', label: 'Route', order: 'Save' }, { icon: '▶️', label: 'Walk-hop-ring', order: 'Run' }],
    completionWhy: 'The saved program is exactly Start → Right 3 → Hop 1 → Pop → End.', next: 'Next, repair one misplaced step in A6-D.',
  },
  'tsv-s1-a6-d': {
    mode: 'manual-fix', lessonId: 'tsv-s1-a6-d', celebrate: false,
    hero: { name: 'Lumilo', role: 'Morning Bell Ringer', asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 6 · Mission 23', title: 'The bell rang first',
    storyPages: [
      { emoji: '🔔➡️⬆️', title: 'The sound arrived before Lumilo', body: 'The Bell Tower made its Pop before Lumilo walked over or hopped up. The sound has raced ahead of its cause.', speaker: 'Lumilo', dialogue: 'The bell cannot ring before I reach it.', scene: 1 },
      { emoji: '➡️⬆️🔔', title: 'Put the cause back in order', body: 'Keep every block. Move only Pop after Right 3 and Hop 1 so the walk and jump happen before the bell sound.', speaker: 'Tuan Tuan', dialogue: 'Walk, hop, then ring.', scene: 3, blocks: ['🚩 Start → ➡️ Right 3', '⬆️ Hop 1 → 💥 Pop → End'] },
      { emoji: '🌅🔔⭐', title: 'The repaired bell sends the next clue', body: 'When the saved full chain runs in order, the Bell Tower answers Lumilo at the right moment and the last sunrise choice is ready.', speaker: 'Lumilo', dialogue: 'Now the sound tells the true story.', scene: 5 },
    ],
    partnerLine: 'Keep every block; repair only the sound block’s place in the story.',
    mission: 'Run the unchanged bell-first bug. Then move only Pop after Hop 1, save, predict walk → hop → ring, and rerun.',
    question: 'Which action belongs last?',
    choices: [],
    retry: 'Keep all five blocks. The only repair is moving Pop after Hop 1.',
    successTitle: 'The bell follows its cause!', success: 'Lumilo walks, hops, and only then rings the Bell Tower.',
    fixTitle: 'Repair the Bell Tower order', fixPrompt: 'Move only Pop from before Right 3 to after Hop 1.', workspaceIntro: 'Run first. Then drag Pop after Hop 1 without changing another block.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Press Go before you repair the order.', watch: 'Notice the bell sounds before Lumilo moves.', sayFirst: 'First Lumilo must walk to the tower.', sayThen: 'Then Lumilo hops and the bell can ring.', hopFirst: 'Right 3 comes before Hop 1.', hopThen: 'Pop belongs after Hop 1.', retry: 'Move only Pop after Hop 1.', fix: 'Keep every block and repair one position.', test: 'Saved? Predict walk, hop, ring, then press Go.', saving: 'Saving the repaired Bell Tower chain…', complete: 'Lumilo walked, hopped, and rang the bell in the true order.' },
    logicSteps: [{ icon: '➡️', label: 'Right 3', order: 'First' }, { icon: '⬆️', label: 'Hop 1', order: 'Then' }, { icon: '🔔', label: 'Pop', order: 'Last' }],
    logicWhy: 'The bell sound needs the visible causes of reaching the tower and hopping up first.',
    completionTitle: 'Debug complete · The bell tells the truth!', completion: 'You observed the real bug, moved only Pop, saved the exact chain, predicted it, and reran the full story.',
    completionSteps: [{ icon: '👀', label: 'Bell first', order: 'Notice' }, { icon: '🛠️', label: 'Move Pop', order: 'Repair' }, { icon: '▶️', label: 'Walk-hop-ring', order: 'Rerun' }],
    completionWhy: 'The saved program is exactly Start → Right 3 → Hop 1 → Pop → End.', next: 'Next, choose and save your own complete sunrise ending in A6-S.',
  },
  'tsv-s1-a6-s': {
    mode: 'personal-ship', lessonId: 'tsv-s1-a6-s', celebrate: true,
    hero: { name: 'Morning Ringer', role: 'Child-chosen Bell Ringer', asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 6 · Mission 24', title: 'My daylight ending',
    storyPages: [
      { emoji: '⭐⭐⭐🔔', title: 'One last morning choice', body: 'The repaired Bell Tower waits for Lumilo, Tuan Tuan, or Dot Dot to finish the complete morning.', speaker: 'Lumilo', dialogue: 'Who will ring the bell in your ending?', scene: 1 },
      { emoji: '➡️⬆️🔔', title: 'Keep the cause in order', body: 'The chosen ringer must walk three spaces, hop to the bell, and only then make it sound.', speaker: 'Tuan Tuan', dialogue: 'Walk, hop, then ring.', scene: 3, blocks: ['🚩 Start → ➡️ Right 3 → ⬆️ Hop 1', '💥 Pop → ✨ My ending → End'] },
      { emoji: '🌅🌱', title: 'Retell the repaired morning', body: 'Choose a real ending action, wait for Saved, predict the three steps, and run. Then tell how the bell brought daylight back.', speaker: 'Dot Dot', dialogue: 'Later, a quiet seed waits for tomorrow.', scene: 5 },
    ],
    partnerLine: 'The performer and ending can change, but the visible cause stays walk → hop → ring.',
    mission: 'Choose a bell ringer, replace the placeholder ending, save, predict walk → hop → ring, then run and retell.',
    question: 'Why does the bell sound after the Hop?', choices: [{ id: 'cause', label: 'The ringer reached it', correct: true }, { id: 'magic', label: 'It rang by itself', correct: false }],
    retry: 'Point to the three cards: walk, hop, then ring.',
    successTitle: 'Your complete morning is ready!', success: 'Your saved performer followed the cause and added a real ending.',
    fixTitle: 'Make the ending yours', fixPrompt: 'Choose the ringer below the stage, then replace only “Choose our ending” with Hop, Grow, or an allowed short Say.', workspaceIntro: 'Keep Right 3, Hop 1, and Pop in order. Change the real saved performer and ending.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Choose who rings, then choose a real ending.', watch: 'Watch for walk, hop, ring, then your ending.', sayFirst: 'First the ringer walks to the tower.', sayThen: 'Later daylight returns after the bell.', hopFirst: 'Keep Hop before Pop.', hopThen: 'Put your ending after Pop.', retry: 'Remove the placeholder and keep walk → hop → ring.', fix: 'Choose Hop, Grow, or a short ending Say.', test: 'Saved? Predict, then press Go.', saving: 'Saving your ringer and daylight ending…', complete: 'You finished and retold the Tiny Star Village morning.' },
    logicSteps: [{ icon: '➡️', label: 'Walk', order: 'First' }, { icon: '⬆️', label: 'Hop', order: 'Then' }, { icon: '🔔', label: 'Ring', order: 'So' }],
    logicWhy: 'The ringer reaches the tower and touches the bell before Pop makes the sound; the personal ending happens afterward.',
    completionTitle: 'Tiny Star Village has daylight! 🌅', completion: 'You chose the saved ringer and ending, predicted and ran the complete cause, then retold how morning returned.',
    completionSteps: [{ icon: '🎭', label: 'My ringer', order: 'Choose' }, { icon: '💾', label: 'My ending', order: 'Save' }, { icon: '🌅', label: 'Morning', order: 'Retell' }],
    completionWhy: 'The server-saved project keeps Start → Right 3 → Hop 1 → Pop → a child-chosen ending → End.', next: 'Finish our morning, save one Story Passport memory, then return to the Story Library.',
  },
  'tsv-s1-a5-b': {
    mode: 'complete', lessonId: 'tsv-s1-a5-b', celebrate: false,
    hero: { name: 'Tuan Tuan', role: 'Second Morning Greeter', asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 5 · Mission 18', title: 'Wait for your turn',
    storyPages: [
      { emoji: '⭐💬🐻', title: 'Lumilo takes the first turn', body: 'Lumilo is ready to say good morning first. Tuan Tuan wants to answer without covering Lumilo’s words.', speaker: 'Tuan Tuan', dialogue: 'I can wait, then answer!', scene: 1 },
      { emoji: '🚩⏱️💬', title: 'Make a space between voices', body: 'Tuan Tuan’s Start and Say have an open space. Add Wait 5 there so the second greeting begins later.', speaker: 'Lumilo', dialogue: 'My hello, then yours.', scene: 3, blocks: ['🚩 Start → Say → End', '🚩 Start → Wait 5 → Say → End'] },
      { emoji: '▶️⭐➡️🐻', title: 'Predict, save, and listen', body: 'Predict Lumilo first. Save the real programs, press Go, and watch Tuan Tuan answer after the wait.', speaker: 'Tuan Tuan', dialogue: 'Now both greetings can be heard.', scene: 5 },
    ],
    partnerLine: 'Wait pauses only Tuan Tuan’s script, so Lumilo’s greeting begins first.',
    mission: 'Add exactly Wait 5 between Tuan Tuan’s Start and Say, wait for Saved, predict Lumilo first, then press Go.',
    question: 'After Wait 5 is added, who speaks first?', choices: [{ id: 'lumilo', label: 'Lumilo first', correct: true }, { id: 'tuan-tuan', label: 'Tuan Tuan first', correct: false }],
    retry: 'Follow Tuan Tuan’s blocks from Start: Wait must come before Say.', successTitle: 'The greetings take turns!', success: 'Lumilo speaks first and Tuan Tuan answers after Wait 5.',
    fixTitle: 'Build the second turn', fixPrompt: 'Keep Lumilo unchanged. Add only Wait 5 before Tuan Tuan’s Say.', workspaceIntro: 'Open Tuan Tuan’s script and place Wait 5 in the gap before Say.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Find Tuan Tuan’s Start and Say.', watch: 'Listen for Lumilo before Tuan Tuan.', sayFirst: 'Lumilo says good morning first.', sayThen: 'Tuan Tuan waits, then answers.', hopFirst: 'Keep Lumilo unchanged.', hopThen: 'Add Wait 5 only to Tuan Tuan.', retry: 'Wait belongs before Tuan Tuan’s Say.', fix: 'Use Start → Wait 5 → Say → End.', test: 'Saved? Predict Lumilo, then press Go.', saving: 'Saving the two speaking turns…', complete: 'Both friends greeted in a clear order.' },
    logicSteps: [{ icon: '⭐', label: 'Lumilo speaks', order: 'First' }, { icon: '⏱️', label: 'Wait 5', order: 'Pause' }, { icon: '🐻', label: 'Tuan Tuan answers', order: 'Then' }],
    logicWhy: 'Both scripts still start together, but Wait delays only Tuan Tuan’s Say.',
    completionTitle: 'Logic Build complete · Clear turns!', completion: 'You added Wait 5 to the second character, predicted the order, saved, and ran both real scripts.',
    completionSteps: [{ icon: '🧩', label: 'Wait 5', order: 'Build' }, { icon: '💾', label: 'Two scripts', order: 'Save' }, { icon: '▶️', label: 'Lumilo first', order: 'Run' }],
    completionWhy: 'Lumilo kept Start → Say → End while Tuan Tuan used Start → Wait 5 → Say → End.', next: 'Next, repair a greeting that waits too long in A5-D.',
  },
  'tsv-s1-a5-d': {
    mode: 'manual-fix', lessonId: 'tsv-s1-a5-d', celebrate: false,
    hero: { name: 'Tuan Tuan', role: 'Greeting Rhythm Debugger', asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 5 · Mission 19', title: 'The pause is too long',
    storyPages: [
      { emoji: '⭐💬', title: 'Lumilo says good morning', body: 'Lumilo’s greeting is clear, but Tuan Tuan’s answer does not come for a long time.', speaker: 'Lumilo', dialogue: 'Did Tuan Tuan hear me?', scene: 1 },
      { emoji: '⏱️⏱️🐻', title: 'Wait 20 stretches the silence', body: 'Tuan Tuan’s script waits 20 before Say. Run it first and listen to the empty space.', speaker: 'Tuan Tuan', dialogue: 'My answer is getting lost!', scene: 3, blocks: ['⭐ Start → Say → End', '🐻 Start → Wait 20 → Say → End'] },
      { emoji: '🛠️⏱️💬', title: 'Keep the turn, shorten the pause', body: 'Change only Wait 20 to Wait 5. Save and rerun so both greetings are separate but still feel connected.', speaker: 'Lumilo', dialogue: 'A short wait makes room without breaking our greeting.', scene: 5 },
    ],
    partnerLine: 'Wait 20 preserves the order but makes the response feel disconnected.',
    mission: 'Run the Wait 20 bug, choose a shorter pause, then change only its number to 5, save, and rerun.',
    question: 'Tuan Tuan answered much too late. What should change?', choices: [{ id: 'shorter', label: 'Use a shorter wait', correct: true }, { id: 'remove', label: 'Remove the wait', correct: false }],
    retry: 'Keep a wait so the voices do not overlap; shorten only its number.', successTitle: 'You found the timing bug!', success: 'Wait 20 is too long. Wait 5 keeps a clear, connected turn.',
    fixTitle: 'Repair the greeting rhythm', fixPrompt: 'Keep every block and change only Tuan Tuan’s Wait number from 20 to 5.', workspaceIntro: 'Run the long pause first. Then edit only Wait 20 → Wait 5.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Press Go before editing and listen to the long silence.', watch: 'Tuan Tuan answers much too late.', sayFirst: 'Lumilo speaks first.', sayThen: 'Tuan Tuan should answer after a short wait.', hopFirst: 'Keep both scripts and their order.', hopThen: 'Change only Wait 20 to Wait 5.', retry: 'Do not remove Wait; shorten its number.', fix: 'Tap Wait 20 and set it to 5.', test: 'Saved? Press Go and listen again.', saving: 'Saving the repaired greeting rhythm…', complete: 'The two greetings are separate and connected.' },
    logicSteps: [{ icon: '▶️', label: 'Hear Wait 20', order: 'Run' }, { icon: '🛠️', label: 'Change to 5', order: 'Fix' }, { icon: '💬', label: 'Hear both turns', order: 'Rerun' }],
    logicWhy: 'A short wait separates the voices; a very long wait makes the reply feel unrelated.',
    completionTitle: 'Debug complete · Better timing!', completion: 'You observed the long-pause bug, changed only Wait 20 to Wait 5, saved, and reran.',
    completionSteps: [{ icon: '⏱️', label: 'Wait 20', order: 'Observe' }, { icon: '5️⃣', label: 'Wait 5', order: 'Repair' }, { icon: '▶️', label: 'Clear turns', order: 'Verify' }],
    completionWhy: 'The saved programs keep Lumilo first and shorten only Tuan Tuan’s pause.', next: 'Next, choose and save your own multi-character greeting order in A5-S.',
  },
  'tsv-s1-a5-s': {
    mode: 'complete', lessonId: 'tsv-s1-a5-s', celebrate: true,
    hero: { name: 'Dot Dot', role: 'Third Morning Greeter', asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg' },
    eyebrow: 'Tiny Star Village · Chapter 5 · Mission 20', title: 'Make our morning welcome',
    storyPages: [
      { emoji: '⭐🐻🐱', title: 'A third friend arrives', body: 'Dot Dot joins Lumilo and Tuan Tuan beside breakfast. Three friends want a welcome everyone can follow.', speaker: 'Dot Dot', dialogue: 'Can I have a turn too?', scene: 1 },
      { emoji: '1️⃣2️⃣3️⃣', title: 'Choose three clear turns', body: 'Lumilo begins. Tuan Tuan waits 5 and Dot Dot waits 10. Choose a real action for each friend.', speaker: 'Lumilo', dialogue: 'Our waits make the order visible.', scene: 3, blocks: ['⭐ Start → action', '🐻 Wait 5 → action · 🐱 Wait 10 → action'] },
      { emoji: '💾▶️🌅', title: 'Save and perform', body: 'Save all three scripts, predict the order, then run your welcome. The greeting rhythm reveals the path toward the Bell Tower.', speaker: 'Tuan Tuan', dialogue: 'Now the morning has a clear beat!', scene: 5 },
    ],
    partnerLine: 'Different waits let three scripts start together but perform in a clear order.',
    mission: 'Choose one allowed action for each friend, keep waits at 0, 5, and 10, save, predict the order, then press Go.',
    question: 'What makes the three turns stay in order?', choices: [{ id: 'waits', label: 'Different waits', correct: true }, { id: 'together', label: 'All speak together', correct: false }],
    retry: 'Keep Lumilo first, Tuan Tuan at Wait 5, and Dot Dot at Wait 10.', successTitle: 'Your order is clear!', success: 'The three saved scripts perform one after another.',
    fixTitle: 'Make the welcome yours', fixPrompt: 'Choose Say, Hop, or Pop for Lumilo; Say or Hop for the other friends.', workspaceIntro: 'Edit the real action blocks, keep the three waits, then save and run.', fixChoices: [], fixRetry: '',
    coach: { ready: 'Choose each friend’s real action.', watch: 'Watch Lumilo, then Tuan Tuan, then Dot Dot.', sayFirst: 'Lumilo begins without a wait.', sayThen: 'Wait 5 and Wait 10 make later turns.', hopFirst: 'Your action choices make this your version.', hopThen: 'Keep the waits in increasing order.', retry: 'Use one allowed action and the exact wait for each friend.', fix: 'Edit the action blocks, not the story card.', test: 'Saved? Predict the order and press Go.', saving: 'Saving your three-character welcome…', complete: 'Your own greeting order is saved and performed!' },
    logicSteps: [{ icon: '⭐', label: 'No wait', order: 'First' }, { icon: '🐻', label: 'Wait 5', order: 'Second' }, { icon: '🐱', label: 'Wait 10', order: 'Third' }],
    logicWhy: 'The scripts start together, while increasing waits create a stable sequence.',
    completionTitle: 'Personal Ship complete · Our welcome!', completion: 'You chose three real actions, saved the ordered scripts, and ran your own greeting.',
    completionSteps: [{ icon: '🎭', label: 'My actions', order: 'Choose' }, { icon: '💾', label: 'Three scripts', order: 'Save' }, { icon: '▶️', label: 'Clear order', order: 'Run' }],
    completionWhy: 'The server-saved scripts keep 0, 5, and 10 waits while preserving the child’s allowed action choices.', next: 'The greeting rhythm reveals a route. Continue to A6-H and find the missing Bell Tower step.',
  },
};

export function storyMissionFor(lessonId: string | undefined): StoryMission | undefined {
  return lessonId ? STORY_MISSIONS[lessonId] : undefined;
}
