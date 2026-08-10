import type { Block, BlockOp, BlocksProject, Page } from '../blocksModel'
import { BlocksRunner } from '../interpreter'

export const C6_PART_IDS = Array.from({ length: 10 }, (_, index) => `jtw-s1-c6-p${index + 1}`)
export const C6_EVENT_ORDER = ['job-gap', 'leave', 'title', 'return', 'response', 'mountain']

const block = (op: BlockOp, n?: number, text?: string): Block => ({ op, ...(n ? { n } : {}), ...(text ? { text } : {}) })

export const PAGE_ONE = [block('when_flag'), block('say', undefined, '负责天马'), block('wait', 5), block('set_speed', 2), block('move_right', 2), block('say', undefined, '齐天大圣'), block('goto_page', 2)]
export const PAGE_TWO_BUG = [block('when_flag'), block('set_speed', 3), block('show'), block('say', undefined, '风波升级'), block('show'), block('goto_page', 3)]
export const PAGE_TWO = [block('when_flag'), block('show'), block('wait', 5), block('say', undefined, '天宫回应'), block('set_speed', 1), block('wait', 5), block('goto_page', 3)]
export const PAGE_THREE_BUG = [block('when_flag'), block('say', undefined, '第一程停在这里'), block('wait', 5), block('stop'), block('forever')]
export const PAGE_THREE = [block('when_flag'), block('say', undefined, '第一程停在这里'), block('wait', 5), block('end')]

function page(id: string, blocks: Block[], background: string): Page {
  return { id, background, characters: [{ id: 'wukong', name: 'Wukong', emoji: '🐒', start: { gx: 5, gy: 9, size: 2, rot: 0, visible: true }, scripts: [{ id: `${id}-story`, blocks }] }] }
}

export function c6Project(pageOne = PAGE_ONE, pageTwo = PAGE_TWO, pageThree = PAGE_THREE): BlocksProject {
  return { version: 1, name: "My Monkey King's First Journey", lessonId: 'jtw-s1-c6-p8', pages: [page('page-1', pageOne, 'sky-palace'), page('page-2', pageTwo, 'palace-shadows'), page('page-3', pageThree, 'five-elements-mountain')] }
}

export async function runC6(project: BlocksProject, sleep: (ms: number) => Promise<void> = async () => undefined) {
  const trace: string[] = []
  for (const current of project.pages) {
    const runner = new BlocksRunner(current, {
      onSprite: () => undefined, onSay: (_id, text) => trace.push(`${current.id}:say:${text}`), onNote: () => undefined, onSound: () => undefined,
      onGotoPage: (number) => trace.push(`${current.id}:goto:${number}`), onStep: (_id, _script, index) => { if (index >= 0) trace.push(`${current.id}:${current.characters[0].scripts[0].blocks[index]?.op}`) },
    }, sleep)
    await runner.runFlag()
    const last = current.characters[0].scripts[0].blocks.at(-1)
    if (last?.op === 'goto_page') trace.push(`${current.id}:goto:${last.n}`)
    if (last?.op === 'end') trace.push(`${current.id}:end`)
    if (last?.op === 'forever') trace.push(`${current.id}:planned:forever`)
  }
  return trace
}
