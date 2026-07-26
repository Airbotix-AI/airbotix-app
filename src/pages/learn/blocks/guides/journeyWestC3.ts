// Journey to the West S1 C3｜一叶木筏求师路 — Story Blocks mission guides.
// Split per chapter to keep every file under the 1000-line hard rule in
// rules/file-organization.md; curriculumGuides.ts stays the public module.
//
// Chapter three is the season's first THREE-page build, so the studio mission is
// about a page that has to earn its place in the route: 海中央 must have a story
// (sound, movement, a pause) AND an exit that hands the raft to 彼岸山林.

import type { StoryMission } from './types';

export const JTW_C3_MISSIONS: Record<string, StoryMission> = {
  // Journey to the West S1/C3-P4 — chapter three's Build 1 (scene-specs
  // JTW-S1-C3-P4, teaching script C3 Part 4). Page 2 ships with the raft, the
  // sea background and an EMPTY script slot under the Start block; the child
  // selects and orders Whoosh · Right 4 · Wait 2 · Page 3. Pages 1 and 3 keep
  // read-only demo chains so the three pages can be compared.
  'jtw-s1-c3-p4': {
    mode: 'complete',
    lessonId: 'jtw-s1-c3-p4',
    hero: {
      name: '美猴王',
      role: '海上中段的木筏手',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第三章 · Build 1',
    title: '让海中央既有故事又有出口',
    storyPages: [
      {
        emoji: '🗺️🛶',
        title: '路口找对了，海中央还是空的',
        body: 'Part 3 已经说清楚：出口上的数字就是下一页的地址。可是把数字改对，海中央这一页仍然什么都没有发生——木筏一进来就要走，观众看不出这一段路发生过什么。',
        speaker: '美猴王',
        dialogue: '光有出口不够，这一页也要有它自己的故事。',
        scene: 1,
      },
      {
        emoji: '🧩💨',
        title: '四块由你放，Start 已经在那里了',
        body: 'Page 2 的脚本槽只有一个 Start。你要自己选出并排好四块：💨 Whoosh 是海风，➡️ Right 4 是木筏真的向前走，⏱ Wait 2 是他停下来看一看，📄 Page 是这一段路的出口。Page 1 和 Page 3 的示范链只能看，不要改。',
        speaker: '群猴',
        dialogue: '声音、移动、停顿、出口——四件事各做各的。',
        scene: 3,
        blocks: ['💨 Whoosh → ➡️ Right 4', '⏱ Wait 2 → 📄 Page 3'],
      },
      {
        emoji: '📄3️⃣',
        title: 'Page 上的数字要点成 3',
        body: '📄 Page 刚放下来时写的是 1，那是花果山海岸——木筏又会被送回家。点一下数字把它换成 3，3 才是彼岸山林。放好以后从 Page 1 按 Go：风声、前进、停顿、转场，四件事都要真的出现。',
        speaker: '美猴王',
        dialogue: '我要从这里离开，去的是彼岸，不是回头。',
        scene: 4,
      },
    ],
    partnerLine: 'Part 3 的口令还记得吗？出口数字决定下一页——现在轮到你把这一页搭出来。',
    mission:
      'Page 2 的脚本槽里只有 Start。选出并按顺序接上四块：💨 Whoosh、➡️ Right 4、⏱ Wait 2、📄 Page，再把 Page 上的数字点成 3，然后从 Page 1 按 Go 完整跑一次。Page 1 和 Page 3 的示范链一块都不要删。',
    question: '哪一块负责把木筏交给下一页？',
    choices: [],
    retry:
      '还差一点：四块要按 Whoosh → Right 4 → Wait 2 → Page 3 的顺序，Page 上的数字必须是 3，Page 1 和 Page 3 的示范链也要保持原样。',
    successTitle: '海中央有故事了！⭐',
    success: '风声、前进、停顿都发生过，木筏从这一页交给了彼岸山林——1 → 2 → 3 一次跑通。',
    fixTitle: '把海中央这一页搭完整',
    fixPrompt: '关掉这张卡，在 Page 2 的 Start 后面接上 Whoosh → Right 4 → Wait 2 → Page 3。',
    workspaceIntro: '海中央还空着——四块积木都由你放，没有按钮会替你装好。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '在 Page 2 的 Start 后面接四块：Whoosh、Right 4、Wait 2、Page 3。',
      watch: '看着木筏走这一页：风声响了吗？他停下来了吗？最后去了哪一页？',
      sayFirst: '先说预测：木筏会在海中央的哪一格离开？',
      sayThen: '离开的那一格和你预测的一样吗？',
      hopFirst: '海风先响起来，观众才知道这是一段有风的海。',
      hopThen: 'Wait 2 那一下停顿，就是他抬头看方向的时间。',
      retry: '顺序或数字还不对。Whoosh → Right 4 → Wait 2 → Page 3，Page 的数字要点成 3。',
      fix: '在真正的工作区里放四块——没有按钮会替你装好这条链。',
      test: '四块接好了。回到 Page 1 按 Go，看是不是真的走到了彼岸山林！',
      saving: '海中央这一页有故事了。我在保存你搭的海路……',
      complete: '木筏不再被送回花果山——它经过有声音、有动作、有停顿的海路到了对岸。',
    },
    logicSteps: [
      { icon: '💨', label: 'Whoosh 海风', order: '先' },
      { icon: '➡️', label: 'Right 4 前进', order: '再' },
      { icon: '⏱', label: 'Wait 2 停顿', order: '然后' },
      { icon: '📄', label: 'Page 3 出口', order: '最后' },
    ],
    logicWhy:
      '声音让这一页有气氛，移动让它有进展，停顿让观众看清；出口上的数字才把这一段交给下一页。少了出口，故事停在海上；少了前面三块，Page 2 只是一个空过场。',
    completionTitle: 'Build 1 完成！🛶',
    completion:
      '你自己选出四块、按顺序接好、把 Page 目标点成 3，并从 Page 1 完整运行了一次：实际轨迹 1 → 2 → 3，Page 3 稳定结束。',
    completionSteps: [
      { icon: '🌊', label: '海中央有内容', order: '先' },
      { icon: '📄', label: '出口写 3', order: '再' },
      { icon: '🏁', label: 'Page 3 结束', order: '最后' },
    ],
    completionWhy:
      '三页现在各做各的事：Page 1 离家、Page 2 观察前进、Page 3 到达。远行印亮了一半——另一半要等木筏跨页时也站对位置。',
    next: '路线接通了。下一个 Part：选择星夜还是晨雾，来表达旅程的中段。',
  },
};
