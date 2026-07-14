// The Create tools (studios) a kid can pick. Shared by the Create tab
// (`CreateHubPage` — personal projects) and the in-class "Create for this
// class" sheet (`CreateForClassSheet` — class work). my-classes-prd §3.3.
//
// The personal Create tab shows every tool. The in-class sheet filters this
// registry by `CoursePack.allowed_kinds` so a course only offers the project
// kinds ops enabled for that course.

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
}

export const CREATE_TOOLS: CreateTool[] = [
  { to: '/learn/create/image', emoji: '🎨', title: 'Image Maker', desc: 'Draw with AI. Cartoon, painting, pixel art, photo.', color: 'bubblegum', typeTag: 'Creative', projectKind: 'creative', cost: 4 },
  // Music has ONE home: the Music Stage in the Workspace. The old Music Maker —
  // a form that asked for mood/tempo and handed back an MP3 the kid could not
  // touch — is retired; the Stage does the same generation as its step ⑥, on top
  // of a song the kid actually composed. (music-stage-prd §2)
  { to: '/learn/music', emoji: '🎵', title: 'Music Stage', desc: 'Compose a song on a real stage, then record it for real.', color: 'mint', typeTag: 'Creative', projectKind: 'creative', cost: 3 },
  { to: '/learn/create/voice', emoji: '🔊', title: 'Voice Booth', desc: 'Turn text into spoken audio. Many voices.', color: 'sky', typeTag: 'Creative', projectKind: 'creative', cost: 1 },
  { to: '/learn/create/video', emoji: '🎬', title: 'Video Studio', desc: 'Short AI video from a prompt.', color: 'sunshine', typeTag: 'Creative', projectKind: 'creative', cost: 5 },
  { to: '/learn/create/code', emoji: '💻', title: 'Creative Code Studio', desc: 'Build websites, games, and tools with AI and real JavaScript.', color: 'sky', typeTag: 'Code', projectKind: 'code', cost: 1 },
  { to: '/learn/create/blocks', emoji: '🧩', title: 'Story Blocks', desc: 'Program an animated story with snap-together blocks. No typing!', color: 'mint', typeTag: 'Blocks', projectKind: 'blocks', cost: 0 },
];
