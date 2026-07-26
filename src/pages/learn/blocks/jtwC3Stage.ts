// Journey to the West S1/C3 — the shared stage constants of 一叶木筏求师路.
//
// Chapter three is the season's first three-page journey (asset bible §6
// `jtw-s1-c3-three-seas-route`, scene-specs "C3共享实现合同"): Page 1 花果山海岸,
// Page 2 海上中段, Page 3 彼岸山林. Keeping the ids, cells and sizes here means
// the part pages, mission contracts and starters agree on ONE stage instead of
// repeating string literals — exactly as `jtwC2Stage.ts` does for chapter two.
//
// Artwork is copied into `public/` one Part at a time, as a Part actually
// renders it: C3-P1 brought the Page 1 pair, C3-P2 (which runs all three pages)
// brought the Page 2 morning-mist `before` state, the Page 3 `before` state and
// the raft prop. The states no shipped Part stages yet — the starry Page 2 pair
// (C3-P5's second choice) and both `resolved` states of Pages 2/3 — stay in
// `design-system/assets/...`: a constant pointing at a file `public/` does not
// have would be a broken path, not a plan.

/** Page 1 花果山海岸 — the home shore the monkey king leaves from. */
export const JTW_C3_PAGE1_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page1-before-v01.webp';
/** Same camera and landmarks; the sea-route light reaches the horizon. */
export const JTW_C3_PAGE1_RESOLVED_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page1-resolved-v01.webp';

/**
 * Page 2 海上中段 — open sea between the two shores. Chapter three ships two
 * middle seas (asset bible §6): the morning-mist one is the starter's, because
 * the shared Page 2 chain's own `play_sound(Whoosh)` IS its sea wind. The
 * starry alternative arrives with C3-P5, where the child really chooses.
 */
export const JTW_C3_PAGE2_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page2-morning-before-v01.webp';
/** Page 3 彼岸山林 — the far shore, its path and the master's gate above it. */
export const JTW_C3_PAGE3_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page3-before-v01.webp';

/** The three integrated `before` states, in page order (index = page − 1). */
export const JTW_C3_PAGE_BACKGROUNDS: readonly string[] = [
  JTW_C3_PAGE1_BACKGROUND,
  JTW_C3_PAGE2_BACKGROUND,
  JTW_C3_PAGE3_BACKGROUND,
];

/** Alt text describing what each page's artwork really shows. */
export const JTW_C3_PAGE_ALTS: readonly string[] = [
  '花果山海岸：左边是长着桃树的山，右边的海一直连到天边',
  '海上中段：晨雾里的海面，远处的岛一层一层退向天边',
  '彼岸山林：靠岸的浅滩、上山的小路，山上是师门的石门',
];

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
/** Page 2 start cell — the contract's `gx=2 / gy=8` (C3-P6 debugs a wrong one). */
export const JTW_C3_PAGE2_START_CELL = { gx: 2, gy: 8 } as const;
/** Page 3 start cell — the contract's `gx=2 / gy=9`, the far shore's landing. */
export const JTW_C3_PAGE3_START_CELL = { gx: 2, gy: 9 } as const;

/**
 * 木筏 — `prop-raft-neutral-v01`. Asset bible §6 assigns the raft to chapter
 * three and forbids baking it into the background, so it is a real stage actor:
 * it waits on the home beach, carries the monkey king across the open sea (where
 * §2.4 gives his feet nothing else to land on) and lies beached on the far
 * shore. It carries no completion evidence.
 */
export const JTW_C3_RAFT_ID = 'raft';
export const JTW_C3_RAFT_SPRITE = '/story-blocks/journey-to-the-west/props/raft/neutral-v01.png';
export const JTW_C3_RAFT_SIZE = 3;

/** 群猴 — the same one-image group chapter two integrated (scenery, not actors). */
export const JTW_C3_MONKEY_FRIENDS_SPRITE =
  '/story-blocks/journey-to-the-west/characters/monkey-friends/group-neutral-v01.png';

/** The sea wind the story names — `play_sound` Whoosh in `BUILT_IN_SOUNDS`. */
export const JTW_C3_SEA_WIND_SOUND_ID = 4;
