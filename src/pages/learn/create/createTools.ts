// The Create tools (studios) a kid can pick. Shared by the Create tab
// (`CreateHubPage` — personal projects) and the in-class "Create for this
// class" sheet (`CreateForClassSheet` — class work). my-classes-prd §3.3.
//
// The personal Create tab shows live tools as cards and coming-soon tools as
// non-clickable teasers below. The in-class sheet filters this registry by
// `CoursePack.allowed_kinds` (and drops coming-soon tools) so a course only
// offers the project kinds ops enabled for that course.

export type ProjectKind = 'creative' | 'code' | 'game' | 'blocks';

export interface ParentStudioGuide {
  /** Helps a parent decide whether this space matches their child right now. */
  bestFor: string;
  /** The concrete creation a parent can expect the child to show them. */
  outcome: string;
  /** The child journey, kept to three observable steps for a quick parent scan. */
  steps: readonly [string, string, string];
  /** Learning language a parent can recognise without knowing the product. */
  skills: readonly string[];
  /** Clear boundary between the child's work, AI help, free actions and Stars. */
  aiAndStars: string;
  /** A useful conversation starter after the child creates something. */
  parentPrompt: string;
  /** A real product capture so a parent can see the workspace before choosing it. */
  previewImage: string;
  /** Describes the visible product UI, not a marketing concept image. */
  previewAlt: string;
  /** Explains what the parent is looking at in concrete, non-technical language. */
  previewCaption: string;
  /** Public, no-auth real-studio demo when one exists. Never points at a protected kid route. */
  publicDemoPath?: '/try/blocks' | '/try/playground';
}

export interface CreateTool {
  id:
    | 'story-blocks'
    | 'creative-code'
    | 'music-stage'
    | 'art-studio'
    | 'voice-booth'
    | 'video-studio';
  to: string;
  emoji: string;
  title: string;
  desc: string;
  /** Short parent/kid-facing label used on discovery cards. */
  discoveryLabel: string;
  /** Plain-language explanation for parents who do not use the kid surface. */
  parentDesc: string;
  /** Where the child finds the studio after signing into Learn. */
  learnPath: string;
  /** Expanded decision guide shown only on the parent surface. */
  parentGuide?: ParentStudioGuide;
  color: 'bubblegum' | 'mint' | 'sky' | 'sunshine';
  /** Project-kind label shown on the tool chip. */
  typeTag: 'Code' | 'Blocks' | 'Creative';
  /** Backend Project.kind created by this top-level tool. Code Studio owns a game sub-tool too. */
  projectKind: ProjectKind;
  cost: number;
  /**
   * Not ready for kids yet: hidden from every create entry point (class sheet,
   * workspace picker) and shown only as a non-clickable "Coming soon" card at
   * the bottom of the Create tab. The route itself stays registered so deep
   * links and harness journeys keep working. (learn PRD v0.7)
   */
  comingSoon?: boolean;
  /**
   * Live tool that is still NOT offered in the in-class "Create for this class"
   * sheet. Art Studio's class path is mission templates (a lesson's art mission
   * loads its template + checklist, D-IS-20/22); free-form class work would need
   * the studio to attach its bucket saves to a class first — a follow-up, not a
   * silent half-feature (image-studio-prd D-IS-26).
   */
  noClassSheet?: boolean;
}

export const CREATE_TOOLS: CreateTool[] = [
  {
    id: 'story-blocks',
    to: '/learn/create/blocks',
    emoji: '🧩',
    title: 'Story Blocks',
    desc: 'Program an animated story with snap-together blocks. No typing!',
    discoveryLabel: 'Ages 5–8 · Free',
    parentDesc: 'A storybook your child programs with picture blocks — no typing needed.',
    learnPath: 'Learn home → Story Blocks',
    parentGuide: {
      bestFor: 'Ages 5–8 who enjoy stories and are not ready to type code.',
      outcome: 'A playable animated story scene they can replay and explain.',
      steps: [
        'Choose a story chapter and meet the character who needs help.',
        'Put colourful blocks in order to control what the character says and does.',
        'Press Go, watch the result, then change one block and try again.',
      ],
      skills: ['Sequencing', 'Events', 'Cause and effect', 'Story logic'],
      aiAndStars: 'There is no AI chat. Arranging blocks, playing and saving are free.',
      parentPrompt: 'What did you change, and what happened differently?',
      previewImage: '/media/parent-studios/story-blocks.webp',
      previewAlt:
        'Story Blocks studio showing an animated cat and butterfly above colourful snap-together blocks.',
      previewCaption:
        'The child arranges picture blocks, presses Go and watches the characters perform the story.',
      publicDemoPath: '/try/blocks',
    },
    color: 'mint',
    typeTag: 'Blocks',
    projectKind: 'blocks',
    cost: 0,
  },
  // Creative Code Studio jumps straight to the prompt-first game playground;
  // Web Code remains hidden until it is ready for kids.
  {
    id: 'creative-code',
    to: '/learn/playground/new',
    emoji: '💻',
    title: 'Creative Code Studio',
    desc: 'Vibe-code a 2D game with AI and real JavaScript — then keep adding to it.',
    discoveryLabel: 'Ages 8–14',
    parentDesc:
      'Ideas become interactive creations with AI and real JavaScript to inspect and improve.',
    learnPath: 'Learn home → Creative Code Studio',
    parentGuide: {
      bestFor:
        'Ages 8–14 with ideas for games or interactive projects, including coding beginners.',
      outcome: 'A playable JavaScript creation they can test, change and keep improving.',
      steps: [
        'Describe an idea in their own words and choose what the first version should do.',
        'Play the creation, inspect the real JavaScript and check whether the AI got it right.',
        'Ask for one change at a time, test again and debug anything that breaks.',
      ],
      skills: ['AI judgement', 'JavaScript', 'Debugging', 'Creative ownership'],
      aiAndStars:
        'AI can build or change code, but your child makes the decisions and checks every result. AI actions show their Star cost before use; playing and manual code changes are free.',
      parentPrompt: 'Show me one change you made and how it changed the creation.',
      previewImage: '/media/parent-studios/creative-code-studio.webp',
      previewAlt:
        'Creative Code Studio showing an AI conversation, JavaScript workspace and a running Fruit Catcher game.',
      previewCaption:
        'The game runs beside the conversation and real code, so the child can test every change immediately.',
      publicDemoPath: '/try/playground',
    },
    color: 'sky',
    typeTag: 'Code',
    projectKind: 'game',
    cost: 1,
  },
  // Art Studio un-paused 2026-07-20 (owner call) after the canvas-first rebuild
  // (image-studio-prd v0.13): kid draws first, AI is summoned. Cost = the magic
  // image price (9⭐); drawing itself is free, ghost sketch 2⭐, coach chat 1⭐.
  // "Art Studio" replaced the informal "Image Maker" name (image-studio-prd.md).
  {
    id: 'art-studio',
    to: '/learn/create/image',
    emoji: '🎨',
    title: 'Art Studio',
    desc: 'Draw your own picture, then let AI bring it to life.',
    discoveryLabel: 'Draw + AI',
    parentDesc: 'Your child draws first, then uses AI to bring their own picture to life.',
    learnPath: 'Learn home → Art Studio',
    parentGuide: {
      bestFor:
        'Children who like drawing and want AI as a helper, not a replacement for their idea.',
      outcome: 'Their own drawing plus optional AI-assisted versions they can compare and refine.',
      steps: [
        'Start on the real canvas with brushes, colours and stickers.',
        'Ask the Coach for feedback or a faint guide only when help is wanted.',
        'Choose whether to bring the drawing to life, compare versions and keep improving it.',
      ],
      skills: ['Visual planning', 'Drawing', 'Creative direction', 'Comparing versions'],
      aiAndStars:
        'Drawing is free. AI is optional and only starts when your child presses a clearly priced Coach, guide or Bring it to life button.',
      parentPrompt: 'Which parts did you make, and what did you ask AI to help with?',
      previewImage: '/media/parent-studios/art-studio.webp',
      previewAlt:
        'Art Studio showing drawing tools, the canvas, optional AI Coach and clearly priced Stars actions.',
      previewCaption:
        'The child draws on the canvas first; Coach and Bring it to life stay optional and show their Star cost.',
    },
    color: 'bubblegum',
    typeTag: 'Creative',
    projectKind: 'creative',
    cost: 9,
    noClassSheet: true,
  },
  // Music has ONE home: the Music Stage in the Workspace. The old Music Maker —
  // a form that asked for mood/tempo and handed back an MP3 the kid could not
  // touch — is retired; the Stage does the same generation as its step ⑥, on top
  // of a song the kid actually composed. (music-stage-prd §2)
  {
    id: 'music-stage',
    to: '/learn/music',
    emoji: '🎵',
    title: 'Music Stage',
    desc: 'Compose a song on a real stage, then record it for real.',
    discoveryLabel: 'Compose + record',
    parentDesc:
      'Your child builds a song track by track, plays it back, and records their own mix.',
    learnPath: 'Learn home → Music Stage',
    parentGuide: {
      bestFor:
        'Children who enjoy music, rhythm and mood, even if they have never learned an instrument.',
      outcome: 'A playable multi-track song they can remix, compare and record.',
      steps: [
        'Describe a song idea and choose a musical genre.',
        'Hear the first arrangement, then explore the instruments and track lanes on the stage.',
        'Change the mood or sound, compare versions and record the mix they prefer.',
      ],
      skills: ['Musical structure', 'Mood and genre', 'Listening', 'Iteration'],
      aiAndStars:
        'Composing or re-generating music uses Stars and the cost is shown before the action. Playing, comparing and trying available instrument styles are free.',
      parentPrompt: 'What did you change to make the song feel different?',
      previewImage: '/media/parent-studios/music-stage.webp',
      previewAlt:
        'Music Stage showing a live stage, instruments, song tracks and controls for changing the mix.',
      previewCaption:
        'The child can hear the song, inspect each instrument lane and choose which version to keep.',
    },
    color: 'mint',
    typeTag: 'Creative',
    projectKind: 'creative',
    cost: 5,
  },
  // Paused 2026-07-17 (owner call): output quality isn't there yet — hidden as
  // coming-soon until each studio is fixed and re-approved.
  {
    id: 'voice-booth',
    to: '/learn/create/voice',
    emoji: '🔊',
    title: 'Voice Booth',
    desc: 'Turn text into spoken audio. Many voices.',
    discoveryLabel: 'Coming soon',
    parentDesc: 'Turn writing into spoken audio with a choice of voices.',
    learnPath: 'Not yet available',
    color: 'sky',
    typeTag: 'Creative',
    projectKind: 'creative',
    cost: 5,
    comingSoon: true,
  },
  {
    id: 'video-studio',
    to: '/learn/create/video',
    emoji: '🎬',
    title: 'Video Studio',
    desc: 'Short AI video from a prompt.',
    discoveryLabel: 'Coming soon',
    parentDesc: 'Create a short animation from an idea.',
    learnPath: 'Not yet available',
    color: 'sunshine',
    typeTag: 'Creative',
    projectKind: 'creative',
    cost: 60,
    comingSoon: true,
  },
];

/** The four currently available studios shown on both parent and kid discovery surfaces. */
export const LIVE_CREATE_TOOLS = CREATE_TOOLS.filter((tool) => !tool.comingSoon);
