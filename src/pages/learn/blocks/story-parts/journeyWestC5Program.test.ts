import { describe, expect, it } from 'vitest'

import { C5_REVERSED_DEMO, C5_ROUTE_ORDER, C5_STATE_DEMO, c5BuildValid, c5Portable } from './journeyWestC5Program'

describe('Journey West C5 size-state contracts', () => {
  it('keeps the source-approved route and two opposite real state demonstrations', () => {
    expect(C5_ROUTE_ORDER).toEqual(['learned-home', 'tools-unfit', 'pillar-shadow'])
    expect(C5_STATE_DEMO.map((block) => block.op)).toEqual(['when_flag', 'grow', 'wait', 'reset_size', 'wait', 'shrink', 'end'])
    expect(C5_REVERSED_DEMO.map((block) => block.op)).toEqual(['when_flag', 'shrink', 'wait', 'reset_size', 'wait', 'grow', 'end'])
  })

  it('requires three meaningful state changes, a readable wait and no Turn distractor', () => {
    expect(c5BuildValid(['grow', 'wait', 'reset_size', 'shrink'])).toBe(true)
    expect(c5BuildValid(['grow', 'reset_size', 'shrink'])).toBe(false)
    expect(c5BuildValid(['grow', 'wait', 'reset_size', 'turn_right', 'shrink'])).toBe(false)
  })

  it('accepts multiple child-owned orders only when the final state is portable', () => {
    expect(c5Portable(['grow', 'wait', 'reset_size', 'shrink'])).toBe(true)
    expect(c5Portable(['shrink', 'wait', 'reset_size', 'grow'])).toBe(false)
  })
})
