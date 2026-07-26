import { describe, expect, it } from 'vitest';

import { DEFAULT_KID_AVATAR_ID, KID_AVATARS, kidAvatarAsset, kidAvatarName } from './kidAvatars';

describe('kid avatar registry', () => {
  it('has 26 unique ids and runtime paths', () => {
    expect(KID_AVATARS).toHaveLength(26);
    expect(new Set(KID_AVATARS.map(([id]) => id)).size).toBe(26);
    expect(KID_AVATARS.every(([id]) => kidAvatarAsset(id).endsWith('.webp'))).toBe(true);
  });

  it('falls back safely for missing and unknown ids', () => {
    expect(kidAvatarAsset(null)).toBe(kidAvatarAsset(DEFAULT_KID_AVATAR_ID));
    expect(kidAvatarName('retired_avatar')).toBe('Robot Friend');
  });
});
