// The Creative Code Challenge edition the Portal links to.
//
// Every challenge route is addressed by an edition SLUG, and until now the only
// way into `/portal/challenge/:slug/*` was the CTA on the marketing site. A
// parent who registered and then closed the tab had no route back — no nav item,
// no dashboard card, nothing — which is what this constant exists to fix.
//
// It is a hardcoded slug for the same reason `airbotix`'s landing page carries
// one: there is no "list the open editions" endpoint, and the first edition is a
// single named campaign, not a catalogue. When a second edition exists this
// should become a backend read (an editions list the Portal can render), not a
// second constant — logged in creative-code-challenge-prd.md §9.
export const CURRENT_CHALLENGE_SLUG = 'creative-code-challenge-2026-junior';

/**
 * Where the Portal nav sends a parent: the family HUB, not the single-child
 * register form.
 *
 * The nav pointed at `/register` first, which opens on one child chosen from a
 * picker — so a parent with several children could only learn who was entered
 * by selecting each of them in turn, and never saw their family's standing at
 * all. The hub answers that first, then links each child to the register page.
 */
export const CHALLENGE_PORTAL_PATH = `/portal/challenge/${CURRENT_CHALLENGE_SLUG}`;
