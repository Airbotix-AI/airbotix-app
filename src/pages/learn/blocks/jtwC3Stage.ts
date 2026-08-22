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
// the raft prop, C3-P4 — the Part whose build finally gives the sea leg a story
// and lands the raft on the far shallows — brought the morning-mist Page 2
// `resolved` state and the Page 3 `resolved` state, and C3-P5 — where the child
// really chooses which middle sea the journey crosses — brought the starry Page
// 2 pair. With that the whole `jtw-s1-c3-three-seas-route` registry entry is
// integrated; a constant pointing at a file `public/` does not have would be a
// broken path, not a plan.

/** Page 1 花果山海岸 — the home shore the monkey king leaves from. */
export const JTW_C3_PAGE1_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page1-before-v01.webp';
/** Same camera and landmarks; the sea-route light reaches the horizon. */
export const JTW_C3_PAGE1_RESOLVED_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page1-resolved-v01.webp';

/**
 * Page 2 海上中段 — open sea between the two shores. Chapter three ships two
 * middle seas (asset bible §6): the morning-mist one is C3-P1..P4's, because the
 * shared Page 2 chain's own `play_sound(Whoosh)` IS its sea wind. From C3-P5 on
 * it is one of two branches the child picks between, so it keeps a name that
 * says which sea it is.
 */
export const JTW_C3_PAGE2_MORNING_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page2-morning-before-v01.webp';
/** The default Page 2 sea for every Part that does not offer the choice. */
export const JTW_C3_PAGE2_BACKGROUND = JTW_C3_PAGE2_MORNING_BACKGROUND;
/**
 * Page 2 星夜海面 — the same middle sea under a moonlit night, with cloud banks
 * still lying across the horizon. It is C3-P5's second valid version
 * ("星夜版保留主路线并使用 `play_sound(Sparkle) → wait(2)` 表现等云散开").
 */
export const JTW_C3_PAGE2_STARRY_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page2-starry-before-v01.webp';
/**
 * Page 2 星夜 after the version really ran: same camera, same moon — the clouds
 * have drawn back and a lit sea route runs from this side of the water to the
 * far landing light.
 */
export const JTW_C3_PAGE2_STARRY_RESOLVED_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page2-starry-resolved-v01.webp';
/**
 * Page 2 after C3-P4's build really ran: same camera, same mist — the sea route
 * is now drawn across the water, because the middle of the sea finally has a
 * sound, a move and a pause in it (scene-specs JTW-S1-C3-P4
 * `resolved_world_change`).
 */
export const JTW_C3_PAGE2_RESOLVED_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page2-morning-resolved-v01.webp';
/** Page 3 彼岸山林 — the far shore, its path and the master's gate above it. */
export const JTW_C3_PAGE3_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page3-before-v01.webp';
/**
 * Page 3 after the raft really arrives: same shore, the stepping path up to the
 * master's gate lit and the gate itself warm — the 山林歌声 the scene names.
 */
export const JTW_C3_PAGE3_RESOLVED_BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page3-resolved-v01.webp';

/** The three integrated `before` states, in page order (index = page − 1). */
export const JTW_C3_PAGE_BACKGROUNDS: readonly string[] = [
  JTW_C3_PAGE1_BACKGROUND,
  JTW_C3_PAGE2_BACKGROUND,
  JTW_C3_PAGE3_BACKGROUND,
];

/** Alt text describing what each page's artwork really shows. */
export const JTW_C3_PAGE_ALTS: readonly string[] = [
  'Flower-Fruit Mountain coast: peach-covered slopes rise on the left, while the sea stretches to the horizon on the right.',
  'Middle section of the sea: On the sea surface in the morning mist, the islands in the distance recede towards the horizon layer by layer.',
  "The mountains and forests on the other side: the shallows near the shore, the path up the mountain, and the stone gate of the teacher's gate on the mountain",
];

/** Alt text for the starry middle sea (C3-P5's second version). */
export const JTW_C3_PAGE2_STARRY_ALT =
  'Starry night in the middle of the sea: the moon hangs on the right, there is moonlight on the sea, and clouds are still pressing on the island on the horizon';

/**
 * Stable scene ids a saved `BlocksProject` stores as a page background. The
 * Blocks Studio resolves them through `library.ts` `sceneId()` and paints them
 * from `blocks.css`, so the studio, the read-only part stages and the backend
 * starter all name the SAME three pages. They stay separate from the asset paths
 * above because a stored document must never contain a file path.
 */
export const JTW_C3_PAGE1_SCENE = 'jtw-s1-c3-page1-before-v01';
export const JTW_C3_PAGE2_MORNING_SCENE = 'jtw-s1-c3-page2-morning-before-v01';
/** The default Page 2 scene — the morning mist C3-P1..P4 all ship. */
export const JTW_C3_PAGE2_SCENE = JTW_C3_PAGE2_MORNING_SCENE;
/** C3-P5's second middle sea, saved on the page when the child picks 星夜. */
export const JTW_C3_PAGE2_STARRY_SCENE = 'jtw-s1-c3-page2-starry-before-v01';
export const JTW_C3_PAGE3_SCENE = 'jtw-s1-c3-page3-before-v01';

/** The three page scene ids, in page order (index = page − 1). */
export const JTW_C3_PAGE_SCENES: readonly string[] = [
  JTW_C3_PAGE1_SCENE,
  JTW_C3_PAGE2_SCENE,
  JTW_C3_PAGE3_SCENE,
];

/**
 * Every C3 scene id a saved document may legally carry — the three default
 * pages plus the starry Page 2 branch. `library.ts` needs the whole set so the
 * real studio paints a starry build's middle sea instead of the generic meadow.
 */
export const JTW_C3_STORY_SCENES: readonly string[] = [
  ...JTW_C3_PAGE_SCENES,
  JTW_C3_PAGE2_STARRY_SCENE,
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
