import type { BlockOp, BlocksProject } from '../blocksModel'

export const C4_P2_STORY = [
  '石猴原本没有人的姓名。师父为他取姓“孙”，又按门中排行给他法名“悟空”。这个名字不是换一张装饰贴纸：从这以后，伙伴和观众都能用同一个名字认识他。',
  '悟空在师门学习了很长时间。今天的小展示只练习两种开始：Go先完成得名故事，观众Tap他之后，他才应该展示动作。几块积木不等于一下子学会全部本领。',
] as const

export const C4_P2_PREDICTIONS = [
  { id: 'name-only', label: '名字出现，本领保持安静', correct: true },
  { id: 'hop-alone', label: '他会自己先Hop，不必等Tap', correct: false },
] as const

export const C4_P2_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C4 — Two Beginnings',
  lessonId: 'jtw-s1-c4-p2',
  pages: [
    {
      id: 'jtw-c4-p2-page',
      background: 'jtw-s1-c3-page3-resolved-v01',
      characters: [
        {
          id: 'sun-wukong',
          name: '孙悟空',
          emoji: '🐵',
          asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
          start: { gx: 8, gy: 9, size: 3, rot: 0 },
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
}

export function c4p2PredictionDone(value: string | null): boolean {
  return C4_P2_PREDICTIONS.find((option) => option.id === value)?.correct === true
}

export function c4p2TraceDone(trace: readonly BlockOp[], trigger: BlockOp): boolean {
  if (trigger === 'when_flag') {
    return trace.join(',') === 'when_flag,show,say,hop,end'
  }
  return trace.join(',') === 'when_tap,turn_right,end'
}
