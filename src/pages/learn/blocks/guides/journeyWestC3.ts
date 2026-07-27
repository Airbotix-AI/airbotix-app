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
  // Journey to the West S1/C3-P6 — chapter three's Fix (scene-specs
  // JTW-S1-C3-P6, teaching script C3 Part 6). Every block on all three pages is
  // right, including the child's own C3-P5 weather chain and both exits; what is
  // wrong is a stage POSITION — Page 2's start cell ships as 16/8 instead of
  // 2/8, so the raft appears on the far side of the sea. The repair is a DRAG,
  // not a block edit: the child pulls the raft and the monkey king standing on
  // it back to the calibrated cell and reruns.
  'jtw-s1-c3-p6': {
    mode: 'manual-fix',
    lessonId: 'jtw-s1-c3-p6',
    hero: {
      name: '美猴王',
      role: '跨页时站错边的木筏手',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第三章 · Debug',
    title: '木筏跳了位置',
    storyPages: [
      {
        emoji: '🛶↔️',
        title: '积木都对，画面却接不上',
        body: '三页的积木、数字和出口都没问题：你选的那片海还在，表达链一块没少，木筏照样走完 1 → 2 → 3。可他明明从第一页的右边划出去，翻到第二页又出现在右边——观众会以为有人把木筏搬过去了。',
        speaker: '群猴',
        dialogue: '你怎么又跑到海的那一头去了？',
        scene: 1,
      },
      {
        emoji: '📍2️⃣',
        title: '错的是起点格，不是积木',
        body: 'Page 2 的起点写着 16-8，那是海面的右边；这条路线约定的起点是 2-8，海面的左边。积木决定这一页发生什么，出口数字决定翻到哪一页，起点格决定他在下一页的哪个位置出现——这次错的是第三件。',
        speaker: '美猴王',
        dialogue: '我一直朝右走，就该从左边接着上路。',
        scene: 3,
        blocks: ['📍 起点 16-8 · 右边出现', '📍 起点 2-8 · 左边接着走'],
      },
      {
        emoji: '🖐️🛶',
        title: '拖回来，只动这一处',
        body: '翻到 Page 2，把木筏和站在木筏上的猴王一起拖到海面左边的 2-8 格——松手时会自己吸到格子上。别改 Page 1 的出口，别删表达积木，别加更响的声音，也别去动另外两页。拖好以后按 Go。',
        speaker: '美猴王',
        dialogue: '一处就够了，多改一处故事就又乱了。',
        scene: 4,
      },
    ],
    partnerLine: '同伴只看画面：他从哪里来，往哪里去？接得上，才说明起点对了。',
    mission:
      '翻到 Page 2，把木筏和猴王一起拖回海面左边的 2-8 格，然后按 Go 跑一次。三页的积木、出口和你选的那片海都要保持原样——这一次只准改这一个位置。',
    question: '哪一处是这条路线真正的问题？',
    choices: [],
    retry:
      '还没修好：Page 2 的起点要正好落在 2-8，木筏和猴王都要在那一格；积木、出口、背景和另外两页都不能动。',
    successTitle: '木筏不再跳位了！⭐',
    success: '他从海面左边接着走——三页的边界连成了一条不断开的方向线。',
    fixTitle: '把 Page 2 的起点拖回来',
    fixPrompt: '关掉这张卡，翻到 Page 2，把木筏和猴王一起拖到海面左边的 2-8 格。',
    workspaceIntro: '积木一块都不用改。要动的是舞台上那一格——木筏站错了边。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '先翻到 Page 2，看看木筏这一页是从哪一边开始的。',
      watch: '盯住每一页刚打开的那一瞬间：他站在左边还是右边？',
      sayFirst: '先说预期：上一页从右边离开，下一页应该从哪边进来？',
      sayThen: '真的进来的那一边，和你说的一样吗？',
      hopFirst: 'Page 1 他走到 7-9 才离开，那是右边。',
      hopThen: 'Page 2 却从 16-8 开始——那还是右边，所以画面断了。',
      retry: '起点还没落在 2-8。木筏和猴王要一起在那一格，别的什么都不要动。',
      fix: '用手把木筏拖到海面左边——没有按钮会替你放好它。',
      test: '起点回来了。按 Go 跑一次，再回 Part 页面从 Page 1 重跑整条路线！',
      saving: '这一页终于从左边开始了。我在保存你的修复……',
      complete: '一个位置换回来，三页就接成了一条路——观众读得出这是同一个人走过去的。',
    },
    logicSteps: [
      { icon: '▶️', label: '先跑错误版', order: '复现' },
      { icon: '🔍', label: 'Page 1 → Page 2 断开', order: '定位' },
      { icon: '📍', label: '起点拖回 2-8', order: '修复' },
    ],
    logicWhy:
      '积木管这一页做什么，出口数字管翻到哪一页，起点格管他在下一页的哪个位置出现。三件事分开，才能只改一处：这一次积木和出口都是对的，改它们只会把好的地方也弄坏。',
    completionTitle: 'Debug 完成！🔧',
    completion:
      '你先跑出了错误版，指出 Page 1 → Page 2 是第一处断开，只把 Page 2 的起点拖回 2-8，再从 Page 1 重跑验证了三处边界。',
    completionSteps: [
      { icon: '🛶', label: '右边又出现', order: '复现' },
      { icon: '📍', label: '起点 16-8', order: '定位' },
      { icon: '➡️', label: '左边接着走', order: '修复' },
    ],
    completionWhy:
      '两次跑的都是同一条路线、同一片海、同一串积木，只有一格不一样——而故事读不读得通，就差这一格。',
    next: '公共路线修好了。下一个 Part：做一条能保存、能重开的个人三页求师路。',
  },
  // Journey to the West S1/C3-P7 — chapter three's Personal Ship (scene-specs
  // JTW-S1-C3-P7, teaching script C3 Part 7). Nothing is pre-built: all three
  // script slots ship with a bare Start, so every meaningful action, both page
  // exits and the closing End are blocks the child places. The guide therefore
  // talks about a STRUCTURE (每页 2–4 个动作、两个出口、一个 End) instead of a
  // chain, and about the four real choices — 星夜/晨雾、等待节奏、预设对白、木筏路径.
  'jtw-s1-c3-p7': {
    mode: 'personal-ship',
    lessonId: 'jtw-s1-c3-p7',
    celebrate: true,
    hero: {
      name: '美猴王',
      role: '自己写三页求师路的人',
      asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    },
    eyebrow: '西游记 · 第三章 · Personal Ship',
    title: '我的三页求师路',
    storyPages: [
      {
        emoji: '📖🛶',
        title: '这一次三页都是空的',
        body: '前面几个 Part 里，总有一两页是发给你的。这一次不一样：Page 1、Page 2、Page 3 的脚本槽里都只有一个 Start。离家、观察、到达三段故事，全部由你来写——作品的名字叫 Across the Sea to Learn。',
        speaker: '美猴王',
        dialogue: '这条路是我自己的，我要让别人也看得懂。',
        scene: 1,
      },
      {
        emoji: '🧩7️⃣',
        title: '至少七块，而且每页都要有内容',
        body: '每一页放 2–4 块有意义的动作：➡️ Right 走路、💨/✨ 声音、⏱ Wait 或 🐢 Speed 的节奏、💬 预设的一句话。再加上 Page 1 和 Page 2 各一块 📄 Page 出口，还有 Page 3 的 🏁 End——加起来至少七块。哪一页只放一块出口，那一页就是空壳。',
        speaker: '群猴',
        dialogue: '每一页都要真的发生一件事，别人才读得下去。',
        scene: 3,
        blocks: ['➡️ Right · 💨 声音', '⏱ Wait · 📄 Page · 🏁 End'],
      },
      {
        emoji: '🛶📍',
        title: '木筏在哪里，你就得走到哪里',
        body: 'Page 1 的木筏停在你右边第 4 格，所以这一页的移动加起来要正好 4 格，他才上得了筏。Page 2 的木筏自己向右走 4 格，所以海上那一页的移动加起来也要正好 4 格，他的脚才一直在筏上。剩下的怎么讲，全是你的选择。',
        speaker: '美猴王',
        dialogue: '故事可以有很多种讲法，脚下的木筏只有一个。',
        scene: 4,
      },
    ],
    partnerLine: '同伴只看三页的地标、起点和出口数字，逐页预测；然后你从 Page 1 跑一遍给他看。',
    mission:
      '三页各放 2–4 块动作：Page 1 走满 4 格上木筏，Page 2 走满 4 格并且要有 ⏱ Wait 或 🐢 Speed，Page 3 要说一句预设的话。Page 1 的 📄 Page 点成 2，Page 2 的点成 3，Page 3 用 🏁 End 收尾。至少要有两块移动、一个声音和一个 Wait/Speed，然后按 Go 跑一次保存。',
    question: '哪一页可以只放一块出口？',
    choices: [],
    retry:
      '还差一点：检查每一页是不是都有 2–4 块动作，Page 1 和 Page 2 的移动是不是都正好 4 格，海上那一页有没有 Wait 或 Speed，彼岸有没有说话，出口是不是 2 和 3，最后一页是不是 End。',
    successTitle: '三页都是你写的！⭐',
    success: '离家、观察、到达——三段各有内容，出口一路把故事交下去，最后稳稳地结束。',
    fixTitle: '把三页都写完整',
    fixPrompt: '关掉这张卡，从 Page 1 开始，一页一页放上你的动作、出口和结尾。',
    workspaceIntro: '三个 Start，三页空白。这一次没有示范链可以照抄——路线由你决定。',
    fixChoices: [],
    fixRetry: '',
    coach: {
      ready: '先在 Page 1 放上走到木筏的路，再点一块 📄 Page，把数字点成 2。',
      watch: '一页一页看：这一页发生了什么？他接着去了哪里？',
      sayFirst: '先说预测：同伴看着你的出口数字，会说他接下来翻到哪一页？',
      sayThen: '跑出来的和同伴说的一样吗？不一样的那一页，就是要改的地方。',
      hopFirst: 'Page 1 的木筏在右边第 4 格，走满 4 格他才上得去。',
      hopThen: 'Page 2 的木筏自己走 4 格，你的移动也要正好 4 格。',
      retry: '还不成立：每页 2–4 块动作，出口 2 和 3，最后一页 End，至少七块。',
      fix: '在真正的工作区里一页一页搭——这一次没有按钮会替你放好任何一块。',
      test: '三页都写好了。按 Go 跑一次保存，再回 Part 页面重开并从 Page 1 跑一遍！',
      saving: '这是你自己的求师路。我在保存 Across the Sea to Learn……',
      complete: '保存下来的这一份，关掉再打开还是一模一样——别人也能照着跑一遍。',
    },
    logicSteps: [
      { icon: '🏝', label: 'Page 1 离家', order: '先' },
      { icon: '🌊', label: 'Page 2 观察', order: '再' },
      { icon: '⛰', label: 'Page 3 到达', order: '最后' },
    ],
    logicWhy:
      '每一页负责一段故事，出口数字把它交给下一段，End 说明"讲完了"。三样缺一样，读的人就接不上：没有内容是空壳，没有出口是死页，没有 End 是停不下来。',
    completionTitle: 'Personal Ship 完成！🛶',
    completion:
      '你自己写满了三页、放好了两个出口和一个 End，保存下来，关掉再打开——三页、天气、位置和脚本都还是原样，从 Page 1 又跑通了一次 1 → 2 → 3。',
    completionSteps: [
      { icon: '🧩', label: '七块以上都是你放的', order: '先' },
      { icon: '💾', label: '保存 · 关闭 · 重开', order: '再' },
      { icon: '🏁', label: '重开后再跑一遍', order: '最后' },
    ],
    completionWhy:
      '能保存、能重开、重开后还一样，作品才真的属于你——不然它只是这一次运行时碰巧出现过的画面。',
    next: '你的求师路能重开了。下一个 Part：讲回整章，说清楚到达为什么还不是学会。',
  },
};
