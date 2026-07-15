import { describe, expect, it } from 'vitest';

import { performanceForBlock } from './characterPerformance';

describe('performanceForBlock', () => {
  it('turns causal block steps into readable character performances', () => {
    expect(performanceForBlock('move_right')).toBe('moving');
    expect(performanceForBlock('hop')).toBe('hopping');
    expect(performanceForBlock('say')).toBe('speaking');
    expect(performanceForBlock('wait')).toBe('listening');
    expect(performanceForBlock('stop')).toBe('thinking');
    expect(performanceForBlock()).toBe('idle');
  });
});
