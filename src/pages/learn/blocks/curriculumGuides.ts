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
  // Journey to the West S1/C1-P4 — the chapter's Build 1 (scene-specs
  // JTW-S1-C1-P4). Chinese story world; the child picks the four core blocks
  // from a palette that also offers Grow/Turn distractors.
  'jtw-s1-c1-p4': {
    mode: 'complete',
    lessonId: 'jtw-s1-c1-p4',
    hero: {
      name: '石猴',
      role: '花果山的新朋友',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第一章 · Build 1',
    title: '搭出完整出世链',
    storyPages: [
      {
        emoji: '🍃🐒',
        title: '排练说得通了，舞台还安静着',
        body: '草地上的排练大家都看懂了，可仙石旁的故事舞台还是安静的。石猴的轮廓藏在光后，群猴只能看见一块微微发亮的石头。',
        speaker: '石猴',
        dialogue: '刚才我们用身体演过了。现在要让舞台也照这个顺序做。',
        scene: 1,
      },
      {
        emoji: '🧩🔍',
        title: '候选区里有真有假',
        body: '候选动作里，Grow 会让角色变大，Turn 会让角色转身——它们都能运行，却回答不了眼前的问题。眼前需要的是：提示、出现、第一次动作和问候。',
        speaker: '群猴',
        dialogue: '别急着按开始！先告诉我们：光亮之后会看见什么？',
        scene: 3,
      },
      {
        emoji: '🔔👀🦘💬',
        title: '把四块接在 Start 和 End 之间',
        body: '按故事顺序放好 Chime、Show、Hop 1、Say「你好，我刚刚来到这里。」，每接上一块，舞台就多了一段可以解释的因果。',
        speaker: '石猴',
        dialogue: '先让石头出声，再让大家看见我，然后跳，最后问好。',
        scene: 4,
        blocks: ['🔔 Chime · 👀 Show', '🦘 Hop 1 · 💬 Say'],
      },
    ],
    partnerLine: '四张顺序卡在你手里，石猴等着你把排练搬上真正的舞台！',
    mission:
      'Start 和 hide 已经放好。从候选里选出 Chime、Show、Hop 1、Say「你好，我刚刚来到这里。」按顺序接上，最后以 End 收尾，再按 Go 运行你自己的程序。',
    question: '哪一块必须放在 Hop 和 Say 之前，伙伴才能看见是谁？',
    choices: [],
    retry: '想想排练的约定：还没有 Show，大家看不到石猴。',
    successTitle: '出世链搭好了，可以运行了！⭐',
    success: '你自己搭出了完整的出世顺序。按 Go，看每一步被大家看见。',
    fixTitle: '把出世链搭完整',
    fixPrompt: '关掉这张卡，去真正的工作区放上 Chime → Show → Hop 1 → Say，最后接 End。',
    workspaceIntro: '石猴还在等你把四块动作真正接到程序里。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '搭建时间：在 hide 后面按顺序接上 Chime、Show、Hop 1 和 Say。',
      watch: '看你自己的积木从左到右运行。',
      sayFirst: '问候声先响了，大家却没看见我。把 Show 放到前面。',
      sayThen: '最后，我说「你好，我刚刚来到这里。」💬',
      hopFirst: '大家看见我之后，我先跳一下！🦘',
      hopThen: 'Hop 排在 Say 后面了。先跳，再问好。',
      retry: '出世的句子还没说完。把四块动作都接上，再以 End 收尾。',
      fix: '在真正的工作区里搭积木——没有任何按钮会替你完成。',
      test: '出世链完整了。按 Go 试试你的程序！',
      saving: '成功了！我在保存你搭的积木……',
      complete: '你亲手让大家看见了石猴的出世！',
    },
    logicSteps: [
      { icon: '🔔', label: 'Chime', order: '提示' },
      { icon: '👀', label: 'Show', order: '出现' },
      { icon: '🦘', label: 'Hop 1', order: '动作' },
      { icon: '💬', label: 'Say', order: '问候' },
    ],
    logicWhy: '积木从左到右运行：先有提示，再被看见，然后行动，最后问候——每个可见变化都来自顺序。',
    completionTitle: 'Build 1 完成！🐒',
    completion: '你选出四块真动作、按故事顺序接好并真实运行：仙石亮起，石猴出现、跳到石台中央，向伙伴问好。',
    completionSteps: [
      { icon: '🔔', label: '仙石出声', order: '先' },
      { icon: '👀', label: '石猴出现', order: '再' },
      { icon: '💬', label: '开口问好', order: '最后' },
    ],
    completionWhy: 'Show 排在 Hop 和 Say 之前，所以每个动作都被伙伴看见，没有动作躲在空中发生。',
    next: '群猴问：你会先跳过来，还是先和我们说话？下一个 Part 由你决定第一次动作。',
  },

  // Journey to the West S1/C1-P5 — Build 2: the greeting-order CHOICE. Both
  // orders are valid; the child chooses which side of the Stone Monkey the
  // audience meets first and explains the choice from the story.
  'jtw-s1-c1-p5': {
    mode: 'personal-ship',
    lessonId: 'jtw-s1-c1-p5',
    hero: {
      name: '石猴',
      role: '花果山的新朋友',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第一章 · Build 2',
    title: '两种真诚的问候',
    storyPages: [
      {
        emoji: '🐒✨',
        title: '还差一个属于他的选择',
        body: '石猴已经站在大家面前，可第一次见面还差一个属于他的选择：先跳过去，还是先问好？',
        speaker: '石猴',
        dialogue: '两种都真诚。哪一种更像你想介绍的我？',
        scene: 1,
      },
      {
        emoji: '🦘💬',
        title: '版本 A：先跳，再问好',
        body: '石猴先轻快地跳到草地上，再笑着说：“你好，我也是刚刚认识这个世界。”群猴先被他的活力吸引，随后听懂他的来意。',
        speaker: '群猴',
        dialogue: '他好有活力！',
        scene: 3,
      },
      {
        emoji: '💬🦘',
        title: '版本 B：先问好，再跳',
        body: '石猴先留在石台上，轻声说：“你们好，我可以过来吗？”等群猴点头，他才跳近一步。群猴先感到被尊重，随后发现他也很爱行动。',
        speaker: '群猴',
        dialogue: '他真有礼貌。',
        scene: 4,
        blocks: ['🦘 Hop → 💬 Say', '💬 Say → 🦘 Hop'],
      },
    ],
    partnerLine: '出世链已经稳了。这一次，顺序由你决定——用故事理由选，别随便点。',
    mission:
      '前面的 Start、hide、Chime、Show 已经放好。把 Hop 1 和一句预设问候按「你想让伙伴先看见哪一面」的顺序接上，运行两种版本比较，再留下你选定的那一版。',
    question: '伙伴会先看见活力，还是先听见礼貌？这由哪两块的顺序决定？',
    choices: [],
    retry: '交换 Hop 和 Say 再运行一次，比较群猴先感受到什么。',
    successTitle: '你的问候方式已经选好！⭐',
    success: '两个版本都真诚。你用故事理由留下了自己的那一版。',
    fixTitle: '把问候搭完整',
    fixPrompt: '关掉这张卡，把 Hop 1 和一句预设问候接到 Show 后面，试试两种顺序。',
    workspaceIntro: '石猴在等你决定：先让大家看见活力，还是先听见礼貌。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '把 Hop 1 和预设问候按你选的顺序接上；两种顺序都可以运行比较。',
      watch: '看这一版里，伙伴先感受到什么。',
      sayFirst: '先问好——群猴先感到被尊重。',
      sayThen: '问候在跳之后——大家先看见活力。',
      hopFirst: '先跳——群猴先看见活力！',
      hopThen: '跳在问候之后——大家先听见礼貌。',
      retry: '问候还没搭完。Hop 1 和一句预设问候都要接上，以 End 收尾。',
      fix: '在真正的工作区里交换顺序比较——没有按钮会替你选择。',
      test: '这一版搭好了。按 Go 看伙伴的反应！',
      saving: '我在保存你选定的问候方式……',
      complete: '这就是你介绍我的方式。谢谢你认真选了它！',
    },
    logicSteps: [
      { icon: '🦘', label: 'Hop 先', order: '活力' },
      { icon: '💬', label: 'Say 先', order: '礼貌' },
    ],
    logicWhy: '两种顺序都不改变原著结果——石猴都来到花果山想认识伙伴；顺序改变的是观众先看见他的哪一种性格。',
    completionTitle: 'Build 2 完成！🎭',
    completion: '你运行并比较了两种真诚的问候，用故事理由保存了属于你的那一版。',
    completionSteps: [
      { icon: '🎭', label: '两版比较', order: '先' },
      { icon: '💾', label: '留下你的选择', order: '后' },
    ],
    completionWhy: '同样的四块动作，不同的顺序讲出不同的性格——这就是顺序的表达力。',
    next: '正当大家准备互相介绍，舞台忽然放出一个声音先出现、动作看不见的乱序版本。下一个 Part：找出第一个奇怪的地方。',
  },

  // Journey to the West S1/C1-P6 — Twist & Debug: the stable order bug. The
  // starter ships Say → Hop → Show; the child must RUN the bug first, find the
  // first deviation, then move ONLY the target blocks and rerun (manual-fix:
  // the repair is a real drag reorder, no picker or auto-answer exists).
  'jtw-s1-c1-p6': {
    mode: 'manual-fix',
    lessonId: 'jtw-s1-c1-p6',
    hero: {
      name: '石猴',
      role: '花果山的新朋友',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第一章 · Debug',
    title: '声音怎么从空中来了',
    storyPages: [
      {
        emoji: '💬❓',
        title: '声音先响了，石台却空空的',
        body: '舞台重新开始，大家先听见一句“你好”，可石台上空空的。草叶摇了一下，像有什么看不见的角色跳过；直到最后，石猴才突然出现。',
        speaker: '群猴',
        dialogue: '刚才是谁在说话？谁在跳？',
        scene: 1,
      },
      {
        emoji: '🧩⏱️',
        title: '每一块都能跑，顺序却把因果拆散了',
        body: '这不是石猴想讲的出世故事。他没有把积木推倒重来，而是请你先说预期，再按 Go 完整看一遍这个 bug——找到第一个看不懂的动作。',
        speaker: '石猴',
        dialogue: '大家应该什么时候看见我？先运行，再沿轨迹找第一个偏离。',
        scene: 3,
        blocks: ['💬 Say → 🦘 Hop → 👀 Show', '这是 bug 的顺序'],
      },
      {
        emoji: '👀🦘💬',
        title: '只移动目标块，再跑一遍',
        body: 'Say 发生时，Show 还没有发生——所以声音像从空中来。只把 Show、Hop、Say 三块移成先出现、再动作、后问候，不删积木、不换声音，重跑比较。',
        speaker: '石猴',
        dialogue: '让我先出现，跳和问好就都被看懂了。',
        scene: 4,
        blocks: ['👀 Show → 🦘 Hop → 💬 Say', '这是修好的顺序'],
      },
    ],
    partnerLine: '先跑 bug，再修顺序——只移动 Show、Hop、Say 三块，其他什么都不要动。',
    mission:
      '先按 Go 运行这条乱序链，听声音怎么从空中来；然后只移动 Show、Hop 和 Say 三块，让顺序变成 Show → Hop → Say，再按 Go 重跑比较。不许删掉重搭，也不许改声音。',
    question: '第一个观众看不懂的动作在哪里？',
    choices: [],
    retry: '还没修好——只移动 Show、Hop、Say 三块，让顺序变成先出现、再动作、后问候，再按 Go 重跑。',
    successTitle: '顺序修好了！⭐',
    success: '你先复现了 bug，又只移动目标块把因果接回去——这次每一步都被看懂了。',
    fixTitle: '把顺序修回来',
    fixPrompt: '关掉这张卡，先按 Go 跑一遍 bug，再把 Show 移到 Hop 和 Say 之前。',
    workspaceIntro: '乱序的亮相在等你：先运行 bug，再只移动目标块。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '先按 Go 完整看一遍这个 bug——先别急着修。',
      watch: '听：声音是从空中来的吗？石台上有人吗？',
      sayFirst: '问候先响了，可我还没出现——这就是第一个偏离。',
      sayThen: '问候排在出现之后了，大家听得清清楚楚。',
      hopFirst: '草叶动了，可没人看见是谁在跳。',
      hopThen: '现在大家先看见我，再看见我跳。',
      retry: '还没修好。只移动 Show、Hop、Say 三块，别删、别换声音。',
      fix: '把 Show 移到 Hop 和 Say 之前——只动这三块。',
      test: '顺序改好了。按 Go 重跑，和刚才的 bug 比一比！',
      saving: '这一版每一步都看得懂。我在保存你的修复……',
      complete: '你修好了乱序的亮相——不是山风在说话，是我在按顺序介绍自己！',
    },
    logicSteps: [
      { icon: '▶️', label: '先跑 bug', order: '复现' },
      { icon: '🔍', label: '找第一次偏离', order: '定位' },
      { icon: '👀', label: 'Show 移到最前', order: '修复' },
    ],
    logicWhy: '积木从左到右运行：Say 排在 Show 前面时，声音就发生在没人可看的舞台上；只把目标块移回去，因果就接上了。',
    completionTitle: 'Debug 完成！🔧',
    completion: '你运行并复现了 bug，找到第一次偏离，只移动目标块修好顺序，并重跑验证了结果。',
    completionSteps: [
      { icon: '💬', label: '空中的声音', order: '复现' },
      { icon: '🔍', label: 'Say 在 Show 前', order: '定位' },
      { icon: '✅', label: '先看见再听清', order: '修复' },
    ],
    completionWhy: '重跑时群猴先看见石猴，再看见他跳，最后听清问候——每个可见变化都回到了正确的位置。',
    next: '一只群猴从树后走出来回应。下一个 Part：把这次亮相设计成你自己的版本。',
  },

  // Journey to the West S1/C1-P7 — the Personal Ship: the child designs their
  // own arrival. The frame (Start·hide·sound·Show … Say(preset)·End) ships;
  // the sound choice, the two visible actions (order + optional wait between)
  // and the preset greeting are the child's real decisions.
  'jtw-s1-c1-p7': {
    mode: 'personal-ship',
    lessonId: 'jtw-s1-c1-p7',
    hero: {
      name: '石猴',
      role: '花果山的新朋友',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第一章 · Personal Ship',
    title: '我的石猴亮相',
    storyPages: [
      {
        emoji: '🐒🎭',
        title: '石台中央留给新伙伴',
        body: '群猴围成一个宽宽的半圆，把石台中央留给石猴。他已经学会让故事清楚发生，现在他想让这次亮相也带一点自己的性格。',
        speaker: '石猴',
        dialogue: '这一次的亮相，由你来替我设计！',
        scene: 1,
      },
      {
        emoji: '🦘⏱️🔼',
        title: '两个动作、一个节奏、一句问候',
        body: '在 Show 和问候之间接上两个能被看见的动作——跳、转身、变大、变小都可以；中间还可以停一停（Wait 1–3），让观众看清节奏。声音和问候也由你选。',
        speaker: '石猴',
        dialogue: '等待不是拖时间，是让伙伴看清我的节奏。',
        scene: 3,
        blocks: ['👀 Show → 动作1 (→ ⏱ Wait) → 动作2', '💬 Say(预设问候) → 🏁 End'],
      },
      {
        emoji: '💾🔁',
        title: '保存、关闭、重开、再跑一遍',
        body: '完成后先从头预测，运行给同伴看；然后保存并关闭作品，再重新打开、重跑一遍——石猴仍按同样顺序亮相，你的第一次故事才不会丢。',
        speaker: '群猴',
        dialogue: '我们只看舞台，不看积木——讲给我们听！',
        scene: 4,
      },
    ],
    partnerLine: '出世链学会了，这一次的亮相由你设计——每个选择都要说得出理由。',
    mission:
      'Start、hide、声音、Show、一句预设问候和 End 已经放好。把两个可见动作（跳/转身/变大/变小）按你的顺序接到 Show 和问候之间，中间可以加一个 Wait 1–3；声音和问候也可以换成你喜欢的。运行、保存，然后关闭重开再跑一遍。',
    question: '同伴只看舞台，应该看出什么顺序？',
    choices: [],
    retry: '两个动作都要真的被看见——接在 Show 之后、问候之前，再按 Go 试试。',
    successTitle: '这是你自己的亮相！⭐',
    success: '两个动作、节奏和问候都是你选的。保存好，关闭重开它也不会丢。',
    fixTitle: '把你的亮相搭完整',
    fixPrompt: '关掉这张卡，把两个可见动作接到 Show 和问候之间，按你的顺序排好。',
    workspaceIntro: '石台中央空着，等你把自己设计的亮相搭出来。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '把两个可见动作按你的顺序接到 Show 和问候之间；想要节奏就加一个 Wait。',
      watch: '看你的设计从左到右运行——每一步都被看见了吗？',
      sayFirst: '问候说出口了——这是你为石猴写下的话。',
      sayThen: '问候排在动作之后，大家先看见你的性格，再听见你的话。',
      hopFirst: '第一个动作亮相了——伙伴正在看你的性格表达！',
      hopThen: '第二个动作接上了——两个动作让故事更完整。',
      retry: '还差一点。两个动作都要接在 Show 之后、问候之前，以 End 收尾。',
      fix: '在真正的工作区里搭你自己的版本——没有按钮会替你设计。',
      test: '你的亮相搭好了。按 Go 看看效果！',
      saving: '我在保存你设计的亮相……',
      complete: '这就是我的亮相——是你替我设计的！记得关闭重开再跑一遍。',
    },
    logicSteps: [
      { icon: '🔔', label: '选声音', order: '提示' },
      { icon: '🦘', label: '两个动作', order: '性格' },
      { icon: '💬', label: '预设问候', order: '联系' },
    ],
    logicWhy: '同样的顺序骨架，不同的动作、节奏和对白，讲出属于你的石猴——顺序讲清故事，选择表达性格。',
    completionTitle: 'Personal Ship 完成！🎉',
    completion: '你主导了声音、两个可见动作、顺序、节奏和问候，至少做出五个有意义的选择，并保存、重开、重跑验证了作品。',
    completionSteps: [
      { icon: '🎨', label: '自己的设计', order: '先' },
      { icon: '💾', label: '保存重开', order: '再' },
      { icon: '🗣️', label: '同伴复述', order: '最后' },
    ],
    completionWhy: '同伴不看积木也能复述出主要顺序，说明你的程序把故事讲清楚了——这就是作品完成的证据。',
    next: '清泉旁传来持续的轰鸣，湿润的风从山谷吹来。下一个 Part：跟着水声走。',
  },

  // Journey to the West S1/C2-P4 — chapter two's main Build. The starter ships
  // only Start/End; the child selects and orders the five one-step route
  // blocks (Right 1 ×2 · Up 1 · Right 1 ×2) with Left/Down/Wait as live
  // distractors — the parameter-merged 右2/上1/右2 shortcut never completes.
  'jtw-s1-c2-p4': {
    mode: 'complete',
    lessonId: 'jtw-s1-c2-p4',
    hero: {
      name: '石猴',
      role: '瀑布前的探路者',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第二章 · Build 1',
    title: '刚好到达，不多也不少',
    storyPages: [
      {
        emoji: '🌊🐒',
        title: '路线说得通了，现在真的走',
        body: '三片叶子还标着停点：圆叶在 4-8，尖叶在 4-7 的高台，长叶在 6-7 的水帘入口。石猴站在 2/8 的起点上，等程序带他一步一步走过去。',
        speaker: '石猴',
        dialogue: '排练过的路线，这次要让舞台真的照着做。',
        scene: 1,
      },
      {
        emoji: '🧩➡️',
        title: '五块一步移动，都由你放',
        body: '工作区里只有 Start 和 End。从候选里选出五块一步移动：Right 1、Right 1、Up 1、Right 1、Right 1——Left、Down 和 Wait 也在候选里，它们能运行，却会把石猴带离湿石路。',
        speaker: '群猴',
        dialogue: '一个方向或顺序错误，都会停在错误的湿石上！',
        scene: 3,
        blocks: ['➡️ Right 1 ×2 → ⬆️ Up 1', '➡️ Right 1 ×2 → 🏁 End'],
      },
      {
        emoji: '👣🎯',
        title: '先预测，再按 Go',
        body: '运行前先逐块预测五个停点：3-8、4-8、4-7、5-7、6-7。少一个 Right 停在 5-7 碰不到入口；多一个 Right 会冲过 6-7——刚好碰到才算到达。',
        speaker: '石猴',
        dialogue: '不多也不少，我的脚底要刚好碰到入口格。',
        scene: 4,
      },
    ],
    partnerLine: 'P3 的预测在你手里，现在把它变成五块真实的路线主链！',
    mission:
      'Start 和 End 已经放好。从候选里选出五块一步移动 Right 1、Right 1、Up 1、Right 1、Right 1 按顺序接上，先预测五个停点，再按 Go 真实运行——不是改一个数字，五块都要你自己放。',
    question: '哪一段必须在两个 Right 之后、后两个 Right 之前？',
    choices: [],
    retry: '想想三片叶子的顺序：先右2到圆叶，再上1跳上尖叶的高台，最后右2停在长叶的入口。',
    successTitle: '刚好到达！⭐',
    success: '五个脚印一步一个，石猴的脚底刚好碰到水帘入口格——不多也不少。',
    fixTitle: '把五块路线搭完整',
    fixPrompt: '关掉这张卡，把五块一步移动按 右1→右1→上1→右1→右1 接到 Start 和 End 之间。',
    workspaceIntro: '湿石路等着你的五块移动——没有任何按钮会替你走这条路。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '搭路线：在 Start 和 End 之间按顺序接上五块一步移动。',
      watch: '看石猴一步一个脚印地走——每一段都停在预测的停点上吗？',
      sayFirst: '先说预测：五个停点分别在哪里？',
      sayThen: '停点和脚印对上了——预测成立。',
      hopFirst: '第一段右1，石猴踏上 3-8 的湿石！',
      hopThen: '上1 跳上高台之后，还差两个 Right 才到入口。',
      retry: '石猴停在了错误的湿石上。检查方向和顺序，把五块摆成 右1→右1→上1→右1→右1。',
      fix: '在真正的工作区里放五块移动——合并成右2也不行，五块都要你自己排。',
      test: '五块接好了。按 Go，看脚印是不是刚好到入口！',
      saving: '刚好到达！我在保存你搭的路线……',
      complete: '你的路线让我刚好碰到水帘入口——可水帘还没有回应。',
    },
    logicSteps: [
      { icon: '➡️', label: 'Right 1 ×2', order: '第一段' },
      { icon: '⬆️', label: 'Up 1', order: '第二段' },
      { icon: '➡️', label: 'Right 1 ×2', order: '第三段' },
    ],
    logicWhy: '五块一步移动与 右2→上1→右2 等价，但每一步都留下一个可观察的停点——刚好到达，不多也不少。',
    completionTitle: 'Build 1 完成！👣',
    completion: '你选出五块真移动、按路线顺序接好并真实运行：五个脚印稳定显示，石猴的脚底刚好碰到水帘入口格。',
    completionSteps: [
      { icon: '👣', label: '五个脚印', order: '先' },
      { icon: '🎯', label: '刚好到达', order: '再' },
    ],
    completionWhy: '少一个 Right 碰不到入口，多一个 Right 会冲过头——精确的五块顺序才让“到达”真实发生。',
    next: '石猴到达了，水帘却没有分开。下一个 Part：连接“碰到以后”的回应。',
  },

};

export function storyMissionFor(lessonId: string | undefined): StoryMission | undefined {
  return lessonId ? STORY_MISSIONS[lessonId] : undefined;
}
