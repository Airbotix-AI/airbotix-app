import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api';
import { friendlyError } from './useStudio';

describe('friendlyError', () => {
  it('maps wallet / daily-cap errors to a kid-friendly top-up message', () => {
    expect(friendlyError(new ApiError(402, 'WALLET_INSUFFICIENT', 'x'))).toBe(
      'Out of Stars! Ask a parent to top up.',
    );
    expect(friendlyError(new ApiError(429, 'DAILY_CAP_EXCEEDED', 'x'))).toBe(
      'Out of Stars! Ask a parent to top up.',
    );
  });

  it('maps paused / family-required errors', () => {
    expect(friendlyError(new ApiError(403, 'FAMILY_PAUSED', 'x'))).toMatch(/paused/);
    expect(friendlyError(new ApiError(400, 'FAMILY_REQUIRED', 'x'))).toMatch(/family first/);
  });

  it('passes through any other ApiError message', () => {
    expect(friendlyError(new ApiError(500, 'OOPS', 'Server boom'))).toBe('Server boom');
  });

  it('falls back to a generic message for non-ApiErrors', () => {
    expect(friendlyError(new Error('network'))).toBe('Could not reach AI.');
    expect(friendlyError('weird')).toBe('Could not reach AI.');
  });
});
