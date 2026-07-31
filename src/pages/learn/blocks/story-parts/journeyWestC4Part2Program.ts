import type { BlocksProject } from '../blocksModel';
import { JTW_C3_MONKEY_KING_SPRITE, JTW_C3_PAGE3_RESOLVED_BACKGROUND } from '../jtwC3Stage';

export const C4_P2_STORY_BEFORE = [
  '石猴原本没有人的姓名。师父为他取姓“孙”，又按门中排行给他法名“悟空”。这个名字不是换一张装饰贴纸：从这以后，故事中的伙伴和观众都能用同一个名字认识他；他过去仍是花果山的石猴，未来会以悟空的名字行动。',
  '悟空在师门学习了很长时间。这里先观察一个小小的本领展示：Go应该只完成得名故事，观众点他以后，他才回应。几块积木不等于完整修行。',
] as const;

export const C4_P2_STORY_SCREEN_IDS = ['name-links-time', 'learning-takes-time'] as const;

export const C4_P2_PREDICTION_OPTIONS = [
  { id: 'wait-for-tap', label: '不会；他应该等观众点他', correct: true },
  { id: 'hop-on-go', label: '会；按Go就应该马上Hop', correct: false },
] as const;

export const C4_P2_START_TRACE = ['when_flag', 'show', 'say', 'hop', 'end'] as const;
export const C4_P2_TAP_TRACE = ['when_tap', 'turn_right', 'end'] as const;

export const C4_P2_PROJECT: BlocksProject = {
  version: 1,
  name: '一个名字，两个开始',
  lessonId: 'jtw-s1-c4-p2',
  pages: [
    {
      id: 'jtw-s1-c4-p2-page',
      background: 'jtw-master-gate',
      characters: [
        {
          id: 'sun-wukong',
          name: '孙悟空',
          emoji: '🐵',
          asset: JTW_C3_MONKEY_KING_SPRITE,
          start: { gx: 7, gy: 9, size: 3, rot: 0, visible: true },
          scripts: [
            {
              id: 'wrong-start',
              blocks: [
                { op: 'when_flag' },
                { op: 'show' },
                { op: 'say', text: '我是孙悟空' },
                { op: 'hop', n: 1 },
                { op: 'end' },
              ],
            },
            {
              id: 'tap-example',
              blocks: [{ op: 'when_tap' }, { op: 'turn_right', n: 2 }, { op: 'end' }],
            },
          ],
        },
      ],
    },
  ],
};

export const C4_P2_BACKGROUND = JTW_C3_PAGE3_RESOLVED_BACKGROUND;
export const C4_P2_RESOLVED_WORLD_CHANGE =
  '名字牌完整显示，两条真实运行轨迹分开出现；Start链里的抢跑Hop被圈出，但这一Part还不移动它。';
export const C4_P2_STORY_AFTER =
  '悟空发现“会做什么”和“什么时候做”是两个问题。下一步先用两个离屏入口圈讲清楚。';
export const C4_P2_CONTINUE_LABEL = '试试两个入口';

export function c4p2StoryRead(screenIds: readonly string[]): boolean {
  return C4_P2_STORY_SCREEN_IDS.every((id) => screenIds.includes(id));
}

export function c4p2PredictionCorrect(choice: string | null): boolean {
  return C4_P2_PREDICTION_OPTIONS.find((option) => option.id === choice)?.correct === true;
}

export function c4p2TraceMatches(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return actual.length === expected.length && expected.every((op, index) => actual[index] === op);
}
