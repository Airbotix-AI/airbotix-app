import { describe, expect, it } from 'vitest';

import { skipsAuthBootstrap } from './useBootstrap';

describe('skipsAuthBootstrap', () => {
  it('keeps anonymous demos and Story Blocks experiments off auth refresh', () => {
    expect(skipsAuthBootstrap('/try/blocks')).toBe(true);
    expect(skipsAuthBootstrap('/experiments/story-blocks/journey-to-the-west/c1')).toBe(true);
  });

  it('still bootstraps authenticated product surfaces', () => {
    expect(skipsAuthBootstrap('/learn/blocks/project-1')).toBe(false);
    expect(skipsAuthBootstrap('/portal')).toBe(false);
  });
});
