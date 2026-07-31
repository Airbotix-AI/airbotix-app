import type { BlocksProject } from '../blocksModel';
import { JTW_C3_MONKEY_KING_SPRITE } from '../jtwC3Stage';
import { C4_P1_ROUTE_CARDS } from './journeyWestC4Part1Program';
import type { JtwEvidenceOption } from './journeyWestSeason1';

export const C4_P2_SCREEN_IDS = ['name-story', 'two-starts'] as const;

export const C4_P2_STORY_SCREENS = [
  '师父为石猴取名“孙悟空”。木牌上的名字把花果山来的石猴和准备学习的悟空连在一起。名字出现，是走进这一幕就发生的事。',
  '可是“什么时候展示本领”是另一个问题。小旗入口会在按 Go 时开始，指尖入口要等观众点悟空才开始。会做什么，和什么时候做，不能混在一条队伍里。',
] as const;

export const C4_P2_CLASSIC_CARD =
  '原著第一至二回写猴王经过多年寻找、拜师得名并学习本领。本课只观察“得名”和“展示”的先后条件，不把一次运行写成已经学成本领。';

export const C4_P2_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'name-only-before-tap',
    label: '名字会出现；如果不点悟空，本领应该保持安静',
    correct: true,
  },
  {
    id: 'both-start-together',
    label: '名字和本领都应该在 Go 后一起开始',
    correct: false,
  },
  {
    id: 'tap-renames-wukong',
    label: 'Go 什么也不做；Tap 才让名字出现',
    correct: false,
  },
];

export const C4_P2_COMPARE_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'flag-and-tap-differ',
    label: 'Go 走小旗链；点悟空才走指尖链',
    correct: true,
  },
  {
    id: 'both-mean-go',
    label: '两个入口其实都在等 Go',
    correct: false,
  },
];

export const C4_P2_PROJECT: BlocksProject = {
  version: 1,
  name: '一个名字，两个开始',
  pages: [
    {
      id: 'jtw-s1-c4-p2-page',
      background: 'jtw-c4-master-courtyard',
      characters: [
        {
          id: 'sun-wukong',
          name: '孙悟空',
          emoji: '🐒',
          asset: JTW_C3_MONKEY_KING_SPRITE,
          start: { gx: 5, gy: 8, size: 1, rot: 0 },
          scripts: [
            {
              id: 'sun-wukong-wrong-start',
              blocks: [
                { op: 'when_flag' },
                { op: 'show' },
                { op: 'say', text: '我是孙悟空' },
                { op: 'hop', n: 1 },
                { op: 'end' },
              ],
            },
            {
              id: 'sun-wukong-tap-example',
              blocks: [{ op: 'when_tap' }, { op: 'turn_right', n: 2 }, { op: 'end' }],
            },
          ],
        },
      ],
    },
  ],
};

export const C4_P2_BACKGROUND = C4_P1_ROUTE_CARDS[2].asset;
export const C4_P2_RESOLVED_WORLD_CHANGE =
  '“孙悟空”木牌完整亮起，两张轨迹卡并排出现；Go 里的抢跑 Hop 被圈出，但积木还没有被移动。';
export const C4_P2_STORY_AFTER =
  '悟空发现：会做什么，和什么时候做，是两个问题。下一步要用两个入口圈把它们讲清楚。';

export function c4p2ChoiceCorrect(
  options: readonly JtwEvidenceOption[],
  choice: string | null,
): boolean {
  return options.find((option) => option.id === choice)?.correct === true;
}

export function c4p2FlagTraceDone(trace: readonly string[]): boolean {
  return (
    trace.join('|') ===
    'when_flag|show|say|hop|end'
  );
}

export function c4p2TapTraceDone(trace: readonly string[]): boolean {
  return trace.join('|') === 'when_tap|turn_right|end';
}
