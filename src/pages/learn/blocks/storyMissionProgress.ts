import type { Block, BlocksProject, Character } from './blocksModel';
import { JTW_GREETING_CHOICES, jtwPersonalArrivalDesign } from './jtwPersonalArrival';
import { jtwPersonalEntryDesign } from './jtwPersonalEntry';
import { jtwC3JumpFixComplete } from './jtwC3JumpFix';
import { jtwC3RouteComplete } from './jtwC3PersonalRoute';
import { jtwC3SeaBuildComplete } from './jtwC3SeaBuild';
import { jtwC3WeatherBuildComplete } from './jtwC3WeatherBuild';
import { c2p5ProgramMatches } from './story-parts/journeyWestC2Part5Program';
import {
  JTW_C4_P4_LESSON_ID,
  JTW_C4_P5_LESSON_ID,
  JTW_C4_P6_LESSON_ID,
  JTW_C4_P7_LESSON_ID,
  jtwC4DualBuildMatches,
  jtwC4P5BuildVersion,
  jtwC4P6FixedVersion,
  jtwC4P7BuildVersion,
} from './jtwC4DualBuild';
import {
  JTW_MISSION_CONTRACTS,
  type StoryMissionProgramContract,
} from './storyMissionContracts.jtw';
import {
  TINY_STAR_BELL_BUILD_PAGE_ID,
  TINY_STAR_BELL_BUILD_ROUTE,
  TINY_STAR_BELL_FINALE_PAGE_ID,
  TINY_STAR_BELL_FINALE_TARGET,
  TINY_STAR_BELL_FIX_PAGE_ID,
  TINY_STAR_BELL_HOOK_PAGE_ID,
  TINY_STAR_BELL_HOOK_ROUTE,
  TINY_STAR_BELL_STAGE_CONTRACT,
  TINY_STAR_FINALE_LINES,
  TINY_STAR_FINALE_RINGER_ID,
  TINY_STAR_FINALE_RINGER_SCRIPT_ID,
  tinyStarBellOrderRepaired,
  tinyStarBellRouteUnchanged,
  tinyStarBellStepAdded,
  tinyStarFinaleDesign,
} from './tinyStarBellTower';
import {
  TINY_STAR_DUET_GREETINGS,
  TINY_STAR_DUET_HOP_N,
  TINY_STAR_DUET_SECOND_GX,
  TINY_STAR_DUET_SECOND_ID,
  TINY_STAR_DUET_SECOND_SCRIPT,
  tinyStarDuetDesign,
} from './tinyStarDuet';
import {
  TINY_STAR_A2_RIGHT_BACKGROUND,
  TINY_STAR_A2_START_GX,
  TINY_STAR_BREAKFAST_CART_ASSET,
  TINY_STAR_BREAKFAST_CART_ID,
  TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE,
  TINY_STAR_DELIVERY_START_GX,
  tinyStarA2TargetGx,
  tinyStarBreakfastCartAssetIsKnown,
  tinyStarDeliveryDesign,
} from './tinyStarStageTargets';

const LUMILO_CHARACTER = 'little-light';
const LUMILO_FLAG_SCRIPT = 'little-light-flag';
const LUMILO_ASSET = '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png';

export const TINY_STAR_GREETING_CHOICES = [
  'Good morning, village!',
  "I'm awake!",
  "Let's go!",
] as const;

/** A5-H: the greeting stage keeps both friends on one row (scene-specs §6). */
export const TINY_STAR_GREETING_GY = 10;

/**
 * A5-H: the two greeting voices the Explore stage ships (scene-specs §6/A5-H).
 * Both chains are already complete and identical in shape, so the real runner
 * starts them in the same tick — the collision IS the lesson. The Hook only
 * counts as observed while BOTH chains are still the untouched ones below; the
 * Wait block that separates them belongs to A5-B.
 */
export const TINY_STAR_GREETING_VOICES = [
  {
    characterId: LUMILO_CHARACTER,
    scriptId: 'little-light-greeting',
    asset: LUMILO_ASSET,
    gx: 7,
    text: 'Morning!',
  },
  {
    characterId: 'tuan-tuan',
    scriptId: 'tuan-tuan-greeting',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
    gx: 12,
    text: 'Morning too!',
  },
] as const;

/** A5-H: how many speech bubbles must be open at once to prove the overlap. */
export const TINY_STAR_OVERLAPPING_VOICES = TINY_STAR_GREETING_VOICES.length;

/**
 * A5-B: the Wait the child gives Tuan Tuan, in the block's own units (tenths of
 * a second — the interpreter sleeps `n * 100 ms`). Five is the Wait block's
 * shipped default, so a child who taps Wait in the Control palette never has to
 * open the number editor; tuning the number is A5-D's lesson, not this one.
 */
export const TINY_STAR_TURN_WAIT_N = 5;

/**
 * A5-B: the head start a real run must measure between the two greetings before
 * the turn counts. Half the modelled 500 ms absorbs timer jitter while staying
 * far above the sub-millisecond gap the A5-H collision produces, where both
 * chains open their bubbles inside one interpreter tick.
 *
 * Runtime ceiling worth knowing (measured against `interpreter.ts`): a speech
 * bubble stays up for `SAY_MS = 1400 ms` and `MAX_PARAM` caps Wait at 9, i.e.
 * 900 ms — so no Wait this runtime can express makes the two bubbles stop
 * overlapping. A5-B therefore proves "Tuan Tuan starts later", which is the
 * scene's own assertion, and never claims the bubbles are separated.
 */
export const TINY_STAR_TURN_MIN_GAP_MS = (TINY_STAR_TURN_WAIT_N * 100) / 2;

/**
 * A5-D: how long one `hop 1` lasts, measured against `interpreter.ts` — the hop
 * sleeps `STEP_MS * n` up and `STEP_MS * n` down, so a one-space bounce occupies
 * `2 * 180 = 360 ms`. Everything this scene judges is expressed in bounces.
 *
 * A5-D is the chapter's Fix scene and it deliberately does NOT use Say. A5-B
 * measured the ceiling: a bubble lives `SAY_MS = 1400 ms` while `MAX_PARAM`
 * caps Wait at 900 ms, so with two Says NO Wait this runtime can express is
 * "too long" — the bubbles overlap at every legal value, and the spec's
 * `wait 20` is clamped to 9 by `parseProject`. The bounce IS shorter than the
 * longest Wait, so the action relay that scene-specs §6 ("主反馈使用Hop/Pop动作
 * 接力") and teaching script §7.5 already sanction is the only shape in which
 * "等太久了" is a real, measurable difference rather than a bigger number.
 */
export const TINY_STAR_BOUNCE_MS = 360;

/**
 * A5-D: the Wait values that make the second bounce land in time, in the block's
 * own units (`wait n` sleeps `n * 100 ms`). The rule the child learns is
 * "bounce back after your friend lands, before the stage has stood still as long
 * as a bounce lasts", i.e. a delay inside
 * `[TINY_STAR_BOUNCE_MS, 2 * TINY_STAR_BOUNCE_MS]` = 360…720 ms. There is
 * deliberately no single right number: teaching script §7.6 Checkpoint B asks
 * the child to find a "just right" wait, not to believe bigger is better.
 */
export const TINY_STAR_RELAY_WAITS = [4, 5, 6, 7] as const;

/** A5-D: the Wait the starter ships — `MAX_PARAM`, the longest this runtime has. */
export const TINY_STAR_RELAY_BUG_WAIT_N = 9;

/** A5-D: the second bounce may not lift off before the first one has landed. */
export const TINY_STAR_RELAY_MIN_GAP_MS = TINY_STAR_BOUNCE_MS;

/**
 * A5-D: measurement slack on the ceiling only. A sleeping timer can fire late
 * but never early, so a measured gap is always ≥ the modelled one: the floor
 * needs no allowance, while the ceiling would otherwise punish a child whose
 * correct `wait 7` (700 ms) was delayed by a slow frame.
 */
export const TINY_STAR_RELAY_JITTER_MS = 120;

/** A5-D: past this the stage has been empty for a whole extra bounce. */
export const TINY_STAR_RELAY_MAX_GAP_MS = 2 * TINY_STAR_BOUNCE_MS + TINY_STAR_RELAY_JITTER_MS;

/**
 * A5-D: the two friends of the bounce relay. Lumilo leads with a plain
 * `Start → Hop 1 → End` and is the fixed half of the scene — the child may only
 * retune Tuan Tuan's hourglass, exactly as A4-D let them retune only a distance.
 */
export const TINY_STAR_BOUNCE_ACTORS = [
  {
    characterId: LUMILO_CHARACTER,
    scriptId: 'little-light-bounce',
    asset: LUMILO_ASSET,
    gx: TINY_STAR_GREETING_VOICES[0].gx,
  },
  {
    characterId: TINY_STAR_GREETING_VOICES[1].characterId,
    scriptId: 'tuan-tuan-bounce',
    asset: TINY_STAR_GREETING_VOICES[1].asset,
    gx: TINY_STAR_GREETING_VOICES[1].gx,
  },
] as const;

const LUMI_MORNING_TARGET: Block[] = [
  { op: 'when_flag' },
  { op: 'hop', n: 1 },
  { op: 'say', text: 'Morning!' },
  { op: 'end' },
];

const LUMI_CONTRACT = {
  background: 'tsv-window-room-dim',
  characterId: LUMILO_CHARACTER,
  scriptId: LUMILO_FLAG_SCRIPT,
  asset: LUMILO_ASSET,
};

const TINY_STAR_MISSION_CONTRACTS: Record<string, StoryMissionProgramContract> = {
  'tsv-s1-a1-h': { ...LUMI_CONTRACT, pageId: 'tsv-a1-h-page', target: LUMI_MORNING_TARGET },
  'tsv-s1-a1-b': { ...LUMI_CONTRACT, pageId: 'tsv-a1-b-page', target: LUMI_MORNING_TARGET },
  'tsv-s1-a1-d': { ...LUMI_CONTRACT, pageId: 'tsv-a1-d-page', target: LUMI_MORNING_TARGET },
  'tsv-s1-a1-s': {
    ...LUMI_CONTRACT,
    pageId: 'tsv-a1-s-page',
    target: LUMI_MORNING_TARGET,
    allowedSayText: TINY_STAR_GREETING_CHOICES,
  },
  'tsv-s1-a2-h': {
    pageId: 'tsv-a2-h-page',
    background: TINY_STAR_A2_RIGHT_BACKGROUND,
    characterId: 'tuan-tuan',
    scriptId: 'tuan-tuan-flag',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
    start: { gx: TINY_STAR_A2_START_GX, gy: 10, size: 1, rot: 0 },
    characterCount: 1,
    target: [{ op: 'when_flag' }, { op: 'move_left', n: 3 }, { op: 'end' }],
  },
  'tsv-s1-a2-b': {
    pageId: 'tsv-a2-b-page',
    background: TINY_STAR_A2_RIGHT_BACKGROUND,
    characterId: 'tuan-tuan',
    scriptId: 'tuan-tuan-flag',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
    start: { gx: TINY_STAR_A2_START_GX, gy: 10, size: 1, rot: 0 },
    characterCount: 1,
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' }],
  },
  'tsv-s1-a2-d': {
    pageId: 'tsv-a2-d-page',
    background: TINY_STAR_A2_RIGHT_BACKGROUND,
    characterId: 'tuan-tuan',
    scriptId: 'tuan-tuan-flag',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
    start: { gx: TINY_STAR_A2_START_GX, gy: 10, size: 1, rot: 0 },
    characterCount: 1,
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' }],
  },
  'tsv-s1-a2-s': {
    pageId: 'tsv-a2-s-page',
    background: TINY_STAR_A2_RIGHT_BACKGROUND,
    characterId: 'tuan-tuan',
    scriptId: 'tuan-tuan-flag',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
    start: { gx: TINY_STAR_A2_START_GX, gy: 10, size: 1, rot: 0 },
    characterCount: 1,
    target: [
      { op: 'when_flag' },
      { op: 'move_right', n: 1 },
      { op: 'move_right', n: 1 },
      { op: 'end' },
    ],
  },
  'tsv-s1-a3-h': {
    pageId: 'tsv-a3-h-page',
    background: 'tsv-rooftop',
    characterId: 'dot-dot',
    scriptId: 'dot-dot-tap',
    asset: '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
    start: { gx: 10, gy: 8, size: 1, rot: 0 },
    target: [
      { op: 'when_tap' },
      { op: 'hop', n: 1 },
      { op: 'say', text: "I'm awake!" },
      { op: 'end' },
    ],
  },
  'tsv-s1-a3-b': {
    pageId: 'tsv-a3-b-page',
    background: 'tsv-rooftop',
    characterId: 'dot-dot',
    scriptId: 'dot-dot-tap',
    asset: '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
    start: { gx: 10, gy: 8, size: 1, rot: 0 },
    target: [{ op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'end' }],
  },
  'tsv-s1-a3-d': {
    pageId: 'tsv-a3-d-page',
    background: 'tsv-rooftop',
    characterId: 'dot-dot',
    scriptId: 'dot-dot-event',
    asset: '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
    start: { gx: 10, gy: 8, size: 1, rot: 0 },
    target: [{ op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'end' }],
  },
  'tsv-s1-a3-s': {
    pageId: 'tsv-a3-s-page',
    background: 'tsv-rooftop',
    characterId: 'dot-dot',
    scriptId: 'dot-dot-surprise',
    asset: '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
    start: { gx: 10, gy: 8, size: 1, rot: 0 },
    target: [{ op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'end' }],
  },
  'tsv-s1-a4-h': {
    pageId: 'tsv-a4-h-page',
    background: TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[3],
    characterId: 'breakfast-cart',
    scriptId: 'breakfast-cart-flag',
    asset: TINY_STAR_BREAKFAST_CART_ASSET,
    start: { gx: 4, gy: 10, size: 1, rot: 0 },
    characterCount: 1,
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 1 }, { op: 'end' }],
  },
  'tsv-s1-a4-b': {
    pageId: 'tsv-a4-b-page',
    background: TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[3],
    characterId: 'breakfast-cart',
    scriptId: 'breakfast-cart-build',
    asset: TINY_STAR_BREAKFAST_CART_ASSET,
    start: { gx: 4, gy: 10, size: 1, rot: 0 },
    characterCount: 1,
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' }],
  },
  'tsv-s1-a4-d': {
    pageId: 'tsv-a4-d-page',
    background: TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[3],
    characterId: 'breakfast-cart',
    scriptId: 'breakfast-cart-debug',
    asset: TINY_STAR_BREAKFAST_CART_ASSET,
    start: { gx: 4, gy: 10, size: 1, rot: 0 },
    characterCount: 1,
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' }],
  },
  // Tiny Star Village S1/A4-S — the chapter's Personal Ship (scene-specs A4-S).
  // Three things are the CHILD's: where the delivery stop sits (1–3 spaces right
  // of the cart), which parcel it carries, and the movement number. The bespoke
  // branch below validates that the number matches the chosen distance, so there
  // is no single correct answer; `target` records one legal example for tooling.
  'tsv-s1-a4-s': {
    pageId: 'tsv-a4-s-page',
    background: TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[1],
    characterId: 'breakfast-cart',
    scriptId: 'breakfast-cart-ship',
    asset: TINY_STAR_BREAKFAST_CART_ASSET,
    start: { gx: TINY_STAR_DELIVERY_START_GX, gy: 10, size: 1, rot: 0 },
    characterCount: 1,
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' }],
  },
  // Tiny Star Village S1/A5-H — chapter five's Story Hook (scene-specs A5-H).
  // The page carries TWO scripted voices, so the generic single-character match
  // is not enough: the bespoke branch below checks both chains. `characterId` /
  // `scriptId` / `target` name Lumilo's half for the shared tooling (script
  // lookup, coach cues) and are not the whole contract.
  'tsv-s1-a5-h': {
    pageId: 'tsv-a5-h-page',
    background: 'tsv-greeting-stage',
    characterId: LUMILO_CHARACTER,
    scriptId: TINY_STAR_GREETING_VOICES[0].scriptId,
    asset: LUMILO_ASSET,
    start: { gx: TINY_STAR_GREETING_VOICES[0].gx, gy: TINY_STAR_GREETING_GY, size: 1, rot: 0 },
    target: [
      { op: 'when_flag' },
      { op: 'say', text: TINY_STAR_GREETING_VOICES[0].text },
      { op: 'end' },
    ],
  },
  // Tiny Star Village S1/A5-B — chapter five's Logic Build (scene-specs A5-B).
  // The stage is A5-H's, but Tuan Tuan's chain is the one under construction:
  // the child adds the Wait and decides where it goes. Only a Wait BEFORE the
  // Say delays the second greeting, so `target` is exact; the bespoke branch
  // below additionally keeps Lumilo's chain out of bounds.
  'tsv-s1-a5-b': {
    pageId: 'tsv-a5-b-page',
    background: 'tsv-greeting-stage',
    characterId: TINY_STAR_GREETING_VOICES[1].characterId,
    scriptId: TINY_STAR_GREETING_VOICES[1].scriptId,
    asset: TINY_STAR_GREETING_VOICES[1].asset,
    start: { gx: TINY_STAR_GREETING_VOICES[1].gx, gy: TINY_STAR_GREETING_GY, size: 1, rot: 0 },
    target: [
      { op: 'when_flag' },
      { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
      { op: 'say', text: TINY_STAR_GREETING_VOICES[1].text },
      { op: 'end' },
    ],
  },
  // Tiny Star Village S1/A5-D — chapter five's Twist & Debug (scene-specs A5-D).
  // The greeting stage keeps its friends and its locked village background, but the
  // morning hello is now a BOUNCE relay: the runtime cannot make two Says stop
  // overlapping (see TINY_STAR_BOUNCE_MS), and a bounce is short enough that
  // "waited too long" becomes a real, watchable pause. The starter ships
  // Tuan Tuan on `wait 9` and the child may only retune that number, so several
  // values are correct — the bespoke branch below validates the band and
  // `target` records one legal example for tooling.
  'tsv-s1-a5-d': {
    pageId: 'tsv-a5-d-page',
    background: 'tsv-greeting-stage',
    characterId: TINY_STAR_BOUNCE_ACTORS[1].characterId,
    scriptId: TINY_STAR_BOUNCE_ACTORS[1].scriptId,
    asset: TINY_STAR_BOUNCE_ACTORS[1].asset,
    start: { gx: TINY_STAR_BOUNCE_ACTORS[1].gx, gy: TINY_STAR_GREETING_GY, size: 1, rot: 0 },
    target: [
      { op: 'when_flag' },
      { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
      { op: 'hop', n: 1 },
      { op: 'end' },
    ],
  },
  // Tiny Star Village S1/A5-S — chapter five's Personal Ship (scene-specs A5-S).
  // NOTHING here is a fixed answer: the child casts two of the three friends,
  // decides which of them greets first, picks each friend's greeting and chooses
  // how long the second one waits. The bespoke branch below hands the whole page
  // to `tinyStarDuetDesign`; the fields here name the waiting half for shared
  // tooling (script lookup, the Say preset picker) and `target` records one legal
  // example. `asset` is the starter's — which casts ONE friend into BOTH slots,
  // so the starter is not a legal duet and cannot complete itself.
  'tsv-s1-a5-s': {
    pageId: 'tsv-a5-s-page',
    background: 'tsv-greeting-stage',
    characterId: TINY_STAR_DUET_SECOND_ID,
    scriptId: TINY_STAR_DUET_SECOND_SCRIPT,
    asset: LUMILO_ASSET,
    start: { gx: TINY_STAR_DUET_SECOND_GX, gy: TINY_STAR_GREETING_GY, size: 1, rot: 0 },
    allowedSayText: TINY_STAR_DUET_GREETINGS,
    target: [
      { op: 'when_flag' },
      { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
      { op: 'hop', n: TINY_STAR_DUET_HOP_N },
      { op: 'end' },
    ],
  },
  // Tiny Star Village S1/A6 — chapter six's three scenes all stand on the same
  // `sunset` Bell Tower stage (`TINY_STAR_BELL_STAGE_CONTRACT`: the ringer, its
  // one script, its square, and the script-less `⭐` tower on its own square).
  // Only the page and the route differ, and each scene's bespoke branch below
  // hands the whole page to the chapter module rather than to the generic match.
  //
  // A6-H (Story Hook): the shipped route walks to the tower and rings the bell
  // with no hop in between, so the program IS the question. Nothing may be built
  // or repaired here.
  'tsv-s1-a6-h': {
    ...TINY_STAR_BELL_STAGE_CONTRACT,
    pageId: TINY_STAR_BELL_HOOK_PAGE_ID,
    target: [...TINY_STAR_BELL_HOOK_ROUTE],
  },
  // A6-B (Logic Build): the same route on a page of its own, and the child puts
  // the missing middle card back — a `hop 1` BETWEEN the walk and the bell. Only
  // that one position tells the story (the bell must ring because someone
  // reached it), so `target` is exact.
  'tsv-s1-a6-b': {
    ...TINY_STAR_BELL_STAGE_CONTRACT,
    pageId: TINY_STAR_BELL_BUILD_PAGE_ID,
    target: [...TINY_STAR_BELL_BUILD_ROUTE],
  },
  // A6-D (Twist & Debug): all three cards are on the page at last, but the bell
  // has slipped to the front of the chain and rings before anybody has walked or
  // jumped. Nothing is added or removed — the child MOVES the Pop behind the Hop
  // — so the repaired route is A6-B's, and `target` stays exact.
  'tsv-s1-a6-d': {
    ...TINY_STAR_BELL_STAGE_CONTRACT,
    pageId: TINY_STAR_BELL_FIX_PAGE_ID,
    target: [...TINY_STAR_BELL_BUILD_ROUTE],
  },
  // A6-S (Personal Ship, and the season's last scene): the three-step core is
  // settled so it ships built — with NOBODY cast as the ringer and no ending.
  // The bespoke branch below hands the whole page to `tinyStarFinaleDesign`;
  // `asset` is the starter's (an uncast slot has none) and `target` records one
  // legal finale for tooling.
  'tsv-s1-a6-s': {
    ...TINY_STAR_BELL_STAGE_CONTRACT,
    pageId: TINY_STAR_BELL_FINALE_PAGE_ID,
    characterId: TINY_STAR_FINALE_RINGER_ID,
    scriptId: TINY_STAR_FINALE_RINGER_SCRIPT_ID,
    asset: '',
    allowedSayText: TINY_STAR_FINALE_LINES,
    target: [...TINY_STAR_BELL_FINALE_TARGET],
  },
  // Journey to the West's contracts live in their own module (file-organization
  // rule); lesson ids never overlap, so the spread can shadow nothing.
  ...JTW_MISSION_CONTRACTS,
};

/**
 * A5-H: is one of the two greeting voices still exactly what the starter
 * shipped? The overlap the child observes only means "nobody waits" while both
 * chains are untouched — an edited chain (a Wait, a swapped block, a retyped
 * greeting, a moved friend) makes the observation unprovable, so the Hook does
 * not complete.
 */
function tinyStarGreetingVoiceUnchanged(
  voice: (typeof TINY_STAR_GREETING_VOICES)[number],
  characters: readonly Character[] | undefined,
): boolean {
  const actor = characters?.find((candidate) => candidate.id === voice.characterId);
  if (!actor || actor.asset !== voice.asset || actor.scripts.length !== 1) return false;
  if (actor.start.gx !== voice.gx || actor.start.gy !== TINY_STAR_GREETING_GY) return false;
  if (actor.start.size !== 1 || actor.start.rot !== 0) return false;
  const blocks = actor.scripts.find((script) => script.id === voice.scriptId)?.blocks ?? [];
  return (
    blocks.length === 3 &&
    blocks[0]?.op === 'when_flag' &&
    blocks[1]?.op === 'say' &&
    blocks[1].text === voice.text &&
    blocks[2]?.op === 'end'
  );
}

/**
 * A5-B: did the two greetings really take turns in THIS run? `openedAt` holds
 * the moment each friend FIRST opened a speech bubble, recorded by the studio
 * from the interpreter's own `onSay` host callback — so this is a measurement of
 * the runtime, never a page flag. The turn counts only when Lumilo opened first
 * and Tuan Tuan's greeting followed at least a real `TINY_STAR_TURN_MIN_GAP_MS`
 * later; the A5-H collision opens both inside one tick and fails here.
 */
export function tinyStarGreetingTookTurns(openedAt: ReadonlyMap<string, number>): boolean {
  const first = openedAt.get(TINY_STAR_GREETING_VOICES[0].characterId);
  const second = openedAt.get(TINY_STAR_GREETING_VOICES[1].characterId);
  if (first === undefined || second === undefined) return false;
  return second - first >= TINY_STAR_TURN_MIN_GAP_MS;
}

/**
 * A5-D: is Lumilo still the untouched first bouncer? The relay only means
 * anything while the leader is exactly `Start → Hop 1 → End` on its shipped
 * square — a second bounce, a Wait of its own or a moved friend would change the
 * beat the child is timing against.
 */
function tinyStarBounceLeaderUnchanged(characters: readonly Character[] | undefined): boolean {
  const leader = TINY_STAR_BOUNCE_ACTORS[0];
  const actor = characters?.find((candidate) => candidate.id === leader.characterId);
  if (!actor || actor.asset !== leader.asset || actor.scripts.length !== 1) return false;
  if (actor.start.gx !== leader.gx || actor.start.gy !== TINY_STAR_GREETING_GY) return false;
  if (actor.start.size !== 1 || actor.start.rot !== 0) return false;
  const blocks = actor.scripts.find((script) => script.id === leader.scriptId)?.blocks ?? [];
  return (
    blocks.length === 3 &&
    blocks[0]?.op === 'when_flag' &&
    blocks[1]?.op === 'hop' &&
    blocks[1].n === 1 &&
    blocks[2]?.op === 'end'
  );
}

/**
 * A5-D: how long after Lumilo's bounce Tuan Tuan's bounce started in THIS run.
 * `hoppedAt` holds the moment each friend FIRST reached its Hop block, recorded
 * by the studio from the interpreter's own `onStep` host callback — a
 * measurement of the runtime, never a page flag. `null` means the run did not
 * produce two bounces in the relay order at all.
 */
export function tinyStarBounceGapMs(hoppedAt: ReadonlyMap<string, number>): number | null {
  const first = hoppedAt.get(TINY_STAR_BOUNCE_ACTORS[0].characterId);
  const second = hoppedAt.get(TINY_STAR_BOUNCE_ACTORS[1].characterId);
  if (first === undefined || second === undefined) return null;
  const gap = second - first;
  return gap >= 0 ? gap : null;
}

/** A5-D: the repaired rhythm — Tuan Tuan bounces after Lumi lands, but in time. */
export function tinyStarBounceRelayInTime(hoppedAt: ReadonlyMap<string, number>): boolean {
  const gap = tinyStarBounceGapMs(hoppedAt);
  return gap !== null && gap >= TINY_STAR_RELAY_MIN_GAP_MS && gap <= TINY_STAR_RELAY_MAX_GAP_MS;
}

/** A5-D: the shipped bug — the stage stood empty for longer than a whole bounce. */
export function tinyStarBounceRelayTooLate(hoppedAt: ReadonlyMap<string, number>): boolean {
  const gap = tinyStarBounceGapMs(hoppedAt);
  return gap !== null && gap > TINY_STAR_RELAY_MAX_GAP_MS;
}

function blockMatches(actual: Block | undefined, target: Block): boolean {
  return actual?.op === target.op && actual.n === target.n && actual.text === target.text;
}

function missionBlockMatches(
  actual: Block | undefined,
  target: Block,
  mission: StoryMissionProgramContract,
): boolean {
  if (target.op === 'say' && mission.allowedSayText) {
    return actual?.op === 'say' && mission.allowedSayText.includes(actual.text ?? '');
  }
  return blockMatches(actual, target);
}

export function storyMissionProgramMatches(project: BlocksProject, lessonId: string): boolean {
  if (lessonId === JTW_C4_P4_LESSON_ID) return jtwC4DualBuildMatches(project);
  if (lessonId === JTW_C4_P5_LESSON_ID) return jtwC4P5BuildVersion(project) !== null;
  if (lessonId === JTW_C4_P6_LESSON_ID) return jtwC4P6FixedVersion(project) !== null;
  if (lessonId === JTW_C4_P7_LESSON_ID) return jtwC4P7BuildVersion(project) !== null;
  const mission = TINY_STAR_MISSION_CONTRACTS[lessonId];
  if (!mission) return false;
  if (lessonId === 'jtw-s1-c2-p5') return c2p5ProgramMatches(project);

  if (lessonId === 'jtw-s1-c2-p5') {
    // This build owns two response tracks on two different actors. The shared
    // single-script contract cannot express that shape, so use the same whole
    // project matcher the Part page uses for its saved-project read-back.
    return c2p5ProgramMatches(project);
  }

  const page = project.pages.find((candidate) => candidate.id === mission.pageId);
  const character = page?.characters.find((candidate) => candidate.id === mission.characterId);
  const script = character?.scripts.find((candidate) => candidate.id === mission.scriptId);
  const blocks = script?.blocks ?? [];
  const sceneTarget = mission.sceneTarget
    ? page?.characters.find((candidate) => candidate.id === mission.sceneTarget?.id)
    : undefined;
  const startMatches =
    !mission.start ||
    (character?.start.gx === mission.start.gx &&
      character.start.gy === mission.start.gy &&
      character.start.size === mission.start.size &&
      character.start.rot === mission.start.rot);
  const targetMatches =
    !mission.sceneTarget ||
    (sceneTarget?.name === mission.sceneTarget.name &&
      sceneTarget.start.gx === mission.sceneTarget.gx &&
      sceneTarget.start.gy === mission.sceneTarget.gy &&
      sceneTarget.start.size === mission.sceneTarget.size &&
      sceneTarget.scripts.length === 0 &&
      page?.characters.length === 2);
  const characterCountMatches =
    mission.characterCount === undefined || page?.characters.length === mission.characterCount;
  const assetMatches =
    character?.asset === mission.asset ||
    (mission.characterId === TINY_STAR_BREAKFAST_CART_ID &&
      tinyStarBreakfastCartAssetIsKnown(character?.asset));

  if (lessonId === 'tsv-s1-a3-b') {
    const responseBlocks = blocks.slice(1, -1);
    const responsesAreVisible =
      responseBlocks.length >= 1 &&
      responseBlocks.length <= 2 &&
      responseBlocks.every(
        (block) =>
          (block.op === 'hop' && block.n === 1) ||
          (block.op === 'say' && Boolean(block.text?.trim())),
      );
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      page.characters.length === 1 &&
      assetMatches &&
      startMatches &&
      blocks[0]?.op === 'when_tap' &&
      blocks.at(-1)?.op === 'end' &&
      responsesAreVisible
    );
  }

  if (lessonId === 'tsv-s1-a3-s') {
    const allowedAssets = [
      '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
      '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
      '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png',
    ];
    const response = blocks[1];
    const responseIsVisible =
      (response?.op === 'hop' && response.n === 1) ||
      (response?.op === 'grow' && response.n === 1) ||
      (response?.op === 'say' &&
        ['Surprise!', 'Tap sparkle!', 'Hello, friend!'].includes(response.text ?? ''));
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      page.characters.length === 1 &&
      character?.id === 'dot-dot' &&
      allowedAssets.includes(character.asset ?? '') &&
      startMatches &&
      blocks.length === 3 &&
      blocks[0]?.op === 'when_tap' &&
      responseIsVisible &&
      blocks[2]?.op === 'end'
    );
  }

  if (lessonId === 'tsv-s1-a2-s') {
    const endpoint = page ? tinyStarA2TargetGx(page.background, lessonId) : undefined;
    const direction = endpoint === 6 ? 'move_left' : endpoint === 10 ? 'move_right' : undefined;
    return (
      project.lessonId === lessonId &&
      endpoint !== undefined &&
      character?.asset === mission.asset &&
      startMatches &&
      page?.characters.length === 1 &&
      blocks.length === 4 &&
      blocks[0]?.op === 'when_flag' &&
      blocks[3]?.op === 'end' &&
      blocks[1]?.op === direction &&
      blocks[1]?.n === 1 &&
      blocks[2]?.op === direction &&
      blocks[2]?.n === 1
    );
  }
  if (lessonId === 'tsv-s1-a4-s') {
    // Personal Ship: the background owns the locked table, while the cart
    // carries the child's parcel choice. The movement number must equal the
    // selected background distance.
    const design = page ? tinyStarDeliveryDesign(character, page.background) : null;
    const move = blocks[1];
    return (
      project.lessonId === lessonId &&
      page !== undefined &&
      page.characters.length === 1 &&
      assetMatches &&
      startMatches &&
      design !== null &&
      blocks.length === 3 &&
      blocks[0]?.op === 'when_flag' &&
      move?.op === 'move_right' &&
      move.n === design.distance &&
      blocks[2]?.op === 'end'
    );
  }

  if (lessonId === 'tsv-s1-a5-h') {
    // Explore: nothing may be built or repaired here, so the contract is "both
    // greeting chains are still the ones the starter shipped, on the shipped
    // two-friend stage". The child's evidence is the RUN (two bubbles open at
    // once), which BlocksStudioPage reads from the real interpreter.
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      page.characters.length === TINY_STAR_GREETING_VOICES.length &&
      TINY_STAR_GREETING_VOICES.every((voice) =>
        tinyStarGreetingVoiceUnchanged(voice, page.characters),
      )
    );
  }

  if (lessonId === 'tsv-s1-a5-b') {
    // Logic Build: the child owns Tuan Tuan's chain — and only a Wait placed
    // BEFORE the Say delays the second greeting, so the target is exact. Lumilo
    // is the fixed half of the duet: the head start is only meaningful while the
    // first voice is still the untouched `Start → Say "Morning!" → End`.
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      page.characters.length === TINY_STAR_GREETING_VOICES.length &&
      tinyStarGreetingVoiceUnchanged(TINY_STAR_GREETING_VOICES[0], page.characters) &&
      character?.asset === mission.asset &&
      character.scripts.length === 1 &&
      startMatches &&
      blocks.length === mission.target.length &&
      mission.target.every((target, index) => missionBlockMatches(blocks[index], target, mission))
    );
  }

  if (lessonId === 'tsv-s1-a5-d') {
    // Twist & Debug: every block is already there and in the right order — only
    // Tuan Tuan's Wait number is wrong. Several numbers repair the rhythm, so
    // the contract is the band, not one answer; the run still has to prove the
    // relay really happened (BlocksStudioPage measures it).
    const wait = blocks[1];
    const hop = blocks[2];
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      page.characters.length === TINY_STAR_BOUNCE_ACTORS.length &&
      tinyStarBounceLeaderUnchanged(page.characters) &&
      character?.asset === mission.asset &&
      character.scripts.length === 1 &&
      startMatches &&
      blocks.length === 4 &&
      blocks[0]?.op === 'when_flag' &&
      wait?.op === 'wait' &&
      (TINY_STAR_RELAY_WAITS as readonly number[]).includes(wait.n ?? 0) &&
      hop?.op === 'hop' &&
      hop.n === 1 &&
      blocks[3]?.op === 'end'
    );
  }

  if (lessonId === 'tsv-s1-a5-s') {
    // Personal Ship: the cast, the running order, both greetings and the length
    // of the pause are all the child's, so there is no exact target — the whole
    // page is handed to the duet parser, which rejects a one-friend duet, an
    // unbuilt or over-built chain, a Wait outside the band the first friend's
    // action allows, a moved friend and any greeting that is not a preset.
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      tinyStarDuetDesign(page) !== null
    );
  }

  if (lessonId === 'tsv-s1-a6-h') {
    // Explore: chapter six opens with a route that already runs, so there is
    // nothing to build and nothing to repair — the contract is "the shipped
    // Bell Tower route is still untouched". The child's evidence is the RUN
    // (the bell rings and nobody hops), which BlocksStudioPage measures from
    // the real interpreter.
    return project.lessonId === lessonId && tinyStarBellRouteUnchanged(page);
  }

  if (lessonId === 'tsv-s1-a6-b') {
    // Logic Build: the child owns exactly one block — the Hop that belongs
    // between the walk and the bell. Everything else about chapter six's stage
    // is still held still, so a Hop appended after the Pop (where a palette tap
    // lands it), a `hop 2` left on the block's default, a retuned walk, a
    // deleted Pop or a moved tower all keep the mission open.
    return project.lessonId === lessonId && tinyStarBellStepAdded(page);
  }

  if (lessonId === 'tsv-s1-a6-d') {
    // Twist & Debug: every block the story needs is already on the page — only
    // the bell is in the wrong place. The child MOVES the Pop behind the Hop and
    // may change nothing else, so the same exact-shape contract applies: the
    // shipped `Start → Pop → Right 3 → Hop 1 → End`, a bell left anywhere before
    // the walk or the jump, a deleted or duplicated block, a retuned walk or hop
    // and any stage edit all keep the mission open. The run must additionally
    // have played the hop BEFORE the bell (BlocksStudioPage measures it).
    return project.lessonId === lessonId && tinyStarBellOrderRepaired(page);
  }

  if (lessonId === 'tsv-s1-a6-s') {
    // Personal Ship: the ringer and the ending are the child's, so the whole
    // page goes to the finale parser — which rejects an uncast ringer, a missing
    // or duplicated ending, an ending before the bell, a free-typed line, a
    // retuned core and any stage edit.
    return project.lessonId === lessonId && tinyStarFinaleDesign(page) !== null;
  }

  if (lessonId === 'jtw-s1-c1-p5') {
    // Both greeting orders are valid; the verified prefix (incl. Show) and the
    // End are mandatory, and the Say must be one of the preset greetings.
    const prefixOk =
      blocks.length === 7 &&
      blocks[0]?.op === 'when_flag' &&
      blocks[1]?.op === 'hide' &&
      blocks[2]?.op === 'play_sound' &&
      blocks[2]?.n === 2 &&
      blocks[3]?.op === 'show' &&
      blocks[6]?.op === 'end';
    const sayOk = (block: Block | undefined) =>
      block?.op === 'say' && (JTW_GREETING_CHOICES as readonly string[]).includes(block.text ?? '');
    const hopOk = (block: Block | undefined) => block?.op === 'hop' && block.n === 1;
    const greetingOk =
      (hopOk(blocks[4]) && sayOk(blocks[5])) || (sayOk(blocks[4]) && hopOk(blocks[5]));
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      character?.asset === mission.asset &&
      startMatches &&
      prefixOk &&
      greetingOk
    );
  }

  if (lessonId === 'jtw-s1-c2-p7') {
    // Personal Ship: the bank, the route that bank needs, the wait and the
    // evidence line are all the child's, so there is no exact target and no
    // fixed start — the whole page goes to the entry parser, which rejects a
    // start on neither bank, the OTHER bank's route (the mashup case), a route
    // that stops short of or overshoots the door, a missing/out-of-band Wait,
    // a deleted or reordered curtain/cave response chain, a cave that no longer
    // starts hidden, a moved door actor and a free-typed line.
    return project.lessonId === lessonId && jtwPersonalEntryDesign(page) !== null;
  }

  if (lessonId === 'jtw-s1-c3-p4') {
    // Chapter three's main Build spans THREE pages: the child owns Page 2's
    // five-block sea chain while Pages 1 and 3 keep read-only demo chains
    // ("Page 1/3示范链不可被孩子删除"). A single-page match cannot see the other
    // two pages, so the whole project goes to the C3 sea-build contract, which
    // rejects a missing block, a wrong order, an exit that is not 3, a broken
    // demo chain, a deleted page and a moved start.
    return jtwC3SeaBuildComplete(project);
  }

  if (lessonId === 'jtw-s1-c3-p5') {
    // Chapter three's expression choice has TWO valid saved programs on TWO
    // different Page 2 seas ("断言两版均可独立成功"), which a single exact target
    // cannot express. The whole project goes to the weather contract, which
    // accepts a starry or a mist build only when the sea the page paints and
    // the chain the monkey king runs agree — so repainting the background
    // alone, dropping the Goto or pointing it back at 1 all keep it open.
    return jtwC3WeatherBuildComplete(project);
  }

  if (lessonId === 'jtw-s1-c3-p6') {
    // Chapter three's Fix repairs a stage POSITION, not a chain, and the page it
    // repairs is one of three — neither of which a single-page, single-target
    // record can express. The whole project goes to the jump contract, which
    // accepts ONLY Page 2's start moved to the contract cell with the child's
    // own C3-P5 weather chain, both exits, both demo chains, both backgrounds,
    // both actors and every `size` still exactly as shipped. So "改Page 1出口"、
    // "删除天气链"、"加更响声音" and "同时改多个页面" all keep the mission open.
    return jtwC3JumpFixComplete(project);
  }

  if (lessonId === 'jtw-s1-c3-p7') {
    // Chapter three's Personal Ship has no target chain at all: the child owns
    // every meaningful action on all THREE pages, both exits and the End
    // ("孩子必须主导至少七块"). The whole project therefore goes to the personal
    // route grammar, which refuses a Goto that loops home, a page left as a bare
    // Goto shell, a sea page with no observation in it, a walk that misses the
    // raft, a free-typed line and any stage edit — while still accepting every
    // legal 星夜/晨雾, wait-rhythm, dialogue and raft-pacing choice.
    return jtwC3RouteComplete(project);
  }

  if (lessonId === 'jtw-s1-c1-p7') {
    // Personal Ship: the child's own two actions vary, so there is no exact
    // target — the fixed frame, the visible-action rules, the optional wait
    // and the preset greeting are enforced structurally.
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      character?.asset === mission.asset &&
      startMatches &&
      jtwPersonalArrivalDesign(blocks) !== null
    );
  }

  return (
    project.lessonId === lessonId &&
    page?.background === mission.background &&
    assetMatches &&
    startMatches &&
    characterCountMatches &&
    targetMatches &&
    blocks.length === mission.target.length &&
    mission.target.every((target, index) => missionBlockMatches(blocks[index], target, mission))
  );
}

/** Preset dialogue choices the Say editor offers for a mission, if any. */
export function storyMissionSayChoices(lessonId: string | undefined): readonly string[] | null {
  if (!lessonId) return null;
  return TINY_STAR_MISSION_CONTRACTS[lessonId]?.allowedSayText ?? null;
}

export function storyMissionScriptId(lessonId: string): string | undefined {
  return TINY_STAR_MISSION_CONTRACTS[lessonId]?.scriptId;
}
