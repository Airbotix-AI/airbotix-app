import { describe, expect, it } from 'vitest';

import { nextHelpState } from './teacherHelp';

describe('nextHelpState', () => {
  it('moves to waiting when a raised hand is acknowledged', () => {
    expect(nextHelpState('none', { state: 'waiting' })).toBe('waiting');
  });
  it('moves to takeover when the teacher takes the wheel', () => {
    expect(nextHelpState('waiting', { state: 'takeover' })).toBe('takeover');
  });
  it('clears back to none when the teacher gives the wheel back', () => {
    expect(nextHelpState('takeover', { state: 'none' })).toBe('none');
  });
});
