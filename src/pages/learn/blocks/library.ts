// Character + scene libraries for Blocks Studio. Kept big and picture-only so a
// 5–8-year-old can pick by sight. Characters are emoji (no asset pipeline yet);
// scenes are CSS-animated backgrounds keyed by id (see blocks.css `[data-scene]`).

export interface CharacterChoice {
  emoji: string;
  name: string;
}

export const CHARACTER_GROUPS: Array<{ label: string; emoji: string; items: CharacterChoice[] }> = [
  {
    label: 'Animals',
    emoji: '🐾',
    items: [
      { emoji: '🐱', name: 'Cat' },
      { emoji: '🐶', name: 'Dog' },
      { emoji: '🐰', name: 'Bunny' },
      { emoji: '🦊', name: 'Fox' },
      { emoji: '🐻', name: 'Bear' },
      { emoji: '🐼', name: 'Panda' },
      { emoji: '🐸', name: 'Frog' },
      { emoji: '🐵', name: 'Monkey' },
      { emoji: '🦁', name: 'Lion' },
      { emoji: '🐯', name: 'Tiger' },
      { emoji: '🐷', name: 'Pig' },
      { emoji: '🐮', name: 'Cow' },
      { emoji: '🐔', name: 'Chick' },
      { emoji: '🐧', name: 'Penguin' },
      { emoji: '🦉', name: 'Owl' },
      { emoji: '🐢', name: 'Turtle' },
      { emoji: '🐙', name: 'Octopus' },
      { emoji: '🐠', name: 'Fish' },
      { emoji: '🦋', name: 'Butterfly' },
      { emoji: '🐝', name: 'Bee' },
    ],
  },
  {
    label: 'People',
    emoji: '🧒',
    items: [
      { emoji: '🧒', name: 'Kid' },
      { emoji: '👦', name: 'Boy' },
      { emoji: '👧', name: 'Girl' },
      { emoji: '🧑‍🚀', name: 'Astronaut' },
      { emoji: '🦸', name: 'Hero' },
      { emoji: '🧙', name: 'Wizard' },
      { emoji: '🧚', name: 'Fairy' },
      { emoji: '🧜', name: 'Mermaid' },
      { emoji: '🤴', name: 'Prince' },
      { emoji: '👸', name: 'Princess' },
      { emoji: '🤡', name: 'Clown' },
      { emoji: '🥷', name: 'Ninja' },
    ],
  },
  {
    label: 'Go!',
    emoji: '🚀',
    items: [
      { emoji: '🚀', name: 'Rocket' },
      { emoji: '🚗', name: 'Car' },
      { emoji: '🚓', name: 'Police car' },
      { emoji: '🚒', name: 'Fire truck' },
      { emoji: '✈️', name: 'Plane' },
      { emoji: '🚁', name: 'Helicopter' },
      { emoji: '🛸', name: 'UFO' },
      { emoji: '🚂', name: 'Train' },
      { emoji: '🏎️', name: 'Race car' },
      { emoji: '⛵', name: 'Boat' },
      { emoji: '🚲', name: 'Bike' },
      { emoji: '🛼', name: 'Skate' },
    ],
  },
  {
    label: 'Fun',
    emoji: '⭐',
    items: [
      { emoji: '⚽', name: 'Ball' },
      { emoji: '🏀', name: 'Basketball' },
      { emoji: '🎈', name: 'Balloon' },
      { emoji: '🎁', name: 'Present' },
      { emoji: '⭐', name: 'Star' },
      { emoji: '🌈', name: 'Rainbow' },
      { emoji: '🍎', name: 'Apple' },
      { emoji: '🍕', name: 'Pizza' },
      { emoji: '🍦', name: 'Ice cream' },
      { emoji: '🤖', name: 'Robot' },
      { emoji: '👾', name: 'Alien' },
      { emoji: '👻', name: 'Ghost' },
      { emoji: '🎃', name: 'Pumpkin' },
      { emoji: '🦖', name: 'Dino' },
      { emoji: '🐉', name: 'Dragon' },
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
