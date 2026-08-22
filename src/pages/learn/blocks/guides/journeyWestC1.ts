// Journey to the West S1 C1｜石猴出世 — Story Blocks mission guides.
// Split out of curriculumGuides.ts to keep every file under the 1000-line
// hard rule in rules/file-organization.md. curriculumGuides.ts stays the
// public module and re-exports the assembled catalogue.

import type { StoryMission } from './types';

export const JTW_C1_MISSIONS: Record<string, StoryMission> = {
  'jtw-s1-c1-p4': {
    mode: 'complete',
    lessonId: 'jtw-s1-c1-p4',
    hero: {
      name: 'stone monkey',
      role: 'New friends of Flower-Fruit Mountain',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 1 · Build 1',
    title: 'Create a complete birth chain',
    storyPages: [
      {
        emoji: '🍃🐒',
        title: 'The rehearsal makes sense, the stage is still quiet',
        body: 'Everyone understood the rehearsal on the grass, but the story stage next to the fairy stone was still quiet. The outline of the stone monkey was hidden behind the light, and the group of monkeys could only see a slightly shiny stone.',
        speaker: 'stone monkey',
        dialogue: "We just performed it with our bodies. Now let's do the same for the stage.",
        scene: 1,
      },
      {
        emoji: '🧩🔍',
        title: 'There are true and false in the candidate area',
        body: "Among the candidate actions, Grow will make the character grow bigger, and Turn will make the character turn around - they both work, but they don't answer the question at hand. What is needed at the moment is: prompts, appearances, first actions and greetings.",
        speaker: 'group of monkeys',
        dialogue:
          'Don’t rush to press start! Tell us first: What will you see after the light shines?',
        scene: 3,
      },
      {
        emoji: '🔔👀🦘💬',
        title: 'Connect the four pieces between Start and End',
        body: 'Place Chime, Show, Hop 1, and Say "Hello, I just came here." in the order of the story. Each time a piece is connected, the stage will have an explanation of cause and effect.',
        speaker: 'stone monkey',
        dialogue:
          'Let the stone make a sound first, then let everyone see me, then jump, and finally say hello.',
        scene: 4,
        blocks: ['🔔 Chime · 👀 Show', '🦘 Hop 1 · 💬 Say'],
      },
    ],
    partnerLine:
      'Four sequential cards are in your hand, and Stone Monkey is waiting for you to put the rehearsal on the real stage!',
    mission:
      'Start and hide have been placed. Select Chime, Show, Hop 1, and Say "Hello, I just came here." From the candidates, connect them in order, end with End, and then press Go to run your own program.',
    question: 'Which piece must be placed before Hop and Say so partners can see who it is?',
    choices: [],
    retry:
      'Think about the rehearsal agreement: there is no Show yet, and no one can see the Stone Monkey.',
    successTitle: 'The birth chain is set up and ready to run! ⭐',
    success:
      'You created the complete order of birth yourself. Press Go and watch every step be seen.',
    fixTitle: 'Complete the chain of birth',
    fixPrompt:
      'Turn off this card, go to the real workspace and put Chime → Show → Hop 1 → Say, and finally End.',
    workspaceIntro:
      'Stone Monkey is still waiting for you to actually integrate the four movements into the program.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Construction time: After hide, add Chime, Show, Hop 1 and Say in order.',
      watch: 'Watch your own blocks run from left to right.',
      sayFirst: 'The greeting sounded first, but no one saw me. Bring Show to the front.',
      sayThen: 'Finally, I said "Hello, I just came here."💬',
      hopFirst: 'After everyone sees me, I will jump first! 🦘',
      hopThen: 'Hop is behind Say. Jump first, say hello later.',
      retry:
        'The sentence of "birth" has not been finished yet. Connect all four actions and end with End.',
      fix: 'Build blocks in a real workspace - no buttons do it for you.',
      test: 'The birth chain is complete. Press Go to try your program!',
      saving: "Success! I'm saving the blocks you built...",
      complete: 'You personally let everyone see the birth of Stone Monkey!',
    },
    logicSteps: [
      { icon: '🔔', label: 'Chime', order: 'hint' },
      { icon: '👀', label: 'Show', order: 'Appear' },
      { icon: '🦘', label: 'Hop 1', order: 'action' },
      { icon: '💬', label: 'Say', order: 'greeting' },
    ],
    logicWhy:
      'The blocks run from left to right: first the prompt, then the seen, then the action, then the greeting - each visible change comes from the sequence.',
    completionTitle: 'Build 1 completed! 🐒',
    completion:
      'You choose four real actions, connect them in the order of the story and run them in real time: the fairy stone lights up, the stone monkey appears, jumps to the center of the stone platform, and says hello to your friends.',
    completionSteps: [
      { icon: '🔔', label: 'Immortal Stone speaks out', order: 'First' },
      { icon: '👀', label: 'Stone monkey appears', order: 'Again' },
      { icon: '💬', label: 'Say hello', order: 'at last' },
    ],
    completionWhy:
      'Show comes before Hop and Say, so every action is seen by your partner and no action happens in the air.',
    next: "The monkeys asked: Will you jump over first or talk to us first? It's up to you to decide the first action of the next Part.",
  },

  // Journey to the West S1/C1-P5 — Build 2: the greeting-order CHOICE. Both
  // orders are valid; the child chooses which side of the Stone Monkey the
  // audience meets first and explains the choice from the story.
  'jtw-s1-c1-p5': {
    mode: 'personal-ship',
    lessonId: 'jtw-s1-c1-p5',
    hero: {
      name: 'stone monkey',
      role: 'New friends of Flower-Fruit Mountain',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 1 · Build 2',
    title: 'Two sincere greetings',
    storyPages: [
      {
        emoji: '🐒✨',
        title: 'There is still one more choice left for him',
        body: 'Stone Monkey is already standing in front of everyone, but there is still one more choice for him to make when meeting for the first time: jump over first, or say hello first?',
        speaker: 'stone monkey',
        dialogue: 'Both are sincere. Which one is more like the me you want to introduce?',
        scene: 1,
      },
      {
        emoji: '🦘💬',
        title: 'Version A: Jump first, say hello later',
        body: 'The stone monkey first jumped briskly onto the grass, and then said with a smile: "Hello, I have just met this world." The group of monkeys were first attracted by his vitality, and then understood his purpose.',
        speaker: 'group of monkeys',
        dialogue: 'He is so energetic!',
        scene: 3,
      },
      {
        emoji: '💬🦘',
        title: 'Version B: Say hello first, then dance',
        body: 'The stone monkey stayed on the stone platform first and said softly: "Hello, can I come over?" When the monkeys nodded, he jumped one step closer. The monkeys first felt respected, and then discovered that he also loved taking action.',
        speaker: 'group of monkeys',
        dialogue: "He's so polite.",
        scene: 4,
        blocks: ['🦘 Hop → 💬 Say', '💬 Say → 🦘 Hop'],
      },
    ],
    partnerLine:
      'The birth chain has been stabilized. This time, the order is up to you—choose with story reasons, don’t just click.',
    mission:
      'The previous Start, hide, Chime, and Show have been placed. Connect Hop 1 and a preset greeting in the order of "which side do you want your partner to see first?" Compare the two versions and keep the one you selected.',
    question:
      'Does your partner see energy first, or hear politeness first? This is determined by the order of which two pieces?',
    choices: [],
    retry: 'Run it again, swapping Hop and Say, and compare what the monkeys feel first.',
    successTitle: 'Your greeting has been chosen! ⭐',
    success: 'Both versions are sincere. You left your own version with story reasons.',
    fixTitle: 'Complete the greeting',
    fixPrompt:
      'Turn off this card, connect Hop 1 and a preset greeting to Show, and try both sequences.',
    workspaceIntro:
      'The stone monkey is waiting for you to decide: let everyone see the vitality first, or let everyone hear the politeness first.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready:
        'Connect Hop 1 and the preset greeting in the order of your choice; the comparison can be run in either order.',
      watch: 'In this version, see what your partner feels first.',
      sayFirst: 'Say hello first - the monkeys feel respected first.',
      sayThen: 'Greetings after the jump – everyone sees the energy first.',
      hopFirst: 'Jump first - the monkeys see the energy first!',
      hopThen: 'Jump after the greeting - everyone hears politeness first.',
      retry:
        'The greetings are not finished yet. Hop 1 and a preset greeting are connected, ending with End.',
      fix: 'Swap order comparisons in the real workspace - no buttons choose for you.',
      test: "This version is ready. Press Go to see your partner's reaction!",
      saving: "I'm saving your chosen greeting...",
      complete: 'This is how you introduce me. Thank you for choosing it carefully!',
    },
    logicSteps: [
      { icon: '🦘', label: 'Hop first', order: 'vitality' },
      { icon: '💬', label: 'Say first', order: 'polite' },
    ],
    logicWhy:
      'Both orders do not change the result of the original work - both stone monkeys came to Flower-Fruit Mountain to get to know their partners; what changes the order is which character of him the audience sees first.',
    completionTitle: 'Build 2 completed! 🎭',
    completion:
      'You run and compare the two sincere greetings and save your version with story justification.',
    completionSteps: [
      { icon: '🎭', label: 'Comparison of two versions', order: 'First' },
      { icon: '💾', label: 'Leave your choice', order: 'back' },
    ],
    completionWhy:
      'The same four movements, in different sequences, tell different characters - this is the expressive power of sequence.',
    next: 'Just as everyone was about to introduce each other, the stage suddenly played a scrambled version with the voice appearing first and the movements invisible. Next Part: Find the first weird thing.',
  },

  // Journey to the West S1/C1-P6 — Twist & Debug: the stable order bug. The
  // starter ships Say → Hop → Show; the child must RUN the bug first, find the
  // first deviation, then move ONLY the target blocks and rerun (manual-fix:
  // the repair is a real drag reorder, no picker or auto-answer exists).
  'jtw-s1-c1-p6': {
    mode: 'manual-fix',
    lessonId: 'jtw-s1-c1-p6',
    hero: {
      name: 'stone monkey',
      role: 'New friends of Flower-Fruit Mountain',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 1 · Debug',
    title: 'Why did the sound come from the air?',
    storyPages: [
      {
        emoji: '💬❓',
        title: 'The sound rang first, but the stone platform was empty.',
        body: 'The stage restarted, and everyone heard "Hello" first, but the stone stage was empty. The blades of grass shook a bit, as if some invisible character was jumping over them; until finally, the stone monkey suddenly appeared.',
        speaker: 'group of monkeys',
        dialogue: "Who was speaking just now? Who's dancing?",
        scene: 1,
      },
      {
        emoji: '🧩⏱️',
        title: 'Every piece can be run, but the order separates the cause and effect.',
        body: "This is not the birth story Stone Monkey wants to tell. Instead of tearing down the building blocks and starting over, he asks you to state your expectations first, and then press Go to read the bug in its entirety—find the first action you don't understand.",
        speaker: 'stone monkey',
        dialogue:
          'When should everyone see me? Run first, then find the first deviation along the trajectory.',
        scene: 3,
        blocks: ['💬 Say → 🦘 Hop → 👀 Show', 'This is the order of bugs'],
      },
      {
        emoji: '👀🦘💬',
        title: 'Move only the target block and run again',
        body: "When Say happens, Show hasn't happened yet - so the sound seems to come from the air. Only move the Show, Hop, and Say blocks to appear first, then action, then greeting. Do not delete the blocks or change the sound. Run the comparison again.",
        speaker: 'stone monkey',
        dialogue: 'Let me show up first, jump and say hello and it will be understood.',
        scene: 4,
        blocks: ['👀 Show → 🦘 Hop → 💬 Say', 'This is the order of repair'],
      },
    ],
    partnerLine:
      "Run the bug first, then fix the order - only move the Show, Hop, and Say blocks, and don't move anything else.",
    mission:
      'First press Go to run this out-of-order chain and listen to how the sound comes from the air; then move only the Show, Hop and Say blocks so that the order becomes Show → Hop → Say, and then press Go to rerun the comparison. You are not allowed to delete or re-do it, nor are you allowed to change the sound.',
    question: 'Where is the first action that the audience cannot understand?',
    choices: [],
    retry:
      "It's not fixed yet - just move the Show, Hop, and Say blocks so that the order becomes first appearance, then action, then greeting, and then press Go to run again.",
    successTitle: 'The order is fixed! ⭐',
    success:
      'You reproduce the bug first, and then move only the target block to connect the cause and effect - this time every step is understood.',
    fixTitle: 'Fix the order back',
    fixPrompt:
      'Turn off this card, press Go to run the bug, and then move Show before Hop and Say.',
    workspaceIntro:
      'The appearance of out-of-order is waiting for you: run the bug first, then move only the target block.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Press Go to read the bug in its entirety first—don’t rush to fix it yet.',
      watch: 'Listen: Does the sound come from the air? Is there anyone on the stone platform?',
      sayFirst: "The greeting rang first, but I didn't show up yet - this was the first deviation.",
      sayThen: 'The greeting comes after the appearance, and everyone can hear it clearly.',
      hopFirst: 'The blades of grass moved, but no one saw who was jumping.',
      hopThen: 'Now everyone sees me first and then sees me dancing.',
      retry:
        'Not fixed yet. Only move the Show, Hop, and Say blocks. Do not delete or change the sound.',
      fix: 'Move Show before Hop and Say - just move those three pieces.',
      test: 'The order has been changed. Press Go to rerun and compare with the bug just now!',
      saving: 'You can understand every step of this version. I’m saving your fix…',
      complete:
        "You fixed the out-of-sequence appearance - it's not Shanfeng talking, it's me introducing myself in order!",
    },
    logicSteps: [
      { icon: '▶️', label: 'Run the bug first', order: 'Recurrence' },
      { icon: '🔍', label: 'Find the first deviation', order: 'position' },
      { icon: '👀', label: 'Show Move to front', order: 'repair' },
    ],
    logicWhy:
      'The blocks run from left to right: when Say is in front of Show, the sound occurs on the stage where no one can see; just move the target block back, and the cause and effect are connected.',
    completionTitle: 'Debug completed! 🔧',
    completion:
      'You run and reproduce the bug, find the first deviation, move only the target block to fix the sequence, and rerun to verify the results.',
    completionSteps: [
      { icon: '💬', label: 'sounds in the air', order: 'Recurrence' },
      { icon: '🔍', label: 'Say before Show', order: 'position' },
      { icon: '✅', label: 'See first and then hear clearly', order: 'repair' },
    ],
    completionWhy:
      'When running again, the monkeys first saw the stone monkey, then saw him jumping, and finally heard the greeting clearly - every visible change returned to the correct position.',
    next: 'A group of monkeys responded from behind a tree. Next Part: Make this appearance your own version.',
  },

  // Journey to the West S1/C1-P7 — the Personal Ship: the child designs their
  // own arrival. The frame (Start·hide·sound·Show … Say(preset)·End) ships;
  // the sound choice, the two visible actions (order + optional wait between)
  // and the preset greeting are the child's real decisions.
  'jtw-s1-c1-p7': {
    mode: 'personal-ship',
    lessonId: 'jtw-s1-c1-p7',
    hero: {
      name: 'stone monkey',
      role: 'New friends of Flower-Fruit Mountain',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 1 · Personal Ship',
    title: 'My stone monkey appears',
    storyPages: [
      {
        emoji: '🐒🎭',
        title: 'The center of the stone platform is left to new partners',
        body: 'The group of monkeys formed a wide semicircle, leaving the center of the stone platform to the stone monkey. He had learned to keep the story clear, and now he wanted to bring a little bit of his own character to the appearance.',
        speaker: 'stone monkey',
        dialogue: 'This appearance, you will design it for me!',
        scene: 1,
      },
      {
        emoji: '🦘⏱️🔼',
        title: 'Two actions, one rhythm, one greeting',
        body: 'There are two visible actions between Show and Greeting - jumping, turning, getting bigger, or getting smaller. You can also pause in the middle (Wait 1-3) to let the audience see the rhythm clearly. The sound and greeting are also chosen by you.',
        speaker: 'stone monkey',
        dialogue: 'Waiting is not to delay time, but to let my partners see my rhythm clearly.',
        scene: 3,
        blocks: ['👀 Show → Action 1 (→ ⏱ Wait) → Action 2', '💬 Say (default greeting) → 🏁 End'],
      },
      {
        emoji: '💾🔁',
        title: 'Save, close, reopen, run again',
        body: 'After completion, predict from the beginning and run it for your companions to see; then save and close the work, reopen it, and run it again - the stone monkey will still appear in the same order, so your first story will not be lost.',
        speaker: 'group of monkeys',
        dialogue: 'We only look at the stage, not the bricks - tell us!',
        scene: 4,
      },
    ],
    partnerLine:
      'The birth chain has learned that this appearance is designed by you - there must be a reason for every choice.',
    mission:
      'Start, hide, sound, Show, a preset greeting and End have been placed. Connect the two visible actions (jump/turn/get bigger/get smaller) in your order between Show and greeting. You can add a Wait 1–3 in the middle; the sound and greeting can also be changed to what you like. Run, save, then close and reopen and run again.',
    question: 'If the companion only looks at the stage, what order should he see?',
    choices: [],
    retry:
      'Both actions need to be actually visible - try pressing Go after Show and before greeting.',
    successTitle: 'This is your own appearance! ⭐',
    success:
      "Both actions, rhythm and greeting are your choice. Once you save it, it won't be lost even if you close it and reopen it.",
    fixTitle: 'Complete your appearance',
    fixPrompt:
      'Turn off the card and connect the two visible actions between Show and Greeting, in your order.',
    workspaceIntro:
      'The center of the stone platform is empty, waiting for you to put up your own design.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready:
        'Put the two visible actions in your order between Show and Greeting; if you want rhythm, add a Wait.',
      watch: 'Watch your design run from left to right – is each step seen?',
      sayFirst: 'The greeting is spoken - these are the words you wrote for Stone Monkey.',
      sayThen:
        'Greetings come after actions. People see your personality first and then hear your words.',
      hopFirst:
        'The first action is revealed - your partner is watching your personality expression!',
      hopThen: 'A second action follows - two actions that complete the story.',
      retry:
        'Not even close. Both actions must be followed by Show, before greetings, and end with End.',
      fix: 'Build your own version of a real workspace—no buttons are designed for you.',
      test: 'Your appearance is set. Press Go to see the effect!',
      saving: 'I’m saving the appearance of your design…',
      complete:
        'This is my appearance - you designed it for me! Remember to close and reopen and run again.',
    },
    logicSteps: [
      { icon: '🔔', label: 'Choose sound', order: 'hint' },
      { icon: '🦘', label: 'two actions', order: 'character' },
      { icon: '💬', label: 'Default greeting', order: 'connect' },
    ],
    logicWhy:
      'The same sequential skeleton, different actions, rhythms and dialogues, tell your own Stone Monkey - tell the story clearly in sequence and choose to express your character.',
    completionTitle: 'Personal Ship Complete! 🎉',
    completion:
      'You dominated the sound, two visible actions, sequence, rhythm, and greetings, made at least five meaningful choices, and validated the work by saving, reopening, and rerunning it.',
    completionSteps: [
      { icon: '🎨', label: 'own design', order: 'First' },
      { icon: '💾', label: 'Save and reopen', order: 'Again' },
      { icon: '🗣️', label: 'peer retelling', order: 'at last' },
    ],
    completionWhy:
      'If your partner can retell the main sequence without looking at the building blocks, it means that your program tells the story clearly - this is evidence that the work is completed.',
    next: 'There was a continuous roar next to the clear spring, and the moist wind blew from the valley. Next Part: Follow the sound of water.',
  },

  // Journey to the West S1/C2-P4 — chapter two's main Build. The starter ships
  // only Start/End; the child selects and orders the five one-step route
  // blocks (Right 1 ×2 · Up 1 · Right 1 ×2) with Left/Down/Wait as live
  // distractors — the parameter-merged 右2/上1/右2 shortcut never completes.,
};
