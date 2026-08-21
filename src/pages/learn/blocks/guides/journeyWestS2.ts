import type { StoryMission, StoryMissionChoice } from './types'

const HERO = { name: '西游伙伴', role: '用不同事件让相遇按故事顺序发生', asset: '' }
const EMPTY_CHOICES: StoryMissionChoice[] = []

function mission(args: {
  lessonId: string
  mode?: StoryMission['mode']
  eyebrow: string
  title: string
  body: string
  mission: string
  next: string
  choices?: StoryMissionChoice[]
}): StoryMission {
  return {
    mode: args.mode ?? 'complete', lessonId: args.lessonId, celebrate: false, hero: HERO,
    eyebrow: args.eyebrow, title: args.title,
    storyPages: [{ emoji: '🗺️🧩', title: args.title, body: args.body, scene: 4 }],
    partnerLine: '真实积木、真实运行和保存读回都会被检查。', mission: args.mission,
    question: '舞台上的事件和故事顺序对齐了吗？', choices: args.choices ?? EMPTY_CHOICES,
    retry: '回到舞台，检查事件入口、动作顺序和运行结果。',
    successTitle: '程序已经说得通', success: '可见结果来自孩子搭建并运行的真实程序。',
    fixTitle: '在工作区完成程序', fixPrompt: args.mission,
    workspaceIntro: '先读故事，再在真实工作区修改、运行并保存。', fixChoices: EMPTY_CHOICES,
    fixRetry: '不要删掉故事需要的动作，也不要改写上一 Part 已验证的链。',
    coach: {
      ready: '先看清故事需要哪一个事件。', watch: '观察谁先行动，谁仍在等待。',
      sayFirst: '对白出现了，检查它属于谁。', sayThen: '对白顺序正在运行。',
      hopFirst: '动作已经发生。', hopThen: '动作要跟在正确事件后。',
      retry: '程序或运行证据还没有完全对齐。', fix: '只修改本次任务要求的积木。',
      test: '运行并观察稳定结果。', saving: '正在保存这次真实运行。', complete: '程序和故事证据已经对齐。',
    },
    logicSteps: [{ icon: '🚩', label: 'Go', order: '先' }, { icon: '👆', label: 'Tap', order: '再' }],
    logicWhy: '不同事件等待不同条件，动作不会因为放在同一舞台就自动同时发生。',
    completionTitle: '本次程序已保存', completion: '精确程序和真实运行标记已写入同一项目。',
    completionSteps: [{ icon: '▶️', label: '运行', order: '先' }, { icon: '💾', label: '保存', order: '后' }],
    completionWhy: '只拖积木不会通过；服务器会读回程序和运行证据。', next: args.next,
  }
}

export const JTW_S2_MISSIONS: Record<string, StoryMission> = {
  'jtw-s2-c1-p4': mission({
    lessonId: 'jtw-s2-c1-p4', eyebrow: '西游记 · 第二季 · C1-P4 · Build 1', title: '把今天三步跑起来',
    body: '把行囊、两段路和中间等待接成一条能运行的出发链。',
    mission: '搭 Start → Say(行囊带好) → Right 3 → Wait 2 → Right 3 → End，再按 Go。',
    next: '下一 Part 让五行山路牌等待点击。',
  }),
  'jtw-s2-c1-p5': mission({
    lessonId: 'jtw-s2-c1-p5', eyebrow: '西游记 · 第二季 · C1-P5 · Build 2', title: '让路牌等待点击',
    body: '玄奘的路线保持不变；路牌只在真实点击后出现并说出地点。',
    mission: '保留玄奘路线，为路牌搭 On Tap → Show → Say(五行山) → End，并真实运行。',
    next: '下一 Part 修复提前到达的顺序。',
  }),
  'jtw-s2-c1-p6': mission({
    lessonId: 'jtw-s2-c1-p6', mode: 'observe-fix', eyebrow: '西游记 · 第二季 · C1-P6 · Debug', title: '把等待放回两段路中间',
    body: '错误版先走完两段路才等待。先运行看见错误，再把 Wait 2 移回中间。',
    mission: '先运行错误版；修成 Start → Say → Right 3 → Wait 2 → Right 3 → Say(到了) → End 并重跑。',
    next: '下一 Part 制作自己的出发页。',
  }),
  'jtw-s2-c1-p7': mission({
    lessonId: 'jtw-s2-c1-p7', mode: 'personal-ship', eyebrow: '西游记 · 第二季 · C1-P7 · Personal Ship', title: '保存我的第一次出发',
    body: '选择水壶、书卷或围巾，再选择慢速或正常速度；三步路线不能改变。',
    mission: '完成个人对白和速度，运行、保存、关闭、重开并再次运行。',
    next: '下一 Part 读取这份真实作品讲回第一章。',
  }),
  'jtw-s2-c2-p4': mission({
    lessonId: 'jtw-s2-c2-p4', eyebrow: '西游记 · 第二季 · C2-P4 · Build 1', title: '玄奘先走近询问',
    body: '绿旗只让玄奘走近山边；悟空的点击脚本仍保持安静。',
    mission: '搭 Start → Right 3 → Wait 2 → Say(是谁在说话) → End 并按 Go。',
    next: '下一 Part 补全悟空的点击回应。',
  }),
  'jtw-s2-c2-p5': mission({
    lessonId: 'jtw-s2-c2-p5', eyebrow: '西游记 · 第二季 · C2-P5 · Build 2', title: '询问以后再回应',
    body: '先 Go 让玄奘询问，再点悟空，让他显现、回答并跳一下。',
    mission: '补成 On Tap → Show → Say(我等的是向西的旅人) → Hop 1 → End；先 Go，再真实 Tap。',
    next: '下一 Part 会故意让悟空回答得太早。',
  }),
  'jtw-s2-c2-p6': mission({
    lessonId: 'jtw-s2-c2-p6', mode: 'observe-fix', eyebrow: '西游记 · 第二季 · C2-P6 · Debug', title: '谁回答得太早？',
    body: '错误版让悟空也使用 Start。先按 Go 看见他抢先回答，再只把事件换回 On Tap。',
    mission: '先运行错误版并指出悟空太早；只换 Trigger，保存后先 Go 看他等待，再 Tap 看他回应。',
    next: '下一 Part 保持 Tap 结构，设计悟空离山后的第一步。',
    choices: [
      { id: 'wukong-too-early', label: '悟空在玄奘询问前就回答了', correct: true },
      { id: 'xuanzang-too-early', label: '玄奘不该走到山边', correct: false },
    ],
  }),
  'jtw-s2-c2-p7': mission({
    lessonId: 'jtw-s2-c2-p7', mode: 'personal-ship', eyebrow: '西游记 · 第二季 · C2-P7 · Personal Ship', title: '设计悟空离山后的第一步',
    body: '保留玄奘的询问路线，从三句对白与跳一下／转一下中选择悟空的真实回应。',
    mission: '搭 On Tap → Show → Say(你的选择) → Hop 1 或 Turn 1 → End；先 Go，再 Tap，保存后重开重跑。',
    next: '下一 Part 读取这份作品复述双事件脚印。',
  }),
  'jtw-s2-c3-p4': mission({
    lessonId: 'jtw-s2-c3-p4', eyebrow: '西游记 · 第二季 · C3-P4 · Build 1', title: '让碰撞留下水纹',
    body: '悟空走到第 6 格，水纹石的碰撞脚本变大并响起 Chime。',
    mission: '搭悟空 Start → Right 4 → Say(这里有水纹) → Wait 2 → End；石头搭 On Bump → Grow 1 → Chime → End，再按 Go。',
    next: '下一 Part 让白色倒影回应这次碰撞。',
  }),
  'jtw-s2-c3-p5': mission({
    lessonId: 'jtw-s2-c3-p5', eyebrow: '西游记 · 第二季 · C3-P5 · Build 2', title: '让白龙马回应水纹',
    body: '保留悟空和石头，让隐藏的白龙马在碰撞后显现、说话并跳一下。',
    mission: '为白龙马搭 On Bump → Show → Say(我愿意同行) → Hop 1 → End，再按 Go。',
    next: '下一 Part 修复差一格的碰撞错误。',
  }),
  'jtw-s2-c3-p6': mission({
    lessonId: 'jtw-s2-c3-p6', mode: 'observe-fix', eyebrow: '西游记 · 第二季 · C3-P6 · Debug', title: '修好差一格',
    body: '错误版只走三格。先运行确认悟空停在第 5 格，再把 Right 3 改成 Right 4。',
    mission: '先 Go 看见差一格；只改移动距离为 4，再 Go，确认水纹和白龙马都回应。',
    next: '下一 Part 设计自己的水纹距离和欢迎动作。',
  }),
  'jtw-s2-c3-p7': mission({
    lessonId: 'jtw-s2-c3-p7', mode: 'personal-ship', eyebrow: '西游记 · 第二季 · C3-P7 · Personal Ship', title: '保存我的鹰愁涧发现',
    body: '让第 5、6 或 7 格的石头与移动距离精确对齐，并选择一种白龙马欢迎版本。',
    mission: '完成距离与欢迎版本，Go 运行、保存、关闭、重开并再次运行。',
    next: '下一 Part 读取这份真实作品复述第三章。',
  }),
  'jtw-s2-c4-p4': mission({
    lessonId: 'jtw-s2-c4-p4', eyebrow: '西游记 · 第二季 · C4-P4 · Build 1', title: '把蓝色传话跑起来',
    body: '悟空点按发送蓝色；八戒只有收到同色消息后才走到路线卡旁。',
    mission: '搭悟空 On Tap → Say → Send蓝 → End；八戒 Get蓝 → Right 3 → Say → End，再点悟空运行。',
    next: '下一 Part 给白龙马加黄色收到回执。',
  }),
  'jtw-s2-c4-p5': mission({
    lessonId: 'jtw-s2-c4-p5', eyebrow: '西游记 · 第二季 · C4-P5 · Build 2', title: '让白龙马回复收到',
    body: '保留蓝色路线链，让八戒发黄色、白龙马接黄色后显示并回应。',
    mission: '八戒尾部加 Send黄；白龙马搭 Get黄 → Show → Say(收到了) → End，再点悟空运行全链。',
    next: '下一 Part 会出现一个橙色接收断点。',
  }),
  'jtw-s2-c4-p6': mission({
    lessonId: 'jtw-s2-c4-p6', mode: 'observe-fix', eyebrow: '西游记 · 第二季 · C4-P6 · Debug', title: '找到橙色断点',
    body: '悟空发蓝色，八戒却等橙色。先点悟空看消息停住，再只把八戒Get改回蓝色。',
    mission: '先运行并指出八戒没有收到；只修 Get橙 → Get蓝，保存后再次点悟空。',
    next: '下一 Part 设计自己的路线色和方向。',
  }),
  'jtw-s2-c4-p7': mission({
    lessonId: 'jtw-s2-c4-p7', mode: 'personal-ship', eyebrow: '西游记 · 第二季 · C4-P7 · Personal Ship', title: '保存我的路线消息',
    body: '从绿、蓝、紫选择路线色，同步配好Send/Get，再选择左路或右路；黄色回执保持不变。',
    mission: '完成个人颜色和方向，点悟空运行、保存、关闭、重开并再次运行。',
    next: '下一 Part 读取真实作品讲回八戒加入。',
  }),
  'jtw-s2-c5-p4': mission({
    lessonId: 'jtw-s2-c5-p4', eyebrow: '西游记 · 第二季 · C5-P4 · Build 1', title: '把两段消息接起来',
    body: '悟空发蓝给八戒；八戒收到后发黄给悟净；悟净最后显示浅水标记。',
    mission: '搭三角色蓝→黄接力并点悟空运行，确认回应按悟空、八戒、悟净顺序发生。',
    next: '下一 Part 加紫色回执回到悟空。',
  }),
  'jtw-s2-c5-p5': mission({
    lessonId: 'jtw-s2-c5-p5', eyebrow: '西游记 · 第二季 · C5-P5 · Build 2', title: '让紫色回执回来',
    body: '前进蓝→黄链保持不变；悟净发紫，悟空Get紫后跳一下并确认路线接通。',
    mission: '给悟净加 Send紫，给悟空加 Get紫 → Hop 1 → Say(路线接上了) → End，再点悟空运行全链。',
    next: '下一 Part 会拿掉八戒的黄色Send。',
  }),
  'jtw-s2-c5-p6': mission({
    lessonId: 'jtw-s2-c5-p6', mode: 'observe-fix', eyebrow: '西游记 · 第二季 · C5-P6 · Debug', title: '找到中间接力断点',
    body: '八戒收到了蓝色却没有继续发黄色。先运行错误版，再只补回中间Send。',
    mission: '先点悟空观察消息停在八戒；补回八戒 Send黄，重跑蓝→黄→紫全链。',
    next: '下一 Part 设计自己的三色接力。',
  }),
  'jtw-s2-c5-p7': mission({
    lessonId: 'jtw-s2-c5-p7', mode: 'personal-ship', eyebrow: '西游记 · 第二季 · C5-P7 · Personal Ship', title: '保存我的三色接力',
    body: '三段使用互不相同的颜色，每段Send/Get仍要成对。',
    mission: '完成三色选择，点悟空运行、保存、关闭、重开并再次运行。',
    next: '下一 Part 读取作品讲回悟净加入。',
  }),
  'jtw-s2-c6-p4': mission({
    lessonId: 'jtw-s2-c6-p4', eyebrow: '西游记 · 第二季 · C6-P4 · Build 1', title: '接好集合页和过桥页',
    body: '玄奘从第一页发蓝进入第二页；八戒接蓝、过桥、发黄进入第三页。',
    mission: '完成第一页与第二页精确脚本，按Go运行并保存三页项目。',
    next: '下一 Part 完成第三页的队伍结尾。',
  }),
  'jtw-s2-c6-p5': mission({
    lessonId: 'jtw-s2-c6-p5', eyebrow: '西游记 · 第二季 · C6-P5 · Build 2', title: '让完整队伍到旗旁',
    body: '悟净接黄显示路牌，白龙马走到旗旁，悟空等真实点击后说出发。',
    mission: '完成第三页三条脚本，逐页运行并保存到稳定End。',
    next: '下一 Part 修复回头页和错色消息。',
  }),
  'jtw-s2-c6-p6': mission({
    lessonId: 'jtw-s2-c6-p6', mode: 'observe-fix', eyebrow: '西游记 · 第二季 · C6-P6 · Debug', title: '一次修一处三页错误',
    body: '第二页错误回到第一页，悟净还等着紫色。两次运行分别留下循环和断点证据。',
    mission: '先修 Page1→Page3 并重跑，再修 Get紫→Get黄并重跑；其余脚本保持不变。',
    next: '下一 Part 制作自己的队伍三页剧。',
  }),
  'jtw-s2-c6-p7': mission({
    lessonId: 'jtw-s2-c6-p7', mode: 'personal-ship', eyebrow: '西游记 · 第二季 · C6-P7 · Personal Ship', title: '保存我的完整队伍剧',
    body: '选择第三页动作和预设对白，让无声模式仍有清楚可见结果。',
    mission: '逐页运行，请同伴无答案图到达End；修改提示后保存、重开并重跑。',
    next: '下一 Part 读取最终作品完成季终Retell。',
  }),
}
