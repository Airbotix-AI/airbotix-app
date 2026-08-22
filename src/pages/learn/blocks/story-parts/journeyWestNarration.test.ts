import { describe, expect, it } from 'vitest'

import { JOURNEY_WEST_NARRATIONS, journeyWestNarrationFor } from './journeyWestNarration'

describe('Journey to the West English narration catalogue', () => {
  it('provides one fixed Australian English recording for every S1 and S2 Part', () => {
    expect(JOURNEY_WEST_NARRATIONS).toHaveLength(98)
    expect(new Set(JOURNEY_WEST_NARRATIONS.map((item) => item.partId)).size).toBe(98)
    expect(JOURNEY_WEST_NARRATIONS.filter((item) => item.partId.startsWith('jtw-s1-'))).toHaveLength(
      50,
    )
    expect(JOURNEY_WEST_NARRATIONS.filter((item) => item.partId.startsWith('jtw-s2-'))).toHaveLength(
      48,
    )
    expect(JOURNEY_WEST_NARRATIONS.every((item) => item.text.length > item.title.length)).toBe(
      true,
    )
    expect(JOURNEY_WEST_NARRATIONS.some((item) => /\p{Script=Han}/u.test(item.text))).toBe(false)
  })

  it('uses cache-busted en-AU public audio paths for both seasons', () => {
    expect(journeyWestNarrationFor('jtw-s1-c1-p1')).toMatchObject({
      audioPath:
        '/story-blocks/journey-to-the-west/audio/en-AU/s1/jtw-s1-c1-p1-v02.mp3',
    })
    expect(journeyWestNarrationFor('jtw-s2-c6-p8')).toMatchObject({
      audioPath:
        '/story-blocks/journey-to-the-west/audio/en-AU/s2/jtw-s2-c6-p8-v02.mp3',
    })
    expect(journeyWestNarrationFor('jtw-s3-c1-p1')).toBeNull()
  })
})
