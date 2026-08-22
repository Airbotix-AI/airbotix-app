import { JTW_S1_CHAPTERS } from './journeyWestSeason1'
import {
  JOURNEY_WEST_S2_NARRATIONS,
  type JourneyWestS2Narration,
} from './journeyWestS2Narration'

const AUDIO_ROOT = '/story-blocks/journey-to-the-west/audio/en-AU'

export interface JourneyWestNarration {
  partId: string
  title: string
  text: string
  audioPath: string
}

const S1_SUMMARIES = [
  'Morning reaches Flower-Fruit Mountain. A magic stone begins to glow, while the monkeys hide behind the leaves and watch.',
  'The stone opens and the Stone Monkey appears. Show, Hop and Say must happen in a clear order.',
  'Before coding, put the four story actions in order: the chime, the appearance, the jump and the greeting.',
  'Build the full arrival sequence so the Stone Monkey can appear, jump, speak and finish.',
  'Choose how the Stone Monkey greets his new friends. Both kind choices can tell a clear story.',
  'A sound plays before the Stone Monkey appears. Find the first block that makes the story order wrong.',
  'Create your own Stone Monkey entrance, then save it, reopen it and run it again.',
  'Retell how the Stone Monkey arrived and heard water nearby. The next chapter begins at the waterfall.',
  'The monkeys follow the sound of water to a waterfall and look for clues about what may be behind it.',
  'They promise that anyone who enters, returns and explains the way will become their leader.',
  'Plan a safe route across three sections of wet stone before touching the blocks.',
  'Move the exact number of squares needed to reach the water curtain, with no extra step.',
  'When the Stone Monkey bumps the water curtain, the curtain hides and the cave entrance appears.',
  'The return route starts in the wrong place. Compare the expected path with the real run and fix the first difference.',
  'Turn one brave discovery into a route that every monkey can follow safely.',
  'The Stone Monkey keeps his promise, returns to his friends and becomes the Monkey King.',
  'Water Curtain Cave is a happy home, but the Monkey King still has questions and wants to learn.',
  'Plan a three-page journey: leave home, cross the sea and arrive where a teacher can be found.',
  'A Page block is an exit, not a decoration. Its number decides which page runs next.',
  'Build the middle of the sea so it contains both meaningful action and a working page exit.',
  'Use the starry night and morning mist to show careful observation without changing the classic story.',
  'The raft begins Page Two in the wrong square. Move it home and test the journey again.',
  'Create your own three-page journey to seek a teacher, then save, reopen and rerun it.',
  'Arriving is not the same as learning. Retell the long search and get ready to meet the teacher.',
  'At the mountain gate, the traveller explains where he came from and why he wants to learn.',
  'The teacher gives him the name Sun Wukong. The new name marks a new beginning.',
  'Start reveals the name, while Tap begins a separate practice. Keep the two events apart.',
  'Build the name reveal first, then let the practice respond only when the audience taps.',
  'Sun Wukong learns that skill is not for showing off or racing to be first.',
  'The practice starts too early. Find the first event error and change only the block that caused it.',
  'Create a short practice that shows who Sun Wukong is, what he learned and how he waits for the audience.',
  'Retell how the traveller became Sun Wukong and carried his name back towards home.',
  'In the Dragon King’s palace, Wukong sees a great pillar beneath the sea and wonders what it can do.',
  'Predict the size left by each Grow, Shrink and Reset block before running the program.',
  'Use three clear sizes so the audience can see the staff change state.',
  'Build the complete size experiment and finish with the Golden-Hooped Staff at the intended size.',
  'The biggest size is not always the best. Choose a size that fits the story and the stage.',
  'Reset is at the wrong end of the script. Find the first mismatch, move it and run the test again.',
  'Create your own size-changing staff story, then save, reopen and prove that it still works.',
  'Wukong leaves with the Golden-Hooped Staff and explains what each size change did.',
  'Six chapter seals lead from Flower-Fruit Mountain towards the cloud roads of Heaven.',
  'Feeling rushed is not the same as choosing a fast speed. Compare the feeling with the program evidence.',
  'Six events cannot all happen at once. Place them in an order the audience can follow.',
  'On Page One, show the difference between Wukong’s identity and the duty Heaven gives him.',
  'On Page Two, keep Wukong’s action separate from the official’s response.',
  'Create a clear rhythm for your own Monkey King prequel, using speed, waits and visible action.',
  'The journey reaches Five Elements Mountain, but the larger story is not finished.',
  'Build and save a three-page prequel that connects Flower-Fruit Mountain, Heaven and Five Elements Mountain.',
  'Use six seals and four because-statements to explain the choices, programs and results across the season.',
  'Season One ends here. Retell the complete first journey and prepare for Xuanzang’s arrival in Season Two.',
] as const

const s1Parts = JTW_S1_CHAPTERS.flatMap((chapter) => chapter.parts)

if (s1Parts.length !== S1_SUMMARIES.length) {
  throw new Error(`Journey West S1 narration mismatch: ${s1Parts.length} parts, ${S1_SUMMARIES.length} summaries`)
}

export const JOURNEY_WEST_S1_NARRATIONS: readonly JourneyWestNarration[] = s1Parts.map(
  (part, index) => ({
    partId: part.id,
    title: part.title,
    text: `${part.title}. ${S1_SUMMARIES[index]}`,
    audioPath: `${AUDIO_ROOT}/s1/${part.id}-v02.mp3`,
  }),
)

const s2Narrations: readonly JourneyWestNarration[] = JOURNEY_WEST_S2_NARRATIONS.map(
  (narration: JourneyWestS2Narration) => ({
    partId: narration.partId,
    title: narration.title,
    text: narration.text,
    audioPath: `${AUDIO_ROOT}/s2/${narration.partId}-v02.mp3`,
  }),
)

export const JOURNEY_WEST_NARRATIONS: readonly JourneyWestNarration[] = [
  ...JOURNEY_WEST_S1_NARRATIONS,
  ...s2Narrations,
]

const NARRATION_BY_PART_ID = new Map(JOURNEY_WEST_NARRATIONS.map((item) => [item.partId, item]))

export function journeyWestNarrationFor(partId: string): JourneyWestNarration | null {
  return NARRATION_BY_PART_ID.get(partId) ?? null
}
