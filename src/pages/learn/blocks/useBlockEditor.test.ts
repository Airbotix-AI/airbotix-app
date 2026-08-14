import { describe, expect, it } from 'vitest'

import { canRepairEventTrigger } from './useBlockEditor'

describe('canRepairEventTrigger', () => {
  it('uses the observed wrong Go run for Journey West and observed Tap for Tiny Star', () => {
    expect(canRepairEventTrigger('jtw-s1-c4-p6', true, false)).toBe(true)
    expect(canRepairEventTrigger('jtw-s1-c4-p6', false, true)).toBe(false)
    expect(canRepairEventTrigger('tsv-s1-a3-d', false, true)).toBe(true)
  })
})
