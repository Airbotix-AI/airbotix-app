import { describe, expect, it } from 'vitest';

import { formatAud } from './money';

describe('formatAud', () => {
  it('renders whole dollars with no decimals', () => {
    expect(formatAud(3900)).toBe('A$39');
    expect(formatAud(4000)).toBe('A$40');
    expect(formatAud(8000)).toBe('A$80');
  });

  it('renders half-dollar and cents amounts with exactly two decimals', () => {
    expect(formatAud(3950)).toBe('A$39.50');
    expect(formatAud(4010)).toBe('A$40.10');
    expect(formatAud(1999)).toBe('A$19.99');
  });

  it('renders zero and sub-dollar amounts', () => {
    expect(formatAud(0)).toBe('A$0');
    expect(formatAud(5)).toBe('A$0.05');
    expect(formatAud(50)).toBe('A$0.50');
  });

  it('rounds fractional cents and preserves sign', () => {
    expect(formatAud(3950.4)).toBe('A$39.50');
    expect(formatAud(-3950)).toBe('-A$39.50');
  });
});
