import { describe, expect, it } from 'vitest';

import { australianMobileSchema, normaliseAustralianMobile } from './phone';

describe('Australian mobile profile validation', () => {
  it.each([
    ['0400 123 123', '+61400123123'],
    ['+61 400 123 123', '+61400123123'],
    ['61-400-123-123', '+61400123123'],
    ['400123123', '+61400123123'],
  ])('accepts %s', (input, expected) => {
    expect(australianMobileSchema.safeParse(input).success).toBe(true);
    expect(normaliseAustralianMobile(input)).toBe(expected);
  });

  it.each(['', '07 1234 5678', '+1 202 555 0100', '0400 123'])('rejects %s', (input) => {
    expect(australianMobileSchema.safeParse(input).success).toBe(false);
  });
});
