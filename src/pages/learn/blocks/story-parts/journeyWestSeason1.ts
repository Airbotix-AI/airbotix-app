// Journey to the West · Season 1 Story Part catalogue + the C1-P1 part content.
//
// Curriculum SOT: docs/product/curriculum/story-blocks/
//   journey-to-the-west-season-1-scene-specs.md (per-part contracts)
//   journey-to-the-west-season-1-teaching-script.md (child-facing story text)
// The part chain mirrors the backend story-parts catalogue exactly (50 parts,
// linear unlock, C1–C5 ×8 + C6 ×10). Only parts listed in PART_CONTENT are
// playable; later parts render as locked/coming until their build task lands.

import type { Block, BlocksProject } from '../blocksModel';

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
  C1: '石猴出世',
  C2: '水帘洞的约定',
  C3: '一叶木筏求师路',
  C4: '你的名字叫孙悟空',
  C5: '会变大小的金箍棒',
  C6: '天宫的快与慢',
};

const PART_TITLES: ReadonlyArray<readonly [code: string, title: string]> = [
  ['C1-P1', '清晨的花果山'],
  ['C1-P2', '石猴出世运行示范'],
  ['C1-P3', '树叶后的顺序排练'],
  ['C1-P4', '搭出完整出世链'],
  ['C1-P5', '两种真诚的问候'],
  ['C1-P6', '声音怎么从空中来了'],
  ['C1-P7', '我的石猴亮相'],
  ['C1-P8', '新伙伴听见了水声'],
  ['C2-P1', '水声把大家带到哪里'],
  ['C2-P2', '瀑布前的约定'],
  ['C2-P3', '三段湿石路'],
  ['C2-P4', '刚好到达，不多也不少'],
  ['C2-P5', '水帘分开以后'],
  ['C2-P6', '回去的第一处偏离'],
  ['C2-P7', '把发现变成大家的路'],
  ['C2-P8', '守约成为美猴王'],
  ['C3-P1', '快乐的家，也装不下所有问题'],
  ['C3-P2', '把出发和到达排成一条路'],
  ['C3-P3', '页面出口不是门牌装饰'],
  ['C3-P4', '让海中央既有故事又有出口'],
  ['C3-P5', '星夜和晨雾都需要观察'],
  ['C3-P6', '木筏跳了位置'],
  ['C3-P7', '我的三页求师路'],
  ['C3-P8', '到达不是学会，而是准备开始'],
  ['C4-P1', '山门前，把来路讲清楚'],
  ['C4-P2', '一个名字，两个开始'],
  ['C4-P3', '两个入口圈'],
  ['C4-P4', '名字先站稳，本领再回应'],
  ['C4-P5', '本领不是为了抢先'],
  ['C4-P6', '先找第一次偏离'],
  ['C4-P7', '让同伴真正认识悟空'],
  ['C4-P8', '名字跟着他回家'],
  ['C5-P1', '海底柱影为什么出现'],
  ['C5-P2', '最后一块会留下什么大小'],
  ['C5-P3', '身体记住三个状态'],
  ['C5-P4', '搭出完整大小试验'],
  ['C5-P5', '最大不等于最合适'],
  ['C5-P6', 'Reset站错了结尾'],
  ['C5-P7', '我的如意大小故事'],
  ['C5-P8', '带走宝物，也讲清结果'],
  ['C6-P1', '六枚印走到天宫'],
  ['C6-P2', '感受与选择不是一件事'],
  ['C6-P3', '六件事不能同时发生'],
  ['C6-P4', '第一页把身份冲突讲清楚'],
  ['C6-P5', '第二页让行动与回应分开'],
  ['C6-P6', '我的前传节奏'],
  ['C6-P7', '到了五行山却没有结束'],
  ['C6-P8', '我的三页美猴王前传'],
  ['C6-P9', '六枚印与四个因为'],
  ['C6-P10', '第一程完整结束'],
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
  '天还没有完全亮，大海先把一层淡蓝色的光推到岸边。浪花拍着黑亮的礁石，发出“哗——哗——”的声音。山脚的桃树挂着露珠，山腰的藤蔓绕过石缝，清泉从高处一路唱到谷底。小鸟醒了，鹿抬起头，树上的群猴也开始寻找熟透的果子。只有山顶那块高大的仙石，仍像昨天、前天和许多个清晨一样安静。它没有门，也没有窗，却一直迎着风、雨、日光和月色。',
  '今天，一只小猴刚要从树枝跳过，忽然指着山顶：“你们看，石缝里有光！”群猴停下动作。那道光很细，像一根暖金色的线；风吹过时，石头里面还传来轻轻的“咚”。大家没有靠得太近，只躲在叶子后认真看。这里还没有谁叫孙悟空，也没有取经队伍。故事先从这座山、这块石头，以及一个还没露面的新伙伴开始。',
];

export const C1_P1_CLASSIC_CARD =
  '原著第一回里，花果山的仙石先孕育出石猴。此时还没有“孙悟空”这个名字，也没有取经的伙伴。';

/** 环境证据：至少选 3 项（全部 5 项都是画面里真实存在的）。 */
export const C1_P1_ENVIRONMENT_OPTIONS: JtwEvidenceOption[] = [
  { id: 'sea', label: '大海', correct: true },
  { id: 'fruit-trees', label: '果树', correct: true },
  { id: 'spring', label: '清泉', correct: true },
  { id: 'immortal-stone', label: '仙石', correct: true },
  { id: 'warm-light', label: '暖光', correct: true },
];
export const C1_P1_ENVIRONMENT_MIN = 3;

/** 动静证据：群猴停下来观察的两条原因（恰好两条正确）。 */
export const C1_P1_REASON_OPTIONS: JtwEvidenceOption[] = [
  { id: 'crack-light', label: '石缝里发出光', correct: true },
  { id: 'stone-sound', label: '石头里传来“咚”的声音', correct: true },
  { id: 'pick-fruit', label: '想先去摘熟透的果子', correct: false },
  { id: 'sky-bright', label: '天马上就要全亮了', correct: false },
];

/** “因为……，所以群猴……”句子的结尾选项。 */
export const C1_P1_SO_OPTIONS: JtwEvidenceOption[] = [
  { id: 'stop-watch', label: '停下来，躲在叶子后认真观察', correct: true },
  { id: 'run-away', label: '马上跑开了', correct: false },
  { id: 'touch-stone', label: '冲上去摸仙石', correct: false },
];

export const C1_P1_PREDICTION_QUESTION = '声音响过以后，石猴已经出现了吗？';
export const C1_P1_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'not-yet-appeared', label: '还没有——石台上没有石猴，他还藏在石头里', correct: true },
  { id: 'already-appeared', label: '已经出现了，就站在石台上', correct: false },
];
export const C1_P1_PREDICTION_RETRY_HINT = '再看看画面：石台上有石猴吗？答案要从画面里找。';

export const C1_P1_RESOLVED_WORLD_CHANGE =
  '晨光移到仙石上，裂缝亮得更清楚；一片叶子被震落，石头里又响了一声。';
export const C1_P1_STORY_AFTER = '群猴决定安静等一等。';
export const C1_P1_CONTINUE_LABEL = '听一听石头里面';

export const JTW_STONE_MONKEY_ASSET =
  '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png';
export const JTW_C1_BACKGROUND_ASSET =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c1/before-v01.webp';

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
  { id: 'stone-sound', label: '🔔 石头有动静（Chime）', correct: true },
  { id: 'monkey-appears', label: '👀 石猴出现（Show）', correct: true },
  { id: 'first-jump', label: '🦘 跳一下（Hop）', correct: true },
  { id: 'say-hello', label: '💬 开口问好（Say）', correct: true },
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
  { id: 'yes-anyway', label: 'Yes — they can see and hear him even while he is hidden', correct: false },
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
  '石猴站在仙石旁，悄悄把四件事在心里走了一遍：先听见石头的提示，再让大家看见自己，然后做一个动作，最后说出问候。风把树叶吹得沙沙响，像在给他打节拍。树后的群猴也试着想象：如果先听见“你好”，却看不到说话的人，他们会四处寻找；如果石猴还没出现就先跳，大家只会看见空空的石台；如果每一步按顺序发生，他们就能跟着线索明白“新伙伴来了”。一只年纪小的群猴捡起四片不同形状的叶子，把它们放在地上代表四个故事动作。另一只群猴故意交换两片叶子，大家立刻发现故事变得奇怪。石猴没有笑谁排错，也没有急着给答案。他说：“我们慢一点，一步一步演。看到哪张卡，就只做那一步。”于是，身体变成了程序，草地变成了舞台，每个人都能看见顺序怎样改变故事。';

/** 人物动机：石猴为什么愿意排练？ */
export const C1_P3_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  { id: 'clear-first-meeting', label: '他想让第一次见面清清楚楚，让伙伴安心', correct: true },
  { id: 'get-reward', label: '排练得好可以得到奖励', correct: false },
  { id: 'grab-fruit', label: '想第一个抢到熟果子', correct: false },
];

/** 四张故事卡——与 play_sound(Chime)/show/hop(1)/say 一一对应。 */
export const C1_P3_STORY_CARDS: JtwEvidenceOption[] = [
  { id: 'card-chime', label: '🔔 石头的提示（Chime）', correct: true },
  { id: 'card-show', label: '👀 让大家看见我（Show）', correct: true },
  { id: 'card-hop', label: '🦘 做一个动作（Hop）', correct: true },
  { id: 'card-say', label: '💬 说出问候（Say）', correct: true },
];
export const C1_P3_CARD_ORDER = ['card-chime', 'card-show', 'card-hop', 'card-say'];
/** Hop/Say swapped — the comparison rehearsal order. */
export const C1_P3_SWAPPED_ORDER = ['card-chime', 'card-show', 'card-say', 'card-hop'];

/** 交换 Hop/Say 之后的对比问题。 */
export const C1_P3_SWAP_QUESTION = '交换 Hop 和 Say 以后，伙伴还能看懂“新朋友来了”吗？';
export const C1_P3_SWAP_OPTIONS: JtwEvidenceOption[] = [
  { id: 'still-works-show-first', label: '能——因为石猴已经先出现了，先问好再跳也说得通', correct: true },
  { id: 'breaks-completely', label: '完全看不懂了，故事坏掉了', correct: false },
];

/** 证据：哪一版会让声音像从空中冒出来？ */
export const C1_P3_AIR_VOICE_QUESTION = '哪一种排法会让问候声像从空中冒出来？';
export const C1_P3_AIR_VOICE_OPTIONS: JtwEvidenceOption[] = [
  { id: 'say-before-show', label: '把 Say 放到 Show 前面——大家听见声音，却看不到人', correct: true },
  { id: 'show-before-say', label: '把 Show 放在 Say 前面', correct: false },
];

export const C1_P3_PREDICTION_QUESTION = '如果先 Say 再 Show，伙伴第一眼会看见什么？';
export const C1_P3_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'empty-stage-voice', label: '空空的石台——只有声音，还看不到石猴', correct: true },
  { id: 'monkey-waving', label: '石猴已经站在石台上挥手', correct: false },
];
export const C1_P3_PREDICTION_RETRY_HINT = '想想排练时的约定：还没有 Show，大家能看见谁？';

export const C1_P3_SAY_TEXT = '你好，我刚刚来到这里。';
export const C1_P3_RESOLVED_WORLD_CHANGE =
  '群猴能对着每一张卡说出“现在发生了什么”。他们把四张顺序卡交给石猴，准备把排练放进真正的故事舞台。';
export const C1_P3_STORY_AFTER = '排练说得通了，可真正的舞台还没搭好。下一步：把四个动作放进程序。';
export const C1_P3_CONTINUE_LABEL = '把顺序搭起来';

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
  '草地上的排练说得通，可仙石旁的故事舞台还是安静的。石猴的轮廓藏在光后，群猴只能看见一块微微发亮的石头。石猴望着四张顺序卡说：“刚才我们用身体演过了。现在要让舞台也照这个顺序做。”孩子从候选动作里寻找真正属于这次出世的步骤。`Grow`会让角色变大，`Turn`会让角色转身，它们都能运行，却不能回答眼前的问题；眼前需要的是提示、出现、第一次动作和问候。每接上一块，舞台就多了一段可以解释的因果。运行前，群猴请孩子先别急着按开始：“告诉我们，光亮之后会看见什么？石猴出现以后又会做什么？”孩子逐步预测，故事才开始。仙石发出清脆的提示，金光沿裂缝亮起；石猴从隐藏处出现，稳稳跳到石台中央，再把脸转向伙伴。每一步都被看见，没有动作躲在空中发生。';

/** 逐块因果证据：每一块让观众看见/听见什么（Chime=仙石动静，Show=主角出现，Hop=第一次行动，Say=第一次联系）。 */
export const C1_P4_BLOCK_MEANINGS: Array<{
  id: string;
  label: string;
  meaningId: string;
  meaningLabel: string;
}> = [
  { id: 'chime', label: '🔔 Chime', meaningId: 'stone-stir', meaningLabel: '仙石有动静的提示' },
  { id: 'show', label: '👀 Show', meaningId: 'hero-appears', meaningLabel: '主角出现，被大家看见' },
  { id: 'hop', label: '🦘 Hop 1', meaningId: 'first-action', meaningLabel: '第一次行动' },
  { id: 'say', label: '💬 Say', meaningId: 'first-contact', meaningLabel: '第一次和伙伴联系' },
];

export const C1_P4_PREDICTION_QUESTION =
  '哪一块必须放在 Hop 和 Say 之前，伙伴才能看见是谁？';
export const C1_P4_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'show-first', label: '👀 Show——先出现，动作和问候才被看见', correct: true },
  { id: 'chime-first', label: '🔔 Chime', correct: false },
  { id: 'end-first', label: '🛑 End', correct: false },
];
export const C1_P4_PREDICTION_RETRY_HINT = '排练时约定过：还没出现的伙伴，跳和问好都没人看见。';

export const C1_P4_RESOLVED_WORLD_CHANGE =
  '仙石亮起；石猴从隐藏变为可见，稳稳跳到石台中央；群猴从树后走到草地边缘。';
export const C1_P4_STORY_AFTER =
  '群猴看清石猴来自仙石。可还有一个问题：他会先跳过来，还是先和我们说话？';
export const C1_P4_CONTINUE_LABEL = '决定第一次动作';

// ─────────────────────────────────────────────────────────────────────────────
// C1-P5 · 两种真诚的问候 — Build 2, the greeting-order choice (scene-specs
// JTW-S1-C1-P5). Both orders are valid; the child compares both runs in the
// real Studio and keeps one, then explains the choice from the story here.
// ─────────────────────────────────────────────────────────────────────────────

/** Teaching-script "两种都真诚的问候" IN FULL. */
export const C1_P5_STORY_BEFORE =
  '石猴已经站在大家面前，可第一次见面还差一个属于他的选择。孩子把“跳一下”和“说你好”放成两个版本。第一个版本里，石猴先轻快地跳到草地上，再笑着说：“你好，我也是刚刚认识这个世界。”群猴先被他的活力吸引，随后听懂他的来意。第二个版本里，石猴先留在石台上，轻声说：“你们好，我可以过来吗？”等群猴点头，他才跳近一步。群猴先感到被尊重，随后发现他也很爱行动。两种顺序没有把原著改成两个结局：石猴都从仙石中来到花果山，也都想认识伙伴。不同的是，观众先看见他的哪一种性格。石猴认真看完两个版本，没有只选更热闹的那个。他问孩子：“哪一种更像你想介绍的我？你从动作和对白里看出了什么？”孩子必须用故事理由选择，而不是随便点一个按钮。';

/** 动机：石猴在选择什么？ */
export const C1_P5_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'energy-or-respect',
    label: '选择让伙伴先感到他的活力，还是先感到被尊重',
    correct: true,
  },
  { id: 'pick-louder', label: '选更热闹的那个版本', correct: false },
  { id: 'change-ending', label: '把原著改成另一个结局', correct: false },
];

/** “先___，所以伙伴先觉得他___”——按孩子实际保存的版本作答。 */
export const C1_P5_SENTENCE_HOP_FIRST: JtwEvidenceOption[] = [
  { id: 'hop-energy', label: '先跳一下，所以伙伴先觉得他充满活力', correct: true },
  { id: 'hop-polite', label: '先跳一下，所以伙伴先觉得他很有礼貌', correct: false },
];
export const C1_P5_SENTENCE_SAY_FIRST: JtwEvidenceOption[] = [
  { id: 'say-respect', label: '先轻声问好，所以伙伴先觉得他尊重大家', correct: true },
  { id: 'say-energy', label: '先轻声问好，所以伙伴先觉得他动作很快', correct: false },
];

/** 是否真的运行比较过两版。 */
export const C1_P5_COMPARE_OPTIONS: JtwEvidenceOption[] = [
  { id: 'ran-both', label: '我把两种顺序都运行过，再留下现在这一版', correct: true },
  { id: 'ran-one', label: '我只运行了一版就直接选了', correct: false },
];

export const C1_P5_RESOLVED_HOP_FIRST =
  '群猴先被石猴的活力吸引，笑着围拢过来；随后听懂他的来意，向他走近。';
export const C1_P5_RESOLVED_SAY_FIRST =
  '群猴先感到被尊重，点头回礼；随后发现他也很爱行动，向他走近。';
export const C1_P5_STORY_AFTER =
  '正当大家准备互相介绍，舞台忽然播放出一个声音先出现、动作看不见的乱序版本。';
export const C1_P5_CONTINUE_LABEL = '找出奇怪的地方';

// ─────────────────────────────────────────────────────────────────────────────
// C1-P6 · 声音怎么从空中来了 — Twist & Debug, the stable order bug (scene-specs
// JTW-S1-C1-P6). The bug SHIPS in the starter (Say → Hop → Show): every block
// runs, only the order breaks cause and effect. The child states the
// expectation, runs the bug for real, marks the FIRST deviation on the trace,
// then moves ONLY the Show/Hop/Say target blocks in the real Studio and reruns.
// ─────────────────────────────────────────────────────────────────────────────

/** Teaching-script "声音怎么从空中来了" IN FULL. */
export const C1_P6_STORY_BEFORE =
  '舞台重新开始，大家先听见一句“你好”，可石台上空空的。接着，草叶摇了一下，像有什么看不见的角色跳过；直到最后，石猴才突然出现。群猴吓了一小跳，又困惑地看向四周：“刚才是谁在说话？谁在跳？”石猴也发现，这不是他想讲的出世故事。每一块动作都能执行，但顺序把原因和结果拆散了。他没有把所有积木推倒重来，而是请孩子先描述预期：“大家应该什么时候看见我？”孩子再次运行，沿着轨迹找到第一个偏离——`Say`发生时，`Show`还没有发生。孩子只移动目标积木，让角色先出现，再安排动作和对白。重跑时，群猴先看见石猴，接着看见他跳，最后听清问候。刚才的紧张变成明白：不是山风在说话，也不是看不见的影子在跳，而是新伙伴在按清楚的顺序介绍自己。';

export const C1_P6_SAY_TEXT = C1_P3_SAY_TEXT;

/** 预期（五段解释第 1 段）：大家应该什么时候看见我？ */
export const C1_P6_EXPECT_QUESTION = '先说预期：大家应该什么时候看见石猴？';
export const C1_P6_EXPECT_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'expect-show-first',
    label: '在动作和问候之前——先看见石猴，跳和问好才有人看懂',
    correct: true,
  },
  { id: 'expect-any-time', label: '什么时候都行，反正声音先响也一样', correct: false },
];

/** 实际（五段解释第 2 段）：运行 bug 之后，实际先发生了什么？ */
export const C1_P6_ACTUAL_QUESTION = '运行之后，实际先发生了什么？';
export const C1_P6_ACTUAL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'actual-voice-from-air',
    label: '先听见「你好」，石台上却空空的——声音像从空中来',
    correct: true,
  },
  { id: 'actual-show-first', label: '石猴先出现，大家看着他跳和问好', correct: false },
];

/** 第一次偏离（五段解释第 3 段 = 本 Part 预测）：沿轨迹点选。 */
export const C1_P6_DEVIATION_QUESTION = '第一个观众看不懂的动作在哪里？在轨迹上点出来：';
export const C1_P6_DEVIATION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'trace-say', label: '💬 Say——声音响了，可谁都还没出现', correct: true },
  { id: 'trace-hop', label: '🦘 Hop——草叶摇动的那一下', correct: false },
  { id: 'trace-show', label: '👀 Show——石猴最后才出现', correct: false },
];
export const C1_P6_DEVIATION_RETRY_HINT =
  '沿轨迹从左往右找最早的那一个：Say 响起时，Show 还没有发生——最先看不懂的是哪一块？';

/** 修改（五段解释第 4 段）：只移动目标块，不推倒重搭、不改声音。 */
export const C1_P6_FIX_QUESTION = '你在工作区做了什么修改？';
export const C1_P6_FIX_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'move-show-front',
    label: '只把 Show 移到 Hop 和 Say 之前——让石猴先出现',
    correct: true,
  },
  { id: 'rebuild-all', label: '把整条链删掉，重新搭了一遍', correct: false },
  { id: 'change-sound', label: '把声音换掉，问题就听不见了', correct: false },
];

/** 重跑结果（五段解释第 5 段）。 */
export const C1_P6_RERUN_QUESTION = '重跑之后，观众看见了什么顺序？';
export const C1_P6_RERUN_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'rerun-see-act-hear',
    label: '群猴先看见石猴，再看见他跳，最后听清问候',
    correct: true,
  },
  { id: 'rerun-still-air-voice', label: '还是先听见声音，石台上空空的', correct: false },
];

export const C1_P6_RESOLVED_WORLD_CHANGE = '修复之后，一只群猴从树后完全走出来。';
export const C1_P6_STORY_AFTER =
  '它回答：“你好！这次我们每一步都看懂了。”它邀请石猴设计一段更像自己的完整亮相。';
export const C1_P6_CONTINUE_LABEL = '做我的版本';

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
  '群猴围成一个宽宽的半圆，把石台中央留给新伙伴。石猴已经学会让故事清楚发生，现在他想让这次亮相也带一点自己的性格。孩子可以让他先做一个轻快的动作，再停一停看看伙伴；也可以让他先说一句短问候，再用第二个动作表达好奇。等待不是为了拖时间，而是让观众看清两个动作之间的节奏；对白也不是抄来的口号，而是孩子为“刚来到世界、想认识朋友”的石猴写下的一句话。孩子完成版本后，先从头预测，再让同伴只看舞台、不看积木。若同伴能说出“仙石提示、石猴出现、两个动作、问候、结束”的主要顺序，作品才把故事讲清。保存后关闭作品，再重新打开，石猴仍按同样顺序完成亮相。石猴高兴的不是得到彩带，而是自己的第一次故事没有丢失，伙伴也真的看懂了他想表达什么。';

/** 动机：石猴这次想要什么？ */
export const C1_P7_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'express-clearly',
    label: '想清楚表达自己的好奇、友善或活力，让伙伴真正看懂',
    correct: true,
  },
  { id: 'most-flashy', label: '想比谁的动作最多最热闹', correct: false },
  { id: 'finish-fast', label: '想快点结束见面，去摘熟果子', correct: false },
];

/** 选择理由：两个动作为什么这样选？ */
export const C1_P7_REASON_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'reason-personality',
    label: '因为这两个动作能让伙伴看出我想表达的性格',
    correct: true,
  },
  { id: 'reason-random', label: '随便点的，哪两个都一样', correct: false },
  { id: 'reason-fastest', label: '因为这样最快就能做完任务', correct: false },
];

/** 保存/关闭/重开检查。 */
export const C1_P7_REOPEN_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'reopen-same',
    label: '我保存并关闭过作品，重新打开后积木一样，重跑还是同样的亮相',
    correct: true,
  },
  { id: 'reopen-skipped', label: '我没有关闭重开，搭完就直接过来了', correct: false },
];
export const C1_P7_REOPEN_RETRY_HINT =
  '回工作区保存，关闭作品再重新打开、重跑一遍——第一次作品不丢失才算真的完成。';

/** 同伴复述（本 Part 预测）：同伴只看舞台，应该复述出什么顺序？ */
export const C1_P7_RETELL_QUESTION = '同伴只看舞台、不看积木。他们应该复述出什么主要顺序？';
export const C1_P7_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'retell-full-order',
    label: '仙石提示 → 石猴出现 → 两个动作 → 问候 → 结束',
    correct: true,
  },
  { id: 'retell-say-first', label: '先听见问候，再看见石猴出现', correct: false },
  { id: 'retell-no-actions', label: '石猴一直站在台上，只说了一句话', correct: false },
];
export const C1_P7_RETELL_RETRY_HINT =
  '请同伴再只看一遍舞台：最先是什么？石猴出现以后做了几个动作？问候在什么时候？';

export const C1_P7_RESOLVED_WORLD_CHANGE =
  '石猴完成了属于自己的亮相，群猴热烈回应，并邀请他一起探索花果山。';
export const C1_P7_STORY_AFTER = '清泉旁传来持续的轰鸣，湿润的风从山谷吹来。';
export const C1_P7_CONTINUE_LABEL = '跟着水声走';

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
  '石猴和群猴沿着清泉慢慢往山里走。阳光穿过叶子，在地上落下摇晃的亮斑；越靠近山谷，石头越湿，空气里细小的水珠也越多。大家回头望向山顶，还能看见仙石在晨光里安静发亮。短短一段路上，他们把刚才发生的事重新排成五张因果卡：因为仙石发出动静，所以大家停下来观察；因为石猴想让伙伴安心，所以先让大家看见自己；程序按顺序运行，结果群猴看懂了他的动作和问候；后来，伙伴邀请他一起探索花果山。石猴听着孩子讲回，终于知道自己的第一段故事不是几个分开的动作，而是一串互相连接的原因和结果。前方的轰鸣越来越响。转过树林，一道白色水帘从高处落下，水雾在阳光里闪着光。群猴停在湿石外，没有冲进去。石猴也先观察水流、落脚处和帘子后若隐若现的亮点。新伙伴已经完成了第一次见面；接下来的问题，是谁愿意看清水帘后面究竟有什么。';

export const C1_P8_CLASSIC_CARD =
  '原著仍只到第一回：仙石孕育出石猴，他刚刚认识花果山。水帘洞只是下一章的线索——还没有人穿过那道水帘。';

/** 原创对白（教学脚本 Part 8）。 */
export const C1_P8_DIALOGUE_MONKEYS = '我们已经知道你是谁了。你愿意和我们一起找水声吗？';
export const C1_P8_DIALOGUE_STONE_MONKEY = '愿意。先看清路线，再决定怎样过去。';

/** 人物动机：石猴为什么同行、又为什么先观察？ */
export const C1_P8_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'accepted-then-observe',
    label: '因为伙伴接纳了他，所以一起同行；又因为水声一直响，所以决定先观察路线',
    correct: true,
  },
  { id: 'rush-for-prize', label: '想第一个冲进水帘，抢到里面的奖励', correct: false },
  { id: 'scared-go-back', label: '他害怕水声，想赶快跑回仙石里躲起来', correct: false },
];

/** 五张因果卡——本章的五个节点，按故事先后排列。 */
export const C1_P8_CAUSE_CARDS: JtwEvidenceOption[] = [
  { id: 'stone-stir', label: '🔔 仙石动静', correct: true },
  { id: 'monkey-appears', label: '🐵 石猴出现', correct: true },
  { id: 'partners-see', label: '👀 伙伴看见', correct: true },
  { id: 'first-hello', label: '💬 第一次问好', correct: true },
  { id: 'hear-water', label: '🌊 听见水声', correct: true },
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
  '把这一章讲回来：用"因为—所以—结果—后来"至少连起四个节点。';
export const C1_P8_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'linked-four-nodes',
    label:
      '因为仙石发出动静，所以石猴先让大家看见自己；结果伙伴看懂了他的动作和问好、接纳了他；后来大家一起听见了水声',
    correct: true,
  },
  {
    id: 'block-names-only',
    label: 'Chime、Show、Hop、Say、End——把积木的名字按顺序念一遍',
    correct: false,
  },
  { id: 'two-nodes-only', label: '石猴出现了，后来大家听见了水声', correct: false },
];
export const C1_P8_RETELL_RETRY_HINT =
  '只念积木名或只连两件事都不够——用"因为—所以—结果—后来"把仙石动静、石猴出现、伙伴看见、第一次问好、听见水声里至少四个节点连起来。';

/** C1 出世印 — the server-aggregated chapter seal. */
export const C1_P8_SEAL_ID = 'jtw-s1-c1-birth-seal';
export const C1_P8_SEAL_TITLE = '出世印';
export const C1_P8_SEAL_LINE = '我能把故事动作按先后排清楚。';

export const C1_P8_RESOLVED_WORLD_CHANGE =
  '视角沿清泉移向瀑布：湿石一块块亮起来，水帘上闪出细小的亮点。没有谁自动跳进下一章。';
export const C1_P8_STORY_AFTER =
  '群猴安全停在瀑布外，石猴先观察水流和落脚处。本章"第一次见面"的问题已经完整解决。';
export const C1_P8_CONTINUE_NOW_LABEL = '现在去看水帘';
export const C1_P8_CONTINUE_LATER_LABEL = '以后继续';
export const C1_P8_LIGHT_SEAL_LABEL = '点亮出世印';

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
  '天气热了，群猴沿着清凉的溪水往上找。越往山谷深处走，水声越响，石头越湿，空气里还飘着细细的水雾。',
  '转过一块大石，一道像白色帘子一样的瀑布挡在面前。',
];

export const C2_P1_CLASSIC_CARD =
  '原著还在第一回：石猴刚刚出世，尚未获得“孙悟空”这个名字，也没有取经的伙伴。水帘后面的故事，谁都还没有见过。';

/** 故事—程序桥（因果桥）：环境线索对应后续移动停点；水帘回应属于 when_bump。 */
export const C2_P1_STORY_BRIDGE =
  '这些环境线索，之后会变成一段一段移动的停点；而水帘真正的回应，要等石猴真的碰到它（On Bump）才会发生。';

/** 人物动机：石猴为什么先观察（不是害怕，也不是抢奖励）。 */
export const C2_P1_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'observe-for-partners',
    label: '他想让伙伴看清发生了什么，并找到一条可以走的路线',
    correct: true,
  },
  { id: 'afraid-of-water', label: '他害怕水声，不敢再往前走', correct: false },
  { id: 'grab-reward', label: '他想第一个冲进去，抢到里面的奖励', correct: false },
];

/** 三条 Read 证据（水声变大、石头变湿、水雾变浓）——“看见洞口”必须被排除。 */
export const C2_P1_CLUE_OPTIONS: JtwEvidenceOption[] = [
  { id: 'water-louder', label: '水声变大', correct: true },
  { id: 'stones-wet', label: '石头变湿', correct: true },
  { id: 'mist-thicker', label: '水雾变浓', correct: true },
  { id: 'see-cave-mouth', label: '看见洞口', correct: false },
];
export const C2_P1_CLUE_REJECT_HINT =
  '洞口藏在水帘后面，画面里谁也没有看见它——它不能当作证据。';

/** “因为___，所以石猴先___”句子的结尾选项。 */
export const C2_P1_SO_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'stop-observe-route',
    label: '停在湿石外观察，帮伙伴找一条可走的路线',
    correct: true,
  },
  { id: 'jump-in-now', label: '马上跳进水帘里', correct: false },
  { id: 'send-partners-first', label: '让伙伴先冲进去试试', correct: false },
];

export const C2_P1_PREDICTION_QUESTION = '现在已经知道水帘后面有洞吗？';
export const C2_P1_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'not-known-yet',
    label: '还不知道——水帘是合上的，画面里没有露出洞口',
    correct: true,
  },
  { id: 'already-known', label: '已经知道了——洞口就亮在画面里', correct: false },
];
export const C2_P1_PREDICTION_RETRY_HINT =
  '再看看画面：水帘合着，洞口露出来了吗？答案要从画面里找。';

export const C2_P1_RESOLVED_WORLD_CHANGE =
  '水声、湿石、水雾三类线索从近到远一一点亮，大家的视线最后停在那道还关着的水帘上。';
export const C2_P1_STORY_AFTER = '伙伴们没有急着往前冲，先讨论：谁去探路？';
export const C2_P1_CONTINUE_LABEL = '听一听大家的约定';

/** 从近到远点亮的三类线索（resolved_world_change 的顺序）。 */
export const C2_P1_CLUE_LIGHT_SEQUENCE: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'water-louder', label: '水声' },
  { id: 'stones-wet', label: '湿石' },
  { id: 'mist-thicker', label: '水雾' },
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
  '群猴想知道水帘后面有什么，却不知道怎样安全进去。石猴仔细看了看湿石、高台和入口：“我先去看清楚。如果里面安全，我会回来告诉大家。”他不是只为了被夸奖；他既好奇，也答应为伙伴找路。';

/** 原创对白 — the two dialogue lines the motive evidence is drawn from. */
export const C2_P2_DIALOGUE: readonly [string, string] = [
  '群猴：“水帘后面会不会有路？”',
  '石猴：“我先看清楚，再回来告诉你们。”',
];

export const C2_P2_CLASSIC_CARD =
  '原著还在第一回：群猴在瀑布前约定，谁能进去看清楚、再平安出来，就拜他为王。石猴此刻还没有“孙悟空”这个名字，取经的伙伴也都还没有出现。';

/** 因果桥：四格约定分别由去程、碰撞回应、回程 Debug 和 Retell 证据实现。 */
export const C2_P2_STORY_BRIDGE =
  '这四格约定，之后会一格一格变成程序证据：去程的移动完成“进去”，碰到水帘的回应（On Bump）完成“看清”，回程的 Debug 完成“回来”，最后的讲回完成“分享”。';

/** 两条同时成立的动机（好奇里面 + 回来分享）——“被夸奖”“最快”都被排除。 */
export const C2_P2_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'curious-see-inside',
    label: '他想看清水帘后面究竟有什么（“我先看清楚”）',
    correct: true,
  },
  {
    id: 'promise-return-share',
    label: '他答应回来告诉大家，为伙伴找一条安全的路（“再回来告诉你们”）',
    correct: true,
  },
  { id: 'want-praise', label: '他只想被大家夸奖', correct: false },
  { id: 'be-fastest', label: '他想当最快冲进去的那一个', correct: false },
];
export const C2_P2_MOTIVE_REJECT_HINT =
  '再读一遍对白：石猴说的是“先看清楚”和“回来告诉你们”——“被夸奖”和“最快”都不在他的话里。';

/** 四张约定卡（正确顺序：进去 → 看清 → 回来 → 分享）。 */
export const C2_P2_AGREEMENT_CARDS: JtwEvidenceOption[] = [
  { id: 'card-enter', label: '进去', correct: true },
  { id: 'card-see-clear', label: '看清', correct: true },
  { id: 'card-return', label: '回来', correct: true },
  { id: 'card-share', label: '分享', correct: true },
];
export const C2_P2_AGREEMENT_ORDER = ['card-enter', 'card-see-clear', 'card-return', 'card-share'];

/** 为什么“进去”不能直接等于完成约定。 */
export const C2_P2_ENTER_QUESTION = '为什么只做到“进去”，还不算完成约定？';
export const C2_P2_ENTER_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'enter-only-first-cell',
    label: '“进去”只是第一格——还要看清里面、回来、把发现分享给伙伴，约定才算完成',
    correct: true,
  },
  { id: 'enter-is-enough', label: '进去就算完成了，后面的事会自己发生', correct: false },
  { id: 'enter-bravest', label: '因为进去最勇敢，别的三格都不重要', correct: false },
];

export const C2_P2_PREDICTION_QUESTION = '如果石猴进去后不回来，伙伴能安全跟上吗？';
export const C2_P2_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'cannot-follow-safely',
    label: '不能——没有人回来说清路线和里面的情况，伙伴不知道怎么走才安全',
    correct: true,
  },
  { id: 'can-just-jump', label: '能——大家跟着跳进去就行了', correct: false },
];
export const C2_P2_PREDICTION_RETRY_HINT =
  '再看看四格约定：少了“回来”和“分享”，伙伴手里就没有路线，只能乱猜。';

export const C2_P2_RESOLVED_WORLD_CHANGE =
  '四格约定“进去→看清→回来→分享”固定在舞台侧边，变成后面每一步的证据轨——之后每完成一步，就点亮对应的一格。';
export const C2_P2_STORY_AFTER = '石猴捡起几片叶子放在湿石上，开始把三段湿石路一段一段摆清楚。';
export const C2_P2_CONTINUE_LABEL = '先把路线摆清楚';

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
  '地板网格摆出起点、两块湿石、高台和水帘入口。孩子使用三张方向卡规划右2 → 上1 → 右2，每走一段都放终点贴纸并说明下一步为什么转向。',
  '不看积木先画/排完整路线；同伴指出若把“上1”放到最后会停在哪里。',
];

/** 因果桥：三片叶子各标一个停点，对应三段移动。 */
export const C2_P3_STORY_BRIDGE =
  '圆叶=Move Right 2，尖叶=Move Up 1，长叶=Move Right 2——每片叶子都标着一段移动的停点。路线卡摆对顺序，之后的程序才知道先走哪一段。';

/** 人物动机：石猴要把每一段停点讲清楚，让伙伴能预测而不是乱跳。 */
export const C2_P3_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'explain-each-stop',
    label: '他要把每一段的停点讲清楚，让伙伴能先预测、而不是乱跳',
    correct: true,
  },
  { id: 'jump-fast-alone', label: '他只想自己跳得快，伙伴跟不跟得上没关系', correct: false },
  { id: 'rush-in-first', label: '他想先冲进水帘，路线回来再慢慢想', correct: false },
];

/** 三张路线卡（正确顺序：圆叶 → 尖叶 → 长叶 = 右2 → 上1 → 右2）。 */
export const C2_P3_ROUTE_CARDS: JtwEvidenceOption[] = [
  { id: 'card-round-leaf', label: '🍃 圆叶——右2', correct: true },
  { id: 'card-point-leaf', label: '🌿 尖叶——上1', correct: true },
  { id: 'card-long-leaf', label: '🍂 长叶——右2', correct: true },
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
  { cell: '4-8', leaf: '🍃 圆叶', label: '第二块湿石' },
  { cell: '4-7', leaf: '🌿 尖叶', label: '高台' },
  { cell: '6-7', leaf: '🍂 长叶', label: '水帘入口' },
];
export const C2_P3_TARGET_STOP_CELLS = C2_P3_TARGET_STOPS.map((stop) => stop.cell);

/** 石头/高台格（能落脚）；其余格是水面，脚印放上去就落水。 */
export const C2_P3_STONE_CELLS: ReadonlySet<string> = new Set([
  '2-8',
  '3-8',
  '4-8',
  '4-7',
  '5-7',
  '6-7',
]);

export const C2_P3_FOOTPRINT_HINT =
  '再看看叶子标出的停点：第一段右2停在圆叶，上1跳上尖叶的高台，最后右2停在长叶的水帘入口——按到达顺序放三个脚印。';

/**
 * 错误版（把上1放到最后）：第二段右2离开湿石路，冲到水帘入口下面的水面
 * （6-8）就停住了——它到不了水帘入口，两版终点因此不同。
 */
export const C2_P3_WRONG_VERSION_STOPS: ReadonlyArray<{ cell: string; label: string }> = [
  { cell: '4-8', label: '第二块湿石' },
  { cell: '6-8', label: '落进水面（湿石路外）' },
];

export const C2_P3_WRONG_STOP_QUESTION = '把“上1”放到最后，第二段右2会停在哪里？';
export const C2_P3_WRONG_STOP_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'wrong-second-into-water',
    label: '冲出湿石路，落在水帘入口下面的水面上——到不了高台，也到不了入口',
    correct: true,
  },
  { id: 'wrong-still-platform', label: '还是稳稳停在高台上', correct: false },
  { id: 'wrong-reach-entrance', label: '直接停在水帘入口，跟原来一样', correct: false },
];

export const C2_P3_DEVIATION_QUESTION = '两版比较，第一次偏离发生在第几段？';
export const C2_P3_DEVIATION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'deviation-second-segment',
    label: '第二段——应该上1跳上高台，错误版却继续右2冲向水面',
    correct: true,
  },
  { id: 'deviation-first-segment', label: '第一段——两版从第一步就不一样', correct: false },
  { id: 'deviation-third-segment', label: '第三段——只有最后一段不同', correct: false },
];
export const C2_P3_DEVIATION_RETRY_HINT =
  '从头一段一段对：两版的第一段都是右2、都停在圆叶——最早不一样的是哪一段？';

/** 只读目标链（display only —— 本 Part 不运行，排序卡不冒充真实 Blocks 项目）。 */
export const C2_P3_TARGET_CHAIN: Block[] = [
  { op: 'when_flag' },
  { op: 'move_right', n: 2 },
  { op: 'move_up', n: 1 },
  { op: 'move_right', n: 2 },
  { op: 'end' },
];

export const C2_P3_RESOLVED_WORLD_CHANGE =
  '三个预测停点沿着湿石路依次亮起：圆叶、尖叶、长叶各亮一下。水帘仍然合着，谁也没有真的走过去。';
export const C2_P3_STORY_AFTER = '路线说得通了，但还没有真实运行——下一步，让程序带石猴真的走一遍。';
export const C2_P3_CONTINUE_LABEL = '让石猴真的走';

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
  'starter只预建Start和End。孩子从6个候选块中选择并放入Move Right 2 → Move Up 1 → Move Right 2，形成5块主脚本；一个方向或顺序错误都会停在错误湿石上。',
  '孩子实际工作量：选择3块、排列3块、预测3个停点、至少运行1次；不是改单个数字。',
  'Build成功：运行轨迹与三张终点贴纸一致，石猴准确到达水帘，但水帘暂时没有打开。',
];

/** 因果桥：共享三段路线在这里拆成五块一步移动，由孩子主导（scene-specs 目标五块）。 */
export const C2_P4_STORY_BRIDGE =
  '三段共享路线 右2→上1→右2 在这里拆成五块一步移动：Right 1、Right 1、Up 1、Right 1、Right 1——两条路线等价，但五块都由你亲手排，圆叶、尖叶、长叶三个停点仍然可以观察。脚印和停点一致只证明“到达”；水帘仍落着，还不能说发现了洞穴。';

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

/**
 * Simulate the saved route from the 2/8 start: one stop cell per move block.
 * Only the four move ops walk the grid (up = gy−1, per the C2 grid contract);
 * anything else contributes no stop. This derives the REAL run trace from the
 * SAVED BlocksProject — never from frontend state.
 */
export function c2p4RouteTrace(moves: readonly Block[]): string[] {
  let { gx, gy } = C2_P4_START;
  const trace: string[] = [];
  for (const block of moves) {
    const n = block.n ?? 0;
    if (block.op === 'move_right') gx += n;
    else if (block.op === 'move_left') gx -= n;
    else if (block.op === 'move_up') gy -= n;
    else if (block.op === 'move_down') gy += n;
    else continue;
    trace.push(`${gx}-${gy}`);
  }
  return trace;
}

/** 预测 A：最后少一个 Right，石猴会停在哪里？ */
export const C2_P4_FEWER_QUESTION = '最后少一个 Right，石猴会停在哪里？';
export const C2_P4_FEWER_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'fewer-stop-5-7',
    label: '停在 5-7——高台的边上，还差一格，脚底碰不到水帘入口',
    correct: true,
  },
  { id: 'fewer-still-entrance', label: '还是能到入口——差一格没有关系', correct: false },
  { id: 'fewer-into-water', label: '会掉进水里', correct: false },
];
export const C2_P4_FEWER_RETRY_HINT =
  '沿着脚印数一数：右1、右1、上1、右1 之后石猴在 5-7——离入口 6-7 还差一格，碰不到就不算到达。';

/** 预测 B：多一个 Right，石猴会越过哪里？ */
export const C2_P4_EXTRA_QUESTION = '多一个 Right，石猴会越过哪里？';
export const C2_P4_EXTRA_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'extra-passes-entrance',
    label: '越过 6-7 的水帘入口格，冲到 7-7——刚好碰到就应该停下',
    correct: true,
  },
  { id: 'extra-stops-entrance', label: '还是停在入口格，多的一格自己消失', correct: false },
  { id: 'extra-goes-back', label: '会自动退回高台', correct: false },
];
export const C2_P4_EXTRA_RETRY_HINT =
  '程序不会自己停：多一个 Right 就多走一格，石猴会越过 6-7 的入口格——“刚好”才是到达。';

/** 证据：到达 ≠ 发现洞穴（水帘仍落着，回应链还没接入）。 */
export const C2_P4_ARRIVAL_QUESTION = '运行成功了。现在能说“发现水帘洞”了吗？';
export const C2_P4_ARRIVAL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'arrival-only-reached',
    label: '不能——脚印只证明石猴到达了入口格，水帘仍落着，还没有任何回应',
    correct: true,
  },
  { id: 'arrival-cave-found', label: '能——到了入口就等于发现了洞穴', correct: false },
];
export const C2_P4_ARRIVAL_RETRY_HINT =
  '再看看舞台：水帘分开了吗？洞口露出来了吗？到达只回答了“怎样到达”——“碰到以后”还没有发生。';

export const C2_P4_RESOLVED_WORLD_CHANGE =
  '五个脚印沿湿石路稳定显示：3-8、4-8、4-7、5-7、6-7，一步一个。石猴的脚底刚好碰到水帘入口格，不多也不少——可水帘的回应链还没有接入。';
export const C2_P4_STORY_AFTER =
  '石猴到达了，水帘却没有分开。下一条线索：必须连接“碰到以后”的回应。';
export const C2_P4_CONTINUE_LABEL = '让水帘听见碰撞';
