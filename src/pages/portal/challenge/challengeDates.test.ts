import { describe, expect, it } from 'vitest';

import { challengeDayLabel, challengeDayLabelLong } from './challengeDates';

describe('challenge date labels', () => {
  it('renders the production submission opening instant as 24 August in Brisbane', () => {
    expect(challengeDayLabel('2026-08-23T14:00:00.000Z')).toBe('24 Aug 2026');
    expect(challengeDayLabelLong('2026-08-23T14:00:00.000Z')).toBe('24 August 2026');
  });

  it('keeps the production closing instant on 31 August in Brisbane', () => {
    expect(challengeDayLabel('2026-08-31T13:59:59.000Z')).toBe('31 Aug 2026');
  });

  it('returns an invalid API value unchanged', () => {
    expect(challengeDayLabel('not-a-date')).toBe('not-a-date');
  });
});
