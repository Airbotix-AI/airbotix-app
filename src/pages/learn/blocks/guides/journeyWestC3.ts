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
  // Journey to the West S1/C3-P5 — the chapter's expression choice (scene-specs
  // JTW-S1-C3-P5, teaching script C3 Part 5). ONE lesson, TWO valid saved
  // programs on TWO different Page 2 seas, so the guide talks about both: which
  // sea the studio paints was already decided on the Part page (each branch has
  // its own whitelisted starter), and the work in here is the SAME either way —
  // add this version's 2–3 expression blocks in front of the shared
  // `Right 4 → Page 3` route, which neither version may touch.
  'jtw-s1-c3-p5': {
    mode: 'complete',
    lessonId: 'jtw-s1-c3-p5',
    hero: {
      name: '美猴王',
      role: '中间那片海的木筏手',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第三章 · 故事选择',
    title: '星夜和晨雾都需要观察',
    storyPages: [
      {
        emoji: '🌙🌫',
        title: '两片海都是对的',
        body: '你已经选好了这一程要走哪一片海。星夜的海上有月亮，可云还压在天边；晨雾的海上白蒙蒙的，眼睛帮不上忙。两种海讲的是同一件事：看不清的时候，要先观察，再继续。',
        speaker: '美猴王',
        dialogue: '海还是这条海，我只是换一种方式让你们看清楚。',
        scene: 1,
      },
      {
        emoji: '🧩✨',
        title: '把这一版的表达接在 Right 4 前面',
        body: '星夜版接两块：✨ Sparkle 让星光响一下，⏱ Wait 2 停两拍等云散开。晨雾版接三块：🐢 Speed 点成最慢，💨 Whoosh 是海风，💬 Say 的文字点一下就能从预设里选（不用打字）。',
        speaker: '群猴',
        dialogue: '先观察，再前进——两版都是这个顺序。',
        scene: 3,
        blocks: ['✨ Sparkle → ⏱ Wait 2', '🐢 Speed → 💨 Whoosh → 💬 Say'],
      },
      {
        emoji: '➡️📄',
        title: '➡️ Right 4 和 📄 Page 3 一块都不要动',
        body: '脚本槽里已经有 ➡️ Right 4 → 📄 Page 3 了，那是两版共用的路线。表达积木要接在 Right 4 的前面；把 Page 改回 1、把 Page 删掉，或者只换了背景没接积木，海中央就不再是"观察后继续"。',
        speaker: '美猴王',
        dialogue: '节奏我可以选，去哪一页不能选。',
        scene: 4,
      },
    ],
    partnerLine: '同伴只看你的天气卡：他会听见什么？木筏什么时候才动？最后去哪一页？',
    mission:
      '在 ➡️ Right 4 前面接上这一版的表达积木：星夜是 ✨ Sparkle → ⏱ Wait 2，晨雾是 🐢 Speed（最慢）→ 💨 Whoosh → 💬 那句预设的话。Right 4 和 📄 Page 3 一块都不要动，然后从 Page 1 按 Go 完整跑一次。',
    question: '哪两块是这一页可以由你决定的？',
    choices: [],
    retry:
      '还差一点：表达积木要接在 ➡️ Right 4 的前面，顺序不能乱；Right 4 还是 4，📄 Page 还是 3，Page 1 和 Page 3 的示范链也要保持原样。',
    successTitle: '这一版的海站住了！⭐',
    success: '观察发生了，路线一点没变——木筏还是从这一页交给了彼岸山林。',
    fixTitle: '把这一版的表达接完整',
    fixPrompt: '关掉这张卡，在 Start 和 ➡️ Right 4 之间接上这一版的表达积木。',
    workspaceIntro: '路线已经在那里了。你要加的是"他怎样观察"，不是"他去哪里"。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '在 Start 和 ➡️ Right 4 之间，接上这一版的表达积木。',
      watch: '看着这一页：观察真的发生了吗？他是观察完才走的吗？',
      sayFirst: '先说预测：同伴会听见什么？',
      sayThen: '真的听见的和你说的一样吗？',
      hopFirst: '星夜要等云散开，晨雾要放慢听浪——都是先观察。',
      hopThen: '观察完了，➡️ Right 4 才把他送过这一段海。',
      retry: '顺序或数字还不对。表达积木在前，➡️ Right 4 → 📄 Page 3 在后，Page 上写的还是 3。',
      fix: '在真正的工作区里接积木——没有按钮会替你装好这一版。',
      test: '接好了。回到 Page 1 按 Go，看这一版是不是也走到了彼岸山林！',
      saving: '这一片海有它自己的样子了。我在保存你选的版本……',
      complete: '观众读得出来：他先观察，然后继续——而且还是到了 Page 3。',
    },
    logicSteps: [
      { icon: '👀', label: '先观察', order: '先' },
      { icon: '➡️', label: 'Right 4 前进', order: '再' },
      { icon: '📄', label: 'Page 3 出口', order: '最后' },
    ],
    logicWhy:
      '声音、速度和停顿改变的是节奏，➡️ 和 📄 改变的是路线。所以两版都成立：它们换的是"怎样讲"，不是"讲的是哪条路"。看不清的时候走得更快，只是更快地走错。',
    completionTitle: '故事选择完成！🌙🌫',
    completionSteps: [
      { icon: '🎴', label: '选了一片海', order: '先' },
      { icon: '👀', label: '观察真的发生', order: '再' },
      { icon: '🏁', label: '出口仍是 3', order: '最后' },
    ],
    completion:
      '你选了一片海，给它接上了自己的表达积木，并且从 Page 1 完整跑了一次：观察发生了，路线还是 1 → 2 → 3。',
    completionWhy:
      '同一条路线可以有两种讲法，两种都对——因为你换的是节奏，不是出口。下一步：木筏跨页的时候还站错了边。',
    next: '天气和路线都清楚了。下一个 Part：找出木筏为什么会跳到另一边。',
  },
};
