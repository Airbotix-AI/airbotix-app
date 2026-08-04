import { listBlocksProjects, loadBlocksProject } from '../blocksApi'
import type { BlocksProject } from '../blocksModel'
import { BlocksRunner } from '../interpreter'
import {
  JTW_C4_P7_LESSON_ID,
  jtwC4P7BuildVersion,
  type JtwC4P5Version,
} from '../jtwC4DualBuild'

export const C4_P7_PART_ID = JTW_C4_P7_LESSON_ID
export const C4_P7_NEXT_PART_ID = 'jtw-s1-c4-p8'
export const C4_P7_CONTINUE_LABEL = '讲回这段故事'

export const C4_P7_STORY_BEFORE = [
  '悟空已经学会先让名字站稳，再等同伴邀请才展示本领。现在轮到他把两条事件路做成自己的认识卡。',
  '作品不能替同伴自动点答案。轻轻的指尖目标只告诉同伴“这里可以试试”；同伴先按Go看见名字，再自己发现并Tap悟空。',
] as const

export const C4_P7_STORY_AFTER =
  '花果山来的石猴没有消失，他从此也叫孙悟空。名字牌和同伴找到的目标点都留在作品里；最后还要讲回远行、得名、学习和等待邀请的因果。'

export const C4_P7_VERSIONS: ReadonlyArray<{
  id: JtwC4P5Version
  title: string
  template: 'blocks_jtw_c4_p7_leap' | 'blocks_jtw_c4_p7_turn' | 'blocks_jtw_c4_p7_screen'
}> = [
  { id: 'leap', title: '叶纹轻跃', template: 'blocks_jtw_c4_p7_leap' },
  { id: 'turn', title: '转身指家', template: 'blocks_jtw_c4_p7_turn' },
  { id: 'screen', title: '屏风再现', template: 'blocks_jtw_c4_p7_screen' },
]

export interface C4P7BuildEvidence {
  projectId: string
  project: BlocksProject
  version: number
  design: JtwC4P5Version
  dualRunCompleted: boolean
  blockCount: number
  childLedBlockCount: number
  endCount: number
}

export async function findC4P7Build(kidId: string): Promise<C4P7BuildEvidence | null> {
  for (const meta of (await listBlocksProjects(kidId)).slice(0, 10)) {
    try {
      const loaded = await loadBlocksProject(meta.id)
      const design = jtwC4P7BuildVersion(loaded.project)
      if (!design) continue
      const blocks = loaded.project.pages.flatMap((page) =>
        page.characters.flatMap((character) =>
          character.scripts.flatMap((script) => script.blocks),
        ),
      )
      return {
        projectId: meta.id,
        project: loaded.project,
        version: loaded.version,
        design,
        dualRunCompleted: Boolean(loaded.storyProgress?.completed[C4_P7_PART_ID]),
        blockCount: blocks.length,
        childLedBlockCount: blocks.filter(
          (block) => block.op !== 'when_flag' && block.op !== 'when_tap',
        ).length,
        endCount: blocks.filter((block) => block.op === 'end').length,
      }
    } catch {
      // Ignore an unreadable legacy project and keep scanning.
    }
  }
  return null
}

export function c4p7BuildComplete(build: C4P7BuildEvidence | null | undefined): boolean {
  return Boolean(
    build?.dualRunCompleted &&
    build.childLedBlockCount >= 7 &&
    build.endCount === 2 &&
    jtwC4P7BuildVersion(build.project) === build.design,
  )
}

export interface C4P7ReopenRunEvidence {
  startTrace: string[]
  tapTrace: string[]
  startStoppedAtEnd: boolean
  tapStoppedAtEnd: boolean
}

export async function runC4P7ReopenedProject(
  project: BlocksProject,
  sleep?: (ms: number) => Promise<void>,
): Promise<C4P7ReopenRunEvidence> {
  const page = project.pages[0]
  const character = page?.characters.find((candidate) => candidate.id === 'sun-wukong')
  if (!page || !character || !jtwC4P7BuildVersion(project)) {
    return { startTrace: [], tapTrace: [], startStoppedAtEnd: false, tapStoppedAtEnd: false }
  }
  const trace: string[] = []
  const runner = new BlocksRunner(page, {
    onSprite: () => undefined,
    onSay: () => undefined,
    onNote: () => undefined,
    onSound: () => undefined,
    onGotoPage: () => undefined,
    onStep: (_characterId, scriptId, index) => {
      if (index < 0) return
      const op = character.scripts.find((script) => script.id === scriptId)?.blocks[index]?.op
      if (op) trace.push(op)
    },
  }, sleep)
  await runner.runFlag()
  const startTrace = ['when_flag', ...trace]
  trace.length = 0
  runner.resetAll()
  await runner.runTap('sun-wukong')
  const tapTrace = ['when_tap', ...trace]
  return {
    startTrace,
    tapTrace,
    startStoppedAtEnd: startTrace.at(-1) === 'end',
    tapStoppedAtEnd: tapTrace.at(-1) === 'end',
  }
}

export function c4p7ReopenRunComplete(run: C4P7ReopenRunEvidence | null): boolean {
  return Boolean(
    run?.startStoppedAtEnd &&
    run.tapStoppedAtEnd &&
    run.startTrace[0] === 'when_flag' &&
    run.tapTrace[0] === 'when_tap',
  )
}
