// Character + scene libraries for Blocks Studio. Kept big and picture-only so a
// 5–8-year-old can pick by sight. Characters are emoji (no asset pipeline yet);
// scenes are CSS-animated backgrounds keyed by id (see blocks.css `[data-scene]`).

export interface CharacterChoice {
  emoji: string;
  name: string;
}

// Clear, evenly-sized categories with one obvious icon each, every tab labelled
// the same way (icon + short word) so a pre-reader can tell them apart at a
// glance. Keep groups roughly balanced (~16–24 items) and picture-only.
export const CHARACTER_GROUPS: Array<{ label: string; emoji: string; items: CharacterChoice[] }> = [
  {
    label: 'Animals',
    emoji: '🐶',
    items: [
      { emoji: '🐱', name: 'Cat' },
      { emoji: '🐶', name: 'Dog' },
      { emoji: '🐰', name: 'Bunny' },
      { emoji: '🦊', name: 'Fox' },
      { emoji: '🐻', name: 'Bear' },
      { emoji: '🐼', name: 'Panda' },
      { emoji: '🐨', name: 'Koala' },
      { emoji: '🐵', name: 'Monkey' },
      { emoji: '🦁', name: 'Lion' },
      { emoji: '🐯', name: 'Tiger' },
      { emoji: '🐷', name: 'Pig' },
      { emoji: '🐮', name: 'Cow' },
      { emoji: '🐴', name: 'Horse' },
      { emoji: '🐑', name: 'Sheep' },
      { emoji: '🐘', name: 'Elephant' },
      { emoji: '🦒', name: 'Giraffe' },
      { emoji: '🦓', name: 'Zebra' },
      { emoji: '🦔', name: 'Hedgehog' },
      { emoji: '🐭', name: 'Mouse' },
      { emoji: '🐹', name: 'Hamster' },
    ],
  },
  {
    label: 'Critters',
    emoji: '🦜',
    items: [
      { emoji: '🐔', name: 'Chick' },
      { emoji: '🐧', name: 'Penguin' },
      { emoji: '🦉', name: 'Owl' },
      { emoji: '🦜', name: 'Parrot' },
      { emoji: '🦅', name: 'Eagle' },
      { emoji: '🦆', name: 'Duck' },
      { emoji: '🦢', name: 'Swan' },
      { emoji: '🕊️', name: 'Dove' },
      { emoji: '🦩', name: 'Flamingo' },
      { emoji: '🦋', name: 'Butterfly' },
      { emoji: '🐝', name: 'Bee' },
      { emoji: '🐞', name: 'Ladybug' },
      { emoji: '🐛', name: 'Caterpillar' },
      { emoji: '🐌', name: 'Snail' },
      { emoji: '🐜', name: 'Ant' },
      { emoji: '🦗', name: 'Cricket' },
    ],
  },
  {
    label: 'Sea',
    emoji: '🐠',
    items: [
      { emoji: '🐠', name: 'Fish' },
      { emoji: '🐟', name: 'Fish' },
      { emoji: '🐡', name: 'Pufferfish' },
      { emoji: '🐬', name: 'Dolphin' },
      { emoji: '🐳', name: 'Whale' },
      { emoji: '🦈', name: 'Shark' },
      { emoji: '🐙', name: 'Octopus' },
      { emoji: '🦑', name: 'Squid' },
      { emoji: '🦀', name: 'Crab' },
      { emoji: '🦞', name: 'Lobster' },
      { emoji: '🦐', name: 'Shrimp' },
      { emoji: '🐚', name: 'Shell' },
      { emoji: '🐢', name: 'Turtle' },
      { emoji: '🐸', name: 'Frog' },
      { emoji: '🦭', name: 'Seal' },
      { emoji: '🌊', name: 'Wave' },
    ],
  },
  {
    label: 'People',
    emoji: '🧒',
    items: [
      { emoji: '🧒', name: 'Kid' },
      { emoji: '👦', name: 'Boy' },
      { emoji: '👧', name: 'Girl' },
      { emoji: '👶', name: 'Baby' },
      { emoji: '🧑‍🚀', name: 'Astronaut' },
      { emoji: '🦸', name: 'Hero' },
      { emoji: '🦹', name: 'Villain' },
      { emoji: '🕵️', name: 'Detective' },
      { emoji: '👮', name: 'Police' },
      { emoji: '🧑‍🚒', name: 'Firefighter' },
      { emoji: '👨‍🍳', name: 'Chef' },
      { emoji: '🧑‍🌾', name: 'Farmer' },
      { emoji: '👷', name: 'Builder' },
      { emoji: '🤡', name: 'Clown' },
      { emoji: '🥷', name: 'Ninja' },
      { emoji: '💃', name: 'Dancer' },
    ],
  },
  {
    label: 'Fantasy',
    emoji: '🦄',
    items: [
      { emoji: '🦄', name: 'Unicorn' },
      { emoji: '🐉', name: 'Dragon' },
      { emoji: '🦖', name: 'Dino' },
      { emoji: '🦕', name: 'Dino' },
      { emoji: '🧙', name: 'Wizard' },
      { emoji: '🧚', name: 'Fairy' },
      { emoji: '🧜', name: 'Mermaid' },
      { emoji: '🧝', name: 'Elf' },
      { emoji: '🤴', name: 'Prince' },
      { emoji: '👸', name: 'Princess' },
      { emoji: '🤖', name: 'Robot' },
      { emoji: '👾', name: 'Alien' },
      { emoji: '👻', name: 'Ghost' },
      { emoji: '🎃', name: 'Pumpkin' },
      { emoji: '🧞', name: 'Genie' },
      { emoji: '🐲', name: 'Dragon face' },
    ],
  },
  {
    label: 'Vehicles',
    emoji: '🚗',
    items: [
      { emoji: '🚀', name: 'Rocket' },
      { emoji: '🚗', name: 'Car' },
      { emoji: '🚓', name: 'Police car' },
      { emoji: '🚒', name: 'Fire truck' },
      { emoji: '🚑', name: 'Ambulance' },
      { emoji: '🚌', name: 'Bus' },
      { emoji: '🚜', name: 'Tractor' },
      { emoji: '🏎️', name: 'Race car' },
      { emoji: '✈️', name: 'Plane' },
      { emoji: '🚁', name: 'Helicopter' },
      { emoji: '🛸', name: 'UFO' },
      { emoji: '🚂', name: 'Train' },
      { emoji: '⛵', name: 'Boat' },
      { emoji: '🚤', name: 'Speedboat' },
      { emoji: '🚲', name: 'Bike' },
      { emoji: '🛼', name: 'Skate' },
    ],
  },
  {
    label: 'Food',
    emoji: '🍎',
    items: [
      { emoji: '🍎', name: 'Apple' },
      { emoji: '🍌', name: 'Banana' },
      { emoji: '🍓', name: 'Strawberry' },
      { emoji: '🍉', name: 'Watermelon' },
      { emoji: '🍇', name: 'Grapes' },
      { emoji: '🍒', name: 'Cherries' },
      { emoji: '🥕', name: 'Carrot' },
      { emoji: '🌽', name: 'Corn' },
      { emoji: '🍕', name: 'Pizza' },
      { emoji: '🍔', name: 'Burger' },
      { emoji: '🌭', name: 'Hot dog' },
      { emoji: '🍦', name: 'Ice cream' },
      { emoji: '🍩', name: 'Donut' },
      { emoji: '🍪', name: 'Cookie' },
      { emoji: '🎂', name: 'Cake' },
      { emoji: '🍭', name: 'Lollipop' },
    ],
  },
  {
    label: 'Fun',
    emoji: '⚽',
    items: [
      { emoji: '⚽', name: 'Ball' },
      { emoji: '🏀', name: 'Basketball' },
      { emoji: '⚾', name: 'Baseball' },
      { emoji: '🎾', name: 'Tennis' },
      { emoji: '🏈', name: 'Football' },
      { emoji: '🎈', name: 'Balloon' },
      { emoji: '🎁', name: 'Present' },
      { emoji: '🎀', name: 'Bow' },
      { emoji: '⭐', name: 'Star' },
      { emoji: '🌈', name: 'Rainbow' },
      { emoji: '☀️', name: 'Sun' },
      { emoji: '🌙', name: 'Moon' },
      { emoji: '❤️', name: 'Heart' },
      { emoji: '🌸', name: 'Flower' },
      { emoji: '🌳', name: 'Tree' },
      { emoji: '🍄', name: 'Mushroom' },
    ],
  },
];

export interface SceneChoice {
  id: string;
  label: string;
  /** Thumbnail emoji for the picker. */
  emoji: string;
}

// id → CSS-animated background in blocks.css (`.bsx-stage[data-scene="<id>"]`).
export const SCENES: SceneChoice[] = [
  { id: 'meadow', label: 'Meadow', emoji: '🌳' },
  { id: 'space', label: 'Space', emoji: '🌌' },
  { id: 'beach', label: 'Beach', emoji: '🏖️' },
  { id: 'underwater', label: 'Ocean', emoji: '🐠' },
  { id: 'sunset', label: 'Sunset', emoji: '🌇' },
  { id: 'snow', label: 'Snow', emoji: '⛄' },
  { id: 'city', label: 'City', emoji: '🏙️' },
  { id: 'candy', label: 'Candy', emoji: '🍭' },
];

const SCENE_IDS = new Set(SCENES.map((s) => s.id));
/** Map any stored background to a known scene id (older docs used 'meadow'/'space'). */
export function sceneId(bg: string | undefined): string {
  return bg && SCENE_IDS.has(bg) ? bg : 'meadow';
}
