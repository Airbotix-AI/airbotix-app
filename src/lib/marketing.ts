// The marketing site (airbotix.ai) base + href builder. Mirrors the demo's
// MARKETING_DEFAULT (pages/try/demoMode.tsx): production builds go to
// airbotix.ai; dev builds go to the marketing dev server (it pins port 3000 in
// its vite config). `VITE_MARKETING_URL` overrides either. Used by the public
// play page's brand frame to point a logged-out visitor back to the site.

const MARKETING_DEFAULT = import.meta.env.PROD ? 'https://airbotix.ai' : 'http://localhost:3000';

/** Marketing site origin, e.g. `https://airbotix.ai`. */
export const MARKETING_URL: string = import.meta.env.VITE_MARKETING_URL ?? MARKETING_DEFAULT;

/** Absolute marketing URL for a path, e.g. `marketingHref('/try')`. */
export const marketingHref = (path = ''): string => `${MARKETING_URL}${path}`;
