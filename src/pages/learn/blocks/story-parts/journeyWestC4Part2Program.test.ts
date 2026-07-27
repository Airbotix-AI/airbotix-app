import { describe, expect, it } from 'vitest'

import { BlocksRunner } from '../interpreter'
import {
  C4_P2_CHARACTER_ID,
  C4_P2_STARTER_PROJECT,
  C4_P2_START_TRACE,
  C4_P2_TAP_TRACE,
  c4p2TraceMatches,
} from './journeyWestC4Part2Program'

describe('Journey West C4-P2 approved observation starter', () => {
  it('measures the premature Hop on Go without launching the Tap chain', async () => {
    const trace: string[] = []
    const page = C4_P2_STARTER_PROJECT.pages[0]
    const character = page.characters[0]
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
    }, async () => undefined)

    await runner.runFlag()

    expect(trace).toEqual(C4_P2_START_TRACE)
    expect(trace).not.toContain('turn_right')
  })

  it('runs only the invited Tap chain after reset', async () => {
    const trace: string[] = []
    const page = C4_P2_STARTER_PROJECT.pages[0]
    const character = page.characters[0]
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
    }, async () => undefined)

    runner.resetAll()
    await runner.runTap(C4_P2_CHARACTER_ID)

    expect(trace).toEqual(C4_P2_TAP_TRACE)
    expect(trace).not.toContain('say')
    expect(trace).not.toContain('hop')
  })

  it('requires exact ordered traces', () => {
    expect(c4p2TraceMatches(['show', 'say', 'hop', 'end'], C4_P2_START_TRACE)).toBe(true)
    expect(c4p2TraceMatches(['show', 'say', 'end'], C4_P2_START_TRACE)).toBe(false)
    expect(c4p2TraceMatches(['turn_right', 'end', 'hop'], C4_P2_TAP_TRACE)).toBe(false)
  })
})
