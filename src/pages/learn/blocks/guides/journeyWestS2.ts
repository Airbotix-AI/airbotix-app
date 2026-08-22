import type { StoryMission, StoryMissionChoice } from './types';

const HERO = {
  name: 'Journey to the West Partner',
  role: 'Use different events to make encounters happen in story order',
  asset: '',
};
const EMPTY_CHOICES: StoryMissionChoice[] = [];

function mission(args: {
  lessonId: string;
  mode?: StoryMission['mode'];
  eyebrow: string;
  title: string;
  body: string;
  mission: string;
  next: string;
  choices?: StoryMissionChoice[];
}): StoryMission {
  return {
    mode: args.mode ?? 'complete',
    lessonId: args.lessonId,
    celebrate: false,
    hero: HERO,
    eyebrow: args.eyebrow,
    title: args.title,
    storyPages: [{ emoji: '🗺️🧩', title: args.title, body: args.body, scene: 4 }],
    partnerLine: 'Real blocks, real runs and saved reads are all checked.',
    mission: args.mission,
    question: 'Do the events on stage and the story sequence align?',
    choices: args.choices ?? EMPTY_CHOICES,
    retry: 'Return to the stage and check the event entry, action sequence and running results.',
    successTitle: 'The program already makes sense',
    success: 'Visible results come from real programs built and run by children.',
    fixTitle: 'Complete procedures in the workspace',
    fixPrompt: args.mission,
    workspaceIntro: 'Read the story first, then modify, run and save it in the real workspace.',
    fixChoices: EMPTY_CHOICES,
    fixRetry:
      'Do not delete actions needed for the story, nor rewrite the chain that was verified in the previous part.',
    coach: {
      ready: 'First figure out which event is needed for the story.',
      watch: 'Watch who makes the first move and who is still waiting.',
      sayFirst: 'Dialogue appears, check to whom it belongs.',
      sayThen: 'The dialogue sequence is running.',
      hopFirst: 'The action has taken place.',
      hopThen: 'Actions should be followed by correct events.',
      retry: 'The program or operational evidence is not yet fully aligned.',
      fix: 'Only modify the building blocks required for this task.',
      test: 'Run and observe stable results.',
      saving: 'Saving this real run.',
      complete: 'Procedural and story evidence are aligned.',
    },
    logicSteps: [
      { icon: '🚩', label: 'Go', order: 'First' },
      { icon: '👆', label: 'Tap', order: 'Again' },
    ],
    logicWhy:
      'Different events wait for different conditions, and actions will not automatically occur at the same time just because they are placed on the same stage.',
    completionTitle: 'This program has been saved',
    completion: 'Exact program and real run markers have been written in the same project.',
    completionSteps: [
      { icon: '▶️', label: 'run', order: 'First' },
      { icon: '💾', label: 'save', order: 'back' },
    ],
    completionWhy:
      'Just dragging the blocks will not pass; the server will read back the program and proof of execution.',
    next: args.next,
  };
}

export const JTW_S2_MISSIONS: Record<string, StoryMission> = {
  'jtw-s2-c1-p4': mission({
    lessonId: 'jtw-s2-c1-p4',
    eyebrow: 'Journey to the West · Season 2 · C1-P4 · Build 1',
    title: 'Take three steps today',
    body: 'Connect the bag, the two sections and the waiting in between into a working starting chain.',
    mission:
      'Take Start → Say (pack your bags) → Right 3 → Wait 2 → Right 3 → End, and then press Go.',
    next: 'The next Part makes the Five Elements Mountain street sign wait for clicks.',
  }),
  'jtw-s2-c1-p5': mission({
    lessonId: 'jtw-s2-c1-p5',
    eyebrow: 'Journey to the West · Season 2 · C1-P5 · Build 2',
    title: 'Give way sign waiting to be clicked',
    body: "Xuanzang's route remains the same; street signs only appear and say the location after a real click.",
    mission:
      'Keep the Xuanzang route, build the street sign On Tap → Show → Say(Five Elements Mountain) → End, and run it for real.',
    next: 'Next Part Fix early arrival sequence.',
  }),
  'jtw-s2-c1-p6': mission({
    lessonId: 'jtw-s2-c1-p6',
    mode: 'observe-fix',
    eyebrow: 'Journey to the West · Season 2 · C1-P6 · Debug',
    title: 'Put waiting back in the middle of two sections of road',
    body: 'The wrong version walked two sections before waiting. Run it first to see the error, then move Wait 2 back to the middle.',
    mission:
      'Run the wrong version first; fix it to Start → Say → Right 3 → Wait 2 → Right 3 → Say(arrived) → End and run again.',
    next: 'Next Part Make your own departure page.',
  }),
  'jtw-s2-c1-p7': mission({
    lessonId: 'jtw-s2-c1-p7',
    mode: 'personal-ship',
    eyebrow: 'Journey to the West · Season 2 · C1-P7 · Personal Ship',
    title: 'Save my first trip',
    body: 'Choose a kettle, book or scarf, and then choose slow or normal speed; the three-step route cannot be changed.',
    mission: 'Complete your own dialogue and tempo, run, save, close, reopen and run again.',
    next: 'Next Part Read this real work and go back to the first chapter.',
  }),
  'jtw-s2-c2-p4': mission({
    lessonId: 'jtw-s2-c2-p4',
    eyebrow: 'Journey to the West · Season 2 · C2-P4 · Build 1',
    title: 'Xuanzang first approached and asked',
    body: "The green flag only lets Xuanzang approach the edge of the mountain; Wukong's click script remains silent.",
    mission: 'Hit Start → Right 3 → Wait 2 → Say (who is speaking) → End and press Go.',
    next: 'The next Part completes the click response of Wukong.',
  }),
  'jtw-s2-c2-p5': mission({
    lessonId: 'jtw-s2-c2-p5',
    eyebrow: 'Journey to the West · Season 2 · C2-P5 · Build 2',
    title: 'Ask and respond later',
    body: 'Go first to let Xuanzang ask, then click Wukong to let him appear, answer and jump.',
    mission:
      'Complement On Tap → Show → Say (I am waiting for the traveler heading west) → Hop 1 → End; Go first, then tap.',
    next: 'The next part will deliberately let Wukong answer too early.',
  }),
  'jtw-s2-c2-p6': mission({
    lessonId: 'jtw-s2-c2-p6',
    mode: 'observe-fix',
    eyebrow: 'Journey to the West · Season 2 · C2-P6 · Debug',
    title: 'Who answered too early?',
    body: 'The wrong version has Wukong also use Start. Press Go first to see him answer first, then just change the event back to On Tap.',
    mission:
      'Run the wrong version first and point out that Wukong is too early; only change the Trigger. After saving, first go to see it wait, and then tap to see its response.',
    next: "The next part maintains the Tap structure and designs Wukong's first step after leaving the mountain.",
    choices: [
      { id: 'wukong-too-early', label: 'Wukong answered before Xuanzang asked', correct: true },
      {
        id: 'xuanzang-too-early',
        label: 'Xuanzang shouldn’t go to the edge of the mountain',
        correct: false,
      },
    ],
  }),
  'jtw-s2-c2-p7': mission({
    lessonId: 'jtw-s2-c2-p7',
    mode: 'personal-ship',
    eyebrow: 'Journey to the West · Season 2 · C2-P7 · Personal Ship',
    title: "Design Wukong's first step after leaving the mountain",
    body: "Keep Xuanzang's line of inquiry and choose Wukong's true response from three lines of dialogue and a skip/turn.",
    mission:
      'Take On Tap → Show → Say (your choice) → Hop 1 or Turn 1 → End; first Go, then Tap, save and restart.',
    next: 'The next part reads this work retelling the footprints of the two events.',
  }),
  'jtw-s2-c3-p4': mission({
    lessonId: 'jtw-s2-c3-p4',
    eyebrow: 'Journey to the West · Season 2 · C3-P4 · Build 1',
    title: 'Let the collision leave water ripples',
    body: 'Wukong Go to the 6th frame, the collision script of the rhodolite becomes larger and chime sounds.',
    mission:
      'Use Wukong Start → Right 4 → Say (there are water patterns here) → Wait 2 → End; use stone to make On Bump → Grow 1 → Chime → End, and then press Go.',
    next: 'The next part is to have the white reflection respond to this collision.',
  }),
  'jtw-s2-c3-p5': mission({
    lessonId: 'jtw-s2-c3-p5',
    eyebrow: 'Journey to the West · Season 2 · C3-P5 · Build 2',
    title: 'Let White Dragon Horse respond to water patterns',
    body: 'Keep the Wukong and the stone and let the hidden White Dragon Horse appear, speak and jump once after the collision.',
    mission:
      'For White Dragon Horse On Bump → Show → Say(I am willing to go with you) → Hop 1 → End, then press Go.',
    next: 'The next part fixes the one-frame collision error.',
  }),
  'jtw-s2-c3-p6': mission({
    lessonId: 'jtw-s2-c3-p6',
    mode: 'observe-fix',
    eyebrow: 'Journey to the West · Season 2 · C3-P6 · Debug',
    title: 'Just one space short of repair',
    body: 'The wrong version only moves three spaces. First run to confirm that Wukong stops at the 5th cell, and then change Right 3 to Right 4.',
    mission:
      'Go first and see that there is one space difference; just change the moving distance to 4, then Go again and confirm that both the water pattern and White Dragon Horse are responded to.',
    next: 'The next part is to design your own water pattern distance and welcome action.',
  }),
  'jtw-s2-c3-p7': mission({
    lessonId: 'jtw-s2-c3-p7',
    mode: 'personal-ship',
    eyebrow: 'Journey to the West · Season 2 · C3-P7 · Personal Ship',
    title: 'Save my Eagle Sorrow Stream findings',
    body: 'Align the 5th, 6th or 7th stone exactly with the movement distance and choose a White Dragon Horse welcome version.',
    mission:
      'Completing the distance and welcome version, Go runs, saves, closes, reopens and runs again.',
    next: 'Next Part Read Chapter 3 of this retelling of a true work.',
  }),
  'jtw-s2-c4-p4': mission({
    lessonId: 'jtw-s2-c4-p4',
    eyebrow: 'Journey to the West · Season 2 · C4-P4 · Build 1',
    title: 'Run the blue messenger',
    body: 'Wukong Click to send blue; Bajie only walks to the route card after receiving a message of the same color.',
    mission:
      'Take Wukong On Tap → Say → Send Blue → End; Bajie Get Blue → Right 3 → Say → End, and then click Wukong to run.',
    next: 'Next Part Add yellow to White Dragon Horse to receive the receipt.',
  }),
  'jtw-s2-c4-p5': mission({
    lessonId: 'jtw-s2-c4-p5',
    eyebrow: 'Journey to the West · Season 2 · C4-P5 · Build 2',
    title: 'Let White Dragon Horse reply received',
    body: 'Keep the blue route chain, let Bajie turn yellow, White Dragon Horse turn yellow and then display and respond.',
    mission:
      'Add Send yellow to the end of Bajie; add White Dragon Horse to Get yellow → Show → Say (received) → End, and then click Wukong to run the whole chain.',
    next: 'An orange receive breakpoint will appear in the next Part.',
  }),
  'jtw-s2-c4-p6': mission({
    lessonId: 'jtw-s2-c4-p6',
    mode: 'observe-fix',
    eyebrow: 'Journey to the West · Season 2 · C4-P6 · Debug',
    title: 'Find orange breakpoint',
    body: 'Wukong is blue, but Bajie is waiting for orange. First click Wukong to see the message and stop, then just change Bajie Get back to blue.',
    mission:
      'Run it first and point out that Bajie has not been received; only repair Get Orange → Get Blue, save and click Wukong again.',
    next: 'Next Part Design your own route color and direction.',
  }),
  'jtw-s2-c4-p7': mission({
    lessonId: 'jtw-s2-c4-p7',
    mode: 'personal-ship',
    eyebrow: 'Journey to the West · Season 2 · C4-P7 · Personal Ship',
    title: 'Save my route messages',
    body: 'Select the route color from green, blue, or purple, configure Send/Get simultaneously, and then select the left or right route; the yellow receipt remains unchanged.',
    mission:
      'Complete your personal colors and orientation, click Wukong to run, save, close, reopen and run again.',
    next: 'The next part reads the real work and talks about Bajie joining.',
  }),
  'jtw-s2-c5-p4': mission({
    lessonId: 'jtw-s2-c5-p4',
    eyebrow: 'Journey to the West · Season 2 · C5-P4 · Build 1',
    title: 'Connect the two messages',
    body: 'Wukong gives it to Bajie in blue; after Bajie receives it, it gives it to Wujing in yellow; Wujing finally shows the shallow water mark.',
    mission:
      'Take the blue → yellow relay of three characters and click Wukong to run. The confirmation response occurs in the order of Wukong, Bajie, and Wujing.',
    next: 'Next Part Add purple receipt back to Wukong.',
  }),
  'jtw-s2-c5-p5': mission({
    lessonId: 'jtw-s2-c5-p5',
    eyebrow: 'Journey to the West · Season 2 · C5-P5 · Build 2',
    title: 'Get purple receipts back',
    body: 'Keep the blue → yellow route unchanged. Wu Jing gets purple; Wukong gets purple, jumps once and confirms that the route is connected.',
    mission:
      'Add Send purple to Wujing, add Get purple to Wukong → Hop 1 → Say (the route is connected) → End, and then click Wukong to run the entire chain.',
    next: "The next part will be to remove Bajie's yellow Send.",
  }),
  'jtw-s2-c5-p6': mission({
    lessonId: 'jtw-s2-c5-p6',
    mode: 'observe-fix',
    eyebrow: 'Journey to the West · Season 2 · C5-P6 · Debug',
    title: 'Find the intermediate transition breakpoint',
    body: 'Bajie received the blue color but did not continue to receive the yellow color. Run the wrong version first, and then only make up for the intermediate Send.',
    mission:
      'First click Wukong to observe the message and stop at Bajie; make up for Bajie and send yellow, and then run the blue → yellow → purple chain again.',
    next: 'Next Part Design your own three-color relay.',
  }),
  'jtw-s2-c5-p7': mission({
    lessonId: 'jtw-s2-c5-p7',
    mode: 'personal-ship',
    eyebrow: 'Journey to the West · Season 2 · C5-P7 · Personal Ship',
    title: 'Save my tricolor relay',
    body: "The three sections use different colors, and each section's Send/Get still needs to be paired.",
    mission:
      'After completing the three-color selection, click Wukong to run, save, close, reopen and run again.',
    next: 'The next part reads the work and tells Wu Jing to join.',
  }),
  'jtw-s2-c6-p4': mission({
    lessonId: 'jtw-s2-c6-p4',
    eyebrow: 'Journey to the West · Season 2 · C6-P4 · Build 1',
    title: 'Connect the collection page and bridge page',
    body: 'Xuanzang turns blue from the first page to the second page; Bajie connects to blue, crosses the bridge, and turns yellow to enter the third page.',
    mission:
      'Complete the first and second pages of the exact script, press Go to run and save the three-page project.',
    next: 'Next Part Complete the team ending on page three.',
  }),
  'jtw-s2-c6-p5': mission({
    lessonId: 'jtw-s2-c6-p5',
    eyebrow: 'Journey to the West · Season 2 · C6-P5 · Build 2',
    title: 'Bring the complete team to the flag',
    body: 'Wu Jing took the yellow to show the road sign, White Dragon Horse walked to the flag, Wukong waited for the real click and then said departure.',
    mission:
      'Complete the three scripts on the third page, run them page by page and save them to the stable End.',
    next: 'The next part fixes the return page and wrong color message.',
  }),
  'jtw-s2-c6-p6': mission({
    lessonId: 'jtw-s2-c6-p6',
    mode: 'observe-fix',
    eyebrow: 'Journey to the West · Season 2 · C6-P6 · Debug',
    title: 'Fix three page errors one at a time',
    body: 'The second page error returns to the first page, Wu Jing is still waiting for the color purple. The two runs left evidence of loops and breakpoints respectively.',
    mission:
      'First repair Page1→Page3 and rerun, then repair GetPurple→GetYellow and rerun; the rest of the script remains unchanged.',
    next: 'Next Part Make your own team three-page play.',
  }),
  'jtw-s2-c6-p7': mission({
    lessonId: 'jtw-s2-c6-p7',
    mode: 'personal-ship',
    eyebrow: 'Journey to the West · Season 2 · C6-P7 · Personal Ship',
    title: 'Save my complete team drama',
    body: 'Select the third page action and preset dialogue so that the silent mode still has clearly visible results.',
    mission:
      'Run page by page, ask your partner to reach the end of the unanswered picture; modify the prompts, save, restart and run again.',
    next: 'Next Part: Read the final work to complete the season finale Retell.',
  }),
};
