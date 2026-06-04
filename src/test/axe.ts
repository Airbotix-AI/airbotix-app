import { axe } from 'jest-axe';
import { expect } from 'vitest';

// Component-level a11y assertion. We render page fragments into a detached
// container (not a full document), so document/landmark-scoped rules that only
// make sense for a whole page are disabled to avoid false positives. Colour
// contrast is skipped automatically under jsdom (no layout) — that belongs in a
// Playwright/Lighthouse pass, not unit tests. See accessibility-prd §2.
export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container, {
    rules: {
      region: { enabled: false },
      'landmark-one-main': { enabled: false },
      'page-has-heading-one': { enabled: false },
    },
  });
  // Map to a compact shape so a failure prints the rule id + offending markup
  // instead of a giant axe result blob.
  expect(
    results.violations.map((v) => ({
      id: v.id,
      help: v.help,
      nodes: v.nodes.map((n) => n.html),
    })),
  ).toEqual([]);
}
