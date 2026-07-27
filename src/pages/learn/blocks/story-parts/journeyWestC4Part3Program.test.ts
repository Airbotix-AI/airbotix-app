import { describe, expect, it } from 'vitest'

import { c4p3Resolved } from './journeyWestC4Part3Program'

describe('Journey West C4-P3 event model', () => {
  it('requires the two waiting conditions, prediction, whole-card move and ordered rehearsal', () => {
    expect(c4p3Resolved({
      startMeaning: 'start-waits-scene',
      tapMeaning: 'tap-waits-invitation',
      prediction: 'turn-runs-too-early',
      turnInTap: true,
      rehearsal: ['start', 'tap'],
    })).toBe(true)
  })

  it('does not accept an action left in Start or a Tap-first rehearsal', () => {
    expect(c4p3Resolved({
      startMeaning: 'start-waits-scene',
      tapMeaning: 'tap-waits-invitation',
      prediction: 'turn-runs-too-early',
      turnInTap: false,
      rehearsal: ['start', 'tap'],
    })).toBe(false)
    expect(c4p3Resolved({
      startMeaning: 'start-waits-scene',
      tapMeaning: 'tap-waits-invitation',
      prediction: 'turn-runs-too-early',
      turnInTap: true,
      rehearsal: ['tap', 'start'],
    })).toBe(false)
  })
})
