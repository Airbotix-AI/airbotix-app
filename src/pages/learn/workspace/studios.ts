// Per-studio metadata. Each chat in the Workspace is bound to ONE studio.
// Adding pedagogy per studio (tutorials, examples, prompt hints) goes here.

export type Studio = 'chat' | 'image' | 'music' | 'voice' | 'video' | 'code';

// Quick-setup field shown before any chat starts. We force the kid to make
// a few decisions instead of staring at an empty prompt — measurably higher
// success rate for 8-11 yo. Values get prepended to every subsequent prompt.
export type SetupField =
  | { kind: 'pick'; key: string; label: string; options: string[]; defaultIndex?: number }
  | { kind: 'multi'; key: string; label: string; options: string[]; max?: number };

export interface StudioMeta {
  id: Studio;
  emoji: string;
  label: string;
  cost: number;
  /** One-line "what it does" for the picker card */
  tagline: string;
  /** Placeholder for the input box */
  placeholder: string;
  /** Tailwind token for the wash background */
  wash: string;
  /** A few starter prompts shown in the empty state, age-tuned later */
  examples: string[];
  /** Quick-setup fields shown before the chat starts. [] = skip setup. */
  setup: SetupField[];
  /**
   * Paused studio (2026-07-17 owner call — output quality isn't there yet):
   * the picker shows it as a non-clickable "Coming soon" card, so no NEW
   * sessions can start. Existing sessions still open read-only-ish via the
   * normal session list. Mirrors `comingSoon` in create/createTools.ts.
   */
  comingSoon?: boolean;
  /**
   * The studio left the chat shell for its own immersive surface: the picker
   * card stays for discoverability but navigates there instead of creating a
   * chat-shell session (Music → the Stage, D-MS7; Image → the Art Studio,
   * image-studio-prd D-IS-26). `?studio=<id>` deep links are dropped too.
   */
  linkTo?: string;
  /** CTA line shown at the bottom of a `linkTo` card. */
  linkCta?: string;
}

export const STUDIOS: StudioMeta[] = [
  {
    id: 'chat',
    emoji: '💬',
    label: 'Chat',
    cost: 1,
    tagline: 'Ask the AI anything in words.',
    placeholder: 'Ask the AI anything…',
    wash: 'wash-coral',
    examples: [
      'Tell me a fun fact about octopuses',
      'Explain photosynthesis like I am 8',
      'Give me 3 ideas for a story about a robot',
    ],
    setup: [],
  },
  // Image left the chat shell entirely: the canvas-first Art Studio replaced
  // the retired describe-a-picture form (image-studio-prd v0.13). The card
  // stays here as a link-out, like Music.
  {
    id: 'image',
    linkTo: '/learn/create/image',
    linkCta: '🎨 Opens your own art studio →',
    emoji: '🎨',
    label: 'Art Studio',
    cost: 9,
    tagline: 'Draw your own picture, then let AI bring it to life.',
    placeholder: 'Describe what to draw…',
    wash: 'wash-bubblegum',
    examples: [
      'A friendly robot watering plants in space',
      'A purple dragon eating birthday cake',
      'My cat as a wizard in a magic forest',
    ],
    setup: [
      { kind: 'pick', key: 'style', label: 'Art style', options: ['Cartoon', 'Painting', 'Pixel art', 'Photo', '3D render'], defaultIndex: 0 },
      { kind: 'pick', key: 'aspect', label: 'Shape', options: ['Square', 'Wide', 'Tall'], defaultIndex: 0 },
      { kind: 'pick', key: 'palette', label: 'Colors', options: ['Vibrant', 'Pastel', 'Monochrome', 'Neon', 'Earthy'], defaultIndex: 0 },
    ],
  },
  {
    id: 'music',
    linkTo: '/learn/music',
    linkCta: '🎤 Opens your own stage →',
    emoji: '🎵',
    label: 'Music',
    cost: 3,
    tagline: 'Describe a song, and AI plays it.',
    placeholder: 'Describe the song…',
    wash: 'wash-mint',
    examples: [
      'A happy birthday song with ukulele',
      'Spooky Halloween background music',
      'A calm piano lullaby',
    ],
    // No setup form: the Music Stage (Composer Bar + genre pills) replaces the
    // form-based setup as the studio=music opening (music-stage-prd.md §1.1).
    setup: [],
  },
  {
    id: 'voice',
    comingSoon: true,
    emoji: '🔊',
    label: 'Voice',
    cost: 1,
    tagline: 'Type words, and AI reads them aloud.',
    placeholder: 'Text to speak…',
    wash: 'wash-sky',
    examples: [
      'Welcome to my robot pet show!',
      'Once upon a time, in a faraway land…',
      'Three… two… one… blast off!',
    ],
    setup: [
      { kind: 'pick', key: 'voice', label: 'Voice', options: ['Friendly kid', 'Storyteller', 'Robot', 'News anchor', 'Wizard'], defaultIndex: 0 },
      { kind: 'pick', key: 'speed', label: 'Speed', options: ['Slow', 'Normal', 'Fast'], defaultIndex: 1 },
    ],
  },
  {
    id: 'video',
    comingSoon: true,
    emoji: '🎬',
    label: 'Video',
    cost: 40,
    tagline: 'Describe a short scene, and AI films it.',
    placeholder: 'Describe the scene to film…',
    wash: 'wash-sunshine',
    examples: [
      'A tiny astronaut bouncing on the moon',
      'A puppy chasing falling autumn leaves',
      'Rainbow waves crashing on a beach at sunset',
    ],
    setup: [
      { kind: 'pick', key: 'style', label: 'Style', options: ['Cartoon', 'Realistic', 'Pixar-like', '3D animation', 'Stop-motion'], defaultIndex: 0 },
      { kind: 'pick', key: 'length', label: 'Length', options: ['5s', '10s', '15s'], defaultIndex: 0 },
      { kind: 'pick', key: 'camera', label: 'Camera', options: ['Wide shot', 'Close-up', 'Drone view', 'Tracking shot'], defaultIndex: 0 },
    ],
  },
  {
    id: 'code',
    emoji: '💻',
    label: 'Code',
    cost: 2,
    tagline: 'Describe a web page or animation, and AI codes it.',
    placeholder: 'Describe what to build…',
    wash: 'wash-sky',
    examples: [
      'A bouncing rainbow ball that follows my cursor',
      'A birthday card with confetti when you click it',
      'A simple drawing canvas that lets me paint with my mouse',
    ],
    setup: [
      { kind: 'pick', key: 'kind', label: 'What kind?', options: ['Animation', 'Game', 'Card', 'Drawing', 'Quiz'], defaultIndex: 0 },
      { kind: 'pick', key: 'vibe', label: 'Vibe', options: ['Bright & playful', 'Spooky', 'Calm', 'Retro pixel', 'Neon'], defaultIndex: 0 },
    ],
  },
];

/** Build a structured prompt prefix from saved setup values. */
export function buildPromptPrefix(values: Record<string, string | string[]>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (Array.isArray(v)) {
      if (v.length) parts.push(`${k}: ${v.join(', ')}`);
    } else if (v) {
      parts.push(`${k}: ${v}`);
    }
  }
  return parts.length ? `[${parts.join(' · ')}] ` : '';
}

export const STUDIO_BY_ID: Record<Studio, StudioMeta> = STUDIOS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<Studio, StudioMeta>,
);
