import type { StoryMission } from './types'
import { JTW_C5_P4_ID, JTW_C5_P5_ID, JTW_C5_P7_ID, JTW_C6_P4_ID, JTW_C6_P5_ID, JTW_C6_P8_ID } from '../jtwC5C6Builds'

const WUKONG = '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png'

function mission(lessonId: string, title: string, goal: string): StoryMission {
  return {
    mode: lessonId.endsWith('p7') || lessonId.endsWith('p8') ? 'personal-ship' : 'complete',
    lessonId,
    celebrate: false,
    hero: { name: '孙悟空', role: '用真实积木讲清因果的学习者', asset: WUKONG },
    eyebrow: '西游记 · Blocks Studio', title,
    storyPages: [{ emoji: '🧩', title, body: goal, scene: 4 }],
    partnerLine: '伙伴只看保存并运行出来的程序，不接受页面按钮代搭。',
    mission: goal, question: '怎样证明这是你的程序？', choices: [],
    retry: '检查积木、参数、顺序、页面出口与End。', successTitle: '真实程序已保存',
    success: '目标链由孩子在Blocks Studio中完成并运行到目标。', fixTitle: '继续搭积木',
    fixPrompt: goal, workspaceIntro: 'Starter只保留必要的舞台与空Trigger。', fixChoices: [], fixRetry: '',
    coach: { ready: '先读目标。', watch: '观察每块执行。', sayFirst: '先说原因。', sayThen: '再说结果。', hopFirst: '动作要有用途。', hopThen: '出口要接下一页。', retry: '目标链还不完整。', fix: '补齐或重排积木。', test: '按Go运行真实项目。', saving: '正在保存项目和运行标记。', complete: '真实作品已保存。' },
    logicSteps: [{ icon: '🧩', label: '搭建', order: '先' }, { icon: '▶️', label: '运行', order: '后' }],
    logicWhy: '保存的AST和真实运行共同证明学习。', completionTitle: 'Studio任务完成',
    completion: '项目结构与运行标记均已保存。', completionSteps: [{ icon: '💾', label: '保存', order: '先' }, { icon: '✅', label: '核对', order: '后' }],
    completionWhy: '页面选择不能替代项目证据。', next: '回到故事页继续。',
  }
}

export const JTW_C5_C6_MISSIONS: Record<string, StoryMission> = {
  [JTW_C5_P4_ID]: mission(JTW_C5_P4_ID, '搭出三种大小状态', '在Start后搭Grow 2、Wait 5、Reset、Shrink 2和End。'),
  [JTW_C5_P5_ID]: mission(JTW_C5_P5_ID, '让最后大小适合携带', '重排状态与等待，加入“合适才是目标”，最后用Shrink和End收束。'),
  [JTW_C5_P7_ID]: mission(JTW_C5_P7_ID, '我的如意大小故事', '搭出Grow、Reset、Shrink与两个可读停点，最后保持小状态。'),
  [JTW_C6_P4_ID]: mission(JTW_C6_P4_ID, '第一页讲清身份变化', '搭出两句、停点、速度、移动与Page 2出口。'),
  [JTW_C6_P5_ID]: mission(JTW_C6_P5_ID, '第二页分开行动与回应', '搭出显示、等待、回应、慢速、第二个停点与Page 3出口。'),
  [JTW_C6_P8_ID]: mission(JTW_C6_P8_ID, '我的三页美猴王前传', '在三页分别完成原因、回应与五行山稳定End，保存至少18块真实积木。'),
}
