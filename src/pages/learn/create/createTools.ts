// The Create tools (studios) a kid can pick. Shared by the Create tab
// (`CreateHubPage` — personal projects) and the in-class "Create for this
// class" sheet (`CreateForClassSheet` — class work). my-classes-prd §3.3.
//
// The personal Create tab shows live tools as cards and coming-soon tools as
// non-clickable teasers below. The in-class sheet filters this registry by
// `CoursePack.allowed_kinds` (and drops coming-soon tools) so a course only
// offers the project kinds ops enabled for that course.

export type ProjectKind = 'creative' | 'code' | 'game' | 'blocks';

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
