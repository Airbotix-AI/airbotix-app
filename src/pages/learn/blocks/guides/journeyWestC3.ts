// Journey to the West S1 C3｜一叶木筏求师路 — Story Blocks mission guides.
// Split per chapter to keep every file under the 1000-line hard rule in
// rules/file-organization.md; curriculumGuides.ts stays the public module.
//
// Chapter three is the season's first THREE-page build, so the studio mission is
// about a page that has to earn its place in the route: 海中央 must have a story
// (sound, movement, a pause) AND an exit that hands the raft to 彼岸山林.

import type { StoryMission } from './types';

export const JTW_C3_MISSIONS: Record<string, StoryMission> = {
  // Journey to the West S1/C3-P4 — chapter three's Build 1 (scene-specs
  // JTW-S1-C3-P4, teaching script C3 Part 4). Page 2 ships with the raft, the
  // sea background and an EMPTY script slot under the Start block; the child
  // selects and orders Whoosh · Right 4 · Wait 2 · Page 3. Pages 1 and 3 keep
  // read-only demo chains so the three pages can be compared.
  'jtw-s1-c3-p4': {
    mode: 'complete',
    lessonId: 'jtw-s1-c3-p4',
    hero: {
      name: 'Monkey King',
      role: 'Raftman in the middle of the sea',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 3 · Build 1',
    title: 'Let the center of the sea have both a story and an outlet',
    storyPages: [
      {
        emoji: '🗺️🛶',
        title: 'We found the right intersection, but the middle of the sea is still empty.',
        body: "Part 3 has made it clear: the number on the exit is the address of the next page. But after correcting the numbers, nothing happened on this page in the middle of the sea - the raft was about to leave as soon as it came in, and the audience couldn't tell what happened on this section.",
        speaker: 'Monkey King',
        dialogue: 'It is not enough to have an exit, this page must also have its own story.',
        scene: 1,
      },
      {
        emoji: '🧩💨',
        title: 'You put the four pieces, Start is already there',
        body: "Page 2's script slot has only one Start. You have to choose and arrange four pieces yourself: 💨 Whoosh is the sea breeze, ➡️ Right 4 is the raft really moving forward, ⏱ Wait 2 is he stopped to take a look, 📄 Page is the exit of this section of the road. The demonstration links on Page 1 and Page 3 can only be viewed and do not change.",
        speaker: 'group of monkeys',
        dialogue: 'Sound, movement, pause, exit—each of these four things does its own thing.',
        scene: 3,
        blocks: ['💨 Whoosh → ➡️ Right 4', '⏱ Wait 2 → 📄 Page 3'],
      },
      {
        emoji: '📄3️⃣',
        title: 'The number on Page should be changed to 3',
        body: '📄 Page wrote 1 when it was first lowered, and that was the Flower-Fruit Mountain coast - the raft would be sent home again. Click the number to change it to 3. 3 is the mountains and forests on the other side. After placing it, press Go from Page 1: wind, forward, pause, and transition, all four things must really appear.',
        speaker: 'Monkey King',
        dialogue: 'I want to leave from here, going to the other side, not looking back.',
        scene: 4,
      },
    ],
    partnerLine:
      "Do you remember the password for Part 3? The exit number determines the next page - now it's your turn to build this one.",
    mission:
      'Page 2 only has Start in its script slot. Select and connect four pieces in order: 💨 Whoosh, ➡️ Right 4, ⏱ Wait 2, 📄 Page, then click the number on Page to 3, and then press Go from Page 1 to complete the run. Do not delete any of the demonstration links on Page 1 and Page 3.',
    question: 'Which piece is responsible for delivering the raft to the next page?',
    choices: [],
    retry:
      'There is still one thing missing: the four pieces must be in the order of Whoosh → Right 4 → Wait 2 → Page 3, the number on Page must be 3, and the demonstration chains of Page 1 and Page 3 must remain the same.',
    successTitle: 'There is a story in the middle of the sea! ⭐',
    success:
      'The sound of wind, advancement, and pause all happened, and the raft was handed over from this page to the mountains and forests on the other side - 1 → 2 → 3 in one run.',
    fixTitle: 'Complete the page in the center of the sea',
    fixPrompt:
      'Turn off the card and follow Start on Page 2 with Whoosh → Right 4 → Wait 2 → Page 3.',
    workspaceIntro:
      'The middle of the sea is still empty - you have to place the four blocks, and there are no buttons to install them for you.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'There are four blocks after Start on Page 2: Whoosh, Right 4, Wait 2, and Page 3.',
      watch:
        'Watching the raft go through this page: Is the wind blowing? Did he stop? Which page did you go to last?',
      sayFirst:
        'Let’s start with the prediction: where in the middle of the sea will the raft leave?',
      sayThen: 'Is the left square the same as you predicted?',
      hopFirst:
        'The sea breeze sounded first, and then the audience knew that this was a windy sea.',
      hopThen: 'Wait 2 That pause is the time for him to look up and look in the direction.',
      retry:
        'The order or numbers are not right yet. Whoosh → Right 4 → Wait 2 → Page 3, change the number of Page to 3.',
      fix: 'Place four pieces in the actual workspace - there are no buttons that will set up the chain for you.',
      test: 'Four pieces are connected. Return to Page 1 Press Go to see if you have really reached the mountains and forests on the other side!',
      saving:
        "There is a story on this page in the middle of the sea. I'm saving the sea route you took...",
      complete:
        'The raft is no longer sent back to Flower-Fruit Mountain - it reaches the other side through a sea of ​​sounds, movements, and pauses.',
    },
    logicSteps: [
      { icon: '💨', label: 'Whoosh sea breeze', order: 'First' },
      { icon: '➡️', label: 'Right 4 Forward', order: 'Again' },
      { icon: '⏱', label: 'Wait 2 Pause', order: 'Then' },
      { icon: '📄', label: 'Page 3 Export', order: 'at last' },
    ],
    logicWhy:
      'The sound gives the page atmosphere, the movement gives it progress, and the pause allows the audience to see clearly; the numbers on the exit hand over the paragraph to the next page. Without the exit, the story stops at sea; without the first three blocks, Page 2 is just an empty cutscene.',
    completionTitle: 'Build 1 completed! 🛶',
    completion:
      'You select four pieces yourself, connect them in order, set the Page target to 3, and run it completely from Page 1: the actual trajectory is 1 → 2 → 3, and Page 3 ends stably.',
    completionSteps: [
      { icon: '🌊', label: 'There is content in the middle of the sea', order: 'First' },
      { icon: '📄', label: 'export write 3', order: 'Again' },
      { icon: '🏁', label: 'Page 3 End', order: 'at last' },
    ],
    completionWhy:
      'The three pages are now doing their own things: Page 1 is leaving home, Page 2 is observing the progress, and Page 3 is arriving. Half of the journey is printed brightly - the other half needs to be in the correct position when the raft crosses the page.',
    next: 'The route is connected. Next Part: Choose starry night or morning fog to express the middle part of the journey.',
  },
  // Journey to the West S1/C3-P5 — the chapter's expression choice (scene-specs
  // JTW-S1-C3-P5, teaching script C3 Part 5). ONE lesson, TWO valid saved
  // programs on TWO different Page 2 seas, so the guide talks about both: which
  // sea the studio paints was already decided on the Part page (each branch has
  // its own whitelisted starter), and the work in here is the SAME either way —
  // add this version's 2–3 expression blocks in front of the shared
  // `Right 4 → Page 3` route, which neither version may touch.
  'jtw-s1-c3-p5': {
    mode: 'complete',
    lessonId: 'jtw-s1-c3-p5',
    hero: {
      name: 'Monkey King',
      role: 'rafters in the middle sea',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 3 · Story Selection',
    title: 'Both starry night and morning fog need to be observed',
    storyPages: [
      {
        emoji: '🌙🌫',
        title: 'Both seas are right',
        body: 'You have already chosen which sea to take on this journey. There is a moon on the sea in the starry night, but the clouds are still pressing in the sky; in the morning mist the sea is so white that my eyes cannot help. The two kinds of seas talk about the same thing: when you can’t see clearly, you should observe first before continuing.',
        speaker: 'Monkey King',
        dialogue: 'The sea is still this sea, I just changed the way to let you see clearly.',
        scene: 1,
      },
      {
        emoji: '🧩✨',
        title: 'Precede this version of the expression with Right 4',
        body: 'The starry night version follows two pieces: ✨ Sparkle to let the stars ring, ⏱ Wait 2 to pause for two beats and wait for the clouds to disperse. The Morning Mist version has three pieces: 🐢 Speed ​​is clicked to be the slowest, 💨 Whoosh is sea breeze, and 💬 Say text can be selected from the presets with just one click (no typing required).',
        speaker: 'group of monkeys',
        dialogue: 'Observe first, then move forward - this is the order in both editions.',
        scene: 3,
        blocks: ['✨ Sparkle → ⏱ Wait 2', '🐢 Speed → 💨 Whoosh → 💬 Say'],
      },
      {
        emoji: '➡️📄',
        title: '➡️ Right 4 and 📄 Page 3 Don’t move even one piece',
        body: 'There is already ➡️ Right 4 → 📄 Page 3 in the script slot, which is a route shared by both versions. The expression building block should be connected in front of Right 4; change the Page back to 1, delete the Page, or just change the background without connecting the building block, and the center of the sea will no longer "continue after observation".',
        speaker: 'Monkey King',
        dialogue: 'I can choose the rhythm, but not which page to go to.',
        scene: 4,
      },
    ],
    partnerLine:
      'The companion only looks at your weather card: what will he hear? When will the raft move? Which page did you go to last?',
    mission:
      'Connect this version of the expression block in front of ➡️ Right 4: Starry Night is ✨ Sparkle → ⏱ Wait 2, Morning Fog is 🐢 Speed ​​(slowest) → 💨 Whoosh → 💬 that default sentence. Don’t move any part of Right 4 and 📄 Page 3, then press Go from Page 1 for a complete run.',
    question: 'Which two pieces of this page can you decide on?',
    choices: [],
    retry:
      'There is still one thing missing: the expression building block must be connected in front of ➡️ Right 4, and the order cannot be messed up; Right 4 is still 4, 📄 Page is still 3, and the demonstration chain of Page 1 and Page 3 must also remain the same.',
    successTitle: 'This version of the sea has stood still! ⭐',
    success:
      'The observation happened, and the route did not change at all - the raft was still handed over from this page to the mountains and forests on the other side.',
    fixTitle: 'Complete this version of the expression',
    fixPrompt:
      'Turn off this card and connect this version of the expression block between Start and ➡️ Right 4.',
    workspaceIntro:
      'The route is already there. What you want to add is "how he observed", not "where he went".',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Between Start and ➡️ Right 4, connect this version of the expression block.',
      watch: 'Look at this page: Did the observation really happen? Did he leave after observing?',
      sayFirst: 'Let’s start with predictions: What will the companion hear?',
      sayThen: 'Is what you heard really the same as what you said?',
      hopFirst:
        'On a starry night, you have to wait for the clouds to clear, and in the morning fog, you have to slow down and listen to the waves - all are observed first.',
      hopThen: 'After the observation, ➡️ Right 4 sent him across this section of the sea.',
      retry:
        'The order or numbers are not right yet. The expression blocks are in the front, ➡️ Right 4 → 📄 Page 3 in the back, and Page still says 3.',
      fix: 'Connect the bricks in the real workspace - no buttons will assemble this version for you.',
      test: 'Got it. Return to Page 1 and press Go to see if this version has also reached the other side of the mountains and forests!',
      saving: "This piece of sea has its own look. I'm saving the version you selected...",
      complete:
        'The audience can read it: he observes first, then continues—and still gets to Page 3.',
    },
    logicSteps: [
      { icon: '👀', label: 'Observe first', order: 'First' },
      { icon: '➡️', label: 'Right 4 Forward', order: 'Again' },
      { icon: '📄', label: 'Page 3 Export', order: 'at last' },
    ],
    logicWhy:
      'Sound, speed and pauses change the rhythm, ➡️ and 📄 change the route. So both versions are valid: they change "how to say it", not "which way to say it". Going faster when you can\'t see clearly just goes wrong faster.',
    completionTitle: 'Story selection completed! 🌙🌫',
    completionSteps: [
      { icon: '🎴', label: 'Choose a sea', order: 'First' },
      { icon: '👀', label: 'Observation really happens', order: 'Again' },
      { icon: '🏁', label: 'Export is still 3', order: 'at last' },
    ],
    completion:
      'You chose a sea, connected it with your own expression blocks, and ran a complete run from Page 1: the observation happened, and the route was still 1 → 2 → 3.',
    completionWhy:
      'The same route can be told in two ways, both of which are correct - because what you change is the rhythm, not the exit. Next step: The raft is on the wrong side when it crosses the page.',
    next: 'The weather and route were clear. Next Part: Find out why the raft jumped to the other side.',
  },
  // Journey to the West S1/C3-P6 — chapter three's Fix (scene-specs
  // JTW-S1-C3-P6, teaching script C3 Part 6). Every block on all three pages is
  // right, including the child's own C3-P5 weather chain and both exits; what is
  // wrong is a stage POSITION — Page 2's start cell ships as 16/8 instead of
  // 2/8, so the raft appears on the far side of the sea. The repair is a DRAG,
  // not a block edit: the child pulls the raft and the monkey king standing on
  // it back to the calibrated cell and reruns.
  'jtw-s1-c3-p6': {
    mode: 'manual-fix',
    lessonId: 'jtw-s1-c3-p6',
    hero: {
      name: 'Monkey King',
      role: 'The rafters standing on the wrong side of the page spread',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 3 · Debug',
    title: 'The raft jumped out of position',
    storyPages: [
      {
        emoji: '🛶↔️',
        title: 'The building blocks are all right, but the picture cannot be connected.',
        body: 'There is no problem with the three pages of building blocks, numbers, and exits: the sea you chose is still there, there is no missing piece of the expression chain, and the raft still completes 1 → 2 → 3. But he clearly crossed out from the right side of the first page, and then reappeared on the right side when turning to the second page - the audience would think that someone had moved the raft there.',
        speaker: 'group of monkeys',
        dialogue: 'Why did you run to the other side of the sea again?',
        scene: 1,
      },
      {
        emoji: '📍2️⃣',
        title: "What's wrong is the starting grid, not the building blocks.",
        body: 'The starting point of Page 2 is written at 16-8, which is the right side of the sea; the agreed starting point of this route is 2-8, which is the left side of the sea. The building blocks determine what happens on this page, the exit number determines which page to turn to, and the starting grid determines where he will appear on the next page - this time the error is the third one.',
        speaker: 'Monkey King',
        dialogue:
          'I have been walking to the right, so I should continue on the road from the left.',
        scene: 3,
        blocks: [
          '📍 Starting point 16-8 · Appears on the right',
          '📍 Starting point 2-8 · Continue on the left',
        ],
      },
      {
        emoji: '🖐️🛶',
        title: 'Drag it back and only move this part',
        body: "Turn to Page 2 and drag the raft and the Monkey King standing on the raft to the 2-8 grid on the left side of the sea - it will be sucked to the grid by itself when you let go. Don't change the exit of Page 1, don't delete the expression block, don't add a louder sound, and don't touch the other two pages. After dragging, press Go.",
        speaker: 'Monkey King',
        dialogue:
          'One change is enough. If you change one more place, the story will be messed up again.',
        scene: 4,
      },
    ],
    partnerLine:
      'The companion only looks at the picture: Where does he come from and where is he going? If you can catch it, it means you are starting from the right point.',
    mission:
      'Turn to Page 2, drag the raft and the Monkey King back to spaces 2-8 on the left side of the sea, and then press Go to run once. The building blocks on the three pages, the exit, and the sea you selected must remain the same—only this one position is allowed to be changed this time.',
    question: 'Where is the real problem with this route?',
    choices: [],
    retry:
      'Not yet fixed: The starting point of Page 2 should fall exactly on 2-8, and the raft and the Monkey King should be in that space; the building blocks, exit, background, and the other two pages cannot be moved.',
    successTitle: 'The raft no longer jumps! ⭐',
    success:
      'He continued walking from the left side of the sea - the boundaries of the three pages connected into an unbroken direction line.',
    fixTitle: 'Drag the starting point of Page 2 back',
    fixPrompt:
      'Turn off this card, turn to Page 2, and drag the raft and the Monkey King to spaces 2-8 on the left side of the sea.',
    workspaceIntro:
      'There is no need to change a single building block. What needs to be moved is the square on the stage - the raft is on the wrong side.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'First, turn to Page 2 and see which side the raft starts on.',
      watch:
        'Focus on the moment when each page is opened: Is he standing on the left or on the right?',
      sayFirst:
        'Let’s talk about expectations first: the previous page left from the right, where should the next page come in?',
      sayThen: 'Is the side that really came in the same as you said?',
      hopFirst: 'Page 1 He walked to 7-9 before leaving, which was the right.',
      hopThen: "Page 2 But it starts at 16-8 - that's still on the right, so the screen breaks.",
      retry:
        'The starting point has not yet fallen into 2-8. The raft and the monkey king should be in that space together, and nothing else should be moved.',
      fix: 'Use your hands to drag the raft to the left of the surface - no button will place it for you.',
      test: 'The starting point is back. Press Go to run once, then return to the Part page to re-run the entire route from Page 1!',
      saving: 'The page finally starts on the left. I’m saving your fix…',
      complete:
        'By changing the position one by one, the three pages are connected to form a road - the audience can tell that the same person walked on it.',
    },
    logicSteps: [
      { icon: '▶️', label: 'Run the wrong version first', order: 'Recurrence' },
      { icon: '🔍', label: 'Page 1 → Page 2 Disconnect', order: 'position' },
      { icon: '📍', label: 'Drag the starting point back to 2-8', order: 'repair' },
    ],
    logicWhy:
      'The building blocks control what this page does, the exit number controls which page it is turned to, and the starting grid controls where it will appear on the next page. Three things need to be separated in order to change only one thing: this time the building blocks and the exit are both correct, and changing them will only break the good parts.',
    completionTitle: 'Debug completed! 🔧',
    completion:
      'You first ran the wrong version and pointed out that Page 1 → Page 2 was the first disconnection. You only dragged the starting point of Page 2 back to 2-8, and then re-ran from Page 1 to verify the three boundaries.',
    completionSteps: [
      { icon: '🛶', label: 'Appears again on the right', order: 'Recurrence' },
      { icon: '📍', label: 'Starting point 16-8', order: 'position' },
      { icon: '➡️', label: 'Continue on the left', order: 'repair' },
    ],
    completionWhy:
      'The two runs took the same route, the same sea, and the same string of building blocks. Only one line was different - and whether the story was readable or not, this was the only difference.',
    next: 'Public routes have been repaired. Next Part: Create a three-page personal path to seek guidance that can be saved and reopened.',
  },
  // Journey to the West S1/C3-P7 — chapter three's Personal Ship (scene-specs
  // JTW-S1-C3-P7, teaching script C3 Part 7). Nothing is pre-built: all three
  // script slots ship with a bare Start, so every meaningful action, both page
  // exits and the closing End are blocks the child places. The guide therefore
  // talks about a STRUCTURE (每页 2–4 个动作、两个出口、一个 End) instead of a
  // chain, and about the four real choices — 星夜/晨雾、等待节奏、预设对白、木筏路径.
  'jtw-s1-c3-p7': {
    mode: 'personal-ship',
    lessonId: 'jtw-s1-c3-p7',
    celebrate: true,
    hero: {
      name: 'Monkey King',
      role: 'People who write three pages on their own to seek guidance from teachers',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: 'Journey to the West · Chapter 3 · Personal Ship',
    title: 'My three-page guide to seeking a teacher',
    storyPages: [
      {
        emoji: '📖🛶',
        title: 'This time all three pages are empty',
        body: 'In the first few parts, there are always one or two pages sent to you. This time is different: there is only one Start in the script slots of Page 1, Page 2, and Page 3. The three stories of leaving home, observing, and arriving are all written by you - the name of the work is Across the Sea to Learn.',
        speaker: 'Monkey King',
        dialogue: 'This path is my own, and I want others to understand it.',
        scene: 1,
      },
      {
        emoji: '🧩7️⃣',
        title: 'At least seven dollars, and every page must have content',
        body: 'Put 2–4 meaningful actions on each page: ➡️ Right walking, 💨/✨ sound, ⏱ Wait or 🐢 Speed ​​rhythm, 💬 preset sentence. Add to that the 📄 Page exit for Page 1 and Page 2, and the 🏁 End for Page 3 – the total is at least seven bucks. Any page with only one outlet is an empty shell.',
        speaker: 'group of monkeys',
        dialogue: 'Something really has to happen on every page for others to read it.',
        scene: 3,
        blocks: ['➡️ Right · 💨 Sound', '⏱ Wait · 📄 Page · 🏁 End'],
      },
      {
        emoji: '🛶📍',
        title: 'Wherever the raft is, you have to walk',
        body: "Page 1's raft is parked on the 4th square to your right, so the movements on this page must add up to exactly 4 squares before he can get on the raft. Page 2's raft moves 4 squares to the right by itself, so the total movement of the page on the sea must be exactly 4 squares, and his feet are always on the raft. The rest is your choice.",
        speaker: 'Monkey King',
        dialogue:
          'There are many ways to tell the story, but there is only one raft under your feet.',
        scene: 4,
      },
    ],
    partnerLine:
      'Your partner only looks at three pages of landmarks, starting points and exit numbers, and makes predictions page by page; then you run through them from Page 1 to show him.',
    mission:
      'Put 2–4 actions on each of the three pages: Page 1 has to walk 4 squares to get on the raft, Page 2 has to walk 4 squares and have ⏱ Wait or 🐢 Speed, Page 3 has to say a preset sentence. Page 1’s 📄 Page becomes 2, Page 2’s dot becomes 3, and Page 3 ends with 🏁 End. Have at least two pieces of movement, a sound and a Wait/Speed, then press Go to run a save.',
    question: 'On which page can I put just one exit?',
    choices: [],
    retry:
      'There is still a little to go: check whether each page has 2–4 actions, whether the movements of Page 1 and Page 2 are exactly 4 blocks, whether there is a Wait or Speed ​​on the sea page, whether there is talk on the other side, whether the exits are 2 and 3, and whether the last page is End.',
    successTitle: 'Three pages were written by you! ⭐',
    success:
      'Leaving home, observing, and arriving - each of the three sections has its own content. The exit continues the story all the way, and finally ends firmly.',
    fixTitle: 'Write all three pages in full',
    fixPrompt:
      'Turn off this card, start on Page 1, and fill in your actions, exits, and endings page by page.',
    workspaceIntro:
      'Three Starts, three blank pages. This time there are no demonstration chains to copy – the route is up to you.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready:
        'First put the path to the raft on Page 1, then click on a 📄 Page and click the number to 2.',
      watch: 'Look at it page by page: What’s happening on this page? Where did he go next?',
      sayFirst:
        'Let’s talk about prediction first: Looking at your exit number, what page will your companion say he will turn to next?',
      sayThen:
        'Is the one who ran out the same as what his companion said? The page that is different is the one that needs to be changed.',
      hopFirst:
        "Page 1's raft is on the 4th square on the right, and he can get on it only after covering 4 squares.",
      hopThen:
        "Page 2's raft moves 4 squares by itself, and your movement must also be exactly 4 squares.",
      retry:
        'Not yet established: 2–4 blocks of action per page, exits 2 and 3, last page End, at least seven blocks.',
      fix: 'Layer out the pages in a real workspace - this time there are no buttons to place any pieces for you.',
      test: 'Three pages are written. Press Go to run once and save, then go back to the Part page, reopen and run again from Page 1!',
      saving: 'This is your own path to becoming a teacher. I’m saving Across the Sea to Learn…',
      complete:
        'The saved copy will still be exactly the same when closed and opened again - others can also follow it and run it again.',
    },
    logicSteps: [
      { icon: '🏝', label: 'Page 1 Leaving Home', order: 'First' },
      { icon: '🌊', label: 'Page 2 Observation', order: 'Again' },
      { icon: '⛰', label: 'Page 3 Arrival', order: 'at last' },
    ],
    logicWhy:
      'Each page is responsible for a story, the exit number passes it to the next paragraph, and the End indicates "finished". If one of the three things is missing, readers will not be able to read it: without content, it is an empty shell, without an exit, it is a dead page, and without an End, it is impossible to stop.',
    completionTitle: 'Personal Ship Complete! 🛶',
    completion:
      'You have written three pages, placed two exits and an End, saved it, closed it and opened it again - the three pages, weather, location and script are still the same, and you have run through 1 → 2 → 3 again from Page 1.',
    completionSteps: [
      { icon: '🧩', label: 'You added more than seven blocks', order: 'First' },
      { icon: '💾', label: 'Save · Close · Reopen', order: 'Again' },
      { icon: '🏁', label: 'Run again after restarting', order: 'at last' },
    ],
    completionWhy:
      'If it can be saved, reopened, and remains the same after reopening, then the work truly belongs to you—otherwise it is just a picture that happened to appear during this run.',
    next: 'Your path to seeking a teacher can be reopened. Next Part: Go back to the whole chapter and explain clearly why reaching is not learning yet.',
  },
};
