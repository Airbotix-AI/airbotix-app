import type { Block, BlocksProject, Character } from './blocksModel'

export const JTW_S2_BAG_LINES = ['带水壶出发', '带书卷出发', '带围巾出发'] as const

const C1_BACKGROUND = 'jtw-s2-c1-changan-to-mountain'
const C2_BACKGROUND = 'jtw-s2-c2-five-elements-mountain'
const C3_BACKGROUND = 'jtw-s2-c3-eagle-sorrow-stream'
const C4_BACKGROUND = 'jtw-s2-c4-gaolao-courtyard'
const C5_BACKGROUND = 'jtw-s2-c5-flowing-sands-river'
const XUANZANG_START = { gx: 2, gy: 9, size: 2, rot: 0 }

const S2_ASSET_ROOT = '/story-blocks/journey-to-the-west'
export const JTW_S2_ASSETS = {
  xuanzang: `${S2_ASSET_ROOT}/characters/xuanzang/neutral-v01.png`,
  wukong: `${S2_ASSET_ROOT}/characters/wukong-traveller/neutral-v01.png`,
  horse: `${S2_ASSET_ROOT}/characters/white-dragon-horse/neutral-v01.png`,
  bajie: `${S2_ASSET_ROOT}/characters/bajie/neutral-v01.png`,
  wujing: `${S2_ASSET_ROOT}/characters/wujing/neutral-v01.png`,
  routeMarker: `${S2_ASSET_ROOT}/props/route-marker/neutral-v01.png`,
  rippleStone: `${S2_ASSET_ROOT}/props/water-ripple-stone/neutral-v01.png`,
} as const

export const JTW_S2_C1_P4_TARGET: Block[] = [
  { op: 'when_flag' },
  { op: 'say', text: '行囊带好' },
  { op: 'move_right', n: 3 },
  { op: 'wait', n: 2 },
  { op: 'move_right', n: 3 },
  { op: 'end' },
]

export const JTW_S2_C1_P5_SIGN_TARGET: Block[] = [
  { op: 'when_tap' },
  { op: 'show' },
  { op: 'say', text: '五行山' },
  { op: 'end' },
]

export const JTW_S2_C1_P6_TARGET: Block[] = [
  { op: 'when_flag' },
  { op: 'say', text: '行囊带好' },
  { op: 'move_right', n: 3 },
  { op: 'wait', n: 2 },
  { op: 'move_right', n: 3 },
  { op: 'say', text: '到了' },
  { op: 'end' },
]

export const JTW_S2_C2_P4_TARGET: Block[] = [
  { op: 'when_flag' },
  { op: 'move_right', n: 3 },
  { op: 'wait', n: 2 },
  { op: 'say', text: '是谁在说话' },
  { op: 'end' },
]

export const JTW_S2_C2_P5_LESSON_ID = 'jtw-s2-c2-p5'
export const JTW_S2_C2_P6_LESSON_ID = 'jtw-s2-c2-p6'
export const JTW_S2_C2_WUKONG_ID = 'wukong-waiting'
export const JTW_S2_C2_P5_WUKONG_TARGET: Block[] = [
  { op: 'when_tap' },
  { op: 'show' },
  { op: 'say', text: '我等的是向西的旅人' },
  { op: 'hop', n: 1 },
  { op: 'end' },
]

export const JTW_S2_C2_P6_WUKONG_BUG: Block[] = [
  { op: 'when_flag' },
  ...JTW_S2_C2_P5_WUKONG_TARGET.slice(1),
]

export const JTW_S2_C2_P7_LESSON_ID = 'jtw-s2-c2-p7'
export const JTW_S2_C2_P7_LINES = ['我来看路', '我来记山', '我们一起走'] as const
export const JTW_S2_C2_P7_ACTIONS = [{ op: 'hop', n: 1 }, { op: 'turn_right', n: 1 }] as const

export const JTW_S2_C3_P4_LESSON_ID = 'jtw-s2-c3-p4'
export const JTW_S2_C3_P5_LESSON_ID = 'jtw-s2-c3-p5'
export const JTW_S2_C3_P6_LESSON_ID = 'jtw-s2-c3-p6'
export const JTW_S2_C3_P7_LESSON_ID = 'jtw-s2-c3-p7'
export const JTW_S2_C3_WUKONG_ID = 'wukong-scout'
export const JTW_S2_C3_STONE_ID = 'water-stone'
export const JTW_S2_C3_HORSE_ID = 'white-dragon-horse'
export const JTW_S2_C3_P4_WUKONG_TARGET: Block[] = [
  { op: 'when_flag' }, { op: 'move_right', n: 4 }, { op: 'say', text: '这里有水纹' },
  { op: 'wait', n: 2 }, { op: 'end' },
]
export const JTW_S2_C3_P4_STONE_TARGET: Block[] = [
  { op: 'when_bump' }, { op: 'grow', n: 1 }, { op: 'play_sound', n: 2, text: 'Chime' }, { op: 'end' },
]
export const JTW_S2_C3_P5_HORSE_TARGET: Block[] = [
  { op: 'when_bump' }, { op: 'show' }, { op: 'say', text: '我愿意同行' }, { op: 'hop', n: 1 }, { op: 'end' },
]
export const JTW_S2_C3_P6_WUKONG_BUG: Block[] = [
  { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'say', text: '这里有水纹' },
  { op: 'wait', n: 2 }, { op: 'end' },
]

export const JTW_S2_BLUE = 5
export const JTW_S2_ORANGE = 2
export const JTW_S2_YELLOW = 3
export const JTW_S2_PURPLE = 6
export const JTW_S2_C4_WUKONG_ID = 'wukong-sender'
export const JTW_S2_C4_BAJIE_ID = 'bajie-receiver'
export const JTW_S2_C4_HORSE_ID = 'white-horse-waiting'
export const JTW_S2_C4_P4_WUKONG_TARGET: Block[] = [
  { op: 'when_tap' }, { op: 'say', text: '请送蓝色路线卡' },
  { op: 'send_message', n: JTW_S2_BLUE }, { op: 'end' },
]
export const JTW_S2_C4_P4_BAJIE_TARGET: Block[] = [
  { op: 'when_message', n: JTW_S2_BLUE }, { op: 'move_right', n: 3 },
  { op: 'say', text: '村口集合' }, { op: 'end' },
]
export const JTW_S2_C4_P5_BAJIE_TARGET: Block[] = [
  ...JTW_S2_C4_P4_BAJIE_TARGET.slice(0, -1), { op: 'send_message', n: JTW_S2_YELLOW }, { op: 'end' },
]
export const JTW_S2_C4_P5_HORSE_TARGET: Block[] = [
  { op: 'when_message', n: JTW_S2_YELLOW }, { op: 'show' }, { op: 'say', text: '收到了' }, { op: 'end' },
]
export const JTW_S2_C4_P7_COLOURS = [4, 5, 6] as const

export const JTW_S2_C5_WUKONG_ID = 'wukong-relay'
export const JTW_S2_C5_BAJIE_ID = 'bajie-relay'
export const JTW_S2_C5_WUJING_ID = 'wujing-relay'
export const JTW_S2_C5_P4_WUKONG_TARGET: Block[] = [
  { op: 'when_tap' }, { op: 'send_message', n: JTW_S2_BLUE }, { op: 'end' },
]
export const JTW_S2_C5_P4_BAJIE_TARGET: Block[] = [
  { op: 'when_message', n: JTW_S2_BLUE }, { op: 'say', text: '我收到了' },
  { op: 'send_message', n: JTW_S2_YELLOW }, { op: 'end' },
]
export const JTW_S2_C5_P4_WUJING_TARGET: Block[] = [
  { op: 'when_message', n: JTW_S2_YELLOW }, { op: 'show' },
  { op: 'say', text: '浅水标记在这里' }, { op: 'end' },
]
export const JTW_S2_C5_P5_WUJING_TARGET: Block[] = [
  ...JTW_S2_C5_P4_WUJING_TARGET.slice(0, -1), { op: 'send_message', n: JTW_S2_PURPLE }, { op: 'end' },
]
export const JTW_S2_C5_P5_WUKONG_REPLY: Block[] = [
  { op: 'when_message', n: JTW_S2_PURPLE }, { op: 'hop', n: 1 },
  { op: 'say', text: '路线接上了' }, { op: 'end' },
]
export const JTW_S2_C6_P1_TARGET: Block[] = [
  { op: 'when_flag' }, { op: 'say', text: '目标很远，我们一页一页走' },
  { op: 'send_message', n: JTW_S2_BLUE }, { op: 'goto_page', n: 2 },
]
export const JTW_S2_C6_P2_TARGET: Block[] = [
  { op: 'when_message', n: JTW_S2_BLUE }, { op: 'move_right', n: 4 },
  { op: 'say', text: '我先核对颜色' }, { op: 'send_message', n: JTW_S2_YELLOW },
  { op: 'goto_page', n: 3 },
]
export const JTW_S2_C6_WUJING_TARGET: Block[] = [
  { op: 'when_message', n: JTW_S2_YELLOW }, { op: 'show' },
  { op: 'say', text: '最后一段，我接住了' }, { op: 'end' },
]
export const JTW_S2_C6_HORSE_TARGET: Block[] = [
  { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'wait', n: 2 }, { op: 'end' },
]
export const JTW_S2_C6_WUKONG_TARGET: Block[] = [
  { op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'say', text: '四人一马，出发' }, { op: 'end' },
]

export function isJtwS2C2P5TapCompletion(
  lessonId: string | undefined,
  characterId: string,
  goCompleted: boolean,
  programMatches: boolean,
): boolean {
  return lessonId === JTW_S2_C2_P5_LESSON_ID && characterId === JTW_S2_C2_WUKONG_ID &&
    goCompleted && programMatches
}

export function isJtwS2C2P6TapCompletion(
  lessonId: string | undefined,
  characterId: string,
  wrongRunObserved: boolean,
  fixedGoObserved: boolean,
  answeredCorrectly: boolean,
  programMatches: boolean,
): boolean {
  return lessonId === JTW_S2_C2_P6_LESSON_ID && characterId === JTW_S2_C2_WUKONG_ID &&
    wrongRunObserved && fixedGoObserved && answeredCorrectly && programMatches
}

export function isJtwS2C2P7TapCompletion(
  lessonId: string | undefined,
  characterId: string,
  goCompleted: boolean,
  programMatches: boolean,
): boolean {
  return lessonId === JTW_S2_C2_P7_LESSON_ID && characterId === JTW_S2_C2_WUKONG_ID &&
    goCompleted && programMatches
}

function sameBlock(actual: Block | undefined, expected: Block): boolean {
  return actual?.op === expected.op && actual.n === expected.n && actual.text === expected.text
}

function sameChain(actual: readonly Block[], expected: readonly Block[]): boolean {
  return actual.length === expected.length && expected.every((block, index) => sameBlock(actual[index], block))
}

function actor(project: BlocksProject, pageId: string, characterId: string): Character | undefined {
  return project.pages.find((page) => page.id === pageId)?.characters.find((item) => item.id === characterId)
}

function xuanzangFrame(project: BlocksProject, pageId: string, background: string): Character | null {
  const page = project.pages.find((item) => item.id === pageId)
  const person = page?.characters.find((item) => item.id === 'xuanzang')
  if (!page || !person || page.background !== background || person.asset !== JTW_S2_ASSETS.xuanzang) return null
  const start = person.start
  return start.gx === XUANZANG_START.gx && start.gy === XUANZANG_START.gy &&
    start.size === XUANZANG_START.size && start.rot === XUANZANG_START.rot ? person : null
}

function c3Actor(project: BlocksProject, lessonId: string, characterId: string): Character | undefined {
  return actor(project, `${lessonId}-page`, characterId)
}

function c3Frame(project: BlocksProject, lessonId: string): boolean {
  const page = project.pages[0]
  const wukong = c3Actor(project, lessonId, JTW_S2_C3_WUKONG_ID)
  const stone = c3Actor(project, lessonId, JTW_S2_C3_STONE_ID)
  const horse = c3Actor(project, lessonId, JTW_S2_C3_HORSE_ID)
  return Boolean(
    page?.id === `${lessonId}-page` && page.background === C3_BACKGROUND && page.characters.length === 3 &&
    wukong && wukong.asset === JTW_S2_ASSETS.wukong && wukong.start.gx === 2 && wukong.start.gy === 8 &&
    stone && stone.asset === JTW_S2_ASSETS.rippleStone && stone.start.gy === 8 &&
    horse && horse.asset === JTW_S2_ASSETS.horse && horse.start.gx === 8 && horse.start.gy === 8 &&
    horse.start.reach === 3 && horse.start.visible === false,
  )
}

function messageActor(project: BlocksProject, lessonId: string, characterId: string, scriptId: string): readonly Block[] {
  return actor(project, `${lessonId}-page`, characterId)?.scripts.find((script) => script.id === scriptId)?.blocks ?? []
}

function c4Frame(project: BlocksProject, lessonId: string): boolean {
  const page = project.pages[0]
  return page?.id === `${lessonId}-page` && page.background === C4_BACKGROUND && page.characters.length === 3
}

function c5Frame(project: BlocksProject, lessonId: string): boolean {
  const page = project.pages[0]
  return page?.id === `${lessonId}-page` && page.background === C5_BACKGROUND && page.characters.length === 3
}

function c6Chain(project: BlocksProject, lessonId: string, page: number, actorId: string, scriptId: string): readonly Block[] {
  return actor(project, `${lessonId}-page-${page}`, actorId)?.scripts.find((script) => script.id === scriptId)?.blocks ?? []
}

function c6Frame(project: BlocksProject, lessonId: string): boolean {
  return project.pages.length === 3 &&
    project.pages[0]?.id === `${lessonId}-page-1` && project.pages[0]?.background === 'jtw-s2-c6-team-gather' &&
    project.pages[1]?.id === `${lessonId}-page-2` && project.pages[1]?.background === 'jtw-s2-c6-team-bridge' &&
    project.pages[2]?.id === `${lessonId}-page-3` && project.pages[2]?.background === 'jtw-s2-c6-team-west'
}

export function jtwS2BuildMatches(project: BlocksProject, lessonId: string): boolean {
  if (project.lessonId !== lessonId) return false
  if (!lessonId.startsWith('jtw-s2-c6-') && project.pages.length !== 1) return false

  if (lessonId === 'jtw-s2-c1-p4') {
    const person = xuanzangFrame(project, 'jtw-s2-c1-p4-page', C1_BACKGROUND)
    const blocks = person?.scripts.find((script) => script.id === 'xuanzang-departure')?.blocks ?? []
    return Boolean(person && project.pages[0].characters.length === 1 && sameChain(blocks, JTW_S2_C1_P4_TARGET))
  }

  if (lessonId === 'jtw-s2-c1-p5') {
    const page = project.pages[0]
    const person = xuanzangFrame(project, 'jtw-s2-c1-p5-page', C1_BACKGROUND)
    const route = person?.scripts.find((script) => script.id === 'xuanzang-departure')?.blocks ?? []
    const sign = actor(project, 'jtw-s2-c1-p5-page', 'five-elements-sign')
    const signBlocks = sign?.scripts.find((script) => script.id === 'mountain-sign-tap')?.blocks ?? []
    return Boolean(
      person && sign && page.characters.length === 2 && sign.asset === JTW_S2_ASSETS.routeMarker &&
      sign.start.gx === 10 && sign.start.gy === 8 && sign.start.visible === false &&
      sameChain(route, JTW_S2_C1_P4_TARGET) && sameChain(signBlocks, JTW_S2_C1_P5_SIGN_TARGET),
    )
  }

  if (lessonId === 'jtw-s2-c1-p6') {
    const person = xuanzangFrame(project, 'jtw-s2-c1-p6-page', C1_BACKGROUND)
    const blocks = person?.scripts.find((script) => script.id === 'xuanzang-departure-debug')?.blocks ?? []
    return Boolean(person && project.pages[0].characters.length === 1 && sameChain(blocks, JTW_S2_C1_P6_TARGET))
  }

  if (lessonId === 'jtw-s2-c1-p7') {
    const person = xuanzangFrame(project, 'jtw-s2-c1-p7-page', C1_BACKGROUND)
    const blocks = person?.scripts.find((script) => script.id === 'xuanzang-personal-departure')?.blocks ?? []
    const bag = blocks[1]
    const pace = blocks[2]
    return Boolean(
      person && project.name === 'My First Westward Departure' &&
      project.pages[0].characters.length === 1 && blocks.length === 8 &&
      blocks[0]?.op === 'when_flag' && bag?.op === 'say' &&
      JTW_S2_BAG_LINES.includes((bag.text ?? '') as (typeof JTW_S2_BAG_LINES)[number]) &&
      pace?.op === 'set_speed' && (pace.n === 1 || pace.n === 2) &&
      sameBlock(blocks[3], { op: 'move_right', n: 3 }) &&
      sameBlock(blocks[4], { op: 'wait', n: 2 }) &&
      sameBlock(blocks[5], { op: 'move_right', n: 3 }) &&
      sameBlock(blocks[6], { op: 'say', text: '到了山下' }) && blocks[7]?.op === 'end',
    )
  }

  if (lessonId === 'jtw-s2-c2-p4') {
    const page = project.pages[0]
    const person = xuanzangFrame(project, 'jtw-s2-c2-p4-page', C2_BACKGROUND)
    const blocks = person?.scripts.find((script) => script.id === 'xuanzang-approaches-mountain')?.blocks ?? []
    const wukong = actor(project, 'jtw-s2-c2-p4-page', 'wukong-waiting')
    const waiting = wukong?.scripts.find((script) => script.id === 'wukong-waits')?.blocks ?? []
    return Boolean(
      person && wukong && page.characters.length === 2 && wukong.asset === JTW_S2_ASSETS.wukong &&
      sameChain(blocks, JTW_S2_C2_P4_TARGET) && sameChain(waiting, [{ op: 'when_tap' }, { op: 'end' }]),
    )
  }

  if (lessonId === JTW_S2_C2_P5_LESSON_ID) {
    const page = project.pages[0]
    const person = xuanzangFrame(project, 'jtw-s2-c2-p5-page', C2_BACKGROUND)
    const approach = person?.scripts.find((script) => script.id === 'xuanzang-approaches-mountain')?.blocks ?? []
    const wukong = actor(project, 'jtw-s2-c2-p5-page', JTW_S2_C2_WUKONG_ID)
    const answer = wukong?.scripts.find((script) => script.id === 'wukong-answers')?.blocks ?? []
    return Boolean(
      person && wukong && page.characters.length === 2 && wukong.asset === JTW_S2_ASSETS.wukong &&
      wukong.start.gx === 12 && wukong.start.gy === 8 && wukong.start.size === 2 &&
      wukong.start.rot === 0 && wukong.start.visible === false &&
      sameChain(approach, JTW_S2_C2_P4_TARGET) && sameChain(answer, JTW_S2_C2_P5_WUKONG_TARGET),
    )
  }

  if (lessonId === JTW_S2_C2_P6_LESSON_ID) {
    const page = project.pages[0]
    const person = xuanzangFrame(project, 'jtw-s2-c2-p6-page', C2_BACKGROUND)
    const approach = person?.scripts.find((script) => script.id === 'xuanzang-approaches-mountain')?.blocks ?? []
    const wukong = actor(project, 'jtw-s2-c2-p6-page', JTW_S2_C2_WUKONG_ID)
    const answer = wukong?.scripts.find((script) => script.id === 'wukong-answers-too-early')?.blocks ?? []
    return Boolean(
      person && wukong && page.characters.length === 2 && wukong.asset === JTW_S2_ASSETS.wukong &&
      wukong.start.gx === 12 && wukong.start.gy === 8 && wukong.start.size === 2 &&
      wukong.start.rot === 0 && wukong.start.visible === false &&
      sameChain(approach, JTW_S2_C2_P4_TARGET) && sameChain(answer, JTW_S2_C2_P5_WUKONG_TARGET),
    )
  }

  if (lessonId === JTW_S2_C2_P7_LESSON_ID) {
    const page = project.pages[0]
    const person = xuanzangFrame(project, 'jtw-s2-c2-p7-page', C2_BACKGROUND)
    const approach = person?.scripts.find((script) => script.id === 'xuanzang-approaches-mountain')?.blocks ?? []
    const wukong = actor(project, 'jtw-s2-c2-p7-page', JTW_S2_C2_WUKONG_ID)
    const blocks = wukong?.scripts.find((script) => script.id === 'wukong-first-step')?.blocks ?? []
    const line = blocks[2]
    const action = blocks[3]
    return Boolean(
      person && wukong && page.characters.length === 2 && wukong.start.visible === false &&
      sameChain(approach, JTW_S2_C2_P4_TARGET) && blocks.length === 5 &&
      sameBlock(blocks[0], { op: 'when_tap' }) && sameBlock(blocks[1], { op: 'show' }) &&
      line?.op === 'say' && JTW_S2_C2_P7_LINES.includes((line.text ?? '') as (typeof JTW_S2_C2_P7_LINES)[number]) &&
      JTW_S2_C2_P7_ACTIONS.some((choice) => sameBlock(action, choice)) && sameBlock(blocks[4], { op: 'end' }),
    )
  }

  if ([JTW_S2_C3_P4_LESSON_ID, JTW_S2_C3_P5_LESSON_ID, JTW_S2_C3_P6_LESSON_ID].includes(lessonId)) {
    const wukong = c3Actor(project, lessonId, JTW_S2_C3_WUKONG_ID)
    const stone = c3Actor(project, lessonId, JTW_S2_C3_STONE_ID)
    const horse = c3Actor(project, lessonId, JTW_S2_C3_HORSE_ID)
    const route = wukong?.scripts.find((script) => script.id === 'wukong-stream-route')?.blocks ?? []
    const ripple = stone?.scripts.find((script) => script.id === 'stone-ripple')?.blocks ?? []
    const welcome = horse?.scripts.find((script) => script.id === 'horse-welcome')?.blocks ?? []
    const needsHorse = lessonId !== JTW_S2_C3_P4_LESSON_ID
    return c3Frame(project, lessonId) && stone?.start.gx === 6 &&
      sameChain(route, JTW_S2_C3_P4_WUKONG_TARGET) && sameChain(ripple, JTW_S2_C3_P4_STONE_TARGET) &&
      (needsHorse ? sameChain(welcome, JTW_S2_C3_P5_HORSE_TARGET) : sameChain(welcome, [{ op: 'when_bump' }, { op: 'end' }]))
  }

  if (lessonId === JTW_S2_C3_P7_LESSON_ID) {
    const wukong = c3Actor(project, lessonId, JTW_S2_C3_WUKONG_ID)
    const stone = c3Actor(project, lessonId, JTW_S2_C3_STONE_ID)
    const horse = c3Actor(project, lessonId, JTW_S2_C3_HORSE_ID)
    const route = wukong?.scripts.find((script) => script.id === 'wukong-stream-route')?.blocks ?? []
    const welcome = horse?.scripts.find((script) => script.id === 'horse-welcome')?.blocks ?? []
    const distance = route[1]?.n
    const versionA: Block[] = [{ op: 'when_bump' }, { op: 'show' }, { op: 'hop', n: 1 }, { op: 'say', text: '欢迎同行' }, { op: 'end' }]
    const versionB: Block[] = [{ op: 'when_bump' }, { op: 'show' }, { op: 'grow', n: 1 }, { op: 'reset_size' }, { op: 'say', text: '我会稳稳同行' }, { op: 'end' }]
    if (!stone) return false
    return c3Frame(project, lessonId) && [5, 6, 7].includes(stone.start.gx) &&
      distance === stone.start.gx - 2 && [3, 4, 5].includes(distance) &&
      route.length === 5 && route[0]?.op === 'when_flag' && route[1]?.op === 'move_right' &&
      sameBlock(route[2], { op: 'say', text: '这里有水纹' }) && sameBlock(route[3], { op: 'wait', n: 2 }) &&
      sameBlock(route[4], { op: 'end' }) &&
      (sameChain(welcome, versionA) || sameChain(welcome, versionB))
  }

  if (['jtw-s2-c4-p4', 'jtw-s2-c4-p5', 'jtw-s2-c4-p6', 'jtw-s2-c4-p7'].includes(lessonId)) {
    const send = messageActor(project, lessonId, JTW_S2_C4_WUKONG_ID, 'wukong-route-send')
    const receive = messageActor(project, lessonId, JTW_S2_C4_BAJIE_ID, 'bajie-route-receive')
    const receipt = messageActor(project, lessonId, JTW_S2_C4_HORSE_ID, 'horse-route-receipt')
    if (!c4Frame(project, lessonId)) return false
    if (lessonId === 'jtw-s2-c4-p4') {
      return sameChain(send, JTW_S2_C4_P4_WUKONG_TARGET) &&
        sameChain(receive, JTW_S2_C4_P4_BAJIE_TARGET) &&
        sameChain(receipt, [{ op: 'when_message', n: JTW_S2_YELLOW }, { op: 'end' }])
    }
    if (lessonId === 'jtw-s2-c4-p5' || lessonId === 'jtw-s2-c4-p6') {
      return sameChain(send, JTW_S2_C4_P4_WUKONG_TARGET) &&
        sameChain(receive, JTW_S2_C4_P5_BAJIE_TARGET) && sameChain(receipt, JTW_S2_C4_P5_HORSE_TARGET)
    }
    const colour = send.find((block) => block.op === 'send_message')?.n
    const get = receive[0]?.n
    const direction = receive[1]
    return JTW_S2_C4_P7_COLOURS.includes(colour as (typeof JTW_S2_C4_P7_COLOURS)[number]) &&
      get === colour && (sameBlock(direction, { op: 'move_right', n: 3 }) || sameBlock(direction, { op: 'move_left', n: 3 })) &&
      sameBlock(receive[2], { op: 'say', text: '村口集合' }) &&
      sameBlock(receive[3], { op: 'send_message', n: JTW_S2_YELLOW }) && receive[4]?.op === 'end' &&
      sameChain(receipt, JTW_S2_C4_P5_HORSE_TARGET)
  }

  if (['jtw-s2-c5-p4', 'jtw-s2-c5-p5', 'jtw-s2-c5-p6', 'jtw-s2-c5-p7'].includes(lessonId)) {
    const send = messageActor(project, lessonId, JTW_S2_C5_WUKONG_ID, 'wukong-relay-send')
    const relay = messageActor(project, lessonId, JTW_S2_C5_BAJIE_ID, 'bajie-relay-forward')
    const receive = messageActor(project, lessonId, JTW_S2_C5_WUJING_ID, 'wujing-relay-receive')
    if (!c5Frame(project, lessonId) || !sameChain(relay, JTW_S2_C5_P4_BAJIE_TARGET)) return false
    if (lessonId === 'jtw-s2-c5-p4') {
      return sameChain(send, JTW_S2_C5_P4_WUKONG_TARGET) && sameChain(receive, JTW_S2_C5_P4_WUJING_TARGET)
    }
    const reply = actor(project, `${lessonId}-page`, JTW_S2_C5_WUKONG_ID)?.scripts
      .find((script) => script.id === 'wukong-relay-receipt')?.blocks ?? []
    if (lessonId === 'jtw-s2-c5-p5' || lessonId === 'jtw-s2-c5-p6') {
      return sameChain(send, JTW_S2_C5_P4_WUKONG_TARGET) &&
        sameChain(receive, JTW_S2_C5_P5_WUJING_TARGET) && sameChain(reply, JTW_S2_C5_P5_WUKONG_REPLY)
    }
    const first = send.find((block) => block.op === 'send_message')?.n
    const second = relay.find((block) => block.op === 'send_message')?.n
    const receipt = receive.find((block) => block.op === 'send_message')?.n
    return [first, second, receipt].every((colour) => [2, 3, 4, 5, 6].includes(colour ?? -1)) &&
      new Set([first, second, receipt]).size === 3 && relay[0]?.n === first && receive[0]?.n === second &&
      reply[0]?.n === receipt && send[0]?.op === 'when_tap' && send.at(-1)?.op === 'end' &&
      relay.at(-1)?.op === 'end' && receive.at(-1)?.op === 'end' && reply.at(-1)?.op === 'end'
  }

  if (['jtw-s2-c6-p4', 'jtw-s2-c6-p5', 'jtw-s2-c6-p6', 'jtw-s2-c6-p7'].includes(lessonId)) {
    if (!c6Frame(project, lessonId)) return false
    const page1 = c6Chain(project, lessonId, 1, 'xuanzang-team', 'xuanzang-team-start')
    const page2 = c6Chain(project, lessonId, 2, 'bajie-team', 'bajie-team-bridge')
    const wujing = c6Chain(project, lessonId, 3, 'wujing-team', 'wujing-team-finish')
    const horse = c6Chain(project, lessonId, 3, 'white-horse-team', 'horse-team-finish')
    const wukong = c6Chain(project, lessonId, 3, 'wukong-team', 'wukong-team-finish')
    if (!sameChain(page1, JTW_S2_C6_P1_TARGET) || !sameChain(page2, JTW_S2_C6_P2_TARGET)) return false
    if (lessonId === 'jtw-s2-c6-p4') {
      return sameChain(wujing, [{ op: 'when_message', n: JTW_S2_YELLOW }, { op: 'end' }])
    }
    if (!sameChain(wujing, JTW_S2_C6_WUJING_TARGET) || !sameChain(horse, JTW_S2_C6_HORSE_TARGET)) return false
    if (lessonId !== 'jtw-s2-c6-p7') return sameChain(wukong, JTW_S2_C6_WUKONG_TARGET)
    return wukong.length === 4 && wukong[0]?.op === 'when_tap' &&
      ['hop', 'grow'].includes(wukong[1]?.op ?? '') && wukong[2]?.op === 'say' && wukong[3]?.op === 'end'
  }

  return false
}
