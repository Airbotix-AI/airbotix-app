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
