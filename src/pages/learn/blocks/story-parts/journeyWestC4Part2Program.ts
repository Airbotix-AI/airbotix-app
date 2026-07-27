import type { BlocksProject } from '../blocksModel'
import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C4_P2_PART_ID = 'jtw-s1-c4-p2'
export const C4_P2_NEXT_PART_ID = 'jtw-s1-c4-p3'
export const C4_P2_CHARACTER_ID = 'sun-wukong'

export const C4_P2_STORY_SCREENS = [
  '石猴原本没有人的姓名。师父为他取姓“孙”，又按门中排行给他法名“悟空”。这个名字不是换一张装饰贴纸：从这以后，伙伴和观众都能用同一个名字认识他；他过去仍是花果山的石猴，未来会以悟空的名字行动。',
  '悟空在师门学习了很长时间。课程只选一个小小的“本领展示”：Go 时先完成得名故事，观众 Tap 他之后，他才展示动作。几块积木不等于完整修行，也不代表一按按钮就学会本领。',
] as const
export const C4_P2_SCREEN_IDS = ['story-card-b', 'story-card-c'] as const

export const C4_P2_CLASSIC_CARD =
  '原著第一至二回写猴王经过多年寻找，拜师得名并学习本领。课程尊重师父角色，不把修行变成一按按钮就获得奖励。'
export const C4_P2_STORY_BRIDGE =
  'Start 承载“进入场景就发生的得名”；On Tap 承载“观众邀请后才发生的展示”。动作放在哪条链上，就决定它什么时候发生。'

export const C4_P2_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'name-only', label: '名字出现；不点悟空，本领应该保持安静', correct: true },
  { id: 'hop-by-itself', label: '不点悟空，他也应该自己展示 Hop', correct: false },
  { id: 'tap-renames', label: 'Go 没有作用，Tap 才给他名字', correct: false },
]
export const C4_P2_CORRECT_PREDICTION = 'name-only'

export const C4_P2_STARTER_PROJECT: BlocksProject = {
  version: 1,
  name: '一个名字，两个开始',
  pages: [{
    id: 'courtyard',
    background: 'jtw-s1-c4-master-courtyard',
    characters: [{
      id: C4_P2_CHARACTER_ID,
      name: '孙悟空',
      emoji: '🐵',
      start: { gx: 7, gy: 8, size: 3, rot: 0, visible: true },
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
          blocks: [
            { op: 'when_tap' },
            { op: 'turn_right', n: 2 },
            { op: 'end' },
          ],
        },
      ],
    }],
  }],
}

export const C4_P2_START_TRACE = ['show', 'say', 'hop', 'end']
export const C4_P2_TAP_TRACE = ['turn_right', 'end']

export const C4_P2_RESOLVED_WORLD_CHANGE =
  '名字牌完整显示，两条真实轨迹卡出现；Start 链里抢跑的 Hop 被圈出，但还没有移动。'
export const C4_P2_STORY_AFTER =
  '悟空知道了：“会做什么”和“什么时候做”是两个问题。下一步，先用两个入口圈把它们讲清楚。'
export const C4_P2_CONTINUE_LABEL = '试试两个入口'

export function c4p2StoryRead(screens: readonly string[]): boolean {
  return C4_P2_SCREEN_IDS.every((id) => screens.includes(id))
}

export function c4p2PredictionDone(prediction: string | null): boolean {
  return prediction === C4_P2_CORRECT_PREDICTION
}

export function c4p2TraceMatches(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every((op, index) => actual[index] === op)
}
