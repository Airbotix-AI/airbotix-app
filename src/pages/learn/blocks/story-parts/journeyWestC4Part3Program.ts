import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C4_P3_PART_ID = 'jtw-s1-c4-p3'
export const C4_P3_NEXT_PART_ID = 'jtw-s1-c4-p4'

export const C4_P3_STORY_BEFORE =
  'Start旗举起时，悟空先站稳名字；同伴点纸角色卡时，他才做动作。两个入口都在等，但等的事情不一样。'
export const C4_P3_CLASSIC_CARD =
  '原著第一至二回写悟空拜师得名并学习本领。本课用两个入口理解“什么时候发生”，不把几张卡说成完整修行。'
export const C4_P3_STORY_BRIDGE =
  '🚩 Start在等场景开始；👆 On Tap在等观众邀请。动作卡放在哪个圈，就决定动作什么时候发生。'
export const C4_P3_SAFETY_NOTE = '安全约定：只点纸悟空卡，不碰同伴身体。'

export const C4_P3_START_OPTIONS: JtwEvidenceOption[] = [
  { id: 'start-waits-scene', label: 'Start在等场景开始', correct: true },
  { id: 'start-waits-tap', label: 'Start在等观众点纸卡', correct: false },
]
export const C4_P3_TAP_OPTIONS: JtwEvidenceOption[] = [
  { id: 'tap-waits-invitation', label: 'Tap在等观众邀请', correct: true },
  { id: 'tap-waits-scene', label: 'Tap在等场景开始', correct: false },
]
export const C4_P3_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'turn-runs-too-early',
    label: '一举旗，名字和转身会挤在一起，观众还没邀请动作就抢跑',
    correct: true,
  },
  { id: 'turn-waits-anyway', label: '转身卡虽然在Start圈，还是会等Tap', correct: false },
  { id: 'nothing-happens', label: '两个入口都会安静不动', correct: false },
]

export const C4_P3_RESOLVED_WORLD_CHANGE =
  '两条地面轨迹不再交叉：名字卡停在Start圈，转身、Hop和Hide/Show动作卡停在Tap圈。'
export const C4_P3_STORY_AFTER =
  '纸卡已经分清，但真正的两条积木链仍有空槽。下一步，要亲手搭好名字链和本领链。'
export const C4_P3_CONTINUE_LABEL = '搭好两条故事'

export function c4p3Correct(
  optionId: string | null,
  options: JtwEvidenceOption[],
): boolean {
  return options.find((option) => option.id === optionId)?.correct === true
}

export function c4p3Resolved(input: {
  startMeaning: string | null
  tapMeaning: string | null
  prediction: string | null
  turnInTap: boolean
  rehearsal: readonly string[]
}): boolean {
  return c4p3Correct(input.startMeaning, C4_P3_START_OPTIONS) &&
    c4p3Correct(input.tapMeaning, C4_P3_TAP_OPTIONS) &&
    c4p3Correct(input.prediction, C4_P3_PREDICTION_OPTIONS) &&
    input.turnInTap &&
    input.rehearsal.join(',') === 'start,tap'
}
