import { describe, expect, it } from 'vitest'

import { JTW_S2_BATCH_PART_IDS, JTW_S2_C1_P1_ID, JTW_S2_C1_P2_ID } from './journeyWestSeason2'
import { JOURNEY_WEST_S2_NARRATIONS, journeyWestS2NarrationFor } from './journeyWestS2Narration'

describe('Journey to the West S2 narration catalogue', () => {
  it('provides one complete, stable audio record for every S2 Part', () => {
    const expectedIds = [JTW_S2_C1_P1_ID, JTW_S2_C1_P2_ID, ...JTW_S2_BATCH_PART_IDS]

    expect(JOURNEY_WEST_S2_NARRATIONS).toHaveLength(48)
    expect(new Set(JOURNEY_WEST_S2_NARRATIONS.map((item) => item.partId)).size).toBe(48)
    expect(JOURNEY_WEST_S2_NARRATIONS.map((item) => item.partId)).toEqual(expectedIds)
    expect(JOURNEY_WEST_S2_NARRATIONS.every((item) => item.text.length > item.title.length)).toBe(true)
  })

  it('uses the versioned public audio path for lookup', () => {
    expect(journeyWestS2NarrationFor('jtw-s2-c6-p8')).toMatchObject({
      audioPath: '/story-blocks/journey-to-the-west/audio/s2/jtw-s2-c6-p8-v01.mp3',
    })
    expect(journeyWestS2NarrationFor('jtw-s1-c1-p1')).toBeNull()
  })
})
