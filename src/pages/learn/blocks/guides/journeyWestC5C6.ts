import type { StoryMission } from './types';
import {
  JTW_C5_P4_ID,
  JTW_C5_P5_ID,
  JTW_C5_P7_ID,
  JTW_C6_P4_ID,
  JTW_C6_P5_ID,
  JTW_C6_P8_ID,
} from '../jtwC5C6Builds';

const WUKONG = '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png';

function mission(lessonId: string, title: string, goal: string): StoryMission {
  return {
    mode: lessonId.endsWith('p7') || lessonId.endsWith('p8') ? 'personal-ship' : 'complete',
    lessonId,
    celebrate: false,
    hero: {
      name: 'Sun Wukong',
      role: 'Learners who use real building blocks to explain cause and effect',
      asset: WUKONG,
    },
    eyebrow: 'Journey to the West · Blocks Studio',
    title,
    storyPages: [{ emoji: '🧩', title, body: goal, scene: 4 }],
    partnerLine:
      'Partners only view saved and run programs and do not accept page button substitutions.',
    mission: goal,
    question: 'How do you prove this is your program?',
    choices: [],
    retry: 'Check the building blocks, parameters, order, page exit and end.',
    successTitle: 'Real program saved',
    success: 'The target chain is completed by the child in Blocks Studio and run to the target.',
    fixTitle: 'Keep building blocks',
    fixPrompt: goal,
    workspaceIntro: 'Starter only retains necessary stages and empty Triggers.',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: 'Read the target first.',
      watch: 'Observe each block execution.',
      sayFirst: 'Let’s talk about the reasons first.',
      sayThen: 'Let’s talk about the results.',
      hopFirst: 'Actions must have a purpose.',
      hopThen: 'Exit to the next page.',
      retry: 'The target chain is not complete yet.',
      fix: 'Complete or rearrange the blocks.',
      test: 'Press Go to run the real project.',
      saving: 'Saving project and running markers.',
      complete: 'The actual work has been saved.',
    },
    logicSteps: [
      { icon: '🧩', label: 'build', order: 'First' },
      { icon: '▶️', label: 'run', order: 'back' },
    ],
    logicWhy: 'The saved AST and real runs jointly demonstrate learning.',
    completionTitle: 'Studio task completed',
    completion: 'The project structure and run tags are saved.',
    completionSteps: [
      { icon: '💾', label: 'save', order: 'First' },
      { icon: '✅', label: 'Check', order: 'back' },
    ],
    completionWhy: 'Page selections are not a substitute for project evidence.',
    next: 'Return to the story page to continue.',
  };
}

export const JTW_C5_C6_MISSIONS: Record<string, StoryMission> = {
  [JTW_C5_P4_ID]: mission(
    JTW_C5_P4_ID,
    'Create three size states',
    'After Start, take Grow 2, Wait 5, Reset, Shrink 2 and End.',
  ),
  [JTW_C5_P5_ID]: mission(
    JTW_C5_P5_ID,
    'Make the final size suitable for carrying',
    'Rearrange the state and waiting, add "appropriateness is the goal", and finally wrap it up with Shrink and End.',
  ),
  [JTW_C5_P7_ID]: mission(
    JTW_C5_P7_ID,
    'My wishful story',
    'Set up Grow, Reset, Shrink and two readable stop points, and finally keep the state small.',
  ),
  [JTW_C6_P4_ID]: mission(
    JTW_C6_P4_ID,
    'The first page explains the identity changes',
    'Make two sentences, stop, speed, move and Page 2 exit.',
  ),
  [JTW_C6_P5_ID]: mission(
    JTW_C6_P5_ID,
    'The second page separates actions and responses.',
    'Set up display, wait, response, slow speed, second stop and Page 3 exit.',
  ),
  [JTW_C6_P8_ID]: mission(
    JTW_C6_P8_ID,
    'My three-page Monkey King prequel',
    'Complete the reasons, responses and Five Elements Mountain stable End on three pages respectively, and save at least 18 real building blocks.',
  ),
};
