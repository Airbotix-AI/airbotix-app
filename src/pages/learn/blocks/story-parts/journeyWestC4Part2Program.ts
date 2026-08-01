// Journey to the West · C4-P2 "一个名字，两个开始".
// This Part observes an intentionally wrong Start chain and a separate, read-only
// On Tap example. It never exposes editing or saves a Blocks project: the child
// predicts, runs the real interpreter twice, and records the two event traces.

import type { BlocksProject } from '../blocksModel'
import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C4_P2_PART_ID = 'jtw-s1-c4-p2'
export const C4_P2_NEXT_PART_ID = 'jtw-s1-c4-p3'
export const C4_P2_CHARACTER_ID = 'sun-wukong'
export const C4_P2_FLAG_SCRIPT_ID = 'sun-wukong-wrong-start'
export const C4_P2_TAP_SCRIPT_ID = 'sun-wukong-tap-example'

export const C4_P2_STORY_SCREENS: readonly [string, string] = [
  '石猴原本没有人的姓名。师父为他取姓“孙”，又按门中排行给他法名“悟空”。这个名字不是换一张装饰贴纸：从这以后，伙伴和观众都能用同一个名字认识他；他过去仍是花果山的石猴，未来会以悟空的名字行动。',
  '悟空在师门学习了很长时间。课程只选一个小小的“本领展示”来练习两种开始：Go 时先完成得名故事，观众 Tap 他之后，他才展示动作。几块积木不等于完整修行，也不是一按就学会本领。',
]

export const C4_P2_STORY_SCREEN_IDS = ['name-links-time', 'learning-takes-time'] as const

export const C4_P2_CLASSIC_CARD =
  '原著第一至二回写猴王经过多年寻找，拜师得名并学习本领。本课只观察一次小展示，不把修行写成一按按钮就获得的奖励。'

export const C4_P2_STORY_BRIDGE =
  'Start 等 Go，On Tap 等观众点到角色。动作放在哪条链上，就决定它什么时候发生。'

export const C4_P2_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'name-only-until-tap', label: '名字会出现；不点悟空，本领应该保持安静', correct: true },
  { id: 'hop-before-name', label: '悟空应该先跳，再说名字', correct: false },
  { id: 'both-start-together', label: 'Go 会让 Start 和 On Tap 两条链一起开始', correct: false },
]

export const C4_P2_COMPARISON_OPTIONS: JtwEvidenceOption[] = [
  { id: 'different-events', label: 'Go 只启动 Start；点悟空只启动 On Tap', correct: true },
  { id: 'same-event', label: 'Go 和 Tap 其实是同一个开始', correct: false },
  { id: 'tap-runs-both', label: '点悟空会把两条链一起重跑', correct: false },
]

export const C4_P2_STARTER: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C4-P2 two starts',
  lessonId: C4_P2_PART_ID,
  pages: [
    {
      id: 'jtw-c4-p2-courtyard',
      background: 'jtw-s1-c3-page3-resolved-v01',
      characters: [
        {
          id: C4_P2_CHARACTER_ID,
          name: 'Sun Wukong',
          emoji: '🐵',
          asset:
            '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
          start: { gx: 7, gy: 8, size: 3, rot: 0 },
          scripts: [
            {
              id: C4_P2_FLAG_SCRIPT_ID,
              blocks: [
                { op: 'when_flag' },
                { op: 'show' },
                { op: 'say', text: '我是孙悟空。' },
                { op: 'hop', n: 1 },
                { op: 'end' },
              ],
            },
            {
              id: C4_P2_TAP_SCRIPT_ID,
              blocks: [{ op: 'when_tap' }, { op: 'turn_right', n: 2 }, { op: 'end' }],
            },
          ],
        },
      ],
    },
  ],
}

export const C4_P2_EXPECTED_FLAG_TRACE = ['show', 'say', 'hop', 'end'] as const
export const C4_P2_EXPECTED_TAP_TRACE = ['turn_right', 'end'] as const

export function c4p2TraceMatches(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every((op, index) => actual[index] === op)
}

export function c4p2PredictionCorrect(id: string | null): boolean {
  return C4_P2_PREDICTION_OPTIONS.some((option) => option.id === id && option.correct)
}

export function c4p2ComparisonCorrect(id: string | null): boolean {
  return C4_P2_COMPARISON_OPTIONS.some((option) => option.id === id && option.correct)
}
