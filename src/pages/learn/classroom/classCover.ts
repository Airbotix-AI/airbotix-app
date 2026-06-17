// Deterministic K-12 cover colour + emoji for a class card, so the same class
// always looks the same without a server-provided cover (my-classes-prd §4 —
// `cover_image_url` is used when present; this is the fallback). Uses only the
// design-system gradient tokens — no raw hex.

export type CoverColor = 'sky' | 'bubblegum' | 'mint' | 'sunshine' | 'coral';

const COVER_COLORS: CoverColor[] = ['sky', 'bubblegum', 'mint', 'sunshine', 'coral'];

const COVER_EMOJI = ['🤖', '🎮', '🐢', '🧩', '🎨', '🚀', '🌟', '🧠'];

/** Stable hash so a given class id maps to one colour/emoji every render. */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function coverColor(id: string): CoverColor {
  return COVER_COLORS[hashId(id) % COVER_COLORS.length];
}

export function coverEmoji(id: string): string {
  return COVER_EMOJI[hashId(id) % COVER_EMOJI.length];
}

export const COVER_GRAD: Record<CoverColor, string> = {
  sky: 'bg-grad-sky',
  bubblegum: 'bg-grad-bubblegum',
  mint: 'bg-grad-mint',
  sunshine: 'bg-grad-sunshine',
  coral: 'bg-grad-coral',
};
