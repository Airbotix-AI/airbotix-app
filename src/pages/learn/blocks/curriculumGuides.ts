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
};

export function storyMissionFor(lessonId: string | undefined): StoryMission | undefined {
  return lessonId ? STORY_MISSIONS[lessonId] : undefined;
}
