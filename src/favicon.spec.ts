import { describe, expect, it } from 'vitest';

import html from '../index.html?raw';

/**
 * The tab icon is a pure ASSET: drop a file from `public/`, or rename a link, and
 * nothing in the component tree fails — the app just ships with a blank tab and
 * nobody notices until a human looks at a browser. This spec is the only thing
 * that would.
 *
 * Resolved through Vite (`?raw` + `import.meta.glob`) rather than `node:fs`, so it
 * typechecks under the same browser tsconfig as the rest of `src/`.
 */
const publicFiles = Object.keys(import.meta.glob('../public/*.png'));

describe('favicon', () => {
  it.each(['favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png'])(
    '%s is linked from index.html and present in public/',
    (file) => {
      expect(html).toContain(`href="/${file}"`);
      expect(publicFiles).toContain(`../public/${file}`);
    },
  );
});
