// Journey to the West S1 C2｜水帘洞的约定 — Story Blocks mission guides.
// Split out of curriculumGuides.ts to keep every file under the 1000-line
// hard rule in rules/file-organization.md. curriculumGuides.ts stays the
// public module and re-exports the assembled catalogue.

import type { StoryMission } from './types';

export const JTW_C2_MISSIONS: Record<string, StoryMission> = {
  'jtw-s1-c2-p4': {
    mode: 'complete',
    lessonId: 'jtw-s1-c2-p4',
    hero: {
      name: 'stone monkey',
      role: 'Pathfinder in front of the waterfall',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 2 · Build 1',
    title: 'Just arrived, no more, no less',
    storyPages: [
      {
        emoji: '🌊🐒',
        title: 'The route makes sense, let’s actually take it now',
        body: 'Three leaves also mark the stopping points: round leaves at 4-8, pointed leaves at the high platform at 4-7, and long leaves at the water curtain entrance at 6-7. Stone Monkey stood at the starting point of 2/8, waiting for the program to take him step by step.',
        speaker: 'stone monkey',
        dialogue: 'The rehearsed route must be followed on stage this time.',
        scene: 1,
      },
      {
        emoji: '🧩➡️',
        title: 'Five dollars to move in one step, it’s all up to you',
        body: 'There are only Start and End in the workspace. Choose five pieces from the candidates to move in one step: Right 1, Right 1, Up 1, Right 1, Right 1 - Left, Down and Wait are also among the candidates, they work, but they will take the stone monkey away from the wet stone road.',
        speaker: 'group of monkeys',
        dialogue: "One wrong direction or sequence and you'll end up on the wrong wet rock!",
        scene: 3,
        blocks: ['➡️ Right 1 ×2 → ⬆️ Up 1', '➡️ Right 1 ×2 → 🏁 End'],
      },
      {
        emoji: '👣🎯',
        title: 'Predict first, then press Go',
        body: 'Before running, predict five stopping points block by block: 3-8, 4-8, 4-7, 5-7, 6-7. If there is one less Right, it will stop at 5-7 and cannot reach the entrance; if there is one more Right, it will rush through 6-7 - just touching it will be considered as arrival.',
        speaker: 'stone monkey',
        dialogue: 'No more, no less, the soles of my feet should just touch the entrance grid.',
        scene: 4,
      },
    ],
    partnerLine:
      'The prediction of P3 is in your hands, now turn it into five real route main chains!',
    mission:
      'Start and End have been placed. Select five blocks from the candidates and move them in one step: Right 1, Right 1, Up 1, Right 1, Right 1. Connect them in order. First predict the five stopping points, and then press Go to actually run it - instead of changing a number, you have to put all five blocks yourself.',
    question: 'Which paragraph must come after two Right and before the next two Right?',
    choices: [],
    retry:
      'Think about the order of the three leaves: first right 2 to the round leaf, then up 1 to jump to the high platform of the pointed leaf, and finally right 2 to stop at the entrance of the long leaf.',
    successTitle: 'Just arrived! ⭐',
    success:
      "There are five footprints one step at a time, and the soles of the stone monkey's feet just touch the entrance grid of the water curtain - no more, no less.",
    fixTitle: 'Complete the five-block route',
    fixPrompt:
      'Turn off this card, move the five pieces one step at a time and press Right 1→Right 1→Up 1→Right 1→Right 1 between Start and End.',
    workspaceIntro:
      'A wet stone path awaits your five-piece move - no buttons will take this path for you.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Route: Connect five pieces in sequence between Start and End to move in one step.',
      watch:
        'Watch Stone Monkey walk step by step - does each section stop at the predicted stopping point?',
      sayFirst: 'Let’s talk about prediction first: Where are the five stopping points?',
      sayThen: 'The stopping point and the footprints are aligned - the prediction is true.',
      hopFirst: 'Right 1 in the first paragraph, the stone monkey steps on the wet stone at 3-8!',
      hopThen:
        'Up 1 After jumping onto the high platform, there are still two Right left to reach the entrance.',
      retry:
        'The stone monkey stopped on the wrong wet stone. Check the direction and order, and arrange the five pieces as right 1 → right 1 → top 1 → right 1 → right 1.',
      fix: "Putting five pieces in the real workspace and moving them - merging them into right 2 won't work, you have to arrange the five pieces yourself.",
      test: 'Five dollars is enough to pick it up. Press Go and see if the footprints are right up to the entrance!',
      saving: "Just arrived! I'm saving your route...",
      complete:
        'Your route brought me right into the entrance of the water curtain - but the water curtain has not responded yet.',
    },
    logicSteps: [
      { icon: '➡️', label: 'Right 1 ×2', order: 'first paragraph' },
      { icon: '⬆️', label: 'Up 1', order: 'Second paragraph' },
      { icon: '➡️', label: 'Right 1 ×2', order: 'Paragraph 3' },
    ],
    logicWhy:
      'Moving five blocks in one step is equivalent to right 2 → up 1 → right 2, but each step leaves an observable stopping point - just arrived, no more, no less.',
    completionTitle: 'Build 1 completed! 👣',
    completion:
      "You select five pieces to move, connect them according to the route sequence, and actually run them: the five footprints are displayed stably, and the soles of the stone monkey's feet just touch the entrance grid of the water curtain.",
    completionSteps: [
      { icon: '👣', label: 'five footprints', order: 'First' },
      { icon: '🎯', label: 'Just arrived', order: 'Again' },
    ],
    completionWhy:
      'One less Right will miss the entrance, and one more Right will overshoot - the exact sequence of five pieces is what makes "arrival" actually happen.',
    next: 'The stone monkey arrived, but the water curtain did not part. Next Part: Connect the "after encounter" response.',
  },

  // Journey to the West S1/C2-P5 — two child-owned bump responses. This guide
  // is also the editor's completion identity: without it, a correct real run
  // cannot persist the progress marker the Part page reads back.
  'jtw-s1-c2-p5': {
    mode: 'complete',
    lessonId: 'jtw-s1-c2-p5',
    hero: {
      name: 'stone monkey',
      role: 'The discoverer in front of the water curtain',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 2 · Build 2',
    title: 'After encountering each other, the stage must respond',
    storyPages: [
      {
        emoji: '🌊💥',
        title: 'The route has arrived, Shui Lian hasn’t answered yet',
        body: 'The stone monkey has just touched the entrance. Now we need to connect "touch" into two visible responses: the water curtain recedes and the hole appears.',
        speaker: 'stone monkey',
        dialogue: "I touched the door, but it didn't know what to do yet.",
        scene: 1,
      },
      {
        emoji: '🙈✨',
        title: 'One is hidden, the other appears',
        body: "The water curtain's On Bump track already has Chime, drag Hide in front of it. The On Bump track at the entrance of the hole already has found dialogue, so drag Show in front of it.",
        speaker: 'group of monkeys',
        dialogue: 'The water curtain hides it so that the entrance of the cave can be seen!',
        scene: 3,
        blocks: [
          'Water Curtain: 💥 On Bump → 🙈 Hide → 🔔 Chime',
          'Cave entrance: 💥 On Bump → 👀 Show → 💬 Say',
        ],
      },
      {
        emoji: '▶️🕳️',
        title: 'Press Go to verify the complete causal chain',
        body: 'After running, the stone monkey arrives along the five footprints and encounters the water curtain; the two response rails are activated at the same time, and the stone bridge, dry land, stone base and clear water in the cave will appear.',
        speaker: 'stone monkey',
        dialogue: 'Arrival, encounter, response - every step must actually happen.',
        scene: 4,
      },
    ],
    partnerLine:
      'Add a piece to each of the two event tracks, and then use a real run to prove that they are connected.',
    mission:
      'Add Hide to the On Bump track of the water curtain and drag it in front of Chime; add Show to the On Bump track of the hole and drag it in front of the dialogue, then press Go.',
    question: 'Which two responses are triggered by a collision?',
    choices: [],
    retry:
      'Check both tracks: Hide → Chime for the water curtain and Show → Dialogue for the hole; do not delete the original block or End.',
    successTitle: 'The water curtain parted! ⭐',
    success:
      'After the stone monkey encountered the water curtain, the water curtain was hidden and the hole appeared, and he found that the dialogue was actually running.',
    fixTitle: 'Complete the two responses',
    fixPrompt:
      'Turn off the story card: drag the Hide of the water curtain in front of the Chime, and drag the Show of the hole in front of the dialogue.',
    workspaceIntro:
      'Both collision rails are on the stage, and the missing two pieces are connected by you.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready:
        'First add Hide to the water curtain and drag it in front of Chime, then add Show to the hole and drag it in front of the dialogue.',
      watch:
        'Press Go and look at the entrance: Has the water curtain receded and has the hole appeared?',
      sayFirst:
        'After the cave entrance appeared, the four pieces of evidence inside were revealed.',
      sayThen: 'Stone bridges, dry ground, stone seats, clear water—these are visible discoveries.',
      hopFirst: 'The stone monkey followed the original five footprints towards the entrance.',
      hopThen:
        'The sole of the foot touches the entrance grid, and the two On Bump responses start together.',
      retry:
        'Not complete yet. The water curtain should be Hide first and then Chime, and the entrance of the cave should be Show first and then tell the discovery.',
      fix: "Don't create a new Event track; drag the two pieces into the correct response positions of the existing On Bump track.",
      test: 'Both responses were answered. Press Go to see the complete cause and effect chain!',
      saving:
        "The water curtain recedes and the cave entrance lights up. I'm saving this real run...",
      complete:
        'The arrival, the encounter, the response happened—the evidence in the cave can now be examined.',
    },
    logicSteps: [
      { icon: '💥', label: 'Hit the water curtain', order: 'First' },
      { icon: '🙈', label: 'Water curtain hides', order: 'at the same time' },
      { icon: '👀', label: 'The hole appears', order: 'at the same time' },
    ],
    logicWhy:
      'Movement is only responsible for arrival; the On Bump event turns contact into a stage response, and Hide and Show complete the visible state switch together.',
    completionTitle: 'Build 2 completed! 🕳️',
    completion:
      'You complete two collision responses and run them in real time. The water curtain hides, the hole appears, and the discovery dialogue sounds.',
    completionSteps: [
      { icon: '🙈', label: 'Hide water curtain', order: 'Response 1' },
      { icon: '👀', label: 'Show hole', order: 'Response 2' },
      { icon: '▶️', label: 'Real operation', order: 'verify' },
    ],
    completionWhy:
      'The two saved event tracks and running markers together prove that it is not the picture itself that changes, but the program responds to the collision.',
    next: 'The cave was suitable for living, but the stone monkey promised to come back. Next Part: Fix the return sequence.',
  },

  // Journey to the West S1/C2-P6 — the return-route order bug. Same blocks,
  // same parameters; only the middle order is wrong, so the child must run the
  // bug first, then swap exactly two blocks back.
  'jtw-s1-c2-p6': {
    mode: 'manual-fix',
    lessonId: 'jtw-s1-c2-p6',
    hero: {
      name: 'stone monkey',
      role: 'The pathfinder who kept his promise and came back',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 2 · Debug',
    title: 'The first deviation on the way back',
    storyPages: [
      {
        emoji: '🕳️🐒',
        title: 'The cave is safe, but he promised to go back.',
        body: 'The water curtain is separated, and the stone bridge, dry land, stone base and clear water are all there. The stone monkey remembered the agreement made before the waterfall: go in, see clearly, come back, and share. He stood on the entrance grid of 6-7, preparing to return to his companions along the wet stone path he came from.',
        speaker: 'stone monkey',
        dialogue:
          'I had to walk back the same way so that my partner could figure out which area to step on.',
        scene: 1,
      },
      {
        emoji: '🧩🌊',
        title:
          'The building blocks are all correct, but the second section breaks out of the wet stone road.',
        body: 'The return script is Left 2 → Left 2 → Down 1. All three blocks and three numbers are useful, only the order in the middle is wrong: instead of stepping down on the low stone 4-8 in the second section, continue to the left and bring the stone monkey above the water at 2-7.',
        speaker: 'group of monkeys',
        dialogue: 'Why did you float over our heads?',
        scene: 3,
        blocks: ['⬅️ Left 2 → ⬅️ Left 2 → ⬇️ Down 1', 'This is the order of bugs'],
      },
      {
        emoji: '🔁👣',
        title: 'Just exchange two pieces and run again',
        body: 'First press Go to run through the bug completely, mark three actual stopping points, and find the first deviation; then only exchange the positions of the second Left 2 and Down 1. It is not allowed to change the number, add Set Speed, press Go Home or delete and re-set.',
        speaker: 'stone monkey',
        dialogue:
          'First step down to get back to the low stone, then turn left - the path will lead you back.',
        scene: 4,
        blocks: ['⬅️ Left 2 → ⬇️ Down 1 → ⬅️ Left 2', 'This is the order of repair'],
      },
    ],
    partnerLine:
      "Run the bug first, then exchange two pieces - don't touch a word of the five-dollar route on the way out.",
    mission:
      'First press Go to run the return trip and see how the stone monkey breaks out of the wet stone road in the second section; then only exchange the positions of the second Left 2 and Down 1 so that the order becomes Left 2 → Down 1 → Left 2, then press Go to run again and compare the two series of footprints.',
    question: 'In which paragraph is the first deviation?',
    choices: [],
    retry:
      "Not fixed yet - just swap the second Left 2 and Down 1, don't change the numbers, don't add new blocks, and press Go again.",
    successTitle: 'Return trip fixed! ⭐',
    success:
      'You reproduce the bug first, and then exchange only two pieces to connect the road back - this time the stone monkey stepped on the low stone 4-8.',
    fixTitle: 'Swap the return order back',
    fixPrompt:
      'Turn off this card, press Go to run the bug first, and then move Down 1 to the middle of the two Left 2s.',
    workspaceIntro:
      'An out-of-order return is waiting for you: first run the bug, then swap just two blocks.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Press Go to go over this return trip in its entirety—don’t rush to fix it just yet.',
      watch:
        "Pay attention to the second paragraph: Did the stone monkey's feet still fall on the wet stone?",
      sayFirst:
        'The first section is okay: Left 2 returns the Stone Monkey to the high platform at 4-7.',
      sayThen: 'The second section should go down, not continue to the left.',
      hopFirst: 'He surged up to 2-7—a low rock with no place to land.',
      hopThen: 'After the exchange, Down 1 first puts him back on the low stone at 4-8.',
      retry:
        "Not fixed yet. Just swap the second Left 2 and Down 1, don't change the numbers and don't add blocks.",
      fix: 'Move Down 1 between the two Left 2s - only move these two pieces.',
      test: 'The order has been changed. Press Go to run again and compare with the previous footprints!',
      saving: 'Every step of this edition is on wet stone. I’m saving your fix…',
      complete:
        "You've made the return journey - your partner will follow this set of footprints and you won't miss a step.",
    },
    logicSteps: [
      { icon: '▶️', label: 'Run the bug first', order: 'Recurrence' },
      { icon: '🔍', label: 'Deviation in the second paragraph', order: 'position' },
      { icon: '🔁', label: 'Exchange two pieces', order: 'repair' },
    ],
    logicWhy:
      'All three blocks work, and the numbers are correct: the wrong choice is whether to go left first or down first. The order determines where the footprints fall. Speed ​​and larger numbers cannot fix the direction order.',
    completionTitle: 'Debug completed! 🔧',
    completion:
      'You ran and reproduced the bug, found the deviation in the second paragraph, only exchanged the order of two repairs, and re-ran to verify the footprints.',
    completionSteps: [
      { icon: '🌊', label: 'Break out of the wet stone road', order: 'Recurrence' },
      { icon: '🔍', label: 'The second paragraph should go down', order: 'position' },
      { icon: '👣', label: 'Step back 4-8', order: 'repair' },
    ],
    completionWhy:
      'The end points of both times were 2-8, but only the repaired one passed 4-8 - it was the low rock that my partner wanted to follow.',
    next: 'Stone Monkey returned to his companions and explained his discovery. Next Part: Make this route a path that everyone can take.',
  },

  // Journey to the West S1/C2-P7 — chapter two's Personal Ship. The route is
  // the child's own design: which bank the friends enter from, the exact chain
  // that bank needs, how long the door is held open and which evidence line the
  // cave says. Only the story lock (到达 → 碰到 → 回应 → 等待) is fixed.
  'jtw-s1-c2-p7': {
    mode: 'personal-ship',
    lessonId: 'jtw-s1-c2-p7',
    celebrate: true,
    hero: {
      name: 'stone monkey',
      role: 'A person who guides his companions',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 2 · Personal Ship',
    title: 'Make discovery the path for everyone',
    storyPages: [
      {
        emoji: '🐒🗺️',
        title: 'Just because one person has walked, doesn’t mean everyone can walk.',
        body: 'The stone monkey already knew that the cave was safe, but his friends were still standing by the water. What he has to do is not to walk his own path again, but to design a route that his partners can follow and every step can be predicted.',
        speaker: 'stone monkey',
        dialogue: 'Let me first stand at the starting point and then explain each step clearly.',
        scene: 1,
      },
      {
        emoji: '↔️🪨',
        title: 'Left bank or right bank? The two roads are different',
        body: 'The left bank is the same wet stone road you came from. The starting point is at 2/8. If you move five pieces in one step, you will reach the entrance grid 6-7. The rocky beach with flowers on the right bank is a lower row, starting at 12/9. You have to go up first and then to the left, a total of six blocks, and finally stop at 8-7. Whichever bank you drag the stone monkey to, the route will be recalculated according to which bank - the direction and number of blocks are different.',
        speaker: 'group of monkeys',
        dialogue: "Let's follow your footsteps, don't let us miss the mark!",
        scene: 3,
        blocks: ['Left Bank: ➡️➡️⬆️➡️➡️ (5 blocks)', 'Right Bank: ⬆️⬅️⬅️⬆️⬅️⬅️ (6 blocks)'],
      },
      {
        emoji: '⏳🕳️',
        title: 'After meeting each other, we still have to wait for our companions',
        body: 'The water curtain and the response rail at the entrance have been connected, and none of them can be deleted. What you need to add is the last piece of Wait: wait 1 beat or 2 beats so that your partner can catch up. It\'s up to you to choose from the three sentences which one says "discovery" at the entrance of the cave.',
        speaker: 'stone monkey',
        dialogue: "The door is open, I'm waiting for you to come in.",
        scene: 4,
      },
    ],
    partnerLine:
      'First, let your partner only look at the starting point and block prediction, and then press Go - the prediction and footprints must match.',
    mission:
      'Choose one bank to stand on (left bank 2/8 or drag the stone monkey to the right bank 12/9), connect the one-step movement blocks needed for that bank between Start and End in order, put a Wait 1 or Wait 2 at the end, and then select a discovery dialogue at the entrance of the cave. The On Bump tracks of the water curtain and the opening cannot be deleted. Set up and press Go: the soles of your feet just touch the water curtain. The water curtain hides, the hole appears, and then the stone monkey is waiting for its companions.',
    question: 'Where should the last step of the route stop?',
    choices: [],
    retry:
      'Not established yet. Check three things: whether the stone monkey is standing on the starting grid of a certain bank, whether every step on this bank is correct, and whether there is a Wait 1 or Wait 2 at the end.',
    successTitle: 'This path is accessible to everyone! ⭐',
    success:
      'The stone monkey just happened to touch the water curtain. The water curtain was hidden and the entrance of the cave was lit up. He stayed at the door waiting for his companions - this is a path that can be walked repeatedly.',
    fixTitle: 'Complete your route',
    fixPrompt:
      'Turn off this card, first decide which bank to start from, then connect the moving blocks on this bank step by step, and finally add a Wait block.',
    workspaceIntro:
      'Both sides can be used, but each shore has its own route - choose the shore first, and then count the steps.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready:
        'Decide which bank to start from first: stay on the left bank 2/8, or drag the stone monkey to the right bank 12/9?',
      watch:
        'Look at the footprints: does every step fall on a stone? Did you hit the water curtain in the last step?',
      sayFirst: 'The hole said the discovery you picked.',
      sayThen: 'Discovery is over – the partner knows what’s inside.',
      hopFirst:
        'The stone monkey started to move, taking the first step away from the starting point.',
      hopThen: 'Then go to the entrance in the order you lined up.',
      retry:
        'The route is not yet established: the starting point, the sequence of steps on this side, and the Wait at the end must all be correct.',
      fix: 'In the work area, connect the moving blocks on this side step by step, and finally place a Wait 1 or Wait 2 block.',
      test: 'The route is connected. Press Go to see if the water curtain will separate due to your route!',
      saving: "Just in time, the door is open. I'm saving the route you designed...",
      complete: "Friends follow your route and come in - discovery becomes everyone's home.",
    },
    logicSteps: [
      { icon: '🧭', label: 'Choose a bank', order: 'First' },
      { icon: '👣', label: 'Count the steps on this side', order: 'Again' },
      { icon: '⏳', label: 'Wait 1–2 beats', order: 'at last' },
    ],
    logicWhy:
      'The starting points of the two banks are not in the same row, so it is not enough to reverse the direction: five blocks on the left bank and six blocks on the right bank. The number and direction of the blocks must be recalculated. Waiting is placed after the collision, and the door is opened for the partner.',
    completionTitle: 'Personal Ship Complete! 🗺️',
    completion:
      'You pick a bank, calculate every step on that bank, let the curtain of water part due to real collisions, and leave 1–2 beats for your partner to come in.',
    completionSteps: [
      { icon: '🧭', label: 'my starting point', order: 'First' },
      { icon: '💥', label: 'Just happened to meet', order: 'Again' },
      { icon: '⏳', label: 'Waiting for partners', order: 'at last' },
    ],
    completionWhy:
      'A route that can be predicted and repeated is the path that can be handed over to partners.',
    next: 'The monkeys came in according to your route. Next Part: Looking back to see if the agreement in front of the waterfall has been completed.',
  },
};
