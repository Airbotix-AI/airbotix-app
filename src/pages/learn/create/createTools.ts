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
  to: string;
  emoji: string;
  title: string;
  desc: string;
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
  { to: '/learn/create/blocks', emoji: '🧩', title: 'Story Blocks', desc: 'Program an animated story with snap-together blocks. No typing!', color: 'mint', typeTag: 'Blocks', projectKind: 'blocks', cost: 0 },
  // Creative Code Studio jumps straight to the prompt-first game playground;
  // Web Code remains hidden until it is ready for kids.
  { to: '/learn/playground/new', emoji: '💻', title: 'Creative Code Studio', desc: 'Vibe-code a 2D game with AI and real JavaScript — then keep adding to it.', color: 'sky', typeTag: 'Code', projectKind: 'game', cost: 1 },
  // Music has ONE home: the Music Stage in the Workspace. The old Music Maker —
  // a form that asked for mood/tempo and handed back an MP3 the kid could not
  // touch — is retired; the Stage does the same generation as its step ⑥, on top
  // of a song the kid actually composed. (music-stage-prd §2)
  { to: '/learn/music', emoji: '🎵', title: 'Music Stage', desc: 'Compose a song on a real stage, then record it for real.', color: 'mint', typeTag: 'Creative', projectKind: 'creative', cost: 5 },
  // Art Studio un-paused 2026-07-20 (owner call) after the canvas-first rebuild
  // (image-studio-prd v0.13): kid draws first, AI is summoned. Cost = the magic
  // image price (9⭐); drawing itself is free, ghost sketch 2⭐, coach chat 1⭐.
  // "Art Studio" replaced the informal "Image Maker" name (image-studio-prd.md).
  { to: '/learn/create/image', emoji: '🎨', title: 'Art Studio', desc: 'Draw your own picture, then let AI bring it to life.', color: 'bubblegum', typeTag: 'Creative', projectKind: 'creative', cost: 9, noClassSheet: true },
  // Paused 2026-07-17 (owner call): output quality isn't there yet — hidden as
  // coming-soon until each studio is fixed and re-approved.
  { to: '/learn/create/voice', emoji: '🔊', title: 'Voice Booth', desc: 'Turn text into spoken audio. Many voices.', color: 'sky', typeTag: 'Creative', projectKind: 'creative', cost: 5, comingSoon: true },
  { to: '/learn/create/video', emoji: '🎬', title: 'Video Studio', desc: 'Short AI video from a prompt.', color: 'sunshine', typeTag: 'Creative', projectKind: 'creative', cost: 60, comingSoon: true },
];
