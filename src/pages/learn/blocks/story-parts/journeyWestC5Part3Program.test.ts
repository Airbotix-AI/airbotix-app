import { describe, expect, it } from 'vitest'

import {
  C5_P3_FIRST_PROJECT,
  C5_P3_ORDER_ONE,
  C5_P3_ORDER_TWO,
  C5_P3_SECOND_PROJECT,
  c5p3RunsDiffer,
  runC5P3Variant,
} from './journeyWestC5Part3Program'

describe('Journey West C5-P3 two-order model', () => {
  it('runs both card orders through the real interpreter and keeps different endings', async () => {
    const first = await runC5P3Variant(C5_P3_FIRST_PROJECT, async () => undefined)
    const second = await runC5P3Variant(C5_P3_SECOND_PROJECT, async () => undefined)

    expect(first.stateTrace.map((step) => step.op)).toEqual(C5_P3_ORDER_ONE)
    expect(second.stateTrace.map((step) => step.op)).toEqual(C5_P3_ORDER_TWO)
    expect(first.finalSize).toBe(1.8)
    expect(second.finalSize).toBe(2.2)
    expect(c5p3RunsDiffer(first, second)).toBe(true)
  })

  it('does not accept one run twice as two pieces of evidence', async () => {
    const first = await runC5P3Variant(C5_P3_FIRST_PROJECT, async () => undefined)
    expect(c5p3RunsDiffer(first, first)).toBe(false)
  })
})
