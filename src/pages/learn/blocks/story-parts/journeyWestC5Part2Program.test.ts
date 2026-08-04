import { describe, expect, it } from 'vitest'

import {
  C5_P2_EXPECTED_OP_TRACE,
  C5_P2_PROJECT,
  c5p2RunDone,
  c5SizeTraceEvidence,
  runC5SizeProject,
} from './journeyWestC5Part2Program'

describe('Journey West C5-P2 size program', () => {
  it('parses and runs the approved starter through the real interpreter', async () => {
    const result = await runC5SizeProject(C5_P2_PROJECT, async () => undefined)

    expect(result.opTrace).toEqual(C5_P2_EXPECTED_OP_TRACE)
    expect(c5SizeTraceEvidence(result)).toEqual([
      'grow:2.2',
      'reset_size:2.0',
      'shrink:1.8',
    ])
    expect(result.finalSize).toBe(1.8)
    expect(c5p2RunDone(result)).toBe(true)
  })

  it('rejects a trace that skips Reset or reports only the final image', async () => {
    const result = await runC5SizeProject(C5_P2_PROJECT, async () => undefined)

    expect(c5p2RunDone({ ...result, opTrace: result.opTrace.filter((op) => op !== 'reset_size') })).toBe(false)
    expect(c5p2RunDone({ ...result, stateTrace: result.stateTrace.slice(-1) })).toBe(false)
  })
})
