import { describe, expect, it } from 'vitest';

import { BLOCKS_STARTERS } from './blocksStarters';

describe('BlocksHubPage curriculum starter copy', () => {
  it('introduces A1 as a story problem before giving an operation', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a1_h');

    expect(starter?.title).toBe('Tiny Star Village · First Mission');
    expect(starter?.desc).toContain('Bell Tower did not ring');
    expect(starter?.desc).toContain('morning light has vanished');
    expect(starter?.desc).toContain('hop awake first, then say hello');
    expect(starter?.desc).toContain('Story Partner');
    expect(starter?.desc).not.toContain('Press Go');
  });
});
