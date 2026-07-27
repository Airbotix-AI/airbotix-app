import type { BlocksProject } from '../blocksModel'
import type { SpriteState } from '../interpreter'
import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C4_P2_PART_ID = 'jtw-s1-c4-p2'
export const C4_P2_NEXT_PART_ID = 'jtw-s1-c4-p3'
export const C4_P2_LESSON_ID = C4_P2_PART_ID
export const C4_P2_WUKONG_ID = 'sun-wukong'

export const C4_P2_STORY_SCREENS = [
  '石猴原本没有人的姓名。师父为他取姓“孙”，又按门中排行给他法名“悟空”。这个名字不是换一张装饰贴纸：过去的花果山石猴和未来行动的悟空，是同一个伙伴。',
  '悟空在师门学习了很长时间。今天只观察两个开始：Go 会让名字牌出现并说出“我是孙悟空”；观众真的 Tap 悟空以后，另一条链才该展示一个小动作。几块积木不等于完整修行。',
] as const
export const C4_P2_SCREEN_IDS = ['story-card-b', 'story-card-c'] as const
export const C4_P2_CLASSIC_CARD =
  '原著第一至二回写猴王经过多年寻找，拜师得名并学习本领。本课只观察两个事件入口，不模仿宗教权威，也不把短程序说成完整修行。'
export const C4_P2_STORY_BRIDGE =
  'Start 在等场景开始；On Tap 在等观众邀请。动作放在哪条链上，就决定它什么时候发生。'

export const C4_P2_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'name-only-no-skill',
    label: '名字会出现，本领应保持安静；不点悟空就不该展示',
    correct: true,
  },
  { id: 'both-run', label: '名字和本领都会一起开始', correct: false },
  { id: 'tap-runs-first', label: '还没点悟空，Tap 链也会先运行', correct: false },
]

export const C4_P2_COMPARISON_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'start-scene-tap-invitation',
    label: 'Start 等场景开始；Tap 等观众邀请',
    correct: true,
  },
  { id: 'same-trigger', label: '两个入口其实一样，只是图案不同', correct: false },
  { id: 'tap-runs-on-go', label: 'Go 会替观众自动 Tap 悟空', correct: false },
]

export const C4_P2_START_SCRIPT_ID = 'sun-wukong-wrong-start'
export const C4_P2_TAP_SCRIPT_ID = 'sun-wukong-tap-example'
export const C4_P2_START_OPS = ['when_flag', 'show', 'say', 'hop', 'end'] as const
export const C4_P2_TAP_OPS = ['when_tap', 'turn_right', 'end'] as const

export const C4_P2_STARTER_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C4-P2 two event starter',
  lessonId: C4_P2_LESSON_ID,
  pages: [{
    id: 'jtw-c4-master-courtyard',
    background: 'jtw-s1-c4-master-courtyard-before',
    characters: [{
      id: C4_P2_WUKONG_ID,
      name: '孙悟空',
      emoji: '🐵',
      start: { gx: 7, gy: 8, size: 3, rot: 0, visible: true },
      scripts: [
        {
          id: C4_P2_START_SCRIPT_ID,
          blocks: [
            { op: 'when_flag' },
            { op: 'show' },
            { op: 'say', text: '我是孙悟空' },
            { op: 'hop', n: 1 },
            { op: 'end' },
          ],
        },
        {
          id: C4_P2_TAP_SCRIPT_ID,
          blocks: [{ op: 'when_tap' }, { op: 'turn_right', n: 2 }, { op: 'end' }],
        },
      ],
    }],
  }],
}

export interface C4P2EventRun {
  trigger: 'start' | 'tap'
  scriptIds: string[]
  ops: string[]
  finalState: SpriteState
  says: string[]
}

export function c4p2StoryRead(screens: readonly string[]): boolean {
  return C4_P2_SCREEN_IDS.every((id) => screens.includes(id))
}

export function c4p2Correct(
  selected: string | null,
  options: readonly JtwEvidenceOption[],
): boolean {
  return options.find((option) => option.id === selected)?.correct === true
}

export function c4p2StartMeasured(run: C4P2EventRun | null): boolean {
  return Boolean(
    run &&
    run.trigger === 'start' &&
    run.scriptIds.length === 1 &&
    run.scriptIds[0] === C4_P2_START_SCRIPT_ID &&
    run.ops.join(',') === C4_P2_START_OPS.slice(1).join(',') &&
    run.says.includes('我是孙悟空') &&
    run.finalState.visible &&
    run.finalState.rot === 0,
  )
}

export function c4p2TapMeasured(run: C4P2EventRun | null): boolean {
  return Boolean(
    run &&
    run.trigger === 'tap' &&
    run.scriptIds.length === 1 &&
    run.scriptIds[0] === C4_P2_TAP_SCRIPT_ID &&
    run.ops.join(',') === C4_P2_TAP_OPS.slice(1).join(',') &&
    run.finalState.rot === 60,
  )
}

export const C4_P2_RESOLVED_WORLD_CHANGE =
  '“孙悟空”名字牌完整显示，两张事件轨迹卡并排出现；Start 里的抢跑 Hop 被圈出，但这一 Part 不移动它。'
export const C4_P2_STORY_AFTER =
  '悟空知道了：“会做什么”和“什么时候做”是两个问题。下一步先用两个入口圈把它讲清楚。'
export const C4_P2_CONTINUE_LABEL = '试试两个入口'
