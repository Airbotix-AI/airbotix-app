// Project-kind inference for the GENERIC prompt-first landing
// (creative-code-studio-website-prd D-WEB-11). The Learn-home tile and the hub's
// game cards all land on /learn/playground/new with NO explicit ?kind, so before
// this a kid typing "I'd like a todo list website" got a GAME project and a
// confused first build. Mirrors the backend's 2D/3D engine inference philosophy
// (platform-backend src/projects/engine-inference.ts): word-boundary keywords,
// WEBSITE only on a CONFIDENT signal, game otherwise — an explicit ?kind always
// wins and this is never consulted.
//
// Deliberately conservative: bare "site" (campsite, building site) and
// "shop"/"store" (games have shops) are NOT signals.
const WEBSITE_SIGNALS =
  /\b(web\s?site|web\s?page|blog|portfolio|homepage|home page|landing page|web\s?app)\b|网站|网页/i;

/** Infer the ProjectKind for a free-typed first idea on the generic landing. */
export function inferProjectKindFromIdea(idea: string): 'game' | 'website' {
  return WEBSITE_SIGNALS.test(idea) ? 'website' : 'game';
}
