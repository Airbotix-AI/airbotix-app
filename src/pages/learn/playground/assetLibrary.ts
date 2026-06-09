// The shared, read-only asset Library (PRD learn-game-studio-assets-prd §4 / R2).
//
// v1 is ZERO-HOST (D-ASSET-11/12): every entry is an EMOJI rendered as its image
// (Twemoji), referenced by a codepoint-derived CDN URL — nothing is hosted by us
// and nothing is copied into the project VFS. The game loads the SAME image the
// kid browses (WYSIWYG; a native OS glyph can't be loaded as a Phaser texture).
// v2 will add a `kenney` provider whose manifest is fetched from our own CDN.
//
// These are NOT VfsFiles: a library asset is referenced by URL and is immutable.
// "Add to game" emits a URL-form Phaser loader (see assetInsert.libraryLoader).

/** A browsable, read-only library asset (shared across all projects). */
export interface LibraryAsset {
  /** Stable id, e.g. `emoji/1fa99`. */
  id: string;
  name: string;
  category: string;
  tags: string[];
  kind: 'image' | 'sprite' | 'audio';
  provider: 'emoji' | 'kenney';
  license: 'CC0' | 'CC-BY-4.0' | 'CC-BY-SA-4.0';
  /** Absolute URL of the full asset (what the game loads). */
  url: string;
  /** Small preview URL (same as `url` for emoji). */
  thumbUrl: string;
}

// Pinned Twemoji release (jdecked fork — the maintained one). NOT `@latest`:
// pinning keeps a kid's game stable across emoji-set updates (D-ASSET-12).
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets';
const VARIATION_SELECTOR_16 = 'fe0f';

/**
 * Map an emoji character to its Twemoji asset URL. The filename is the emoji's
 * codepoints in lowercase hex joined by `-`, with the VS16 presentation selector
 * (U+FE0F) dropped — exactly how Twemoji names its files. e.g. 🪙 → `1fa99.png`.
 */
export function twemojiUrl(ch: string, fmt: 'png' | 'svg' = 'png'): string {
  const code = Array.from(ch)
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((hex) => hex !== VARIATION_SELECTOR_16)
    .join('-');
  const dir = fmt === 'png' ? '72x72' : 'svg';
  return `${TWEMOJI_BASE}/${dir}/${code}.${fmt}`;
}

// Curated, kid-appropriate emoji set, grouped by the category the Library browses
// by. Tuple = [char, name, ...searchTags]; the name is always an implicit tag.
// Single-codepoint emoji only (simple, reliable URLs — no ZWJ sequences).
type EmojiSpec = readonly [char: string, name: string, ...tags: string[]];

const EMOJI_CATALOG: Record<string, readonly EmojiSpec[]> = {
  characters: [
    ['🦸', 'Hero', 'superhero', 'player'],
    ['🦹', 'Villain', 'enemy', 'boss'],
    ['🧙', 'Wizard', 'mage', 'magic'],
    ['🧚', 'Fairy', 'sprite', 'magic'],
    ['🤖', 'Robot', 'bot', 'mech'],
    ['👾', 'Alien', 'invader', 'enemy', 'space'],
    ['👻', 'Ghost', 'spooky', 'enemy'],
    ['🐲', 'Dragon', 'monster', 'boss'],
    ['🧟', 'Zombie', 'enemy', 'undead'],
    ['🥷', 'Ninja', 'player', 'stealth'],
  ],
  animals: [
    ['🐶', 'Dog', 'puppy', 'pet'],
    ['🐱', 'Cat', 'kitty', 'pet'],
    ['🦊', 'Fox', 'animal'],
    ['🐻', 'Bear', 'animal'],
    ['🐰', 'Rabbit', 'bunny', 'animal'],
    ['🐸', 'Frog', 'animal'],
    ['🐵', 'Monkey', 'animal'],
    ['🦄', 'Unicorn', 'magic', 'horse'],
    ['🐝', 'Bee', 'bug', 'insect'],
    ['🦋', 'Butterfly', 'bug', 'insect'],
    ['🐢', 'Turtle', 'animal', 'shell'],
    ['🐙', 'Octopus', 'sea', 'animal'],
    ['🐦', 'Bird', 'animal', 'fly'],
    ['🐟', 'Fish', 'sea', 'animal'],
  ],
  food: [
    ['🍎', 'Apple', 'fruit', 'pickup'],
    ['🍌', 'Banana', 'fruit', 'pickup'],
    ['🍓', 'Strawberry', 'fruit', 'pickup'],
    ['🍒', 'Cherry', 'fruit', 'pickup'],
    ['🍕', 'Pizza', 'food', 'pickup'],
    ['🍔', 'Burger', 'food', 'pickup'],
    ['🍩', 'Donut', 'food', 'sweet', 'pickup'],
    ['🍪', 'Cookie', 'food', 'sweet', 'pickup'],
    ['🎂', 'Cake', 'food', 'sweet'],
    ['🍬', 'Candy', 'sweet', 'pickup'],
  ],
  nature: [
    ['🌳', 'Tree', 'plant', 'scenery'],
    ['🌵', 'Cactus', 'plant', 'desert'],
    ['🌻', 'Sunflower', 'flower', 'plant'],
    ['🍄', 'Mushroom', 'plant', 'pickup'],
    ['⛰️', 'Mountain', 'scenery', 'rock'],
    ['🌈', 'Rainbow', 'scenery', 'sky'],
    ['☁️', 'Cloud', 'sky', 'scenery'],
    ['⚡', 'Lightning', 'bolt', 'power'],
    ['🔥', 'Fire', 'flame', 'hazard'],
    ['💧', 'Water', 'drop', 'liquid'],
    ['❄️', 'Snowflake', 'ice', 'winter'],
    ['🌙', 'Moon', 'night', 'sky'],
    ['☀️', 'Sun', 'day', 'sky'],
    ['⭐', 'Star', 'pickup', 'collectible'],
  ],
  items: [
    ['🪙', 'Coin', 'money', 'pickup', 'collectible'],
    ['💎', 'Gem', 'diamond', 'pickup', 'treasure'],
    ['🔑', 'Key', 'unlock', 'pickup'],
    ['🛡️', 'Shield', 'defense', 'powerup'],
    ['⚔️', 'Swords', 'weapon', 'attack'],
    ['🏆', 'Trophy', 'win', 'prize'],
    ['🎁', 'Gift', 'present', 'pickup'],
    ['💣', 'Bomb', 'explosive', 'hazard'],
    ['🧪', 'Potion', 'flask', 'powerup'],
    ['🚀', 'Rocket', 'ship', 'space'],
    ['🎈', 'Balloon', 'float', 'fun'],
    ['🕹️', 'Joystick', 'controller', 'ui'],
  ],
  symbols: [
    ['❤️', 'Heart', 'life', 'health', 'ui'],
    ['✨', 'Sparkles', 'effect', 'magic'],
    ['💥', 'Boom', 'explosion', 'effect'],
    ['✅', 'Check', 'correct', 'ui'],
    ['❌', 'Cross', 'wrong', 'ui'],
    ['▶️', 'Play', 'start', 'ui'],
    ['⏸️', 'Pause', 'ui'],
    ['🔔', 'Bell', 'alert', 'ui'],
  ],
};

function buildEmojiLibrary(): LibraryAsset[] {
  const out: LibraryAsset[] = [];
  for (const [category, specs] of Object.entries(EMOJI_CATALOG)) {
    for (const [char, name, ...tags] of specs) {
      const url = twemojiUrl(char);
      out.push({
        id: `emoji/${char}`,
        name,
        category,
        tags: [name.toLowerCase(), ...tags],
        kind: 'image',
        provider: 'emoji',
        license: 'CC-BY-4.0', // Twemoji
        url,
        thumbUrl: url,
      });
    }
  }
  return out;
}

/** The full v1 (emoji) Library, ready to browse. */
export const ASSET_LIBRARY: readonly LibraryAsset[] = buildEmojiLibrary();

/** Distinct categories in browse order. */
export const LIBRARY_CATEGORIES: readonly string[] = Object.keys(EMOJI_CATALOG);

/**
 * Filter the Library by category (`null`/`undefined` = all) and a free-text
 * query matched against the name + tags. Used by the Asset Viewer and is the
 * same shape the `search_assets` agent tool will expose (D-ASSET-10).
 */
export function searchLibrary(
  query: string,
  category?: string | null,
  library: readonly LibraryAsset[] = ASSET_LIBRARY,
): LibraryAsset[] {
  const q = query.trim().toLowerCase();
  return library.filter((a) => {
    if (category && a.category !== category) return false;
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q));
  });
}
