import {
  JTW_S2_BATCH_PART_IDS,
  JTW_S2_C1_P1_ID,
  JTW_S2_C1_P2_ID,
  JTW_S2_PART_CONFIGS,
  S2_C1_P1_STORY,
  S2_C1_P2_STORY,
} from './journeyWestSeason2'

const AUDIO_ROOT = '/story-blocks/journey-to-the-west/audio/s2'

export interface JourneyWestS2Narration {
  partId: string
  title: string
  story: readonly string[]
  text: string
  audioPath: string
}

function narration(partId: string, title: string, story: readonly string[]): JourneyWestS2Narration {
  return {
    partId,
    title,
    story,
    text: [title, ...story].join('。'),
    audioPath: `${AUDIO_ROOT}/${partId}-v01.mp3`,
  }
}

export const JOURNEY_WEST_S2_NARRATIONS: readonly JourneyWestS2Narration[] = [
  narration(JTW_S2_C1_P1_ID, '把很远的路，变成今天的三步', S2_C1_P1_STORY),
  narration(JTW_S2_C1_P2_ID, '纸条为什么只有三行？', S2_C1_P2_STORY),
  ...JTW_S2_BATCH_PART_IDS.map((partId) => {
    const config = JTW_S2_PART_CONFIGS[partId]
    return narration(partId, config.title, config.story)
  }),
]

const NARRATION_BY_PART_ID = new Map(JOURNEY_WEST_S2_NARRATIONS.map((item) => [item.partId, item]))

export function journeyWestS2NarrationFor(partId: string): JourneyWestS2Narration | null {
  return NARRATION_BY_PART_ID.get(partId) ?? null
}
