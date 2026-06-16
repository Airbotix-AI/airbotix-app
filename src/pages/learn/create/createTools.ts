// The Create tools (studios) a kid can pick. Shared by the Create tab
// (`CreateHubPage` — personal projects) and the in-class "Create for this
// class" sheet (`CreateForClassSheet` — class work). my-classes-prd §3.3.
//
// TODO(my-classes §D-MC-11): the in-class sheet should show only the
// COURSE-ALLOWED project kinds (`CoursePack.allowed_kinds`) ∩ the kid's
// `topic_limits`. That backend field isn't built yet, so the sheet currently
// shows the kid's full permitted tool set (same as the Create tab).

export interface CreateTool {
  to: string;
  emoji: string;
  title: string;
  desc: string;
  color: 'bubblegum' | 'mint' | 'sky' | 'sunshine';
  /** Project-kind label shown on the tool chip. */
  typeTag: 'Code' | 'Blocks' | 'Creative';
  cost: number;
}

export const CREATE_TOOLS: CreateTool[] = [
  { to: '/learn/create/image', emoji: '🎨', title: 'Image Maker', desc: 'Draw with AI. Cartoon, painting, pixel art, photo.', color: 'bubblegum', typeTag: 'Creative', cost: 4 },
  { to: '/learn/create/music', emoji: '🎵', title: 'Music Maker', desc: 'Compose a tune. Pick mood, tempo, vibe.', color: 'mint', typeTag: 'Creative', cost: 3 },
  { to: '/learn/create/voice', emoji: '🔊', title: 'Voice Booth', desc: 'Turn text into spoken audio. Many voices.', color: 'sky', typeTag: 'Creative', cost: 1 },
  { to: '/learn/create/video', emoji: '🎬', title: 'Video Studio', desc: 'Short AI video from a prompt.', color: 'sunshine', typeTag: 'Creative', cost: 5 },
  { to: '/learn/create/code', emoji: '💻', title: 'Code Studio', desc: 'Make a website, game, or tool. AI writes the code.', color: 'sky', typeTag: 'Code', cost: 1 },
  { to: '/learn/create/blocks', emoji: '🧩', title: 'Blocks', desc: 'Snap puzzle blocks to make characters move & talk. No typing!', color: 'mint', typeTag: 'Blocks', cost: 0 },
];
