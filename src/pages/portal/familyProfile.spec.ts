import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectPreferredLanguage } from './familyProfile';

afterEach(() => vi.unstubAllGlobals());

describe('detectPreferredLanguage', () => {
  it('returns zh for Chinese browser locales', () => {
    vi.stubGlobal('navigator', { language: 'zh-CN' });
    expect(detectPreferredLanguage()).toBe('zh');
  });

  it('falls back to en for everything else', () => {
    vi.stubGlobal('navigator', { language: 'en-AU' });
    expect(detectPreferredLanguage()).toBe('en');
  });
});
