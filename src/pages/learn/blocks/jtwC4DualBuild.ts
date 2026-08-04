import type { Block, BlocksProject } from './blocksModel'

export const JTW_C4_P4_LESSON_ID = 'jtw-s1-c4-p4'
export const JTW_C4_P5_LESSON_ID = 'jtw-s1-c4-p5'
export const JTW_C4_P6_LESSON_ID = 'jtw-s1-c4-p6'
export const JTW_C4_P7_LESSON_ID = 'jtw-s1-c4-p7'
export const JTW_C4_P4_PAGE_ID = 'jtw-c4-p4-page'
export const JTW_C4_WUKONG_ID = 'sun-wukong'
export const JTW_C4_NAME_SCRIPT_ID = 'sun-wukong-name'
export const JTW_C4_SKILL_SCRIPT_ID = 'sun-wukong-skill'
export const JTW_C4_WUKONG_ASSET =
  '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png'

export const JTW_C4_NAME_TARGET: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'show' },
  { op: 'say', text: '我是孙悟空' },
  { op: 'end' },
]

export const JTW_C4_SKILL_TARGET: readonly Block[] = [
  { op: 'when_tap' },
  { op: 'hop', n: 2 },
  { op: 'say', text: '你邀请了我' },
  { op: 'end' },
]

export const JTW_C4_P5_SKILL_TARGETS = {
  leap: [
    { op: 'when_tap' },
    { op: 'hop', n: 2 },
    { op: 'say', text: '我等到邀请了' },
    { op: 'end' },
  ],
  turn: [
    { op: 'when_tap' },
    { op: 'turn_left', n: 2 },
    { op: 'wait', n: 1 },
    { op: 'say', text: '家在那边' },
    { op: 'end' },
  ],
  screen: [
    { op: 'when_tap' },
    { op: 'hide' },
    { op: 'wait', n: 1 },
    { op: 'show' },
    { op: 'say', text: '再看这里' },
    { op: 'end' },
  ],
} as const satisfies Record<string, readonly Block[]>

export const JTW_C4_P7_SKILL_TARGETS = {
  leap: [
    { op: 'when_tap' },
    { op: 'hop', n: 2 },
    { op: 'wait', n: 1 },
    { op: 'say', text: '我等到邀请了' },
    { op: 'end' },
  ],
  turn: JTW_C4_P5_SKILL_TARGETS.turn,
  screen: JTW_C4_P5_SKILL_TARGETS.screen,
} as const satisfies Record<JtwC4P5Version, readonly Block[]>

export type JtwC4P5Version = keyof typeof JTW_C4_P5_SKILL_TARGETS

function skillTarget(version: JtwC4P5Version, trigger: 'when_flag' | 'when_tap'): readonly Block[] {
  return [{ op: trigger }, ...JTW_C4_P5_SKILL_TARGETS[version].slice(1)]
}

function blockMatches(actual: Block | undefined, expected: Block): boolean {
  return (
    actual?.op === expected.op &&
    (expected.n === undefined || actual.n === expected.n) &&
    (expected.text === undefined || actual.text === expected.text)
  )
}

function exactScript(actual: readonly Block[] | undefined, expected: readonly Block[]): boolean {
  return (
    actual?.length === expected.length &&
    expected.every((block, index) => blockMatches(actual[index], block))
  )
}

export function jtwC4DualBuildMatches(project: BlocksProject): boolean {
  if (project.lessonId !== JTW_C4_P4_LESSON_ID || project.pages.length !== 1) return false
  const page = project.pages[0]
  const actor = page?.characters.find((character) => character.id === JTW_C4_WUKONG_ID)
  if (
    page?.id !== JTW_C4_P4_PAGE_ID ||
    !actor ||
    actor.asset !== JTW_C4_WUKONG_ASSET ||
    actor.scripts.length !== 2
  ) {
    return false
  }
  const name = actor.scripts.find((script) => script.id === JTW_C4_NAME_SCRIPT_ID)?.blocks
  const skill = actor.scripts.find((script) => script.id === JTW_C4_SKILL_SCRIPT_ID)?.blocks
  return exactScript(name, JTW_C4_NAME_TARGET) && exactScript(skill, JTW_C4_SKILL_TARGET)
}

export function jtwC4P5BuildVersion(project: BlocksProject): JtwC4P5Version | null {
  return jtwC4SkillVersion(project, JTW_C4_P5_LESSON_ID, 'when_tap')
}

function jtwC4SkillVersion(
  project: BlocksProject,
  lessonId: string,
  trigger: 'when_flag' | 'when_tap',
): JtwC4P5Version | null {
  if (project.lessonId !== lessonId || project.pages.length !== 1) return null
  const page = project.pages[0]
  const actor = page?.characters.find((character) => character.id === JTW_C4_WUKONG_ID)
  if (
    page?.id !== JTW_C4_P4_PAGE_ID ||
    !actor ||
    actor.asset !== JTW_C4_WUKONG_ASSET ||
    actor.scripts.length !== 2
  ) return null
  const name = actor.scripts.find((script) => script.id === JTW_C4_NAME_SCRIPT_ID)?.blocks
  const skill = actor.scripts.find((script) => script.id === JTW_C4_SKILL_SCRIPT_ID)?.blocks
  if (!exactScript(name, JTW_C4_NAME_TARGET)) return null
  return (Object.keys(JTW_C4_P5_SKILL_TARGETS) as JtwC4P5Version[])
    .find((version) => exactScript(skill, skillTarget(version, trigger))) ?? null
}

export function jtwC4P6BugVersion(project: BlocksProject): JtwC4P5Version | null {
  return jtwC4SkillVersion(project, JTW_C4_P6_LESSON_ID, 'when_flag')
}

export function jtwC4P6FixedVersion(project: BlocksProject): JtwC4P5Version | null {
  return jtwC4SkillVersion(project, JTW_C4_P6_LESSON_ID, 'when_tap')
}

export function jtwC4P7BuildVersion(project: BlocksProject): JtwC4P5Version | null {
  if (project.lessonId !== JTW_C4_P7_LESSON_ID || project.pages.length !== 1) return null
  const page = project.pages[0]
  const actor = page?.characters.find((character) => character.id === JTW_C4_WUKONG_ID)
  if (
    page?.id !== JTW_C4_P4_PAGE_ID ||
    !actor ||
    actor.asset !== JTW_C4_WUKONG_ASSET ||
    actor.scripts.length !== 2
  ) return null
  const name = actor.scripts.find((script) => script.id === JTW_C4_NAME_SCRIPT_ID)?.blocks
  const skill = actor.scripts.find((script) => script.id === JTW_C4_SKILL_SCRIPT_ID)?.blocks
  if (!exactScript(name, JTW_C4_NAME_TARGET)) return null
  return (Object.keys(JTW_C4_P7_SKILL_TARGETS) as JtwC4P5Version[])
    .find((version) => exactScript(skill, JTW_C4_P7_SKILL_TARGETS[version])) ?? null
}

export function jtwC4P6TriggerDiff(project: BlocksProject): string[] {
  return jtwC4P6FixedVersion(project) ? ['sun-wukong-skill:when_flag→when_tap'] : []
}

export function jtwC4PlacedBlocks(project: BlocksProject): string[] {
  const actor = project.pages[0]?.characters.find((character) => character.id === JTW_C4_WUKONG_ID)
  return actor?.scripts.flatMap((script) =>
    script.blocks
      .filter((block) => block.op !== 'when_flag' && block.op !== 'when_tap')
      .map((block) => `${script.id}:${block.op}${block.n ? `-${block.n}` : ''}${block.text ? `:${block.text}` : ''}`),
  ) ?? []
}
