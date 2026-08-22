// Journey to the West · Season 1 Story Part catalogue + the C1-P1 part content.
//
// Curriculum SOT: docs/product/curriculum/story-blocks/
//   journey-to-the-west-season-1-scene-specs.md (per-part contracts)
//   journey-to-the-west-season-1-teaching-script.md (child-facing story text)
// The part chain mirrors the backend story-parts catalogue exactly (50 parts,
// linear unlock, C1–C5 ×8 + C6 ×10). Only parts listed in PART_CONTENT are
// playable; later parts render as locked/coming until their build task lands.

import type { Block, BlocksProject } from '../blocksModel';
import { C2_STONE_CELLS } from './journeyWestC2Route';

export const JTW_S1_STORY_LINE_ID = 'journey-to-the-west-s1';

export interface JtwPartRef {
  id: string;
  code: string;
  title: string;
}

export interface JtwChapterRef {
  code: string;
  title: string;
  parts: JtwPartRef[];
}

const CHAPTER_TITLES: Record<string, string> = {
  C1: 'The Stone Monkey Is Born',
  C2: 'The Promise at Water Curtain Cave',
  C3: 'Across the Sea to Find a Teacher',
  C4: 'Your name is Sun Wukong',
  C5: 'The Size-Changing Golden-Hooped Staff',
  C6: 'Fast and Slow in Heaven',
};

const PART_TITLES: ReadonlyArray<readonly [code: string, title: string]> = [
  ['C1-P1', 'Morning on Flower-Fruit Mountain'],
  ['C1-P2', 'Watch the Stone Monkey Appear'],
  ['C1-P3', 'Rehearse the Story Order'],
  ['C1-P4', 'Build the Full Arrival'],
  ['C1-P5', 'Two sincere greetings'],
  ['C1-P6', 'Where Did That Sound Come From?'],
  ['C1-P7', 'My Stone Monkey Entrance'],
  ['C1-P8', 'A New Friend Hears Water'],
  ['C2-P1', 'Where does the sound of water take everyone?'],
  ['C2-P2', 'The Promise at the Waterfall'],
  ['C2-P3', 'Three Sections of Wet Stone'],
  ['C2-P4', 'Reach It Exactly'],
  ['C2-P5', 'Behind the Water Curtain'],
  ['C2-P6', 'The first deviation on the way back'],
  ['C2-P7', 'Make discovery the path for everyone'],
  ['C2-P8', 'Keep the Promise, Become the Monkey King'],
  ['C3-P1', 'A Happy Home Cannot Answer Every Question'],
  ['C3-P2', 'Put Departure and Arrival in Order'],
  ['C3-P3', 'A Page Exit Must Lead Somewhere'],
  ['C3-P4', 'Give the Middle of the Sea a Story and an Exit'],
  ['C3-P5', 'Observe the Starry Night and Morning Mist'],
  ['C3-P6', 'The Raft Starts in the Wrong Place'],
  ['C3-P7', 'My Three-Page Search for a Teacher'],
  ['C3-P8', 'Arrival Is Only the Beginning'],
  ['C4-P1', 'In front of the mountain gate, explain clearly the way you came.'],
  ['C4-P2', 'One name, two starts'],
  ['C4-P3', 'two entrance circles'],
  ['C4-P4', 'Stand firm on the name first, then respond with the ability'],
  ['C4-P5', 'The skill is not to be first'],
  ['C4-P6', 'Find the first deviation first'],
  ['C4-P7', 'Let your companions truly know Wukong'],
  ['C4-P8', 'The name followed him home'],
  ['C5-P1', 'Why do pillar shadows appear on the seabed?'],
  ['C5-P2', 'What size will the last piece leave?'],
  ['C5-P3', 'The body remembers three states'],
  ['C5-P4', 'Build a full-size experiment'],
  ['C5-P5', 'The largest does not mean the most suitable'],
  ['C5-P6', 'Reset ended at the wrong end'],
  ['C5-P7', 'My wishful story'],
  ['C5-P8', 'Take away the treasure and explain the consequences'],
  ['C6-P1', 'Six seals walked to the Heavenly Palace'],
  ['C6-P2', 'Feelings and choices are not the same thing'],
  ['C6-P3', 'Six things cannot happen at the same time'],
  ['C6-P4', 'Make the identity conflict clear on the first page'],
  ['C6-P5', 'Page 2 separates action from response'],
  ['C6-P6', 'My prequel rhythm'],
  ['C6-P7', 'It’s Five Elements Mountain but it’s not over yet'],
  ['C6-P8', 'My three-page Monkey King prequel'],
  ['C6-P9', 'Six seals and four reasons'],
  ['C6-P10', 'The first journey is complete'],
];

export function jtwPartId(code: string): string {
  return `jtw-s1-${code.toLowerCase()}`;
}

export const JTW_S1_CHAPTERS: JtwChapterRef[] = Object.entries(CHAPTER_TITLES).map(
  ([chapterCode, chapterTitle]) => ({
    code: chapterCode,
    title: chapterTitle,
    parts: PART_TITLES.filter(([code]) => code.startsWith(`${chapterCode}-`)).map(
      ([code, title]) => ({ id: jtwPartId(code), code, title }),
    ),
  }),
);

export const JTW_S1_PART_IDS: string[] = JTW_S1_CHAPTERS.flatMap((chapter) =>
  chapter.parts.map((part) => part.id),
);

// ─────────────────────────────────────────────────────────────────────────────
// C1-P1 · 清晨的花果山 — Read & Why entry part (scene-specs JTW-S1-C1-P1).
// ─────────────────────────────────────────────────────────────────────────────

export interface JtwEvidenceOption {
  id: string;
  label: string;
  correct: boolean;
}

/** Child-facing story text — teaching-script "清晨的花果山" IN FULL, two screens. */
export const C1_P1_STORY_BEFORE: readonly [string, string] = [
  'Before sunrise, pale blue light spreads across the sea. Waves splash against the dark rocks. Dew shines on the peach trees, a clear spring runs down the mountain and the monkeys search for ripe fruit. Only the tall magic stone at the summit stays still. It has no door or window, yet it has stood through wind, rain, sunshine and moonlight for many years.',
  'A young monkey points towards the summit. “Look! There is light inside the crack!” The others stop. A thin golden glow shines from the stone, followed by a soft thump. The monkeys do not rush closer. They hide behind the leaves and watch. No one is called Sun Wukong yet, and the pilgrims have not met. Our story begins with this mountain, this stone and a new friend who has not appeared.',
];

export const C1_P1_CLASSIC_CARD =
  'In the opening chapter of the classic novel, the magic stone on Flower-Fruit Mountain gives birth to the Stone Monkey. He is not called Sun Wukong yet, and he has not met the pilgrims.';

/** 环境证据：至少选 3 项（全部 5 项都是画面里真实存在的）。 */
export const C1_P1_ENVIRONMENT_OPTIONS: JtwEvidenceOption[] = [
  { id: 'sea', label: 'sea', correct: true },
  { id: 'fruit-trees', label: 'fruit trees', correct: true },
  { id: 'spring', label: 'clear spring', correct: true },
  { id: 'immortal-stone', label: 'magic stone', correct: true },
  { id: 'warm-light', label: 'warm light', correct: true },
];
export const C1_P1_ENVIRONMENT_MIN = 3;

/** 动静证据：群猴停下来观察的两条原因（恰好两条正确）。 */
export const C1_P1_REASON_OPTIONS: JtwEvidenceOption[] = [
  { id: 'crack-light', label: 'Light shines from the cracks in the rocks', correct: true },
  { id: 'stone-sound', label: 'A "dong" sound came from the stone', correct: true },
  { id: 'pick-fruit', label: 'I want to pick ripe fruits first', correct: false },
  { id: 'sky-bright', label: 'It will be bright soon', correct: false },
];

/** “因为……，所以群猴……”句子的结尾选项。 */
export const C1_P1_SO_OPTIONS: JtwEvidenceOption[] = [
  { id: 'stop-watch', label: 'Stop, hide behind the leaves and observe carefully', correct: true },
  { id: 'run-away', label: 'Ran away immediately', correct: false },
  { id: 'touch-stone', label: 'Rush up and touch the fairy stone', correct: false },
];

export const C1_P1_PREDICTION_QUESTION = 'After the sound, had the Stone Monkey appeared?';
export const C1_P1_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'not-yet-appeared',
    label:
      'Not yet - there is no stone monkey on the stone platform, he is still hidden in the stone',
    correct: true,
  },
  {
    id: 'already-appeared',
    label: 'Already appeared, standing on the stone platform',
    correct: false,
  },
];
export const C1_P1_PREDICTION_RETRY_HINT =
  'Look again. Can you see the Stone Monkey on the platform yet? Use the picture as your evidence.';

export const C1_P1_RESOLVED_WORLD_CHANGE =
  'The morning light moved to the fairy stone, and the cracks became clearer; a leaf was shaken off, and there was another sound in the stone.';
export const C1_P1_STORY_AFTER = 'The monkeys decided to wait quietly.';
export const C1_P1_CONTINUE_LABEL = 'Listen to the inside of the stone';

export const JTW_STONE_MONKEY_ASSET =
  '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png';
export const JTW_C1_BACKGROUND_ASSET =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c1/before-v01.webp';
/**
 * Chapter two's own stage: the waterfall, the pool and the wet stepping stones
 * the C2-P4 route crosses, with the curtain closed and the cave mouth still dark
 * behind it. Chapter one's flower-fruit background is a different scene — the
 * waterfall only appears there as distant scenery.
 */
export const JTW_C2_BACKGROUND_ASSET =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c2/before-v01.webp';
/** Same composition, cave mouth warm-lit — chapter two's resolved state. */
export const JTW_C2_RESOLVED_BACKGROUND_ASSET =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c2/resolved-v01.webp';

/**
 * The read-only system preview chain (scene-specs C1-P1): the stone's sound is
 * the future play_sound(Chime); the monkey NOT appearing is the future show.
 * Exactly these ops — the track is read-only and never counts as a kid Build.
 */
export const C1_P1_PREVIEW_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C1-P1 preview',
  pages: [
    {
      id: 'jtw-s1-c1-p1-page',
      background: 'jtw-s1-c1-flower-fruit-stone',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          asset: JTW_STONE_MONKEY_ASSET,
          start: { gx: 8, gy: 9, size: 3, rot: 0 },
          scripts: [
            {
              id: 'stone-monkey-hidden-morning',
              blocks: [
                { op: 'when_flag' },
                { op: 'hide' },
                { op: 'play_sound', n: 2 }, // 🔔 Chime
                { op: 'wait', n: 2 },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// C1-P2 · 石猴出世运行示范 — Story Hook + demo run (scene-specs JTW-S1-C1-P2).
// English child-facing text per the scene contract. The kid orders the four
// story cards, names the first and last block, predicts, then watches the REAL
// runner execute the full arrival chain left to right.
// ─────────────────────────────────────────────────────────────────────────────

export const C1_P2_STORY_BEFORE =
  'Beside the sea stands Flower-Fruit Mountain, with peach trees, clear streams and a magical stone. Today, a soft sound comes from inside the stone. The monkeys stop and listen. Who is coming into their world?';

export const C1_P2_CLASSIC_CARD =
  'This is the beginning of *Journey to the West*. He is called the Stone Monkey. He does not have the name Sun Wukong yet.';

export const C1_P2_MOTIVE =
  'The Stone Monkey has just arrived. He wants the other monkeys to see him, try his first jump and say hello.';

/** The four story cards the kid must arrange into story order. */
export const C1_P2_STORY_CARDS: JtwEvidenceOption[] = [
  { id: 'stone-sound', label: '🔔 There is movement in the stone (Chime)', correct: true },
  { id: 'monkey-appears', label: '👀 Stone Monkey Appears (Show)', correct: true },
  { id: 'first-jump', label: '🦘 Hop', correct: true },
  { id: 'say-hello', label: '💬 Say hello (Say)', correct: true },
];
export const C1_P2_CARD_ORDER = ['stone-sound', 'monkey-appears', 'first-jump', 'say-hello'];

/** First / last block checks — the kid names both before pressing Go. */
export const C1_P2_FIRST_BLOCK_OPTIONS: JtwEvidenceOption[] = [
  { id: 'first-start', label: '🚩 Start', correct: true },
  { id: 'first-say', label: '💬 Say', correct: false },
  { id: 'first-hop', label: '🦘 Hop', correct: false },
];
export const C1_P2_LAST_BLOCK_OPTIONS: JtwEvidenceOption[] = [
  { id: 'last-end', label: '🛑 End', correct: true },
  { id: 'last-show', label: '👀 Show', correct: false },
  { id: 'last-chime', label: '🔔 Chime', correct: false },
];

export const C1_P2_PREDICTION_QUESTION =
  'If the Stone Monkey has not appeared yet, will the others see his jump and hear his hello?';
export const C1_P2_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'no-show-first',
    label: 'No — he must appear (Show) first, or the jump and hello happen unseen',
    correct: true,
  },
  {
    id: 'yes-anyway',
    label: 'Yes — they can see and hear him even while he is hidden',
    correct: false,
  },
];
export const C1_P2_PREDICTION_RETRY_HINT =
  'Look at the chain: Show comes before Hop and Say. What would the monkeys see without it?';

export const C1_P2_SAY_TEXT = "Hello! I'm new here!";
export const C1_P2_STORY_AFTER =
  'Now the monkeys can see their new friend. One monkey steps out from behind a tree. The Stone Monkey hears rushing water deeper in the valley.';
export const C1_P2_CONTINUE_LABEL = "Now I'll build it";

/**
 * The demo arrival chain (scene-specs 初始脚本): hide compensates for the
 * missing initial-hidden field, then Chime → wait → Show → Hop → Say → End.
 */
export const C1_P2_DEMO_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C1-P2 arrival demo',
  pages: [
    {
      id: 'jtw-s1-c1-p2-page',
      background: 'jtw-s1-c1-flower-fruit-stone',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          asset: JTW_STONE_MONKEY_ASSET,
          start: { gx: 8, gy: 9, size: 3, rot: 0 },
          scripts: [
            {
              id: 'arrival-demo',
              blocks: [
                { op: 'when_flag' },
                { op: 'hide' },
                { op: 'play_sound', n: 2 }, // 🔔 Chime
                { op: 'wait', n: 2 },
                { op: 'show' },
                { op: 'hop', n: 1 },
                { op: 'say', text: C1_P2_SAY_TEXT },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// C1-P3 · 树叶后的顺序排练 — planning-before-code (scene-specs JTW-S1-C1-P3).
// The child arranges the four story cards into the target order, then swaps
// Hop/Say to compare how order changes what the audience understands. No
// runner: the rehearsal is the off-screen/body layer; the preset chain is
// shown read-only. Cards map EXACTLY to play_sound(Chime)/show/hop(1)/say.
// ─────────────────────────────────────────────────────────────────────────────

/** Teaching-script "树叶后的排练" IN FULL. */
export const C1_P3_STORY_BEFORE =
  'The stone monkey stood next to the fairy stone and quietly went through four things in his mind: first he heard the prompts from the stone, then he let everyone see him, then he made an action, and finally he said his greetings. The wind rustled the leaves, as if playing a rhythm to him. The group of monkeys behind the tree also tried to imagine: if they hear "Hello" first but cannot see the speaker, they will look around; if the stone monkey jumps before it appears, everyone will only see an empty stone platform; if each step occurs in order, they can follow the clues to understand that "the new partner is coming." A younger group of monkeys picked up four leaves of different shapes and placed them on the ground to represent the four story actions. Another group of monkeys deliberately exchanged two leaves, and everyone immediately noticed that the story became strange. Stone Monkey did not laugh at anyone who was troubleshooting, nor did he rush to give an answer. He said: "Let\'s slow down and act step by step. Which card you see, just do that step." So, the body became the program, the grass became the stage, and everyone could see how the sequence changed the story.';

/** 人物动机：石猴为什么愿意排练？ */
export const C1_P3_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'clear-first-meeting',
    label: 'He wants to make the first meeting clear and put his partner at ease',
    correct: true,
  },
  { id: 'get-reward', label: 'Rehearse well and get rewarded', correct: false },
  { id: 'grab-fruit', label: 'Want to be the first to grab the ripe fruit', correct: false },
];

/** 四张故事卡——与 play_sound(Chime)/show/hop(1)/say 一一对应。 */
export const C1_P3_STORY_CARDS: JtwEvidenceOption[] = [
  { id: 'card-chime', label: '🔔 Chime', correct: true },
  { id: 'card-show', label: '👀 Let everyone see me (Show)', correct: true },
  { id: 'card-hop', label: '🦘 Make a move (Hop)', correct: true },
  { id: 'card-say', label: '💬 Say hello (Say)', correct: true },
];
export const C1_P3_CARD_ORDER = ['card-chime', 'card-show', 'card-hop', 'card-say'];
/** Hop/Say swapped — the comparison rehearsal order. */
export const C1_P3_SWAPPED_ORDER = ['card-chime', 'card-show', 'card-say', 'card-hop'];

/** 交换 Hop/Say 之后的对比问题。 */
export const C1_P3_SWAP_QUESTION =
  'After exchanging Hop and Say, can my partner still understand "A new friend is here"?';
export const C1_P3_SWAP_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'still-works-show-first',
    label:
      'Yes - because the stone monkey has already appeared first, it makes sense to say hello first and then jump.',
    correct: true,
  },
  {
    id: 'breaks-completely',
    label: "I can't understand it at all, the story is broken",
    correct: false,
  },
];

/** 证据：哪一版会让声音像从空中冒出来？ */
export const C1_P3_AIR_VOICE_QUESTION =
  'Which arrangement would make the greeting sound appear out of the air?';
export const C1_P3_AIR_VOICE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'say-before-show',
    label: 'Put Say in front of Show - everyone hears the sound but cannot see the person',
    correct: true,
  },
  { id: 'show-before-say', label: 'Put Show before Say', correct: false },
];

export const C1_P3_PREDICTION_QUESTION =
  'If you say first and then show, what will your partner see first?';
export const C1_P3_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'empty-stage-voice',
    label: 'Empty stone platform - only sound, no stone monkey in sight',
    correct: true,
  },
  {
    id: 'monkey-waving',
    label: 'The stone monkey is already standing on the stone platform waving',
    correct: false,
  },
];
export const C1_P3_PREDICTION_RETRY_HINT =
  'Think about the agreement during rehearsal: There is no show yet, who can everyone see?';

export const C1_P3_SAY_TEXT = 'Hello, I just came here.';
export const C1_P3_RESOLVED_WORLD_CHANGE =
  'The monkeys can say "what happens now" to each card. They handed four sequence cards to Stone Monkey, preparing to put the rehearsal into the real story stage.';
export const C1_P3_STORY_AFTER =
  "The rehearsals made sense, but the real stage wasn't set yet. Next step: Put the four actions into the program.";
export const C1_P3_CONTINUE_LABEL = 'Put the order together';

/** 预置只读链（display only —— 本 Part 不运行，不算 Build）。 */
export const C1_P3_PRESET_CHAIN: Block[] = [
  { op: 'when_flag' },
  { op: 'hide' },
  { op: 'play_sound', n: 2 }, // 🔔 Chime
  { op: 'wait', n: 2 },
  { op: 'show' },
  { op: 'hop', n: 1 },
  { op: 'say', text: C1_P3_SAY_TEXT },
  { op: 'end' },
];

// ─────────────────────────────────────────────────────────────────────────────
// C1-P4 · 搭出完整出世链 — the chapter's Build 1 (scene-specs JTW-S1-C1-P4).
// The real build happens in the Blocks Studio (template blocks_jtw_c1_p4 +
// mission contract); this part screen carries the story, the per-block
// cause-effect evidence and the Show-first prediction.
// ─────────────────────────────────────────────────────────────────────────────

/** Teaching-script "让大家真正看见" IN FULL. */
export const C1_P4_STORY_BEFORE =
  'The rehearsal on the grass made sense, but the story stage next to the fairy stone was still quiet. The outline of the stone monkey was hidden behind the light, and the group of monkeys could only see a slightly shiny stone. Stone Monkey looked at the four sequence cards and said: "We just performed it with our bodies. Now we have to do it on the stage in this order." The child looked for the steps that really belong to this birth from the candidate movements. `Grow` will make the character grow bigger, and `Turn` will make the character turn around. They both work, but they cannot answer the question at hand; what is needed at the moment is prompts, appearances, first actions and greetings. Every time a piece is connected, there is an additional cause and effect on the stage that can be explained. Before running, the group of monkeys asked the children not to press start in a hurry: "Tell us, what will we see when the light shines? What will the stone monkey do after it appears?" The children gradually made predictions, and the story began. The fairy stone gave out a crisp reminder, and golden light lit up along the cracks; the stone monkey emerged from hiding, jumped steadily to the center of the stone platform, and then turned its face to its partner. Every step is seen, no movement happens in the air.';

/** 逐块因果证据：每一块让观众看见/听见什么（Chime=仙石动静，Show=主角出现，Hop=第一次行动，Say=第一次联系）。 */
export const C1_P4_BLOCK_MEANINGS: Array<{
  id: string;
  label: string;
  meaningId: string;
  meaningLabel: string;
}> = [
  {
    id: 'chime',
    label: '🔔 Chime',
    meaningId: 'stone-stir',
    meaningLabel: 'A reminder that there is movement in the fairy stone',
  },
  {
    id: 'show',
    label: '👀 Show',
    meaningId: 'hero-appears',
    meaningLabel: 'The protagonist appears and is seen by everyone',
  },
  { id: 'hop', label: '🦘 Hop 1', meaningId: 'first-action', meaningLabel: 'first action' },
  {
    id: 'say',
    label: '💬 Say',
    meaningId: 'first-contact',
    meaningLabel: 'Contacting a partner for the first time',
  },
];

export const C1_P4_PREDICTION_QUESTION =
  'Which piece must be placed before Hop and Say so partners can see who it is?';
export const C1_P4_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'show-first',
    label: '👀 Show - appear first, actions and greetings will be seen later',
    correct: true,
  },
  { id: 'chime-first', label: '🔔 Chime', correct: false },
  { id: 'end-first', label: '🛑 End', correct: false },
];
export const C1_P4_PREDICTION_RETRY_HINT =
  'It was agreed during the rehearsal that no one would see the partners who have not shown up yet, dance or say hello.';

export const C1_P4_RESOLVED_WORLD_CHANGE =
  'The fairy stone lights up; the stone monkey changes from being hidden to being visible and jumps steadily to the center of the stone platform; the group of monkeys walks from behind the tree to the edge of the grass.';
export const C1_P4_STORY_AFTER =
  'The group of monkeys saw clearly that the stone monkey came from the fairy stone. But there is another question: Will he jump over first or talk to us first?';
export const C1_P4_CONTINUE_LABEL = 'Decide on the first move';

// ─────────────────────────────────────────────────────────────────────────────
// C1-P5 · 两种真诚的问候 — Build 2, the greeting-order choice (scene-specs
// JTW-S1-C1-P5). Both orders are valid; the child compares both runs in the
// real Studio and keeps one, then explains the choice from the story here.
// ─────────────────────────────────────────────────────────────────────────────

/** Teaching-script "两种都真诚的问候" IN FULL. */
export const C1_P5_STORY_BEFORE =
  'Stone Monkey is already standing in front of everyone, but there is still one more choice that belongs to him when they meet for the first time. The child made two versions of "jump" and "say hello". In the first version, the stone monkey jumped briskly on the grass, and then said with a smile: "Hello, I have just met this world." The monkeys were first attracted by his vitality, and then understood his purpose. In the second version, the stone monkey stayed on the stone platform and said softly: "Hello, can I come over?" When the monkeys nodded, he jumped one step closer. The monkeys first felt respected, and then discovered that he also loved taking action. The two orders did not change the original work into two endings: Stone Monkey still came from the magic stone on Flower-Fruit Mountain and wanted to meet his new friends. The difference is which side of his character the audience sees first. Stone Monkey read both versions carefully and asked: "Which one feels more like the character you want to introduce? What do the actions and dialogue show?" Choose for a story reason, not just by clicking a button.';

/** 动机：石猴在选择什么？ */
export const C1_P5_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'energy-or-respect',
    label: 'Choose whether to let your partner feel alive first or to feel respected first',
    correct: true,
  },
  { id: 'pick-louder', label: 'Choose the livelier version', correct: false },
  { id: 'change-ending', label: 'Change the original work to another ending', correct: false },
];

/** “先___，所以伙伴先觉得他___”——按孩子实际保存的版本作答。 */
export const C1_P5_SENTENCE_HOP_FIRST: JtwEvidenceOption[] = [
  {
    id: 'hop-energy',
    label: 'Jump first, so your partner feels that he is full of energy first',
    correct: true,
  },
  {
    id: 'hop-polite',
    label: 'He dances first, so his partner thinks he is polite first.',
    correct: false,
  },
];
export const C1_P5_SENTENCE_SAY_FIRST: JtwEvidenceOption[] = [
  {
    id: 'say-respect',
    label: 'Say hello softly first, so your partner first feels that he respects everyone.',
    correct: true,
  },
  {
    id: 'say-energy',
    label: 'He said hello softly first, so his partner first thought he was moving quickly.',
    correct: false,
  },
];

/** 是否真的运行比较过两版。 */
export const C1_P5_COMPARE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'ran-both',
    label: 'I have run both sequences and left with the current version.',
    correct: true,
  },
  { id: 'ran-one', label: 'I only ran one version and chose it directly.', correct: false },
];

export const C1_P5_RESOLVED_HOP_FIRST =
  "The group of monkeys were first attracted by the stone monkey's vitality and gathered around him with smiles. Then they understood his purpose and approached him.";
export const C1_P5_RESOLVED_SAY_FIRST =
  'The monkeys first felt respected and nodded in return; then they discovered that he was also very action-oriented and approached him.';
export const C1_P5_STORY_AFTER =
  'Just as everyone was about to introduce each other, the stage suddenly played an out-of-sequence version with the sound appearing first and the movements invisible.';
export const C1_P5_CONTINUE_LABEL = "Find out what's weird";

// ─────────────────────────────────────────────────────────────────────────────
// C1-P6 · 声音怎么从空中来了 — Twist & Debug, the stable order bug (scene-specs
// JTW-S1-C1-P6). The bug SHIPS in the starter (Say → Hop → Show): every block
// runs, only the order breaks cause and effect. The child states the
// expectation, runs the bug for real, marks the FIRST deviation on the trace,
// then moves ONLY the Show/Hop/Say target blocks in the real Studio and reruns.
// ─────────────────────────────────────────────────────────────────────────────

/** Teaching-script "声音怎么从空中来了" IN FULL. */
export const C1_P6_STORY_BEFORE =
  'The stage restarted, and everyone heard "Hello" first, but the stone stage was empty. Then, the grass blades shook, as if some invisible character was jumping over; until finally, the stone monkey suddenly appeared. The monkeys were startled and looked around in confusion: "Who was talking just now? Who was jumping?" The stone monkey also realized that this was not the birth story he wanted to tell. Each action can be performed, but the sequence separates cause and effect. Instead of tearing down all the blocks and starting over, he asked the children to describe their expectations first: "When should everyone see me?" The children ran again and found the first deviation along the trajectory - when `Say\' happened, `Show\' had not yet happened. The child only moves the target brick, allowing the character to appear first, and then arranges the actions and dialogue. When running again, the monkeys first saw the stone monkey, then saw him jumping, and finally heard the greeting clearly. The nervousness just now turned into realization: it was not the mountain breeze talking, nor the invisible shadow dancing, but the new partner introducing himself in a clear order.';

export const C1_P6_SAY_TEXT = C1_P3_SAY_TEXT;

/** 预期（五段解释第 1 段）：大家应该什么时候看见我？ */
export const C1_P6_EXPECT_QUESTION =
  'Let’s start with expectations: when should everyone see the Stone Monkey?';
export const C1_P6_EXPECT_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'expect-show-first',
    label:
      'Before actions and greetings - see the stone monkey first, jump and say hello before anyone understands',
    correct: true,
  },
  {
    id: 'expect-any-time',
    label: "It doesn't matter any time, it doesn't matter if the sound comes first anyway.",
    correct: false,
  },
];

/** 实际（五段解释第 2 段）：运行 bug 之后，实际先发生了什么？ */
export const C1_P6_ACTUAL_QUESTION = 'After running it, what actually happens first?';
export const C1_P6_ACTUAL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'actual-voice-from-air',
    label:
      'I heard "Hello" first, but the stone platform was empty - the sound seemed to come from the air',
    correct: true,
  },
  {
    id: 'actual-show-first',
    label: 'Stone Monkey appeared first, everyone watched him jump and said hello',
    correct: false,
  },
];

/** 第一次偏离（五段解释第 3 段 = 本 Part 预测）：沿轨迹点选。 */
export const C1_P6_DEVIATION_QUESTION =
  'Where is the first action that the audience cannot understand? Click on the track:';
export const C1_P6_DEVIATION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'trace-say', label: '💬 Say——The voice rang, but no one showed up yet', correct: true },
  { id: 'trace-hop', label: '🦘 Hop——the moment when the blades of grass shake', correct: false },
  { id: 'trace-show', label: '👀 Show——The Stone Monkey appears last', correct: false },
];
export const C1_P6_DEVIATION_RETRY_HINT =
  "Follow the trajectory from left to right to find the earliest one: when Say sounds, Show has not happened yet - which part is the first one that you can't understand?";

/** 修改（五段解释第 4 段）：只移动目标块，不推倒重搭、不改声音。 */
export const C1_P6_FIX_QUESTION = 'What changes did you make in the workspace?';
export const C1_P6_FIX_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'move-show-front',
    label: 'Just move Show before Hop and Say - let the Stone Monkey show up first',
    correct: true,
  },
  { id: 'rebuild-all', label: 'Delete the entire chain and build it again', correct: false },
  {
    id: 'change-sound',
    label: 'Change the sound and the problem will no longer be heard.',
    correct: false,
  },
];

/** 重跑结果（五段解释第 5 段）。 */
export const C1_P6_RERUN_QUESTION = 'What sequence did the audience see after the rerun?';
export const C1_P6_RERUN_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'rerun-see-act-hear',
    label:
      'The group of monkeys first saw the stone monkey, then saw him jumping, and finally heard the greeting clearly',
    correct: true,
  },
  {
    id: 'rerun-still-air-voice',
    label: 'I heard the sound first. The stone platform was empty.',
    correct: false,
  },
];

export const C1_P6_RESOLVED_WORLD_CHANGE =
  'After the restoration, a group of monkeys fully emerged from behind the tree.';
export const C1_P6_STORY_AFTER =
  'It replied: "Hello! This time we understand every step." It invited Stone Monkey to design a complete appearance that looked more like itself.';
export const C1_P6_CONTINUE_LABEL = 'do my version';

/** 故意 bug 链（scene-specs stone-monkey/arrival-debug）——与后端 starter 完全一致。 */
export const C1_P6_BUG_CHAIN: Block[] = [
  { op: 'when_flag' },
  { op: 'hide' },
  { op: 'play_sound', n: 2 }, // 🔔 Chime
  { op: 'say', text: C1_P6_SAY_TEXT },
  { op: 'hop', n: 1 },
  { op: 'show' },
  { op: 'end' },
];

/** 只读 bug 复现预览（真实 Runner 运行；不算孩子的 Build）。 */
export const C1_P6_BUG_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C1-P6 bug preview',
  pages: [
    {
      id: 'jtw-s1-c1-p6-bug-page',
      background: 'jtw-s1-c1-flower-fruit-stone',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          asset: JTW_STONE_MONKEY_ASSET,
          start: { gx: 8, gy: 9, size: 3, rot: 0 },
          scripts: [
            {
              id: 'stone-monkey-arrival-debug-preview',
              blocks: C1_P6_BUG_CHAIN,
            },
          ],
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// C1-P7 · 我的石猴亮相 — the Personal Ship (scene-specs JTW-S1-C1-P7). The
// child designs their own arrival in the real Studio (template
// blocks_jtw_c1_p7): the frame is fixed, the sound, two visible actions,
// optional wait and preset greeting are theirs. The part page verifies the
// SAVED project + run marker, records the real design + saved version, and
// collects the choice-reason / save-reopen / peer-retell evidence.
// ─────────────────────────────────────────────────────────────────────────────

/** Teaching-script "把第一次亮相变成自己的作品" IN FULL. */
export const C1_P7_STORY_BEFORE =
  'The group of monkeys formed a wide semicircle, leaving the center of the stone platform for their new companions. Stone Monkey had learned to keep the story clear, and now he wanted to bring a bit of his own character to the appearance. The child can be asked to make a brisk movement first, and then stop to look at the partner; the child can also be asked to say a short greeting first, and then use the second movement to express curiosity. Waiting is not to delay time, but to allow the audience to clearly see the rhythm between the two actions; the dialogue is not a copied slogan, but a sentence written by a child for the stone monkey who "just came to the world and wanted to make friends." After the child completes the version, predict it from the beginning, and then ask the partner to only look at the stage and not the building blocks. If the companion can tell the main sequence of "immortal stone reminder, appearance of stone monkey, two actions, greetings, and end", the work will tell the story clearly. After saving and closing the work, and then reopening it, the stone monkey still completes its appearance in the same order. Shi Hou was not happy about getting the ribbon, but that his first story was not lost, and his partner really understood what he wanted to express.';

/** 动机：石猴这次想要什么？ */
export const C1_P7_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'express-clearly',
    label:
      'Want to express your curiosity, friendliness or energy clearly so that your partner can truly understand',
    correct: true,
  },
  {
    id: 'most-flashy',
    label: 'I want to compare who has the most moves and is the most lively',
    correct: false,
  },
  {
    id: 'finish-fast',
    label: 'I want to end the meeting quickly and go pick ripe fruits',
    correct: false,
  },
];

/** 选择理由：两个动作为什么这样选？ */
export const C1_P7_REASON_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'reason-personality',
    label: 'Because these two actions can help my partners see the character I want to express.',
    correct: true,
  },
  { id: 'reason-random', label: 'No matter what you order, both are the same.', correct: false },
  {
    id: 'reason-fastest',
    label: 'Because this way you can complete the task as quickly as possible',
    correct: false,
  },
];

/** 保存/关闭/重开检查。 */
export const C1_P7_REOPEN_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'reopen-same',
    label:
      'I saved and closed the work, and when I reopened it, the building blocks were the same, and the appearance was still the same when I re-ran it.',
    correct: true,
  },
  {
    id: 'reopen-skipped',
    label: "I didn't close it and reopen it. I came here directly after finishing the ride.",
    correct: false,
  },
];
export const C1_P7_REOPEN_RETRY_HINT =
  'Go back to the workspace and save, close the work, reopen it, and run it again - the first time the work is not lost, it is truly completed.';

/** 同伴复述（本 Part 预测）：同伴只看舞台，应该复述出什么顺序？ */
export const C1_P7_RETELL_QUESTION =
  'The companion only looks at the stage, not the building blocks. What main sequence should they retell?';
export const C1_P7_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'retell-full-order',
    label: 'Fairy Stone Tips → Stone Monkey Appears → Two Actions → Greeting → End',
    correct: true,
  },
  {
    id: 'retell-say-first',
    label: 'First I heard the greeting, then saw the stone monkey appear',
    correct: false,
  },
  {
    id: 'retell-no-actions',
    label: 'Stone Monkey stood on the stage and only said one sentence',
    correct: false,
  },
];
export const C1_P7_RETELL_RETRY_HINT =
  'Ask your partner to look at the stage again: What comes first? How many actions did the stone monkey make after it appeared? Greetings at what time?';

export const C1_P7_RESOLVED_WORLD_CHANGE =
  'The stone monkey made his own appearance, and the group of monkeys responded enthusiastically and invited him to explore Flower-Fruit Mountain together.';
export const C1_P7_STORY_AFTER =
  'There was a continuous roar next to the clear spring, and the moist wind blew from the valley.';
export const C1_P7_CONTINUE_LABEL = 'Follow the sound of water';

// ─────────────────────────────────────────────────────────────────────────────
// C1-P8 · 新伙伴听见了水声 — Run 后 Retell 与章节聚合 (scene-specs
// JTW-S1-C1-P8). The child orders the five cause-effect cards, RUNS the SAVED
// P7 work from Start to End on this page (no new answer project), retells the
// chapter with 因为—所以—结果—后来 — and the C1 出世印 lights ONLY from the
// SERVER-side chapter aggregation (P1–P8 + Read/Why/Code/Run/Debug/Retell +
// the P7 saved version id), never from frontend state.
// ─────────────────────────────────────────────────────────────────────────────

/** Teaching-script "新伙伴听见了水声" IN FULL. */
export const C1_P8_STORY_BEFORE =
  "The stone monkey and the group of monkeys slowly walked toward the mountain along the clear spring. The sun shines through the leaves, leaving swaying bright spots on the ground; the closer you get to the valley, the wetter the stones become, and the more tiny water droplets there are in the air. Everyone looked back to the top of the mountain and could still see the fairy stones shining quietly in the morning light. In just a short period of time, they rearranged what happened just now into five cause and effect cards: because the fairy stone made a noise, everyone stopped and observed; because the stone monkey wanted to reassure his partners, so he let everyone see him first; the program ran in sequence, and the monkeys understood his movements and greetings; later, his partners invited him to explore Flower-Fruit Mountain. Shihou listened to the child's story and finally realized that his first story was not a few separate actions, but a series of interconnected causes and results. The roar ahead was getting louder and louder. After turning around the woods, a white water curtain fell from a high place, and the water mist shone in the sun. The group of monkeys stopped outside the wet stone and did not rush in. The stone monkey also first observed the water flow, the footing and the looming bright spots behind the curtain. The new partners have completed their first meeting; the next question is who is willing to see what is behind the water curtain.";

export const C1_P8_CLASSIC_CARD =
  'The original work is still only up to the first chapter: the fairy stone gave birth to the stone monkey, and he just met Flower-Fruit Mountain. Water Curtain Cave is just a clue to the next chapter - no one has passed through the water curtain yet.';

/** 原创对白（教学脚本 Part 8）。 */
export const C1_P8_DIALOGUE_MONKEYS =
  'We already know who you are. Would you like to find the sound of water with us?';
export const C1_P8_DIALOGUE_STONE_MONKEY =
  'willing. Look at the route first and then decide how to get there.';

/** 人物动机：石猴为什么同行、又为什么先观察？ */
export const C1_P8_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'accepted-then-observe',
    label:
      'Because his partner accepted him, they walked together; and because the sound of water kept making, he decided to observe the route first.',
    correct: true,
  },
  {
    id: 'rush-for-prize',
    label: 'I want to be the first to rush into the water curtain and grab the rewards inside.',
    correct: false,
  },
  {
    id: 'scared-go-back',
    label:
      'He was afraid of the sound of water and wanted to run back and hide in the fairy stone.',
    correct: false,
  },
];

/** 五张因果卡——本章的五个节点，按故事先后排列。 */
export const C1_P8_CAUSE_CARDS: JtwEvidenceOption[] = [
  { id: 'stone-stir', label: '🔔 Immortal Stone Movement', correct: true },
  { id: 'monkey-appears', label: '🐵 Stone monkey appears', correct: true },
  { id: 'partners-see', label: '👀 Partner sees', correct: true },
  { id: 'first-hello', label: '💬 Hello for the first time', correct: true },
  { id: 'hear-water', label: '🌊 Hear the sound of water', correct: true },
];
export const C1_P8_CAUSE_CARD_ORDER = [
  'stone-stir',
  'monkey-appears',
  'partners-see',
  'first-hello',
  'hear-water',
];

/** Retell：用"因为—所以—结果—后来"连接至少四个节点；只念积木名不通过。 */
export const C1_P8_RETELL_QUESTION =
  'Let’s bring this chapter back: Connect at least four nodes with “because-so-result-later”.';
export const C1_P8_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'linked-four-nodes',
    label:
      'Because the fairy stone made a noise, the stone monkey first let everyone see him. As a result, his friends understood his movements, greeted him, and accepted him. Later, everyone heard the sound of water.',
    correct: true,
  },
  {
    id: 'block-names-only',
    label: 'Chime, Show, Hop, Say, End - read the names of the building blocks in order',
    correct: false,
  },
  {
    id: 'two-nodes-only',
    label: 'The stone monkey appeared, and then everyone heard the sound of water',
    correct: false,
  },
];
export const C1_P8_RETELL_RETRY_HINT =
  'Just saying the name of the building block or even two things is not enough - use "because-so-result-later" to connect at least four nodes of the movement of the fairy stone, the appearance of the stone monkey, the sight of the partner, the first greeting, and the sound of the water.';

/** C1 出世印 — the server-aggregated chapter seal. */
export const C1_P8_SEAL_ID = 'jtw-s1-c1-birth-seal';
export const C1_P8_SEAL_TITLE = 'birth seal';
export const C1_P8_SEAL_LINE = "I can put the story's actions in order.";

export const C1_P8_RESOLVED_WORLD_CHANGE =
  'The perspective moves along the clear spring to the waterfall: the wet stones light up piece by piece, and tiny bright spots shine on the water curtain. No one automatically jumps to the next chapter.';
export const C1_P8_STORY_AFTER =
  'The group of monkeys stopped safely outside the waterfall. The stone monkey first observed the water flow and where to stand. The "first meeting" issue in this chapter has been completely resolved.';
export const C1_P8_CONTINUE_NOW_LABEL = 'Now go see the water curtain';
export const C1_P8_CONTINUE_LATER_LABEL = 'continue later';
export const C1_P8_LIGHT_SEAL_LABEL = 'Light up the birth seal';

// ─────────────────────────────────────────────────────────────────────────────
// C2-P1 · 水声把大家带到哪里 — chapter two's Read & Why entry (scene-specs
// JTW-S1-C2-P1). The C1 clear-spring viewpoint joins the SAME waterfall
// before-background; the child reads 故事卡A in full, collects the three
// environment clues (excluding the hidden cave mouth), completes the
// 因为/所以 sentence, watches the read-only chime preview (three visible
// water ripples — readable in mute), and answers the do-we-know-yet
// prediction. No blocks are edited in this part.
// ─────────────────────────────────────────────────────────────────────────────

/** Child-facing story text — teaching-script C2 故事卡A "沿着水声走" IN FULL, two screens. */
export const C2_P1_STORY_BEFORE: readonly [string, string] = [
  'The weather is getting hot, and a group of monkeys are looking up along the cool stream. The deeper we go into the valley, the louder the sound of water becomes, the wetter the stones become, and the fine mist of water still floats in the air.',
  'Turning around a big rock, a waterfall like a white curtain stood in front of me.',
];

export const C2_P1_CLASSIC_CARD =
  'The original work is still in the first chapter: Stone Monkey has just been born, has not yet received the name "Sun Wukong", and has no companions to learn from it. No one has seen the story behind the water curtain.';

/** 故事—程序桥（因果桥）：环境线索对应后续移动停点；水帘回应属于 when_bump。 */
export const C2_P1_STORY_BRIDGE =
  'These environmental clues will then become moving stops; the real response of the water curtain will not happen until the stone monkey actually touches it (On Bump).';

/** 人物动机：石猴为什么先观察（不是害怕，也不是抢奖励）。 */
export const C2_P1_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'observe-for-partners',
    label: 'He wanted his partners to see what was going on and find a route they could take',
    correct: true,
  },
  {
    id: 'afraid-of-water',
    label: 'He was afraid of the sound of water and did not dare to go any further',
    correct: false,
  },
  {
    id: 'grab-reward',
    label: 'He wanted to be the first to rush in and grab the rewards inside.',
    correct: false,
  },
];

/** 三条 Read 证据（水声变大、石头变湿、水雾变浓）——“看见洞口”必须被排除。 */
export const C2_P1_CLUE_OPTIONS: JtwEvidenceOption[] = [
  { id: 'water-louder', label: 'The sound of water becomes louder', correct: true },
  { id: 'stones-wet', label: 'stones get wet', correct: true },
  { id: 'mist-thicker', label: 'The mist becomes thicker', correct: true },
  { id: 'see-cave-mouth', label: 'see the hole', correct: false },
];
export const C2_P1_CLUE_REJECT_HINT =
  'The entrance to the cave is hidden behind a curtain of water, and no one can see it in the picture—it cannot be used as evidence.';

/** “因为___，所以石猴先___”句子的结尾选项。 */
export const C2_P1_SO_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'stop-observe-route',
    label: 'Stop outside the wet rocks to observe and help your friends find a feasible route.',
    correct: true,
  },
  { id: 'jump-in-now', label: 'Jump into the water curtain immediately', correct: false },
  {
    id: 'send-partners-first',
    label: 'Let your partner rush in first and give it a try',
    correct: false,
  },
];

export const C2_P1_PREDICTION_QUESTION =
  'Do you now know that there is a hole behind the water curtain?';
export const C2_P1_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'not-known-yet',
    label:
      'I don’t know yet—the water curtain is closed, and there is no hole exposed in the picture.',
    correct: true,
  },
  {
    id: 'already-known',
    label: 'Already know - the entrance to the cave is in the picture',
    correct: false,
  },
];
export const C2_P1_PREDICTION_RETRY_HINT =
  'Look at the picture again: with the water curtain closed, is the hole exposed? The answer can be found in the picture.';

export const C2_P1_RESOLVED_WORLD_CHANGE =
  "The three clues of water sound, wet stones, and water mist lit up one by one from near to far, and everyone's eyes finally stopped on the still closed water curtain.";
export const C2_P1_STORY_AFTER =
  'The partners did not rush forward. They discussed first: Who will explore the path?';
export const C2_P1_CONTINUE_LABEL = "Listen to everyone's agreement";

/** 从近到远点亮的三类线索（resolved_world_change 的顺序）。 */
export const C2_P1_CLUE_LIGHT_SEQUENCE: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'water-louder', label: 'Sound of water' },
  { id: 'stones-wet', label: 'wet stone' },
  { id: 'mist-thicker', label: 'water mist' },
];

/**
 * The read-only system preview chain (scene-specs C2-P1): exactly
 * when_flag → play_sound(Chime) → wait(2) → end. The stone monkey waits with
 * the troop at the LEFT of the same waterfall before-background; no blocks
 * are editable and nothing here counts as a kid Build.
 */
export const C2_P1_PREVIEW_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C2-P1 preview',
  pages: [
    {
      id: 'jtw-s1-c2-p1-page',
      background: 'jtw-s1-c1-flower-fruit-stone',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          asset: JTW_STONE_MONKEY_ASSET,
          start: { gx: 3, gy: 9, size: 3, rot: 0 },
          scripts: [
            {
              id: 'stone-monkey-water-sound',
              blocks: [
                { op: 'when_flag' },
                { op: 'play_sound', n: 2 }, // 🔔 Chime — the water's call made audible
                { op: 'wait', n: 2 },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// C2-P2 · 瀑布前的约定 — Why + off-screen planning (scene-specs JTW-S1-C2-P2).
// The child reads 故事卡B in full, picks the TWO motives that hold together
// (curious about the inside AND the promise to come back and share — 被夸奖 and
// 最快 are rejected), orders the four agreement cards 进去→看清→回来→分享,
// explains why "进去" alone never completes the agreement, and answers the
// what-if-he-never-returns prediction. No blocks are edited, no project is
// written and no chapter completes in this part.
// ─────────────────────────────────────────────────────────────────────────────

/** Child-facing story text — teaching-script C2 故事卡B "瀑布前的约定" IN FULL. */
export const C2_P2_STORY_BEFORE =
  "The monkeys wanted to know what was behind the water curtain, but they didn't know how to get in safely. The stone monkey looked carefully at the wet stone, the high platform and the entrance: \"I'll go check it out first. If it's safe inside, I'll come back and tell everyone.\" He didn't just want to be praised; he was curious and promised to find a way for his companions.";

/** 原创对白 — the two dialogue lines the motive evidence is drawn from. */
export const C2_P2_DIALOGUE: readonly [string, string] = [
  'Group of monkeys: "Is there a road behind the water curtain?"',
  'Stone Monkey: "I\'ll see it clearly first and then come back and tell you."',
];

export const C2_P2_CLASSIC_CARD =
  'The original work is still in the first chapter: A group of monkeys made an agreement in front of a waterfall that whoever can go in to see clearly and come out safely will be crowned king. At this moment, Stone Monkey does not have the name "Sun Wukong", and none of his companions have yet appeared.';

/** 因果桥：四格约定分别由去程、碰撞回应、回程 Debug 和 Retell 证据实现。 */
export const C2_P2_STORY_BRIDGE =
  'These four grids of agreement will later be turned into program evidence one by one: the movement on the outbound journey completes "going in", the response to the water curtain (On Bump) completes "seeing clearly", the Debug on the return journey completes "coming back", and the final speaking back completes "sharing".';

/** 两条同时成立的动机（好奇里面 + 回来分享）——“被夸奖”“最快”都被排除。 */
export const C2_P2_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'curious-see-inside',
    label: 'He wanted to see what was behind the clear water curtain ("I\'ll see clearly first")',
    correct: true,
  },
  {
    id: 'promise-return-share',
    label:
      'He promised to come back and tell everyone and find a safe way for his companions ("Come back and tell you")',
    correct: true,
  },
  { id: 'want-praise', label: 'He just wants to be praised by everyone', correct: false },
  { id: 'be-fastest', label: 'He wants to be the fastest one to rush in.', correct: false },
];
export const C2_P2_MOTIVE_REJECT_HINT =
  'Read the dialogue again: Stone Monkey said "see clearly first" and "come back and tell you" - "being praised" and "fastest" were not in his words.';

/** 四张约定卡（正确顺序：进去 → 看清 → 回来 → 分享）。 */
export const C2_P2_AGREEMENT_CARDS: JtwEvidenceOption[] = [
  { id: 'card-enter', label: 'go in', correct: true },
  { id: 'card-see-clear', label: 'see clearly', correct: true },
  { id: 'card-return', label: 'return', correct: true },
  { id: 'card-share', label: 'share', correct: true },
];
export const C2_P2_AGREEMENT_ORDER = ['card-enter', 'card-see-clear', 'card-return', 'card-share'];

/** 为什么“进去”不能直接等于完成约定。 */
export const C2_P2_ENTER_QUESTION =
  'Why is it that just "going in" doesn\'t count as completing the agreement?';
export const C2_P2_ENTER_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'enter-only-first-cell',
    label:
      '"Going in" is just the first step - you have to see clearly inside, come back, and share your findings with your partners, then the agreement is complete.',
    correct: true,
  },
  {
    id: 'enter-is-enough',
    label: 'Once you go in, it’s done, and the rest will happen on its own.',
    correct: false,
  },
  {
    id: 'enter-bravest',
    label: 'Because it’s the bravest to go in, and the other three spaces are not important.',
    correct: false,
  },
];

export const C2_P2_PREDICTION_QUESTION =
  "If the Stone Monkey doesn't come back after entering, can his companions follow him safely?";
export const C2_P2_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'cannot-follow-safely',
    label:
      'No - no one has come back to clarify the route and the conditions inside. My friends don’t know how to walk safely.',
    correct: true,
  },
  { id: 'can-just-jump', label: 'Yes - everyone just jumps in.', correct: false },
];
export const C2_P2_PREDICTION_RETRY_HINT =
  'Let’s look at the four-square agreement: without “come back” and “share”, the partner will have no route and can only guess randomly.';

export const C2_P2_RESOLVED_WORLD_CHANGE =
  'The four-frame agreement "Go in → See clearly → Come back → Share" is fixed on the side of the stage and becomes the evidence track for each subsequent step - after each step is completed, the corresponding square is lit.';
export const C2_P2_STORY_AFTER =
  'The stone monkey picked up a few leaves and placed them on the wet stone, and began to lay out the three sections of the wet stone path one by one.';
export const C2_P2_CONTINUE_LABEL = 'Let’s lay out the route first';

// ─────────────────────────────────────────────────────────────────────────────
// C2-P3 · 三段湿石路 — off-screen planning before Code (scene-specs
// JTW-S1-C2-P3). The stone monkey stands at 2/8; the round, pointed and long
// leaves mark the three stop points and the three route cards start unsorted.
// The child orders the cards (圆叶=右2 → 尖叶=上1 → 长叶=右2), places the three
// prediction footprints on the grid overlay, then compares 右2→上1→右2 with
// 右2→右2→上1 (上1 moved to the end) and points out the SECOND segment as the
// first deviation. Nothing runs and no project is written — the sorted cards
// never impersonate a real Blocks project; the target chain is shown
// read-only. Continue unlocks ONLY jtw-s1-c2-p4.
// ─────────────────────────────────────────────────────────────────────────────

/** Child-facing story text — teaching-script C2 Story Screen 3 (Part 3
 *  离屏规划：湿石路线) IN FULL, never compressed. */
export const C2_P3_STORY_BEFORE: readonly [string, string] = [
  'The floor grid is arranged to form the starting point, two wet stones, a raised platform and a water curtain entrance. The child uses three direction cards to plan right 2 → up 1 → right 2. At each step, he puts an end point sticker and explains why he turns next.',
  'Draw/arrange the complete route without looking at the blocks; your partner points out where it will stop if you put "Up 1" at the end.',
];

/** 因果桥：三片叶子各标一个停点，对应三段移动。 */
export const C2_P3_STORY_BRIDGE =
  'Round leaves = Move Right 2, pointed leaves = Move Up 1, long leaves = Move Right 2 - each leaf is marked with a stop point for movement. Once the route cards are placed in the right order, the subsequent program will know which section to go first.';

/** 人物动机：石猴要把每一段停点讲清楚，让伙伴能预测而不是乱跳。 */
export const C2_P3_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'explain-each-stop',
    label:
      'He needs to clearly explain the stopping points of each paragraph so that his partners can predict them first instead of jumping around randomly.',
    correct: true,
  },
  {
    id: 'jump-fast-alone',
    label: 'He just wants to dance fast, and it doesn’t matter whether his partner can keep up.',
    correct: false,
  },
  {
    id: 'rush-in-first',
    label: 'He wanted to rush into the water curtain first and then think about the route later.',
    correct: false,
  },
];

/** 三张路线卡（正确顺序：圆叶 → 尖叶 → 长叶 = 右2 → 上1 → 右2）。 */
export const C2_P3_ROUTE_CARDS: JtwEvidenceOption[] = [
  { id: 'card-round-leaf', label: '🍃 Round leaves - 2 from the right', correct: true },
  { id: 'card-point-leaf', label: '🌿 Pointed leaves - Part 1', correct: true },
  { id: 'card-long-leaf', label: '🍂 Long leaves - 2 from the right', correct: true },
];
export const C2_P3_ROUTE_CARD_ORDER = ['card-round-leaf', 'card-point-leaf', 'card-long-leaf'];

/** 起点与网格（C2 共享合同：石猴 gx=2 / gy=8；上 = gy-1）。 */
export const C2_P3_START = { gx: 2, gy: 8 } as const;
export const C2_P3_GRID_COLS = [2, 3, 4, 5, 6, 7] as const;
export const C2_P3_GRID_ROWS = [6, 7, 8, 9] as const;

/** 三个目标停点（按到达顺序）：第二块湿石 → 高台 → 水帘入口。 */
export const C2_P3_TARGET_STOPS: ReadonlyArray<{
  cell: string;
  leaf: string;
  label: string;
}> = [
  { cell: '4-8', leaf: '🍃 round leaves', label: 'second wet stone' },
  { cell: '4-7', leaf: '🌿 pointed leaves', label: 'high platform' },
  { cell: '6-7', leaf: '🍂 long leaves', label: 'water curtain entrance' },
];
export const C2_P3_TARGET_STOP_CELLS = C2_P3_TARGET_STOPS.map((stop) => stop.cell);

/** 石头/高台格（能落脚）；其余格是水面，脚印放上去就落水。C2 全章共用同一组。 */
export const C2_P3_STONE_CELLS = C2_STONE_CELLS;

export const C2_P3_FOOTPRINT_HINT =
  'Let’s look at the stopping points marked by the leaves: in the first section, the right 2 stops at the round leaf, the upper 1 jumps onto the high platform of the pointed leaf, and finally the right 2 stops at the entrance of the water curtain of the long leaf - place three footprints in the order of arrival.';

/**
 * 错误版（把上1放到最后）：第二段右2离开湿石路，冲到水帘入口下面的水面
 * （6-8）就停住了——它到不了水帘入口，两版终点因此不同。
 */
export const C2_P3_WRONG_VERSION_STOPS: ReadonlyArray<{ cell: string; label: string }> = [
  { cell: '4-8', label: 'second wet stone' },
  { cell: '6-8', label: 'Falling into the water (outside the wet stone road)' },
];

export const C2_P3_WRONG_STOP_QUESTION =
  'Put "upper 1" at the end, where will the right 2 of the second paragraph stop?';
export const C2_P3_WRONG_STOP_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'wrong-second-into-water',
    label:
      "I rushed out of the wet stone road and landed on the water below the entrance of the water curtain - I couldn't reach the high platform or the entrance.",
    correct: true,
  },
  { id: 'wrong-still-platform', label: 'Or stop firmly on the high platform', correct: false },
  {
    id: 'wrong-reach-entrance',
    label: 'Stop directly at the water curtain entrance, just like before',
    correct: false,
  },
];

export const C2_P3_DEVIATION_QUESTION =
  'Comparing the two versions, in which paragraph does the first deviation occur?';
export const C2_P3_DEVIATION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'deviation-second-segment',
    label:
      'The second paragraph - should go up 1 to jump to the high platform, but the wrong version continues to the right 2 and rush towards the water.',
    correct: true,
  },
  {
    id: 'deviation-first-segment',
    label: 'The first paragraph - the two versions are different from the first step',
    correct: false,
  },
  {
    id: 'deviation-third-segment',
    label: 'Third paragraph - only the last paragraph is different',
    correct: false,
  },
];
export const C2_P3_DEVIATION_RETRY_HINT =
  'Match each paragraph from the beginning: the first paragraph of both versions is 2 on the right and both stop at the round leaf - which paragraph is the first to be different?';

/** 只读目标链（display only —— 本 Part 不运行，排序卡不冒充真实 Blocks 项目）。 */
export const C2_P3_TARGET_CHAIN: Block[] = [
  { op: 'when_flag' },
  { op: 'move_right', n: 2 },
  { op: 'move_up', n: 1 },
  { op: 'move_right', n: 2 },
  { op: 'end' },
];

export const C2_P3_RESOLVED_WORLD_CHANGE =
  'Three prediction stops light up in sequence along the wet stone road: round leaves, pointed leaves, and long leaves. The water curtain was still closed, and no one really walked past.';
export const C2_P3_STORY_AFTER =
  'The route makes sense, but it hasn’t actually been run yet—the next step is to let the program take Stone Monkey for a real walk.';
export const C2_P3_CONTINUE_LABEL = 'Let the stone monkey really go';

// ─────────────────────────────────────────────────────────────────────────────
// C2-P4 · 刚好到达，不多也不少 — chapter two's main Build (scene-specs
// JTW-S1-C2-P4). The child turns the P3 prediction into the REAL five-block
// route in the Blocks Studio (template blocks_jtw_c2_p4): the starter ships
// only Start/End, the child selects and orders move_right(1) ×2 · move_up(1) ·
// move_right(1) ×2 — equivalent to the shared 右2→上1→右2 route but with the
// CHILD owning all five blocks and every stop observable. The part page
// verifies completion FROM THE SAVED BlocksProject + the studio run marker,
// records the real project diff + run trace, and collects the 少一格/刚好/
// 多一格 comparison evidence. Continue unlocks ONLY jtw-s1-c2-p5; the curtain
// never responds here (the bump chain is P5) and no chapter completes.
// ─────────────────────────────────────────────────────────────────────────────

/** Child-facing story text — teaching-script C2 Story Screen 4 (Part 4
 *  Build 1：搭出三段路线) IN FULL, never compressed. */
export const C2_P4_STORY_BEFORE: readonly [string, string, string] = [
  'The starter only pre-builds Start and End. The child selects from 6 candidate blocks and places them in Move Right 2 → Move Up 1 → Move Right 2, forming a 5-block main script; one wrong direction or order will end up on the wrong wet stone.',
  "The child's actual workload: select 3 blocks, arrange 3 blocks, predict 3 stopping points, run at least 1 time; not change a single number.",
  'Build successful: The running trajectory is consistent with the three endpoint stickers. The stone monkey reaches the water curtain accurately, but the water curtain is not opened yet.',
];

/** 因果桥：共享三段路线在这里拆成五块一步移动，由孩子主导（scene-specs 目标五块）。 */
export const C2_P4_STORY_BRIDGE =
  'The three-section shared route, Right 2 → Up 1 → Right 2, is divided into five pieces and moved in one step: Right 1, Right 1, Up 1, Right 1, Right 1 - the two routes are equivalent, but the five pieces are arranged by you personally, and the three stopping points of round leaves, pointed leaves and long leaves can still be observed. The fact that the footprints are consistent with the stopping point only proves "arrival"; the water curtain is still down, so it cannot be said that the cave has been discovered.';

/** 起点与目标（与 C2-P3 网格合同一致：石猴 2/8，入口 6-7）。 */
export const C2_P4_START = C2_P3_START;
export const C2_P4_ENTRANCE_CELL = '6-7';

/** 目标五块（孩子放的部分）+ 完整目标链。 */
export const C2_P4_TARGET_MOVES: Block[] = [
  { op: 'move_right', n: 1 },
  { op: 'move_right', n: 1 },
  { op: 'move_up', n: 1 },
  { op: 'move_right', n: 1 },
  { op: 'move_right', n: 1 },
];
export const C2_P4_TARGET_CHAIN: Block[] = [
  { op: 'when_flag' },
  ...C2_P4_TARGET_MOVES,
  { op: 'end' },
];

/** 五个可观察停点（每块一个脚印，按到达顺序）。 */
export const C2_P4_TARGET_TRACE = ['3-8', '4-8', '4-7', '5-7', '6-7'] as const;

/** The wet-stone route walker lives in `journeyWestC2Route.ts` (file-organization rule). */

/** 预测 A：最后少一个 Right，石猴会停在哪里？ */
export const C2_P4_FEWER_QUESTION =
  'If there is one missing Right at the end, where will the Stone Monkey stop?';
export const C2_P4_FEWER_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'fewer-stop-5-7',
    label:
      'Stopped at 5-7 - the edge of the high platform, one space away, the soles of your feet cannot touch the entrance to the water curtain.',
    correct: true,
  },
  {
    id: 'fewer-still-entrance',
    label: "You can still reach the entrance - it doesn't matter if you miss it by one space",
    correct: false,
  },
  { id: 'fewer-into-water', label: 'Will fall into the water', correct: false },
];
export const C2_P4_FEWER_RETRY_HINT =
  "Count along the footprints: Right 1, Right 1, Up 1, Right 1. Then the stone monkey is at 5-7 - one space away from the entrance 6-7. If you can't touch it, you won't have arrived.";

/** 预测 B：多一个 Right，石猴会越过哪里？ */
export const C2_P4_EXTRA_QUESTION = 'With one more Right, where will the Stone Monkey cross?';
export const C2_P4_EXTRA_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'extra-passes-entrance',
    label:
      'Cross the water curtain entrance grid at 6-7 and rush to 7-7 - you should stop when you hit it.',
    correct: true,
  },
  {
    id: 'extra-stops-entrance',
    label: 'Still stop at the entrance grid, the extra grid will disappear by itself',
    correct: false,
  },
  {
    id: 'extra-goes-back',
    label: 'Will automatically return to the high platform',
    correct: false,
  },
];
export const C2_P4_EXTRA_RETRY_HINT =
  'The program will not stop on its own: one more Right will move one more square, and the Stone Monkey will cross the entrance squares 6-7 - "just right" to reach it.';

/** 证据：到达 ≠ 发现洞穴（水帘仍落着，回应链还没接入）。 */
export const C2_P4_ARRIVAL_QUESTION =
  'The operation was successful. Can we now say "discovered Water Curtain Cave"?';
export const C2_P4_ARRIVAL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'arrival-only-reached',
    label:
      'No - the footprints only prove that the stone monkey has reached the entrance grid, the water curtain is still down, and there is no response yet',
    correct: true,
  },
  {
    id: 'arrival-cave-found',
    label: 'Yes - reaching the entrance is equivalent to discovering a cave.',
    correct: false,
  },
];
export const C2_P4_ARRIVAL_RETRY_HINT =
  'Look at the stage again: has the water curtain separated? Is the cave entrance visible? Arrival only answers "how to arrive"; the collision response has not happened yet.';

export const C2_P4_RESOLVED_WORLD_CHANGE =
  "Five footprints showed steadily along the wet stone path: 3-8, 4-8, 4-7, 5-7, 6-7, one step at a time. The soles of the stone monkey's feet just touched the entrance grid of the water curtain, no more and no less - but the response chain of the water curtain was not connected yet.";
export const C2_P4_STORY_AFTER =
  'The stone monkey arrived, but the water curtain did not part. Next clue: The "after encounter" response must be connected.';
export const C2_P4_CONTINUE_LABEL = 'Let the water curtain hear the collision';
