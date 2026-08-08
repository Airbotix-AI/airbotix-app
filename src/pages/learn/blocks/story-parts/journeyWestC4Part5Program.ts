import type { BlocksProject } from '../blocksModel';
import { jtwC4P5Version, type JtwC4P5Version } from '../jtwC4DualBuild';
import type { BlocksTemplateId } from '../blocksApi';

export const C4_P5_PART_ID = 'jtw-s1-c4-p5';
export const C4_P5_NEXT_PART_ID = 'jtw-s1-c4-p6';
export const C4_P5_STORY_BEFORE = [
  '悟空在师门认真学习了很长时间。今天他只选择一个温和的小展示，让伙伴看清“什么时候开始”也属于故事的一部分。几块积木不等于完整修行，更不代表七十二变。',
  '师父提醒他：先用名字与大家相识，等观众准备好、真正Tap你以后，再回应邀请。这样本领不是为了抢先，而是为了让别人看懂。',
];
export const C4_P5_MOTIVE_OPTIONS = [
  { id: 'wait-invitation', label: '等观众准备好并发出邀请', correct: true },
  { id: 'show-off-first', label: '抢在名字出现前炫耀', correct: false },
] as const;
export const C4_P5_VERSIONS = [
  {
    id: 'leaf',
    label: '跃过叶纹',
    detail: 'Tap → Hop 2 → “我等到邀请了” → End',
    template: 'blocks_jtw_c4_p5_leaf',
  },
  {
    id: 'home',
    label: '转身指家',
    detail: 'Tap → Turn Left 2 → Wait 1 → “家在那边” → End',
    template: 'blocks_jtw_c4_p5_home',
  },
  {
    id: 'screen',
    label: '屏风再现',
    detail: 'Tap → Hide → Wait 1 → Show → “再看这里” → End',
    template: 'blocks_jtw_c4_p5_screen',
  },
] as const satisfies readonly {
  id: JtwC4P5Version;
  label: string;
  detail: string;
  template: BlocksTemplateId;
}[];
export const C4_P5_PREDICTIONS = [
  { id: 'chosen-after-tap', label: 'Go只显示名字；Tap后才出现所选展示', correct: true },
  { id: 'chosen-on-go', label: 'Go后名字和展示一起自动播放', correct: false },
] as const;

export function c4p5ProjectEvidence(project: BlocksProject, completed: readonly string[]) {
  return {
    version: jtwC4P5Version(project),
    dualRunCompleted: completed.includes(C4_P5_PART_ID),
  };
}

export function c4p5Correct(
  option: string | null,
  choices: readonly { id: string; correct: boolean }[],
) {
  return choices.some((choice) => choice.id === option && choice.correct);
}
