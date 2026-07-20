/**
 * Client-side feature switches (temporary, owner-controlled).
 *
 * SHOW_LESSONS_CATALOG — the self-serve Lessons catalog at /learn/missions
 * (course-pack list from GET /course-packs + per-pack Lesson/Mission detail,
 * airbotix-app-learn-prd.md). Hidden 2026-07-17 on owner request: the catalog
 * surfaces every seeded official course pack to any signed-in kid, and that
 * content is not ready for self-serve browsing. Flip back to `true` to restore
 * the top-bar "Lessons" entry, the home "Guided courses" card, the classroom
 * empty-state CTA and the /learn/missions routes — nothing was deleted.
 */
export const SHOW_LESSONS_CATALOG = true; // LOCAL DEMO ONLY — do not commit
