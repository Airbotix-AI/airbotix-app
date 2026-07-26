// Journey to the West S1/C2 — the shared stage constants of 水帘洞的约定.
//
// C2-P5 split the chapter's artwork into an actor-free base plus two separable
// door actors (asset bible §8 "S1 C2-P7 internal asset split"), and P5, P6 and
// P7 all stand on that same stage. Keeping its identity here means the mission
// contracts, the personal-entry parser and the part pages agree on ONE set of
// ids, cells and sizes instead of repeating string literals — and it keeps
// `storyMissionContracts.jtw.ts` and `jtwPersonalEntry.ts` free of a cycle.

/** The actor-free C2 base: dry cliff and an empty cave recess, no door actors. */
export const JTW_C2_ACTOR_FREE_BACKGROUND = 'jtw-s1-c2-water-curtain-actor-free';

export const JTW_STONE_MONKEY_SPRITE =
  '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png';
export const JTW_C2_CURTAIN_SPRITE =
  '/story-blocks/journey-to-the-west/characters/water-curtain-trigger/closed-v01.png';
export const JTW_C2_CAVE_SPRITE =
  '/story-blocks/journey-to-the-west/characters/cave-entrance/revealed-v01.png';
/** The three friends who wait on the bank and follow the child's route in P7. */
export const JTW_MONKEY_FRIENDS_SPRITE =
  '/story-blocks/journey-to-the-west/characters/monkey-friends/group-neutral-v01.png';

/** The monkey's stage size — chapter one's alpha-compensation value (§2.3). */
export const JTW_MONKEY_SIZE = 3;

/** The curtain and the cave both stand here; a foot one cell away bumps them. */
export const JTW_C2_DOOR_CELL = { gx: 7, gy: 7 } as const;
export const JTW_C2_CURTAIN_SIZE = 5;
export const JTW_C2_CAVE_SIZE = 4;
/** Both door actors keep a one-cell foot zone however wide their artwork is. */
export const JTW_C2_DOOR_REACH = 1;
/** The Chime the curtain plays as it opens (`play_sound n=2`, as in C2-P5). */
export const JTW_C2_CHIME_N = 2;
