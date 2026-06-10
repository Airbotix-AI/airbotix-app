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
  faces: [
    ['😀', 'Grin', 'happy', 'smile'],
    ['😃', 'Smiley', 'happy'],
    ['😄', 'Laughing', 'happy'],
    ['😁', 'Beaming', 'happy'],
    ['😆', 'Giggle', 'happy', 'laugh'],
    ['😅', 'Sweat Smile', 'nervous'],
    ['😂', 'Tears of Joy', 'laugh', 'lol'],
    ['🙂', 'Slight Smile', 'happy'],
    ['😊', 'Blush', 'happy', 'shy'],
    ['😇', 'Angel', 'innocent', 'halo'],
    ['😉', 'Wink', 'flirt'],
    ['😍', 'Heart Eyes', 'love'],
    ['🥰', 'Smiling Hearts', 'love'],
    ['😘', 'Kiss', 'love'],
    ['😋', 'Yum', 'tasty', 'tongue'],
    ['😜', 'Winking Tongue', 'silly'],
    ['🤪', 'Zany', 'silly', 'crazy'],
    ['🤗', 'Hug', 'warm'],
    ['🤩', 'Star Struck', 'wow', 'excited'],
    ['🥳', 'Party', 'celebrate'],
    ['😎', 'Cool', 'sunglasses'],
    ['🤓', 'Nerd', 'glasses', 'smart'],
    ['🤔', 'Thinking', 'hmm'],
    ['😐', 'Neutral', 'meh'],
    ['😴', 'Sleeping', 'sleep', 'zzz'],
    ['😮', 'Surprised', 'wow', 'shock'],
    ['😲', 'Astonished', 'shock'],
    ['🥺', 'Pleading', 'sad', 'cute'],
    ['😢', 'Crying', 'sad', 'tear'],
    ['😭', 'Sobbing', 'sad', 'cry'],
    ['😠', 'Angry', 'mad'],
    ['😡', 'Rage', 'mad', 'furious'],
    ['🤯', 'Mind Blown', 'shock', 'wow'],
    ['😱', 'Screaming', 'scared', 'fear'],
    ['😨', 'Fearful', 'scared'],
    ['🥶', 'Cold', 'freezing'],
    ['🥵', 'Hot', 'sweating'],
    ['🤢', 'Sick', 'nauseated', 'gross'],
    ['😈', 'Devil', 'evil', 'enemy'],
    ['💀', 'Skull', 'dead', 'danger'],
    ['💩', 'Poop', 'silly', 'funny'],
  ],
  characters: [
    ['🦸', 'Hero', 'superhero', 'player'],
    ['🦹', 'Villain', 'enemy', 'boss'],
    ['🧙', 'Wizard', 'mage', 'magic'],
    ['🧚', 'Fairy', 'sprite', 'magic'],
    ['🧛', 'Vampire', 'monster', 'enemy'],
    ['🧜', 'Merperson', 'mermaid', 'sea'],
    ['🧝', 'Elf', 'fantasy'],
    ['🧞', 'Genie', 'magic'],
    ['🧟', 'Zombie', 'enemy', 'undead'],
    ['🥷', 'Ninja', 'player', 'stealth'],
    ['🤖', 'Robot', 'bot', 'mech'],
    ['👾', 'Alien', 'invader', 'enemy', 'space'],
    ['👽', 'Extraterrestrial', 'alien', 'space'],
    ['👻', 'Ghost', 'spooky', 'enemy'],
    ['🤡', 'Clown', 'circus', 'funny'],
    ['👹', 'Ogre', 'monster', 'enemy'],
    ['👺', 'Goblin', 'monster', 'enemy'],
    ['🎅', 'Santa', 'christmas'],
    ['🤴', 'Prince', 'royal'],
    ['👸', 'Princess', 'royal'],
    ['👮', 'Police', 'officer', 'cop'],
    ['👷', 'Builder', 'construction', 'worker'],
    ['🧑', 'Person', 'player', 'human'],
    ['🦖', 'T-Rex', 'dinosaur', 'monster'],
    ['🐲', 'Dragon', 'monster', 'boss'],
  ],
  animals: [
    ['🐶', 'Dog', 'puppy', 'pet'],
    ['🐱', 'Cat', 'kitty', 'pet'],
    ['🐭', 'Mouse', 'animal'],
    ['🐹', 'Hamster', 'pet'],
    ['🐰', 'Rabbit', 'bunny'],
    ['🦊', 'Fox', 'animal'],
    ['🐻', 'Bear', 'animal'],
    ['🐼', 'Panda', 'animal'],
    ['🐨', 'Koala', 'animal'],
    ['🐯', 'Tiger', 'animal', 'wild'],
    ['🦁', 'Lion', 'animal', 'wild'],
    ['🐮', 'Cow', 'farm'],
    ['🐷', 'Pig', 'farm'],
    ['🐸', 'Frog', 'animal'],
    ['🐵', 'Monkey', 'animal'],
    ['🐔', 'Chicken', 'farm', 'bird'],
    ['🐧', 'Penguin', 'bird', 'ice'],
    ['🐦', 'Bird', 'fly'],
    ['🦅', 'Eagle', 'bird', 'fly'],
    ['🦉', 'Owl', 'bird', 'night'],
    ['🦄', 'Unicorn', 'magic', 'horse'],
    ['🐝', 'Bee', 'bug', 'insect'],
    ['🐛', 'Caterpillar', 'bug'],
    ['🦋', 'Butterfly', 'bug', 'insect'],
    ['🐌', 'Snail', 'slow', 'bug'],
    ['🐞', 'Ladybug', 'bug', 'insect'],
    ['🕷️', 'Spider', 'bug', 'enemy'],
    ['🐢', 'Turtle', 'shell', 'slow'],
    ['🐍', 'Snake', 'enemy', 'reptile'],
    ['🦎', 'Lizard', 'reptile'],
    ['🐙', 'Octopus', 'sea'],
    ['🦀', 'Crab', 'sea', 'enemy'],
    ['🐠', 'Fish', 'sea'],
    ['🐬', 'Dolphin', 'sea'],
    ['🐳', 'Whale', 'sea'],
    ['🦈', 'Shark', 'sea', 'enemy'],
    ['🐴', 'Horse', 'animal', 'ride'],
    ['🦓', 'Zebra', 'animal'],
    ['🐘', 'Elephant', 'animal'],
    ['🦒', 'Giraffe', 'animal'],
    ['🐑', 'Sheep', 'farm'],
    ['🐗', 'Boar', 'animal', 'enemy'],
    ['🦔', 'Hedgehog', 'animal'],
  ],
  food: [
    ['🍎', 'Apple', 'fruit', 'pickup'],
    ['🍐', 'Pear', 'fruit', 'pickup'],
    ['🍊', 'Orange', 'fruit', 'pickup'],
    ['🍋', 'Lemon', 'fruit', 'pickup'],
    ['🍌', 'Banana', 'fruit', 'pickup'],
    ['🍉', 'Watermelon', 'fruit', 'pickup'],
    ['🍇', 'Grapes', 'fruit', 'pickup'],
    ['🍓', 'Strawberry', 'fruit', 'pickup'],
    ['🍒', 'Cherry', 'fruit', 'pickup'],
    ['🍑', 'Peach', 'fruit', 'pickup'],
    ['🍍', 'Pineapple', 'fruit', 'pickup'],
    ['🥝', 'Kiwi', 'fruit', 'pickup'],
    ['🍅', 'Tomato', 'pickup'],
    ['🥕', 'Carrot', 'veggie', 'pickup'],
    ['🌽', 'Corn', 'veggie'],
    ['🍄', 'Mushroom', 'pickup', 'powerup'],
    ['🥨', 'Pretzel', 'snack'],
    ['🍞', 'Bread', 'food'],
    ['🧀', 'Cheese', 'food'],
    ['🍖', 'Meat', 'food'],
    ['🍗', 'Drumstick', 'food'],
    ['🍔', 'Burger', 'food', 'pickup'],
    ['🍟', 'Fries', 'food'],
    ['🍕', 'Pizza', 'food', 'pickup'],
    ['🌭', 'Hot Dog', 'food'],
    ['🌮', 'Taco', 'food'],
    ['🍣', 'Sushi', 'food'],
    ['🍝', 'Pasta', 'food'],
    ['🍦', 'Ice Cream', 'sweet', 'pickup'],
    ['🍩', 'Donut', 'sweet', 'pickup'],
    ['🍪', 'Cookie', 'sweet', 'pickup'],
    ['🎂', 'Cake', 'sweet', 'party'],
    ['🧁', 'Cupcake', 'sweet', 'pickup'],
    ['🍫', 'Chocolate', 'sweet', 'pickup'],
    ['🍬', 'Candy', 'sweet', 'pickup'],
    ['🍭', 'Lollipop', 'sweet', 'pickup'],
    ['🍿', 'Popcorn', 'snack'],
  ],
  plants: [
    ['🌱', 'Seedling', 'plant', 'grow'],
    ['🌲', 'Pine Tree', 'tree', 'scenery'],
    ['🌳', 'Tree', 'scenery'],
    ['🌴', 'Palm Tree', 'tropical', 'scenery'],
    ['🌵', 'Cactus', 'desert', 'scenery'],
    ['🌾', 'Wheat', 'grass', 'farm'],
    ['🍀', 'Clover', 'luck', 'pickup'],
    ['🍁', 'Maple Leaf', 'autumn'],
    ['🍂', 'Fallen Leaves', 'autumn'],
    ['🌸', 'Blossom', 'flower'],
    ['🌹', 'Rose', 'flower'],
    ['🌻', 'Sunflower', 'flower'],
    ['🌷', 'Tulip', 'flower'],
    ['🌼', 'Daisy', 'flower'],
    ['💐', 'Bouquet', 'flowers'],
  ],
  weather: [
    ['☀️', 'Sun', 'day', 'sky'],
    ['🌙', 'Moon', 'night', 'sky'],
    ['⭐', 'Star', 'pickup', 'collectible'],
    ['🌟', 'Glowing Star', 'pickup', 'shine'],
    ['💫', 'Dizzy', 'stars', 'effect'],
    ['🌈', 'Rainbow', 'sky', 'scenery'],
    ['☁️', 'Cloud', 'sky', 'scenery'],
    ['⛅', 'Partly Cloudy', 'sky'],
    ['🌧️', 'Rain', 'weather'],
    ['⛈️', 'Storm', 'weather', 'hazard'],
    ['⚡', 'Lightning', 'bolt', 'power'],
    ['❄️', 'Snowflake', 'ice', 'winter'],
    ['⛄', 'Snowman', 'winter'],
    ['🔥', 'Fire', 'flame', 'hazard'],
    ['💧', 'Water Drop', 'liquid'],
    ['🌊', 'Wave', 'sea', 'water'],
  ],
  items: [
    ['🪙', 'Coin', 'money', 'pickup', 'collectible'],
    ['💰', 'Money Bag', 'treasure', 'pickup'],
    ['💎', 'Gem', 'diamond', 'pickup', 'treasure'],
    ['👑', 'Crown', 'royal', 'pickup', 'win'],
    ['🔑', 'Key', 'unlock', 'pickup'],
    ['🗝️', 'Old Key', 'unlock', 'pickup'],
    ['🛡️', 'Shield', 'defense', 'powerup'],
    ['⚔️', 'Swords', 'weapon', 'attack'],
    ['🗡️', 'Dagger', 'weapon', 'attack'],
    ['🏹', 'Bow', 'weapon', 'arrow'],
    ['🔨', 'Hammer', 'tool', 'weapon'],
    ['🪄', 'Magic Wand', 'magic', 'powerup'],
    ['🧪', 'Potion', 'flask', 'powerup'],
    ['💊', 'Pill', 'health', 'powerup'],
    ['🏆', 'Trophy', 'win', 'prize'],
    ['🥇', 'Gold Medal', 'win', 'first'],
    ['🎁', 'Gift', 'present', 'pickup'],
    ['🎈', 'Balloon', 'float', 'fun'],
    ['🪂', 'Parachute', 'fall', 'fly'],
    ['💣', 'Bomb', 'explosive', 'hazard'],
    ['🧨', 'Firecracker', 'explosive', 'hazard'],
    ['🚀', 'Rocket', 'ship', 'space'],
    ['🛸', 'UFO', 'space', 'enemy'],
    ['⚓', 'Anchor', 'sea'],
    ['🧲', 'Magnet', 'powerup', 'pull'],
    ['🔦', 'Flashlight', 'light', 'tool'],
    ['🕹️', 'Joystick', 'controller', 'ui'],
    ['💡', 'Lightbulb', 'idea', 'light'],
    ['🔋', 'Battery', 'power', 'energy'],
    ['🧱', 'Brick', 'block', 'wall'],
    ['🎯', 'Target', 'aim', 'goal'],
    ['🚩', 'Flag', 'goal', 'checkpoint'],
    ['🏁', 'Finish Flag', 'goal', 'race'],
    ['🚪', 'Door', 'exit', 'portal'],
    ['🪜', 'Ladder', 'climb'],
  ],
  vehicles: [
    ['🚗', 'Car', 'vehicle', 'drive'],
    ['🏎️', 'Race Car', 'vehicle', 'fast'],
    ['🚓', 'Police Car', 'vehicle'],
    ['🚑', 'Ambulance', 'vehicle'],
    ['🚒', 'Fire Truck', 'vehicle'],
    ['🚌', 'Bus', 'vehicle'],
    ['🚚', 'Truck', 'vehicle'],
    ['🚜', 'Tractor', 'vehicle', 'farm'],
    ['🏍️', 'Motorcycle', 'vehicle', 'fast'],
    ['🚲', 'Bicycle', 'bike', 'ride'],
    ['🛹', 'Skateboard', 'ride'],
    ['🚂', 'Train', 'vehicle'],
    ['✈️', 'Airplane', 'fly', 'vehicle'],
    ['🚁', 'Helicopter', 'fly', 'vehicle'],
    ['🛰️', 'Satellite', 'space', 'orbit'],
    ['⛵', 'Sailboat', 'sea', 'vehicle'],
    ['🚤', 'Speedboat', 'sea', 'fast'],
    ['🚢', 'Ship', 'sea', 'vehicle'],
  ],
  sports: [
    ['⚽', 'Soccer Ball', 'ball', 'sport'],
    ['🏀', 'Basketball', 'ball', 'sport'],
    ['🏈', 'Football', 'ball', 'sport'],
    ['⚾', 'Baseball', 'ball', 'sport'],
    ['🎾', 'Tennis Ball', 'ball', 'sport'],
    ['🏐', 'Volleyball', 'ball', 'sport'],
    ['🎱', '8 Ball', 'ball', 'pool'],
    ['🏓', 'Ping Pong', 'paddle', 'sport'],
    ['🏸', 'Badminton', 'sport'],
    ['🥅', 'Goal Net', 'goal', 'sport'],
    ['⛳', 'Golf Flag', 'goal', 'sport'],
    ['🎳', 'Bowling', 'sport'],
    ['🎮', 'Game Controller', 'play', 'ui'],
    ['🎲', 'Dice', 'random', 'game'],
    ['🧩', 'Puzzle Piece', 'puzzle', 'pickup'],
    ['🪁', 'Kite', 'fly', 'wind'],
  ],
  music: [
    ['🎵', 'Music Note', 'sound', 'audio'],
    ['🎶', 'Notes', 'sound', 'audio'],
    ['🎤', 'Microphone', 'sing', 'sound'],
    ['🎧', 'Headphones', 'sound', 'audio'],
    ['🥁', 'Drum', 'music', 'beat'],
    ['🎸', 'Guitar', 'music'],
    ['🎹', 'Piano', 'music', 'keyboard'],
    ['🎺', 'Trumpet', 'music'],
    ['🔔', 'Bell', 'alert', 'sound'],
    ['📢', 'Loudspeaker', 'sound', 'announce'],
  ],
  symbols: [
    ['❤️', 'Heart', 'life', 'health', 'love'],
    ['🧡', 'Orange Heart', 'life', 'health'],
    ['💛', 'Yellow Heart', 'life', 'health'],
    ['💚', 'Green Heart', 'life', 'health'],
    ['💙', 'Blue Heart', 'life', 'health'],
    ['💜', 'Purple Heart', 'life', 'health'],
    ['💔', 'Broken Heart', 'life', 'damage'],
    ['✨', 'Sparkles', 'effect', 'magic'],
    ['💥', 'Boom', 'explosion', 'effect'],
    ['🌀', 'Swirl', 'spiral', 'effect'],
    ['💢', 'Anger', 'effect', 'mad'],
    ['💨', 'Dash', 'speed', 'effect'],
    ['💦', 'Splash', 'water', 'effect'],
    ['✅', 'Check', 'correct', 'ui'],
    ['❌', 'Cross', 'wrong', 'ui'],
    ['❓', 'Question', 'mystery', 'ui'],
    ['❗', 'Exclamation', 'alert', 'ui'],
    ['💯', '100', 'score', 'perfect'],
    ['🔆', 'Bright', 'light', 'ui'],
    ['⏸️', 'Pause', 'ui'],
    ['▶️', 'Play', 'start', 'ui'],
    ['🔁', 'Loop', 'repeat', 'ui'],
    ['💤', 'Sleep', 'zzz', 'effect'],
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
