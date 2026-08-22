import type { StoryMission } from './types';
import {
  JTW_C4_P4_LESSON_ID,
  JTW_C4_P5_LESSON_ID,
  JTW_C4_P6_LESSON_ID,
  JTW_C4_P7_LESSON_ID,
  JTW_C4_WUKONG_ASSET,
} from '../jtwC4DualBuild';

export const JTW_C4_MISSIONS: Record<string, StoryMission> = {
  [JTW_C4_P7_LESSON_ID]: {
    mode: 'personal-ship',
    lessonId: JTW_C4_P7_LESSON_ID,
    celebrate: false,
    hero: {
      name: 'Sun Wukong',
      role: 'Learners waiting for peers to discover the invitation entrance',
      asset: JTW_C4_WUKONG_ASSET,
    },
    eyebrow: 'Journey to the West · Chapter 4 · Personal Ship',
    title: 'Meet Sun Wukong',
    storyPages: [
      {
        emoji: '🏷️👆',
        title: 'Let your companions truly know Wukong',
        body: 'The name appears by Start; slight fingertip clues help companions discover that Wukong is clickable, but the skill still only responds after the real tap.',
        scene: 5,
      },
    ],
    partnerLine: 'The companion has no verbal answer: Go first, then find Wukong yourself and tap.',
    mission:
      'Keep two independent scripts, complete Go and real Tap, close and reopen after saving.',
    question: 'How to let companions discover the invitation entrance?',
    choices: [],
    retry: 'Tap chain cannot be changed to auto-play.',
    successTitle: 'The companion found the invitation entrance',
    success: 'Nametags and selected targets are saved in the profile.',
    fixTitle: 'Make a personal recognition card',
    fixPrompt: 'Keep Go named, Tap displayed, and complete two Ends.',
    workspaceIntro:
      'All three versions are real choices; the title of the work is fixed at Meet Sun Wukong.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Predict two events first.',
      watch: 'Can you stay quiet after Go?',
      sayFirst: 'The name comes first.',
      sayThen: 'Say it after Tap.',
      hopFirst: 'Actions belong to the invitation portal.',
      hopThen: 'Companions discover the clickable objects on their own.',
      retry: 'Check both scripts, Double Run and End.',
      fix: "Only fix the discoverability, don't change the trigger.",
      test: 'Go first, then let your partner TapWukong.',
      saving: 'True double event results are being saved.',
      complete: 'Personal recognition cards can be reopened and run again.',
    },
    logicSteps: [
      { icon: '🚩', label: 'Got its name', order: 'Go' },
      { icon: '👆', label: 'exhibit', order: 'Tap' },
    ],
    logicWhy: 'The same character uses two Triggers to wait for different conditions.',
    completionTitle: 'Personal Ship has been run',
    completion: 'Double event results are written to the saved version.',
    completionSteps: [
      { icon: '💾', label: 'save', order: 'First' },
      { icon: '🔁', label: 'Restart retest', order: 'back' },
    ],
    completionWhy:
      'The page will also check whether closing and reopening are consistent with JSON.',
    next: 'Finally, we talk about traveling, getting a name, studying and waiting for invitations.',
  },
  [JTW_C4_P6_LESSON_ID]: {
    mode: 'observe-fix',
    lessonId: JTW_C4_P6_LESSON_ID,
    celebrate: false,
    hero: {
      name: 'Sun Wukong',
      role: 'Learners who put their skills back to the right entrance',
      asset: JTW_C4_WUKONG_ASSET,
    },
    eyebrow: 'Journey to the West · Chapter 4 · Debug',
    title: 'Find the first deviation first',
    storyPages: [
      {
        emoji: '🌬️🚩',
        title: 'Skills in the wrong queue',
        body: 'The wind blew the complete skill chain to the Start entrance. Let’s talk about expectations first, and then run the wrong version to find the first deviation.',
        scene: 5,
      },
    ],
    partnerLine:
      'Only the Trigger ownership is changed, the actions, parameters, order, name chain and background remain unchanged.',
    mission:
      'Reconnect the complete skill chain from Start to Tap; go and wait first, and then tapWukong.',
    question: 'What is this skill script waiting for?',
    choices: [
      { id: 'tap', label: 'Waiting for the audience TapWukong', correct: true },
      { id: 'flag', label: 'Wait for Go to start', correct: false },
    ],
    retry: 'The first deviation is that the method uses Start, not the action parameters.',
    successTitle: 'The two roads separate again',
    success: 'The name appears first; Wukong waits for invitation before being fully displayed.',
    fixTitle: 'Only repair Trigger ownership',
    fixPrompt:
      'Keep the entire set of actions, and only change the skill chain entry from Start to Tap.',
    workspaceIntro:
      'The error version will be automatically displayed after Go; run it first to see the error, and then reconnect the Trigger.',
    fixChoices: [],
    fixRetry: 'Deleting actions or changing parameters is not a fix this time.',
    coach: {
      ready: 'Run the wrong version first.',
      watch: 'Why is it displayed immediately after the name?',
      sayFirst: 'The name belongs to Start.',
      sayThen: 'The dialogue remains the same.',
      hopFirst: "There's nothing wrong with the action set.",
      hopThen: 'It should wait for Tap.',
      retry: 'The action group content or trigger is still wrong.',
      fix: 'Reconnect to the Tap entry block by block.',
      test: 'Go and wait first, then TapWukong.',
      saving: 'Double running evidence has been measured.',
      complete: 'Skills no longer take the lead.',
    },
    logicSteps: [
      { icon: '🚩', label: 'name', order: 'Go' },
      { icon: '👆', label: 'ability', order: 'Tap' },
    ],
    logicWhy: 'Trigger determines what the entire script is waiting for.',
    completionTitle: 'Debug completed',
    completion: 'Error run, single trigger repair, Go wait and real tap have been saved.',
    completionSteps: [
      { icon: '🏷️', label: 'Get the name first', order: 'First' },
      { icon: '✨', label: 'Show again', order: 'back' },
    ],
    completionWhy:
      'The action has not been deleted or rewritten, only the correct entry has been replaced.',
    next: 'The next step is to create personal recognition cards that can be saved and discovered by peers.',
  },
  [JTW_C4_P4_LESSON_ID]: {
    mode: 'complete',
    lessonId: JTW_C4_P4_LESSON_ID,
    celebrate: false,
    hero: {
      name: 'Sun Wukong',
      role: 'Learners who introduce first and respond later',
      asset: JTW_C4_WUKONG_ASSET,
    },
    eyebrow: 'Journey to the West · Chapter 4 · Build 1',
    title: 'Stand firm on the name first, then respond with the ability',
    storyPages: [
      {
        emoji: '🏷️🐒',
        title: 'Partners should remember their names first',
        body: 'Master gave Stone Monkey the surname "Sun" and gave him the Dharma name "Wukong". From now on, companions and viewers will know him by the same name; the past Flower-Fruit Mountain journey has not been replaced.',
        speaker: 'master',
        dialogue: 'From today on, you have a name - Sun Wukong.',
        scene: 1,
      },
      {
        emoji: '🚩👆',
        title: 'Two starts waiting for different conditions',
        body: 'Start waits for the scene to begin and is responsible for the name tag and self-introduction; Tap waits for the audience invitation before letting Wukong show off a small skill. The movements of the two chains cannot be mixed.',
        scene: 3,
        blocks: ['🚩 Start → Show → Say → End', '👆 Tap → Hop 2 → Say → End'],
      },
      {
        emoji: '🧪🍃',
        title: 'Go first and wait, then tap',
        body: 'First press Go to confirm that the nameplate lights up steadily and the leaf pattern target remains quiet; then click Wukong on the stage to confirm that the Hop and invitation dialogue appear. Both trajectories have to go to the end.',
        scene: 4,
      },
    ],
    partnerLine:
      "It's up to you to put the six pieces into the correct entry chain; no buttons will do it for you.",
    mission:
      'Place six blocks after the two fixed Triggers: the Start chain for Show, name Say, and End; the Tap chain for Hop 2, invitation Say, and End. Go first, wait a moment, and then click Wukong.',
    question: 'Which chain must remain quiet when just pressing Go?',
    choices: [],
    retry:
      'Check which entry each block is waiting for: name and Start, ability and Tap; both chains must have End.',
    successTitle: 'Both entrances are clearly stated.',
    success:
      'The name tag appears steadily first; after receiving the invitation, the leaf pattern target lights up with the small display.',
    fixTitle: 'Return the six pieces to the correct entrance',
    fixPrompt: 'Start → Show → Name Say → End; Tap → Hop 2 → Invite Say → End.',
    workspaceIntro: 'Two triggers have been fixed, and six task slots are waiting for you to fill.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'First build two chains, and then do double testing of Go and Tap.',
      watch: 'Does the skill chain remain quiet when just pressing Go?',
      sayFirst: 'The name comes first.',
      sayThen: 'Invite before responding.',
      hopFirst: 'Hop belongs to the Tap chain.',
      hopThen: 'The leaf pattern target only lights up after Tap.',
      retry:
        'There is a block placed at the wrong entrance, the End is missing, or the double test has not been completed.',
      fix: 'Put the name block back to Start and the skill block back to Tap.',
      test: 'Go first and wait, then click Wukong.',
      saving: 'Both real tracks are completed and are being saved.',
      complete:
        'The partner remembers the name first, and then sees the small display after receiving the invitation.',
    },
    logicSteps: [
      { icon: '🚩', label: 'name chain', order: 'Go first' },
      { icon: '⏸️', label: 'Quiet ability', order: 'wait' },
      { icon: '👆', label: 'Skill chain', order: 'Tap again' },
    ],
    logicWhy:
      'Trigger determines the conditions for the script to wait; the same action will occur at different times after being placed at different entrances.',
    completionTitle: 'Build 1 completed',
    completion:
      'The six real building blocks are correctly assigned, and Go and Tap are stable to the end in both real runs.',
    completionSteps: [
      { icon: '🏷️', label: 'name stands firm', order: 'First' },
      { icon: '🍃', label: 'Invite response', order: 'back' },
    ],
    completionWhy:
      'The ability did not escape when Wukong was clicked, indicating that the two event chains were really separated.',
    next: 'The partner remembered the name. The next part is for the child to choose Wukong to respond to the invitation.',
  },
  [JTW_C4_P5_LESSON_ID]: {
    mode: 'complete',
    lessonId: JTW_C4_P5_LESSON_ID,
    celebrate: false,
    hero: {
      name: 'Sun Wukong',
      role: 'Learners who wait for invitation before responding',
      asset: JTW_C4_WUKONG_ASSET,
    },
    eyebrow: 'Journey to the West · Chapter 4 · Expression Choice',
    title: 'The skill is not to be first',
    storyPages: [
      {
        emoji: '👆🐒',
        title: 'Wait until the audience is ready',
        body: 'The name chain remains the same; the tap chain lets you choose a gentle response.',
        scene: 5,
      },
      {
        emoji: '🧩',
        title: 'three real versions',
        body: 'Jump over the leaf pattern, turn around and point to home or screen again. Choices change actions, sequences, and visible results.',
        scene: 5,
      },
      {
        emoji: '🚩👆',
        title: 'double test',
        body: 'Go to confirm the name first, and then ask your companions to predict and tap Wukong.',
        scene: 5,
      },
    ],
    partnerLine: 'The companion predicts first and then clicks Wukong on the stage to verify.',
    mission:
      'Keep the name chain, build a complete response chain of your choice after the Tap entry, and then complete the Go and real Tap double test.',
    question: 'Why does the skill chain have to wait for Tap?',
    choices: [],
    retry:
      'The name chain cannot be deleted; the Tap chain must completely match a valid version and reach End.',
    successTitle: 'Wukong waits until he is invited',
    success:
      'The selected action only appears after the real Tap, and the name is still controlled by Start.',
    fixTitle: 'Set up the selected response chain',
    fixPrompt: 'Connect the selected action, waiting or dialogue in order after On Tap.',
    workspaceIntro:
      'The name chain has been reserved, and the Tap chain is waiting for your real choice.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'First select a version and set it up, then do a double test.',
      watch: 'Can you stay quiet after Go?',
      sayFirst: 'The name comes first.',
      sayThen: 'Respond only after invitation.',
      hopFirst: 'Actions belong to the Tap chain.',
      hopThen: 'It can be seen that the target only changes after Tap.',
      retry: 'Check version order and End.',
      fix: 'Keep the name chain and fix the tap chain.',
      test: 'Go first, then tap.',
      saving: 'Select and twice the track is being saved.',
      complete: 'Wukong waits until the audience is ready before responding.',
    },
    logicSteps: [
      { icon: '🚩', label: 'name', order: 'Go first' },
      { icon: '💭', label: 'peer prediction', order: 'Say it again' },
      { icon: '👆', label: 'Selected responses', order: 'Post Tap' },
    ],
    logicWhy:
      'True selection changes the Tap chain, but does not change its conditions for waiting for invitations.',
    completionTitle: 'Expression ChoiceComplete',
    completion: 'A valid version has been saved and verified with Go and real Tap.',
    completionSteps: [
      { icon: '🏷️', label: 'Name reserved', order: 'First' },
      { icon: '✨', label: 'Choose a response', order: 'back' },
    ],
    completionWhy:
      'The skill does not play automatically, indicating that the selection and event conditions are truly effective.',
    next: 'A gust of wind blows the entire skill chain to the wrong entrance; the next part checks for the first deviation.',
  },
};
