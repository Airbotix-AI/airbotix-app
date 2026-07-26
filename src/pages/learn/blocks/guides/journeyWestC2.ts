// Journey to the West S1 C2｜水帘洞的约定 — Story Blocks mission guides.
// Split out of curriculumGuides.ts to keep every file under the 1000-line
// hard rule in rules/file-organization.md. curriculumGuides.ts stays the
// public module and re-exports the assembled catalogue.

import type { StoryMission } from './types';

export const JTW_C2_MISSIONS: Record<string, StoryMission> = {
  'jtw-s1-c2-p4': {
    mode: 'complete',
    lessonId: 'jtw-s1-c2-p4',
    hero: {
      name: '石猴',
      role: '瀑布前的探路者',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第二章 · Build 1',
    title: '刚好到达，不多也不少',
    storyPages: [
      {
        emoji: '🌊🐒',
        title: '路线说得通了，现在真的走',
        body: '三片叶子还标着停点：圆叶在 4-8，尖叶在 4-7 的高台，长叶在 6-7 的水帘入口。石猴站在 2/8 的起点上，等程序带他一步一步走过去。',
        speaker: '石猴',
        dialogue: '排练过的路线，这次要让舞台真的照着做。',
        scene: 1,
      },
      {
        emoji: '🧩➡️',
        title: '五块一步移动，都由你放',
        body: '工作区里只有 Start 和 End。从候选里选出五块一步移动：Right 1、Right 1、Up 1、Right 1、Right 1——Left、Down 和 Wait 也在候选里，它们能运行，却会把石猴带离湿石路。',
        speaker: '群猴',
        dialogue: '一个方向或顺序错误，都会停在错误的湿石上！',
        scene: 3,
        blocks: ['➡️ Right 1 ×2 → ⬆️ Up 1', '➡️ Right 1 ×2 → 🏁 End'],
      },
      {
        emoji: '👣🎯',
        title: '先预测，再按 Go',
        body: '运行前先逐块预测五个停点：3-8、4-8、4-7、5-7、6-7。少一个 Right 停在 5-7 碰不到入口；多一个 Right 会冲过 6-7——刚好碰到才算到达。',
        speaker: '石猴',
        dialogue: '不多也不少，我的脚底要刚好碰到入口格。',
        scene: 4,
      },
    ],
    partnerLine: 'P3 的预测在你手里，现在把它变成五块真实的路线主链！',
    mission:
      'Start 和 End 已经放好。从候选里选出五块一步移动 Right 1、Right 1、Up 1、Right 1、Right 1 按顺序接上，先预测五个停点，再按 Go 真实运行——不是改一个数字，五块都要你自己放。',
    question: '哪一段必须在两个 Right 之后、后两个 Right 之前？',
    choices: [],
    retry: '想想三片叶子的顺序：先右2到圆叶，再上1跳上尖叶的高台，最后右2停在长叶的入口。',
    successTitle: '刚好到达！⭐',
    success: '五个脚印一步一个，石猴的脚底刚好碰到水帘入口格——不多也不少。',
    fixTitle: '把五块路线搭完整',
    fixPrompt: '关掉这张卡，把五块一步移动按 右1→右1→上1→右1→右1 接到 Start 和 End 之间。',
    workspaceIntro: '湿石路等着你的五块移动——没有任何按钮会替你走这条路。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '搭路线：在 Start 和 End 之间按顺序接上五块一步移动。',
      watch: '看石猴一步一个脚印地走——每一段都停在预测的停点上吗？',
      sayFirst: '先说预测：五个停点分别在哪里？',
      sayThen: '停点和脚印对上了——预测成立。',
      hopFirst: '第一段右1，石猴踏上 3-8 的湿石！',
      hopThen: '上1 跳上高台之后，还差两个 Right 才到入口。',
      retry: '石猴停在了错误的湿石上。检查方向和顺序，把五块摆成 右1→右1→上1→右1→右1。',
      fix: '在真正的工作区里放五块移动——合并成右2也不行，五块都要你自己排。',
      test: '五块接好了。按 Go，看脚印是不是刚好到入口！',
      saving: '刚好到达！我在保存你搭的路线……',
      complete: '你的路线让我刚好碰到水帘入口——可水帘还没有回应。',
    },
    logicSteps: [
      { icon: '➡️', label: 'Right 1 ×2', order: '第一段' },
      { icon: '⬆️', label: 'Up 1', order: '第二段' },
      { icon: '➡️', label: 'Right 1 ×2', order: '第三段' },
    ],
    logicWhy: '五块一步移动与 右2→上1→右2 等价，但每一步都留下一个可观察的停点——刚好到达，不多也不少。',
    completionTitle: 'Build 1 完成！👣',
    completion: '你选出五块真移动、按路线顺序接好并真实运行：五个脚印稳定显示，石猴的脚底刚好碰到水帘入口格。',
    completionSteps: [
      { icon: '👣', label: '五个脚印', order: '先' },
      { icon: '🎯', label: '刚好到达', order: '再' },
    ],
    completionWhy: '少一个 Right 碰不到入口，多一个 Right 会冲过头——精确的五块顺序才让“到达”真实发生。',
    next: '石猴到达了，水帘却没有分开。下一个 Part：连接“碰到以后”的回应。',
  },
};
