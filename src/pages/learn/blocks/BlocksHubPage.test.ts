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

  it('lists the A3 Story Hook starter', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a3_h');
    expect(starter?.title).toBe('Tiny Star Village · Mission 9');
  });

  it('offers A3-B as a real child-built tap response', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a3_b');
    expect(starter?.title).toBe('Tiny Star Village · Mission 10');
    expect(starter?.desc).toContain('On Tap');
    expect(starter?.desc).toMatch(/Hop|Say/);
    expect(starter?.desc).toContain('tap Dot Dot');
  });

  it('offers A3-D as a one-event repair', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a3_d');
    expect(starter?.title).toBe('Tiny Star Village · Mission 11');
    expect(starter?.desc).toContain('replace Start with On Tap');
  });

  it('offers A3-S as a personal character and response story', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a3_s');
    expect(starter?.title).toBe('Tiny Star Village · Mission 12');
    expect(starter?.desc).toContain('Choose your secret character');
    expect(starter?.desc).toMatch(/Hop, Grow, or Say/);
  });

  it('offers the next A1 Complete scene as a separate real mission', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a1_b');
    expect(starter?.title).toBe('Tiny Star Village · Mission 2');
    expect(starter?.desc).toContain('only Start');
    expect(starter?.desc).toContain('add Hop, Say, and End');
  });

  it('offers A1-D as a manual reorder mission instead of an answer choice', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a1_d');
    expect(starter?.title).toBe('Tiny Star Village · Mission 3');
    expect(starter?.desc).toContain('drag the same blocks');
    expect(starter?.desc).toContain('without adding an answer');
  });

  it('offers A1-S as a saved personal greeting rather than a cosmetic choice', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a1_s');
    expect(starter?.title).toBe('Tiny Star Village · Mission 4');
    expect(starter?.desc).toContain('choose your own greeting');
    expect(starter?.desc).toContain('run and save');
  });

  it('offers A2-H as an observe-only direction story hook', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a2_h');
    expect(starter?.title).toBe('Tiny Star Village · Mission 5');
    expect(starter?.desc).toContain('Tuan Tuan');
    expect(starter?.desc).toMatch(/point to the plaza star/i);
    expect(starter?.desc).toContain('closer or farther');
  });

  it('offers A2-B as a real one-arrow build mission', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a2_b');
    expect(starter?.title).toBe('Tiny Star Village · Mission 6');
    expect(starter?.desc).toContain('Choose one real direction block');
    expect(starter?.desc).toContain('reach the star');
  });

  it('offers A2-D as a one-arrow repair mission', () => {
    const starter = BLOCKS_STARTERS.find((item) => item.id === 'blocks_tsv_a2_d');
    expect(starter?.title).toBe('Tiny Star Village · Mission 7');
    expect(starter?.desc).toContain('swap only Left for Right');
  });
});
