// Journey to the West S1/C3 — the shared stage constants of 一叶木筏求师路.
//
// Chapter three is the season's first three-page journey (asset bible §6
// `jtw-s1-c3-three-seas-route`, scene-specs "C3共享实现合同"): Page 1 花果山海岸,
// Page 2 海上中段, Page 3 彼岸山林. Keeping the ids, cells and sizes here means
// the part pages, mission contracts and starters agree on ONE stage instead of
// repeating string literals — exactly as `jtwC2Stage.ts` does for chapter two.
//
// ONLY Page 1's artwork is integrated into `public/` so far (C3-P1 is the first
// chapter-three Part and copies only what it renders). Page 2 and Page 3 stay in
// `design-system/assets/...` until the Part that actually stages them lands —
// a constant pointing at a file `public/` does not have would be a broken path,
// not a plan.

/** Page 1 花果山海岸 — the home shore the monkey king leaves from. */
export const JTW_C3_PAGE1_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page1-before-v01.webp';
/** Same camera and landmarks; the sea-route light reaches the horizon. */
export const JTW_C3_PAGE1_RESOLVED_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page1-resolved-v01.webp';

/**
 * 正式角色 `monkey-king` reuses the `char-stone-monkey` master (scene-specs
 * "C3共享实现合同"), so chapter three stages the very sprite chapters one and two
 * already ship — the grown traveller sprite belongs to C4 onward.
 */
export const JTW_C3_MONKEY_KING_ID = 'monkey-king';
export const JTW_C3_MONKEY_KING_SPRITE =
  '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png';
/** The alpha-compensation size chapter one measured for this artwork (§2.3). */
export const JTW_C3_MONKEY_KING_SIZE = 3;

/** Page 1 start cell — the contract's `gx=3 / gy=9` on the 20×15 logical grid. */
export const JTW_C3_PAGE1_START_CELL = { gx: 3, gy: 9 } as const;

/** 群猴 — the same one-image group chapter two integrated (scenery, not actors). */
export const JTW_C3_MONKEY_FRIENDS_SPRITE =
  '/story-blocks/journey-to-the-west/characters/monkey-friends/group-neutral-v01.png';

/** The sea wind the story names — `play_sound` Whoosh in `BUILT_IN_SOUNDS`. */
export const JTW_C3_SEA_WIND_SOUND_ID = 4;
